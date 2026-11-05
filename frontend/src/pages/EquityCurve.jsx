import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Calendar,
  IndianRupee,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Award,
  Wallet,
  Landmark,
  PiggyBank,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import api from '../api/client';
import { formatINR, formatCompactINR, formatDate } from '../utils/formatters';
import { useFilter } from '../context/FilterContext';

export default function EquityCurve() {
  const navigate = useNavigate();
  const { dateRangeDisplay } = useFilter();

  // Range button: '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'All'
  const [selectedRange, setSelectedRange] = useState('1Y');
  const [equityTab, setEquityTab] = useState('equity'); // 'equity' | 'drawdown' | 'growth'
  const [txTab, setTxTab] = useState('all'); // 'all' | 'deposits' | 'withdrawals'
  const [showAddTxModal, setShowAddTxModal] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquityData();
  }, [selectedRange]);

  const fetchEquityData = async () => {
    try {
      setLoading(true);
      const [capRes, dashRes] = await Promise.all([
        api.get('/capital'),
        api.get('/dashboard', { params: { filter: selectedRange.toLowerCase() } }),
      ]);
      setData({ capital: capRes.data, dashboard: dashRes.data });
    } catch (e) {
      console.warn('Failed to fetch equity data', e);
    } finally {
      setLoading(false);
    }
  };

  // Top Metrics derived from live database
  const stats = useMemo(() => {
    const cap = data?.capital;
    const dash = data?.dashboard;
    const init = cap?.initial_capital || 500000;
    const curr = cap?.current_capital || init;
    const profit = cap?.total_profit ?? (dash?.stats?.total_net_profit ?? 0);
    const roi = cap?.overall_roi || 0;
    const maxDd = dash?.stats?.max_drawdown || 0;

    return {
      initial_capital: init,
      current_capital: curr,
      current_capital_pct: roi >= 0 ? `+${roi}%` : `${roi}%`,
      total_net_profit: profit,
      total_net_profit_pct: roi >= 0 ? `+${roi}%` : `${roi}%`,
      total_deposits: cap?.total_deposits || 0,
      total_withdrawals: cap?.total_withdrawals || 0,
      highest_capital: cap?.highest_capital || init,
      highest_capital_date: '-',
      max_drawdown: maxDd,
      max_drawdown_pct: '0.0%',
      roi: `${roi}%`,
    };
  }, [data]);

  // 1. Equity Curve Data
  const equityCurveData = useMemo(() => {
    const list = data?.dashboard?.charts?.equity_curve;
    if (list && list.length > 0) {
      return list.map((item) => ({
        date: formatDate(item.date || item.display_date),
        capital: item.balance || item.capital || 500000,
        deposit: null,
        withdrawal: null,
      }));
    }
    return [{ date: 'Today', capital: data?.capital?.current_capital || 500000, deposit: null, withdrawal: null }];
  }, [data]);

  // 2. Capital Breakdown Donut Data
  const breakdownPieData = useMemo(() => {
    const init = data?.capital?.initial_capital || 500000;
    const profit = Math.max(0, data?.capital?.total_profit || 0);
    const tot = init + profit || 1;
    return [
      { name: 'Initial Capital', value: init, color: '#06b6d4', pct: `${((init / tot) * 100).toFixed(1)}%` },
      { name: 'Net Profit', value: profit, color: '#10b981', pct: `${((profit / tot) * 100).toFixed(1)}%` },
      { name: 'Deposits', value: 0, color: '#3b82f6', pct: '0.0%' },
      { name: 'Withdrawals', value: 0, color: '#f43f5e', pct: '0.0%' },
    ];
  }, [data]);

  // 3. Drawdown Underwater Data
  const drawdownData = useMemo(() => {
    return [];
  }, []);

  // 4. Monthly Returns Bar Data
  const monthlyReturns = useMemo(() => {
    const list = data?.dashboard?.charts?.monthly_pnl;
    if (list && list.length > 0) {
      return list.map((m) => ({
        month: m.month,
        val: m.net_pnl,
        pos: m.net_pnl >= 0,
      }));
    }
    return [];
  }, [data]);

  // 5. Yearly Performance
  const yearlyData = useMemo(() => [], []);

  // 6. Capital Transactions
  const transactions = useMemo(() => {
    return data?.capital?.transactions || [];
  }, [data]);

  // 7. Capital Growth Monthly Bars
  const capitalGrowthData = useMemo(() => {
    const list = data?.dashboard?.charts?.monthly_pnl || [];
    return list.map((m) => ({
      month: m.month,
      val: +(m.net_pnl / 100000).toFixed(2),
    }));
  }, [data]);

  // 8. Daily Equity Progress
  const dailyEquityRows = useMemo(() => {
    const curve = data?.dashboard?.charts?.equity_curve || [];
    return curve.map((c) => ({
      date: c.date,
      opening: c.opening || c.capital,
      pnl: c.net_pnl || 0,
      closing: c.capital,
      dd: c.drawdown || 0,
      notes: '-',
    }));
  }, [data]);

  const monthlyStats = useMemo(() => {
    const list = monthlyReturns || [];
    const profitable = list.filter((m) => m.val > 0).length;
    const losing = list.filter((m) => m.val < 0).length;
    const best = [...list].sort((a, b) => b.val - a.val)[0];
    const worst = [...list].sort((a, b) => a.val - b.val)[0];
    return {
      profitableCount: `${profitable} / ${list.length || 0}`,
      losingCount: `${losing} / ${list.length || 0}`,
      bestMonth: best && best.val > 0 ? `${best.month} (+${formatINR(best.val)})` : '-',
      worstMonth: worst && worst.val < 0 ? `${worst.month} (${formatINR(worst.val)})` : '-',
    };
  }, [monthlyReturns]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Header & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
            Equity Curve
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track your trading capital growth, drawdowns and overall performance
          </p>
        </div>

        {/* Date Range Picker & Quick Timeframe Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{dateRangeDisplay || 'All Time'}</span>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#121b2d] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs">
            {['1M', '3M', '6M', 'YTD', '1Y', 'All'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRange(r)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedRange === r
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 8 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Initial Capital */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Initial Capital</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.initial_capital)}
          </span>
          <span className="text-[10px] text-slate-500 block">-</span>
        </div>

        {/* Current Capital */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Current Capital</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.current_capital)}
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3 inline" /> {stats.current_capital_pct}
          </span>
        </div>

        {/* Total Net Profit */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Total Net Profit</span>
          <span className={`text-base font-bold font-mono-numbers block tracking-tight ${stats.total_net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatINR(stats.total_net_profit)}
          </span>
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${stats.total_net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.total_net_profit >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {stats.total_net_profit_pct}
          </span>
        </div>

        {/* Total Deposits */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Total Deposits</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.total_deposits)}
          </span>
          <span className="text-[10px] text-slate-500 block">-</span>
        </div>

        {/* Total Withdrawals */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Total Withdrawals</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.total_withdrawals)}
          </span>
          <span className="text-[10px] text-slate-500 block">-</span>
        </div>

        {/* Highest Capital */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Highest Capital</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.highest_capital)}
          </span>
          <span className="text-[10px] text-slate-400 block">{stats.highest_capital_date && stats.highest_capital_date !== '-' ? formatDate(stats.highest_capital_date) : '-'}</span>
        </div>

        {/* Max Drawdown */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Max Drawdown</span>
          <span className="text-base font-bold text-rose-400 font-mono-numbers block tracking-tight">
            {formatINR(stats.max_drawdown)}
          </span>
          <span className="text-[10px] font-semibold text-rose-400 block">({stats.max_drawdown_pct})</span>
        </div>

        {/* ROI */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">ROI</span>
          <span className="text-base font-bold text-emerald-400 font-mono-numbers block tracking-tight">
            {stats.roi}
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 block">Return on Cap</span>
        </div>
      </div>

      {/* Main Row: Equity Curve Chart (8 cols) & Capital Breakdown Donut (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Equity Curve Chart */}
        <div className="lg:col-span-8 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                Equity Curve
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-slate-400">Equity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-400">Deposit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-400">Withdrawal</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-xs">
                {['Equity Curve', 'Drawdown', 'Capital Growth'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setEquityTab(tab.toLowerCase())}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      equityTab === tab.toLowerCase()
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-xs text-slate-300">
                This Year
              </div>
            </div>
          </div>

          {/* Area Chart with Highlight Badge */}
          <div className="relative h-64 w-full">
            {/* Highlight Milestone Pill */}
            <div className="absolute right-8 top-4 z-10 p-2 rounded-xl bg-[#0e1626]/90 border border-blue-500/40 text-right shadow-lg">
              <span className="text-[10px] text-slate-400 block">Peak Balance</span>
              <span className="text-xs font-bold text-white font-mono-numbers">{formatINR(stats.highest_capital)}</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} domain={[400000, 800000]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0b1322] light:bg-white p-2.5 rounded-xl border border-[#1e293b] light:border-slate-200 shadow-xl text-xs font-mono-numbers">
                          <p className="text-slate-400 font-sans">{d.date}</p>
                          <p className="text-blue-400 font-bold mt-1 text-sm">
                            Capital: {formatINR(d.capital)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="capital" stroke="#3b82f6" strokeWidth={2.5} fill="url(#equityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital Breakdown Donut Card */}
        <div className="lg:col-span-4 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
              Capital Breakdown
            </h2>
            <span className="text-xs text-slate-400">This Year</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {/* Donut Chart with center label */}
            <div className="relative w-36 h-36 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdownPieData}
                    innerRadius={44}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {breakdownPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] text-slate-400">Current Capital</span>
                <span className="text-xs font-bold text-white font-mono-numbers">{formatCompactINR(stats.current_capital)}</span>
                {stats.total_net_profit !== 0 && (
                  <span className={`text-[9px] font-semibold ${stats.total_net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stats.current_capital_pct}
                  </span>
                )}
              </div>
            </div>

            {/* Legend breakdown list */}
            <div className="flex-1 space-y-2 text-xs w-full">
              {breakdownPieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 light:text-slate-700">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-white light:text-slate-900 font-mono-numbers mr-2">
                      {formatINR(item.value)}
                    </span>
                    <span className="text-slate-500 text-[10px]">{item.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Drawdown Analysis (4 cols), Monthly Returns (4 cols), Yearly Performance (4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Drawdown Analysis */}
        <div className="p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Drawdown Analysis
            </h2>
            <span className="text-xs text-slate-400">This Year</span>
          </div>

          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} interval={2} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} domain={[-60000, 0]} />
                <Area type="monotone" dataKey="dd" stroke="#ef4444" strokeWidth={2} fill="url(#ddGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-[#1e293b] light:border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Maximum Drawdown</span>
              <span className="font-bold text-rose-400 font-mono-numbers">{formatINR(stats.max_drawdown)} ({stats.max_drawdown_pct})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Drawdown</span>
              <span className="font-bold text-slate-300 font-mono-numbers">{formatINR(data?.dashboard?.stats?.current_drawdown || 0)}</span>
            </div>
          </div>
        </div>

        {/* Monthly Returns */}
        <div className="p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Monthly Returns
            </h2>
            <span className="text-xs text-slate-400">{new Date().getFullYear()}</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyReturns} margin={{ top: 15, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(v) => `${v}K`} domain={[-40, 70]} />
                <ReferenceLine y={0} stroke="#334155" />
                <Bar dataKey="val" radius={[3, 3, 0, 0]}>
                  {monthlyReturns.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pos ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yearly Performance Table */}
        <div className="p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white light:text-slate-900">
            Yearly Performance
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] text-slate-400 uppercase font-semibold border-b border-[#1e293b]">
                <tr>
                  <th className="py-2">Year</th>
                  <th className="py-2">Net P&L</th>
                  <th className="py-2">ROI</th>
                  <th className="py-2 text-right">Max DD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                {yearlyData.map((row) => (
                  <tr key={row.year} className="hover:bg-[#162033]/50">
                    <td className="py-3 font-semibold text-white light:text-slate-900">{row.year}</td>
                    <td className="py-3 font-mono-numbers text-emerald-400 font-bold">{row.pnl}</td>
                    <td className="py-3 font-mono-numbers text-emerald-400 font-semibold">{row.roi}</td>
                    <td className="py-3 text-right font-mono-numbers text-rose-400">{row.dd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row: Capital Transactions, Capital Growth, Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Capital Transactions (5 cols) */}
        <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Capital Transactions
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-[11px]">
                {['All', 'Deposits', 'Withdrawals'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTxTab(t.toLowerCase())}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      txTab === t.toLowerCase() ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowAddTxModal(true)}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] text-slate-400 uppercase font-semibold border-b border-[#1e293b]">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Balance</th>
                  <th className="py-2 pl-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#162033]/50">
                    <td className="py-2.5 text-slate-300 light:text-slate-700">{formatDate(tx.transaction_date || tx.date)}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          tx.amount >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 text-right font-mono-numbers font-semibold ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount >= 0 ? '+' : ''}{formatINR(tx.amount)}
                    </td>
                    <td className="py-2.5 text-right font-mono-numbers text-slate-300">
                      {formatINR(tx.balance)}
                    </td>
                    <td className="py-2.5 pl-3 text-slate-400 text-[11px] truncate max-w-[120px]">
                      {tx.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Capital Growth Bar Chart (3 cols) */}
        <div className="lg:col-span-3 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Capital Growth
            </h2>
            <span className="text-xs text-slate-400">This Year</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capitalGrowthData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(v) => `${v}L`} domain={[4, 8]} />
                <Bar dataKey="val" fill="#10b981" radius={[3, 3, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Metrics (4 cols) */}
        <div className="lg:col-span-4 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Performance Metrics
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Average Monthly Profit</span>
              <span className="font-semibold text-emerald-400 font-mono-numbers">₹16,056</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Average Monthly Loss</span>
              <span className="font-semibold text-rose-400 font-mono-numbers">-₹12,480</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Profitable Months</span>
              <span className="font-semibold text-emerald-400 font-mono-numbers">{monthlyStats.profitableCount}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Losing Months</span>
              <span className="font-semibold text-rose-400 font-mono-numbers">{monthlyStats.losingCount}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Best Month</span>
              <span className="font-semibold text-emerald-400">{monthlyStats.bestMonth}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Worst Month</span>
              <span className="font-semibold text-rose-400">{monthlyStats.worstMonth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Daily Equity Progress (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Daily Equity Progress
            </h2>
            <button
              onClick={() => navigate('/trades')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Opening Capital</th>
                  <th className="py-2 text-right">Daily P&L</th>
                  <th className="py-2 text-right">Closing Capital</th>
                  <th className="py-2 text-right">Drawdown</th>
                  <th className="py-2 pl-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                {dailyEquityRows.map((row) => (
                  <tr key={row.date} className="hover:bg-[#162033]/50">
                    <td className="py-2.5 text-slate-300 light:text-slate-700">{formatDate(row.date)}</td>
                    <td className="py-2.5 text-right font-mono-numbers text-slate-400">{formatINR(row.opening)}</td>
                    <td
                      className={`py-2.5 text-right font-mono-numbers font-bold ${
                        row.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {row.pnl >= 0 ? '+' : ''}{formatINR(row.pnl)}
                    </td>
                    <td className="py-2.5 text-right font-mono-numbers font-semibold text-white light:text-slate-900">
                      {formatINR(row.closing)}
                    </td>
                    <td className="py-2.5 text-right font-mono-numbers text-rose-400">
                      {row.dd > 0 ? formatINR(row.dd) : '0'}
                    </td>
                    <td className="py-2.5 pl-3 text-slate-400 text-[11px]">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Equity Curve Insights (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Equity Curve Insights
          </h2>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 light:text-slate-700">
                Capital grew by <strong className="text-emerald-400">{stats.roi}</strong> this year
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 light:text-slate-700">
                Current Capital: <strong className="text-white light:text-slate-900">{formatINR(stats.current_capital)}</strong> ({stats.current_capital_pct} ROI)
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 light:text-slate-700">
                Maximum drawdown is <strong className="text-rose-400">{formatINR(stats.max_drawdown)}</strong>
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Award className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 light:text-slate-700">
                Best performing month: <strong className="text-emerald-400">{monthlyStats.bestMonth}</strong>
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 light:text-slate-700">
                Overall risk-adjusted performance is good and consistent
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
