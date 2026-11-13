import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';
import { useLotSizes } from '../../context/LotSizeContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import api from '../../api/client';

export default function ZerodhaOrderImportModal({
  isOpen,
  onClose,
  rawOrders = [],
  onImportSuccess,
}) {
  const navigate = useNavigate();
  const { isKite } = useTheme();
  const { showToast } = useToast();
  const { getLotSize } = useLotSizes();

  // Workflow states: 'REVIEW' | 'SUCCESS'
  const [step, setStep] = useState('REVIEW');
  const [importing, setImporting] = useState(false);
  const [detectedOrders, setDetectedOrders] = useState([]);
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [importMode, setImportMode] = useState('smart'); // 'smart' | 'individual'
  const [optionType, setOptionType] = useState('Both'); // 'Both' | 'auto' | 'CE' | 'PE'
  const [importResult, setImportResult] = useState(null);

  // Close modal on Escape key
  useEscapeKey(onClose, isOpen);

  // Parse and initialize orders from Zerodha Kite when opening
  useEffect(() => {
    if (!isOpen) {
      setStep('REVIEW');
      setImportResult(null);
      return;
    }

    if (rawOrders && rawOrders.length > 0) {
      const enriched = rawOrders.map((ord, idx) => {
        // 1. Time
        let time = '09:30:00';
        if (ord.order_timestamp) {
          time = ord.order_timestamp.includes(' ')
            ? ord.order_timestamp.split(' ')[1]
            : ord.order_timestamp;
        }

        // 2. Type (BUY or SELL)
        const type = String(ord.transaction_type || 'BUY').toUpperCase();

        // 3. Tradingsymbol Parsing
        const sym = (ord.tradingsymbol || '').toUpperCase();
        let index_name = 'NIFTY';
        if (sym.includes('SENSEX')) index_name = 'SENSEX';
        else if (sym.includes('BANKNIFTY')) index_name = 'BANKNIFTY';
        else if (sym.includes('FINNIFTY')) index_name = 'FINNIFTY';
        else if (sym.includes('MIDCPNIFTY')) index_name = 'MIDCPNIFTY';
        else if (sym.includes('BANKEX')) index_name = 'BANKEX';

        let optType = 'CE';
        if (sym.endsWith('PE')) optType = 'PE';
        else if (sym.endsWith('CE')) optType = 'CE';

        let strike_price = '';
        const match = sym.match(/(\d{4,6})(CE|PE)$/i);
        if (match) {
          strike_price = match[1];
        }

        // Expiry text parsing from symbol (e.g. NIFTY26N1725150CE -> 17 NOV)
        let expiry_text = '';
        const expMatch = sym.match(/^(?:NIFTY|SENSEX|BANKNIFTY|FINNIFTY|MIDCPNIFTY|BANKEX)(\d{2})(?:([1-9OND])(\d{2})|([A-Z]{3}))/i);
        const monthMap = {
          '1': 'JAN', '2': 'FEB', '3': 'MAR', '4': 'APR', '5': 'MAY', '6': 'JUN',
          '7': 'JUL', '8': 'AUG', '9': 'SEP', 'O': 'OCT', 'N': 'NOV', 'D': 'DEC',
          'JAN': 'JAN', 'FEB': 'FEB', 'MAR': 'MAR', 'APR': 'APR', 'MAY': 'MAY', 'JUN': 'JUN',
          'JUL': 'JUL', 'AUG': 'AUG', 'SEP': 'SEP', 'OCT': 'OCT', 'NOV': 'NOV', 'DEC': 'DEC'
        };
        if (expMatch) {
          const [, , weeklyMonthChar, day, monthlyStr] = expMatch;
          if (weeklyMonthChar && day) {
            const m = monthMap[weeklyMonthChar.toUpperCase()] || weeklyMonthChar;
            expiry_text = `${parseInt(day, 10)} ${m}`;
          } else if (monthlyStr) {
            const m = monthMap[monthlyStr.toUpperCase()] || monthlyStr;
            expiry_text = `${m}`;
          }
        }
        if (!expiry_text) {
          expiry_text = '17 NOV';
        }

        const lotSize = Math.max(1, getLotSize(index_name) || (index_name === 'NIFTY' ? 65 : 50));
        const rawQty = ord.filled_quantity != null ? ord.filled_quantity : (ord.quantity != null ? ord.quantity : lotSize);
        const quantity = Math.max(1, Math.abs(parseInt(rawQty, 10)) || lotSize);
        const lots = Math.max(1, Math.round(quantity / lotSize));
        const price = Math.max(0, parseFloat(ord.average_price ?? ord.price ?? 0));
        const turnover = Math.round(quantity * price);

        return {
          id: ord.order_id || idx + 1,
          order_id: ord.order_id || null,
          selected: true,
          time,
          type,
          index_name,
          strike_price,
          option_type: optType,
          expiry_text,
          expiry_date: tradeDate,
          quantity,
          lots,
          lot_size: lotSize,
          price,
          turnover,
          product: ord.product || 'NRML',
          status: ord.status || 'COMPLETE',
        };
      });

      setDetectedOrders(enriched);

      // Auto-detect if order list contains same-strike pairs (CE + PE)
      const hasSameStrikePair = enriched.some((o1, i) =>
        enriched.some((o2, j) =>
          i !== j &&
          o1.strike_price &&
          o2.strike_price &&
          String(o1.strike_price) === String(o2.strike_price) &&
          o1.index_name === o2.index_name
        )
      );
      setOptionType(hasSameStrikePair ? 'Both' : 'auto');
    }
  }, [isOpen, rawOrders, tradeDate, getLotSize]);

  // Toggle single order selection
  const handleToggleOrder = (id) => {
    setDetectedOrders((prev) =>
      prev.map((ord) => (ord.id === id ? { ...ord, selected: !ord.selected } : ord))
    );
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    const allSelected = detectedOrders.every((o) => o.selected);
    setDetectedOrders((prev) => prev.map((o) => ({ ...o, selected: !allSelected })));
  };

  const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const handleOrderQuantityKeyDown = (ord, e) => {
    blockNegativeKeys(e);
    const ls = getLotSize(ord.index_name) || 50;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const current = parseInt(ord.quantity, 10) || 0;
      const nextLots = Math.floor(current / ls) + 1;
      const nextQty = nextLots * ls;
      handleUpdateOrderField(ord.id, 'quantity', nextQty);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseInt(ord.quantity, 10) || 0;
      const prevLots = Math.max(1, Math.ceil(current / ls) - 1);
      const prevQty = prevLots * ls;
      handleUpdateOrderField(ord.id, 'quantity', prevQty);
    }
  };

  // Edit order field inline
  const handleUpdateOrderField = (id, field, value) => {
    setDetectedOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== id) return ord;
        let cleanVal = value;
        if (field === 'quantity') {
          cleanVal = Math.max(1, Math.abs(parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 1));
        } else if (field === 'price' || field === 'strike_price') {
          cleanVal = Math.max(0, Math.abs(parseFloat(String(value).replace(/-/g, '')) || 0));
        }
        const updated = { ...ord, [field]: cleanVal };
        if (field === 'quantity' || field === 'price') {
          const q = Number(updated.quantity) || 0;
          const p = Number(updated.price) || 0;
          updated.turnover = Math.round(q * p);
          const lotSize = getLotSize(updated.index_name) || 50;
          updated.lots = Math.max(1, Math.round(q / lotSize));
        }
        if (field === 'index_name') {
          const lotSize = getLotSize(value) || 50;
          updated.lot_size = lotSize;
          updated.lots = Math.max(1, Math.round((updated.quantity || lotSize) / lotSize));
        }
        return updated;
      })
    );
  };

  // Delete row
  const handleDeleteRow = (id) => {
    setDetectedOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // Add manual row
  const handleAddRow = () => {
    const lotSize = getLotSize('NIFTY') || 65;
    const newOrd = {
      id: Date.now(),
      selected: true,
      time: '09:30:00',
      type: 'BUY',
      index_name: 'NIFTY',
      strike_price: '25150',
      option_type: 'CE',
      expiry_text: '17 NOV',
      expiry_date: tradeDate,
      quantity: lotSize,
      lots: 1,
      lot_size: lotSize,
      price: 100.0,
      turnover: lotSize * 100,
      product: 'NRML',
      status: 'COMPLETE',
    };
    setDetectedOrders((prev) => [...prev, newOrd]);
  };

  // Selected orders count
  const selectedOrders = useMemo(() => detectedOrders.filter((o) => o.selected), [detectedOrders]);
  const selectedCount = selectedOrders.length;
  const totalCount = detectedOrders.length;
  const buyCount = useMemo(() => selectedOrders.filter((o) => o.type === 'BUY').length, [selectedOrders]);
  const sellCount = useMemo(() => selectedOrders.filter((o) => o.type === 'SELL').length, [selectedOrders]);
  const totalSelectedTurnover = useMemo(
    () => selectedOrders.reduce((sum, o) => sum + (o.turnover || 0), 0),
    [selectedOrders]
  );

  // Handle Option Type Change (Both, CE, PE, auto)
  const handleOptionTypeChange = (newType) => {
    setOptionType(newType);
    if (newType === 'CE') {
      setDetectedOrders((prev) => prev.map((o) => ({ ...o, option_type: 'CE' })));
    } else if (newType === 'PE') {
      setDetectedOrders((prev) => prev.map((o) => ({ ...o, option_type: 'PE' })));
    } else if (newType === 'Both') {
      setDetectedOrders((prev) => {
        const groups = {};
        prev.forEach((o) => {
          const k = `${o.index_name}_${o.strike_price}`;
          if (!groups[k]) groups[k] = [];
          groups[k].push(o);
        });

        return prev.map((o) => {
          const k = `${o.index_name}_${o.strike_price}`;
          const items = groups[k];
          if (items && items.length === 2 && items[0].option_type === items[1].option_type) {
            if (o.id === items[1].id) {
              return { ...o, option_type: items[0].option_type === 'CE' ? 'PE' : 'CE' };
            }
          }
          return o;
        });
      });
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (selectedCount === 0) {
      showToast('Please select at least one order to import.', 'warning');
      return;
    }

    setImporting(true);
    try {
      const payload = {
        orders: selectedOrders,
        trade_date: tradeDate,
        import_mode: importMode,
        option_type: optionType,
      };

      const res = await api.post('/trades/import-screenshot-orders', payload);

      if (res.data?.success) {
        showToast(`✓ ${res.data.message}`, 'success');
        setImportResult(res.data);
        setStep('SUCCESS');
        if (onImportSuccess) {
          onImportSuccess(res.data);
        }
      } else {
        showToast(res.data?.message || 'Failed to import orders.', 'error');
      }
    } catch (err) {
      console.error('Zerodha order import error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to import orders';
      showToast(msg, 'error');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0c1322] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] light:border-slate-200 bg-[#121b2d]/80 light:bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/20 text-orange-500 border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-500/10">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white light:text-slate-900 tracking-tight">
                  Import Orders from Zerodha Kite
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Zerodha Kite Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Review and select executed orders from your Zerodha Kite account to auto-execute into your journal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-200 transition-colors cursor-pointer"
            title="Close popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Controls & Summary Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#121b2d] light:bg-slate-100 border border-[#1e293b] light:border-slate-200">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-white light:text-slate-900">
                    Detected Orders:
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {totalCount} Total
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    {buyCount} BUY
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    {sellCount} SELL
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-2">
                    Turnover: <strong className="text-white light:text-slate-900">{formatINR(totalSelectedTurnover)}</strong>
                  </span>
                </div>
              </div>

              {/* Execution Preferences Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#0e1626]/80 light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                {/* Trade Execution Date */}
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">
                    Order Execution Date
                  </label>
                  <input
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-orange-500 font-mono-numbers cursor-pointer"
                  />
                </div>

                {/* Import Mode Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">
                    Order Import Mode
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="smart">
                      Smart Match (Auto-pair BUY + SELL into Completed Trades)
                    </option>
                    <option value="individual">
                      Individual Orders (Keep each order as an Open Position)
                    </option>
                  </select>
                </div>

                {/* Option Type Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">
                    Option Type
                  </label>
                  <select
                    value={optionType}
                    onChange={(e) => handleOptionTypeChange(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    <option value="Both">Both (Combine same-strike into 1 entry)</option>
                    <option value="auto">Auto (As Detected)</option>
                    <option value="CE">CE</option>
                    <option value="PE">PE</option>
                  </select>
                </div>

                {/* Quick Add Row Button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1e293b] hover:bg-[#283852] light:bg-slate-200 text-slate-300 light:text-slate-800 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Missing Order</span>
                  </button>
                </div>
              </div>

              {/* Informative Banner when Both mode is active */}
              {optionType === 'Both' && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium animate-fade-in">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                  <span>
                    <strong>Option Type "Both" Active:</strong> Two orders with the same strike (CE & PE) will be added into a single <strong>Both (Straddle)</strong> entry.
                  </span>
                </div>
              )}

              {/* Orders Table */}
              <div className="rounded-2xl border border-[#1e293b] light:border-slate-200 overflow-hidden bg-[#121b2d] light:bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1e293b] light:border-slate-200 bg-[#0e1626] light:bg-slate-100 text-slate-400 font-semibold">
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={detectedOrders.length > 0 && detectedOrders.every((o) => o.selected)}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded border-slate-700 text-orange-500 focus:ring-0 cursor-pointer"
                            title="Select / Deselect all orders"
                          />
                        </th>
                        <th className="py-3 px-3">Time</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Instrument</th>
                        <th className="py-3 px-3">Expiry</th>
                        <th className="py-3 px-3">Qty (Lots)</th>
                        <th className="py-3 px-3">Avg Price</th>
                        <th className="py-3 px-3">Turnover</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b] light:divide-slate-200 font-medium">
                      {detectedOrders.map((ord) => (
                        <tr
                          key={ord.id}
                          className={`transition-colors ${
                            ord.selected
                              ? 'bg-orange-500/[0.03] hover:bg-orange-500/[0.07]'
                              : 'opacity-50 hover:opacity-80 bg-transparent'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={ord.selected}
                              onChange={() => handleToggleOrder(ord.id)}
                              className="w-4 h-4 rounded border-slate-700 text-orange-500 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Time */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <input
                              type="text"
                              value={ord.time}
                              onChange={(e) => handleUpdateOrderField(ord.id, 'time', e.target.value)}
                              className="w-20 px-2 py-1 rounded bg-[#0b101b] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 font-mono-numbers text-xs"
                            />
                          </td>

                          {/* Type */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateOrderField(ord.id, 'type', ord.type === 'BUY' ? 'SELL' : 'BUY')
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                ord.type === 'BUY'
                                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30'
                                  : 'bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30'
                              }`}
                              title="Click to toggle BUY / SELL"
                            >
                              {ord.type}
                            </button>
                          </td>

                          {/* Instrument */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={ord.index_name}
                                onChange={(e) => handleUpdateOrderField(ord.id, 'index_name', e.target.value)}
                                className="px-1.5 py-1 rounded bg-[#0b101b] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 font-bold text-xs"
                              >
                                <option value="NIFTY">NIFTY</option>
                                <option value="SENSEX">SENSEX</option>
                                <option value="BANKNIFTY">BANKNIFTY</option>
                                <option value="FINNIFTY">FINNIFTY</option>
                                <option value="MIDCPNIFTY">MIDCPNIFTY</option>
                                <option value="BANKEX">BANKEX</option>
                              </select>

                              <input
                                type="text"
                                value={ord.strike_price || ''}
                                placeholder="Strike"
                                onChange={(e) => handleUpdateOrderField(ord.id, 'strike_price', e.target.value)}
                                className="w-16 px-1.5 py-1 rounded bg-[#0b101b] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 font-mono-numbers text-xs"
                              />

                              <select
                                value={ord.option_type}
                                onChange={(e) => handleUpdateOrderField(ord.id, 'option_type', e.target.value)}
                                className={`px-1.5 py-1 rounded border text-xs font-bold ${
                                  ord.option_type === 'CE'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                    : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                                }`}
                              >
                                <option value="CE">CE</option>
                                <option value="PE">PE</option>
                              </select>
                            </div>
                          </td>

                          {/* Expiry */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <input
                              type="text"
                              value={ord.expiry_text || (ord.expiry_date ? formatDate(ord.expiry_date) : '')}
                              placeholder="Expiry"
                              onChange={(e) => handleUpdateOrderField(ord.id, 'expiry_text', e.target.value)}
                              className="w-24 px-2 py-1 rounded bg-[#0b101b] light:bg-slate-100 border border-[#1e293b] text-slate-300 light:text-slate-800 text-xs"
                            />
                          </td>

                          {/* Quantity & Lots */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={getLotSize(ord.index_name) || 50}
                                step={getLotSize(ord.index_name) || 50}
                                value={ord.quantity}
                                onChange={(e) => handleUpdateOrderField(ord.id, 'quantity', e.target.value)}
                                onKeyDown={(e) => handleOrderQuantityKeyDown(ord, e)}
                                className="w-16 px-2 py-1 rounded bg-[#0b101b] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 font-mono-numbers text-xs"
                              />
                              <span className="text-[10px] text-slate-400 font-semibold">
                                ({ord.lots}L)
                              </span>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">₹</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={ord.price}
                                onChange={(e) => handleUpdateOrderField(ord.id, 'price', e.target.value)}
                                onKeyDown={blockNegativeKeys}
                                className="w-20 px-2 py-1 rounded bg-[#0b101b] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 font-mono-numbers text-xs font-bold"
                              />
                            </div>
                          </td>

                          {/* Turnover */}
                          <td className="py-3 px-3 whitespace-nowrap font-mono-numbers text-slate-300 light:text-slate-700">
                            {formatINR(ord.turnover)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {ord.status || 'COMPLETE'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(ord.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Success View */}
          {step === 'SUCCESS' && importResult && (
            <div className="flex flex-col items-center justify-center p-10 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white light:text-slate-900">
                  Orders Successfully Imported!
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  {importResult.message ||
                    `Imported ${importResult.imported_trades_count} trades with ${importResult.imported_orders_count} orders.`}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/trades');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e293b] light:bg-slate-200 text-slate-200 light:text-slate-800 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>View in All Trades</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (for REVIEW step) */}
        {step === 'REVIEW' && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#1e293b] light:border-slate-200 bg-[#121b2d]/80 light:bg-slate-50/80">
            <div className="text-xs text-slate-400">
              <strong className="text-orange-400">{selectedCount}</strong> of {totalCount} orders selected
              {optionType === 'Both' && selectedCount >= 2 && (
                <span className="text-orange-400 font-semibold ml-2">
                  (Combine matching into 1 "Both" entry)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={importing || selectedCount === 0}
                onClick={handleExecuteImport}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg ${
                  importing || selectedCount === 0
                    ? 'opacity-50 cursor-not-allowed bg-slate-700'
                    : isKite
                    ? 'bg-[#ff5722] hover:bg-[#f4511e] shadow-[#ff5722]/30'
                    : 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'
                }`}
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing Orders...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Execute & Import Selected ({selectedCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
