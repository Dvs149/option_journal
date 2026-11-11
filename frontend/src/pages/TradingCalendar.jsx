import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  Plus,
  ArrowRight,
  Layers,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import api from '../api/client';
import { formatINR, formatCompactINR, formatDate, formatTime } from '../utils/formatters';
import { getHolidayMapForMonth, getMarketHoliday } from '../utils/holidays';
import { useToast } from '../context/ToastContext';
import { useFilter } from '../context/FilterContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import EditTradeModal from '../components/trades/EditTradeModal';

// Extract year, month, day from active global filter date
const getTargetDateFromFilter = (filterType, from, customF) => {
  const dateStr = from || customF;
  if (dateStr) {
    const parts = String(dateStr).split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
      if (!isNaN(year) && !isNaN(month)) {
        return { year, month, day: isNaN(day) ? 1 : day };
      }
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
};

// Compact Indian numbering helper for calendar heatmap cells (e.g. +1.4K, +27.6K, +1.2L)
const formatCalendarCellPnl = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '';
  const num = Number(val);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const sign = isNegative ? '-' : '+';
  if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
};

// Custom Tooltip for Monthly Performance Bar Chart
function MonthlyBarTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const rawPnl = data.rawPnl != null ? data.rawPnl : payload[0].value * 1000;
  const isProfit = rawPnl > 0;
  const isLoss = rawPnl < 0;

  return (
    <div className="px-3.5 py-2.5 rounded-2xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl space-y-1.5 min-w-[155px]">
      <div className="flex items-center justify-between gap-3 border-b border-[#1e293b] light:border-slate-200 pb-1.5">
        <span className="text-xs font-bold text-slate-100 light:text-slate-900 tracking-tight">
          {data.fullDate || label}
        </span>
        {data.tradesCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#162033] light:bg-slate-100 text-slate-300 light:text-slate-600 font-mono-numbers border border-[#1e293b]/70 light:border-slate-300">
            {data.tradesCount} {data.tradesCount === 1 ? 'trade' : 'trades'}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <span className="text-[11px] text-slate-400 font-medium">Daily P&L:</span>
        <span
          className={`text-xs font-bold font-mono-numbers ${
            isProfit
              ? 'text-emerald-400'
              : isLoss
              ? 'text-rose-400'
              : 'text-slate-300 light:text-slate-700'
          }`}
        >
          {isProfit ? '+' : ''}
          {formatINR(rawPnl, true)}
        </span>
      </div>
    </div>
  );
}

// Custom Tooltip for Daily P&L Trend (Equity Area Curve)
function DailyTrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const total = data.rawTotal != null ? data.rawTotal : payload[0].value * 1000;
  const isProfit = total > 0;
  const isLoss = total < 0;

  return (
    <div className="px-3.5 py-2.5 rounded-2xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl space-y-1.5 min-w-[165px]">
      <div className="text-xs font-bold text-slate-100 light:text-slate-900 border-b border-[#1e293b] light:border-slate-200 pb-1.5">
        {data.fullDate || label}
      </div>
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <span className="text-[11px] text-slate-400 font-medium">Cumulative P&L:</span>
        <span
          className={`text-xs font-bold font-mono-numbers ${
            isProfit
              ? 'text-emerald-400'
              : isLoss
              ? 'text-rose-400'
              : 'text-slate-300 light:text-slate-700'
          }`}
        >
          {isProfit ? '+' : ''}
          {formatINR(total, true)}
        </span>
      </div>
    </div>
  );
}

// Custom Tooltip for Weekday Performance
function WeekdayTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const rawPnl = data.rawPnl != null ? data.rawPnl : payload[0].value * 1000;
  const isProfit = rawPnl > 0;
  const isLoss = rawPnl < 0;

  return (
    <div className="px-3.5 py-2.5 rounded-2xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl space-y-1.5 min-w-[145px]">
      <div className="text-xs font-bold text-slate-100 light:text-slate-900 border-b border-[#1e293b] light:border-slate-200 pb-1.5">
        {label}
      </div>
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <span className="text-[11px] text-slate-400 font-medium">Net P&L:</span>
        <span
          className={`text-xs font-bold font-mono-numbers ${
            isProfit
              ? 'text-emerald-400'
              : isLoss
              ? 'text-rose-400'
              : 'text-slate-300 light:text-slate-700'
          }`}
        >
          {isProfit ? '+' : ''}
          {formatINR(rawPnl, true)}
        </span>
      </div>
    </div>
  );
}

export default function TradingCalendar() {
  const navigate = useNavigate();
  const { filter, fromDate, toDate, customFrom, customTo, updateFilter, setDateRangeDisplay } = useFilter();

  const today = new Date();
  const calendarCardRef = useRef(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  const initialTarget = getTargetDateFromFilter(filter, fromDate, customFrom);
  const [currentDate, setCurrentDate] = useState({
    year: initialTarget.year,
    month: initialTarget.month,
  });
  const [calendarData, setCalendarData] = useState(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState(
    filter === 'today' || filter === 'yesterday' ? initialTarget.day : today.getDate()
  );
  const [loading, setLoading] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState(null);
  const [tradeToEdit, setTradeToEdit] = useState(null);
  const { showToast } = useToast();

  // Close delete confirmation modal on Escape
  useEscapeKey(() => setTradeToDelete(null), !!tradeToDelete);
  const setFeedbackMessage = (msg, type = 'success') => {
    if (msg) showToast(msg, type);
  };

  // Sync calendar when the global Navbar filter changes (e.g. Last Month, This Month, Today, Custom)
  useEffect(() => {
    if (filter === 'all') return;
    const target = getTargetDateFromFilter(filter, fromDate, customFrom);
    setCurrentDate((prev) => {
      if (prev.year === target.year && prev.month === target.month) return prev;
      return { year: target.year, month: target.month };
    });
    if (filter === 'today' || filter === 'yesterday') {
      setSelectedDayNumber(target.day);
    }
  }, [filter, fromDate, customFrom]);

  // Indian Stock Market (NSE & BSE) Holidays Map for current month
  const holidayMap = useMemo(() => {
    const local = getHolidayMapForMonth(currentDate.year, currentDate.month);
    if (calendarData?.holidays) {
      calendarData.holidays.forEach((h) => {
        local[h.day] = { ...h, isHoliday: true };
      });
    }
    return local;
  }, [currentDate.year, currentDate.month, calendarData]);

  // When calendar data loads for a month, select the first trading day if current selection has no trades
  useEffect(() => {
    if (calendarData?.days && calendarData.days.length > 0) {
      const currentHasTrades = calendarData.days.some((d) => d.day === selectedDayNumber);
      if (!currentHasTrades) {
        const isThisMonth = currentDate.year === today.getFullYear() && currentDate.month === today.getMonth() + 1;
        if (isThisMonth) {
          setSelectedDayNumber(today.getDate());
        } else {
          setSelectedDayNumber(calendarData.days[0].day);
        }
      }
    }
  }, [calendarData]);

  // Top Statistics state computed dynamically from real calendarData
  const stats = useMemo(() => {
    if (!calendarData || !calendarData.days) {
      return {
        monthly_pnl: 0,
        monthly_pnl_pct: '0.0%',
        total_trades: 0,
        total_trades_pct: '0.0%',
        profitable_days: 0,
        profitable_days_pct: '0.0%',
        losing_days: 0,
        losing_days_pct: '0.0%',
        no_trade_days: 0,
        best_day_pnl: 0,
        best_day_date: '-',
        worst_day_pnl: 0,
        worst_day_date: '-',
        gross_profit: 0,
        gross_loss: 0,
        total_charges: 0,
        avg_daily_pnl: 0,
      };
    }
    const days = calendarData.days || [];
    const monthly_pnl = calendarData.total_net_pnl || 0;
    const allTrades = days.flatMap((d) => d.trades || []);
    const total_trades = calendarData.total_trades ?? (allTrades.length || days.reduce((sum, d) => sum + (d.trade_count || 0), 0));
    const winTrades = calendarData.winning_trades ?? allTrades.filter((t) => (t.net_pnl || 0) > 0).length;
    const tradeWinRate = calendarData.trade_win_rate ?? (total_trades > 0 ? ((winTrades / total_trades) * 100).toFixed(1) : '0.0');

    // Calculate ROI
    const initialCapital = calendarData.initial_capital || 0;
    let monthly_pnl_pct = '+0.0%';
    if (calendarData.roi !== undefined && calendarData.roi !== null) {
      monthly_pnl_pct = `${calendarData.roi >= 0 ? '+' : ''}${calendarData.roi}% ROI`;
    } else if (initialCapital > 0) {
      const roi = ((monthly_pnl / initialCapital) * 100).toFixed(2);
      monthly_pnl_pct = `${roi >= 0 ? '+' : ''}${roi}% ROI`;
    } else {
      monthly_pnl_pct = monthly_pnl >= 0 ? 'Net Profit' : 'Net Loss';
    }

    const total_trades_pct = `${tradeWinRate}% Win Rate`;

    const profitable_days = calendarData.winning_days || 0;
    const losing_days = calendarData.losing_days || 0;
    const total_trading_days = calendarData.total_trading_days || 0;
    const winRate = total_trading_days > 0 ? ((profitable_days / total_trading_days) * 100).toFixed(1) : '0.0';
    const lossRate = total_trading_days > 0 ? ((losing_days / total_trading_days) * 100).toFixed(1) : '0.0';
    const gross_profit = days.reduce((sum, d) => sum + (d.gross_profit || 0), 0);
    const gross_loss = days.reduce((sum, d) => sum + (d.gross_loss || 0), 0);
    const total_charges = days.reduce((sum, d) => sum + (d.total_charges || 0), 0);
    const avg_daily_pnl = total_trading_days > 0 ? (monthly_pnl / total_trading_days) : 0;

    const daysInMonth = new Date(currentDate.year, currentDate.month, 0).getDate();
    const no_trade_days = Math.max(0, daysInMonth - total_trading_days);
    const holidays_count = Object.keys(holidayMap).length;

    let bestDay = null;
    let worstDay = null;
    days.forEach((d) => {
      if (bestDay === null || d.net_pnl > bestDay.net_pnl) bestDay = d;
      if (worstDay === null || d.net_pnl < worstDay.net_pnl) worstDay = d;
    });

    return {
      monthly_pnl,
      monthly_pnl_pct,
      total_trades,
      total_trades_pct,
      profitable_days,
      profitable_days_pct: `${winRate}%`,
      losing_days,
      losing_days_pct: `${lossRate}%`,
      no_trade_days,
      holidays_count,
      best_day_pnl: bestDay && bestDay.net_pnl > 0 ? bestDay.net_pnl : 0,
      best_day_date: bestDay && bestDay.net_pnl > 0 ? formatDate(bestDay.date) : '-',
      worst_day_pnl: worstDay && worstDay.net_pnl < 0 ? worstDay.net_pnl : 0,
      worst_day_date: worstDay && worstDay.net_pnl < 0 ? formatDate(worstDay.date) : '-',
      gross_profit,
      gross_loss,
      total_charges,
      avg_daily_pnl,
    };
  }, [calendarData, currentDate, holidayMap]);

  useEffect(() => {
    fetchCalendar(currentDate.year, currentDate.month);
  }, [currentDate]);

  const fetchCalendar = async (year, month) => {
    try {
      setLoading(true);
      const res = await api.get('/calendar', {
        params: { year, month },
      });
      setCalendarData(res.data);
    } catch (err) {
      console.warn('Backend calendar fallback applied', err);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate((prev) => {
      const m = prev.month === 12 ? 1 : prev.month + 1;
      const y = prev.month === 12 ? prev.year + 1 : prev.year;
      return { year: y, month: m };
    });
  };

  const prevMonth = () => {
    setCurrentDate((prev) => {
      const m = prev.month === 1 ? 12 : prev.month - 1;
      const y = prev.month === 1 ? prev.year - 1 : prev.year;
      return { year: y, month: m };
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthName = monthNames[currentDate.month - 1];

  // Calendar Day Map
  const dayMap = useMemo(() => {
    const map = {};
    if (calendarData?.days) {
      calendarData.days.forEach((d) => {
        map[d.day] = {
          ...d,
          trades: d.trades || [],
        };
      });
    }
    return map;
  }, [calendarData]);

  // Selected Day Data
  const selectedDayData = useMemo(() => {
    return dayMap[selectedDayNumber] || {
      day: selectedDayNumber,
      net_pnl: 0,
      trade_count: 0,
      status: 'none',
      trades: [],
    };
  }, [dayMap, selectedDayNumber]);

  // Calendar Cells Calculation
  const calendarCells = useMemo(() => {
    const { year, month } = currentDate;
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month, 0).getDate();
    const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();

    const cells = [];
    // Previous month padding days
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
        data: dayMap[d],
        holiday: holidayMap[d] || null,
      });
    }
    // Next month padding days to complete 35 or 42 grid cells
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentDate, dayMap, holidayMap]);

  // Monthly Performance Bar Chart Data (days in current month)
  const monthlyPerformanceData = useMemo(() => {
    const daysInMonth = new Date(currentDate.year, currentDate.month, 0).getDate();
    const shortMonth = currentMonthName.slice(0, 3);
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dayInfo = dayMap[d];
      const netPnl = dayInfo ? dayInfo.net_pnl : 0;
      return {
        dayNumber: d,
        day: `${d} ${shortMonth}`,
        fullDate: `${String(d).padStart(2, '0')} ${currentMonthName} ${currentDate.year}`,
        pnl: netPnl / 1000, // In thousands (K)
        rawPnl: netPnl,
        tradesCount: dayInfo ? (dayInfo.trades_count || dayInfo.trades?.length || 0) : 0,
      };
    });
  }, [currentDate, currentMonthName, dayMap]);

  // Max absolute value for dynamic Y-axis scaling with 15% headroom
  const maxMonthlyAbs = useMemo(() => {
    const vals = monthlyPerformanceData.map((d) => Math.abs(d.pnl));
    const maxVal = Math.max(10, ...vals);
    return Math.ceil(maxVal * 1.15);
  }, [monthlyPerformanceData]);

  // Daily P&L Trend (Cumulative curve)
  const dailyPnlTrendData = useMemo(() => {
    const daysInMonth = new Date(currentDate.year, currentDate.month, 0).getDate();
    const shortMonth = currentMonthName.slice(0, 3);
    let runningTotal = 0;
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dayInfo = dayMap[d];
      if (dayInfo) {
        runningTotal += dayInfo.net_pnl;
      }
      return {
        dayNumber: d,
        day: `${d} ${shortMonth}`,
        fullDate: `${String(d).padStart(2, '0')} ${currentMonthName} ${currentDate.year}`,
        total: Math.round(runningTotal / 1000), // in Thousands
        rawTotal: runningTotal,
      };
    });
  }, [currentDate, currentMonthName, dayMap]);

  // Weekday Performance Chart Data (aggregated dynamically from current month's trades)
  const weekdayData = useMemo(() => {
    const pnlByDay = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // 1=Mon ... 5=Fri
    const countByDay = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    Object.entries(dayMap).forEach(([dayNum, info]) => {
      const date = new Date(currentDate.year, currentDate.month - 1, parseInt(dayNum, 10));
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        pnlByDay[dayOfWeek] += info.net_pnl || 0;
        countByDay[dayOfWeek] += info.trades_count || (info.trades?.length || 0);
      }
    });

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return dayLabels.map((lbl, idx) => {
      const dow = idx + 1;
      const pnl = pnlByDay[dow] || 0;
      return {
        day: lbl,
        pnl: Math.round((pnl / 1000) * 10) / 10,
        rawPnl: pnl,
        positive: pnl >= 0,
      };
    });
  }, [currentDate, dayMap]);

  // Delete trade from day view with confirmation
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTrade = async () => {
    if (!tradeToDelete) return;
    try {
      setIsDeleting(true);
      await api.delete(`/trades/${tradeToDelete.id}`);
      setFeedbackMessage('Trade deleted successfully.');
      setTradeToDelete(null);
      fetchCalendar(currentDate.year, currentDate.month);
    } catch (e) {
      console.error('Failed to delete trade', e);
      setFeedbackMessage(e.response?.data?.message || 'Failed to delete trade', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
            Trading Calendar
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            View your daily P&L, trade details and performance heatmap
          </p>
        </div>

        {/* Month Selector & Today button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 text-xs font-semibold text-white light:text-slate-900">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentMonthName} {currentDate.year}</span>
            {stats.monthly_pnl !== 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono-numbers ${
                  stats.monthly_pnl > 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                }`}
              >
                {stats.monthly_pnl > 0 ? `+${formatINR(stats.monthly_pnl)}` : formatINR(stats.monthly_pnl)}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </div>

          <button
            onClick={() => {
              const now = new Date();
              setCurrentDate({ year: now.getFullYear(), month: now.getMonth() + 1 });
              setSelectedDayNumber(now.getDate());
              if (updateFilter) updateFilter('this_month');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 text-xs font-medium text-slate-300 light:text-slate-700 hover:text-white"
          >
            Today
          </button>
        </div>
      </div>

      {/* 1. Top Statistics Row (7 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Monthly P&L */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Monthly P&L</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.monthly_pnl)}
          </span>
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
            stats.monthly_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {stats.monthly_pnl >= 0 ? (
              <TrendingUp className="w-3 h-3 inline" />
            ) : (
              <TrendingDown className="w-3 h-3 inline" />
            )} {stats.monthly_pnl_pct}
          </span>
        </div>

        {/* Total Trades */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Total Trades</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {stats.total_trades}
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3 inline" /> {stats.total_trades_pct}
          </span>
        </div>

        {/* Profitable Days */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Profitable Days</span>
          <span className="text-base font-bold text-emerald-400 font-mono-numbers block tracking-tight">
            {stats.profitable_days}
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 block">
            {stats.profitable_days_pct}
          </span>
        </div>

        {/* Losing Days */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Losing Days</span>
          <span className="text-base font-bold text-rose-400 font-mono-numbers block tracking-tight">
            {stats.losing_days}
          </span>
          <span className="text-[10px] font-semibold text-rose-400 block">
            {stats.losing_days_pct}
          </span>
        </div>

        {/* No Trade Days */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">No Trade Days</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {stats.no_trade_days}
          </span>
          <span className="text-[10px] text-amber-400/90 light:text-amber-600 block truncate">
            {stats.holidays_count > 0 ? `${stats.holidays_count} market ${stats.holidays_count === 1 ? 'holiday' : 'holidays'}` : '-'}
          </span>
        </div>

        {/* Best Day */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Best Day</span>
          <span className="text-base font-bold text-emerald-400 font-mono-numbers block tracking-tight">
            +{formatINR(stats.best_day_pnl)}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {stats.best_day_date}
          </span>
        </div>

        {/* Worst Day */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Worst Day</span>
          <span className="text-base font-bold text-rose-400 font-mono-numbers block tracking-tight">
            {formatINR(stats.worst_day_pnl)}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {stats.worst_day_date}
          </span>
        </div>
      </div>

      {/* 2. Main Grid: Left Column (Calendar Heatmap + Trades) & Right Column (Analytics) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Calendar Heatmap & Day Trades */}
        <div className="lg:col-span-7 space-y-6">
          {/* Calendar Heatmap Card */}
          <div
            ref={calendarCardRef}
            onMouseLeave={() => setHoveredDay(null)}
            className="p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3 sm:space-y-4 relative"
          >
            {/* Calendar Controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-400 hover:text-white transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-36 sm:w-44 flex items-center justify-center text-center">
                  <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900 tracking-tight whitespace-nowrap text-center select-none">
                    {currentMonthName} {currentDate.year}
                  </h2>
                </div>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-400 hover:text-white transition-colors"
                  title="Next Month"
                  >
                  <ChevronRight className="w-4 h-4" />
                </button>
                  {stats.monthly_pnl !== 0 && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono-numbers transition-colors ${
                        stats.monthly_pnl > 0
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                      title={`Total Monthly P&L: ${stats.monthly_pnl > 0 ? '+' : ''}${formatINR(stats.monthly_pnl)}`}
                    >
                      {stats.monthly_pnl > 0 ? `+${formatINR(stats.monthly_pnl)}` : formatINR(stats.monthly_pnl)}
                    </span>
                  )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={`${currentDate.year}-${currentDate.month}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-').map(Number);
                    setCurrentDate({ year: y, month: m });
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-xs text-white light:text-slate-900 focus:outline-none"
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const d = new Date(today.getFullYear(), today.getMonth() - 12 + i, 1);
                    const y = d.getFullYear();
                    const m = d.getMonth() + 1;
                    return (
                      <option key={`${y}-${m}`} value={`${y}-${m}`}>
                        {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </option>
                    );
                  })}
                </select>

                
              </div>
            </div>

            {/* Day of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 py-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Calendar Days Heatmap Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.isCurrentMonth && cell.day === selectedDayNumber;
                const data = cell.data;

                if (!cell.isCurrentMonth) {
                  return (
                    <div
                      key={idx}
                      className="min-h-[58px] sm:min-h-[72px] p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-[#0e1626]/50 light:bg-slate-50 border border-[#1e293b]/30 text-slate-600 light:text-slate-300 text-xs font-medium flex flex-col justify-between select-none"
                    >
                      <span className="text-[10px] sm:text-xs leading-none">{cell.day}</span>
                    </div>
                  );
                }

                const isProfit = data && data.net_pnl > 0;
                const isLoss = data && data.net_pnl < 0;
                const hasTrades = Boolean(data && data.trade_count > 0);
                const holiday = cell.holiday;
                const isHoliday = Boolean(holiday);

                let bgClass = 'bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-400 hover:border-slate-500';
                if (isProfit) {
                  bgClass = 'bg-[#065f46] hover:bg-[#059669] text-white border border-[#047857] shadow-sm';
                } else if (isLoss) {
                  bgClass = 'bg-[#991b1b] hover:bg-[#b91c1c] text-white border border-[#7f1d1d] shadow-sm';
                } else if (isHoliday) {
                  bgClass = 'bg-[#181813] light:bg-amber-50 hover:bg-[#222017] light:hover:bg-amber-100/90 text-amber-200 light:text-amber-900 border border-amber-500/40 light:border-amber-300 shadow-sm';
                }

                const colIndex = idx % 7;
                const rowIndex = Math.floor(idx / 7);
                const cellDate = new Date(currentDate.year, currentDate.month - 1, cell.day);
                const monthName = cellDate.toLocaleString('default', { month: 'short' });
                const weekdayName = data?.weekday ? data.weekday.slice(0, 3) : cellDate.toLocaleDateString('default', { weekday: 'short' });

                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    aria-label={`${cell.day} ${monthName}, ${hasTrades ? (isProfit ? 'Profit ' : 'Loss ') + formatINR(data.net_pnl, true) : isHoliday ? `Holiday: ${holiday.name}` : 'No trades'}`}
                    onClick={() => setSelectedDayNumber(cell.day)}
                    onMouseEnter={(e) => {
                      if (!hasTrades && !isHoliday) return;
                      const parent = calendarCardRef.current;
                      if (!parent) return;
                      const targetRect = e.currentTarget.getBoundingClientRect();
                      const parentRect = parent.getBoundingClientRect();
                      setHoveredDay({
                        day: cell.day,
                        data,
                        holiday,
                        isHoliday,
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
                        setSelectedDayNumber(cell.day);
                      }
                    }}
                    className={`min-h-[58px] sm:min-h-[72px] p-1 sm:p-1.5 rounded-lg sm:rounded-xl cursor-pointer transition-all flex flex-col justify-between ${bgClass} ${
                      isSelected ? 'ring-2 ring-blue-400 shadow-lg shadow-blue-500/30 transform scale-[1.02]' : ''
                    }`}
                  >
                    {/* Top Row: Day Number + Holiday Badge */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] sm:text-[11px] font-bold select-none leading-none ${isHoliday && !hasTrades ? 'text-amber-400 light:text-amber-700' : 'opacity-90'}`}>
                        {cell.day}
                      </span>
                      {isHoliday && (
                        <span
                          className={`text-[8px] sm:text-[8.5px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 leading-none shrink-0 ${
                            hasTrades
                              ? 'bg-black/40 text-amber-300 border border-amber-400/30'
                              : 'bg-amber-500/20 text-amber-300 light:text-amber-800 border border-amber-500/30'
                          }`}
                          title={`Holiday: ${holiday.name}`}
                        >
                          <span className="text-[9px] leading-none">🇮🇳</span>
                          <span className="hidden sm:inline font-semibold">Holiday</span>
                        </span>
                      )}
                    </div>

                    {/* Middle: Net P&L or Holiday Name */}
                    {hasTrades ? (
                      <div className="text-center my-auto py-0.5 select-none overflow-hidden">
                        <span className="text-[10.5px] sm:text-xs md:text-sm font-bold font-mono-numbers block tracking-tight leading-tight truncate px-0.5">
                          {formatCalendarCellPnl(data.net_pnl)}
                        </span>
                        <span className="text-[7.5px] sm:text-[9px] opacity-85 block truncate max-w-full px-0.5 leading-tight whitespace-nowrap mt-0.5">
                          <span className="hidden sm:inline">{data.trade_count} {data.trade_count === 1 ? 'trade' : 'trades'}</span>
                          <span className="sm:hidden">{data.trade_count} tr</span>
                        </span>
                      </div>
                    ) : isHoliday ? (
                      <div className="text-center my-auto py-0.5 select-none overflow-hidden">
                        <span className="text-[9px] sm:text-[10.5px] font-bold text-amber-300 light:text-amber-800 block tracking-tight leading-tight truncate px-0.5" title={holiday.name}>
                          {holiday.name}
                        </span>
                        <span className="text-[7px] sm:text-[8px] text-amber-400/80 light:text-amber-700 block truncate max-w-full px-0.5 leading-tight whitespace-nowrap mt-0.5 font-medium">
                          Market Closed
                        </span>
                      </div>
                    ) : (
                      <div className="h-4 sm:h-6" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Single Floating Tooltip at Calendar Level - WCAG 1.4.13 Compliant, Never Clipped by Grid Cells */}
            {hoveredDay && (hoveredDay.data || hoveredDay.isHoliday) && (
              <div
                role="tooltip"
                className="absolute z-50 pointer-events-none w-56 p-2.5 rounded-xl bg-[#0b1322] light:bg-slate-900 text-white border border-slate-700/80 light:border-slate-800 shadow-2xl text-left select-none animate-fadeIn transition-all duration-75"
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
                    {hoveredDay.weekdayName}, {formatDate(`${currentDate.year}-${String(currentDate.month).padStart(2, '0')}-${String(hoveredDay.day).padStart(2, '0')}`)}
                  </span>
                  {hoveredDay.data && hoveredDay.data.trade_count > 0 ? (
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                        hoveredDay.data.net_pnl > 0
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {hoveredDay.data.trade_count} {hoveredDay.data.trade_count === 1 ? 'trade' : 'trades'}
                    </span>
                  ) : hoveredDay.isHoliday ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <span>🇮🇳</span> Holiday
                    </span>
                  ) : null}
                </div>

                {/* Holiday Banner inside tooltip */}
                {hoveredDay.isHoliday && (
                  <div className="mb-2 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10.5px]">
                    <div className="font-bold text-amber-300 flex items-center gap-1">
                      <span>🇮🇳</span> {hoveredDay.holiday.name}
                    </div>
                    <div className="text-[9px] text-amber-400/80 mt-0.5">NSE & BSE Market Closed</div>
                  </div>
                )}

                {/* Body */}
                {hoveredDay.data && hoveredDay.data.trade_count > 0 ? (
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
                      {selectedDayNumber === hoveredDay.day ? 'Currently Selected' : 'Click to inspect day trades'}
                    </div>
                  </div>
                ) : (
                  <div className="pt-0.5 text-[9.5px] text-slate-400 text-center font-medium">
                    {selectedDayNumber === hoveredDay.day ? 'Currently Selected' : 'Click to select this date'}
                  </div>
                )}

                {/* Arrow Pointer */}
                <div
                  className={`absolute w-2 h-2 bg-[#0b1322] light:bg-slate-900 rotate-45 pointer-events-none ${
                    hoveredDay.rowIndex < 2
                      ? '-top-1 border-t border-l border-slate-700/80'
                      : '-bottom-1 border-b border-r border-slate-700/80'
                  } ${
                    hoveredDay.colIndex <= 1 ? 'left-6' : hoveredDay.colIndex >= 5 ? 'right-6' : 'left-1/2 -translate-x-1/2'
                  }`}
                />
              </div>
            )}

            {/* Heatmap Legend */}
            <div className="pt-2 flex items-center gap-5 text-xs text-slate-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300 light:text-slate-700">Profit Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span className="text-slate-300 light:text-slate-700">Loss Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500/50" />
                <span className="text-slate-300 light:text-slate-700">Market Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1e293b]" />
                <span className="text-slate-300 light:text-slate-700">No Trade</span>
              </div>
            </div>
          </div>

          {/* Trades on Selected Date Card */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                  Trades on {formatDate(`${currentDate.year}-${String(currentDate.month).padStart(2, '0')}-${String(selectedDayNumber).padStart(2, '0')}`)}
                </h2>
                {holidayMap[selectedDayNumber] && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 light:text-amber-800 border border-amber-500/30 flex items-center gap-1">
                    <span>🇮🇳</span> {holidayMap[selectedDayNumber].name}
                  </span>
                )}
              </div>
              {selectedDayData.net_pnl !== 0 && (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    selectedDayData.net_pnl >= 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {selectedDayData.net_pnl >= 0 ? '+' : ''}
                  {formatINR(selectedDayData.net_pnl)} ({selectedDayData.trades?.length || selectedDayData.trade_count} trades)
                </span>
              )}
            </div>

            {/* Trades Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#0e1626]/60 light:bg-slate-50 border-b border-[#1e293b] text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Index</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2">CE/PE</th>
                    <th className="py-2.5 px-3">Strike</th>
                    <th className="py-2.5 px-2 text-right">Lots</th>
                    <th className="py-2.5 px-3 text-right">Entry</th>
                    <th className="py-2.5 px-3 text-right">Exit</th>
                    <th className="py-2.5 px-3 text-right">P&L</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                  {selectedDayData.trades && selectedDayData.trades.length > 0 ? (
                    selectedDayData.trades.map((t, idx) => {
                      const net = parseFloat(t.net_pnl);
                      return (
                        <tr key={t.id || idx} className="hover:bg-[#162033]/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono-numbers">
                            {formatTime(t.time || '09:30')}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white light:text-slate-900">
                            {t.index_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            <div>{t.trading_type || 'Intraday'}</div>
                            {t.trade_date && t.effective_date && t.trade_date !== t.effective_date && (
                              <div className="text-[10px] text-amber-400/80 light:text-amber-600 font-mono-numbers">
                                Entry: {formatDate(t.trade_date)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                t.status === 'CLOSED'
                                  ? 'bg-slate-700/40 text-slate-300 border border-slate-600/40'
                                  : t.status === 'PARTIALLY_CLOSED'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {t.status === 'PARTIALLY_CLOSED' ? 'PARTIAL' : (t.status || 'CLOSED')}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
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
                          <td className="py-2.5 px-3 font-mono-numbers text-slate-300 light:text-slate-700">
                            {t.strike_price ? Math.round(t.strike_price) : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-300 light:text-slate-700">
                            {t.lots || 1}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-numbers text-slate-300 light:text-slate-700">
                            {t.entry_premium ? parseFloat(t.entry_premium).toFixed(2) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-numbers text-slate-300 light:text-slate-700">
                            {t.exit_premium ? parseFloat(t.exit_premium).toFixed(2) : '-'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono-numbers font-bold ${
                              net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {net >= 0 ? '+' : ''}
                            {formatINR(net)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setTradeToEdit(t)}
                                className="p-1 rounded hover:bg-[#1e293b] text-slate-400 hover:text-blue-400 transition-colors"
                                title="Edit Trade"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setTradeToDelete(t)}
                                className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete Trade"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="11" className="py-8 text-center text-slate-400">
                        {holidayMap[selectedDayNumber] ? (
                          <div className="flex flex-col items-center justify-center space-y-1.5 py-4">
                            <span className="text-2xl">🇮🇳</span>
                            <span className="text-sm font-bold text-amber-300 light:text-amber-800">
                              {holidayMap[selectedDayNumber].name}
                            </span>
                            <span className="text-xs text-slate-400 max-w-sm mx-auto">
                              Indian Stock Market (NSE & BSE) closed for trading holiday on {formatDate(`${currentDate.year}-${String(currentDate.month).padStart(2, '0')}-${String(selectedDayNumber).padStart(2, '0')}`)}.
                            </span>
                          </div>
                        ) : (
                          'No trade activity recorded on this day.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Monthly Performance, Daily P&L Trend, Weekday, Summary */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Monthly Performance Bar Chart */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white light:text-slate-900">
                Monthly Performance
              </h2>
              <span className="text-[11px] text-slate-400">
                {currentMonthName} {currentDate.year}
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPerformanceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} interval={5} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}K`} domain={[-maxMonthlyAbs, maxMonthlyAbs]} />
                  <ReferenceLine y={0} stroke="#334155" />
                  <Tooltip
                    content={<MonthlyBarTooltip />}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 4 }}
                  />
                  <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                    {monthlyPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Daily P&L Trend (Equity Area Curve) */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white light:text-slate-900">
                Daily P&L Trend
              </h2>
              <span className="text-[11px] text-slate-400">
                {currentMonthName} {currentDate.year}
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyPnlTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pnlTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} interval={5} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}K`} />
                  <Tooltip
                    content={<DailyTrendTooltip />}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#pnlTrendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: Weekday Performance */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Weekday Performance
            </h2>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}K`} />
                  <ReferenceLine y={0} stroke="#334155" />
                  <Tooltip
                    content={<WeekdayTooltip />}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 4 }}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]} barSize={26}>
                    {weekdayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.positive ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 4: Monthly Summary 2-Column Key Values */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] light:border-slate-200 pb-2">
              Monthly Summary
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Left Column */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-slate-400">
                  <span>Total Trades</span>
                  <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                    {stats.total_trades}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Profitable Days</span>
                  <span className="font-semibold text-emerald-400 font-mono-numbers">
                    {stats.profitable_days}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Losing Days</span>
                  <span className="font-semibold text-rose-400 font-mono-numbers">
                    {stats.losing_days}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>No Trade Days</span>
                  <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                    {stats.no_trade_days}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Win Rate</span>
                  <span className="font-bold text-white light:text-slate-900 font-mono-numbers">
                    {stats.profitable_days_pct}
                  </span>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Profit</span>
                  <span className="font-semibold text-emerald-400 font-mono-numbers">
                    {formatINR(stats.gross_profit)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Gross Loss</span>
                  <span className="font-semibold text-rose-400 font-mono-numbers">
                    {stats.gross_loss > 0 ? `-${formatINR(stats.gross_loss)}` : formatINR(0)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Charges</span>
                  <span className="font-semibold text-slate-300 light:text-slate-700 font-mono-numbers">
                    {formatINR(stats.total_charges)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Net P&L</span>
                  <span className={`font-bold font-mono-numbers ${stats.monthly_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatINR(stats.monthly_pnl)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Average Daily P&L</span>
                  <span className={`font-semibold font-mono-numbers ${stats.avg_daily_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatINR(stats.avg_daily_pnl)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Trade Modal */}
      {tradeToEdit && (
        <EditTradeModal
          trade={tradeToEdit}
          isOpen={!!tradeToEdit}
          onClose={() => setTradeToEdit(null)}
          onSaved={() => {
            fetchCalendar(currentDate.year, currentDate.month);
            setTradeToEdit(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {tradeToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isDeleting && setTradeToDelete(null)}
        >
          <div
            className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-2xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white light:text-slate-900">
                Delete Trade Record?
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this trade record for{' '}
              <strong className="text-white light:text-slate-900">
                {tradeToDelete.index_name} {tradeToDelete.option_type} ({formatDate(tradeToDelete.trade_date)})
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTradeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTrade}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
