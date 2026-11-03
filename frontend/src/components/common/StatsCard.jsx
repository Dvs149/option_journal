import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function MainStatsCard({
  title,
  value,
  change,
  isPositiveChange = true,
  icon: Icon,
  variant = 'green', // green, red, blue, teal, orange
  valueColor,
}) {
  const { isKite } = useTheme();

  // Determine if this metric or change is negative
  const isNegative =
    isPositiveChange === false ||
    (typeof change === 'string' && change.trim().startsWith('-')) ||
    (typeof value === 'string' && (value.trim().startsWith('-') || value.trim().includes('-₹'))) ||
    (typeof value === 'number' && value < 0);

  const effectiveVariant = isNegative && variant === 'green' ? (isKite ? 'orange' : 'red') : variant;

  const variantStyles = {
    green: {
      iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
      badge: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    },
    red: {
      iconBg: isKite
        ? 'bg-[#ff5722]/15 text-[#ff5722] border border-[#ff5722]/20'
        : 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
      badge: isKite
        ? 'text-[#ff5722] bg-[#ff5722]/15 border border-[#ff5722]/20'
        : 'text-rose-400 bg-rose-500/10 border border-rose-500/20',
    },
    orange: {
      iconBg: 'bg-[#ff5722]/15 text-[#ff5722] border border-[#ff5722]/20',
      badge: 'text-[#ff5722] bg-[#ff5722]/15 border border-[#ff5722]/20',
    },
    blue: {
      iconBg: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
      badge: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
    },
    teal: {
      iconBg: 'bg-teal-500/15 text-teal-400 border border-teal-500/20',
      badge: 'text-teal-400 bg-teal-500/10 border border-teal-500/20',
    },
  };

  const style = variantStyles[effectiveVariant] || variantStyles.green;
  const badgeStyle = isNegative
    ? isKite
      ? 'text-[#ff5722] bg-[#ff5722]/15 border border-[#ff5722]/20'
      : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
    : style.badge;

  // If icon is an upward trend but metric is negative, automatically use downward trend
  const EffectiveIcon = Icon === TrendingUp && isNegative ? TrendingDown : Icon;

  // Dynamic number color: if negative make it orange (or rose in default), else green
  const resolvedValueColor = valueColor || (
    isNegative
      ? isKite
        ? 'text-[#ff5722]'
        : 'text-rose-400'
      : isKite
        ? 'text-[#4caf50]'
        : 'text-emerald-400'
  );

  return (
    <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-xl 2xl:rounded-2xl p-3 2xl:p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 light:hover:border-slate-300 transition-all min-w-0">
      <div className="flex items-center justify-between gap-1.5 mb-2.5 2xl:mb-3 min-w-0">
        <div className={`w-8 h-8 2xl:w-10 2xl:h-10 rounded-lg 2xl:rounded-xl flex-shrink-0 flex items-center justify-center ${style.iconBg}`}>
          {EffectiveIcon && <EffectiveIcon className="w-4 h-4 2xl:w-5 2xl:h-5 stroke-[2]" />}
        </div>
        {change && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] 2xl:text-xs font-semibold px-1.5 2xl:px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${badgeStyle}`}>
            {isNegative ? <ArrowDownRight className="w-2.5 h-2.5 2xl:w-3 2xl:h-3 stroke-[2.5]" /> : <ArrowUpRight className="w-2.5 h-2.5 2xl:w-3 2xl:h-3 stroke-[2.5]" />}
            {change}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <span className="text-[11px] 2xl:text-xs font-medium text-slate-400 light:text-slate-500 block truncate mb-0.5 2xl:mb-1" title={title}>
          {title}
        </span>
        <div className={`text-base sm:text-lg xl:text-[17px] 2xl:text-2xl font-bold font-mono-numbers whitespace-nowrap tracking-tight ${resolvedValueColor}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

export function CompactMetricCard({ label, value, valueColor = 'text-white' }) {
  return (
    <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-xl px-2.5 2xl:px-3.5 py-2 2xl:py-2.5 flex flex-col justify-center shadow-sm min-w-0">
      <span className="text-[11px] font-medium text-slate-400 light:text-slate-500 truncate mb-0.5" title={label}>
        {label}
      </span>
      <span className={`text-sm sm:text-base xl:text-[13px] 2xl:text-base font-bold font-mono-numbers whitespace-nowrap tracking-tight ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
