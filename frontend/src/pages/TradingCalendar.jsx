import React, { useState, useEffect, useMemo } from 'react';
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
import { formatINR, formatCompactINR, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export default function TradingCalendar() {
  const navigate = useNavigate();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });
  const [calendarData, setCalendarData] = useState(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState(today.getDate());
  const [loading, setLoading] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState(null);
  const { showToast } = useToast();
  const setFeedbackMessage = (msg, type = 'success') => {
    if (msg) showToast(msg, type);
  };

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
    const total_trades = days.reduce((sum, d) => sum + (d.trade_count || 0), 0);
    const profitable_days = calendarData.winning_days || 0;
    const losing_days = calendarData.losing_days || 0;
    const total_trading_days = calendarData.total_trading_days || 0;
    const winRate = total_trading_days > 0 ? ((profitable_days / total_trading_days) * 100).toFixed(1) : '0.0';
    const lossRate = total_trading_days > 0 ? ((losing_days / total_trading_days) * 100).toFixed(1) : '0.0';
    const gross_profit = days.reduce((sum, d) => sum + (d.gross_profit || 0), 0);
    const gross_loss = days.reduce((sum, d) => sum + (d.gross_loss || 0), 0);
    const total_charges = days.reduce((sum, d) => sum + (d.total_charges || 0), 0);
    const avg_daily_pnl = total_trading_days > 0 ? (monthly_pnl / total_trading_days) : 0;

    let bestDay = null;
    let worstDay = null;
    days.forEach((d) => {
      if (bestDay === null || d.net_pnl > bestDay.net_pnl) bestDay = d;
      if (worstDay === null || d.net_pnl < worstDay.net_pnl) worstDay = d;
    });

    return {
      monthly_pnl,
      monthly_pnl_pct: monthly_pnl >= 0 ? '+0.0%' : '-0.0%',
      total_trades,
      total_trades_pct: '0.0%',
      profitable_days,
      profitable_days_pct: `${winRate}%`,
      losing_days,
      losing_days_pct: `${lossRate}%`,
      no_trade_days: Math.max(0, 30 - total_trading_days),
      best_day_pnl: bestDay && bestDay.net_pnl > 0 ? bestDay.net_pnl : 0,
      best_day_date: bestDay && bestDay.net_pnl > 0 ? formatDate(bestDay.date) : '-',
      worst_day_pnl: worstDay && worstDay.net_pnl < 0 ? worstDay.net_pnl : 0,
      worst_day_date: worstDay && worstDay.net_pnl < 0 ? formatDate(worstDay.date) : '-',
      gross_profit,
      gross_loss,
      total_charges,
      avg_daily_pnl,
    };
  }, [calendarData]);

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
  }, [currentDate, dayMap]);

  // Monthly Performance Bar Chart Data (31 days)
  const monthlyPerformanceData = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => {
      const d = i + 1;
      const dayInfo = dayMap[d];
      return {
        day: `${d} Aug`,
        pnl: dayInfo ? dayInfo.net_pnl / 1000 : 0, // In thousands (K)
      };
    });
  }, [dayMap]);

  // Daily P&L Trend (Cumulative curve)
  const dailyPnlTrendData = useMemo(() => {
    let runningTotal = 0;
    return Array.from({ length: 31 }, (_, i) => {
      const d = i + 1;
      const dayInfo = dayMap[d];
      if (dayInfo) {
        runningTotal += dayInfo.net_pnl;
      }
      return {
        day: `${d} Aug`,
        total: Math.round(runningTotal / 1000), // in Thousands
      };
    });
  }, [dayMap]);

  // Weekday Performance Chart Data
  const weekdayData = [
    { day: 'Mon', pnl: 8.4, positive: true },
    { day: 'Tue', pnl: 12.6, positive: true },
    { day: 'Wed', pnl: 6.2, positive: true },
    { day: 'Thu', pnl: -3.1, positive: false },
    { day: 'Fri', pnl: 18.5, positive: true },
  ];

  // Delete trade from day view
  const handleDeleteTrade = async (id) => {
    try {
      await api.delete(`/trades/${id}`);
      setFeedbackMessage('Trade deleted successfully.');
      fetchCalendar(currentDate.year, currentDate.month);
      setTradeToDelete(null);
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (e) {
      console.error('Failed to delete trade', e);
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 text-xs font-semibold text-white light:text-slate-900">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentMonthName} {currentDate.year}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </div>

          <button
            onClick={() => {
              const now = new Date();
              setCurrentDate({ year: now.getFullYear(), month: now.getMonth() + 1 });
              setSelectedDayNumber(now.getDate());
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
          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3 inline" /> {stats.monthly_pnl_pct}
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
          <span className="text-[10px] text-slate-500 block">-</span>
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
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900 tracking-tight">
                  {currentMonthName} {currentDate.year}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
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

                <div className="hidden sm:block px-2.5 py-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-xs text-slate-300 light:text-slate-700">
                  This Month
                </div>
              </div>
            </div>

            {/* Day of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 py-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Calendar Days Heatmap Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.isCurrentMonth && cell.day === selectedDayNumber;
                const data = cell.data;

                if (!cell.isCurrentMonth) {
                  return (
                    <div
                      key={idx}
                      className="min-h-[64px] sm:min-h-[72px] p-1.5 rounded-xl bg-[#0e1626]/50 light:bg-slate-50 border border-[#1e293b]/30 text-slate-600 light:text-slate-300 text-xs font-medium flex flex-col justify-between select-none"
                    >
                      <span>{cell.day}</span>
                    </div>
                  );
                }

                const isProfit = data && data.net_pnl > 0;
                const isLoss = data && data.net_pnl < 0;
                const hasTrades = Boolean(data && data.trade_count > 0);

                let bgClass = 'bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-400 hover:border-slate-500';
                if (isProfit) {
                  bgClass = 'bg-[#065f46] hover:bg-[#059669] text-white border border-[#047857] shadow-sm';
                } else if (isLoss) {
                  bgClass = 'bg-[#991b1b] hover:bg-[#b91c1c] text-white border border-[#7f1d1d] shadow-sm';
                }

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayNumber(cell.day)}
                    className={`min-h-[64px] sm:min-h-[72px] p-1.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${bgClass} ${
                      isSelected ? 'ring-2 ring-blue-400 shadow-lg shadow-blue-500/30 transform scale-[1.02]' : ''
                    }`}
                  >
                    {/* Top Day Number */}
                    <span className="text-[11px] font-bold opacity-90">{cell.day}</span>

                    {/* Middle: Net P&L */}
                    {hasTrades ? (
                      <div className="text-center my-0.5">
                        <span className="text-xs sm:text-sm font-extrabold font-mono-numbers block tracking-tight">
                          {data.net_pnl > 0 ? `+${(data.net_pnl / 1000).toFixed(1)}K` : `${(data.net_pnl / 1000).toFixed(1)}K`}
                        </span>
                        <span className="text-[9px] opacity-80 block">
                          {data.trade_count} {data.trade_count === 1 ? 'trade' : 'trades'}
                        </span>
                      </div>
                    ) : (
                      <div className="h-6" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Heatmap Legend */}
            <div className="pt-2 flex items-center gap-5 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300 light:text-slate-700">Profit Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span className="text-slate-300 light:text-slate-700">Loss Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1e293b]" />
                <span className="text-slate-300 light:text-slate-700">No Trade</span>
              </div>
            </div>
          </div>

          {/* Trades on Selected Date Card */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                Trades on {selectedDayNumber} {currentMonthName} {currentDate.year}
              </h2>
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
                            {t.time || '09:30'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white light:text-slate-900">
                            {t.index_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {t.trading_type || 'Intraday'}
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                t.option_type === 'CE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
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
                                onClick={() => navigate('/trades')}
                                className="p-1 rounded hover:bg-[#1e293b] text-slate-400 hover:text-blue-400 transition-colors"
                                title="Edit Trade"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTrade(t.id)}
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
                      <td colSpan="10" className="py-8 text-center text-slate-400">
                        No trade activity recorded on this day.
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
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} interval={6} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}K`} domain={[-30, 30]} />
                  <ReferenceLine y={0} stroke="#334155" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0e1626',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                    formatter={(val) => [`₹${(val * 1000).toLocaleString()}`, 'Daily P&L']}
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
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} interval={6} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}K`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0e1626',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                    formatter={(val) => [`₹${(val * 1000).toLocaleString()}`, 'Cumulative P&L']}
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
                    contentStyle={{
                      backgroundColor: '#0e1626',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#fff',
                    }}
                    formatter={(val) => [`₹${val}K`, 'Net P&L']}
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
    </div>
  );
}
