import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Target,
  Sliders,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Activity,
  Flame,
  Award,
  Calendar,
  Clock,
  Info,
  ChevronDown,
  Database,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import api from '../api/client';
import { formatINR } from '../utils/formatters';

export default function RiskManagement() {
  const navigate = useNavigate();

  // Range button: 'Today' | 'This Week' | 'This Month' | 'This Year' | 'All'
  const [timeRange, setTimeRange] = useState('This Month');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Daily P&L vs Risk limits chart data (August 2025)
  const dailyPnLLimitsData = [
    { day: '1 Aug', pnl: 12.3 },
    { day: '4 Aug', pnl: -8.2 },
    { day: '5 Aug', pnl: 15.4 },
    { day: '6 Aug', pnl: 6.8 },
    { day: '7 Aug', pnl: -12.1 },
    { day: '8 Aug', pnl: 18.6 },
    { day: '11 Aug', pnl: 9.3 },
    { day: '12 Aug', pnl: 18.65 },
    { day: '13 Aug', pnl: -5.7 },
    { day: '14 Aug', pnl: 11.2 },
    { day: '15 Aug', pnl: 7.6 },
    { day: '18 Aug', pnl: -14.8 },
    { day: '19 Aug', pnl: 13.2 },
    { day: '20 Aug', pnl: 8.9 },
    { day: '21 Aug', pnl: -9.1 },
    { day: '22 Aug', pnl: 6.4 },
    { day: '25 Aug', pnl: 10.7 },
    { day: '26 Aug', pnl: -6.2 },
    { day: '27 Aug', pnl: 12.3 },
    { day: '28 Aug', pnl: 9.8 },
    { day: '29 Aug', pnl: -4.1 },
    { day: '31 Aug', pnl: 5.2 },
  ];

  // Drawdown curve data (August 2025)
  const drawdownCurveData = [
    { day: '1 Aug', dd: 0 },
    { day: '5 Aug', dd: -3200 },
    { day: '8 Aug', dd: -1200 },
    { day: '12 Aug', dd: 0 },
    { day: '15 Aug', dd: -5700 },
    { day: '18 Aug', dd: -24800 },
    { day: '20 Aug', dd: -18200 },
    { day: '22 Aug', dd: -28400 },
    { day: '25 Aug', dd: -14200 },
    { day: '28 Aug', dd: -32100 },
    { day: '31 Aug', dd: -42380 },
  ];

  // Risk vs Reward Scatter Points
  const scatterPoints = [
    { risk: 3200, reward: 8400, type: 'win' },
    { risk: 2800, reward: 6200, type: 'win' },
    { risk: 4500, reward: 12500, type: 'win' },
    { risk: 1800, reward: 4200, type: 'win' },
    { risk: 5000, reward: 18600, type: 'win' },
    { risk: 3500, reward: 7800, type: 'win' },
    { risk: 2400, reward: 5600, type: 'win' },
    { risk: 4100, reward: 9400, type: 'win' },
    { risk: 3800, reward: -3800, type: 'loss' },
    { risk: 5200, reward: -5200, type: 'loss' },
    { risk: 2900, reward: -2900, type: 'loss' },
    { risk: 4800, reward: -7200, type: 'loss' },
    { risk: 6500, reward: -14800, type: 'loss' },
    { risk: 3100, reward: -3100, type: 'loss' },
    { risk: 4400, reward: -4400, type: 'loss' },
  ];

  // Daily Risk Summary Table Rows
  const dailyRiskRows = [
    { date: '31 Aug 2025', trades: 4, pnl: 12350, maxLoss: -4800, maxProfit: 8200, riskUsed: '4,800 (19%)', status: 'Normal' },
    { date: '30 Aug 2025', trades: 3, pnl: -8420, maxLoss: -8420, maxProfit: 6100, riskUsed: '8,420 (34%)', status: 'Normal' },
    { date: '29 Aug 2025', trades: 5, pnl: 9020, maxLoss: -3200, maxProfit: 5600, riskUsed: '3,200 (13%)', status: 'Normal' },
    { date: '28 Aug 2025', trades: 4, pnl: -4990, maxLoss: -4990, maxProfit: 2600, riskUsed: '4,990 (20%)', status: 'Normal' },
    { date: '27 Aug 2025', trades: 6, pnl: 18650, maxLoss: -2100, maxProfit: 18650, riskUsed: '2,100 (8%)', status: 'Target Hit' },
  ];

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
            Risk Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track your risk limits, monitor drawdowns and maintain disciplined trading
          </p>
        </div>

        {/* Date Filter & Quick Range Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>01 Aug 2025 - 31 Aug 2025</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#121b2d] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs">
            {['Today', 'This Week', 'This Month', 'This Year', 'All'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeRange(t)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  timeRange === t
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1: 5 Risk Limit Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Daily Loss Limit */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Daily Loss Limit</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              ₹25,000
            </span>
            <div className="w-full bg-[#0e1626] light:bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: '50.6%' }} />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-numbers block mt-1">
              12,650 / 25,000 (50.6%)
            </span>
          </div>
        </div>

        {/* Daily Profit Target */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Daily Profit Target</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              ₹20,000
            </span>
            <div className="w-full bg-[#0e1626] light:bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: '91.8%' }} />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-numbers block mt-1">
              18,350 / 20,000 (91.8%)
            </span>
          </div>
        </div>

        {/* Monthly Loss Limit */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Monthly Loss Limit</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              ₹1,00,000
            </span>
            <div className="w-full bg-[#0e1626] light:bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: '42.4%' }} />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-numbers block mt-1">
              42,380 / 1,00,000 (42.4%)
            </span>
          </div>
        </div>

        {/* Monthly Profit Target */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Monthly Profit Target</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              ₹1,50,000
            </span>
            <div className="w-full bg-[#0e1626] light:bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: '85.6%' }} />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-numbers block mt-1">
              1,28,450 / 1,50,000 (85.6%)
            </span>
          </div>
        </div>

        {/* Max Risk Per Trade */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Max Risk Per Trade</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              ₹5,000
            </span>
            <span className="text-[11px] text-slate-400 font-mono-numbers block mt-2">
              Current Avg Risk: ₹3,250
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Daily P&L vs Risk Limits (6 cols) & Drawdown Chart (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Daily P&L vs Risk Limits */}
        <div className="lg:col-span-6 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Daily P&L vs Risk Limits
            </h2>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Profit</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-400">Loss</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 border-b-2 border-dashed border-rose-500" />
                <span className="text-slate-400">Loss Limit</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 border-b-2 border-dashed border-emerald-400" />
                <span className="text-slate-400">Target</span>
              </div>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPnLLimitsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} interval={4} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}K`} domain={[-30, 30]} />
                <ReferenceLine y={0} stroke="#334155" />
                <ReferenceLine y={20} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.5} />
                <ReferenceLine y={-25} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {dailyPnLLimitsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drawdown Chart */}
        <div className="lg:col-span-6 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Drawdown Chart
            </h2>
            <span className="text-xs text-slate-400">This Month</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownCurveData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskDdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} interval={2} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} domain={[-50000, 0]} />
                <Area type="monotone" dataKey="dd" stroke="#ef4444" strokeWidth={2} fill="url(#riskDdGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: 6 Risk KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Maximum Drawdown</span>
          <span className="text-base font-bold text-rose-400 font-mono-numbers block tracking-tight">₹42,380</span>
          <span className="text-[10px] text-rose-400 font-semibold">(6.8%)</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Current Drawdown</span>
          <span className="text-base font-bold text-white font-mono-numbers block tracking-tight">₹18,200</span>
          <span className="text-[10px] text-slate-400">(2.9%)</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Consecutive Losing Days</span>
          <span className="text-base font-bold text-rose-400 font-mono-numbers block tracking-tight">3</span>
          <span className="text-[10px] text-slate-400">Max: 4 days</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Consecutive Winning Days</span>
          <span className="text-base font-bold text-emerald-400 font-mono-numbers block tracking-tight">5</span>
          <span className="text-[10px] text-slate-400">Max: 7 days</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Largest Single-Day Loss</span>
          <span className="text-base font-bold text-rose-400 font-mono-numbers block tracking-tight">₹14,800</span>
          <span className="text-[10px] text-slate-400">18 Aug 2025</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Largest Single-Day Profit</span>
          <span className="text-base font-bold text-emerald-400 font-mono-numbers block tracking-tight">₹18,650</span>
          <span className="text-[10px] text-slate-400">12 Aug 2025</span>
        </div>
      </div>

      {/* Row 4: Risk Limit Alerts (4 cols), Risk vs Reward (4 cols), Risk Metrics (4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Risk Limit Alerts */}
        <div className="p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Risk Limit Alerts
            </h2>
            <button className="text-xs text-blue-400 hover:text-blue-300 font-semibold">View All</button>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Alert 1 */}
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400">Daily loss limit reached 80%</span>
                  <span className="text-[10px] text-slate-500">10:25 AM</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  You have used 80% of your daily loss limit (₹20,000 / ₹25,000)
                </p>
              </div>
            </div>

            {/* Alert 2 */}
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400">3 consecutive losing days</span>
                  <span className="text-[10px] text-slate-500">Yesterday</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  You have 3 consecutive losing days. Stay disciplined.
                </p>
              </div>
            </div>

            {/* Alert 3 */}
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">Monthly profit target 85%</span>
                  <span className="text-[10px] text-slate-500">26 Aug 2025</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  You have achieved 85% of your monthly profit target
                </p>
              </div>
            </div>

            {/* Alert 4 */}
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400">High drawdown alert</span>
                  <span className="text-[10px] text-slate-500">18 Aug 2025</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Current drawdown is 5.8% of capital
                </p>
              </div>
            </div>

            {/* Alert 5 */}
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
              <Target className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">Daily profit target achieved</span>
                  <span className="text-[10px] text-slate-500">12 Aug 2025</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  You have achieved your daily profit target
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk vs Reward Analysis */}
        <div className="p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Risk vs Reward Analysis
            </h2>
            <span className="text-xs text-slate-400">This Month</span>
          </div>

          <div className="p-2 rounded-xl bg-[#0e1626] border border-[#1e293b] flex items-center justify-between text-[10px] text-slate-300">
            <span>Avg Risk: ₹3,250</span>
            <span>Avg Reward: ₹6,780</span>
            <span className="font-bold text-emerald-400">R:R Ratio: 1:2.08</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                <XAxis type="number" dataKey="risk" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} domain={[0, 20000]} />
                <YAxis type="number" dataKey="reward" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} domain={[-20000, 20000]} />
                <ReferenceLine y={0} stroke="#334155" />
                <Scatter data={scatterPoints}>
                  {scatterPoints.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.type === 'win' ? '#10b981' : '#f43f5e'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Risk Metrics
            </h2>
            <span className="text-xs text-slate-400">This Month</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Average Risk per Trade</span>
              <span className="font-semibold text-white font-mono-numbers">₹3,250</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Average Reward per Trade</span>
              <span className="font-semibold text-emerald-400 font-mono-numbers">₹6,780</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Risk to Reward Ratio</span>
              <span className="font-bold text-white font-mono-numbers">1 : 2.08</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total Trades</span>
              <span className="font-semibold text-white font-mono-numbers">123</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Profitable Trades</span>
              <span className="font-semibold text-emerald-400 font-mono-numbers">82</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Losing Trades</span>
              <span className="font-semibold text-rose-400 font-mono-numbers">41</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Win Rate</span>
              <span className="font-bold text-emerald-400 font-mono-numbers">66.7%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Trades with &gt; 2R</span>
              <span className="font-semibold text-white font-mono-numbers">48 (39.0%)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>High Risk Trades (&gt; ₹5K)</span>
              <span className="font-semibold text-rose-400 font-mono-numbers">12 (9.8%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Daily Risk Summary (8 cols) & Monthly Risk Overview (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Daily Risk Summary */}
        <div className="lg:col-span-8 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Daily Risk Summary
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Total Trades</th>
                  <th className="py-2 text-right">Net P&L</th>
                  <th className="py-2 text-right">Max Loss</th>
                  <th className="py-2 text-right">Max Profit</th>
                  <th className="py-2 text-right">Risk Used</th>
                  <th className="py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                {dailyRiskRows.map((row) => (
                  <tr key={row.date} className="hover:bg-[#162033]/50">
                    <td className="py-2.5 text-slate-300 light:text-slate-700">{row.date}</td>
                    <td className="py-2.5 text-right font-mono-numbers text-slate-400">{row.trades}</td>
                    <td
                      className={`py-2.5 text-right font-mono-numbers font-bold ${
                        row.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {row.pnl >= 0 ? '+' : ''}{formatINR(row.pnl)}
                    </td>
                    <td className="py-2.5 text-right font-mono-numbers text-rose-400">{formatINR(row.maxLoss)}</td>
                    <td className="py-2.5 text-right font-mono-numbers text-emerald-400">+{formatINR(row.maxProfit)}</td>
                    <td className="py-2.5 text-right font-mono-numbers text-slate-300">{row.riskUsed}</td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.status === 'Target Hit'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Risk Overview */}
        <div className="lg:col-span-4 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Monthly Risk Overview
          </h2>

          <div className="space-y-4 text-xs">
            {/* Monthly Loss Limit Progress */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Monthly Loss Limit</span>
                <span className="font-mono-numbers text-slate-300">₹42,380 / ₹1,00,000 (42.4%)</span>
              </div>
              <div className="w-full bg-[#0e1626] h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '42.4%' }} />
              </div>
            </div>

            {/* Monthly Profit Target Progress */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Monthly Profit Target</span>
                <span className="font-mono-numbers text-emerald-400">₹1,28,450 / ₹1,50,000 (85.6%)</span>
              </div>
              <div className="w-full bg-[#0e1626] h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '85.6%' }} />
              </div>
            </div>

            {/* Total Risk Used */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Total Risk Used</span>
                <span className="font-mono-numbers text-slate-300">₹42,380 / ₹1,00,000 (42.4%)</span>
              </div>
              <div className="w-full bg-[#0e1626] h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '42.4%' }} />
              </div>
            </div>

            {/* Bottom Large Total */}
            <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between">
              <span className="text-slate-400 text-xs">Total Capital Protected</span>
              <span className="text-lg font-bold text-white font-mono-numbers">₹1,70,830</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
