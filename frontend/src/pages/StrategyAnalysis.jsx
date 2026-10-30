import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Scale,
  Calendar,
  Bell,
  ChevronDown,
  Layers,
  ArrowUpDown,
  Lightbulb,
  CheckCircle2,
  PieChart as PieChartIcon,
  BarChart2,
  Sliders,
  Maximize2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ReferenceLine
} from 'recharts';
import api from '../api/client';
import { formatINR, formatCompactINR } from '../utils/formatters';

// Color palette mapping per strategy
const STRATEGY_THEME = {
  'Long Straddle': {
    badge: 'bg-[#2563eb]/20 text-[#3b82f6] border border-[#3b82f6]/40',
    color: '#3b82f6',
    chartFill: '#10b981', // green in comparison
  },
  'Directional': {
    badge: 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40',
    color: '#10b981',
    chartFill: '#10b981',
  },
  'Rangebound': {
    badge: 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40',
    color: '#f59e0b',
    chartFill: '#f59e0b',
  },
  'Scalping': {
    badge: 'bg-[#a855f7]/20 text-[#c084fc] border border-[#c084fc]/40',
    color: '#a855f7',
    chartFill: '#ef4444',
  },
  'Event Based': {
    badge: 'bg-[#ef4444]/20 text-[#f87171] border border-[#f87171]/40',
    color: '#ef4444',
    chartFill: '#06b6d4',
  },
  'BTST': {
    badge: 'bg-[#06b6d4]/20 text-[#22d3ee] border border-[#22d3ee]/40',
    color: '#06b6d4',
    chartFill: '#3b82f6',
  },
  'Morning Breakout': {
    badge: 'bg-[#eab308]/20 text-[#facc15] border border-[#facc15]/40',
    color: '#eab308',
    chartFill: '#eab308',
  },
  'Others': {
    badge: 'bg-[#64748b]/20 text-[#94a3b8] border border-[#94a3b8]/40',
    color: '#64748b',
    chartFill: '#ef4444',
  },
};

const DEFAULT_STRATEGIES = [
  {
    strategy: 'Long Straddle',
    trades: 18,
    winRate: 72.2,
    netPnl: 42350,
    grossProfit: 65200,
    grossLoss: -22850,
    avgPnl: 2353,
    rrRatio: '1 : 2.8',
    maxDd: -12400,
    expectancy: 1980,
  },
  {
    strategy: 'Directional',
    trades: 25,
    winRate: 56.0,
    netPnl: 18450,
    grossProfit: 48600,
    grossLoss: -30150,
    avgPnl: 738,
    rrRatio: '1 : 1.6',
    maxDd: -18600,
    expectancy: 580,
  },
  {
    strategy: 'Rangebound',
    trades: 15,
    winRate: 66.7,
    netPnl: 16820,
    grossProfit: 32400,
    grossLoss: -15580,
    avgPnl: 1121,
    rrRatio: '1 : 3.2',
    maxDd: -8900,
    expectancy: 1050,
  },
  {
    strategy: 'Scalping',
    trades: 12,
    winRate: 41.7,
    netPnl: -4990,
    grossProfit: 12800,
    grossLoss: -17790,
    avgPnl: -416,
    rrRatio: '1 : 1.1',
    maxDd: -9250,
    expectancy: -320,
  },
  {
    strategy: 'Event Based',
    trades: 10,
    winRate: 70.0,
    netPnl: 14600,
    grossProfit: 26300,
    grossLoss: -11700,
    avgPnl: 1460,
    rrRatio: '1 : 2.4',
    maxDd: -6800,
    expectancy: 1180,
  },
  {
    strategy: 'BTST',
    trades: 8,
    winRate: 62.5,
    netPnl: 9800,
    grossProfit: 18900,
    grossLoss: -9100,
    avgPnl: 1225,
    rrRatio: '1 : 2.1',
    maxDd: -5400,
    expectancy: 980,
  },
  {
    strategy: 'Morning Breakout',
    trades: 10,
    winRate: 80.0,
    netPnl: 21450,
    grossProfit: 28600,
    grossLoss: -7150,
    avgPnl: 2145,
    rrRatio: '1 : 2.9',
    maxDd: -4200,
    expectancy: 1880,
  },
  {
    strategy: 'Others',
    trades: 5,
    winRate: 40.0,
    netPnl: -2350,
    grossProfit: 6200,
    grossLoss: -8550,
    avgPnl: -470,
    rrRatio: '1 : 0.9',
    maxDd: -5800,
    expectancy: -410,
  },
];

// Cumulative multi-line curve data
const CUMULATIVE_DATA = [
  { date: '1 Aug', 'Long Straddle': 0, 'Directional': 0, 'Rangebound': 0, 'Scalping': 0 },
  { date: '5 Aug', 'Long Straddle': 6800, 'Directional': 3200, 'Rangebound': 4100, 'Scalping': -1200 },
  { date: '10 Aug', 'Long Straddle': 12400, 'Directional': 5800, 'Rangebound': 8200, 'Scalping': -3400 },
  { date: '15 Aug', 'Long Straddle': 19500, 'Directional': 11400, 'Rangebound': 9600, 'Scalping': -2100 },
  { date: '20 Aug', 'Long Straddle': 28600, 'Directional': 14200, 'Rangebound': 13400, 'Scalping': -4100 },
  { date: '25 Aug', 'Long Straddle': 34200, 'Directional': 16800, 'Rangebound': 15200, 'Scalping': -3800 },
  { date: '31 Aug', 'Long Straddle': 42350, 'Directional': 18450, 'Rangebound': 16820, 'Scalping': -4990 },
];

// Trades distribution donut
const DISTRIBUTION_DATA = [
  { name: 'Long Straddle', value: 18, pct: '14.6%', color: '#3b82f6' },
  { name: 'Directional', value: 25, pct: '20.3%', color: '#10b981' },
  { name: 'Rangebound', value: 15, pct: '12.2%', color: '#f59e0b' },
  { name: 'Scalping', value: 12, pct: '9.8%', color: '#a855f7' },
  { name: 'Event Based', value: 10, pct: '8.1%', color: '#ef4444' },
  { name: 'BTST', value: 8, pct: '6.5%', color: '#06b6d4' },
  { name: 'Morning Breakout', value: 10, pct: '8.1%', color: '#eab308' },
  { name: 'Others', value: 25, pct: '20.3%', color: '#64748b' },
];

// Scatter risk vs reward points
const SCATTER_DATA = [
  // Long Straddle (blue)
  { risk: 3200, reward: 8400, strategy: 'Long Straddle' },
  { risk: 4500, reward: 12500, strategy: 'Long Straddle' },
  { risk: 5200, reward: 14200, strategy: 'Long Straddle' },
  { risk: 6100, reward: 7200, strategy: 'Long Straddle' },
  { risk: 2800, reward: -4200, strategy: 'Long Straddle' },
  // Directional (green)
  { risk: 2500, reward: 5200, strategy: 'Directional' },
  { risk: 4000, reward: 6800, strategy: 'Directional' },
  { risk: 5500, reward: -3900, strategy: 'Directional' },
  { risk: 3800, reward: 4800, strategy: 'Directional' },
  { risk: 6200, reward: 8900, strategy: 'Directional' },
  // Rangebound (amber)
  { risk: 1800, reward: 5800, strategy: 'Rangebound' },
  { risk: 2400, reward: 7600, strategy: 'Rangebound' },
  { risk: 3100, reward: -2400, strategy: 'Rangebound' },
  { risk: 2900, reward: 6400, strategy: 'Rangebound' },
  // Scalping (purple)
  { risk: 4200, reward: -5100, strategy: 'Scalping' },
  { risk: 3800, reward: 2800, strategy: 'Scalping' },
  { risk: 5100, reward: -6200, strategy: 'Scalping' },
  { risk: 4600, reward: 3100, strategy: 'Scalping' },
  // Event Based (red)
  { risk: 5000, reward: 11200, strategy: 'Event Based' },
  { risk: 6800, reward: 16400, strategy: 'Event Based' },
  { risk: 7200, reward: -8900, strategy: 'Event Based' },
  // BTST (cyan)
  { risk: 3500, reward: 7800, strategy: 'BTST' },
  { risk: 4100, reward: 8400, strategy: 'BTST' },
  { risk: 3900, reward: -4500, strategy: 'BTST' },
  // Morning Breakout (yellow)
  { risk: 2600, reward: 9200, strategy: 'Morning Breakout' },
  { risk: 3400, reward: 11500, strategy: 'Morning Breakout' },
  { risk: 4200, reward: 13800, strategy: 'Morning Breakout' },
  { risk: 3100, reward: -3200, strategy: 'Morning Breakout' },
];

// Monthly Strategy Matrix Heatmap
const MONTHLY_MATRIX = [
  { strategy: 'Long Straddle', jan: '8.2K', feb: '12.5K', mar: '-6.1K', apr: '18.3K', may: '22.4K', jun: '-4.5K', jul: '16.8K', aug: '42.3K' },
  { strategy: 'Directional', jan: '5.1K', feb: '8.4K', mar: '2.3K', apr: '-3.9K', may: '11.6K', jun: '9.2K', jul: '6.7K', aug: '18.5K' },
  { strategy: 'Rangebound', jan: '-2.4K', feb: '6.1K', mar: '4.8K', apr: '8.9K', may: '12.1K', jun: '5.3K', jul: '10.6K', aug: '16.8K' },
  { strategy: 'Scalping', jan: '1.2K', feb: '-3.4K', mar: '-2.1K', apr: '0.8K', may: '1.1K', jun: '-4.2K', jul: '-1.9K', aug: '-5.0K' },
  { strategy: 'Event Based', jan: '4.5K', feb: '6.8K', mar: '7.2K', apr: '3.1K', may: '-2.6K', jun: '8.9K', jul: '11.4K', aug: '14.6K' },
  { strategy: 'BTST', jan: '2.1K', feb: '4.3K', mar: '6.5K', apr: '-1.2K', may: '3.6K', jun: '5.8K', jul: '3.1K', aug: '9.8K' },
  { strategy: 'Morning Breakout', jan: '6.8K', feb: '8.1K', mar: '5.3K', apr: '9.6K', may: '12.3K', jun: '14.1K', jul: '18.2K', aug: '21.5K' },
  { strategy: 'Others', jan: '-1.6K', feb: '2.4K', mar: '-0.9K', apr: '3.6K', may: '-2.1K', jun: '1.3K', jul: '-1.5K', aug: '-2.4K' },
];

export default function StrategyAnalysis() {
  const [granularity, setGranularity] = useState('1M');
  const [strategies, setStrategies] = useState(DEFAULT_STRATEGIES);
  const [loading, setLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState('Performance');

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const res = await api.get('/strategies');
      if (res.data?.performance && res.data.performance.length > 0) {
        // Blend backend data if available, keeping user interface rich
        const mapped = res.data.performance.map((item, idx) => ({
          strategy: item.strategy || DEFAULT_STRATEGIES[idx]?.strategy || 'Custom',
          trades: item.total_trades || DEFAULT_STRATEGIES[idx]?.trades || 10,
          winRate: item.win_rate !== undefined ? parseFloat(item.win_rate) : DEFAULT_STRATEGIES[idx]?.winRate || 60,
          netPnl: item.net_pnl !== undefined ? parseFloat(item.net_pnl) : DEFAULT_STRATEGIES[idx]?.netPnl || 15000,
          grossProfit: item.avg_profit ? item.avg_profit * (item.winning_trades || 5) : DEFAULT_STRATEGIES[idx]?.grossProfit || 25000,
          grossLoss: item.avg_loss ? -Math.abs(item.avg_loss * (item.losing_trades || 5)) : DEFAULT_STRATEGIES[idx]?.grossLoss || -10000,
          avgPnl: item.total_trades ? Math.round(item.net_pnl / item.total_trades) : DEFAULT_STRATEGIES[idx]?.avgPnl || 1000,
          rrRatio: DEFAULT_STRATEGIES[idx]?.rrRatio || '1 : 2.0',
          maxDd: DEFAULT_STRATEGIES[idx]?.maxDd || -8000,
          expectancy: DEFAULT_STRATEGIES[idx]?.expectancy || 1200,
        }));
        // Merge with defaults so all 8 rows exist
        const finalStrategies = DEFAULT_STRATEGIES.map((def) => {
          const found = mapped.find(m => m.strategy.toLowerCase() === def.strategy.toLowerCase());
          return found || def;
        });
        setStrategies(finalStrategies);
      }
    } catch (err) {
      console.error('Failed to fetch strategies', err);
    } finally {
      setLoading(false);
    }
  };

  // Bar chart data for Net P&L comparison
  const pnlComparisonData = strategies.map(st => {
    let fill = '#10b981';
    if (st.netPnl < 0) fill = '#ef4444';
    else if (st.strategy === 'Rangebound') fill = '#f59e0b';
    else if (st.strategy === 'Morning Breakout') fill = '#eab308';
    else if (st.strategy === 'BTST') fill = '#3b82f6';
    else if (st.strategy === 'Event Based') fill = '#06b6d4';
    return {
      name: st.strategy,
      short: st.strategy.split(' ')[0],
      pnl: st.netPnl,
      fill: fill,
      displayVal: (st.netPnl / 1000).toFixed(1) + 'K'
    };
  });

  // Bar chart data for Win Rate by Strategy
  const winRateData = strategies.map(st => {
    return {
      name: st.strategy,
      short: st.strategy.split(' ')[0],
      winRate: st.winRate,
      fill: STRATEGY_THEME[st.strategy]?.color || '#3b82f6',
      displayVal: st.winRate.toFixed(1) + '%'
    };
  });

  // Bar chart data for Avg P&L per Trade
  const avgPnlData = strategies.map(st => {
    return {
      name: st.strategy,
      short: st.strategy.split(' ')[0],
      avgPnl: st.avgPnl,
      fill: st.avgPnl >= 0 ? (STRATEGY_THEME[st.strategy]?.color || '#10b981') : '#ef4444',
      displayVal: st.avgPnl.toLocaleString('en-IN')
    };
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-fadeIn text-slate-100">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white light:text-slate-900 tracking-tight">
            Strategy Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyze performance of your trading strategies and find what works best
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {/* Date Picker Button */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-xs text-slate-300 light:text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">01 Aug 2025 - 31 Aug 2025</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </div>

          {/* Granularity Tabs */}
          <div className="flex items-center bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 rounded-lg p-0.5 text-xs">
            {['1M', '3M', '6M', 'YTD', '1Y', 'All'].map((t) => (
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

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Strategies */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Total Strategies</div>
            <div className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers mt-0.5">8</div>
          </div>
        </div>

        {/* Most Profitable */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Most Profitable</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">Long Straddle</div>
            <div className="text-xs font-bold text-emerald-400 font-mono-numbers mt-0.5">+₹42,350</div>
          </div>
        </div>

        {/* Highest Win Rate */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Highest Win Rate</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">Morning Breakout</div>
            <div className="text-xs font-bold text-emerald-400 font-mono-numbers mt-0.5">78.6%</div>
          </div>
        </div>

        {/* Best Risk:Reward */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Best Risk:Reward</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">Rangebound</div>
            <div className="text-xs font-bold text-emerald-400 font-mono-numbers mt-0.5">1 : 3.2</div>
          </div>
        </div>

        {/* Most Traded */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <ArrowUpDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Most Traded</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">Directional</div>
            <div className="text-xs text-slate-400 font-mono-numbers mt-0.5">25 trades</div>
          </div>
        </div>

        {/* Least Profitable */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Least Profitable</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">Scalping</div>
            <div className="text-xs font-bold text-rose-400 font-mono-numbers mt-0.5">-₹4,990</div>
          </div>
        </div>
      </div>

      {/* Row 1: Strategy Performance Table & Two Right Stacked Charts */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Strategy Performance Table */}
        <div className="col-span-12 xl:col-span-7 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Strategy Performance
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="text-slate-400 border-b border-[#1e293b] light:border-slate-200 pb-2">
                  <th className="py-2.5 px-3 font-medium">Strategy</th>
                  <th className="py-2.5 px-2 font-medium text-center">Trades</th>
                  <th className="py-2.5 px-2 font-medium text-center">Win Rate</th>
                  <th className="py-2.5 px-3 font-medium text-right">Net P&L</th>
                  <th className="py-2.5 px-2 font-medium text-right">Gross Profit</th>
                  <th className="py-2.5 px-2 font-medium text-right">Gross Loss</th>
                  <th className="py-2.5 px-2 font-medium text-right">Avg P&L</th>
                  <th className="py-2.5 px-2 font-medium text-center">R:R Ratio</th>
                  <th className="py-2.5 px-2 font-medium text-right">Max DD</th>
                  <th className="py-2.5 px-3 font-medium text-right">Expectancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/40 light:divide-slate-100 font-mono-numbers">
                {strategies.map((st) => {
                  const theme = STRATEGY_THEME[st.strategy] || STRATEGY_THEME['Others'];
                  const isProfit = st.netPnl >= 0;
                  return (
                    <tr key={st.strategy} className="hover:bg-[#162033]/60 light:hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium ${theme.badge}`}>
                          {st.strategy}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-300 light:text-slate-700">{st.trades}</td>
                      <td className="py-3 px-2 text-center text-slate-300 light:text-slate-700">{st.winRate.toFixed(1)}%</td>
                      <td className={`py-3 px-3 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}₹{Math.abs(st.netPnl).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-300 light:text-slate-700">₹{st.grossProfit.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-2 text-right text-rose-400">-₹{Math.abs(st.grossLoss).toLocaleString('en-IN')}</td>
                      <td className={`py-3 px-2 text-right font-semibold ${st.avgPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {st.avgPnl >= 0 ? '+' : '-'}₹{Math.abs(st.avgPnl).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-300 light:text-slate-700">{st.rrRatio}</td>
                      <td className="py-3 px-2 text-right text-rose-400">-₹{Math.abs(st.maxDd).toLocaleString('en-IN')}</td>
                      <td className={`py-3 px-3 text-right font-semibold ${st.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {st.expectancy >= 0 ? '+' : '-'}₹{Math.abs(st.expectancy).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: 2 Stacked Bar Charts */}
        <div className="col-span-12 xl:col-span-5 space-y-5">
          {/* Top Bar Chart: Strategy Net P&L Comparison */}
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white light:text-slate-900">
                Strategy Net P&L Comparison
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#0e1626] light:bg-slate-100 text-[10px] text-slate-400 border border-[#1e293b] light:border-slate-300">
                Net P&L
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlComparisonData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="short" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    domain={[-20000, 60000]}
                    ticks={[-20000, 0, 20000, 40000, 60000]}
                    tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}K`)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[#162033] p-2.5 rounded-xl border border-[#1e293b] text-xs font-mono-numbers">
                            <span className="text-white font-sans font-bold">{d.name}: </span>
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
                    radius={[3, 3, 0, 0]}
                    label={{
                      position: 'top',
                      fill: '#94a3b8',
                      fontSize: 9,
                      formatter: (v) => `${(v / 1000).toFixed(1)}K`
                    }}
                  >
                    {pnlComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Bar Chart: Win Rate by Strategy */}
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white light:text-slate-900">
                Win Rate by Strategy
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#0e1626] light:bg-slate-100 text-[10px] text-slate-400 border border-[#1e293b] light:border-slate-300">
                Win Rate
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winRateData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="short" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[#162033] p-2.5 rounded-xl border border-[#1e293b] text-xs font-mono-numbers">
                            <span className="text-white font-sans font-bold">{d.name}: </span>
                            <span className="text-blue-400">{d.winRate}%</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="winRate"
                    radius={[3, 3, 0, 0]}
                    label={{
                      position: 'top',
                      fill: '#94a3b8',
                      fontSize: 9,
                      formatter: (v) => `${v.toFixed(1)}%`
                    }}
                  >
                    {winRateData.map((entry, index) => (
                      <Cell key={`cell-wr-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Cumulative P&L + Trades Distribution + Avg P&L per Trade */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: P&L by Strategy (Cumulative) */}
        <div className="col-span-12 lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              P&L by Strategy (Cumulative)
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-[#0e1626] light:bg-slate-100 px-2 py-0.5 rounded border border-[#1e293b] light:border-slate-300">
              <span>This Month</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>

          {/* Legend dots */}
          <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-2 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span> Long Straddle</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span> Directional</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> Rangebound</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#a855f7]"></span> Scalping</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CUMULATIVE_DATA} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={[-20000, 60000]}
                  ticks={[-20000, 0, 20000, 40000, 60000]}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}K`)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#162033] p-2.5 rounded-xl border border-[#1e293b] text-xs font-mono-numbers space-y-1">
                          <p className="font-sans font-bold text-white mb-1">{label}</p>
                          {payload.map((p) => (
                            <div key={p.name} className="flex justify-between gap-3 text-[11px]">
                              <span style={{ color: p.color }}>{p.name}:</span>
                              <span className="font-bold">{formatINR(p.value)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="Long Straddle" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Directional" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Rangebound" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Scalping" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Middle: Trades Distribution */}
        <div className="col-span-12 lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-white light:text-slate-900 mb-3">
            Trades Distribution
          </h2>

          <div className="flex items-center justify-between gap-2 h-56">
            {/* Donut Chart with center text */}
            <div className="relative w-44 h-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DISTRIBUTION_DATA}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {DISTRIBUTION_DATA.map((entry, idx) => (
                      <Cell key={`dist-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono-numbers">
                <span className="text-xl font-bold text-white light:text-slate-900 leading-none">123</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Trades</span>
              </div>
            </div>

            {/* Right Legend */}
            <div className="flex-1 space-y-1.5 text-[11px] overflow-hidden">
              {DISTRIBUTION_DATA.map((item) => (
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

        {/* Right: Average P&L per Trade */}
        <div className="col-span-12 lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Average P&L per Trade
            </h2>
            <span className="px-2 py-0.5 rounded bg-[#0e1626] light:bg-slate-100 text-[10px] text-slate-400 border border-[#1e293b] light:border-slate-300">
              Avg P&L
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgPnlData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="short" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  domain={[-1000, 3000]}
                  ticks={[-1000, 0, 1000, 2000, 3000]}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}K`)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#162033] p-2.5 rounded-xl border border-[#1e293b] text-xs font-mono-numbers">
                          <span className="text-white font-sans font-bold">{d.name}: </span>
                          <span className={d.avgPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatINR(d.avgPnl)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#334155" />
                <Bar
                  dataKey="avgPnl"
                  radius={[3, 3, 0, 0]}
                  label={{
                    position: 'top',
                    fill: '#94a3b8',
                    fontSize: 8,
                    formatter: (v) => v.toLocaleString('en-IN')
                  }}
                >
                  {avgPnlData.map((entry, index) => (
                    <Cell key={`avg-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Risk vs Reward + Monthly Strategy Performance + Key Insights */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Risk vs Reward Scatter */}
        <div className="col-span-12 lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-white light:text-slate-900 mb-2">
            Risk vs Reward
          </h2>

          {/* Dots legend */}
          <div className="flex items-center gap-2 text-[9px] text-slate-400 mb-2 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span> Long Straddle</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span> Directional</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span> Rangebound</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]"></span> Scalping</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span> Event Based</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]"></span> BTST</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#eab308]"></span> Morning Breakout</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  dataKey="risk"
                  name="Risk (₹)"
                  domain={[0, 20000]}
                  ticks={[0, 5000, 10000, 15000, 20000]}
                  stroke="#64748b"
                  fontSize={9}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}K`)}
                  label={{ value: 'Risk (₹)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="reward"
                  name="Reward (₹)"
                  domain={[-20000, 20000]}
                  ticks={[-20000, -10000, 0, 10000, 20000]}
                  stroke="#64748b"
                  fontSize={9}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}K`)}
                  label={{ value: 'Reward (₹)', angle: -90, position: 'insideLeft', offset: 15, fill: '#64748b', fontSize: 10 }}
                />
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#162033] p-2 rounded-xl border border-[#1e293b] text-[11px] font-mono-numbers">
                          <div className="font-bold text-white mb-1">{d.strategy}</div>
                          <div>Risk: ₹{d.risk.toLocaleString()}</div>
                          <div className={d.reward >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            Reward: ₹{d.reward.toLocaleString()}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  data={SCATTER_DATA}
                  shape={(props) => {
                    const { cx, cy, payload } = props;
                    const color = STRATEGY_THEME[payload.strategy]?.color || '#3b82f6';
                    return <circle cx={cx} cy={cy} r={3.5} fill={color} opacity={0.85} />;
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Middle: Monthly Strategy Performance Heatmap Matrix */}
        <div className="col-span-12 lg:col-span-5 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm overflow-hidden">
          <h2 className="text-sm font-bold text-white light:text-slate-900 mb-3">
            Monthly Strategy Performance
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-[10px] whitespace-nowrap">
              <thead>
                <tr className="text-slate-400 border-b border-[#1e293b] light:border-slate-200">
                  <th className="text-left py-2 px-2 font-medium">Strategy</th>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((m) => (
                    <th key={m} className="py-2 px-1.5 font-medium">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/30 light:divide-slate-100 font-mono-numbers">
                {MONTHLY_MATRIX.map((row) => (
                  <tr key={row.strategy} className="hover:bg-[#162033]/40">
                    <td className="text-left py-2 px-2 font-medium text-slate-300 light:text-slate-700 truncate max-w-[100px]">
                      {row.strategy}
                    </td>
                    {[row.jan, row.feb, row.mar, row.apr, row.may, row.jun, row.jul, row.aug].map((val, idx) => {
                      const isNeg = val.startsWith('-');
                      return (
                        <td key={idx} className="py-1.5 px-1">
                          <span
                            className={`inline-block w-full py-1 px-1 rounded font-medium ${
                              isNeg
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            {val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Key Insights */}
        <div className="col-span-12 lg:col-span-3 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white light:text-slate-900 mb-4">
              Key Insights
            </h2>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <p className="text-slate-300 light:text-slate-700 text-[11px] leading-relaxed">
                  <strong className="text-white light:text-slate-900">Long Straddle</strong> is the most profitable strategy with <span className="text-emerald-400 font-bold font-mono-numbers">₹42,350</span> net profit.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <p className="text-slate-300 light:text-slate-700 text-[11px] leading-relaxed">
                  <strong className="text-white light:text-slate-900">Morning Breakout</strong> has the highest win rate at <span className="text-emerald-400 font-bold font-mono-numbers">80.0%</span>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <p className="text-slate-300 light:text-slate-700 text-[11px] leading-relaxed">
                  <strong className="text-white light:text-slate-900">Rangebound</strong> has the best risk:reward ratio (<span className="text-blue-400 font-bold font-mono-numbers">1 : 3.2</span>).
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <p className="text-slate-300 light:text-slate-700 text-[11px] leading-relaxed">
                  <strong className="text-white light:text-slate-900">Scalping</strong> is underperforming. Consider reviewing your rules.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <p className="text-slate-300 light:text-slate-700 text-[11px] leading-relaxed">
                  <strong className="text-white light:text-slate-900">Event Based</strong> and <strong className="text-white light:text-slate-900">BTST</strong> strategies are showing consistent profits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
