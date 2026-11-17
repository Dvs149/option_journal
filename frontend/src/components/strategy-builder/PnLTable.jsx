import React from 'react';

export default function PnLTable({ points = [], spotPrice = 25000, targetPrice = 25000 }) {
  // Sample every nth point for clean display
  const sampledPoints = points.filter((_, idx) => idx % 4 === 0);

  return (
    <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 overflow-x-auto select-none">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">P&L Payoff Matrix</h3>
        <span className="text-xs text-slate-400 font-mono">Spot Reference: ₹{spotPrice}</span>
      </div>

      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-[#0e1626] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1e293b]">
          <tr>
            <th className="py-2.5 px-3">Underlying Price</th>
            <th className="py-2.5 px-3">% Change</th>
            <th className="py-2.5 px-3 text-right">Target Date P&L</th>
            <th className="py-2.5 px-3 text-right">On Expiry P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e293b]/60 font-mono">
          {sampledPoints.map((p, idx) => {
            const pct = (((p.spot - spotPrice) / spotPrice) * 100).toFixed(1);
            const isSpot = Math.abs(p.spot - spotPrice) < 25;
            const isTarget = Math.abs(p.spot - targetPrice) < 25;

            return (
              <tr
                key={idx}
                className={`hover:bg-[#162033] transition-colors ${
                  isSpot
                    ? 'bg-yellow-500/10 font-bold'
                    : isTarget
                    ? 'bg-blue-500/10 font-bold'
                    : ''
                }`}
              >
                <td className="py-2 px-3 flex items-center gap-2">
                  <span>{p.spot}</span>
                  {isSpot && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-yellow-500/20 text-yellow-400 uppercase font-sans">
                      Spot
                    </span>
                  )}
                  {isTarget && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 uppercase font-sans">
                      Target
                    </span>
                  )}
                </td>
                <td className={`py-2 px-3 ${Number(pct) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Number(pct) >= 0 ? '+' : ''}{pct}%
                </td>
                <td
                  className={`py-2 px-3 text-right font-semibold ${
                    p.targetPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {p.targetPnL >= 0 ? '+' : ''}₹{p.targetPnL.toLocaleString('en-IN')}
                </td>
                <td
                  className={`py-2 px-3 text-right font-semibold ${
                    p.expiryPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {p.expiryPnL >= 0 ? '+' : ''}₹{p.expiryPnL.toLocaleString('en-IN')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
