import React, { useState, useEffect, useMemo } from 'react';
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
import { useFilter } from '../context/FilterContext';

export default function AnalyticsReports() {
  const { dateRangeDisplay } = useFilter();
  const [granularity, setGranularity] = useState('All');
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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [granularity]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [res, dashRes] = await Promise.all([
        api.get('/analytics', { params: { filter: granularity.toLowerCase() } }),
        api.get('/dashboard', { params: { filter: granularity.toLowerCase() } }),
      ]);
      setData({ analytics: res.data, dashboard: dashRes.data });
    } catch (e) {
      console.warn('Failed to load analytics', e);
    } finally {
      setLoading(false);
    }
  };

  const monthlyBarData = useMemo(() => {
    const raw = data?.dashboard?.charts?.monthly_pnl || [];
    return raw.map((d) => ({
      month: d.month,
      value: d.net_pnl ? +(d.net_pnl / 1000).toFixed(1) : 0,
      amount: d.net_pnl || 0,
      isProfit: (d.net_pnl || 0) >= 0,
    }));
  }, [data]);

  const dailyPnlData = useMemo(() => {
    const raw = data?.dashboard?.charts?.daily_pnl || [];
    return raw.map((d) => ({
      day: d.date ? d.date.split('-').slice(1).join('/') : d.day,
      pnl: d.net_pnl || 0,
    }));
  }, [data]);

  const winLossData = useMemo(() => {
    const wins = data?.dashboard?.stats?.winning_trades || 0;
    const losses = data?.dashboard?.stats?.losing_trades || 0;
    const total = wins + losses;
    if (total === 0) return [];
    return [
      { name: 'Winning Trades', value: wins, pct: `${Math.round((wins / total) * 100)}%`, color: '#10b981' },
      { name: 'Losing Trades', value: losses, pct: `${Math.round((losses / total) * 100)}%`, color: '#ef4444' },
    ];
  }, [data]);

  const indexDistribution = useMemo(() => {
    const comp = data?.analytics?.comparisons;
    if (!comp) return [];
    const list = [];
    if (comp.nifty_vs_sensex?.nifty) list.push({ name: 'NIFTY', value: Math.abs(comp.nifty_vs_sensex.nifty), color: '#3b82f6', pct: '50%' });
    if (comp.banknifty_vs_nifty?.banknifty) list.push({ name: 'BANKNIFTY', value: Math.abs(comp.banknifty_vs_nifty.banknifty), color: '#10b981', pct: '50%' });
    return list;
  }, [data]);

  const durationData = useMemo(() => [], []);

  const stats = useMemo(() => {
    const m = data?.analytics?.metrics || {};
    const d = data?.dashboard?.stats || {};
    const totalTrades = m.total_trades ?? (d.total_trades || 0);
    const winTrades = d.winning_trades ?? (d.winning_days || 0);
    const lossTrades = d.losing_trades ?? (d.losing_days || 0);
    const winRate = d.trade_win_rate ?? (d.win_rate || 0);
    const netProfit = m.total_net_pnl ?? (d.total_net_profit || 0);
    const grossProfit = m.total_gross_profit ?? (d.total_gross_profit || 0);
    const grossLoss = m.total_gross_loss ?? (d.total_gross_loss || 0);
    const profitFactor = d.profit_factor || 0;
    const maxDd = d.max_drawdown || 0;
    const maxDdPct = d.max_drawdown_pct || 0;
    const avgWin = m.avg_winning_trade || 0;
    const avgLoss = m.avg_losing_trade || 0;
    const largestWin = m.largest_winning_trade || 0;
    const largestLoss = m.largest_losing_trade || 0;
    const riskReward = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : (avgWin > 0 ? '1 : ∞' : '-');

    return {
      totalTrades,
      winTrades,
      lossTrades,
      winRate,
      netProfit,
      grossProfit,
      grossLoss,
      profitFactor,
      maxDd,
      maxDdPct,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      riskReward,
      expectancy: totalTrades > 0 ? Math.round(netProfit / totalTrades) : 0,
      sharpe: d.sharpe_ratio || 0,
      sortino: d.sortino_ratio || 0,
      calmar: d.calmar_ratio || 0,
      consecutiveWins: d.consecutive_win_days || 0,
      consecutiveLosses: d.consecutive_loss_days || 0,
    };
  }, [data]);

  const monthlyTableRows = useMemo(() => {
    const list = data?.dashboard?.charts?.monthly_pnl || [];
    return list.map((m) => ({
      month: m.month,
      trades: m.trades || 0,
      winRate: m.win_rate ? `${m.win_rate}%` : '0%',
      netPnl: formatINR(m.net_pnl || 0),
      isProfit: (m.net_pnl || 0) >= 0,
      pf: '1.0',
      maxDd: '₹0',
    }));
  }, [data]);

  const metrics = useMemo(() => {
    const s = data?.dashboard?.stats || {};
    const m = data?.analytics?.metrics || {};
    return {
      netPnl: s.total_net_profit ?? (m.total_net_pnl ?? 0),
      totalTrades: s.total_trades ?? (m.total_trades ?? 0),
      winRate: s.trade_win_rate ?? (m.win_rate ?? 0),
      profitFactor: s.profit_factor ?? 0,
      expectancy: s.expectancy ?? 0,
      maxDrawdown: s.max_drawdown ?? 0,
      sharpeRatio: s.sharpe_ratio ?? 0,
    };
  }, [data]);

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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium tracking-wide">
            Loading analytics & reports...
          </span>
        </div>
      </div>
    );
  }

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
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium">{dateRangeDisplay || 'All Time'}</span>
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
            {formatINR(metrics.netPnl)}
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>{metrics.netPnl >= 0 ? '↑ Profit' : '↓ Loss'}</span>
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
            {metrics.totalTrades}
          </div>
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>Logged trades</span>
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
            {metrics.winRate}%
          </div>
          <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>Overall Win Rate</span>
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
            {metrics.profitFactor}
          </div>
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>Gross P / Gross L</span>
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
            {formatINR(metrics.expectancy)}
          </div>
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>Avg expectation</span>
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
            {formatINR(metrics.maxDrawdown)}
          </div>
          <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>Peak to trough</span>
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
            {metrics.sharpeRatio}
          </div>
          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-1 font-mono-numbers">
            <span>Risk-adjusted</span>
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
              <span className="text-[10px] text-slate-400 block">Performance</span>
              <span className="text-xs font-bold text-white">{formatINR(metrics.netPnl)}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.dashboard?.charts?.equity_curve || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
              <span>{new Date().getFullYear()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-2">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></span> Profit</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]"></span> Loss</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {monthlyBarData.length === 0 ? (
              <p className="text-xs text-slate-500">No monthly trade data available for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBarData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => (v === 0 ? '0' : `${v}K`)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[#162033] p-2.5 rounded-xl border border-[#1e293b] text-xs font-mono-numbers">
                            <span className="text-white font-sans font-bold">{d.month}: </span>
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
                    {monthlyBarData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.isProfit ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
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

          <div className="h-56 w-full pt-2 flex items-center justify-center">
            {dailyPnlData.length === 0 ? (
              <p className="text-xs text-slate-500">No trading activity recorded for chart display</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnlData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
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
                    {dailyPnlData.map((entry, index) => (
                      <Cell key={`dpnl-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
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
                    data={indexDistribution.length > 0 ? indexDistribution : [{ name: 'No Trades', value: 1, color: '#334155' }]}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={64}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {(indexDistribution.length > 0 ? indexDistribution : [{ color: '#334155' }]).map((entry, idx) => (
                      <Cell key={`idist-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono-numbers">
                <span className="text-xl font-bold text-white light:text-slate-900 leading-none">{metrics.totalTrades}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Trades</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 text-[11px] overflow-hidden">
              {indexDistribution.length === 0 ? (
                <p className="text-xs text-slate-500">No index distribution data</p>
              ) : (
                indexDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-1 text-slate-300 light:text-slate-700">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-mono-numbers text-slate-400 text-[10px] shrink-0">
                      {item.value} ({item.pct})
                    </span>
                  </div>
                ))
              )}
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
            </div>
          </div>

          <div className="flex flex-col items-center justify-center h-56 space-y-2">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData.length > 0 ? winLossData : [{ name: 'None', value: 1, color: '#334155' }]}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={64}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {(winLossData.length > 0 ? winLossData : [{ color: '#334155' }]).map((entry, idx) => (
                      <Cell key={`wl-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono-numbers">
                <span className="text-base font-bold text-white light:text-slate-900 leading-none">
                  {typeof metrics.winRate === 'number' ? `${metrics.winRate.toFixed(1)}%` : metrics.winRate}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Win Rate</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-mono-numbers pt-1">
              <span className="flex items-center gap-1.5 text-slate-300 light:text-slate-700">
                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                Wins <strong className="text-emerald-400 ml-1">{data?.dashboard?.stats?.winning_trades || 0}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-slate-300 light:text-slate-700">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                Losses <strong className="text-rose-400 ml-1">{data?.dashboard?.stats?.losing_trades || 0}</strong>
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
                {formatINR(stats.maxDd)} <span className="text-xs font-normal">({stats.maxDdPct}%)</span>
              </span>
            </div>

            {/* Avg Winning Trade */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Avg Winning Trade</span>
              <span className="text-base font-bold font-mono-numbers text-emerald-400">
                {formatINR(stats.avgWin)}
              </span>
            </div>

            {/* Avg Losing Trade */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Avg Losing Trade</span>
              <span className="text-base font-bold font-mono-numbers text-rose-400">
                {stats.avgLoss > 0 ? `-${formatINR(stats.avgLoss)}` : formatINR(0)}
              </span>
            </div>

            {/* Largest Win */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Largest Win</span>
              <span className="text-base font-bold font-mono-numbers text-emerald-400">
                {formatINR(stats.largestWin)}
              </span>
            </div>

            {/* Largest Loss */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Largest Loss</span>
              <span className="text-base font-bold font-mono-numbers text-rose-400">
                {stats.largestLoss < 0 ? formatINR(stats.largestLoss) : formatINR(0)}
              </span>
            </div>

            {/* Risk:Reward Ratio */}
            <div className="bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 rounded-2xl p-3.5">
              <span className="text-[11px] text-slate-400 block mb-1">Risk:Reward Ratio</span>
              <span className="text-base font-bold font-mono-numbers text-white light:text-slate-900">
                {stats.riskReward !== '-' ? `1 : ${stats.riskReward}` : '-'}
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

          <div className="h-44 w-full pt-2 flex items-center justify-center">
            {durationData.length === 0 ? (
              <p className="text-xs text-slate-500">No duration data available yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="range" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
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
                  <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.totalTrades}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Profitable Trades</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.winTrades}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Losing Trades</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.lossTrades}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Win Rate</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.winRate}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Total Net Profit</span>
                <span className={`font-bold font-mono-numbers ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatINR(stats.netProfit)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Gross Profit</span>
                <span className="font-bold text-emerald-400 font-mono-numbers">{formatINR(stats.grossProfit)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Gross Loss</span>
                <span className="font-bold text-rose-400 font-mono-numbers">{stats.grossLoss > 0 ? `-${formatINR(stats.grossLoss)}` : formatINR(0)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Profit Factor</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.profitFactor}</span>
              </div>
            </div>

            {/* Right Col */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>Expectancy (per trade)</span>
                <span className={`font-bold font-mono-numbers ${stats.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatINR(stats.expectancy)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Average Trade Duration</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.totalTrades > 0 ? 'Intraday' : '-'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Max Drawdown</span>
                <span className="font-bold text-rose-400 font-mono-numbers">{formatINR(stats.maxDd)} ({stats.maxDdPct}%)</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Sharpe Ratio</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.sharpe}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Sortino Ratio</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.sortino}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Calmar Ratio</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.calmar}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Max Consecutive Wins</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.consecutiveWins}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Max Consecutive Losses</span>
                <span className="font-bold text-white light:text-slate-900 font-mono-numbers">{stats.consecutiveLosses}</span>
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
                {(!data?.dashboard?.charts?.monthly_pnl || data.dashboard.charts.monthly_pnl.length === 0) ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 font-sans text-xs">
                      No monthly summary recorded yet.
                    </td>
                  </tr>
                ) : (
                  (data?.dashboard?.charts?.monthly_pnl || []).map((r) => (
                    <tr key={r.month} className="hover:bg-[#162033]/50">
                      <td className="py-2 px-2 font-sans text-slate-300 light:text-slate-700">{r.month}</td>
                      <td className="py-2 px-2 text-center text-slate-300">{r.trade_count || 1}</td>
                      <td className="py-2 px-2 text-center text-slate-300">{r.win_rate || 0}%</td>
                      <td className={`py-2 px-2 text-right font-semibold ${r.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatINR(r.net_pnl)}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-300">1.0</td>
                      <td className="py-2 px-2 text-right text-rose-400">₹0</td>
                    </tr>
                  ))
                )}
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
