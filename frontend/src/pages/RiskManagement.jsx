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
  X,
  Plus,
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
import { formatINR, formatCompactINR } from '../utils/formatters';
import { useFilter } from '../context/FilterContext';
import { useToast } from '../context/ToastContext';

export default function RiskManagement() {
  const navigate = useNavigate();
  const { dateRangeDisplay } = useFilter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [tradesList, setTradesList] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);

  const [limitsForm, setLimitsForm] = useState({
    daily_max_loss: 25000,
    daily_profit_target: 20000,
    monthly_max_loss: 100000,
    monthly_profit_target: 150000,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [riskRes, dashRes, tradesRes] = await Promise.all([
        api.get('/risk'),
        api.get('/dashboard', { params: { filter: 'all' } }),
        api.get('/trades', { params: { per_page: 100 } }),
      ]);

      setRiskData(riskRes.data);
      setDashboardData(dashRes.data);
      setTradesList(tradesRes.data?.data || []);

      if (riskRes.data?.account_limits) {
        setLimitsForm({
          daily_max_loss: riskRes.data.account_limits.daily_max_loss,
          daily_profit_target: riskRes.data.account_limits.daily_profit_target,
          monthly_max_loss: riskRes.data.account_limits.monthly_max_loss,
          monthly_profit_target: riskRes.data.account_limits.monthly_profit_target,
        });
      }
    } catch (err) {
      console.error('Failed to load risk management data', err);
      showToast('Could not load risk limits', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveLimits = async (e) => {
    e.preventDefault();
    try {
      setSavingLimits(true);
      await api.put('/risk/limits', limitsForm);
      showToast('Risk limits updated successfully', 'success');
      setShowConfigModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save risk limits', err);
      showToast('Failed to update limits', 'error');
    } finally {
      setSavingLimits(false);
    }
  };

  const accountLimits = riskData?.account_limits || {
    daily_max_loss: 25000,
    daily_profit_target: 20000,
    monthly_max_loss: 100000,
    monthly_profit_target: 150000,
  };

  const metrics = riskData?.metrics || {
    largest_single_day_profit: 0,
    largest_single_day_loss: 0,
    avg_risk_to_reward: 0,
    max_drawdown: 0,
    max_drawdown_pct: 0,
    current_drawdown: 0,
    consecutive_losing_days: 0,
    consecutive_winning_days: 0,
    daily_current_loss: 0,
    daily_current_profit: 0,
  };

  const stats = dashboardData?.stats || {
    total_trades: 0,
    total_net_profit: 0,
    this_month_pnl: 0,
    win_rate: 0,
    current_capital: 500000,
  };

  // Daily P&L vs limits data for chart
  const dailyPnLLimitsData = useMemo(() => {
    const rawDaily = dashboardData?.charts?.daily_pnl || [];
    return rawDaily.map((d) => ({
      day: d.date ? d.date.split('-').slice(1).join('/') : d.day,
      pnl: d.net_pnl || 0,
    }));
  }, [dashboardData]);

  // Drawdown curve data for chart
  const drawdownCurveData = useMemo(() => {
    const rawDd = dashboardData?.charts?.drawdown_curve || [];
    return rawDd.map((d) => ({
      day: d.date ? d.date.split('-').slice(1).join('/') : d.date,
      dd: -Math.abs(d.drawdown || 0),
    }));
  }, [dashboardData]);

  // Scatter points: Risk vs Reward per trade
  const scatterPoints = useMemo(() => {
    return tradesList.map((t) => {
      const net = parseFloat(t.net_pnl) || 0;
      const charges = parseFloat(t.total_charges) || 0;
      const risk = charges > 0 ? charges * 5 : 2000;
      return {
        risk: Math.round(risk),
        reward: Math.round(net),
        type: net >= 0 ? 'win' : 'loss',
      };
    });
  }, [tradesList]);

  // Daily risk rows
  const dailyRiskRows = useMemo(() => {
    const grouped = {};
    tradesList.forEach((t) => {
      const d = t.trade_date;
      if (!grouped[d]) {
        grouped[d] = {
          date: d,
          trades: 0,
          pnl: 0,
          maxLoss: 0,
          maxProfit: 0,
        };
      }
      grouped[d].trades += 1;
      const pnl = parseFloat(t.net_pnl) || 0;
      grouped[d].pnl += pnl;
      if (pnl < 0) grouped[d].maxLoss = Math.min(grouped[d].maxLoss, pnl);
      if (pnl > 0) grouped[d].maxProfit = Math.max(grouped[d].maxProfit, pnl);
    });

    return Object.values(grouped).map((row) => ({
      ...row,
      riskUsed: `${formatINR(Math.abs(row.maxLoss))} (${accountLimits.daily_max_loss > 0 ? Math.round((Math.abs(row.maxLoss) / accountLimits.daily_max_loss) * 100) : 0}%)`,
      status: row.pnl >= accountLimits.daily_profit_target ? 'Target Hit' : row.pnl < 0 ? 'Drawdown' : 'Normal',
    }));
  }, [tradesList, accountLimits]);

  // Progress Calculations
  const dailyLossPct = accountLimits.daily_max_loss > 0
    ? Math.min(100, Math.round((metrics.daily_current_loss / accountLimits.daily_max_loss) * 100))
    : 0;

  const dailyProfitPct = accountLimits.daily_profit_target > 0
    ? Math.min(100, Math.round((metrics.daily_current_profit / accountLimits.daily_profit_target) * 100))
    : 0;

  const monthlyLossValue = stats.this_month_pnl < 0 ? Math.abs(stats.this_month_pnl) : 0;
  const monthlyLossPct = accountLimits.monthly_max_loss > 0
    ? Math.min(100, Math.round((monthlyLossValue / accountLimits.monthly_max_loss) * 100))
    : 0;

  const monthlyProfitValue = stats.this_month_pnl > 0 ? stats.this_month_pnl : 0;
  const monthlyProfitPct = accountLimits.monthly_profit_target > 0
    ? Math.min(100, Math.round((monthlyProfitValue / accountLimits.monthly_profit_target) * 100))
    : 0;

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

        {/* Date Filter & Edit Limits Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{dateRangeDisplay || 'All Time'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Limits</span>
          </button>
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
              {formatINR(accountLimits.daily_max_loss)}
            </span>
            <div className="w-full bg-[#0e1626] light:bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${dailyLossPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-numbers block mt-1">
              {metrics.daily_current_loss > 0 ? formatINR(metrics.daily_current_loss) : '0'} / {formatINR(accountLimits.daily_max_loss)} ({dailyLossPct}%)
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
              {formatINR(accountLimits.daily_profit_target)}
            </span>
            <div className="w-full bg-[#0e1626] light:bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${dailyProfitPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-numbers block mt-1">
              {metrics.daily_current_profit > 0 ? formatINR(metrics.daily_current_profit) : '0'} / {formatINR(accountLimits.daily_profit_target)} ({dailyProfitPct}%)
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
              {formatINR(accountLimits.monthly_max_loss)}
            </span>
            <div className="w-full bg-[#0e1626] light:bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${monthlyLossPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-numbers block mt-1">
              {monthlyLossValue > 0 ? formatINR(monthlyLossValue) : '0'} / {formatINR(accountLimits.monthly_max_loss)} ({monthlyLossPct}%)
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
              {formatINR(accountLimits.monthly_profit_target)}
            </span>
            <div className="w-full bg-[#0e1626] light:bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${monthlyProfitPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono-numbers block mt-1">
              {monthlyProfitValue > 0 ? formatINR(monthlyProfitValue) : '0'} / {formatINR(accountLimits.monthly_profit_target)} ({monthlyProfitPct}%)
            </span>
          </div>
        </div>

        {/* Max Risk Per Trade */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Account Capital</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {formatINR(stats.current_capital)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono-numbers block mt-2">
              Trades Logged: {stats.total_trades}
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

          <div className="h-48 w-full flex items-center justify-center">
            {dailyPnLLimitsData.length === 0 ? (
              <p className="text-xs text-slate-500">No trading activity recorded for chart display</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnLLimitsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => formatCompactINR(v)} />
                  <ReferenceLine y={0} stroke="#334155" />
                  <ReferenceLine y={accountLimits.daily_profit_target} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.5} />
                  <ReferenceLine y={-accountLimits.daily_max_loss} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
                  <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                    {dailyPnLLimitsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Drawdown Chart */}
        <div className="lg:col-span-6 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Drawdown Curve
            </h2>
            <span className="text-xs text-slate-400">{dateRangeDisplay || 'All Time'}</span>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            {drawdownCurveData.length === 0 ? (
              <p className="text-xs text-slate-500">No drawdown curve data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownCurveData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskDdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => formatCompactINR(v)} />
                  <Area type="monotone" dataKey="dd" stroke="#ef4444" strokeWidth={2} fill="url(#riskDdGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: 6 Risk KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Maximum Drawdown</span>
          <span className="text-base font-bold text-rose-400 font-mono-numbers block tracking-tight">
            {formatINR(metrics.max_drawdown)}
          </span>
          <span className="text-[10px] text-rose-400 font-semibold">({metrics.max_drawdown_pct}%)</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Current Drawdown</span>
          <span className="text-base font-bold text-white font-mono-numbers block tracking-tight">
            {formatINR(metrics.current_drawdown)}
          </span>
          <span className="text-[10px] text-slate-400">Peak recovery active</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Consecutive Losing Days</span>
          <span className="text-base font-bold text-rose-400 font-mono-numbers block tracking-tight">
            {metrics.consecutive_losing_days}
          </span>
          <span className="text-[10px] text-slate-400">Streak count</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Consecutive Winning Days</span>
          <span className="text-base font-bold text-emerald-400 font-mono-numbers block tracking-tight">
            {metrics.consecutive_winning_days}
          </span>
          <span className="text-[10px] text-slate-400">Streak count</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Largest Single-Day Loss</span>
          <span className="text-base font-bold text-rose-400 font-mono-numbers block tracking-tight">
            {formatINR(metrics.largest_single_day_loss)}
          </span>
          <span className="text-[10px] text-slate-400">Max day risk</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Largest Single-Day Profit</span>
          <span className="text-base font-bold text-emerald-400 font-mono-numbers block tracking-tight">
            {formatINR(metrics.largest_single_day_profit)}
          </span>
          <span className="text-[10px] text-slate-400">Best day return</span>
        </div>
      </div>

      {/* Row 4: Risk Limit Alerts, Risk vs Reward, Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Risk Limit Alerts */}
        <div className="p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Risk Limit Alerts
            </h2>
            <span className="text-xs text-slate-500 font-semibold">Live Monitoring</span>
          </div>

          <div className="space-y-2.5 text-xs min-h-[140px] flex flex-col justify-center">
            {(!riskData?.alerts || riskData.alerts.length === 0) ? (
              <div className="p-4 rounded-2xl bg-[#0e1626] border border-[#1e293b] text-center space-y-1">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="font-semibold text-slate-200">All Risk Parameters Healthy</p>
                <p className="text-[11px] text-slate-400">
                  No risk threshold breaches or drawdown warnings.
                </p>
              </div>
            ) : (
              riskData.alerts.map((alt, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-2xl border flex items-start gap-2.5 ${
                    alt.type === 'danger'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : alt.type === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{alt.title || 'Risk Alert'}</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">{alt.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Risk vs Reward Analysis */}
        <div className="p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Risk vs Reward Analysis
            </h2>
            <span className="text-xs text-slate-400">Trade Spread</span>
          </div>

          <div className="p-2 rounded-xl bg-[#0e1626] border border-[#1e293b] flex items-center justify-between text-[10px] text-slate-300">
            <span>Win Rate: {stats.win_rate || 0}%</span>
            <span className="font-bold text-emerald-400">
              R:R Ratio: 1 : {metrics.avg_risk_to_reward || 0}
            </span>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {scatterPoints.length === 0 ? (
              <p className="text-xs text-slate-500">No trades recorded yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                  <XAxis type="number" dataKey="risk" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(v) => formatCompactINR(v)} />
                  <YAxis type="number" dataKey="reward" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={(v) => formatCompactINR(v)} />
                  <ReferenceLine y={0} stroke="#334155" />
                  <Scatter data={scatterPoints}>
                    {scatterPoints.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.type === 'win' ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="p-5 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Risk Metrics
            </h2>
            <span className="text-xs text-slate-400">Account Live</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Risk to Reward Ratio</span>
              <span className="font-bold text-white font-mono-numbers">1 : {metrics.avg_risk_to_reward || 0}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total Trades</span>
              <span className="font-semibold text-white font-mono-numbers">{stats.total_trades}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Net P&L</span>
              <span className={`font-bold font-mono-numbers ${stats.total_net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.total_net_profit >= 0 ? '+' : ''}{formatINR(stats.total_net_profit)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Trade Win Rate</span>
              <span className="font-bold text-emerald-400 font-mono-numbers">{stats.win_rate}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Current Drawdown</span>
              <span className="font-semibold text-rose-400 font-mono-numbers">{formatINR(metrics.current_drawdown)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Daily Loss Used Today</span>
              <span className="font-semibold text-slate-200 font-mono-numbers">{formatINR(metrics.daily_current_loss)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Daily Profit Today</span>
              <span className="font-semibold text-emerald-400 font-mono-numbers">+{formatINR(metrics.daily_current_profit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Daily Risk Summary & Monthly Risk Overview */}
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
                  <th className="py-2 text-right">Trades</th>
                  <th className="py-2 text-right">Net P&L</th>
                  <th className="py-2 text-right">Max Loss</th>
                  <th className="py-2 text-right">Max Profit</th>
                  <th className="py-2 text-right">Risk Used</th>
                  <th className="py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                {dailyRiskRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No trading days recorded yet. Add your trades to monitor daily risk.
                    </td>
                  </tr>
                ) : (
                  dailyRiskRows.map((row) => (
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
                              : row.status === 'Drawdown'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
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
                <span className="font-mono-numbers text-slate-300">
                  {monthlyLossValue > 0 ? formatINR(monthlyLossValue) : '₹0'} / {formatINR(accountLimits.monthly_max_loss)} ({monthlyLossPct}%)
                </span>
              </div>
              <div className="w-full bg-[#0e1626] h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${monthlyLossPct}%` }} />
              </div>
            </div>

            {/* Monthly Profit Target Progress */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Monthly Profit Target</span>
                <span className="font-mono-numbers text-emerald-400">
                  {monthlyProfitValue > 0 ? formatINR(monthlyProfitValue) : '₹0'} / {formatINR(accountLimits.monthly_profit_target)} ({monthlyProfitPct}%)
                </span>
              </div>
              <div className="w-full bg-[#0e1626] h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${monthlyProfitPct}%` }} />
              </div>
            </div>

            {/* Bottom Current Capital */}
            <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between">
              <span className="text-slate-400 text-xs">Total Capital</span>
              <span className="text-lg font-bold text-white font-mono-numbers">{formatINR(stats.current_capital)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configure Limits Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] light:border-slate-200 mb-4">
              <h3 className="text-base font-bold text-white light:text-slate-900">
                Configure Account Risk Limits
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLimits} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Daily Max Loss (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={limitsForm.daily_max_loss}
                  onChange={(e) => setLimitsForm({ ...limitsForm, daily_max_loss: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500 font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Daily Profit Target (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={limitsForm.daily_profit_target}
                  onChange={(e) => setLimitsForm({ ...limitsForm, daily_profit_target: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500 font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Monthly Max Loss (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  required
                  value={limitsForm.monthly_max_loss}
                  onChange={(e) => setLimitsForm({ ...limitsForm, monthly_max_loss: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500 font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Monthly Profit Target (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  required
                  value={limitsForm.monthly_profit_target}
                  onChange={(e) => setLimitsForm({ ...limitsForm, monthly_profit_target: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500 font-mono-numbers"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#283850] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLimits}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30"
                >
                  {savingLimits ? 'Saving...' : 'Save Limits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
