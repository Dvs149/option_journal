import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  LineChart as LineChartIcon,
  Shield,
  ShieldAlert,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import api from '../api/client';
import { useFilter } from '../context/FilterContext';
import { useTheme } from '../context/ThemeContext';
import { MainStatsCard, CompactMetricCard } from '../components/common/StatsCard';
import { formatINR, formatCompactINR, formatDate } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const { filter, fromDate, customFrom, customTo, dateRangeDisplay, setDateRangeDisplay } = useFilter();
  const { isKite } = useTheme();

  const filterLabel = useMemo(() => {
    switch (filter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'tomorrow':
      case 'next_working_day':
        return 'Tomorrow / Next Working Day';
      case 'this_week': return 'This Week';
      case 'this_month': return 'This Month';
      case 'last_month': return 'Last Month';
      case 'this_year': return 'This Year';
      case 'all': return 'All Time';
      case 'custom': return dateRangeDisplay || 'Custom Range';
      default: return 'This Month';
    }
  }, [filter, dateRangeDisplay]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const today = new Date();
  const calendarCardRef = useRef(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredIndexSlice, setHoveredIndexSlice] = useState(null);
  const [hoveredCePeSlice, setHoveredCePeSlice] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [calendarData, setCalendarData] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, [filter, customFrom, customTo]);

  useEffect(() => {
    fetchCalendarData(calendarMonth.year, calendarMonth.month);
  }, [calendarMonth]);

  // Sync mini calendar widget with global filter
  useEffect(() => {
    if (filter === 'all') return;
    const dateStr = fromDate || customFrom;
    if (dateStr) {
      const parts = String(dateStr).split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          setCalendarMonth((prev) => {
            if (prev.year === y && prev.month === m) return prev;
            return { year: y, month: m };
          });
        }
      }
    }
  }, [filter, fromDate, customFrom]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard', {
        params: {
          filter,
          from_date: customFrom,
          to_date: customTo,
        },
      });
      setData(res.data);
      if (res.data?.date_range?.display) {
        setDateRangeDisplay(res.data.date_range.display);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async (year, month) => {
    try {
      const res = await api.get('/calendar', {
        params: { year, month },
      });
      setCalendarData(res.data);
    } catch (err) {
      console.error('Failed to load calendar widget data', err);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium tracking-wide">
            Loading trading analytics...
          </span>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const strategyPerf = data?.strategy_performance || [];
  const recentTrades = data?.recent_trades || [];
  const risk = data?.risk_management || {};

  // Dynamically calculate percentage badges relative to capital
  const hasTrades = (stats.total_trades || 0) > 0
    || (stats.total_trading_days || 0) > 0
    || (stats.total_gross_profit || 0) > 0
    || (stats.total_gross_loss || 0) > 0
    || (stats.total_net_profit || 0) !== 0;
  const investedCap = stats.invested_capital || stats.initial_capital || 500000;

  const netProfitPct = stats.period_roi !== undefined && stats.period_roi !== null
    ? `${stats.period_roi >= 0 ? '+' : ''}${Number(stats.period_roi).toFixed(2)}%`
    : `${((stats.total_net_profit || 0) / investedCap * 100) >= 0 ? '+' : ''}${(((stats.total_net_profit || 0) / investedCap) * 100).toFixed(2)}%`;

  const grossProfitPct = stats.gross_profit_pct !== undefined && stats.gross_profit_pct !== null
    ? `+${Number(stats.gross_profit_pct).toFixed(2)}%`
    : `+${(((stats.total_gross_profit || 0) / investedCap) * 100).toFixed(2)}%`;

  const grossLossPct = stats.gross_loss_pct !== undefined && stats.gross_loss_pct !== null
    ? `-${Number(stats.gross_loss_pct).toFixed(2)}%`
    : `-${(((stats.total_gross_loss || 0) / investedCap) * 100).toFixed(2)}%`;

  const todayPnlPct = stats.today_pnl_pct !== undefined && stats.today_pnl_pct !== null
    ? `${stats.today_pnl_pct >= 0 ? '+' : ''}${Number(stats.today_pnl_pct).toFixed(2)}%`
    : `${((stats.today_pnl || 0) / investedCap * 100) >= 0 ? '+' : ''}${(((stats.today_pnl || 0) / investedCap) * 100).toFixed(2)}%`;

  const monthPnlPct = stats.this_month_pnl_pct !== undefined && stats.this_month_pnl_pct !== null
    ? `${stats.this_month_pnl_pct >= 0 ? '+' : ''}${Number(stats.this_month_pnl_pct).toFixed(2)}%`
    : `${((stats.this_month_pnl || 0) / investedCap * 100) >= 0 ? '+' : ''}${(((stats.this_month_pnl || 0) / investedCap) * 100).toFixed(2)}%`;

  const currentCapitalPct = stats.overall_roi !== undefined && stats.overall_roi !== null
    ? `${stats.overall_roi >= 0 ? '+' : ''}${Number(stats.overall_roi).toFixed(2)}%`
    : `${((((stats.current_capital || investedCap) - investedCap) / investedCap) * 100) >= 0 ? '+' : ''}${((((stats.current_capital || investedCap) - investedCap) / investedCap) * 100).toFixed(2)}%`;

  // Custom colors for Donut charts
  const indexColors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f97316', '#ec4899', '#10b981'];
  const cePeColors = { CE: '#10b981', PE: '#ef4444', Both: '#3b82f6' };

  // Monthly P&L for the selected calendar month in the widget
  const calendarMonthlyPnl = calendarData?.total_net_pnl !== undefined && calendarData?.total_net_pnl !== null
    ? Number(calendarData.total_net_pnl)
    : (Array.isArray(calendarData?.days)
        ? calendarData.days.reduce((acc, d) => acc + (Number(d.net_pnl) || 0), 0)
        : 0);

  // Compact helper for the small calendar widget cell to prevent text overflow / clipping
  const formatMiniCellPnl = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '';
    const num = Number(val);
    const isNegative = num < 0;
    const abs = Math.abs(num);
    const sign = isNegative ? '-' : '+';
    if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
    return `${sign}${abs.toFixed(0)}`;
  };

  // Calendar rendering calculation
  const renderCalendarDays = () => {
    const { year, month } = calendarMonth;
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month, 0).getDate();
    const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();

    const calendarMap = {};
    if (calendarData?.days) {
      calendarData.days.forEach((d) => {
        calendarMap[d.day] = d;
      });
    }

    const cells = [];
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      cells.push({
        day: d,
        isCurrentMonth: true,
        data: calendarMap[d] || null,
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      cells.push({
        day: j,
        isCurrentMonth: false,
      });
    }

    return cells;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* 1. Main Statistics Row (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 2xl:gap-3.5">
        <MainStatsCard
          title="Total Net Profit"
          value={formatINR(stats.total_net_profit)}
          change={hasTrades ? netProfitPct : null}
          isPositiveChange={stats.total_net_profit >= 0}
          icon={stats.total_net_profit >= 0 ? TrendingUp : TrendingDown}
          variant={stats.total_net_profit >= 0 ? 'green' : (isKite ? 'orange' : 'red')}
        />
        <MainStatsCard
          title="Total Gross Profit"
          value={formatINR(stats.total_gross_profit)}
          change={hasTrades ? grossProfitPct : null}
          isPositiveChange={true}
          icon={ArrowUpRight}
          variant="green"
        />
        <MainStatsCard
          title="Total Gross Loss"
          value={formatINR(stats.total_gross_loss)}
          change={hasTrades ? grossLossPct : null}
          isPositiveChange={false}
          icon={TrendingDown}
          variant={isKite ? 'orange' : 'red'}
        />
        <MainStatsCard
          title="Today's P&L"
          value={formatINR(stats.today_pnl)}
          change={hasTrades ? todayPnlPct : null}
          isPositiveChange={stats.today_pnl >= 0}
          icon={stats.today_pnl >= 0 ? TrendingUp : TrendingDown}
          variant={stats.today_pnl >= 0 ? 'green' : (isKite ? 'orange' : 'red')}
        />
        <MainStatsCard
          title="This Month's P&L"
          value={formatINR(stats.this_month_pnl)}
          change={hasTrades ? monthPnlPct : null}
          isPositiveChange={stats.this_month_pnl >= 0}
          icon={stats.this_month_pnl >= 0 ? LineChartIcon : TrendingDown}
          variant={stats.this_month_pnl >= 0 ? 'blue' : (isKite ? 'orange' : 'red')}
        />
        <MainStatsCard
          title="Current Capital"
          value={formatINR(stats.current_capital)}
          change={hasTrades ? currentCapitalPct : null}
          isPositiveChange={stats.overall_roi >= 0}
          icon={Shield}
          variant={stats.overall_roi >= 0 ? 'teal' : (isKite ? 'orange' : 'red')}
        />
      </div>

      {/* 2. Secondary Metrics Row (8 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 2xl:gap-2.5">
        <CompactMetricCard
          label="Total Trading Days"
          value={stats.total_trading_days || 0}
        />
        <CompactMetricCard
          label="Winning Days"
          value={stats.winning_days || 0}
          valueColor="text-emerald-400"
        />
        <CompactMetricCard
          label="Losing Days"
          value={stats.losing_days || 0}
          valueColor="text-rose-400"
        />
        <CompactMetricCard
          label="Win Rate"
          value={`${stats.win_rate || 0}%`}
        />
        <CompactMetricCard
          label="Avg. Daily Profit"
          value={formatINR(stats.avg_daily_profit)}
        />
        <CompactMetricCard
          label="Avg. Daily Loss"
          value={formatINR(stats.avg_daily_loss)}
          valueColor="text-rose-400"
        />
        <CompactMetricCard
          label="Max Drawdown"
          value={formatINR(stats.max_drawdown)}
          valueColor="text-rose-400"
        />
        <CompactMetricCard
          label="Profit Factor"
          value={stats.profit_factor || 0}
        />
      </div>

      {/* 3. Primary Charts Section (Daily P&L, Equity Curve, Trading Calendar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Daily P&L Chart */}
        <div className="lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white light:text-slate-900 tracking-tight">
              Daily P&L
            </h3>
            <span className="text-[11px] font-medium text-slate-400 bg-[#162033] light:bg-slate-100 px-2 py-0.5 rounded-lg border border-[#1e293b] light:border-slate-200">
              {filterLabel}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.daily_pnl || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactINR(val)}
                />
                <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const isProfit = d.pnl >= 0;
                      return (
                        <div className="bg-[#162033] light:bg-white p-2.5 rounded-xl border border-[#1e293b] light:border-slate-200 shadow-xl text-xs font-mono-numbers">
                          <p className="text-slate-400 font-sans">{formatDate(d.date)}</p>
                          <p className={`font-bold mt-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            Net P&L: {formatINR(d.pnl)}
                          </p>
                          <p className="text-slate-400 text-[11px] font-sans">Trades: {d.trades}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="pnl" radius={[3, 3, 3, 3]}>
                  {(charts.daily_pnl || []).map((entry, index) => (
                    <Cell
                      key={`daily-pnl-${index}`}
                      fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative P&L (Equity Curve) */}
        <div className="lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white light:text-slate-900 tracking-tight">
              Cumulative P&L (Equity Curve)
            </h3>
            <span className="text-[11px] font-medium text-slate-400 bg-[#162033] light:bg-slate-100 px-2 py-0.5 rounded-lg border border-[#1e293b] light:border-slate-200">
              {filterLabel}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.equity_curve || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactINR(val)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#162033] light:bg-white p-2.5 rounded-xl border border-[#1e293b] light:border-slate-200 shadow-xl text-xs font-mono-numbers">
                          <p className="text-slate-400 font-sans">{formatDate(d.date)}</p>
                          <p className="text-blue-400 font-bold mt-1">
                            Cumulative: {formatINR(d.cumulative_pnl)}
                          </p>
                          <p className="text-slate-300 light:text-slate-700 text-[11px]">
                            Capital: {formatINR(d.capital)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative_pnl"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#equityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trading Calendar Mini Widget */}
        <div
          ref={calendarCardRef}
          onMouseLeave={() => setHoveredDay(null)}
          className="lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative"
        >
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-bold text-white light:text-slate-900 tracking-tight shrink-0">
                Trading Calendar
              </h3>
              {calendarMonthlyPnl !== 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono-numbers shrink-0 transition-colors ${
                    calendarMonthlyPnl > 0
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                  title={`Total Monthly P&L: ${calendarMonthlyPnl > 0 ? '+' : ''}${formatINR(calendarMonthlyPnl)}`}
                >
                  {calendarMonthlyPnl > 0 ? `+${formatINR(calendarMonthlyPnl)}` : formatINR(calendarMonthlyPnl)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setCalendarMonth((prev) => {
                    const m = prev.month === 1 ? 12 : prev.month - 1;
                    const y = prev.month === 1 ? prev.year - 1 : prev.year;
                    return { year: y, month: m };
                  });
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-semibold text-slate-200 light:text-slate-800 w-28 text-center select-none block truncate">
                {new Date(calendarMonth.year, calendarMonth.month - 1).toLocaleString('default', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>

              <button
                onClick={() => {
                  setCalendarMonth((prev) => {
                    const m = prev.month === 12 ? 1 : prev.month + 1;
                    const y = prev.month === 12 ? prev.year + 1 : prev.year;
                    return { year: y, month: m };
                  });
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-semibold text-slate-400">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center flex-1">
            {renderCalendarDays().map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="h-10 rounded-lg bg-[#0e1626]/40 light:bg-slate-100/40 text-slate-600 light:text-slate-400 text-[11px] flex items-center justify-center select-none"
                  >
                    {cell.day}
                  </div>
                );
              }

              const d = cell.data;
              const hasTrade = !!d;
              const isProfit = d && d.net_pnl > 0;
              const isLoss = d && d.net_pnl < 0;

              const colIndex = idx % 7;
              const rowIndex = Math.floor(idx / 7);
              const cellDate = new Date(calendarMonth.year, calendarMonth.month - 1, cell.day);
              const monthName = cellDate.toLocaleString('default', { month: 'short' });
              const weekdayName = d?.weekday ? d.weekday.slice(0, 3) : cellDate.toLocaleDateString('default', { weekday: 'short' });

              return (
                <div
                  key={idx}
                  tabIndex={0}
                  role="button"
                  aria-label={`${cell.day} ${monthName}, ${hasTrade ? (isProfit ? 'Profit ' : 'Loss ') + formatINR(d.net_pnl, true) : 'No trades'}`}
                  onClick={() => {
                    navigate('/calendar');
                  }}
                  onMouseEnter={(e) => {
                    if (!hasTrade) return;
                    const parent = calendarCardRef.current;
                    if (!parent) return;
                    const targetRect = e.currentTarget.getBoundingClientRect();
                    const parentRect = parent.getBoundingClientRect();
                    setHoveredDay({
                      day: cell.day,
                      data: d,
                      colIndex,
                      rowIndex,
                      monthName,
                      weekdayName,
                      cellLeft: targetRect.left - parentRect.left,
                      cellRight: targetRect.right - parentRect.left,
                      cellWidth: targetRect.width,
                      cellTop: targetRect.top - parentRect.top,
                      cellBottom: targetRect.bottom - parentRect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate('/calendar');
                    }
                  }}
                  className={`h-10 rounded-lg p-0.5 flex flex-col items-center justify-center text-[10px] transition-all cursor-pointer border ${
                    !hasTrade
                      ? 'bg-[#152033] light:bg-slate-100 border-transparent text-slate-400 hover:border-slate-500/50'
                      : isProfit
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-400'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-400 hover:bg-rose-900/50 hover:border-rose-400'
                  }`}
                >
                  <span className="font-semibold text-[11px] leading-tight select-none">{cell.day}</span>
                  {hasTrade && (
                    <span className="text-[8px] sm:text-[8.5px] font-mono-numbers font-bold tracking-tight leading-none truncate max-w-full px-0.5 select-none">
                      {formatMiniCellPnl(d.net_pnl)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Single Floating Tooltip at Calendar Level - WCAG 1.4.13 Compliant, Never Clipped by Grid Cells */}
          {hoveredDay && hoveredDay.data && (
            <div
              role="tooltip"
              className="absolute z-50 pointer-events-none w-52 p-2.5 rounded-xl bg-[#0b1322] light:bg-slate-900 text-white border border-slate-700/80 light:border-slate-800 shadow-2xl text-left select-none animate-fadeIn transition-all duration-75"
              style={{
                ...(hoveredDay.rowIndex < 2
                  ? { top: `${hoveredDay.cellBottom + 8}px` }
                  : { bottom: `${(calendarCardRef.current?.offsetHeight || 0) - hoveredDay.cellTop + 8}px` }),
                ...(hoveredDay.colIndex <= 1
                  ? { left: `${hoveredDay.cellLeft}px` }
                  : hoveredDay.colIndex >= 5
                  ? { left: `${hoveredDay.cellRight}px`, transform: 'translateX(-100%)' }
                  : { left: `${hoveredDay.cellLeft + hoveredDay.cellWidth / 2}px`, transform: 'translateX(-50%)' }),
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-1 pb-1.5 mb-1.5 border-b border-slate-700/60 light:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-200">
                  {hoveredDay.weekdayName}, {formatDate(`${calendarMonth.year}-${String(calendarMonth.month).padStart(2, '0')}-${String(hoveredDay.day).padStart(2, '0')}`)}
                </span>
                <span
                  className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                    hoveredDay.data.net_pnl > 0
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {hoveredDay.data.trade_count} {hoveredDay.data.trade_count === 1 ? 'trade' : 'trades'}
                </span>
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400">Net P&L:</span>
                  <span
                    className={`text-xs font-bold font-mono-numbers ${
                      hoveredDay.data.net_pnl > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {hoveredDay.data.net_pnl > 0 ? '+' : ''}{formatINR(hoveredDay.data.net_pnl, true)}
                  </span>
                </div>

                {(hoveredDay.data.gross_profit > 0 || hoveredDay.data.gross_loss > 0 || hoveredDay.data.total_charges > 0) && (
                  <div className="pt-1.5 border-t border-slate-800/80 space-y-0.5 text-[10px] text-slate-400">
                    {hoveredDay.data.gross_profit > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Gross Profit:</span>
                        <span className="text-emerald-400 font-mono-numbers">
                          +{formatINR(hoveredDay.data.gross_profit)}
                        </span>
                      </div>
                    )}
                    {hoveredDay.data.gross_loss > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Gross Loss:</span>
                        <span className="text-rose-400 font-mono-numbers">
                          -{formatINR(hoveredDay.data.gross_loss)}
                        </span>
                      </div>
                    )}
                    {hoveredDay.data.total_charges > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Charges:</span>
                        <span className="text-amber-400/90 font-mono-numbers">
                          {formatINR(hoveredDay.data.total_charges)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-1 text-[9px] text-blue-400/80 text-center font-medium">
                  Click to open in Trading Calendar
                </div>
              </div>

              {/* Arrow Pointer */}
              <div
                className={`absolute w-2 h-2 bg-[#0b1322] light:bg-slate-900 rotate-45 pointer-events-none ${
                  hoveredDay.rowIndex < 2
                    ? '-top-1 border-t border-l border-slate-700/80'
                    : '-bottom-1 border-b border-r border-slate-700/80'
                } ${
                  hoveredDay.colIndex <= 1 ? 'left-4' : hoveredDay.colIndex >= 5 ? 'right-4' : 'left-1/2 -translate-x-1/2'
                }`}
              />
            </div>
          )}

          {/* Calendar Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-[#1e293b] light:border-slate-200 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Profit Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Loss Day
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-600" /> No Trade
            </span>
          </div>
        </div>
      </div>

      {/* 4. Second Row of Visualizations (Monthly P&L, Index-wise, CE vs PE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly P&L Bar Chart */}
        <div className="lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white light:text-slate-900 tracking-tight">
              Monthly P&L
            </h3>
            <span className="text-[11px] font-medium text-slate-400 bg-[#162033] light:bg-slate-100 px-2 py-0.5 rounded-lg border border-[#1e293b] light:border-slate-200">
              {new Date().getFullYear()}
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthly_pnl || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactINR(val)}
                />
                <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#162033] light:bg-white p-2 rounded-xl border border-[#1e293b] light:border-slate-200 shadow-xl text-xs font-mono-numbers">
                          <p className="text-slate-400 font-sans">{d.month} {d.year}</p>
                          <p className={`font-bold mt-0.5 ${d.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            Net: {formatINR(d.pnl)}
                          </p>
                          <p className="text-slate-400 text-[11px] font-sans">Trades: {d.trades_count}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="pnl" radius={[3, 3, 3, 3]}>
                  {(charts.monthly_pnl || []).map((entry, index) => (
                    <Cell
                      key={`monthly-pnl-${index}`}
                      fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Index-wise Performance Donut */}
        <div className="lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white light:text-slate-900 tracking-tight">
              Index-wise Performance
            </h3>
            <span className="text-[11px] font-medium text-slate-400 bg-[#162033] light:bg-slate-100 px-2 py-0.5 rounded-lg border border-[#1e293b] light:border-slate-200">
              {filterLabel}
            </span>
          </div>

          <div className="relative flex items-center justify-center h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseLeave={() => setHoveredIndexSlice(null)}>
                <Pie
                  data={charts.index_performance?.items || []}
                  innerRadius={52}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="percentage"
                  nameKey="name"
                  onMouseEnter={(_, index) => setHoveredIndexSlice(index)}
                  onMouseLeave={() => setHoveredIndexSlice(null)}
                >
                  {(charts.index_performance?.items || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || indexColors[index % indexColors.length]}
                      opacity={hoveredIndexSlice === null || hoveredIndexSlice === index ? 1 : 0.4}
                      style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0b1322] light:bg-white p-2.5 rounded-xl border border-[#1e293b] light:border-slate-200 shadow-2xl text-xs font-mono-numbers">
                          <p className="text-slate-300 light:text-slate-700 font-sans font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: d.color || '#3b82f6' }} />
                            <span>{d.name}</span>
                          </p>
                          <p className="text-white light:text-slate-900 font-bold mt-1">
                            {d.percentage}% <span className={d.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>({d.net_pnl >= 0 ? '+' : ''}{formatINR(d.net_pnl)})</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label - fades out when a slice is hovered to prevent overlapping with Tooltip */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 transition-opacity duration-150 ${hoveredIndexSlice !== null ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
              <span className="text-xs font-bold font-mono-numbers text-white light:text-slate-900">
                {formatINR(charts.index_performance?.total_net_pnl || stats.total_net_profit)}
              </span>
            </div>
          </div>

          {/* Slices legend */}
          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#1e293b] light:border-slate-200 text-[11px]">
            {(charts.index_performance?.items || []).map((idx, i) => (
              <div
                key={idx.name}
                className={`flex items-center gap-1.5 truncate cursor-pointer transition-opacity ${hoveredIndexSlice === null || hoveredIndexSlice === i ? 'opacity-100' : 'opacity-40'}`}
                onMouseEnter={() => setHoveredIndexSlice(i)}
                onMouseLeave={() => setHoveredIndexSlice(null)}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: idx.color }} />
                <span className="text-slate-400 truncate">{idx.name}</span>
                <span className="font-semibold text-white light:text-slate-800 ml-auto font-mono-numbers">{idx.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* CE vs PE Performance Donut */}
        <div className="lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white light:text-slate-900 tracking-tight">
              CE vs PE Performance
            </h3>
            <span className="text-[11px] font-medium text-slate-400 bg-[#162033] light:bg-slate-100 px-2 py-0.5 rounded-lg border border-[#1e293b] light:border-slate-200">
              {filterLabel}
            </span>
          </div>

          <div className="relative flex items-center justify-center h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseLeave={() => setHoveredCePeSlice(null)}>
                <Pie
                  data={charts.ce_pe_performance?.items || []}
                  innerRadius={52}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="percentage"
                  nameKey="name"
                  onMouseEnter={(_, index) => setHoveredCePeSlice(index)}
                  onMouseLeave={() => setHoveredCePeSlice(null)}
                >
                  {(charts.ce_pe_performance?.items || []).map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={cePeColors[entry.name] || '#64748b'}
                      opacity={hoveredCePeSlice === null || hoveredCePeSlice === index ? 1 : 0.4}
                      style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0b1322] light:bg-white p-2.5 rounded-xl border border-[#1e293b] light:border-slate-200 shadow-2xl text-xs font-mono-numbers">
                          <p className="text-slate-300 light:text-slate-700 font-sans font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: cePeColors[d.name] || '#64748b' }} />
                            <span>{d.name}</span>
                          </p>
                          <p className="text-white light:text-slate-900 font-bold mt-1">
                            {d.percentage}% <span className={d.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>({d.net_pnl >= 0 ? '+' : ''}{formatINR(d.net_pnl)})</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label - fades out when a slice is hovered to prevent overlapping with Tooltip */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 transition-opacity duration-150 ${hoveredCePeSlice !== null ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
              <span className="text-xs font-bold font-mono-numbers text-white light:text-slate-900">
                {formatINR(charts.ce_pe_performance?.total_net_pnl || stats.total_net_profit)}
              </span>
            </div>
          </div>

          {/* Slices legend */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1e293b] light:border-slate-200 text-[11px]">
            {(charts.ce_pe_performance?.items || []).map((item, i) => (
              <div
                key={item.name}
                className={`flex items-center gap-1.5 truncate cursor-pointer transition-opacity ${hoveredCePeSlice === null || hoveredCePeSlice === i ? 'opacity-100' : 'opacity-40'}`}
                onMouseEnter={() => setHoveredCePeSlice(i)}
                onMouseLeave={() => setHoveredCePeSlice(null)}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cePeColors[item.name] }} />
                <span className="text-slate-400">{item.name}</span>
                <span className="font-semibold text-white light:text-slate-800 ml-auto font-mono-numbers">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Bottom Row: Strategy Performance, Risk Management, Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Strategy Performance Table */}
        <div className="lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white light:text-slate-900 tracking-tight">
                Strategy Performance
              </h3>
              <span className="text-[11px] font-medium text-slate-400 bg-[#162033] light:bg-slate-100 px-2 py-0.5 rounded-lg border border-[#1e293b] light:border-slate-200">
                {filterLabel}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-[#1e293b] light:border-slate-200">
                    <th className="pb-2 font-medium">Strategy</th>
                    <th className="pb-2 font-medium text-center">Trades</th>
                    <th className="pb-2 font-medium text-right">Win Rate</th>
                    <th className="pb-2 font-medium text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100 font-mono-numbers">
                  {strategyPerf.map((st) => (
                    <tr key={st.strategy} className="hover:bg-[#162033]/40 light:hover:bg-slate-50">
                      <td className="py-2.5 font-sans font-medium text-slate-200 light:text-slate-800">
                        {st.strategy}
                      </td>
                      <td className="py-2.5 text-center text-slate-400">
                        {st.total_trades}
                      </td>
                      <td className="py-2.5 text-right text-slate-300 light:text-slate-700">
                        {st.win_rate}%
                      </td>
                      <td className={`py-2.5 text-right font-bold ${st.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {st.net_pnl >= 0 ? '+' : ''}{formatINR(st.net_pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 text-right">
            <Link to="/strategy-analysis" className="text-xs text-blue-400 hover:underline font-semibold">
              Full Strategy Analysis &rarr;
            </Link>
          </div>
        </div>

        {/* Risk Management Status Card */}
        <div className="lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white light:text-slate-900 tracking-tight">
                Risk Management
              </h3>
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-4">
              {/* Daily Loss Limit Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Daily Loss Limit
                  </span>
                  <span className="font-bold text-white light:text-slate-900 font-mono-numbers">
                    {formatINR(risk.daily_loss_limit || 25000)}
                  </span>
                </div>
                <div className="w-full bg-[#1e293b] light:bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((risk.daily_current_loss || 0) / (risk.daily_loss_limit || 25000)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers mt-1">
                  <span>Used: {formatINR(risk.daily_current_loss || 0)}</span>
                  <span>Max: {formatINR(risk.daily_loss_limit || 25000)}</span>
                </div>
              </div>

              {/* Daily Profit Target Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-400" /> Daily Profit Target
                  </span>
                  <span className="font-bold text-white light:text-slate-900 font-mono-numbers">
                    {formatINR(risk.daily_profit_target || 20000)}
                  </span>
                </div>
                <div className="w-full bg-[#1e293b] light:bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (((risk.daily_current_profit ?? 0)) / (risk.daily_profit_target || 20000)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers mt-1">
                  <span>Current: {formatINR(risk.daily_current_profit ?? 0)}</span>
                  <span>Target: {formatINR(risk.daily_profit_target || 20000)}</span>
                </div>
              </div>

              {/* Max Drawdown Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Max Drawdown</span>
                  <span className="font-bold text-white light:text-slate-900 font-mono-numbers">
                    {formatINR(risk.max_drawdown_limit || 50000)}
                  </span>
                </div>
                <div className="w-full bg-[#1e293b] light:bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (((stats.max_drawdown ?? 0)) / (risk.max_drawdown_limit || 50000)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers mt-1">
                  <span>Drawdown: {formatINR(stats.max_drawdown ?? 0)}</span>
                  <span>Threshold: {formatINR(risk.max_drawdown_limit || 50000)}</span>
                </div>
              </div>

              {/* Consecutive Days Streaks */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-[#162033] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Consecutive Loss Days</span>
                  <span className="text-base font-bold text-rose-400 font-mono-numbers">
                    {risk.consecutive_loss_days ?? 2}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#162033] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Consecutive Win Days</span>
                  <span className="text-base font-bold text-emerald-400 font-mono-numbers">
                    {risk.consecutive_win_days ?? 4}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 text-right">
            <Link to="/risk-management" className="text-xs text-blue-400 hover:underline font-semibold">
              Detailed Risk Dashboard &rarr;
            </Link>
          </div>
        </div>

        {/* Recent Trades Table */}
        <div className="lg:col-span-4 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white light:text-slate-900 tracking-tight">
                Recent Trades
              </h3>
              <Link
                to="/trades"
                className="text-xs font-semibold text-blue-400 hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-[#1e293b] light:border-slate-200">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Index</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">CE/PE</th>
                    <th className="pb-2 font-medium text-center">Lots</th>
                    <th className="pb-2 font-medium text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100 font-mono-numbers">
                  {recentTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-[#162033]/40 light:hover:bg-slate-50">
                      <td className="py-2 text-slate-300 light:text-slate-600 font-sans text-[11px]">
                        {formatDate(t.trade_date || t.display_date)}
                      </td>
                      <td className="py-2 font-semibold text-white light:text-slate-900">
                        {t.index_name}
                      </td>
                      <td className="py-2 text-slate-400 text-[11px] font-sans">
                        {t.trading_type}
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.option_type === 'CE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : t.option_type === 'PE'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {t.option_type}
                        </span>
                      </td>
                      <td className="py-2 text-center text-slate-400">
                        {t.lots || 1}
                      </td>
                      <td className={`py-2 text-right font-bold ${t.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.net_pnl >= 0 ? '+' : ''}{formatINR(t.net_pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 text-right">
            <Link to="/add-trade" className="text-xs text-blue-400 hover:underline font-semibold">
              + Log New Trade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
