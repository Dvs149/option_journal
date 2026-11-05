import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const BrokerageContext = createContext();

// Official Zerodha / SEBI defaults (effective Oct 2024 / current regulatory schedule)
export const DEFAULT_BROKERAGE_RATES = {
  broker_name: 'Zerodha',
  brokerage_per_order: 20.00,       // Flat ₹20 per executed order
  stt_rate_percent: 0.15000,         // 0.15% on sell side (on premium)
  nse_txn_rate_percent: 0.03553,     // NSE: 0.03553% on premium
  bse_txn_rate_percent: 0.03250,     // BSE: 0.0325% on premium
  gst_rate_percent: 18.00,           // 18% on (brokerage + SEBI + txn)
  sebi_per_crore: 10.00,             // ₹10 per crore (plus GST)
  stamp_duty_rate_percent: 0.00300,  // 0.003% or ₹300 per crore on buy side
  default_exchange: 'NSE',
};

export function BrokerageProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [rates, setRates] = useState(DEFAULT_BROKERAGE_RATES);
  const [loading, setLoading] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // Fetch settings from database
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.get('/brokerage-settings');
      if (res.data?.data) {
        setRates(res.data.data);
        setIsCustom(Boolean(res.data.data.is_custom));
      }
    } catch {
      // Keep defaults
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update rates in database
  const updateRates = async (newRates) => {
    try {
      const payload = {
        broker_name: newRates.broker_name || rates.broker_name || 'Zerodha',
        brokerage_per_order: parseFloat(newRates.brokerage_per_order) || 20.00,
        stt_rate_percent: parseFloat(newRates.stt_rate_percent) || 0.15,
        nse_txn_rate_percent: parseFloat(newRates.nse_txn_rate_percent) || 0.03553,
        bse_txn_rate_percent: parseFloat(newRates.bse_txn_rate_percent) || 0.0325,
        gst_rate_percent: parseFloat(newRates.gst_rate_percent) || 18.00,
        sebi_per_crore: parseFloat(newRates.sebi_per_crore) || 10.00,
        stamp_duty_rate_percent: parseFloat(newRates.stamp_duty_rate_percent) || 0.003,
        default_exchange: newRates.default_exchange || rates.default_exchange || 'NSE',
      };

      const res = await api.put('/brokerage-settings', payload);
      if (res.data?.data) {
        setRates(res.data.data);
        setIsCustom(true);
      }
      return { success: true, data: res.data?.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Failed to update brokerage settings',
      };
    }
  };

  // Reset rates to official Zerodha / SEBI defaults
  const resetRates = async () => {
    try {
      const res = await api.post('/brokerage-settings/reset');
      if (res.data?.data) {
        setRates(res.data.data);
        setIsCustom(false);
      } else {
        setRates(DEFAULT_BROKERAGE_RATES);
        setIsCustom(false);
      }
      return { success: true };
    } catch (err) {
      // Local fallback reset
      setRates(DEFAULT_BROKERAGE_RATES);
      setIsCustom(false);
      return { success: true };
    }
  };

  /**
   * Pure calculation function based on user's active rates
   *
   * @param {Object} params
   *   - entry: number
   *   - exit: number
   *   - quantity: number
   *   - optionType: 'CE' | 'PE' | 'Both'
   *   - exchange: 'NSE' | 'BSE' | string (or auto from indexName)
   *   - indexName: string
   *   - executedOrders: number (optional)
   *   - ceEntry, peEntry, ceExit, peExit: numbers (optional leg prices for Both)
   */
  const calculateCharges = useCallback(
    (params = {}) => {
      const optionType = params.optionType || 'CE';
      let entry = Math.max(0, Math.abs(parseFloat(params.entry) || 0));
      let exit = Math.max(0, Math.abs(parseFloat(params.exit) || 0));
      const qty = Math.max(0, Math.abs(parseInt(params.quantity, 10) || 0));

      // Handle leg prices for Both
      if (optionType === 'Both') {
        const ceEn = Math.max(0, Math.abs(parseFloat(params.ceEntry) || 0));
        const peEn = Math.max(0, Math.abs(parseFloat(params.peEntry) || 0));
        const ceEx = Math.max(0, Math.abs(parseFloat(params.ceExit) || 0));
        const peEx = Math.max(0, Math.abs(parseFloat(params.peExit) || 0));
        if ((ceEn > 0 || peEn > 0) && (ceEx > 0 || peEx > 0)) {
          entry = ceEn + peEn;
          exit = ceEx + peEx;
        }
      }

      // Check if trade is an open position
      const isOpen = Boolean(
        params.isOpen ||
        params.status === 'OPEN' ||
        (!exit && !params.ceExit && !params.peExit)
      );

      if (isOpen) {
        exit = 0;
      }

      // Executed orders:
      // Open position: 1 order for single leg (Buy only); 2 for Both (CE buy + PE buy)
      // Closed position: 2 orders for single leg (Buy + Sell); 4 for Both (CE buy/sell + PE buy/sell)
      const defaultOrders = isOpen
        ? (optionType === 'Both' ? 2 : 1)
        : (optionType === 'Both' ? 4 : 2);

      const numOrders = Math.max(
        1,
        params.executedOrders != null
          ? Math.abs(parseInt(params.executedOrders, 10) || defaultOrders)
          : defaultOrders
      );

      // Exchange detection
      const indexUpper = (params.indexName || '').toUpperCase();
      let exchange = params.exchange || rates.default_exchange || 'NSE';
      if (!params.exchange) {
        if (['SENSEX', 'BANKEX'].includes(indexUpper)) {
          exchange = 'BSE';
        } else {
          exchange = rates.default_exchange || 'NSE';
        }
      }
      const isBse = exchange.toUpperCase() === 'BSE';

      const turnoverBuy = Math.max(0, entry * qty);
      const turnoverSell = Math.max(0, exit * qty);
      const totalTurnover = turnoverBuy + turnoverSell;

      // 1. Brokerage: Flat ₹20 per executed order
      const brokeragePerOrder = Math.max(0, parseFloat(rates.brokerage_per_order) || 20.00);
      const brokerage = Math.max(0, Math.round(brokeragePerOrder * Math.max(1, numOrders) * 100) / 100);

      // 2. STT: 0.15% on sell side (on premium)
      const sttRate = (parseFloat(rates.stt_rate_percent) || 0.15) / 100;
      const stt = Math.max(0, Math.round(turnoverSell * sttRate * 100) / 100);

      // 3. Exchange Transaction Charges: NSE 0.03553% | BSE 0.0325% on total premium turnover
      const txnRate = isBse
        ? (parseFloat(rates.bse_txn_rate_percent) || 0.0325) / 100
        : (parseFloat(rates.nse_txn_rate_percent) || 0.03553) / 100;
      const exchangeCharges = Math.max(0, Math.round(totalTurnover * txnRate * 100) / 100);

      // 4. SEBI Charges: ₹10 per crore (0.0001%)
      const sebiPerCr = parseFloat(rates.sebi_per_crore) || 10.00;
      const sebiCharges = Math.max(0, Math.round(totalTurnover * (sebiPerCr / 10000000) * 100) / 100);

      // 5. Stamp Duty: 0.003% (₹300 per crore) on buy side
      const stampDutyRate = (parseFloat(rates.stamp_duty_rate_percent) || 0.003) / 100;
      const stampDuty = Math.max(0, Math.round(turnoverBuy * stampDutyRate * 100) / 100);

      // 6. GST: 18% on (brokerage + SEBI charges + transaction charges)
      const gstRate = (parseFloat(rates.gst_rate_percent) || 18.0) / 100;
      const gst = Math.max(0, Math.round((brokerage + exchangeCharges + sebiCharges) * gstRate * 100) / 100);

      const totalCharges = Math.max(
        0,
        Math.round(
          (brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst) * 100
        ) / 100
      );

      // Realized Gross P&L is only present when an exit has been executed
      const hasExit = exit > 0 && params.status !== 'OPEN' && !params.isOpen;
      const grossPnl = hasExit ? Math.round((turnoverSell - turnoverBuy) * 100) / 100 : 0;
      const netPnl = hasExit ? Math.round((grossPnl - totalCharges) * 100) / 100 : -totalCharges;

      return {
        brokerage,
        stt,
        exchange_charges: exchangeCharges,
        gst,
        sebi_charges: sebiCharges,
        stamp_duty: stampDuty,
        other_charges: 0.0,
        total_charges: totalCharges,
        turnover_buy: Math.round(turnoverBuy * 100) / 100,
        turnover_sell: Math.round(turnoverSell * 100) / 100,
        total_turnover: Math.round(totalTurnover * 100) / 100,
        gross_profit: grossPnl > 0 ? grossPnl : 0,
        gross_loss: grossPnl < 0 ? Math.abs(grossPnl) : 0,
        net_pnl: netPnl,
        exchange: isBse ? 'BSE' : 'NSE',
        orders: numOrders,
        applied_rates: {
          brokerage_per_order: brokeragePerOrder,
          stt_rate_percent: (sttRate * 100).toFixed(5),
          exchange_rate_percent: (txnRate * 100).toFixed(5),
          gst_rate_percent: (gstRate * 100).toFixed(2),
          sebi_per_crore: sebiPerCr.toFixed(2),
          stamp_duty_rate_percent: (stampDutyRate * 100).toFixed(5),
        },
      };
    },
    [rates]
  );

  return (
    <BrokerageContext.Provider
      value={{
        rates,
        loading,
        isCustom,
        fetchSettings,
        updateRates,
        resetRates,
        calculateCharges,
      }}
    >
      {children}
    </BrokerageContext.Provider>
  );
}

export function useBrokerage() {
  const context = useContext(BrokerageContext);
  if (!context) {
    throw new Error('useBrokerage must be used within a BrokerageProvider');
  }
  return context;
}
