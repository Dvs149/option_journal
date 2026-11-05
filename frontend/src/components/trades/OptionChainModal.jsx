import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Search,
  Check,
  Flame,
  Info,
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';

export default function OptionChainModal({
  isOpen,
  onClose,
  initialSymbol = 'NIFTY',
  initialStrike = null,
  initialOptionType = null,
  initialExpiry = null,
  onSelectOption, // callback: ({ index_name, strike_price, option_type, expiry_date, price, lot_size }) => void
}) {
  const { isKite } = useTheme();
  const { showToast } = useToast();

  const [symbol, setSymbol] = useState(initialSymbol || 'NIFTY');
  const [selectedExpiry, setSelectedExpiry] = useState(initialExpiry || '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [searchStrike, setSearchStrike] = useState('');
  const [rangeFilter, setRangeFilter] = useState('15'); // '10' | '15' | '25' | 'all'
  const [viewMode, setViewMode] = useState('standard'); // 'standard' | 'compact' | 'greeks'

  const tableContainerRef = useRef(null);

  // Sync initial symbol if modal opens with a specific trade's index
  useEffect(() => {
    if (isOpen) {
      if (initialSymbol) setSymbol(initialSymbol.toUpperCase());
      if (initialExpiry) setSelectedExpiry(initialExpiry);
      fetchOptionChain(initialSymbol || symbol, initialExpiry || selectedExpiry);
    }
  }, [isOpen, initialSymbol]);

  // Fetch option chain data
  const fetchOptionChain = async (sym = symbol, exp = selectedExpiry) => {
    try {
      setLoading(true);
      const params = { symbol: sym };
      if (exp) params.expiry = exp;

      const res = await api.get('/option-chain', { params });
      if (res.data?.success) {
        setData(res.data);
        if (res.data.selected_expiry) {
          setSelectedExpiry(res.data.selected_expiry);
        }
      } else {
        showToast('Failed to load Option Chain data', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch option chain:', err);
      showToast('Error loading live Option Chain', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Change Symbol
  const handleSymbolChange = (newSym) => {
    setSymbol(newSym);
    setSelectedExpiry('');
    fetchOptionChain(newSym, '');
  };

  // Change Expiry
  const handleExpiryChange = (newExp) => {
    setSelectedExpiry(newExp);
    fetchOptionChain(symbol, newExp);
  };

  // Filter strikes based on range and search
  const displayedRows = useMemo(() => {
    if (!data?.chain) return [];

    let rows = data.chain;

    // Strike search
    if (searchStrike.trim() !== '') {
      const q = searchStrike.trim();
      return rows.filter((r) => String(r.strike_price).includes(q));
    }

    // ATM Range filter
    if (rangeFilter !== 'all') {
      const count = parseInt(rangeFilter, 10) || 15;
      const atmIndex = rows.findIndex((r) => r.is_atm);
      if (atmIndex !== -1) {
        const start = Math.max(0, atmIndex - count);
        const end = Math.min(rows.length, atmIndex + count + 1);
        rows = rows.slice(start, end);
      }
    }

    return rows;
  }, [data, rangeFilter, searchStrike]);

  // Max OI for relative bar width
  const maxOi = useMemo(() => {
    if (!data?.chain) return 1;
    let m = 1;
    data.chain.forEach((r) => {
      if (r.call.oi > m) m = r.call.oi;
      if (r.put.oi > m) m = r.put.oi;
    });
    return m;
  }, [data]);

  // Scroll to ATM row when data arrives
  useEffect(() => {
    if (data?.chain && tableContainerRef.current) {
      const atmEl = tableContainerRef.current.querySelector('[data-atm="true"]');
      if (atmEl) {
        atmEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [data?.symbol, data?.selected_expiry, rangeFilter]);

  // Handle click on Call, Put, or Strike (Both) to select into trade form
  const handleSelectStrike = (strike, optType, price, extra = {}) => {
    if (!onSelectOption) return;
    const cePrice = extra.ce_price != null ? Number(extra.ce_price) : (optType === 'CE' ? Number(price) : null);
    const pePrice = extra.pe_price != null ? Number(extra.pe_price) : (optType === 'PE' ? Number(price) : null);

    onSelectOption({
      index_name: data?.symbol || symbol,
      strike_price: String(strike),
      option_type: optType,
      expiry_date: data?.selected_expiry || selectedExpiry,
      price: Number(price) || 0,
      ce_price: cePrice,
      pe_price: pePrice,
      lot_size: data?.lot_size || 50,
    });

    if (optType === 'Both') {
      showToast(`✓ Selected ${data?.symbol} ${strike} Straddle (Both CE @ ₹${cePrice} & PE @ ₹${pePrice})`, 'success');
    } else {
      showToast(`✓ Selected ${data?.symbol} ${strike} ${optType} @ ₹${price}`, 'success');
    }
    onClose();
  };

  if (!isOpen) return null;

  const indicesList = [
    { id: 'NIFTY', name: 'Nifty 50', exch: 'NSE' },
    { id: 'BANKNIFTY', name: 'Bank Nifty', exch: 'NSE' },
    { id: 'FINNIFTY', name: 'Fin Nifty', exch: 'NSE' },
    { id: 'MIDCPNIFTY', name: 'Midcap', exch: 'NSE' },
    { id: 'SENSEX', name: 'Sensex', exch: 'BSE' },
    { id: 'BANKEX', name: 'Bankex', exch: 'BSE' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-7xl max-h-[94vh] flex flex-col rounded-3xl bg-[#0f172a] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#1e293b] light:border-slate-200 bg-[#121b2d]/90 light:bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
                isKite
                  ? 'bg-[#ff5722]/15 text-[#ff5722] border border-[#ff5722]/30'
                  : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white light:text-slate-900">
                  Live Option Chain
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Real {data?.exchange || 'NSE'} Data
                </span>
                {data?.timestamp && (
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    • {data.timestamp}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Click Call/Put LTP for single order, or click <span className="text-cyan-400 font-bold">Strike</span> for <span className="text-orange-400 font-bold">"Both"</span> (Straddle)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => fetchOptionChain()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1e293b] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white transition-colors cursor-pointer"
              title="Refresh live option chain"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-200 transition-colors cursor-pointer"
              title="Close popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Index Selector Tabs & Expiry Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-[#1e293b] light:border-slate-200 bg-[#0b101b]/60 light:bg-slate-100/60 text-xs">
          {/* Index Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {indicesList.map((idx) => {
              const active = symbol === idx.id;
              return (
                <button
                  key={idx.id}
                  onClick={() => handleSymbolChange(idx.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? isKite
                        ? 'bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/30'
                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-[#121b2d] light:bg-white text-slate-400 hover:text-white light:hover:text-slate-900 border border-[#1e293b] light:border-slate-300'
                  }`}
                >
                  <span>{idx.id}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                      active ? 'bg-black/20 text-white' : 'bg-[#1e293b] text-slate-400'
                    }`}
                  >
                    {idx.exch}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Expiry Selector & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Expiry Pills (Sensibull Style) */}
            <div className="hidden sm:flex items-center gap-1.5">
              {data?.expiries?.slice(0, 4).map((exp) => {
                const isSel = selectedExpiry === exp.date || data?.selected_expiry === exp.date;
                return (
                  <button
                    key={exp.date || exp.raw}
                    type="button"
                    onClick={() => handleExpiryChange(exp.date)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isSel
                        ? 'bg-blue-600/25 text-blue-400 border border-blue-500/70 shadow-sm'
                        : 'bg-[#121b2d] light:bg-white text-slate-400 hover:text-white light:hover:text-slate-900 border border-[#1e293b] light:border-slate-300'
                    }`}
                  >
                    {exp.display}
                  </button>
                );
              })}
            </div>

            {/* Expiry Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedExpiry}
                onChange={(e) => handleExpiryChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 font-bold text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                title="Select from all upcoming expiries"
              >
                {data?.expiries?.map((exp) => (
                  <option key={exp.date || exp.raw} value={exp.date}>
                    {exp.display}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode: OI vs Greeks */}
            <div className="flex items-center rounded-xl bg-[#121b2d] border border-[#1e293b] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('standard')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'standard'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                OI
              </button>
              <button
                type="button"
                onClick={() => setViewMode('greeks')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'greeks'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Greeks
              </button>
            </div>

            {/* Strikes Range Selector */}
            <select
              value={rangeFilter}
              onChange={(e) => setRangeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-300 text-slate-300 light:text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              <option value="10">±10 Strikes</option>
              <option value="15">±15 Strikes</option>
              <option value="25">±25 Strikes</option>
              <option value="all">All Strikes</option>
            </select>

            {/* Search strike */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search strike..."
                value={searchStrike}
                onChange={(e) => setSearchStrike(e.target.value)}
                className="w-24 sm:w-28 px-2.5 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live Market Bar (Spot, Change, PCR, Max Pain, VIX) */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-6 py-3 border-b border-[#1e293b] light:border-slate-200 bg-[#0e1626]/70 light:bg-slate-50/70 text-xs">
            {/* Spot Price */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium block">
                {data.index_name} Spot
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white light:text-slate-900 font-mono-numbers">
                  {formatINR(data.spot_price)}
                </span>
                <span
                  className={`text-[10px] font-bold flex items-center ${
                    data.spot_change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {data.spot_change >= 0 ? (
                    <TrendingUp className="w-3 h-3 inline mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 inline mr-0.5" />
                  )}
                  {data.spot_change >= 0 ? '+' : ''}
                  {data.spot_change} ({data.spot_change_pct}%)
                </span>
              </div>
            </div>

            {/* ATM Strike */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium block">ATM Strike</span>
              <span className="text-sm font-bold text-cyan-400 font-mono-numbers block">
                {data.atm_strike}
              </span>
            </div>

            {/* Max Pain */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium block">Max Pain</span>
              <span className="text-sm font-bold text-amber-400 font-mono-numbers block">
                {data.max_pain}
              </span>
            </div>

            {/* PCR */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium block">PCR (Put/Call)</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white light:text-slate-900 font-mono-numbers">
                  {data.pcr}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    data.pcr_sentiment === 'Bullish'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : data.pcr_sentiment === 'Bearish'
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-slate-500/15 text-slate-400'
                  }`}
                >
                  {data.pcr_sentiment}
                </span>
              </div>
            </div>

            {/* India VIX */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium block">India VIX</span>
              <span className="text-sm font-bold text-purple-400 font-mono-numbers block">
                {data.vix}%
              </span>
            </div>

            {/* Total Call vs Put OI */}
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium block">Total Open Interest</span>
              <div className="text-[11px] font-mono-numbers flex items-center justify-between text-slate-300">
                <span className="text-blue-400 font-bold">{(data.total_call_oi / 100000).toFixed(1)}L C</span>
                <span className="text-orange-400 font-bold">{(data.total_put_oi / 100000).toFixed(1)}L P</span>
              </div>
            </div>
          </div>
        )}

        {/* Option Chain Table Area */}
        <div ref={tableContainerRef} className="flex-1 overflow-y-auto overflow-x-auto min-h-[380px]">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading real-time option chain data...</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              {/* Table Top Header: CALLS vs STRIKE vs PUTS */}
              <thead className="sticky top-0 z-20 bg-[#0e1626] light:bg-slate-100 border-b border-[#1e293b] light:border-slate-200">
                <tr className="border-b border-[#1e293b] light:border-slate-200 text-center font-bold">
                  <th
                    colSpan={5}
                    className="py-2 px-3 bg-blue-950/40 text-blue-400 uppercase tracking-wider border-r border-[#1e293b]"
                  >
                    CALLS (CE)
                  </th>
                  <th className="py-2 px-4 bg-[#121b2d] text-cyan-400 uppercase tracking-wider border-r border-[#1e293b]">
                    STRIKE
                  </th>
                  <th
                    colSpan={5}
                    className="py-2 px-3 bg-orange-950/40 text-orange-400 uppercase tracking-wider"
                  >
                    PUTS (PE)
                  </th>
                </tr>
                <tr className="text-[11px] text-slate-400 font-semibold border-b border-[#1e293b] light:border-slate-200 bg-[#0e1626]">
                  {/* CALLS COLUMNS */}
                  {viewMode === 'greeks' ? (
                    <>
                      <th className="py-2 px-3 text-right">Delta</th>
                      <th className="py-2 px-3 text-right">Theta</th>
                      <th className="py-2 px-3 text-right">Gamma</th>
                      <th className="py-2 px-3 text-right">Vega</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-3 text-right">OI</th>
                      <th className="py-2 px-3 text-right">Chg OI</th>
                      <th className="py-2 px-3 text-right">Volume</th>
                      <th className="py-2 px-3 text-right">IV%</th>
                    </>
                  )}
                  <th className="py-2 px-3 text-right border-r border-[#1e293b] bg-blue-950/20 text-white font-bold">
                    LTP (₹)
                  </th>

                  {/* STRIKE COLUMN */}
                  <th
                    className="py-2 px-4 text-center font-bold text-cyan-400 bg-[#162033] border-r border-[#1e293b]"
                    title="Click any strike to create Both (Straddle) order"
                  >
                    Strike (Both)
                  </th>

                  {/* PUTS COLUMNS */}
                  <th className="py-2 px-3 text-left border-r border-[#1e293b] bg-orange-950/20 text-white font-bold">
                    LTP (₹)
                  </th>
                  {viewMode === 'greeks' ? (
                    <>
                      <th className="py-2 px-3 text-left">Vega</th>
                      <th className="py-2 px-3 text-left">Gamma</th>
                      <th className="py-2 px-3 text-left">Theta</th>
                      <th className="py-2 px-3 text-left">Delta</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-3 text-left">IV%</th>
                      <th className="py-2 px-3 text-left">Volume</th>
                      <th className="py-2 px-3 text-left">Chg OI</th>
                      <th className="py-2 px-3 text-left">OI</th>
                    </>
                  )}
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-[#1e293b] light:divide-slate-200 font-mono-numbers">
                {displayedRows.map((row) => {
                  const isAtm = row.is_atm;
                  const callItm = row.call.itm;
                  const putItm = row.put.itm;

                  return (
                    <tr
                      key={row.strike_price}
                      data-atm={isAtm}
                      className={`transition-colors group ${
                        isAtm
                          ? 'bg-cyan-500/10 font-bold border-y-2 border-cyan-500/50'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* CALL: Data Columns (OI vs Greeks) */}
                      {viewMode === 'greeks' ? (
                        <>
                          <td className={`py-2 px-3 text-right text-cyan-300 ${callItm ? 'bg-blue-950/15' : ''}`}>
                            {row.call.delta}
                          </td>
                          <td className={`py-2 px-3 text-right text-rose-300 ${callItm ? 'bg-blue-950/15' : ''}`}>
                            {row.call.theta}
                          </td>
                          <td className={`py-2 px-3 text-right text-slate-400 text-[10px] ${callItm ? 'bg-blue-950/15' : ''}`}>
                            {row.call.gamma}
                          </td>
                          <td className={`py-2 px-3 text-right text-purple-300 ${callItm ? 'bg-blue-950/15' : ''}`}>
                            {row.call.vega}
                          </td>
                        </>
                      ) : (
                        <>
                          {/* CALL: OI with relative bar */}
                          <td
                            className={`py-2 px-3 text-right relative ${
                              callItm ? 'bg-blue-950/15' : ''
                            }`}
                          >
                            <div
                              className="absolute inset-y-0 right-0 bg-blue-500/10 pointer-events-none"
                              style={{ width: `${Math.min(100, (row.call.oi / maxOi) * 100)}%` }}
                            />
                            <span className="relative z-10 text-slate-300">
                              {row.call.oi.toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* CALL: Chg OI */}
                          <td
                            className={`py-2 px-3 text-right ${
                              callItm ? 'bg-blue-950/15' : ''
                            } ${row.call.oi_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                          >
                            {row.call.oi_change >= 0 ? '+' : ''}
                            {row.call.oi_change.toLocaleString('en-IN')}
                          </td>

                          {/* CALL: Volume */}
                          <td className={`py-2 px-3 text-right text-slate-400 ${callItm ? 'bg-blue-950/15' : ''}`}>
                            {row.call.volume.toLocaleString('en-IN')}
                          </td>

                          {/* CALL: IV */}
                          <td className={`py-2 px-3 text-right text-purple-300 text-[11px] ${callItm ? 'bg-blue-950/15' : ''}`}>
                            {row.call.iv}%
                          </td>
                        </>
                      )}

                      {/* CALL: LTP (Clickable) */}
                      <td
                        onClick={() => handleSelectStrike(row.strike_price, 'CE', row.call.ltp)}
                        className={`py-2 px-3 text-right font-bold text-white border-r border-[#1e293b] cursor-pointer hover:bg-blue-600/30 transition-colors ${
                          callItm ? 'bg-blue-950/30 text-blue-200' : 'bg-transparent'
                        }`}
                        title={`Click to select ${row.strike_price} CE @ ₹${row.call.ltp}`}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>₹{row.call.ltp.toFixed(2)}</span>
                          <span
                            className={`text-[9px] font-semibold ${
                              row.call.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {row.call.change >= 0 ? '+' : ''}
                            {row.call.change.toFixed(1)}
                          </span>
                        </div>
                      </td>

                      {/* STRIKE PRICE (Center) - Click to create "Both" Straddle order */}
                      <td
                        onClick={() =>
                          handleSelectStrike(
                            row.strike_price,
                            'Both',
                            (row.call.ltp + row.put.ltp).toFixed(2),
                            { ce_price: row.call.ltp, pe_price: row.put.ltp }
                          )
                        }
                        className={`py-2 px-4 text-center font-bold border-r border-[#1e293b] whitespace-nowrap cursor-pointer transition-all hover:scale-105 select-none ${
                          isAtm
                            ? 'bg-cyan-500/25 text-cyan-300 ring-2 ring-cyan-400/80 hover:bg-cyan-500/40 shadow-sm'
                            : 'bg-[#121b2d] text-white hover:bg-cyan-950/60 hover:text-cyan-300'
                        }`}
                        title={`Click to create "Both" (Straddle) trade for strike ${row.strike_price} (CE @ ₹${row.call.ltp} + PE @ ₹${row.put.ltp})`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-xs">{row.strike_price}</span>
                          {isAtm ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-cyan-400 text-slate-900 shadow-sm animate-pulse">
                              ATM
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-100 px-1 py-0.2 rounded text-[8px] font-bold bg-cyan-500/20 text-cyan-400 transition-opacity">
                              BOTH
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PUT: LTP (Clickable) */}
                      <td
                        onClick={() => handleSelectStrike(row.strike_price, 'PE', row.put.ltp)}
                        className={`py-2 px-3 text-left font-bold text-white border-r border-[#1e293b] cursor-pointer hover:bg-orange-600/30 transition-colors ${
                          putItm ? 'bg-orange-950/30 text-orange-200' : 'bg-transparent'
                        }`}
                        title={`Click to select ${row.strike_price} PE @ ₹${row.put.ltp}`}
                      >
                        <div className="flex items-center justify-start gap-1.5">
                          <span>₹{row.put.ltp.toFixed(2)}</span>
                          <span
                            className={`text-[9px] font-semibold ${
                              row.put.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {row.put.change >= 0 ? '+' : ''}
                            {row.put.change.toFixed(1)}
                          </span>
                        </div>
                      </td>

                      {/* PUT: Data Columns (OI vs Greeks) */}
                      {viewMode === 'greeks' ? (
                        <>
                          <td className={`py-2 px-3 text-left text-purple-300 ${putItm ? 'bg-orange-950/15' : ''}`}>
                            {row.put.vega}
                          </td>
                          <td className={`py-2 px-3 text-left text-slate-400 text-[10px] ${putItm ? 'bg-orange-950/15' : ''}`}>
                            {row.put.gamma}
                          </td>
                          <td className={`py-2 px-3 text-left text-rose-300 ${putItm ? 'bg-orange-950/15' : ''}`}>
                            {row.put.theta}
                          </td>
                          <td className={`py-2 px-3 text-left text-cyan-300 ${putItm ? 'bg-orange-950/15' : ''}`}>
                            {row.put.delta}
                          </td>
                        </>
                      ) : (
                        <>
                          {/* PUT: IV */}
                          <td className={`py-2 px-3 text-left text-purple-300 text-[11px] ${putItm ? 'bg-orange-950/15' : ''}`}>
                            {row.put.iv}%
                          </td>

                          {/* PUT: Volume */}
                          <td className={`py-2 px-3 text-left text-slate-400 ${putItm ? 'bg-orange-950/15' : ''}`}>
                            {row.put.volume.toLocaleString('en-IN')}
                          </td>

                          {/* PUT: Chg OI */}
                          <td
                            className={`py-2 px-3 text-left ${
                              putItm ? 'bg-orange-950/15' : ''
                            } ${row.put.oi_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                          >
                            {row.put.oi_change >= 0 ? '+' : ''}
                            {row.put.oi_change.toLocaleString('en-IN')}
                          </td>

                          {/* PUT: OI with relative bar */}
                          <td
                            className={`py-2 px-3 text-left relative ${
                              putItm ? 'bg-orange-950/15' : ''
                            }`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-orange-500/10 pointer-events-none"
                              style={{ width: `${Math.min(100, (row.put.oi / maxOi) * 100)}%` }}
                            />
                            <span className="relative z-10 text-slate-300">
                              {row.put.oi.toLocaleString('en-IN')}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Bottom Bar / Instructions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-[#1e293b] light:border-slate-200 bg-[#121b2d]/80 light:bg-slate-50/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Yellow/Blue highlighted rows represent <strong>In-The-Money (ITM)</strong> contracts. Click any LTP cell to insert contract.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#1e293b] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white transition-colors cursor-pointer"
          >
            Close Option Chain
          </button>
        </div>
      </div>
    </div>
  );
}
