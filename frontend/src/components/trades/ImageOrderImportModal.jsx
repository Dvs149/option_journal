import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';
import { useLotSizes } from '../../context/LotSizeContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/client';

export default function ImageOrderImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  onApplyToForm, // Optional: if invoked from AddTrade page to auto-fill form
}) {
  const { isKite } = useTheme();
  const { showToast } = useToast();
  const { getLotSize } = useLotSizes();

  const fileInputRef = useRef(null);

  // Workflow states: 'UPLOAD' | 'PARSING' | 'REVIEW' | 'SUCCESS'
  const [step, setStep] = useState('UPLOAD');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [detectedOrders, setDetectedOrders] = useState([]);
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [importMode, setImportMode] = useState('smart'); // 'smart' | 'individual'
  const [importResult, setImportResult] = useState(null);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      resetModal();
    }
  }, [isOpen]);

  // Support paste from clipboard (Cmd+V / Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleProcessImageFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const resetModal = () => {
    setStep('UPLOAD');
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setShowImagePreview(false);
    setParsing(false);
    setImporting(false);
    setDetectedOrders([]);
    setImportResult(null);
    setTradeDate(new Date().toISOString().split('T')[0]);
    setImportMode('smart');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleProcessImageFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) {
      handleProcessImageFile(dropped);
    }
  };

  const handleProcessImageFile = async (imageFile) => {
    setFile(imageFile);
    const localUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(localUrl);
    setStep('PARSING');
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('screenshot', imageFile);

      const res = await api.post('/trades/parse-screenshot', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data.orders?.length > 0) {
        // Enforce lot size calculations if available
        const enrichedOrders = res.data.orders.map((ord, idx) => {
          const lotSize = getLotSize(ord.index_name) || ord.lot_size || 50;
          const qty = ord.quantity || lotSize;
          const lots = Math.max(1, Math.round(qty / lotSize));
          return {
            ...ord,
            id: ord.id || idx + 1,
            selected: true,
            lots,
            lot_size: lotSize,
            turnover: Math.round(qty * (ord.price || 0)),
          };
        });

        setDetectedOrders(enrichedOrders);
        setStep('REVIEW');
        showToast(`✓ Detected ${enrichedOrders.length} executed orders from screenshot!`, 'success');
      } else {
        showToast('No orders detected in this image. Please ensure order book table is clearly visible.', 'warning');
        setStep('UPLOAD');
      }
    } catch (err) {
      console.error('Screenshot parse error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to parse image';
      showToast(msg, 'error');
      setStep('UPLOAD');
    } finally {
      setParsing(false);
    }
  };

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

  // Edit order field inline
  const handleUpdateOrderField = (id, field, value) => {
    setDetectedOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== id) return ord;
        const updated = { ...ord, [field]: value };
        if (field === 'quantity' || field === 'price') {
          const q = Number(field === 'quantity' ? value : updated.quantity) || 0;
          const p = Number(field === 'price' ? value : updated.price) || 0;
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
      strike_price: '24000',
      option_type: 'CE',
      expiry_text: '',
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
        showToast(res.data?.message || 'Failed to import orders', 'error');
      }
    } catch (err) {
      console.error('Import screenshot orders error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to import orders';
      showToast(msg, 'error');
    } finally {
      setImporting(false);
    }
  };

  // Apply selected order(s) to AddTrade form (if invoked from AddTrade)
  const handleApplyToFormAction = () => {
    if (selectedCount === 0) {
      showToast('Select an order to apply to the form.', 'warning');
      return;
    }
    if (onApplyToForm) {
      onApplyToForm(selectedOrders);
      showToast('✓ Order details applied to trade form!', 'success');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0f172a] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] light:border-slate-200 bg-[#121b2d]/80 light:bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
              isKite
                ? 'bg-[#ff5722]/15 text-[#ff5722] border border-[#ff5722]/30'
                : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white light:text-slate-900">
                  Import Orders from Screenshot
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Zerodha Kite & Brokers
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload your executed order book screenshot to extract orders and auto-execute into your journal
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
          {/* STEP 1: Upload Zone (or top bar when review is active) */}
          {step === 'UPLOAD' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-10 md:p-14 border-2 border-dashed border-[#24344d] light:border-slate-300 rounded-3xl hover:border-cyan-500/50 bg-[#0e1626]/50 light:bg-slate-50/50 transition-all cursor-pointer group text-center space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10">
                <Upload className="w-8 h-8" />
              </div>

              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-bold text-white light:text-slate-900">
                  Drop order book screenshot here, or click to browse
                </h3>
                <p className="text-xs text-slate-400">
                  Supports <span className="text-slate-300 font-semibold">PNG, JPG, WEBP</span>. You can also press{' '}
                  <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#1e293b] light:bg-slate-200 border border-slate-700 font-mono text-cyan-400">
                    Cmd+V
                  </kbd>{' '}
                  or{' '}
                  <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#1e293b] light:bg-slate-200 border border-slate-700 font-mono text-cyan-400">
                    Ctrl+V
                  </kbd>{' '}
                  to paste from clipboard!
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
                <span className="px-2.5 py-1 rounded-lg bg-[#121b2d] light:bg-slate-200/80 border border-[#1e293b]">
                  ✓ Zerodha Kite Orders
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#121b2d] light:bg-slate-200/80 border border-[#1e293b]">
                  ✓ Groww / Angel One
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#121b2d] light:bg-slate-200/80 border border-[#1e293b]">
                  ✓ Color Badge Detection (BUY / SELL)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#121b2d] light:bg-slate-200/80 border border-[#1e293b]">
                  ✓ Automatic Turnovers & Lots
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Parsing Loader */}
          {step === 'PARSING' && (
            <div className="flex flex-col items-center justify-center p-16 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white light:text-slate-900">
                  Scanning Order Book with OCR...
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Extracting instruments, quantities, prices, and analyzing color badges for BUY/SELL orders.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Selection Table */}
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

                <div className="flex items-center gap-2">
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={() => setShowImagePreview(!showImagePreview)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1e293b] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white transition-colors cursor-pointer"
                    >
                      {showImagePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showImagePreview ? 'Hide Screenshot' : 'View Screenshot'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1e293b] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Upload Another</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Collapsible Screenshot Preview */}
              {showImagePreview && previewUrl && (
                <div className="p-3 rounded-2xl bg-[#0b101b] border border-[#1e293b] flex flex-col items-center justify-center animate-fade-in">
                  <div className="text-[11px] text-slate-400 mb-2 font-medium flex items-center gap-2">
                    <span>Uploaded Screenshot Reference</span>
                  </div>
                  <img
                    src={previewUrl}
                    alt="Order Book Preview"
                    className="max-h-72 object-contain rounded-xl border border-slate-800 shadow-md"
                  />
                </div>
              )}

              {/* Execution Preferences Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#0e1626]/80 light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                {/* Trade Execution Date */}
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">
                    Order Execution Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={tradeDate}
                      onChange={(e) => setTradeDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-cyan-500 font-mono-numbers"
                    />
                  </div>
                </div>

                {/* Import Mode Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">
                    Order Import Mode
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="smart">
                      Smart Match (Auto-pair BUY + SELL into round trips, rest open)
                    </option>
                    <option value="individual">
                      Individual Orders (Keep each order as an Open Position)
                    </option>
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
                            className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
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
                              ? 'bg-cyan-500/[0.03] hover:bg-cyan-500/[0.07]'
                              : 'opacity-50 hover:opacity-80 bg-transparent'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={ord.selected}
                              onChange={() => handleToggleOrder(ord.id)}
                              className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
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
                                value={ord.quantity}
                                onChange={(e) => handleUpdateOrderField(ord.id, 'quantity', e.target.value)}
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
                                step="0.05"
                                value={ord.price}
                                onChange={(e) => handleUpdateOrderField(ord.id, 'price', e.target.value)}
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

          {/* STEP 4: Success View */}
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
                  onClick={resetModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1e293b] light:bg-slate-200 text-slate-300 light:text-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  Import Another Screenshot
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
              <strong className="text-cyan-400">{selectedCount}</strong> of {totalCount} orders selected
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {/* If on AddTrade page, allow applying selected order directly to form */}
              {onApplyToForm && selectedCount > 0 && (
                <button
                  type="button"
                  onClick={handleApplyToFormAction}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-600/30 transition-all cursor-pointer"
                  title="Fill the Add Trade form using the selected order"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Apply Selected to Form</span>
                </button>
              )}

              {/* Execute Import */}
              <button
                type="button"
                disabled={importing || selectedCount === 0}
                onClick={handleExecuteImport}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg ${
                  importing || selectedCount === 0
                    ? 'opacity-50 cursor-not-allowed bg-slate-700'
                    : isKite
                    ? 'bg-[#ff5722] hover:bg-[#f4511e] shadow-[#ff5722]/30'
                    : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'
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
