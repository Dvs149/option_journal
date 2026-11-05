import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  IndianRupee,
  Receipt,
  SlidersHorizontal,
  RotateCw,
  Layers,
} from 'lucide-react';
import api from '../../api/client';
import { formatINR, formatDate } from '../../utils/formatters';
import { useLotSizes } from '../../context/LotSizeContext';
import { useBrokerage } from '../../context/BrokerageContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import OptionChainModal from './OptionChainModal';

export default function PartialExitModal({ trade, isOpen, onClose, onSuccess }) {
  const { isKite } = useTheme();
  const { showToast } = useToast();
  const { getLotSize } = useLotSizes();
  const { rates } = useBrokerage();

  const openQty = useMemo(() => {
    if (!trade) return 0;
    return trade.open_quantity != null ? parseInt(trade.open_quantity, 10) : parseInt(trade.quantity, 10) || 0;
  }, [trade]);

  const avgEntryPrice = useMemo(() => {
    if (!trade) return 0;
    return parseFloat(trade.avg_entry_price || trade.entry_premium || 0);
  }, [trade]);

  const lotSize = useMemo(() => {
    if (!trade) return 50;
    return getLotSize(trade.index_name) || 50;
  }, [trade, getLotSize]);

  const [exitQty, setExitQty] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderTime, setOrderTime] = useState('');
  const [notes, setNotes] = useState('');
  const [customCharges, setCustomCharges] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showOptionChainModal, setShowOptionChainModal] = useState(false);

  const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const handleSelectOptionFromChain = (opt) => {
    if (opt?.price) {
      setExitPrice(String(Math.max(0, Math.abs(parseFloat(opt.price) || 0))));
    }
  };

  // Initialize defaults whenever modal opens
  useEffect(() => {
    if (isOpen && trade) {
      setExitQty(openQty.toString());
      setExitPrice(trade.exit_premium ? parseFloat(trade.exit_premium).toFixed(2) : '');
      const now = new Date();
      setOrderDate(now.toISOString().split('T')[0]);
      setOrderTime(now.toTimeString().split(' ')[0].substring(0, 5));
      setNotes('');
      setCustomCharges('');
    }
  }, [isOpen, trade, openQty]);

  // Quick percentage selection
  const handleQuickPercent = (pct) => {
    if (!openQty) return;
    const calcQty = Math.max(1, Math.round((openQty * pct) / 100));
    setExitQty(calcQty.toString());
  };

  const parsedQty = parseInt(exitQty, 10) || 0;
  const parsedPrice = parseFloat(exitPrice) || 0;
  const remainingQty = Math.max(0, openQty - parsedQty);
  const lots = Math.max(1, Math.round(parsedQty / lotSize));

  // Live Realized P&L calculations
  const grossRealized = useMemo(() => {
    if (parsedQty <= 0 || parsedPrice <= 0 || avgEntryPrice <= 0) return 0;
    return Math.round((parsedPrice - avgEntryPrice) * parsedQty * 100) / 100;
  }, [parsedQty, parsedPrice, avgEntryPrice]);

  // Live estimated charges for this single SELL order
  const estimatedSellCharges = useMemo(() => {
    if (parsedQty <= 0 || parsedPrice <= 0) return 0;
    const turnover = parsedPrice * parsedQty;
    const isBse = ['SENSEX', 'BANKEX'].includes((trade?.index_name || '').toUpperCase());

    const brokerage = parseFloat(rates?.brokerage_per_order) || 20.00;
    const stt = turnover * ((parseFloat(rates?.stt_rate_percent) || 0.15) / 100);
    const txnRate = isBse
      ? (parseFloat(rates?.bse_txn_rate_percent) || 0.0325) / 100
      : (parseFloat(rates?.nse_txn_rate_percent) || 0.03553) / 100;
    const exchangeCharges = turnover * txnRate;
    const sebiCharges = turnover * ((parseFloat(rates?.sebi_per_crore) || 10.00) / 10000000);
    const stampDuty = 0.00; // 0 on sell side
    const gst = (brokerage + exchangeCharges + sebiCharges) * ((parseFloat(rates?.gst_rate_percent) || 18.0) / 100);

    return Math.round((brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst) * 100) / 100;
  }, [parsedQty, parsedPrice, trade?.index_name, rates]);

  const activeCharges = customCharges !== '' ? parseFloat(customCharges) || 0 : estimatedSellCharges;

  const netRealized = useMemo(() => {
    return Math.round((grossRealized - activeCharges) * 100) / 100;
  }, [grossRealized, activeCharges]);

  if (!isOpen || !trade) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parsedQty <= 0) {
      showToast('Please enter a valid quantity greater than 0', 'error');
      return;
    }
    if (parsedQty > openQty) {
      showToast(`Quantity cannot exceed current open quantity of ${openQty}`, 'error');
      return;
    }
    if (parsedPrice <= 0) {
      showToast('Please enter a valid exit price', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/trades/${trade.id}/orders`, {
        order_type: 'SELL',
        quantity: parsedQty,
        lots,
        price: parsedPrice,
        order_date: orderDate || new Date().toISOString().split('T')[0],
        order_time: orderTime ? `${orderTime}:00` : new Date().toTimeString().split(' ')[0],
        notes: notes || 'Partial Exit',
        total_charges: customCharges !== '' ? activeCharges : undefined,
      });

      showToast(
        remainingQty === 0
          ? `Position fully closed! Net P&L: ₹${res.data?.trade?.net_pnl || netRealized}`
          : `Partial exit executed: Sold ${parsedQty} Qty. ${remainingQty} Qty remaining open.`,
        'success'
      );

      if (onSuccess) {
        onSuccess(res.data?.trade);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to execute exit order';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1e293b] light:border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white light:text-slate-900">
                Execute Exit / Partial Order
              </h3>
              <p className="text-xs text-slate-400">
                {trade.index_name} {trade.strike_price ? Math.round(trade.strike_price) : ''} {trade.option_type} • {trade.trading_type}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white light:hover:text-slate-700 hover:bg-[#1e293b] light:hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Position Info Banner */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Open Quantity</span>
              <span className="font-bold text-amber-400 font-mono-numbers text-sm">
                {openQty} <span className="text-[11px] font-normal text-slate-400">Qty</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Avg Entry Price</span>
              <span className="font-bold text-white light:text-slate-900 font-mono-numbers text-sm">
                ₹{avgEntryPrice.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Lot Size</span>
              <span className="font-bold text-slate-300 light:text-slate-700 font-mono-numbers text-sm">
                {lotSize} / lot
              </span>
            </div>
          </div>

          {/* Quantity Input & Quick Percentages */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300 light:text-slate-700">
                Exit Quantity <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono-numbers">
                Remaining: <strong className={remainingQty === 0 ? 'text-emerald-400' : 'text-amber-400'}>{remainingQty} Qty</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={openQty}
                required
                value={exitQty}
                onChange={(e) => setExitQty(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={blockNegativeKeys}
                placeholder="Enter quantity to sell"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 text-sm font-mono-numbers focus:outline-none focus:border-blue-500"
              />
              <span className="px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs text-slate-400 font-mono-numbers whitespace-nowrap">
                {lots} {lots === 1 ? 'Lot' : 'Lots'}
              </span>
            </div>

            {/* Quick Percentage Buttons */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickPercent(pct)}
                  className={`py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    parsedQty === Math.round((openQty * pct) / 100)
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-[#0e1626] light:bg-slate-100 text-slate-400 hover:text-white light:hover:text-slate-900 border-[#1e293b] light:border-slate-200'
                  }`}
                >
                  {pct === 100 ? '100% (Close All)' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Exit Price */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300 light:text-slate-700">
                Exit Price (₹ per share) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowOptionChainModal(true)}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                title="View live Option Chain"
              >
                <Layers className="w-3 h-3" />
                <span>Option Chain</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="0.05"
                required
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value.replace(/-/g, '').replace(/[^0-9.]/g, ''))}
                onKeyDown={blockNegativeKeys}
                placeholder="e.g. 156.50"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 text-sm font-mono-numbers focus:outline-none focus:border-blue-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                ₹
              </span>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 light:text-slate-700 mb-1">
                Order Date
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 light:text-slate-700 mb-1">
                Order Time
              </label>
              <input
                type="time"
                value={orderTime}
                onChange={(e) => setOrderTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Exit Reason / Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 light:text-slate-700 mb-1">
              Exit Reason / Order Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Scaled out 80% at 1st target, booked partial profits"
              className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Live Execution P&L Summary Box */}
          <div className="p-3.5 rounded-2xl bg-[#0b1220] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Gross P&L for this Sell:</span>
              <span className={`font-mono-numbers font-semibold ${grossRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {grossRealized >= 0 ? '+' : ''}₹{grossRealized.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                <span>Sell Charges (₹):</span>
              </span>
              <div className="flex items-center gap-1.5 w-36">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customCharges !== '' ? customCharges : estimatedSellCharges.toFixed(2)}
                  onChange={(e) => setCustomCharges(e.target.value.replace(/-/g, '').replace(/[^0-9.]/g, ''))}
                  onKeyDown={blockNegativeKeys}
                  placeholder={estimatedSellCharges.toFixed(2)}
                  className="w-full px-2 py-1 text-right font-mono-numbers text-xs rounded-lg bg-[#141e33] light:bg-white border border-[#1e293b] light:border-slate-300 text-amber-400 font-bold focus:outline-none focus:border-blue-500"
                />
                {customCharges !== '' && (
                  <button
                    type="button"
                    onClick={() => setCustomCharges('')}
                    title="Reset to schedule"
                    className="p-1 rounded text-slate-400 hover:text-blue-400"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#1e293b] light:border-slate-200 flex items-center justify-between text-sm">
              <span className="font-semibold text-white light:text-slate-900">
                Net Realized P&L:
              </span>
              <span
                className={`font-mono-numbers font-bold text-base ${
                  netRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netRealized >= 0 ? '+' : ''}₹{netRealized.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-[#1e293b] light:border-slate-300 text-xs font-semibold text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#162033] light:hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || parsedQty <= 0 || parsedPrice <= 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                isKite
                  ? 'bg-[#ff5722] hover:bg-[#f4511e]'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
              } disabled:opacity-40 disabled:pointer-events-none`}
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Executing Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Execute Sell Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <OptionChainModal
        isOpen={showOptionChainModal}
        onClose={() => setShowOptionChainModal(false)}
        initialSymbol={trade?.index_name}
        initialStrike={trade?.strike_price}
        initialOptionType={trade?.option_type}
        initialExpiry={trade?.expiry_date}
        onSelectOption={handleSelectOptionFromChain}
      />
    </div>
  );
}
