import React, { useState } from 'react';
import { HelpCircle, Settings as SettingsIcon, TrendingUp, TrendingDown } from 'lucide-react';

export default function StrategyMetricsHeader({
  metrics,
  spotPrice = 25000,
  targetPrice = 25000,
  availableMargin = 366737,
  standaloneFunds = 246000,
  standaloneMargin = 246000,
}) {
  const [breakevenMode, setBreakevenMode] = useState('expiry'); // 'expiry' or 'target'

  const {
    maxProfitExpiry,
    maxLossExpiry,
    maxProfitTarget,
    maxLossTarget,
    breakevensExpiry = [],
    breakevensTarget = [],
    pop = 50,
    timeValueTotal = 0,
    intrinsicTotal = 0,
    targetPnLAtSpot = 0,
  } = metrics || {};

  const formatCurrency = (val) => {
    if (val === 'Unlimited') return 'Unlimited';
    if (typeof val !== 'number' || isNaN(val)) return '₹0';
    const sign = val >= 0 ? '+' : '-';
    const absVal = Math.abs(val);
    if (absVal >= 100000) {
      return `${sign}₹${(absVal / 100000).toFixed(2)}L`;
    }
    return `${sign}₹${absVal.toLocaleString('en-IN')}`;
  };

  const formatPoints = (val) => {
    if (typeof val !== 'number') return '0';
    return val.toLocaleString('en-IN');
  };

  const activeBreakevens = breakevenMode === 'expiry' ? breakevensExpiry : breakevensTarget;

  // Reward / Risk Ratio calculation
  let rewardRiskRatio = 'NA';
  if (typeof maxProfitExpiry === 'number' && typeof maxLossExpiry === 'number' && maxLossExpiry !== 0) {
    const ratio = Math.abs(maxProfitExpiry / maxLossExpiry);
    rewardRiskRatio = ratio >= 0.01 ? `1 : ${ratio.toFixed(2)}` : 'NA';
  } else if (maxProfitExpiry === 'Unlimited') {
    rewardRiskRatio = 'Unlimited';
  }

  // Profit left / Loss left relative to target/spot
  const profitLeftText = maxProfitExpiry === 'Unlimited' 
    ? 'Unlimited' 
    : typeof maxProfitExpiry === 'number'
      ? formatCurrency(Math.max(0, maxProfitExpiry - targetPnLAtSpot))
      : '₹0';

  const lossLeftText = maxLossExpiry === 'Unlimited'
    ? 'Unlimited'
    : typeof maxLossExpiry === 'number'
      ? formatCurrency(Math.min(0, maxLossExpiry - targetPnLAtSpot))
      : '₹0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
      {/* 1. Profit Left & Max Profit */}
      <div className="bg-[#121b2d] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="flex items-center gap-1">
            Profit left
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          </span>
          <span className="text-[11px] font-medium text-emerald-400">Target</span>
        </div>
        <div className="text-xl font-bold text-emerald-400 truncate mb-2">
          {profitLeftText}
        </div>
        <div className="text-[11px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-2">
          <div className="flex justify-between">
            <span>Max Profit:</span>
            <span className="font-semibold text-emerald-400">
              {formatCurrency(maxProfitExpiry)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Max Loss:</span>
            <span className="font-semibold text-rose-400">
              {formatCurrency(maxLossExpiry)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Loss Left & Max Loss */}
      <div className="bg-[#121b2d] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="flex items-center gap-1">
            Loss left
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          </span>
          <span className="text-[11px] font-medium text-rose-400">Risk</span>
        </div>
        <div className="text-xl font-bold text-rose-400 truncate mb-2">
          {lossLeftText}
        </div>
        <div className="text-[11px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-2">
          <div className="flex justify-between">
            <span>Target P&L:</span>
            <span className={`font-semibold ${targetPnLAtSpot >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(targetPnLAtSpot)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Max Risk:</span>
            <span className="font-semibold text-rose-400">
              {maxLossExpiry === 'Unlimited' ? 'Unlimited' : formatCurrency(maxLossExpiry)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Breakevens */}
      <div className="bg-[#121b2d] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="flex items-center gap-1">
            Breakeven
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          </span>
          {/* Toggle Target vs Expiry */}
          <div className="flex items-center bg-[#0e1626] rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setBreakevenMode('target')}
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                breakevenMode === 'target' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Target
            </button>
            <button
              onClick={() => setBreakevenMode('expiry')}
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                breakevenMode === 'expiry' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Expiry
            </button>
          </div>
        </div>

        <div className="text-sm font-bold text-slate-200 mt-1 space-y-1 mb-2">
          {activeBreakevens.length > 0 ? (
            activeBreakevens.map((be, idx) => {
              const diffPct = ((be - spotPrice) / spotPrice) * 100;
              const sign = diffPct >= 0 ? '+' : '';
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-white font-mono">{formatPoints(be)}</span>
                  <span className={`text-[11px] font-mono ${diffPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({sign}{diffPct.toFixed(1)}%)
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-500 italic py-1">No Breakeven in range</div>
          )}
        </div>

        <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
          <span>Spot Ref:</span>
          <span className="font-mono text-slate-300">{formatPoints(spotPrice)}</span>
        </div>
      </div>

      {/* 4. Reward / Risk & POP */}
      <div className="bg-[#121b2d] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Reward / Risk</span>
          <span className="font-mono font-bold text-slate-200">{rewardRiskRatio}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="flex items-center gap-1">
            POP
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <span className={`font-mono font-bold ${pop >= 55 ? 'text-emerald-400' : pop <= 40 ? 'text-rose-400' : 'text-amber-400'}`}>
            {pop}%
          </span>
        </div>
        <div className="text-[11px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-2">
          <div className="flex justify-between">
            <span>Time Value:</span>
            <span className="font-mono text-slate-300">₹{timeValueTotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span>Intrinsic Value:</span>
            <span className="font-mono text-slate-300">₹{intrinsicTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* 5. Funds & Margins */}
      <div className="bg-[#121b2d] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Funds & Margins</span>
          <SettingsIcon className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
        </div>
        <div className="space-y-1 my-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Standalone Funds:</span>
            <span className="font-mono text-slate-200">₹{(standaloneFunds / 100000).toFixed(2)}L</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Standalone Margin:</span>
            <span className="font-mono text-slate-200">₹{(standaloneMargin / 100000).toFixed(2)}L</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
          <span>Margin Available:</span>
          <span className="font-mono font-semibold text-emerald-400">
            ₹{availableMargin.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
