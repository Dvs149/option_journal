import React, { useState } from 'react';
import { calculateBlackScholes } from '../../utils/blackScholes';

export default function GreeksTable({ legs = [], spotPrice = 25000, daysToExpiry = 4 }) {
  const [multiplyLots, setMultiplyLots] = useState(true);

  const tYears = Math.max(0.001, daysToExpiry / 365.0);

  // Compute individual leg Greeks
  const legGreeks = legs.map((leg) => {
    const isCall = String(leg.type).toUpperCase() === 'CE';
    const isFut = String(leg.type).toUpperCase() === 'FUT';
    const isBuy = String(leg.side).toUpperCase() === 'BUY';
    const lots = Number(leg.lots) || 1;
    const lotSize = Number(leg.lotSize) || 25;
    const qty = lots * lotSize;
    const sign = isBuy ? 1 : -1;
    const strike = Number(leg.strike) || spotPrice;
    const iv = (Number(leg.iv) || 15) / 100.0;

    if (isFut) {
      return {
        ...leg,
        qty,
        delta: sign * 1.0,
        gamma: 0,
        theta: 0,
        vega: 0,
        decay: 0,
        ivPct: 0,
      };
    }

    const bs = calculateBlackScholes(isCall, spotPrice, strike, tYears, 0.068, iv);
    const decay = bs.theta * qty; // Total rupee decay per day

    return {
      ...leg,
      qty,
      delta: sign * bs.delta,
      gamma: sign * bs.gamma,
      theta: sign * bs.theta,
      vega: sign * bs.vega,
      decay,
      ivPct: (iv * 100).toFixed(1),
    };
  });

  // Calculate Net Totals
  const netDelta = legGreeks.reduce(
    (sum, g) => sum + (multiplyLots ? g.delta * g.qty : g.delta),
    0
  );
  const netGamma = legGreeks.reduce(
    (sum, g) => sum + (multiplyLots ? g.gamma * g.qty : g.gamma),
    0
  );
  const netTheta = legGreeks.reduce(
    (sum, g) => sum + (multiplyLots ? g.theta * g.qty : g.theta),
    0
  );
  const netVega = legGreeks.reduce(
    (sum, g) => sum + (multiplyLots ? g.vega * g.qty : g.vega),
    0
  );

  return (
    <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 select-none">
      {/* Net Greeks Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block mb-1">Net Delta (Δ)</span>
          <span
            className={`text-lg font-bold font-mono ${
              netDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netDelta >= 0 ? '+' : ''}
            {netDelta.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {netDelta > 0 ? 'Bullish bias' : netDelta < 0 ? 'Bearish bias' : 'Delta neutral'}
          </span>
        </div>

        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block mb-1">Net Theta (Θ)</span>
          <span
            className={`text-lg font-bold font-mono ${
              netTheta >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netTheta >= 0 ? '+' : ''}₹{Math.round(netTheta).toLocaleString('en-IN')}/day
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Daily time decay</span>
        </div>

        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block mb-1">Net Gamma (Γ)</span>
          <span className="text-lg font-bold font-mono text-cyan-400">
            {netGamma.toFixed(5)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Delta sensitivity</span>
        </div>

        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block mb-1">Net Vega (ν)</span>
          <span
            className={`text-lg font-bold font-mono ${
              netVega >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netVega >= 0 ? '+' : ''}₹{Math.round(netVega).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Per 1% IV shift</span>
        </div>
      </div>

      {/* Multiplier Toggle Bar */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#1e293b]">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          Option Legs Greeks Breakdown
        </h4>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={multiplyLots}
            onChange={(e) => setMultiplyLots(e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-blue-500 accent-blue-500"
          />
          <span>Multiply by Lot Size (Total ₹ Exposure)</span>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0e1626] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1e293b]">
            <tr>
              <th className="py-2.5 px-3">Leg</th>
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3">Strike</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">IV %</th>
              <th className="py-2.5 px-3 text-right">Delta</th>
              <th className="py-2.5 px-3 text-right">Theta (₹)</th>
              <th className="py-2.5 px-3 text-right">Gamma</th>
              <th className="py-2.5 px-3 text-right">Vega (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]/60 font-mono">
            {legGreeks.map((g, idx) => {
              const deltaVal = multiplyLots ? g.delta * g.qty : g.delta;
              const thetaVal = multiplyLots ? g.theta * g.qty : g.theta;
              const gammaVal = multiplyLots ? g.gamma * g.qty : g.gamma;
              const vegaVal = multiplyLots ? g.vega * g.qty : g.vega;

              return (
                <tr key={idx} className="hover:bg-[#162033] transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 font-sans">#{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        g.side === 'BUY'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {g.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white">{g.strike}</td>
                  <td className="py-2.5 px-3 font-semibold">{g.type}</td>
                  <td className="py-2.5 px-3 text-slate-400">{g.ivPct}%</td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      deltaVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {deltaVal >= 0 ? '+' : ''}
                    {deltaVal.toFixed(3)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      thetaVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {thetaVal >= 0 ? '+' : ''}₹{Math.round(thetaVal).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right text-cyan-400">
                    {gammaVal.toFixed(5)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right ${
                      vegaVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {vegaVal >= 0 ? '+' : ''}₹{Math.round(vegaVal).toLocaleString('en-IN')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
