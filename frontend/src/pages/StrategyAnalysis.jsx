import React, { useState, useEffect, useMemo } from 'react';
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
import { useFilter } from '../context/FilterContext';

// Color palette mapping per strategy
const STRATEGY_THEME = {
  'Long Straddle': {
    badge: 'bg-[#2563eb]/20 text-[#3b82f6] border border-[#3b82f6]/40',
    color: '#3b82f6',
    chartFill: '#10b981',
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
    chartFill: '#10b981',
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

export default function StrategyAnalysis() {
  const { dateRangeDisplay } = useFilter();
  const [granularity, setGranularity] = useState('All');
  const [strategies, setStrategies] = useState([]);
  const [tradesList, setTradesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState('Performance');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stratRes, tradesRes] = await Promise.all([
        api.get('/strategies'),
        api.get('/trades', { params: { per_page: 100 } }),
      ]);

      const backendStrats = stratRes.data?.strategies || [];
      const backendPerf = stratRes.data?.performance || [];
      setTradesList(tradesRes.data?.data || []);

      if (backendPerf.length > 0) {
        const mapped = backendPerf.map((item) => ({
          strategy: item.strategy || 'Custom',
          trades: item.total_trades || 0,
          winRate: item.win_rate !== undefined ? parseFloat(item.win_rate) : 0,
          netPnl: item.net_pnl !== undefined ? parseFloat(item.net_pnl) : 0,
          grossProfit: item.gross_profit !== undefined ? parseFloat(item.gross_profit) : 0,
          grossLoss: item.gross_loss !== undefined ? parseFloat(item.gross_loss) : 0,
          avgPnl: item.total_trades ? Math.round(item.net_pnl / item.total_trades) : 0,
          rrRatio: item.avg_loss && Math.abs(item.avg_loss) > 0
            ? `1 : ${(Math.abs(item.avg_profit || 0) / Math.abs(item.avg_loss)).toFixed(1)}`
            : '1 : 1.0',
          maxDd: 0,
          expectancy: item.total_trades ? Math.round(item.net_pnl / item.total_trades) : 0,
        }));
        setStrategies(mapped);
      } else if (backendStrats.length > 0) {
        const mapped = backendStrats.map((s) => ({
          strategy: s.strategy_name,
          trades: 0,
          winRate: 0,
          netPnl: 0,
          grossProfit: 0,
          grossLoss: 0,
          avgPnl: 0,
          rrRatio: '0 : 0',
          maxDd: 0,
          expectancy: 0,
        }));
        setStrategies(mapped);
      } else {
        setStrategies([]);
      }
    } catch (err) {
      console.error('Failed to fetch strategies data', err);
    } finally {
      setLoading(false);
    }
  };

  const activeStrategies = useMemo(() => {
    return strategies.filter((s) => s.trades > 0);
  }, [strategies]);

  const hasTrades = activeStrategies.length > 0;

  // 6 Top Metrics computed dynamically
  const topMetrics = useMemo(() => {
    if (!hasTrades) {
      return {
        totalStrategies: strategies.length,
        mostProfitable: { name: '-', pnl: 0 },
        highestWinRate: { name: '-', winRate: 0 },
        bestRR: { name: '-', ratio: '-' },
        mostTraded: { name: '-', trades: 0 },
        leastProfitable: { name: '-', pnl: 0 },
      };
    }

    const sortedByPnl = [...activeStrategies].sort((a, b) => b.netPnl - a.netPnl);
    const sortedByWinRate = [...activeStrategies].sort((a, b) => b.winRate - a.winRate);
    const sortedByTrades = [...activeStrategies].sort((a, b) => b.trades - a.trades);

    const mostProf = sortedByPnl[0]?.netPnl > 0 ? sortedByPnl[0] : null;
    const leastProf = sortedByPnl[sortedByPnl.length - 1]?.netPnl < 0 ? sortedByPnl[sortedByPnl.length - 1] : null;

    return {
      totalStrategies: strategies.length,
      mostProfitable: mostProf ? { name: mostProf.strategy, pnl: mostProf.netPnl } : { name: '-', pnl: 0 },
      highestWinRate: sortedByWinRate[0] ? { name: sortedByWinRate[0].strategy, winRate: sortedByWinRate[0].winRate } : { name: '-', winRate: 0 },
      bestRR: sortedByWinRate[0] ? { name: sortedByWinRate[0].strategy, ratio: sortedByWinRate[0].rrRatio } : { name: '-', ratio: '-' },
      mostTraded: sortedByTrades[0] ? { name: sortedByTrades[0].strategy, trades: sortedByTrades[0].trades } : { name: '-', trades: 0 },
      leastProfitable: leastProf ? { name: leastProf.strategy, pnl: leastProf.netPnl } : { name: '-', pnl: 0 },
    };
  }, [strategies, activeStrategies, hasTrades]);

  // Bar chart data for Net P&L comparison
  const pnlComparisonData = useMemo(() => {
    return strategies.map((st) => ({
      name: st.strategy,
      short: st.strategy.split(' ')[0],
      pnl: st.netPnl,
      fill: st.netPnl >= 0 ? '#10b981' : '#ef4444',
      displayVal: formatCompactINR(st.netPnl),
    }));
  }, [strategies]);

  // Bar chart data for Win Rate by Strategy
  const winRateData = useMemo(() => {
    return strategies.map((st) => ({
      name: st.strategy,
      short: st.strategy.split(' ')[0],
      winRate: st.winRate,
      fill: STRATEGY_THEME[st.strategy]?.color || '#3b82f6',
      displayVal: `${st.winRate.toFixed(1)}%`,
    }));
  }, [strategies]);

  // Distribution Donut
  const distributionData = useMemo(() => {
    const total = strategies.reduce((acc, s) => acc + s.trades, 0);
    if (total === 0) return [];
    return strategies
      .filter((s) => s.trades > 0)
      .map((s) => ({
        name: s.strategy,
        value: s.trades,
        pct: `${Math.round((s.trades / total) * 100)}%`,
        color: STRATEGY_THEME[s.strategy]?.color || '#3b82f6',
      }));
  }, [strategies]);

  // Scatter points
  const scatterData = useMemo(() => {
    return tradesList.map((t) => {
      const net = parseFloat(t.net_pnl) || 0;
      const charges = parseFloat(t.total_charges) || 0;
      const risk = charges > 0 ? charges * 5 : 2000;
      return {
        risk: Math.round(risk),
        reward: Math.round(net),
        strategy: t.strategy_name || 'Others',
      };
    });
  }, [tradesList]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
            Strategy Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare and optimize performance across your trading setups and strategies
          </p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {/* Date Picker Button */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-xs text-slate-300 light:text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">{dateRangeDisplay || 'All Time'}</span>
          </div>

          {/* Granularity Tabs */}
          <div className="flex items-center bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 rounded-lg p-0.5 text-xs">
            {['1M', '3M', '6M', 'YTD', 'All'].map((t) => (
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
            <div className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers mt-0.5">
              {topMetrics.totalStrategies}
            </div>
          </div>
        </div>

        {/* Most Profitable */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Most Profitable</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">
              {topMetrics.mostProfitable.name}
            </div>
            <div className="text-xs font-bold text-emerald-400 font-mono-numbers mt-0.5">
              {topMetrics.mostProfitable.pnl > 0 ? `+${formatINR(topMetrics.mostProfitable.pnl)}` : '₹0'}
            </div>
          </div>
        </div>

        {/* Highest Win Rate */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Highest Win Rate</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">
              {topMetrics.highestWinRate.name}
            </div>
            <div className="text-xs font-bold text-emerald-400 font-mono-numbers mt-0.5">
              {topMetrics.highestWinRate.winRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Best Risk:Reward */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Best Risk:Reward</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">
              {topMetrics.bestRR.name}
            </div>
            <div className="text-xs font-bold text-blue-400 font-mono-numbers mt-0.5">
              {topMetrics.bestRR.ratio}
            </div>
          </div>
        </div>

        {/* Most Traded */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <ArrowUpDown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Most Traded</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">
              {topMetrics.mostTraded.name}
            </div>
            <div className="text-xs text-slate-400 font-mono-numbers mt-0.5">
              {topMetrics.mostTraded.trades} trades
            </div>
          </div>
        </div>

        {/* Least Profitable */}
        <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Least Profitable</div>
            <div className="text-xs font-bold text-white light:text-slate-900 truncate">
              {topMetrics.leastProfitable.name}
            </div>
            <div className="text-xs font-bold text-rose-400 font-mono-numbers mt-0.5">
              {topMetrics.leastProfitable.pnl < 0 ? formatINR(topMetrics.leastProfitable.pnl) : '₹0'}
            </div>
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
                  <th className="py-2.5 px-3 font-medium text-right">Avg P&L</th>
                  <th className="py-2.5 px-2 font-medium text-center">R:R Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/40 light:divide-slate-100 font-mono-numbers">
                {strategies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No strategies configured. Add strategies to begin tracking.
                    </td>
                  </tr>
                ) : (
                  strategies.map((st) => (
                    <tr key={st.strategy} className="hover:bg-[#162033]/50 transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-sans ${
                            STRATEGY_THEME[st.strategy]?.badge ||
                            'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                          }`}
                        >
                          {st.strategy}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-300 light:text-slate-700">{st.trades}</td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`font-semibold ${
                            st.winRate >= 60
                              ? 'text-emerald-400'
                              : st.winRate > 0
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {st.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          st.netPnl > 0
                            ? 'text-emerald-400'
                            : st.netPnl < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.netPnl > 0 ? '+' : ''}{formatINR(st.netPnl)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right ${
                          st.avgPnl > 0
                            ? 'text-emerald-400'
                            : st.avgPnl < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.avgPnl > 0 ? '+' : ''}{formatINR(st.avgPnl)}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-300 light:text-slate-700">{st.rrRatio}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Stacked Visual Charts */}
        <div className="col-span-12 xl:col-span-5 flex flex-col gap-5">
          {/* Chart 1: Net P&L by Strategy */}
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm flex-1">
            <h2 className="text-sm font-bold text-white light:text-slate-900 mb-3">
              Net P&L by Strategy
            </h2>

            <div className="h-44 w-full flex items-center justify-center">
              {!hasTrades ? (
                <p className="text-xs text-slate-500">No trade data available for P&L comparison</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="short" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(v) => formatCompactINR(v)} />
                    <ReferenceLine y={0} stroke="#475569" />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {pnlComparisonData.map((entry, index) => (
                        <Cell key={`pnl-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Win Rate by Strategy */}
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm flex-1">
            <h2 className="text-sm font-bold text-white light:text-slate-900 mb-3">
              Win Rate by Strategy (%)
            </h2>

            <div className="h-44 w-full flex items-center justify-center">
              {!hasTrades ? (
                <p className="text-xs text-slate-500">No trade win rate data available</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={winRateData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="short" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 100]} />
                    <ReferenceLine y={50} stroke="#475569" strokeDasharray="2 2" />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                      {winRateData.map((entry, index) => (
                        <Cell key={`wr-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Risk vs Reward Scatter & Distribution Donut & Key Insights */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: Risk vs Reward Scatter */}
        <div className="col-span-12 lg:col-span-5 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-white light:text-slate-900 mb-2">
            Risk vs Reward Scatter
          </h2>

          <div className="h-60 w-full flex items-center justify-center">
            {scatterData.length === 0 ? (
              <p className="text-xs text-slate-500">No trade scatter points available yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    type="number"
                    dataKey="risk"
                    name="Risk"
                    stroke="#64748b"
                    fontSize={9}
                    tickFormatter={(v) => formatCompactINR(v)}
                  />
                  <YAxis
                    type="number"
                    dataKey="reward"
                    name="Reward"
                    stroke="#64748b"
                    fontSize={9}
                    tickFormatter={(v) => formatCompactINR(v)}
                  />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`sc-${index}`}
                        fill={STRATEGY_THEME[entry.strategy]?.color || '#3b82f6'}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Middle: Strategy Allocation Donut */}
        <div className="col-span-12 lg:col-span-3 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <h2 className="text-sm font-bold text-white light:text-slate-900 mb-2">
            Trade Allocation
          </h2>

          <div className="h-48 w-full flex items-center justify-center">
            {distributionData.length === 0 ? (
              <p className="text-xs text-slate-500">No trades recorded</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1 text-[11px] max-h-24 overflow-y-auto">
            {distributionData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate">{d.name}</span>
                </div>
                <span className="font-mono-numbers text-slate-200">{d.value} ({d.pct})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Key Insights */}
        <div className="col-span-12 lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white light:text-slate-900 mb-4">
              Key Insights
            </h2>

            <div className="space-y-3.5 text-xs">
              {!hasTrades ? (
                <div className="p-4 rounded-2xl bg-[#0e1626] border border-[#1e293b] text-center space-y-1.5">
                  <Lightbulb className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="font-semibold text-slate-200">No Insights Available</p>
                  <p className="text-[11px] text-slate-400">
                    Log your trades to receive automated strategy insights and win rate analytics.
                  </p>
                </div>
              ) : (
                <>
                  {topMetrics.mostProfitable.pnl > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-slate-300 light:text-slate-700 text-[11px] leading-relaxed">
                        <strong className="text-white light:text-slate-900">{topMetrics.mostProfitable.name}</strong> is currently your most profitable setup with <span className="text-emerald-400 font-bold font-mono-numbers">{formatINR(topMetrics.mostProfitable.pnl)}</span> net returns.
                      </p>
                    </div>
                  )}

                  {topMetrics.highestWinRate.winRate > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-slate-300 light:text-slate-700 text-[11px] leading-relaxed">
                        <strong className="text-white light:text-slate-900">{topMetrics.highestWinRate.name}</strong> leads win accuracy at <span className="text-emerald-400 font-bold font-mono-numbers">{topMetrics.highestWinRate.winRate.toFixed(1)}%</span>.
                      </p>
                    </div>
                  )}

                  {topMetrics.leastProfitable.pnl < 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-slate-300 light:text-slate-700 text-[11px] leading-relaxed">
                        <strong className="text-white light:text-slate-900">{topMetrics.leastProfitable.name}</strong> is experiencing drawdown ({formatINR(topMetrics.leastProfitable.pnl)}). Review execution and stops.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
