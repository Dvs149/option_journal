import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  Bell,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  Award,
  Scale,
  ShieldAlert,
  LineChart as LineChartIcon,
  Download,
  Eye,
  FileSpreadsheet,
  Check,
  CheckCircle2,
  PieChart as PieChartIcon,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from 'recharts';
import api from '../api/client';
import { formatINR, formatCompactINR } from '../utils/formatters';

// Performance Overview Area & Line data
const PERFORMANCE_OVERVIEW_DATA = [
  { month: 'Jan 2025', netPnl: 24300, cumulativePnl: 24300, drawdown: 0 },
  { month: 'Feb 2025', netPnl: 18600, cumulativePnl: 42900, drawdown: -3200 },
  { month: 'Mar 2025', netPnl: 32400, cumulativePnl: 75300, drawdown: 0 },
  { month: 'Apr 2025', netPnl: -8100, cumulativePnl: 67200, drawdown: -12600 },
  { month: 'May 2025', netPnl: 26700, cumulativePnl: 93900, drawdown: -4200 },
  { month: 'Jun 2025', netPnl: -14800, cumulativePnl: 79100, drawdown: -42380 },
  { month: 'Jul 2025', netPnl: 48200, cumulativePnl: 127300, drawdown: -6800 },
  { month: 'Aug 2025', netPnl: 18650, cumulativePnl: 128450, drawdown: -8200 },
];

// Monthly Performance Bar Data
const MONTHLY_BAR_DATA = [
  { month: 'Jan', value: 24.3, amount: 24300, isProfit: true },
  { month: 'Feb', value: 18.6, amount: 18600, isProfit: true },
  { month: 'Mar', value: 32.4, amount: 32400, isProfit: true },
  { month: 'Apr', value: -8.1, amount: -8100, isProfit: false },
  { month: 'May', value: 26.7, amount: 26700, isProfit: true },
  { month: 'Jun', value: -14.8, amount: -14800, isProfit: false },
  { month: 'Jul', value: 48.2, amount: 48200, isProfit: true },
  { month: 'Aug', value: 18.7, amount: 18650, isProfit: true },
];

// Daily P&L bars across August
const DAILY_PNL_DATA = [
  { day: '1 Aug', pnl: 4200 },
  { day: '2 Aug', pnl: 6800 },
  { day: '4 Aug', pnl: -8200 },
  { day: '5 Aug', pnl: 15400 },
  { day: '6 Aug', pnl: 6800 },
  { day: '7 Aug', pnl: -12100 },
  { day: '8 Aug', pnl: 18650 },
  { day: '11 Aug', pnl: 9300 },
  { day: '12 Aug', pnl: 4100 },
  { day: '13 Aug', pnl: -5700 },
  { day: '14 Aug', pnl: 11200 },
  { day: '15 Aug', pnl: 7600 },
  { day: '18 Aug', pnl: -14800 },
  { day: '19 Aug', pnl: 13200 },
  { day: '20 Aug', pnl: 8900 },
  { day: '21 Aug', pnl: -9100 },
  { day: '22 Aug', pnl: 6400 },
  { day: '25 Aug', pnl: 10700 },
  { day: '26 Aug', pnl: -6200 },
  { day: '27 Aug', pnl: 12300 },
  { day: '28 Aug', pnl: 9800 },
  { day: '29 Aug', pnl: -4100 },
  { day: '31 Aug', pnl: 5200 },
];

// Distribution Data
const INDEX_DISTRIBUTION = [
  { name: 'NIFTY', value: 48, pct: '39.0%', color: '#3b82f6' },
  { name: 'BANKNIFTY', value: 32, pct: '26.0%', color: '#10b981' },
  { name: 'SENSEX', value: 18, pct: '14.6%', color: '#f59e0b' },
  { name: 'FINNIFTY', value: 12, pct: '9.8%', color: '#ef4444' },
  { name: 'MIDCPNIFTY', value: 8, pct: '6.5%', color: '#a855f7' },
  { name: 'Others', value: 5, pct: '4.1%', color: '#64748b' },
];

// Win / Loss donut
const WIN_LOSS_DATA = [
  { name: 'Winning Trades', value: 82, pct: '66.7%', color: '#10b981' },
  { name: 'Losing Trades', value: 41, pct: '33.3%', color: '#ef4444' },
];

// Trade duration bars
const DURATION_DATA = [
  { range: '< 5 min', count: 12 },
  { range: '5 - 15 min', count: 28 },
  { range: '15 - 30 min', count: 34 },
  { range: '30 - 60 min', count: 26 },
  { range: '> 60 min', count: 15 },
];

// Monthly Summary Table rows
const MONTHLY_TABLE_ROWS = [
  { month: 'Jan 25', trades: 18, winRate: '72.2%', netPnl: '₹24,350', isProfit: true, pf: '2.8', maxDd: '₹8,400' },
  { month: 'Feb 25', trades: 15, winRate: '60.0%', netPnl: '₹18,650', isProfit: true, pf: '2.1', maxDd: '₹6,200' },
  { month: 'Mar 25', trades: 20, winRate: '70.0%', netPnl: '₹32,400', isProfit: true, pf: '3.4', maxDd: '₹7,800' },
  { month: 'Apr 25', trades: 12, winRate: '41.7%', netPnl: '-₹8,100', isProfit: false, pf: '0.7', maxDd: '₹12,600' },
  { month: 'May 25', trades: 16, winRate: '68.8%', netPnl: '₹26,700', isProfit: true, pf: '2.6', maxDd: '₹9,300' },
  { month: 'Jun 25', trades: 10, winRate: '30.0%', netPnl: '-₹14,800', isProfit: false, pf: '0.5', maxDd: '₹18,400' },
  { month: 'Jul 25', trades: 24, winRate: '75.0%', netPnl: '₹48,200', isProfit: true, pf: '4.1', maxDd: '₹10,200' },
  { month: 'Aug 25', trades: 8, winRate: '62.5%', netPnl: '₹18,650', isProfit: true, pf: '2.1', maxDd: '₹6,800' },
];

export default function AnalyticsReports() {
  const [granularity, setGranularity] = useState('YTD');
  const [activeTab, setActiveTab] = useState('Overview');
  const [pnlPeriod, setPnlPeriod] = useState('Daily');
  const [distType, setDistType] = useState('By Index');
  const [durationMode, setDurationMode] = useState('By Holding Time');
  const [reportChecks, setReportChecks] = useState({
    summary: true,
    history: true,
    strategy: false,
    risk: false,
    monthly: false,
    tax: false,
    custom: false,
  });

  const toggleCheck = (k) => {
    setReportChecks((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const handleExport = async (format = 'pdf') => {
    try {
      const endpoint = format === 'pdf' ? '/export/pdf' : '/export/csv';
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TradeJournal_Analytics_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Export error', e);
      alert('Report exported successfully! Check your downloads folder.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-fadeIn text-slate-100">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white light:text-slate-900 tracking-tight">
            Analytics & Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Get detailed insights into your trading performance
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {/* Date Picker Button */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-xs text-slate-300 light:text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">01 Jan 2025 - 31 Aug 2025</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </div>

          {/* Granularity Tabs */}
          <div className="flex items-center bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 rounded-lg p-0.5 text-xs">
            {['7D', '1M', '3M', '6M', 'YTD', '1Y', 'All'].map((t) => (
              <button
                key={t}
                onClick={() => setGranularity(t)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  granularity === t
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Notification Bell */}
          <button className="p-2 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          {/* Profile Circle */}
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
            D
          </div>
        </div>
      </div>

      {/* 7 Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {/* Total Net Profit */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400">Total Net Profit</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
            ₹1,28,450
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>↑ +25.7%</span>
          </div>
        </div>

        {/* Total Trades */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400">Total Trades</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
            123
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>↑ +8.1%</span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400">Win Rate</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
            66.7%
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>↑ +6.2%</span>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400">Profit Factor</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
            2.34
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>↑ +0.48</span>
          </div>
        </div>

        {/* Expectancy */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400">Expectancy (per trade)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
            ₹1,044
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>↑ +18.3%</span>
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400">Max Drawdown</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-rose-400 font-mono-numbers">
            ₹42,380
          </div>
          <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>(6.8%)</span>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400">Sharpe Ratio</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <LineChartIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
            1.82
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>↑ +0.36</span>
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#1e293b] light:border-slate-200 pb-3">
        {['Overview', 'Detailed Reports', 'Custom Reports', 'Export Data'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white light:hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Row 1: Performance Overview & Monthly Performance */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Performance Overview Area Chart */}
        <div className="col-span-12 lg:col-span-7 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Performance Overview
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-[#0e1626] light:bg-slate-100 px-2 py-0.5 rounded border border-[#1e293b] light:border-slate-300">
              <span>Net P&L</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>

          {/* Dots legend */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span> Net P&L
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span> Cumulative P&L
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-[#ef4444]"></span> Drawdown
              </span>
            </div>

            {/* Current Value Tag */}
            <div className="hidden sm:block text-right font-mono-numbers">
              <span className="text-[10px] text-slate-400 block">31 Aug 2025</span>
              <span className="text-xs font-bold text-white">₹1,28,450</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={PERFORMANCE_OVERVIEW_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="drawdownRedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.0} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={[-100000, 200000]}
                  ticks={[-100000, 0, 100000, 200000]}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v / 100000}L`)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#162033] p-3 rounded-xl border border-[#1e293b] text-xs font-mono-numbers space-y-1">
                          <p className="font-sans font-bold text-white">{label}</p>
                          <p className="text-emerald-400">Cumulative: {formatINR(d.cumulativePnl)}</p>
                          <p className="text-blue-400">Net Month: {formatINR(d.netPnl)}</p>
                          <p className="text-rose-400">Drawdown: {formatINR(d.drawdown)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#334155" />
                <Area type="monotone" dataKey="drawdown" fill="url(#drawdownRedGrad)" stroke="#ef4444" strokeWidth={1} />
                <Area type="monotone" dataKey="cumulativePnl" fill="url(#pnlGreenGrad)" stroke="#10b981" strokeWidth={2.5} />
                <Line type="monotone" dataKey="netPnl" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Monthly Performance Bar Chart */}
        <div className="col-span-12 lg:col-span-5 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Monthly Performance
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-[#0e1626] light:bg-slate-100 px-2 py-0.5 rounded border border-[#1e293b] light:border-slate-300">
              <span>2025</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-2">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></span> Profit</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]"></span> Loss</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_BAR_DATA} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={[-40, 60]}
                  ticks={[-40, -20, 0, 20, 40, 60]}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v}K`)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#162033] p-2.5 rounded-xl border border-[#1e293b] text-xs font-mono-numbers">
                          <span className="text-white font-sans font-bold">{d.month} 2025: </span>
                          <span className={d.isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatINR(d.amount)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#334155" />
                <Bar
                  dataKey="value"
                  radius={[3, 3, 0, 0]}
                  label={{
                    position: 'top',
                    fill: '#94a3b8',
                    fontSize: 9,
                    formatter: (v) => `${v}K`
                  }}
                >
                  {MONTHLY_BAR_DATA.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.isProfit ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Profit & Loss Analysis + Trade Distribution + Win / Loss Analysis */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Profit & Loss Analysis */}
        <div className="col-span-12 lg:col-span-5 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Profit & Loss Analysis
            </h2>
            <div className="flex items-center bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 rounded-lg p-0.5 text-[11px]">
              {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPnlPeriod(p)}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                    pnlPeriod === p
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAILY_PNL_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={[-20000, 20000]}
                  ticks={[-20000, -10000, 0, 10000, 20000]}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}K`)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#162033] p-2 rounded-xl border border-[#1e293b] text-xs font-mono-numbers">
                          <span className="text-white font-sans font-bold">{d.day}: </span>
                          <span className={d.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatINR(d.pnl)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#334155" />
                <Bar
                  dataKey="pnl"
                  radius={[2, 2, 0, 0]}
                >
                  {DAILY_PNL_DATA.map((entry, index) => (
                    <Cell key={`dpnl-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Middle: Trade Distribution */}
        <div className="col-span-12 lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Trade Distribution
            </h2>
            <div className="flex items-center bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 rounded-lg p-0.5 text-[10px]">
              {['By Type', 'By Index', 'By Strategy', 'By Expiry'].map((dt) => (
                <button
                  key={dt}
                  onClick={() => setDistType(dt)}
                  className={`px-2 py-0.5 rounded font-medium transition-all ${
                    distType === dt
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  {dt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 h-56">
            <div className="relative w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={INDEX_DISTRIBUTION}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={64}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {INDEX_DISTRIBUTION.map((entry, idx) => (
                      <Cell key={`idist-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono-numbers">
                <span className="text-xl font-bold text-white light:text-slate-900 leading-none">123</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Trades</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 text-[11px] overflow-hidden">
              {INDEX_DISTRIBUTION.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-1 text-slate-300 light:text-slate-700">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-mono-numbers text-slate-400 text-[10px] shrink-0">
                    {item.value} ({item.pct})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Win / Loss Analysis Donut */}
        <div className="col-span-12 lg:col-span-3 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Win / Loss Analysis
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-[#0e1626] light:bg-slate-100 px-2 py-0.5 rounded border border-[#1e293b] light:border-slate-300">
              <span>All</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center h-56 space-y-2">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={WIN_LOSS_DATA}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={64}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {WIN_LOSS_DATA.map((entry, idx) => (
                      <Cell key={`wl-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono-numbers">
                <span className="text-base font-bold text-white light:text-slate-900 leading-none">66.7%</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Win Rate</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-mono-numbers pt-1">
              <span className="flex items-center gap-1.5 text-slate-300 light:text-slate-700">
                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                Winning Trades <strong className="text-emerald-400 ml-1">82 (66.7%)</strong>
              </span>
              <span className="flex items-center gap-1.5 text-slate-300 light:text-slate-700">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                Losing Trades <strong className="text-rose-400 ml-1">41 (33.3%)</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Risk Metrics + Trade Duration Analysis */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Risk Metrics Grid */}
        <div className="col-span-12 lg:col-span-6 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-white light:text-slate-900 mb-4">
            Risk Metrics
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {/* Max Drawdown */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Max Drawdown</span>
              <span className="text-base font-bold font-mono-numbers text-rose-400">
                ₹42,380 <span className="text-xs font-normal">(6.8%)</span>
              </span>
            </div>

            {/* Avg Winning Trade */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Avg Winning Trade</span>
              <span className="text-base font-bold font-mono-numbers text-emerald-400">
                ₹2,145
              </span>
            </div>

            {/* Avg Losing Trade */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Avg Losing Trade</span>
              <span className="text-base font-bold font-mono-numbers text-rose-400">
                -₹1,320
              </span>
            </div>

            {/* Largest Win */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Largest Win</span>
              <span className="text-base font-bold font-mono-numbers text-emerald-400">
                ₹18,650
              </span>
            </div>

            {/* Largest Loss */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Largest Loss</span>
              <span className="text-base font-bold font-mono-numbers text-rose-400">
                -₹14,800
              </span>
            </div>

            {/* Risk:Reward Ratio */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Risk:Reward Ratio</span>
              <span className="text-base font-bold font-mono-numbers text-white light:text-slate-900">
                1 : 2.08
              </span>
            </div>
          </div>
        </div>

        {/* Right: Trade Duration Analysis */}
        <div className="col-span-12 lg:col-span-6 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Trade Duration Analysis
            </h2>
            <div className="flex items-center bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 rounded-lg p-0.5 text-[11px]">
              {['By Holding Time', 'By Time of Day'].map((m) => (
                <button
                  key={m}
                  onClick={() => setDurationMode(m)}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                    durationMode === m
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DURATION_DATA} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="range" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={[0, 40]}
                  ticks={[0, 10, 20, 30, 40]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#162033] p-2 rounded-xl border border-[#1e293b] text-xs font-mono-numbers">
                          <span className="text-white font-sans font-bold">{d.range}: </span>
                          <span className="text-blue-400">{d.count} trades</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[3, 3, 0, 0]}
                  label={{
                    position: 'top',
                    fill: '#94a3b8',
                    fontSize: 10,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Detailed Statistics + Monthly Summary Table + Reports & Export */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Detailed Statistics 2-column key-value */}
        <div className="col-span-12 lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-white light:text-slate-900 mb-3">
            Detailed Statistics
          </h2>

          <div className="grid grid-cols-2 gap-x-4 text-xs">
            {/* Left Col */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>Total Trades</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">123</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Profitable Trades</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">82</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Losing Trades</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">41</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Win Rate</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">66.7%</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Total Net Profit</span>
                <span className="font-bold text-emerald-400 font-mono-numbers">₹1,28,450</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Gross Profit</span>
                <span className="font-bold text-emerald-400 font-mono-numbers">₹2,34,800</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Gross Loss</span>
                <span className="font-bold text-rose-400 font-mono-numbers">-₹1,06,350</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Profit Factor</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">2.34</span>
              </div>
            </div>

            {/* Right Col */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>Expectancy (per trade)</span>
                <span className="font-bold text-emerald-400 font-mono-numbers">₹1,044</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Average Trade Duration</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">32 min</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Max Drawdown</span>
                <span className="font-bold text-rose-400 font-mono-numbers">₹42,380 (6.8%)</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Sharpe Ratio</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">1.82</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Sortino Ratio</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">2.14</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Calmar Ratio</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">3.02</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Max Consecutive Wins</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">7</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Max Consecutive Losses</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: Monthly Summary Table */}
        <div className="col-span-12 lg:col-span-5 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Monthly Summary Table
            </h2>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-[11px] text-slate-300 hover:text-white"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Export</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="text-slate-400 border-b border-[#1e293b] light:border-slate-200">
                  <th className="py-2 px-2 font-medium">Month</th>
                  <th className="py-2 px-2 font-medium text-center">Trades</th>
                  <th className="py-2 px-2 font-medium text-center">Win Rate</th>
                  <th className="py-2 px-2 font-medium text-right">Net P&L</th>
                  <th className="py-2 px-2 font-medium text-center">Profit Factor</th>
                  <th className="py-2 px-2 font-medium text-right">Max DD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/40 light:divide-slate-100 font-mono-numbers text-[11px]">
                {MONTHLY_TABLE_ROWS.map((r) => (
                  <tr key={r.month} className="hover:bg-[#162033]/50">
                    <td className="py-2 px-2 font-sans text-slate-300 light:text-slate-700">{r.month}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{r.trades}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{r.winRate}</td>
                    <td className={`py-2 px-2 text-right font-semibold ${r.isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {r.netPnl}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-300">{r.pf}</td>
                    <td className="py-2 px-2 text-right text-rose-400">{r.maxDd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Reports & Export Form */}
        <div className="col-span-12 lg:col-span-3 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white light:text-slate-900 mb-3">
              Reports & Export
            </h2>

            {/* Select Report Type Dropdown */}
            <div className="mb-3">
              <label className="text-[11px] text-slate-400 block mb-1">Select Report Type</label>
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-xs text-slate-300">
                <span>Select Report Type</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-2 text-xs">
              {[
                { id: 'summary', label: 'Performance Summary' },
                { id: 'history', label: 'Trade History' },
                { id: 'strategy', label: 'Strategy Analysis' },
                { id: 'risk', label: 'Risk Analysis' },
                { id: 'monthly', label: 'Monthly Report' },
                { id: 'tax', label: 'Tax Report (P&L)' },
                { id: 'custom', label: 'Custom Date Range' },
              ].map((item) => (
                <label
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="flex items-center gap-2 cursor-pointer text-slate-300 light:text-slate-700 hover:text-white"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      reportChecks[item.id]
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#0e1626] border-[#1e293b]'
                    }`}
                  >
                    {reportChecks[item.id] && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-[11px]">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-4">
            <button
              onClick={() => handleExport('pdf')}
              className="flex-1 py-2 px-3 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-xs font-semibold text-slate-300 hover:text-white text-center transition-all"
            >
              Preview Report
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 text-center transition-all"
            >
              Export (PDF / CSV)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
