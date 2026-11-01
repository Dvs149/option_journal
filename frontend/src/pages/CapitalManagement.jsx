import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  IndianRupee,
  Plus,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Edit2,
  Trash2,
  PieChart as PieIcon,
  Calculator,
  ShieldAlert,
  X,
  Target,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api from '../api/client';
import { formatINR, formatCompactINR, formatDate } from '../utils/formatters';
import { useLotSizes } from '../context/LotSizeContext';
import { useFilter } from '../context/FilterContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export default function CapitalManagement() {
  const navigate = useNavigate();
  const { dateRangeDisplay } = useFilter();
  const { showToast } = useToast();
  const { isKite } = useTheme();

  // Timeframe
  const [timeRange, setTimeRange] = useState('1Y');
  const [txTab, setTxTab] = useState('all');

  // Initial Capital & Transaction Modals State
  const [showEditCapitalModal, setShowEditCapitalModal] = useState(false);
  const [newInitialCapital, setNewInitialCapital] = useState('');
  const [savingCapital, setSavingCapital] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txType, setTxType] = useState('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txNotes, setTxNotes] = useState('');
  const [savingTx, setSavingTx] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  const { getLotSize, lotSizes } = useLotSizes();

  // Calculator inputs
  const [calcIndex, setCalcIndex] = useState('NIFTY');
  const [calcForm, setCalcForm] = useState({
    account_capital: '208450',
    risk_pct: '1.0',
    stop_loss: '50',
    lot_size: getLotSize('NIFTY').toString(),
  });

  // Keep lot size in sync if index changes
  const handleCalcIndexChange = (idx) => {
    setCalcIndex(idx);
    const size = getLotSize(idx);
    setCalcForm((prev) => ({
      ...prev,
      lot_size: size.toString(),
    }));
  };

  const calcResults = useMemo(() => {
    const cap = parseFloat(calcForm.account_capital) || 0;
    const pct = parseFloat(calcForm.risk_pct) || 0;
    const sl = parseFloat(calcForm.stop_loss) || 0;
    const lotSize = parseFloat(calcForm.lot_size) || 50;

    const riskAmt = (cap * pct) / 100;
    const lossPerLot = sl * lotSize;
    const recLots = lossPerLot > 0 ? (riskAmt / lossPerLot).toFixed(1) : '0';
    const totalQty = Math.round(parseFloat(recLots) * lotSize) || 0;

    return {
      riskAmt: Math.round(riskAmt),
      recLots,
      totalQty,
    };
  }, [calcForm]);

  const [capitalData, setCapitalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCapital();
  }, []);

  const fetchCapital = async () => {
    try {
      setLoading(true);
      const res = await api.get('/capital');
      setCapitalData(res.data);
    } catch (e) {
      console.warn('Failed to load capital data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInitialCapital = async (e) => {
    e.preventDefault();
    const val = parseFloat(newInitialCapital);
    if (isNaN(val) || val < 0) {
      showToast('Please enter a valid capital amount', 'error');
      return;
    }
    try {
      setSavingCapital(true);
      await api.put('/capital/initial', { initial_capital: val });
      showToast(`Initial capital updated to ${formatINR(val)}!`);
      setShowEditCapitalModal(false);
      fetchCapital();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update initial capital', 'error');
    } finally {
      setSavingCapital(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid positive amount', 'error');
      return;
    }
    try {
      setSavingTx(true);
      await api.post('/capital/transactions', {
        transaction_type: txType,
        amount: amt,
        transaction_date: txDate,
        notes: txNotes,
      });
      showToast(`${txType === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${formatINR(amt)} recorded!`);
      setShowAddTxModal(false);
      setTxAmount('');
      setTxNotes('');
      fetchCapital();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record transaction', 'error');
    } finally {
      setSavingTx(false);
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    try {
      setIsDeletingTx(true);
      await api.delete(`/capital/transactions/${txToDelete.id}`);
      showToast('Transaction removed');
      setTxToDelete(null);
      fetchCapital();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove transaction', 'error');
    } finally {
      setIsDeletingTx(false);
    }
  };

  const stats = useMemo(() => {
    const init = capitalData?.initial_capital || 500000;
    const curr = capitalData?.current_capital || init;
    const dep = capitalData?.total_deposits || 0;
    const withdr = capitalData?.total_withdrawals || 0;
    const profit = capitalData?.total_profit || 0;
    const roi = capitalData?.overall_roi || 0;
    const txs = capitalData?.transactions || [];

    return {
      initial_capital: init,
      total_deposits: dep,
      deposit_count: txs.filter((t) => t.transaction_type === 'deposit').length,
      total_withdrawals: withdr,
      withdrawal_count: txs.filter((t) => t.transaction_type === 'withdrawal').length,
      current_capital: curr,
      current_capital_pct: roi >= 0 ? `+${roi}%` : `${roi}%`,
      available_trading: curr,
      available_pct: '100%',
      total_profit: profit,
      total_profit_pct: roi >= 0 ? `+${roi}%` : `${roi}%`,
      roi: `${roi}%`,
    };
  }, [capitalData]);

  const account = capitalData?.account || {
    initial_capital: stats.initial_capital,
    current_capital: stats.current_capital,
  };

  const capitalGrowthData = useMemo(() => {
    if (!capitalData?.growth_chart || capitalData.growth_chart.length === 0) {
      return [{ date: 'Today', capital: capitalData?.current_capital || 500000, netProfit: 0 }];
    }
    return capitalData.growth_chart;
  }, [capitalData]);

  const allocationData = useMemo(() => {
    const curr = capitalData?.current_capital || 500000;
    return [
      { name: 'Available for Trading', value: curr, color: '#06b6d4', pct: '100.0%' },
      { name: 'Used in Open Positions', value: 0, color: '#f59e0b', pct: '0.0%' },
      { name: 'Cash Reserve', value: 0, color: '#10b981', pct: '0.0%' },
    ];
  }, [capitalData]);

  const openPositions = [];
  const usedCapital = openPositions.reduce((sum, pos) => sum + (pos.val || 0), 0);
  const availableCapital = (stats.current_capital || 0) - usedCapital;
  const utilizationPct = stats.current_capital > 0 ? ((usedCapital / stats.current_capital) * 100).toFixed(1) : '0.0';

  const transactions = useMemo(() => {
    if (!capitalData?.transactions || capitalData.transactions.length === 0) return [];
    return capitalData.transactions.map((tx) => ({
      id: tx.id,
      date: formatDate(tx.transaction_date),
      type: tx.transaction_type === 'deposit' ? 'Deposit' : 'Withdrawal',
      amount: parseFloat(tx.amount) * (tx.transaction_type === 'withdrawal' ? -1 : 1),
      balance: parseFloat(tx.amount),
      notes: tx.notes || '-',
    }));
  }, [capitalData]);

  const formatMilestoneINR = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '₹0';
    const abs = Math.abs(num);
    const isNegative = num < 0;
    if (abs >= 10000000) {
      const cr = parseFloat((abs / 10000000).toFixed(2));
      return `${isNegative ? '-' : ''}₹${cr}Cr`;
    }
    if (abs >= 100000) {
      const l = parseFloat((abs / 100000).toFixed(2));
      return `${isNegative ? '-' : ''}₹${l}L`;
    }
    if (abs >= 1000) {
      const k = parseFloat((abs / 1000).toFixed(1));
      return `${isNegative ? '-' : ''}₹${k}K`;
    }
    return `${isNegative ? '-' : ''}₹${abs}`;
  };

  const milestonesData = useMemo(() => {
    const init = Number(stats.initial_capital) || 500000;
    const curr = Number(stats.current_capital) || init;

    // Define growth milestones relative to starting capital
    // If user has already doubled initial capital, dynamically scale to higher tiers
    let tiers = [
      { mult: 1.0, sublabel: 'Base Capital', tag: '0%' },
      { mult: 1.1, sublabel: '+10% Growth', tag: '+10%' },
      { mult: 1.25, sublabel: '+25% Growth', tag: '+25%' },
      { mult: 1.5, sublabel: '+50% Growth', tag: '+50%' },
      { mult: 2.0, sublabel: '2x Double', tag: '+100%' },
    ];

    if (curr >= init * 2) {
      tiers = [
        { mult: 2.0, sublabel: '2x Capital', tag: '+100%' },
        { mult: 2.5, sublabel: '2.5x Capital', tag: '+150%' },
        { mult: 3.0, sublabel: '3x Capital', tag: '+200%' },
        { mult: 5.0, sublabel: '5x Capital', tag: '+400%' },
        { mult: 10.0, sublabel: '10x Goal', tag: '+900%' },
      ];
    }

    const steps = tiers.map((tier) => {
      const target = Math.round(init * tier.mult);
      return {
        target,
        mult: tier.mult,
        label: formatMilestoneINR(target),
        fullLabel: formatINR(target),
        sublabel: tier.sublabel,
        tag: tier.tag,
      };
    });

    const nextIndex = steps.findIndex((s) => curr < s.target);
    const allAchieved = nextIndex === -1;
    const nextMilestone = !allAchieved ? steps[nextIndex] : null;
    const isBelowBase = curr < init;
    const baseDeficit = isBelowBase ? init - curr : 0;
    const amountToGo = nextMilestone ? Math.max(0, nextMilestone.target - curr) : 0;

    // Progress toward the next milestone
    const prevTarget = nextIndex > 0 ? steps[nextIndex - 1].target : steps[0].target;
    const pctToNext = nextMilestone && nextMilestone.target > prevTarget
      ? Math.min(100, Math.max(0, Math.round(((curr - prevTarget) / (nextMilestone.target - prevTarget)) * 100)))
      : allAchieved
      ? 100
      : 0;

    // Visual progress line spanning the 5 evenly-spaced nodes (0%, 25%, 50%, 75%, 100%)
    let visualProgress = 0;
    if (curr <= steps[0].target) {
      visualProgress = 0;
    } else if (allAchieved) {
      visualProgress = 100;
    } else {
      const segmentIdx = Math.max(0, Math.min(steps.length - 2, nextIndex - 1));
      const currentStep = steps[segmentIdx];
      const nextStep = steps[segmentIdx + 1] || currentStep;
      const segmentSpan = nextStep.target - currentStep.target;
      const progressInSegment = segmentSpan > 0 ? (curr - currentStep.target) / segmentSpan : 0;
      visualProgress = (segmentIdx * 25) + (progressInSegment * 25);
    }

    return {
      steps: steps.map((s, idx) => {
        const isAchieved = curr >= s.target;
        const isNext = idx === nextIndex;
        let statusLabel = 'Target';
        if (isAchieved) {
          statusLabel = idx === 0 && !isBelowBase ? 'Base' : 'Achieved';
        } else if (isNext) {
          statusLabel = 'Next Target';
        }
        return {
          ...s,
          isAchieved,
          isNext,
          statusLabel,
        };
      }),
      nextMilestone,
      amountToGo,
      pctToNext,
      visualProgress: Math.min(100, Math.max(0, visualProgress)),
      isBelowBase,
      baseDeficit,
      allAchieved,
    };
  }, [stats]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
            Capital Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your trading capital, deposits, withdrawals and position sizing
          </p>
        </div>

        {/* Date Range & Timeframe Pills */}
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
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  timeRange === r
                    ? isKite
                      ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                      : 'bg-blue-600 text-white shadow-sm'
                    : isKite
                      ? 'text-[#9b9b9b] hover:text-white'
                      : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1: Top 7 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Initial Capital */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1 group relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium block">Initial Capital</span>
            <button
              type="button"
              onClick={() => {
                setNewInitialCapital(stats.initial_capital);
                setShowEditCapitalModal(true);
              }}
              className="text-slate-400 hover:text-blue-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
              title="Edit Starting Capital"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.initial_capital)}
          </span>
          <button
            type="button"
            onClick={() => {
              setNewInitialCapital(stats.initial_capital);
              setShowEditCapitalModal(true);
            }}
            className="text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 mt-0.5"
          >
            <span>Edit Capital</span> &rarr;
          </button>
        </div>

        {/* Total Deposits */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium block">Total Deposits</span>
            <button
              type="button"
              onClick={() => {
                setTxType('deposit');
                setShowAddTxModal(true);
              }}
              className="text-slate-400 hover:text-emerald-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
              title="Add Deposit"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.total_deposits)}
          </span>
          <span className="text-[10px] text-slate-400 block">{stats.deposit_count} transactions</span>
        </div>

        {/* Total Withdrawals */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium block">Total Withdrawals</span>
            <button
              type="button"
              onClick={() => {
                setTxType('withdrawal');
                setShowAddTxModal(true);
              }}
              className="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
              title="Record Withdrawal"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.total_withdrawals)}
          </span>
          <span className="text-[10px] text-slate-400 block">{stats.withdrawal_count} transactions</span>
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

        {/* Available for Trading */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Available for Trading</span>
          <span className="text-base font-bold text-cyan-400 font-mono-numbers block tracking-tight">
            {formatINR(stats.available_trading)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono-numbers block">{stats.available_pct}</span>
        </div>

        {/* Total Profit */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Total Profit</span>
          <span className="text-base font-bold text-emerald-400 font-mono-numbers block tracking-tight">
            {formatINR(stats.total_profit)}
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3 inline" /> {stats.total_profit_pct}
          </span>
        </div>

        {/* ROI */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">ROI</span>
          <span className="text-base font-bold text-emerald-400 font-mono-numbers block tracking-tight">
            {stats.roi}
          </span>
          <span className="text-[10px] text-slate-400 block">Annualized</span>
        </div>
      </div>

      {/* Row 2: Capital Growth Chart (7 cols) & Capital Allocation Donut (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Capital Growth Area Chart */}
        <div className="lg:col-span-7 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                Capital Growth
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-slate-400">Capital</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-400">Deposits</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-400">Withdrawals</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-slate-400">Net Profit</span>
                </div>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-xs text-slate-300">
              This Year
            </div>
          </div>

          <div className="relative h-60 w-full">
            <div className="absolute right-6 top-2 z-10 p-2 rounded-xl bg-[#0e1626]/90 border border-blue-500/40 text-right shadow-lg">
              <span className="text-[10px] text-slate-400 block">Current Capital</span>
              <span className="text-xs font-bold text-white font-mono-numbers">{formatINR(stats.current_capital || stats.initial_capital || 0)}</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={capitalGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="capGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} domain={[0, 400000]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0e1626',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  formatter={(val) => [formatINR(val), 'Capital']}
                />
                <Area type="monotone" dataKey="capital" stroke="#3b82f6" strokeWidth={2.5} fill="url(#capGrowthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital Allocation Donut */}
        <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
            Capital Allocation
          </h2>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <div className="relative w-36 h-36 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    innerRadius={46}
                    outerRadius={66}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-400">Total Capital</span>
                <span className="text-xs font-bold text-white font-mono-numbers">₹2,78,450</span>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 text-xs w-full">
              {allocationData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 light:text-slate-700">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-white light:text-slate-900 font-mono-numbers mr-2">
                      {formatINR(item.value)}
                    </span>
                    <span className="text-slate-500 text-[11px]">{item.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Position Sizing Calculator (5 cols), Risk-Based Position Size (4 cols), Capital Utilization (3 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Position Sizing Calculator */}
        <div className="md:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white light:text-slate-900">
            Position Sizing Calculator
          </h2>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Account Capital (₹)</label>
                <input
                  type="number"
                  value={calcForm.account_capital}
                  onChange={(e) => setCalcForm({ ...calcForm, account_capital: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Risk Per Trade (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calcForm.risk_pct}
                  onChange={(e) => setCalcForm({ ...calcForm, risk_pct: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Risk Amount (₹)</label>
                <input
                  type="text"
                  readOnly
                  value={formatINR(calcResults.riskAmt)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-emerald-400 font-bold font-mono-numbers"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Stop Loss (Points / ₹)</label>
                <input
                  type="number"
                  value={calcForm.stop_loss}
                  onChange={(e) => setCalcForm({ ...calcForm, stop_loss: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400">Lot Size</label>
                  <select
                    value={calcIndex}
                    onChange={(e) => handleCalcIndexChange(e.target.value)}
                    className="px-2 py-0.5 rounded-md bg-[#0e1626] border border-[#1e293b] text-[10px] text-blue-400 font-bold outline-none cursor-pointer"
                  >
                    {Object.keys(lotSizes).filter(k => k !== 'BANK NIFTY').map(idx => (
                      <option key={idx} value={idx} className="bg-[#121b2d] text-white">{idx}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  value={calcForm.lot_size}
                  onChange={(e) => setCalcForm({ ...calcForm, lot_size: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>
                Risk: ₹{calcResults.riskAmt.toLocaleString('en-IN')}. With {calcForm.stop_loss} pts SL ({calcIndex}), take <strong>{calcResults.recLots} lots</strong> (<strong>{calcResults.totalQty} Qty</strong>).
              </span>
            </div>
          </div>
        </div>

        {/* Risk-Based Position Size Table */}
        <div className="md:col-span-4 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white light:text-slate-900">
            Risk-Based Position Size
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] text-slate-400 uppercase font-semibold border-b border-[#1e293b]">
                <tr>
                  <th className="py-1.5">Risk %</th>
                  <th className="py-1.5 text-right">Risk Amt (₹)</th>
                  <th className="py-1.5 text-right">Qty (Lots)</th>
                  <th className="py-1.5 text-right">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60">
                <tr className="hover:bg-[#162033]/50">
                  <td className="py-2 text-slate-300">0.5%</td>
                  <td className="py-2 text-right font-mono-numbers text-slate-300">1,042</td>
                  <td className="py-2 text-right font-mono-numbers text-slate-300">0.3</td>
                  <td className="py-2 text-right text-slate-400 text-[10px]">Conservative</td>
                </tr>
                <tr className="bg-emerald-500/10 border-l-2 border-emerald-500 font-semibold">
                  <td className="py-2 text-emerald-400">1.0%</td>
                  <td className="py-2 text-right font-mono-numbers text-emerald-400">2,084</td>
                  <td className="py-2 text-right font-mono-numbers text-emerald-400">0.6 (= 1)</td>
                  <td className="py-2 text-right text-emerald-400 text-[10px] font-bold">Recommended</td>
                </tr>
                <tr className="hover:bg-[#162033]/50">
                  <td className="py-2 text-slate-300">1.5%</td>
                  <td className="py-2 text-right font-mono-numbers text-slate-300">3,127</td>
                  <td className="py-2 text-right font-mono-numbers text-slate-300">0.9</td>
                  <td className="py-2 text-right text-slate-400 text-[10px]">Slightly Aggressive</td>
                </tr>
                <tr className="hover:bg-[#162033]/50">
                  <td className="py-2 text-slate-300">2.0%</td>
                  <td className="py-2 text-right font-mono-numbers text-slate-300">4,169</td>
                  <td className="py-2 text-right font-mono-numbers text-slate-300">1.2</td>
                  <td className="py-2 text-right text-slate-400 text-[10px]">Aggressive</td>
                </tr>
                <tr className="hover:bg-[#162033]/50">
                  <td className="py-2 text-rose-400">3.0%</td>
                  <td className="py-2 text-right font-mono-numbers text-rose-400">6,253</td>
                  <td className="py-2 text-right font-mono-numbers text-rose-400">1.9</td>
                  <td className="py-2 text-right text-rose-400 text-[10px]">High Risk</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Capital Utilization */}
        <div className="md:col-span-3 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white light:text-slate-900">
            Capital Utilization
          </h2>

          <div className="flex flex-col items-center justify-center pt-1 text-center">
            <div className="w-24 h-24 rounded-full border-4 border-emerald-400 border-t-transparent flex flex-col items-center justify-center">
              <span className="text-xl font-black text-white font-mono-numbers">{utilizationPct}%</span>
              <span className="text-[9px] text-slate-400">Capital in Use</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-1 border-t border-[#1e293b]">
            <div className="flex justify-between text-slate-400">
              <span>Used in Open Positions</span>
              <span className="font-mono-numbers text-amber-400">{formatINR(usedCapital)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Available for Trading</span>
              <span className="font-mono-numbers text-cyan-400">{formatINR(availableCapital)}</span>
            </div>
            <div className="flex justify-between text-slate-400 font-semibold pt-1">
              <span>Total Capital</span>
              <span className="font-mono-numbers text-white">{formatINR(stats.current_capital)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Deposit & Withdrawal History (7 cols) & Open Positions Capital (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Deposit & Withdrawal History */}
        <div className="lg:col-span-7 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Deposit & Withdrawal History
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0e1626] border border-[#1e293b] text-xs">
                {['All', 'Deposits', 'Withdrawals'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxTab(t.toLowerCase())}
                    className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                      txTab === t.toLowerCase()
                        ? isKite
                          ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                          : 'bg-blue-600 text-white'
                        : isKite
                          ? 'text-[#9b9b9b] hover:text-white'
                          : 'text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setTxType('deposit');
                  setShowAddTxModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" /> Add Transaction
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] text-slate-400 uppercase font-semibold border-b border-[#1e293b]">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Amount (₹)</th>
                  <th className="py-2 text-right">Balance After (₹)</th>
                  <th className="py-2 pl-3">Notes</th>
                  <th className="py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60">
                {transactions
                  .filter((tx) => {
                    if (txTab === 'deposits') return tx.type === 'Deposit';
                    if (txTab === 'withdrawals') return tx.type === 'Withdrawal';
                    return true;
                  })
                  .length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 text-xs">
                      No capital transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions
                    .filter((tx) => {
                      if (txTab === 'deposits') return tx.type === 'Deposit';
                      if (txTab === 'withdrawals') return tx.type === 'Withdrawal';
                      return true;
                    })
                    .map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#162033]/50">
                      <td className="py-2.5 text-slate-300">{tx.date}</td>
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            tx.amount >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className={`py-2.5 text-right font-mono-numbers font-semibold ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {tx.amount >= 0 ? '+' : ''}{formatINR(tx.amount)}
                      </td>
                      <td className="py-2.5 text-right font-mono-numbers text-slate-300">
                        {formatINR(tx.balance)}
                      </td>
                      <td className="py-2.5 pl-3 text-slate-400 text-[11px]">{tx.notes}</td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTxToDelete(tx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open Positions Capital */}
        <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Open Positions Capital
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Avg Price</th>
                  <th className="py-2 text-right">LTP</th>
                  <th className="py-2 text-right">Position Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60">
                {openPositions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 text-xs">
                      No open positions currently.
                    </td>
                  </tr>
                ) : (
                  openPositions.map((pos, idx) => (
                  <tr key={idx} className="hover:bg-[#162033]/50">
                    <td className="py-2.5 font-semibold text-white">{pos.symbol}</td>
                    <td className="py-2.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        pos.type === 'CE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : pos.type === 'PE'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {pos.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono-numbers text-slate-300">{pos.qty}</td>
                    <td className="py-2.5 text-right font-mono-numbers text-slate-300">{pos.avgPrice.toFixed(1)}</td>
                    <td className="py-2.5 text-right font-mono-numbers text-slate-300">{pos.ltp.toFixed(1)}</td>
                    <td className={`py-2.5 text-right font-mono-numbers font-semibold ${
                      pos.val >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatINR(pos.val)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Used Capital</span>
            <span className="text-sm font-bold text-white font-mono-numbers">{formatINR(usedCapital)}</span>
          </div>
        </div>
      </div>

      {/* Row 5: Capital Milestones & Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Capital Milestones (7 cols) */}
        <div className="lg:col-span-7 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e293b] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white light:text-slate-900">Capital Milestones</h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dynamic growth tracking based on {formatINR(stats.initial_capital)} initial capital
              </p>
            </div>
            {milestonesData.isBelowBase ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                {formatINR(milestonesData.baseDeficit)} to recover base
              </span>
            ) : milestonesData.allAchieved ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Award className="w-3.5 h-3.5" />
                All Milestones Achieved!
              </span>
            ) : milestonesData.nextMilestone ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Target className="w-3.5 h-3.5" />
                Next: {milestonesData.nextMilestone.label} ({formatINR(milestonesData.amountToGo)} to go)
              </span>
            ) : null}
          </div>

          <div className="relative pt-6 pb-2 px-1">
            {/* Base background line */}
            <div className="absolute top-[34px] left-[18px] right-[18px] h-1.5 bg-[#1e293b] -translate-y-1/2 z-0 rounded-full" />

            {/* Dynamic Progress fill line */}
            <div
              className="absolute top-[34px] left-[18px] h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 -translate-y-1/2 z-0 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
              style={{
                width: `calc(${milestonesData.visualProgress}% * (100% - 36px) / 100)`,
              }}
            />

            {/* Milestone Nodes */}
            <div className="relative z-10 flex items-start justify-between text-center">
              {milestonesData.steps.map((step, idx) => {
                const isAchieved = step.isAchieved;
                const isNext = step.isNext;

                return (
                  <div key={idx} className="flex flex-col items-center group relative min-w-[58px]">
                    {/* Node Circle */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ring-4 ring-[#121b2d] ${
                        isAchieved
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                          : isNext
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-blue-500/30'
                          : 'bg-[#162033] border border-[#23324d] text-slate-500'
                      }`}
                    >
                      {isAchieved ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : isNext ? (
                        <div className="relative flex items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-blue-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-600" />
                      )}
                    </div>

                    {/* Amount Label */}
                    <span
                      className={`text-xs font-bold font-mono-numbers mt-2 block tracking-tight ${
                        isAchieved
                          ? 'text-white'
                          : isNext
                          ? 'text-blue-400 font-extrabold'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>

                    {/* Sublabel / Multiplier */}
                    <span
                      className={`text-[10px] block mt-0.5 font-medium ${
                        isAchieved
                          ? 'text-emerald-400'
                          : isNext
                          ? 'text-blue-300 font-semibold'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.sublabel}
                    </span>

                    {/* Status Pill Badge */}
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md mt-1 inline-block ${
                        isAchieved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium'
                          : isNext
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold'
                          : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'
                      }`}
                    >
                      {step.statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Info Banner */}
          <div className="p-3 rounded-2xl bg-[#0e1626] border border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Current Capital:</span>
              <span className="font-bold text-white font-mono-numbers">{formatINR(stats.current_capital)}</span>
            </div>

            {milestonesData.nextMilestone ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Remaining to {milestonesData.nextMilestone.label}:</span>
                <span className="font-bold text-blue-400 font-mono-numbers">{formatINR(milestonesData.amountToGo)}</span>
                <span className="text-[11px] text-slate-500">
                  ({Math.max(0, 100 - milestonesData.pctToNext)}% left)
                </span>
              </div>
            ) : (
              <span className="text-emerald-400 font-semibold text-xs">
                🏆 Double capital goal achieved!
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 italic">
            💡 Milestones automatically scale relative to your base capital ({formatINR(stats.initial_capital)}) and update live as your trade balance changes.
          </p>
        </div>

        {/* Key Insights (5 cols) */}
        <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Key Insights
            </h2>
            <span className="text-[10px] text-slate-400">Live Diagnostics</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
              <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">
                Overall capital ROI is <strong className={parseFloat(stats.roi) >= 0 ? "text-emerald-400" : "text-rose-400"}>{stats.roi}</strong> since inception.
              </p>
            </div>
            <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">
                Net capital inflow: <strong className="text-white">{formatINR(stats.total_deposits - stats.total_withdrawals)}</strong> across <strong className="text-white">{stats.deposit_count + stats.withdrawal_count}</strong> recorded transactions.
              </p>
            </div>
            <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
              <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">
                Available trading balance: <strong className="text-cyan-400">{formatINR(availableCapital)}</strong> ({Math.max(0, 100 - parseFloat(utilizationPct)).toFixed(1)}% uncommitted).
              </p>
            </div>
            <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
              <Target className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">
                {milestonesData.nextMilestone ? (
                  <>Next account milestone: <strong className="text-blue-400">{milestonesData.nextMilestone.label}</strong> ({milestonesData.nextMilestone.sublabel}). Need <strong className="text-white">{formatINR(milestonesData.amountToGo)}</strong> in net profit.</>
                ) : (
                  <>All standard milestones achieved! You have doubled your starting capital.</>
                )}
              </p>
            </div>
            <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40">
              <Lightbulb className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">
                Recommended risk rule: Never risk more than <strong>1-2%</strong> of your current capital ({formatINR(Math.round(stats.current_capital * 0.015))}) on a single trade.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Initial Capital Modal */}
      {showEditCapitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] border border-[#1e293b] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Initial Capital</h3>
                  <p className="text-xs text-slate-400">Set starting account balance for ROI & milestones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditCapitalModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateInitialCapital} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Initial Capital Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono-numbers">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newInitialCapital}
                    onChange={(e) => setNewInitialCapital(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white text-sm font-mono-numbers focus:outline-none focus:border-blue-500"
                    placeholder="500000"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  This sets your initial principal for calculating drawdowns, total ROI, and dynamic milestones.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setShowEditCapitalModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCapital}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md shadow-blue-600/30 disabled:opacity-50"
                >
                  {savingCapital ? 'Saving...' : 'Update Capital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Record Capital Transaction Modal */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] border border-[#1e293b] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    txType === 'deposit'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {txType === 'deposit' ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Capital Transaction</h3>
                  <p className="text-xs text-slate-400">Add funds or record profit withdrawals</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTxModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('deposit')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      txType === 'deposit'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'bg-[#0e1626] text-slate-400 border border-[#1e293b] hover:text-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('withdrawal')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      txType === 'withdrawal'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                        : 'bg-[#0e1626] text-slate-400 border border-[#1e293b] hover:text-slate-200'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" /> Withdrawal
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono-numbers">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white text-sm font-mono-numbers focus:outline-none focus:border-blue-500"
                    placeholder="1000.00"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white text-xs font-mono-numbers focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white text-xs focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Added monthly trading funds"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTx}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 ${
                    txType === 'deposit'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  }`}
                >
                  {savingTx
                    ? 'Recording...'
                    : txType === 'deposit'
                    ? 'Add Deposit'
                    : 'Record Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Capital Transaction Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] border border-[#1e293b] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-2xl bg-rose-500/10">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                Delete Transaction?
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to remove this{' '}
              <strong className="text-white">
                {txToDelete.type} of {formatINR(Math.abs(txToDelete.amount))}
              </strong>
              ? Your capital balance will be recalculated accordingly.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                disabled={isDeletingTx}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTransaction}
                disabled={isDeletingTx}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingTx ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
