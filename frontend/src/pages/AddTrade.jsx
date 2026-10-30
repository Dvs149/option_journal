import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Receipt,
  BookOpen,
  Eye,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Upload,
  Image as ImageIcon,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import api from '../api/client';
import { formatINR } from '../utils/formatters';

const LOT_SIZES = {
  'NIFTY': 50,
  'BANK NIFTY': 15,
  'SENSEX': 10,
  'BANKEX': 15,
  'FINNIFTY': 25,
  'MIDCPNIFTY': 50,
  'STOCK': 1,
};

export default function AddTrade() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Active section tab: 'trade_details' | 'pnl_charges' | 'strategy_journal' | 'preview'
  const [activeTab, setActiveTab] = useState('trade_details');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);

  // Form State
  const [form, setForm] = useState({
    trade_date: '2025-08-31',
    index_name: 'NIFTY',
    trading_type: 'Intraday',
    option_type: 'CE',
    strike_price: '25000',
    expiry_date: '2025-09-04',
    entry_premium: '123.00',
    exit_premium: '156.00',
    quantity: '50',
    lots: '1',
    strategy_name: 'Long Straddle',
    custom_strategy: '',
    market_conditions: 'Rangebound',
    // P&L & Charges
    gross_profit: '6500.00',
    gross_loss: '0.00',
    total_charges: '165.00',
    brokerage: '40.00',
    stt: '15.00',
    exchange_charges: '12.00',
    gst: '18.00',
    sebi_charges: '2.00',
    stamp_duty: '3.00',
    other_charges: '75.00',
    // Strategy & Journal
    entry_reason: 'Breakout above resistance',
    exit_reason: 'Booked profit at target',
    trade_setup: 'Long Straddle before event',
    what_went_right: 'Good entry timing',
    what_went_wrong: 'Exited early',
    mistakes_made: 'Could have held longer',
    lessons_learned: 'Be patient with targets',
    personal_notes: 'N/A',
  });

  const currentLotSize = LOT_SIZES[form.index_name] || 50;

  // Handle Index Change
  const handleIndexChange = (e) => {
    const newIndex = e.target.value;
    const lotSize = LOT_SIZES[newIndex] || 50;
    const currentLots = parseInt(form.lots, 10) || 1;
    setForm((prev) => ({
      ...prev,
      index_name: newIndex,
      quantity: (currentLots * lotSize).toString(),
    }));
  };

  // Handle Lots Change
  const handleLotsChange = (e) => {
    const val = e.target.value;
    const numLots = parseInt(val, 10) || 0;
    setForm((prev) => ({
      ...prev,
      lots: val,
      quantity: (numLots * currentLotSize).toString(),
    }));
  };

  // Handle Quantity Change
  const handleQuantityChange = (e) => {
    const val = e.target.value;
    const numQty = parseInt(val, 10) || 0;
    const calcLots = Math.max(1, Math.round(numQty / currentLotSize));
    setForm((prev) => ({
      ...prev,
      quantity: val,
      lots: calcLots.toString(),
    }));
  };

  // Generic Field Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Total Charges Computed
  const computedTotalCharges = useMemo(() => {
    const b = parseFloat(form.brokerage) || 0;
    const s = parseFloat(form.stt) || 0;
    const ex = parseFloat(form.exchange_charges) || 0;
    const g = parseFloat(form.gst) || 0;
    const seb = parseFloat(form.sebi_charges) || 0;
    const st = parseFloat(form.stamp_duty) || 0;
    const o = parseFloat(form.other_charges) || 0;
    return (b + s + ex + g + seb + st + o).toFixed(2);
  }, [
    form.brokerage,
    form.stt,
    form.exchange_charges,
    form.gst,
    form.sebi_charges,
    form.stamp_duty,
    form.other_charges,
  ]);

  // Gross Profit & Gross Loss calculation
  const computedGrossProfit = useMemo(() => {
    const entry = parseFloat(form.entry_premium) || 0;
    const exit = parseFloat(form.exit_premium) || 0;
    const qty = parseFloat(form.quantity) || 0;
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      return diff > 0 ? diff.toFixed(2) : '0.00';
    }
    return parseFloat(form.gross_profit || 0).toFixed(2);
  }, [form.entry_premium, form.exit_premium, form.quantity, form.gross_profit]);

  const computedGrossLoss = useMemo(() => {
    const entry = parseFloat(form.entry_premium) || 0;
    const exit = parseFloat(form.exit_premium) || 0;
    const qty = parseFloat(form.quantity) || 0;
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      return diff < 0 ? Math.abs(diff).toFixed(2) : '0.00';
    }
    return parseFloat(form.gross_loss || 0).toFixed(2);
  }, [form.entry_premium, form.exit_premium, form.quantity, form.gross_loss]);

  // Net P&L Computed
  const computedNetPnl = useMemo(() => {
    const gp = parseFloat(computedGrossProfit) || 0;
    const gl = parseFloat(computedGrossLoss) || 0;
    const ch = parseFloat(computedTotalCharges) || 0;
    return (gp - gl - ch).toFixed(2);
  }, [computedGrossProfit, computedGrossLoss, computedTotalCharges]);

  // Auto Calculate Charges & P&L
  const handleAutoCalculate = async () => {
    const entry = parseFloat(form.entry_premium) || 0;
    const exit = parseFloat(form.exit_premium) || 0;
    const qty = parseInt(form.quantity, 10) || 0;

    let gp = '0.00';
    let gl = '0.00';
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      if (diff >= 0) {
        gp = diff.toFixed(2);
        gl = '0.00';
      } else {
        gp = '0.00';
        gl = Math.abs(diff).toFixed(2);
      }
    }

    try {
      const res = await api.post('/trades/estimate-charges', {
        entry_premium: entry,
        exit_premium: exit,
        quantity: qty,
      });

      if (res.data) {
        const est = res.data;
        setForm((prev) => ({
          ...prev,
          gross_profit: gp,
          gross_loss: gl,
          brokerage: est.brokerage.toFixed(2),
          stt: est.stt.toFixed(2),
          exchange_charges: est.exchange_charges.toFixed(2),
          gst: est.gst.toFixed(2),
          sebi_charges: est.sebi_charges.toFixed(2),
          stamp_duty: est.stamp_duty.toFixed(2),
          other_charges: est.other_charges.toFixed(2),
          total_charges: est.total_charges.toFixed(2),
        }));
        return;
      }
    } catch (e) {
      // Local estimation fallback
      const turnover = (entry + exit) * qty;
      const brokerage = 40.00;
      const stt = turnover * 0.000625;
      const exchangeCharges = turnover * 0.000505;
      const gst = (brokerage + exchangeCharges) * 0.18;
      const sebiCharges = turnover * 0.000001;
      const stampDuty = entry * qty * 0.00003;
      const otherCharges = 0;
      const total = brokerage + stt + exchangeCharges + gst + sebiCharges + stampDuty + otherCharges;

      setForm((prev) => ({
        ...prev,
        gross_profit: gp,
        gross_loss: gl,
        brokerage: brokerage.toFixed(2),
        stt: stt.toFixed(2),
        exchange_charges: exchangeCharges.toFixed(2),
        gst: gst.toFixed(2),
        sebi_charges: sebiCharges.toFixed(2),
        stamp_duty: stampDuty.toFixed(2),
        other_charges: otherCharges.toFixed(2),
        total_charges: total.toFixed(2),
      }));
    }
  };

  // Reset form
  const handleReset = () => {
    setForm({
      trade_date: new Date().toISOString().split('T')[0],
      index_name: 'NIFTY',
      trading_type: 'Intraday',
      option_type: 'CE',
      strike_price: '',
      expiry_date: '',
      entry_premium: '',
      exit_premium: '',
      quantity: '50',
      lots: '1',
      strategy_name: 'Long Straddle',
      custom_strategy: '',
      market_conditions: 'Rangebound',
      gross_profit: '0.00',
      gross_loss: '0.00',
      total_charges: '0.00',
      brokerage: '40.00',
      stt: '0.00',
      exchange_charges: '0.00',
      gst: '0.00',
      sebi_charges: '0.00',
      stamp_duty: '0.00',
      other_charges: '0.00',
      entry_reason: '',
      exit_reason: '',
      trade_setup: '',
      what_went_right: '',
      what_went_wrong: '',
      mistakes_made: '',
      lessons_learned: '',
      personal_notes: '',
    });
    setSelectedScreenshot(null);
    setScreenshotPreview(null);
  };

  // Handle Screenshot file
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Screenshot exceeds 5MB limit.');
        return;
      }
      setSelectedScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  // Handle Submit
  const handleSaveTrade = async (keepOpen = false) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        trade_date: form.trade_date,
        index_name: form.index_name,
        trading_type: form.trading_type,
        strategy_name: form.strategy_name === 'CUSTOM' ? form.custom_strategy : form.strategy_name,
        option_type: form.option_type,
        strike_price: form.strike_price || null,
        expiry_date: form.expiry_date || null,
        entry_premium: form.entry_premium || null,
        exit_premium: form.exit_premium || null,
        quantity: parseInt(form.quantity, 10) || null,
        lots: parseInt(form.lots, 10) || 1,
        gross_profit: parseFloat(computedGrossProfit) || 0,
        gross_loss: parseFloat(computedGrossLoss) || 0,
        brokerage: parseFloat(form.brokerage) || 0,
        stt: parseFloat(form.stt) || 0,
        exchange_charges: parseFloat(form.exchange_charges) || 0,
        gst: parseFloat(form.gst) || 0,
        sebi_charges: parseFloat(form.sebi_charges) || 0,
        stamp_duty: parseFloat(form.stamp_duty) || 0,
        other_charges: parseFloat(form.other_charges) || 0,
        total_charges: parseFloat(computedTotalCharges) || 0,
        // Journal & Analysis
        market_conditions: form.market_conditions,
        entry_reason: form.entry_reason,
        exit_reason: form.exit_reason,
        trade_setup: form.trade_setup,
        what_went_right: form.what_went_right,
        what_went_wrong: form.what_went_wrong,
        mistakes_made: form.mistakes_made,
        lessons_learned: form.lessons_learned,
        personal_notes: form.personal_notes,
      };

      await api.post('/trades', payload);
      setSuccessMessage('Trade successfully saved and recorded in journal!');

      if (keepOpen) {
        // Reset premiums and strike price for next trade, keep index & date
        setForm((prev) => ({
          ...prev,
          strike_price: '',
          entry_premium: '',
          exit_premium: '',
          gross_profit: '0.00',
          gross_loss: '0.00',
          entry_reason: '',
          exit_reason: '',
          what_went_right: '',
          what_went_wrong: '',
        }));
        setSelectedScreenshot(null);
        setScreenshotPreview(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setTimeout(() => {
          navigate('/trades');
        }, 800);
      }
    } catch (err) {
      let msg = err.response?.data?.message || 'Failed to save trade. Please verify all required fields.';
      if (err.response?.data?.errors) {
        const errorList = Object.values(err.response.data.errors).flat().join('. ');
        if (errorList) msg = errorList;
      } else if (!err.response) {
        msg = 'Cannot connect to backend server. Please verify Laravel is active on port 8000.';
      }
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToSection = (sectionId) => {
    setActiveTab(sectionId);
    if (sectionId === 'preview') {
      setShowPreviewModal(true);
      return;
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Breadcrumb & Page Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
          <span
            onClick={() => navigate('/dashboard')}
            className="hover:text-white light:hover:text-slate-900 cursor-pointer transition-colors"
          >
            Home
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-200 light:text-slate-700 font-medium">Add Trade</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
              Add Trade
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Record your option trade with all details
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Trade Details / P&L & Charges / Strategy & Journal / Preview) */}
      <div className="flex items-center gap-2 p-1.5 bg-[#121b2d] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => scrollToSection('trade_details')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'trade_details'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#18233a] light:hover:bg-slate-200/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Trade Details</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('pnl_charges')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'pnl_charges'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#18233a] light:hover:bg-slate-200/60'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>P&L & Charges</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('strategy_journal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'strategy_journal'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#18233a] light:hover:bg-slate-200/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Strategy & Journal</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'preview'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#18233a] light:hover:bg-slate-200/60'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Form Cards (8 cols) & Right Summary + Quick Actions (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Form Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Trade Details */}
          <div
            id="trade_details"
            className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                Trade Details
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter basic trade information
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Row 1: Trading Date, Index, Trading Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Trading Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      name="trade_date"
                      value={form.trade_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Index <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="index_name"
                    value={form.index_name}
                    onChange={handleIndexChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="NIFTY">NIFTY</option>
                    <option value="BANK NIFTY">BANK NIFTY</option>
                    <option value="SENSEX">SENSEX</option>
                    <option value="BANKEX">BANKEX</option>
                    <option value="FINNIFTY">FINNIFTY</option>
                    <option value="MIDCPNIFTY">MIDCPNIFTY</option>
                    <option value="STOCK">Individual Stock</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Trading Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="trading_type"
                    value={form.trading_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Intraday">Intraday</option>
                    <option value="BTST">BTST</option>
                    <option value="Overnight">Overnight</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Option Type (Pills), Strike Price, Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Option Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200">
                    {['CE', 'PE', 'Both'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, option_type: opt }))}
                        className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          form.option_type === opt
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Strike Price
                  </label>
                  <input
                    type="number"
                    step="50"
                    placeholder="25000"
                    name="strike_price"
                    value={form.strike_price}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={form.expiry_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Row 3: Entry Premium, Exit Premium, Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Entry Premium
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="123.00"
                    name="entry_premium"
                    value={form.entry_premium}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Exit Premium
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="156.00"
                    name="exit_premium"
                    value={form.exit_premium}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Quantity (Shares)
                  </label>
                  <input
                    type="number"
                    step={currentLotSize}
                    placeholder="50"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleQuantityChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Row 4: Number of Lots, Strategy Name, Market Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Number of Lots
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="lots"
                    value={form.lots}
                    onChange={handleLotsChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 light:text-slate-400 mt-1 block">
                    Lot size: {currentLotSize} ({form.index_name})
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Strategy Name
                  </label>
                  <select
                    name="strategy_name"
                    value={form.strategy_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Long Straddle">Long Straddle</option>
                    <option value="Long Strangle">Long Strangle</option>
                    <option value="Directional CE">Directional CE</option>
                    <option value="Directional PE">Directional PE</option>
                    <option value="Bull Call Spread">Bull Call Spread</option>
                    <option value="Bear Put Spread">Bear Put Spread</option>
                    <option value="Iron Condor">Iron Condor</option>
                    <option value="Short Straddle">Short Straddle</option>
                    <option value="Short Strangle">Short Strangle</option>
                    <option value="BTST">BTST</option>
                    <option value="Intraday Options">Intraday Options</option>
                    <option value="CUSTOM">Custom Strategy...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Market Condition
                  </label>
                  <select
                    name="market_conditions"
                    value={form.market_conditions}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Rangebound">Rangebound</option>
                    <option value="Bullish Trend">Bullish Trend</option>
                    <option value="Bearish Trend">Bearish Trend</option>
                    <option value="High Volatility">High Volatility</option>
                    <option value="Consolidation">Consolidation</option>
                    <option value="Expiry Day Volatility">Expiry Day Volatility</option>
                  </select>
                </div>
              </div>

              {form.strategy_name === 'CUSTOM' && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Custom Strategy Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom strategy"
                    name="custom_strategy"
                    value={form.custom_strategy}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Card 2: P&L & Charges */}
          <div
            id="pnl_charges"
            className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                P&L & Charges
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter profit, loss and trading charges
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Row 1: Gross Profit, Gross Loss, Total Charges, Auto Calculate Button */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="block text-slate-400 mb-1 font-medium">
                    Gross Profit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="gross_profit"
                    value={computedGrossProfit}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-emerald-50/40 border border-emerald-500/40 text-xs text-emerald-400 font-mono-numbers font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-slate-400 mb-1 font-medium">
                    Gross Loss
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="gross_loss"
                    value={computedGrossLoss}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-rose-400 font-mono-numbers focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-slate-400 mb-1 font-medium">
                    Total Charges
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="total_charges"
                    value={computedTotalCharges}
                    readOnly
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs text-slate-300 light:text-slate-700 font-mono-numbers focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAutoCalculate}
                    className="w-full px-3 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Auto Calculate</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Charges breakdown 4-column */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-slate-400 mb-1">Brokerage</label>
                  <input
                    type="number"
                    step="0.01"
                    name="brokerage"
                    value={form.brokerage}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">STT</label>
                  <input
                    type="number"
                    step="0.01"
                    name="stt"
                    value={form.stt}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Exchange Charges</label>
                  <input
                    type="number"
                    step="0.01"
                    name="exchange_charges"
                    value={form.exchange_charges}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">GST</label>
                  <input
                    type="number"
                    step="0.01"
                    name="gst"
                    value={form.gst}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Charges breakdown 3-column */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">SEBI Charges</label>
                  <input
                    type="number"
                    step="0.01"
                    name="sebi_charges"
                    value={form.sebi_charges}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Stamp Duty</label>
                  <input
                    type="number"
                    step="0.01"
                    name="stamp_duty"
                    value={form.stamp_duty}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Other Charges</label>
                  <input
                    type="number"
                    step="0.01"
                    name="other_charges"
                    value={form.other_charges}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Net P&L Highlight Box */}
              <div className="mt-4 p-4 rounded-2xl bg-[#0e1626] light:bg-emerald-50/50 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white light:text-slate-900 block">
                    Net P&L
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Automatically calculated
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-2xl font-black font-mono-numbers tracking-tight ${
                      parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
                    {formatINR(computedNetPnl)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Strategy & Journal */}
          <div
            id="strategy_journal"
            className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                Strategy & Journal
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Add strategy details and notes (optional)
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Row 1: Entry Reason, Exit Reason, Trade Setup, What Went Right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Entry Reason</label>
                  <input
                    type="text"
                    placeholder="Breakout above resistance"
                    name="entry_reason"
                    value={form.entry_reason}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Exit Reason</label>
                  <input
                    type="text"
                    placeholder="Booked profit at target"
                    name="exit_reason"
                    value={form.exit_reason}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Trade Setup</label>
                  <input
                    type="text"
                    placeholder="Long Straddle before event"
                    name="trade_setup"
                    value={form.trade_setup}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">What Went Right?</label>
                  <input
                    type="text"
                    placeholder="Good entry timing"
                    name="what_went_right"
                    value={form.what_went_right}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: What Went Wrong, Mistakes Made, Lessons Learned, Personal Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">What Went Wrong?</label>
                  <input
                    type="text"
                    placeholder="Exited early"
                    name="what_went_wrong"
                    value={form.what_went_wrong}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Mistakes Made</label>
                  <input
                    type="text"
                    placeholder="Could have held longer"
                    name="mistakes_made"
                    value={form.mistakes_made}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Lessons Learned</label>
                  <input
                    type="text"
                    placeholder="Be patient with targets"
                    name="lessons_learned"
                    value={form.lessons_learned}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Personal Notes</label>
                  <input
                    type="text"
                    placeholder="N/A"
                    name="personal_notes"
                    value={form.personal_notes}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Screenshot Upload Section */}
              <div className="pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-[#1e293b] light:border-slate-300 hover:border-blue-500/50 light:hover:border-blue-500 cursor-pointer transition-colors bg-[#0e1626]/50 light:bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                        {selectedScreenshot ? selectedScreenshot.name : 'Upload Screenshot (Optional)'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {selectedScreenshot
                          ? `${(selectedScreenshot.size / 1024).toFixed(1)} KB selected`
                          : 'Click to upload or drag and drop PNG, JPG up to 5MB'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-[#162033] light:bg-slate-200 text-slate-300 light:text-slate-700 text-xs font-medium hover:text-white"
                  >
                    {selectedScreenshot ? 'Change File' : 'Browse Files'}
                  </button>
                </div>

                {screenshotPreview && (
                  <div className="mt-3 relative inline-block">
                    <img
                      src={screenshotPreview}
                      alt="Trade screenshot preview"
                      className="h-28 rounded-xl object-cover border border-[#1e293b] shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedScreenshot(null);
                        setScreenshotPreview(null);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Trade Summary & Quick Actions */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* Trade Summary Card */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white light:text-slate-900">
                Trade Summary
              </h2>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live calculation
              </span>
            </div>

            {/* Spec details table */}
            <div className="divide-y divide-[#1e293b]/60 light:divide-slate-200 text-xs">
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Index</span>
                <span className="font-semibold text-white light:text-slate-900 font-sans">
                  {form.index_name}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Type</span>
                <span className="font-semibold text-white light:text-slate-900 font-sans">
                  {form.trading_type}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Option Type</span>
                <span className="font-semibold text-blue-400 font-sans">
                  {form.option_type}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Strike Price</span>
                <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                  {form.strike_price || '-'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Expiry Date</span>
                <span className="font-semibold text-white light:text-slate-900">
                  {form.expiry_date || '-'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Lots</span>
                <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                  {form.lots} ({form.quantity} Qty)
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Entry Premium</span>
                <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                  {form.entry_premium ? formatINR(form.entry_premium) : '-'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Exit Premium</span>
                <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                  {form.exit_premium ? formatINR(form.exit_premium) : '-'}
                </span>
              </div>
            </div>

            {/* Financial Calculations */}
            <div className="pt-2 border-t border-[#1e293b] light:border-slate-200 divide-y divide-[#1e293b]/60 light:divide-slate-200 text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Gross Profit</span>
                <span className="font-bold text-emerald-400 font-mono-numbers">
                  {formatINR(computedGrossProfit)}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Gross Loss</span>
                <span className="font-bold text-rose-400 font-mono-numbers">
                  {formatINR(computedGrossLoss)}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Total Charges</span>
                <span className="font-bold text-slate-300 light:text-slate-700 font-mono-numbers">
                  {formatINR(computedTotalCharges)}
                </span>
              </div>
            </div>

            {/* Net P&L in Summary */}
            <div className="pt-3 border-t border-[#1e293b] light:border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 light:text-slate-700">
                Net P&L
              </span>
              <span
                className={`text-xl font-black font-mono-numbers ${
                  parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
                {formatINR(computedNetPnl)}
              </span>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Quick Actions
            </h2>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveTrade(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Saving...' : 'Save Trade'}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveTrade(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-200 light:text-slate-800 hover:bg-[#162033] light:hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              Save & Add Another
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900 font-semibold text-xs transition-colors"
            >
              Reset Form
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar for Mobile View */}
      <div className="fixed bottom-16 inset-x-0 p-3 bg-[#0e1626]/95 light:bg-white/95 backdrop-blur-md border-t border-[#1e293b] light:border-slate-200 z-30 lg:hidden flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">Estimated Net P&L</span>
          <span
            className={`text-sm font-bold font-mono-numbers ${
              parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
            {formatINR(computedNetPnl)}
          </span>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSaveTrade(false)}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Trade'}
        </button>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e293b] light:border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Trade Card Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                <div>
                  <span className="text-sm font-bold text-white light:text-slate-900 block">
                    {form.index_name} {form.strike_price} {form.option_type}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {form.strategy_name} • {form.trading_type} • {form.trade_date}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-base font-black font-mono-numbers ${
                      parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
                    {formatINR(computedNetPnl)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Total Charges: {formatINR(computedTotalCharges)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Entry Reason</span>
                  <span className="text-slate-200 light:text-slate-800">
                    {form.entry_reason || 'Not specified'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Exit Reason</span>
                  <span className="text-slate-200 light:text-slate-800">
                    {form.exit_reason || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 text-xs font-semibold text-slate-300 light:text-slate-700"
              >
                Close Preview
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setShowPreviewModal(false);
                  handleSaveTrade(false);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30"
              >
                Save This Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
