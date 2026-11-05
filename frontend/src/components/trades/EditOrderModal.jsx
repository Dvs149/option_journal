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
  Edit2,
  RotateCw,
  ChevronDown,
  Layers,
} from 'lucide-react';
import api from '../../api/client';
import { formatINR } from '../../utils/formatters';
import { useBrokerage } from '../../context/BrokerageContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import OptionChainModal from './OptionChainModal';

export default function EditOrderModal({ trade, order, isOpen, onClose, onSuccess }) {
  const { isKite } = useTheme();
  const { showToast } = useToast();
  const { rates } = useBrokerage();

  const isSell = order?.order_type === 'SELL';

  const maxPermissibleQty = useMemo(() => {
    if (!trade || !order) return 999999;
    if (isSell) {
      const openQty = trade.open_quantity != null ? parseInt(trade.open_quantity, 10) : 0;
      return openQty + parseInt(order.quantity, 10);
    }
    return 999999;
  }, [trade, order, isSell]);

  const avgEntryPrice = useMemo(() => {
    if (!trade) return 0;
    return parseFloat(trade.avg_entry_price || trade.entry_premium || 0);
  }, [trade]);

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderTime, setOrderTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showOptionChainModal, setShowOptionChainModal] = useState(false);

  const handleSelectOptionFromChain = (opt) => {
    if (opt?.price) {
      setPrice(String(opt.price));
    }
  };

  // Charges state
  const [totalCharges, setTotalCharges] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [stt, setStt] = useState('');
  const [exchangeCharges, setExchangeCharges] = useState('');
  const [gst, setGst] = useState('');
  const [sebiCharges, setSebiCharges] = useState('');
  const [stampDuty, setStampDuty] = useState('');
  const [otherCharges, setOtherCharges] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      setQuantity(order.quantity ? order.quantity.toString() : '');
      setPrice(order.price ? parseFloat(order.price).toString() : '');
      setOrderDate(order.order_date || '');
      setOrderTime(order.order_time ? order.order_time.substring(0, 5) : '');
      setNotes(order.notes || '');

      setTotalCharges(order.total_charges != null ? parseFloat(order.total_charges).toFixed(2) : '0.00');
      setBrokerage(order.brokerage != null ? parseFloat(order.brokerage).toFixed(2) : '20.00');
      setStt(order.stt != null ? parseFloat(order.stt).toFixed(2) : '0.00');
      setExchangeCharges(order.exchange_charges != null ? parseFloat(order.exchange_charges).toFixed(2) : '0.00');
      setGst(order.gst != null ? parseFloat(order.gst).toFixed(2) : '0.00');
      setSebiCharges(order.sebi_charges != null ? parseFloat(order.sebi_charges).toFixed(2) : '0.00');
      setStampDuty(order.stamp_duty != null ? parseFloat(order.stamp_duty).toFixed(2) : '0.00');
      setOtherCharges(order.other_charges != null ? parseFloat(order.other_charges).toFixed(2) : '0.00');
      setShowBreakdown(false);
    }
  }, [isOpen, order]);

  const parsedQty = parseInt(quantity, 10) || 0;
  const parsedPrice = parseFloat(price) || 0;

  // Helper to calculate standard regulatory breakdown
  const calculateEstimatedBreakdown = (q, p) => {
    if (q <= 0 || p <= 0) {
      return { brokerage: '0.00', stt: '0.00', exchangeCharges: '0.00', sebiCharges: '0.00', stampDuty: '0.00', gst: '0.00', total: '0.00' };
    }
    const turnover = p * q;
    const isBse = ['SENSEX', 'BANKEX'].includes((trade?.index_name || '').toUpperCase());

    const brk = parseFloat(rates?.brokerage_per_order) || 20.0;
    const sttRate = isSell
      ? (parseFloat(rates?.stt_rate_percent) || 0.15) / 100
      : (parseFloat(rates?.stt_rate_percent) || 0.125) / 100;
    const s = turnover * sttRate;
    const txnRate = isBse
      ? (parseFloat(rates?.bse_txn_rate_percent) || 0.0325) / 100
      : (parseFloat(rates?.nse_txn_rate_percent) || 0.03553) / 100;
    const ex = turnover * txnRate;
    const sebi = turnover * ((parseFloat(rates?.sebi_per_crore) || 10.0) / 10000000);
    const sd = isSell ? 0.0 : turnover * ((parseFloat(rates?.stamp_duty_rate_percent) || 0.003) / 100);
    const g = (brk + ex + sebi) * ((parseFloat(rates?.gst_rate_percent) || 18.0) / 100);
    const tot = Math.round((brk + s + ex + sebi + sd + g) * 100) / 100;

    return {
      brokerage: brk.toFixed(2),
      stt: s.toFixed(2),
      exchangeCharges: ex.toFixed(2),
      sebiCharges: sebi.toFixed(2),
      stampDuty: sd.toFixed(2),
      gst: g.toFixed(2),
      total: tot.toFixed(2),
    };
  };

  const handleAutoCalculateCharges = () => {
    const est = calculateEstimatedBreakdown(parsedQty, parsedPrice);
    setBrokerage(est.brokerage);
    setStt(est.stt);
    setExchangeCharges(est.exchangeCharges);
    setGst(est.gst);
    setSebiCharges(est.sebiCharges);
    setStampDuty(est.stampDuty);
    setOtherCharges('0.00');
    setTotalCharges(est.total);
    showToast('Charges auto-calculated via active schedule', 'info');
  };

  const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const handleBreakdownChange = (field, val) => {
    const clean = val.replace(/-/g, '').replace(/[^0-9.]/g, '');
    const updated = {
      brokerage: field === 'brokerage' ? clean : brokerage,
      stt: field === 'stt' ? clean : stt,
      exchangeCharges: field === 'exchangeCharges' ? clean : exchangeCharges,
      gst: field === 'gst' ? clean : gst,
      sebiCharges: field === 'sebiCharges' ? clean : sebiCharges,
      stampDuty: field === 'stampDuty' ? clean : stampDuty,
      otherCharges: field === 'otherCharges' ? clean : otherCharges,
    };
    if (field === 'brokerage') setBrokerage(clean);
    if (field === 'stt') setStt(clean);
    if (field === 'exchangeCharges') setExchangeCharges(clean);
    if (field === 'gst') setGst(clean);
    if (field === 'sebiCharges') setSebiCharges(clean);
    if (field === 'stampDuty') setStampDuty(clean);
    if (field === 'otherCharges') setOtherCharges(clean);

    const sum =
      (parseFloat(updated.brokerage) || 0) +
      (parseFloat(updated.stt) || 0) +
      (parseFloat(updated.exchangeCharges) || 0) +
      (parseFloat(updated.gst) || 0) +
      (parseFloat(updated.sebiCharges) || 0) +
      (parseFloat(updated.stampDuty) || 0) +
      (parseFloat(updated.otherCharges) || 0);
    setTotalCharges(sum.toFixed(2));
  };

  const handleTotalChargesChange = (val) => {
    const clean = val.replace(/-/g, '').replace(/[^0-9.]/g, '');
    setTotalCharges(clean);
  };

  const activeCharges = parseFloat(totalCharges) || 0;

  // Realized Gross P&L if SELL
  const grossRealized = useMemo(() => {
    if (!isSell || parsedQty <= 0 || parsedPrice <= 0 || avgEntryPrice <= 0) return 0;
    return Math.round((parsedPrice - avgEntryPrice) * parsedQty * 100) / 100;
  }, [isSell, parsedQty, parsedPrice, avgEntryPrice]);

  const netRealized = useMemo(() => {
    return Math.round((grossRealized - activeCharges) * 100) / 100;
  }, [grossRealized, activeCharges]);

  if (!isOpen || !trade || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parsedQty <= 0) {
      showToast('Please enter a valid quantity greater than 0', 'error');
      return;
    }
    if (isSell && parsedQty > maxPermissibleQty) {
      showToast(`Quantity cannot exceed maximum permissible quantity of ${maxPermissibleQty}`, 'error');
      return;
    }
    if (parsedPrice <= 0) {
      showToast('Please enter a valid execution price', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.put(`/trades/${trade.id}/orders/${order.id}`, {
        quantity: parsedQty,
        price: parsedPrice,
        order_date: orderDate || undefined,
        order_time: orderTime ? `${orderTime}:00` : undefined,
        notes: notes,
        total_charges: activeCharges >= 0 ? activeCharges : undefined,
        brokerage: parseFloat(brokerage) >= 0 ? parseFloat(brokerage) : undefined,
        stt: parseFloat(stt) >= 0 ? parseFloat(stt) : undefined,
        exchange_charges: parseFloat(exchangeCharges) >= 0 ? parseFloat(exchangeCharges) : undefined,
        gst: parseFloat(gst) >= 0 ? parseFloat(gst) : undefined,
        sebi_charges: parseFloat(sebiCharges) >= 0 ? parseFloat(sebiCharges) : undefined,
        stamp_duty: parseFloat(stampDuty) >= 0 ? parseFloat(stampDuty) : undefined,
        other_charges: parseFloat(otherCharges) >= 0 ? parseFloat(otherCharges) : undefined,
      });

      showToast('Order updated successfully', 'success');
      if (onSuccess) {
        onSuccess(res.data?.trade);
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update order';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#0f172a] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] light:border-slate-200 bg-[#141e33] light:bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white light:text-slate-900">
                  Edit Executed Order #{order.id}
                </h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isSell
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {isSell ? 'SELL / EXIT' : 'BUY / ENTRY'}
                </span>
              </div>
              <p className="text-xs text-slate-400 light:text-slate-500">
                {trade.index_name} • {trade.strike_price} {trade.option_type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] light:hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 light:text-slate-700 mb-1.5">
                Quantity <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={isSell ? maxPermissibleQty : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={blockNegativeKeys}
                placeholder="e.g. 50"
                required
                className="w-full px-3 py-2 text-sm rounded-xl bg-[#141e33] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              {isSell && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Max allowed: <span className="text-amber-400 font-mono font-medium">{maxPermissibleQty} Qty</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300 light:text-slate-700">
                  Execution Price (₹) <span className="text-rose-400">*</span>
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/-/g, '').replace(/[^0-9.]/g, ''))}
                  onKeyDown={blockNegativeKeys}
                  placeholder="0.00"
                  required
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-xl bg-[#141e33] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 light:text-slate-700 mb-1.5">
                Order Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#141e33] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 light:text-slate-700 mb-1.5">
                Order Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="time"
                  step="1"
                  value={orderTime}
                  onChange={(e) => setOrderTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#141e33] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Charges Editing Section */}
          <div className="p-3.5 rounded-xl bg-[#141e33] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 light:text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-blue-400" />
                <span>Order Charges (₹)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoCalculateCharges}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 flex items-center gap-1 transition-colors"
                  title="Recalculate regulatory charges based on quantity & price"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Auto Calculate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBreakdown((prev) => !prev)}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-white bg-[#0e1626] light:bg-slate-200 border border-[#1e293b] light:border-slate-300 flex items-center gap-1 transition-colors"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
                  <span>{showBreakdown ? 'Hide Breakdown' : 'Breakdown'}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
              <input
                type="number"
                step="any"
                min="0"
                value={totalCharges}
                onChange={(e) => handleTotalChargesChange(e.target.value)}
                onKeyDown={blockNegativeKeys}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-sm rounded-xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-amber-400 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Detailed Breakdown */}
            {showBreakdown && (
              <div className="pt-2.5 border-t border-[#1e293b] light:border-slate-200 space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <label className="block text-slate-400 mb-1">Brokerage</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={brokerage}
                      onChange={(e) => handleBreakdownChange('brokerage', e.target.value)}
                      onKeyDown={blockNegativeKeys}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">STT / CTT</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={stt}
                      onChange={(e) => handleBreakdownChange('stt', e.target.value)}
                      onKeyDown={blockNegativeKeys}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Exchange Txn</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={exchangeCharges}
                      onChange={(e) => handleBreakdownChange('exchangeCharges', e.target.value)}
                      onKeyDown={blockNegativeKeys}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">GST (18%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={gst}
                      onChange={(e) => handleBreakdownChange('gst', e.target.value)}
                      onKeyDown={blockNegativeKeys}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="block text-slate-400 mb-1">SEBI Charges</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={sebiCharges}
                      onChange={(e) => handleBreakdownChange('sebiCharges', e.target.value)}
                      onKeyDown={blockNegativeKeys}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Stamp Duty</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={stampDuty}
                      onChange={(e) => handleBreakdownChange('stampDuty', e.target.value)}
                      onKeyDown={blockNegativeKeys}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Other Charges</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={otherCharges}
                      onChange={(e) => handleBreakdownChange('otherCharges', e.target.value)}
                      onKeyDown={blockNegativeKeys}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 light:text-slate-700 mb-1.5">
              Order Notes / Reason
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Trailing stop hit, book 50% profit, added on breakout"
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#141e33] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-xl bg-[#141e33] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Order Turnover</span>
              <span className="font-mono font-semibold text-white light:text-slate-900">
                ₹{formatINR(parsedPrice * parsedQty)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                Active Order Charges
              </span>
              <span className="font-mono text-amber-400 font-semibold">
                ₹{activeCharges.toFixed(2)}
              </span>
            </div>

            {isSell && (
              <>
                <div className="h-px bg-[#1e293b] light:bg-slate-200" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Avg Buy Price</span>
                  <span className="font-mono text-slate-300 light:text-slate-700">
                    ₹{avgEntryPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-300 light:text-slate-700">Realized Gross P&L</span>
                  <span
                    className={`font-mono font-bold ${
                      grossRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {grossRealized >= 0 ? '+' : ''}₹{formatINR(grossRealized)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-[#1e293b]/60">
                  <span className="text-white light:text-slate-900">Realized Net P&L</span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      netRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {netRealized >= 0 ? '+' : ''}₹{formatINR(netRealized)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-[#1e293b] light:hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-md flex items-center gap-1.5 ${
                isKite ? 'bg-[#ff5722] hover:bg-[#f4511e]' : 'bg-blue-600 hover:bg-blue-500'
              } disabled:opacity-50`}
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Option Chain Modal */}
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
