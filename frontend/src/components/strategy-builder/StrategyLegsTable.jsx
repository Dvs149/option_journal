import React from 'react';
import { Plus, Trash2, Copy, CheckSquare, Square, RefreshCw } from 'lucide-react';

const formatLegExpiry = (exp) => {
  if (!exp) return '';
  try {
    const d = new Date(exp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
  } catch (e) {
    // fallback
  }
  return String(exp).replace(/^\d{4}-/, '');
};

export default function StrategyLegsTable({
  legs = [],
  onUpdateLeg,
  onToggleLeg,
  onDeleteLeg,
  onDuplicateLeg,
  onAddLeg,
  onClearAll,
  strikeStep = 50,
  spotPrice = 25000,
  expiryDates = [],
  isBookedPnlVisible = false,
  onToggleBookedPnl,
}) {
  // Compute totals
  let totalBooked = 0;
  let totalUnbooked = 0;

  legs.forEach((leg) => {
    if (leg.isActive === false) return;
    const isBuy = String(leg.side).toUpperCase() === 'BUY';
    const qty = (Number(leg.lots) || 1) * (Number(leg.lotSize) || 25);
    const entry = Number(leg.entryPrice || leg.ltp || 0);
    const ltp = Number(leg.ltp || entry);
    const pnl = isBuy ? (ltp - entry) * qty : (entry - ltp) * qty;
    const booked = Number(leg.bookedPnL || 0);

    totalUnbooked += pnl;
    totalBooked += booked;
  });

  const totalPnL = totalBooked + totalUnbooked;

  return (
    <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 flex flex-col select-none">
      {/* Header Bar with Booked / Unbooked / Total P&L */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Total Booked:</span>
            <span className={`font-semibold ${totalBooked >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>
              {totalBooked < 0 ? '-' : ''}₹{Math.abs(totalBooked).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-slate-700">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Total Unbooked:</span>
            <span className={`font-semibold ${totalUnbooked >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalUnbooked >= 0 ? '+' : '-'}₹{Math.abs(Math.round(totalUnbooked)).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="text-slate-700">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold">Total P&L:</span>
            <span className={`font-bold text-sm ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalPnL >= 0 ? '+' : '-'}₹{Math.abs(Math.round(totalPnL)).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {legs.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Legs List */}
      <div className="space-y-2.5 my-3 max-h-[420px] overflow-y-auto pr-1">
        {legs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <p className="font-semibold text-slate-400">No strategy legs selected.</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Click &quot;+ Add Leg&quot; to open the Option Chain, or choose a ready-made template.
            </p>
            <button
              onClick={onAddLeg}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Leg from Option Chain</span>
            </button>
          </div>
        ) : (
          legs.map((leg, index) => {
            const isBuy = String(leg.side).toUpperCase() === 'BUY';
            const qty = (Number(leg.lots) || 1) * (Number(leg.lotSize) || 25);
            const entry = Number(leg.entryPrice || leg.ltp || 0);
            const ltp = Number(leg.ltp || entry);
            const unbookedPnL = isBuy ? (ltp - entry) * qty : (entry - ltp) * qty;

            return (
              <div
                key={leg.id || index}
                className={`p-3 rounded-xl bg-[#0e1626]/75 border border-[#1e293b] hover:border-slate-700/80 transition-all space-y-2.5 ${
                  leg.isActive !== false ? 'opacity-100' : 'opacity-40'
                }`}
              >
                {/* Row 1: Instrument, Strike, Expiry, P&L, Actions */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  {/* Left: Checkbox, BUY/SELL, Strike, Type, Expiry */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Enable/Disable Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleLeg(index)}
                      className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                      title="Toggle leg in payoff calculation"
                    >
                      {leg.isActive !== false ? (
                        <CheckSquare className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>

                    {/* BUY / SELL Switch Badge */}
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateLeg(index, { side: isBuy ? 'SELL' : 'BUY' })
                      }
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold tracking-wider transition-all cursor-pointer select-none ${
                        isBuy
                          ? 'bg-blue-600/25 text-blue-400 border border-blue-500/40 hover:bg-blue-600/35'
                          : 'bg-rose-600/25 text-rose-400 border border-rose-500/40 hover:bg-rose-600/35'
                      }`}
                      title="Click to flip BUY / SELL"
                    >
                      {leg.side}
                    </button>

                    {/* Strike Selector / Input */}
                    <input
                      type="number"
                      step={strikeStep}
                      value={leg.strike}
                      onChange={(e) =>
                        onUpdateLeg(index, { strike: Number(e.target.value) })
                      }
                      className="w-20 bg-[#0b0f19] border border-slate-700/80 rounded-lg px-2 py-0.5 text-white font-mono font-semibold text-xs text-center focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    {/* Option Type CE / PE / FUT */}
                    <select
                      value={leg.type}
                      onChange={(e) =>
                        onUpdateLeg(index, { type: e.target.value })
                      }
                      className={`bg-[#0b0f19] border rounded-lg px-2 py-0.5 text-xs font-bold focus:outline-none cursor-pointer transition-colors ${
                        leg.type === 'CE'
                          ? 'border-emerald-500/40 text-emerald-400'
                          : leg.type === 'PE'
                          ? 'border-rose-500/40 text-rose-400'
                          : 'border-blue-500/40 text-blue-400'
                      }`}
                    >
                      <option value="CE" className="bg-[#121b2d] text-emerald-400">CE</option>
                      <option value="PE" className="bg-[#121b2d] text-rose-400">PE</option>
                      <option value="FUT" className="bg-[#121b2d] text-blue-400">FUT</option>
                    </select>

                    {/* Expiry Badge */}
                    {leg.expiry && (
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50">
                        {formatLegExpiry(leg.expiry)}
                      </span>
                    )}
                  </div>

                  {/* Right: P&L + Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono font-bold text-xs ${
                        unbookedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {unbookedPnL >= 0 ? '+' : '-'}₹{Math.abs(Math.round(unbookedPnL)).toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDuplicateLeg(index)}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Duplicate leg"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLeg(index)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete leg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Lots, Avg Entry Price, LTP */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-xs text-slate-400 border-t border-[#1e293b]/50">
                  <div className="flex flex-wrap items-center gap-3.5">
                    {/* Lots */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Lots:</span>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={leg.lots || 1}
                        onChange={(e) =>
                          onUpdateLeg(index, { lots: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="w-14 bg-[#0b0f19] border border-slate-700/80 rounded-lg px-2 py-0.5 text-white font-mono text-center text-xs focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({qty})
                      </span>
                    </div>

                    {/* Avg Entry Price */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Avg:</span>
                      <input
                        type="number"
                        step={0.05}
                        value={leg.entryPrice ?? leg.ltp ?? ''}
                        onChange={(e) =>
                          onUpdateLeg(index, { entryPrice: Number(e.target.value) })
                        }
                        className="w-24 bg-[#0b0f19] border border-slate-700/80 rounded-lg px-2 py-0.5 text-white font-mono text-right text-xs focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* LTP */}
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="text-slate-500 text-[11px]">LTP:</span>
                      <span className="text-slate-200 font-semibold">
                        ₹{Number(leg.ltp || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Optional Booked PnL if present */}
                  {isBookedPnlVisible && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-slate-500">Booked:</span>
                      <span className={Number(leg.bookedPnL || 0) >= 0 ? 'text-slate-300' : 'text-rose-400'}>
                        {Number(leg.bookedPnL || 0) < 0 ? '-' : ''}₹{Math.abs(Number(leg.bookedPnL || 0)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1e293b]">
        <button
          onClick={onAddLeg}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Leg
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isBookedPnlVisible}
              onChange={onToggleBookedPnl}
              className="rounded bg-slate-800 border-slate-700 text-blue-500 accent-blue-500"
            />
            <span>Add Booked P&L</span>
          </label>
        </div>
      </div>
    </div>
  );
}
