import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Calendar,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  Crosshair,
  Filter,
} from 'lucide-react';

export default function OptionChainModal({
  isOpen,
  onClose,
  symbol = 'NIFTY',
  spotPrice = 25000,
  spotChange = 0,
  spotChangePct = 0,
  strikeStep = 50,
  lotSize = 25,
  expiryDates = [],
  selectedExpiry = '',
  onSelectExpiry,
  optionChain = [],
  activeLegs = [],
  onAddLegFromChain,
  onRemoveLeg,
  onAddFutureLeg,
}) {
  const [strikeRange, setStrikeRange] = useState('20'); // '10', '20', 'all'
  const atmRowRef = useRef(null);

  // Filter strikes around ATM
  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;

  const displayChain = useMemo(() => {
    if (!Array.isArray(optionChain) || optionChain.length === 0) return [];

    if (strikeRange === 'all') return optionChain;

    const count = strikeRange === '10' ? 5 : 10;
    const minStrike = atmStrike - count * strikeStep;
    const maxStrike = atmStrike + count * strikeStep;

    return optionChain.filter((row) => {
      const strike = Number(row.strike_price);
      return strike >= minStrike && strike <= maxStrike;
    });
  }, [optionChain, strikeRange, atmStrike, strikeStep]);

  // Auto-scroll to ATM strike on open
  useEffect(() => {
    if (isOpen && atmRowRef.current) {
      setTimeout(() => {
        atmRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format large numbers (OI in Cr / L)
  const formatOI = (val) => {
    if (!val || typeof val !== 'number') return '-';
    if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
    return val.toLocaleString('en-IN');
  };

  // Check if a leg exists in strategy builder
  const getLegStatus = (strike, type, side) => {
    return activeLegs.find(
      (leg) =>
        Number(leg.strike) === Number(strike) &&
        String(leg.type).toUpperCase() === String(type).toUpperCase() &&
        String(leg.side).toUpperCase() === String(side).toUpperCase() &&
        leg.isActive !== false
    );
  };

  const handleToggleLeg = (strike, type, side, price, iv) => {
    const existing = getLegStatus(strike, type, side);
    if (existing) {
      onRemoveLeg?.(existing.id);
    } else {
      onAddLegFromChain?.({
        side,
        type,
        strike: Number(strike),
        expiry: selectedExpiry,
        lots: 1,
        lotSize,
        entryPrice: Number(price) || 50,
        ltp: Number(price) || 50,
        iv: Number(iv) || 14.5,
        bookedPnL: 0,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#0e1626] border border-[#1e293b] rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-[#1e293b] bg-[#121b2d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-tight">{symbol}</span>
              <span className="text-sm font-black font-mono text-white">
                ₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
              </span>
              <span
                className={`text-xs font-mono font-semibold ${
                  spotChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {spotChange >= 0 ? '+' : ''}
                {spotChange.toFixed(1)} ({spotChangePct >= 0 ? '+' : ''}
                {spotChangePct.toFixed(2)}%)
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 pl-3 border-l border-slate-700/80">
              <span>Lot: <strong className="text-slate-200 font-mono">{lotSize}</strong></span>
              <span>Step: <strong className="text-slate-200 font-mono">{strikeStep}</strong></span>
            </div>
          </div>

          {/* Expiry Selector & Filter Controls */}
          <div className="flex items-center gap-2.5">
            {/* Expiry Date Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0b101c] border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <select
                value={selectedExpiry}
                onChange={(e) => onSelectExpiry?.(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {expiryDates.map((exp) => (
                  <option key={exp.date} value={exp.date} className="bg-[#0e1626] text-white">
                    {exp.date} ({exp.days_left}D)
                  </option>
                ))}
              </select>
            </div>

            {/* Strike Range Selector */}
            <div className="hidden sm:flex items-center bg-[#0b101c] border border-slate-700 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setStrikeRange('10')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  strikeRange === '10' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ±5 Strikes
              </button>
              <button
                onClick={() => setStrikeRange('20')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  strikeRange === '20' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ±10 Strikes
              </button>
              <button
                onClick={() => setStrikeRange('all')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  strikeRange === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>

            {/* Recenter at ATM */}
            <button
              onClick={() => {
                atmRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="p-1.5 rounded-lg bg-[#0b101c] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs"
              title="Scroll to ATM strike"
            >
              <Crosshair className="w-3.5 h-3.5 text-blue-400" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Banner / Legend */}
        <div className="grid grid-cols-11 bg-[#0b101c] text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-[#1e293b] py-2 px-4 text-center">
          <div className="col-span-5 text-left text-blue-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            CALLS (CE)
          </div>
          <div className="col-span-1 text-slate-200">STRIKE</div>
          <div className="col-span-5 text-right text-rose-400 flex items-center justify-end gap-1.5">
            PUTS (PE)
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-11 bg-[#0e1626] text-[10px] uppercase font-bold text-slate-500 border-b border-[#1e293b] py-1.5 px-4 text-center">
          <div className="col-span-1 text-left">OI</div>
          <div className="col-span-1 text-left">IV %</div>
          <div className="col-span-1 text-right">LTP (₹)</div>
          <div className="col-span-2 text-center">ORDER</div>
          <div className="col-span-1 text-slate-300 font-extrabold">PRICE</div>
          <div className="col-span-2 text-center">ORDER</div>
          <div className="col-span-1 text-left">LTP (₹)</div>
          <div className="col-span-1 text-right">IV %</div>
          <div className="col-span-1 text-right">OI</div>
        </div>

        {/* Option Chain Table Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]/70 font-mono text-xs">
          {displayChain.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p>Loading option chain for {symbol}...</p>
            </div>
          ) : (
            displayChain.map((row) => {
              const strike = Number(row.strike_price);
              const isAtm = strike === atmStrike;

              const callLtp = row.call?.ltp || 0;
              const callIv = row.call?.iv || 14.5;
              const callOi = row.call?.oi || 0;
              const isCallItm = strike < spotPrice;

              const putLtp = row.put?.ltp || 0;
              const putIv = row.put?.iv || 15.0;
              const putOi = row.put?.oi || 0;
              const isPutItm = strike > spotPrice;

              const buyCallLeg = getLegStatus(strike, 'CE', 'BUY');
              const sellCallLeg = getLegStatus(strike, 'CE', 'SELL');
              const buyPutLeg = getLegStatus(strike, 'PE', 'BUY');
              const sellPutLeg = getLegStatus(strike, 'PE', 'SELL');

              return (
                <div
                  key={strike}
                  ref={isAtm ? atmRowRef : null}
                  className={`grid grid-cols-11 py-2 px-4 items-center transition-colors text-center ${
                    isAtm
                      ? 'bg-yellow-500/15 border-y-2 border-yellow-500/50 font-bold'
                      : 'hover:bg-[#162033]'
                  }`}
                >
                  {/* CALLS SIDE (Col 1-5) */}
                  {/* Call OI */}
                  <div
                    className={`col-span-1 text-left text-[11px] truncate ${
                      isCallItm ? 'text-amber-200/90' : 'text-slate-400'
                    }`}
                  >
                    {formatOI(callOi)}
                  </div>

                  {/* Call IV */}
                  <div className="col-span-1 text-left text-[11px] text-slate-400">
                    {callIv}%
                  </div>

                  {/* Call LTP */}
                  <div className="col-span-1 text-right font-bold text-slate-100">
                    ₹{Number(callLtp).toFixed(1)}
                  </div>

                  {/* Call Order Buttons (BUY / SELL) */}
                  <div className="col-span-2 flex items-center justify-center gap-1.5 px-1">
                    {/* BUY Call Button */}
                    <button
                      onClick={() => handleToggleLeg(strike, 'CE', 'BUY', callLtp, callIv)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center min-w-[32px] ${
                        buyCallLeg
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400'
                          : 'bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600 hover:text-white'
                      }`}
                      title="Add BUY Call"
                    >
                      {buyCallLeg ? `B (${buyCallLeg.lots}L)` : 'B'}
                    </button>

                    {/* SELL Call Button */}
                    <button
                      onClick={() => handleToggleLeg(strike, 'CE', 'SELL', callLtp, callIv)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center min-w-[32px] ${
                        sellCallLeg
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 border border-rose-400'
                          : 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600 hover:text-white'
                      }`}
                      title="Add SELL Call"
                    >
                      {sellCallLeg ? `S (${sellCallLeg.lots}L)` : 'S'}
                    </button>
                  </div>

                  {/* CENTER STRIKE (Col 6) */}
                  <div className="col-span-1 flex flex-col items-center justify-center font-bold">
                    <span className={`text-xs ${isAtm ? 'text-yellow-400 font-extrabold scale-105' : 'text-white'}`}>
                      {strike}
                    </span>
                    {isAtm && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-yellow-400 text-black font-black uppercase font-sans tracking-wide">
                        ATM
                      </span>
                    )}
                  </div>

                  {/* PUTS SIDE (Col 7-11) */}
                  {/* Put Order Buttons (BUY / SELL) */}
                  <div className="col-span-2 flex items-center justify-center gap-1.5 px-1">
                    {/* BUY Put Button */}
                    <button
                      onClick={() => handleToggleLeg(strike, 'PE', 'BUY', putLtp, putIv)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center min-w-[32px] ${
                        buyPutLeg
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 border border-blue-400'
                          : 'bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600 hover:text-white'
                      }`}
                      title="Add BUY Put"
                    >
                      {buyPutLeg ? `B (${buyPutLeg.lots}L)` : 'B'}
                    </button>

                    {/* SELL Put Button */}
                    <button
                      onClick={() => handleToggleLeg(strike, 'PE', 'SELL', putLtp, putIv)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center min-w-[32px] ${
                        sellPutLeg
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 border border-rose-400'
                          : 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600 hover:text-white'
                      }`}
                      title="Add SELL Put"
                    >
                      {sellPutLeg ? `S (${sellPutLeg.lots}L)` : 'S'}
                    </button>
                  </div>

                  {/* Put LTP */}
                  <div className="col-span-1 text-left font-bold text-slate-100">
                    ₹{Number(putLtp).toFixed(1)}
                  </div>

                  {/* Put IV */}
                  <div className="col-span-1 text-right text-[11px] text-slate-400">
                    {putIv}%
                  </div>

                  {/* Put OI */}
                  <div
                    className={`col-span-1 text-right text-[11px] truncate ${
                      isPutItm ? 'text-amber-200/90' : 'text-slate-400'
                    }`}
                  >
                    {formatOI(putOi)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Bottom Bar: Active Legs Counter & Done Button */}
        <div className="px-5 py-3 border-t border-[#1e293b] bg-[#121b2d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">
              Selected in Builder ({activeLegs.length}):
            </span>

            {/* Active Legs Chips */}
            <div className="flex flex-wrap items-center gap-1.5 max-h-16 overflow-y-auto">
              {activeLegs.length === 0 ? (
                <span className="text-xs text-slate-500 italic">
                  Click &apos;B&apos; or &apos;S&apos; on any strike above to add legs
                </span>
              ) : (
                activeLegs.map((leg, i) => (
                  <span
                    key={leg.id || i}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold ${
                      leg.side === 'BUY'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {leg.side} {leg.lots}L {leg.strike} {leg.type}
                    <button
                      onClick={() => onRemoveLeg?.(leg.id)}
                      className="hover:text-white opacity-70 hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-95"
          >
            <span>Done / View Payoff Graph</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
