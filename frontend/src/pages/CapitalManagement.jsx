import React, { useState, useMemo } from 'react';
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
import { formatINR } from '../utils/formatters';

export default function CapitalManagement() {
  const navigate = useNavigate();

  // Timeframe
  const [timeRange, setTimeRange] = useState('1Y');
  const [txTab, setTxTab] = useState('all');

  // Calculator inputs
  const [calcForm, setCalcForm] = useState({
    account_capital: '208450',
    risk_pct: '1.0',
    stop_loss: '50',
    lot_size: '65',
  });

  const calcResults = useMemo(() => {
    const cap = parseFloat(calcForm.account_capital) || 0;
    const pct = parseFloat(calcForm.risk_pct) || 0;
    const sl = parseFloat(calcForm.stop_loss) || 0;
    const lotSize = parseFloat(calcForm.lot_size) || 50;

    const riskAmt = (cap * pct) / 100;
    const lossPerLot = sl * lotSize;
    const recLots = lossPerLot > 0 ? (riskAmt / lossPerLot).toFixed(1) : '0';

    return {
      riskAmt: Math.round(riskAmt),
      recLots,
    };
  }, [calcForm]);

  // Top 7 Metric Stats (Matches mockup)
  const stats = {
    initial_capital: 50000,
    total_deposits: 250000,
    deposit_count: 12,
    total_withdrawals: 50000,
    withdrawal_count: 4,
    current_capital: 278450,
    current_capital_pct: '+25.7%',
    available_trading: 208450,
    available_pct: '75.0%',
    total_profit: 128450,
    total_profit_pct: '+25.7%',
    roi: '25.7%',
  };

  // Capital Growth chart data
  const capitalGrowthData = [
    { date: 'Jan 2025', capital: 50000, netProfit: 0 },
    { date: 'Feb 2025', capital: 84000, netProfit: 12000 },
    { date: 'Mar 2025', capital: 120000, netProfit: 25000 },
    { date: 'Apr 2025', capital: 145000, netProfit: 45000 },
    { date: 'May 2025', capital: 180000, netProfit: 68000 },
    { date: 'Jun 2025', capital: 210000, netProfit: 85000 },
    { date: 'Jul 2025', capital: 242000, netProfit: 105000 },
    { date: 'Aug 2025', capital: 278450, netProfit: 128450 },
  ];

  // Capital Allocation Donut
  const allocationData = [
    { name: 'Available for Trading', value: 208450, color: '#06b6d4', pct: '75.0%' },
    { name: 'Used in Open Positions', value: 41770, color: '#f59e0b', pct: '15.0%' },
    { name: 'Cash Reserve', value: 28230, color: '#10b981', pct: '10.0%' },
  ];

  // Open Positions table
  const openPositions = [
    { symbol: 'NIFTY', type: 'CE', qty: 65, avgPrice: 152.5, ltp: 168.0, val: 10920, pnl: 1007.5 },
    { symbol: 'NIFTY', type: 'PE', qty: 65, avgPrice: 148.0, ltp: 135.5, val: -8125, pnl: -812.5 },
    { symbol: 'BANKNIFTY', type: 'CE', qty: 25, avgPrice: 512.0, ltp: 525.5, val: 3375, pnl: 337.5 },
    { symbol: 'SENSEX', type: 'PE', qty: 20, avgPrice: 810.0, ltp: 795.0, val: -3000, pnl: -300 },
  ];

  // Transactions list
  const transactions = [
    { id: 1, date: '15 Aug 2025', type: 'Deposit', amount: 50000, balance: 278450, notes: 'Additional capital' },
    { id: 2, date: '01 Jul 2025', type: 'Withdrawal', amount: -20000, balance: 228450, notes: 'Personal expense' },
    { id: 3, date: '10 May 2025', type: 'Deposit', amount: 100000, balance: 248450, notes: 'Trading capital' },
    { id: 4, date: '15 Mar 2025', type: 'Withdrawal', amount: -30000, balance: 148450, notes: 'Laptop purchase' },
    { id: 5, date: '01 Jan 2025', type: 'Initial Capital', amount: 50000, balance: 50000, notes: 'Starting capital' },
  ];

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
            <span>01 Jan 2025 - 31 Aug 2025</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#121b2d] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs">
            {['1M', '3M', '6M', 'YTD', '1Y', 'All'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  timeRange === r
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

      {/* Row 1: Top 7 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Initial Capital */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Initial Capital</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.initial_capital)}
          </span>
          <span className="text-[10px] text-slate-500 block">-</span>
        </div>

        {/* Total Deposits */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Total Deposits</span>
          <span className="text-base font-bold text-white light:text-slate-900 font-mono-numbers block tracking-tight">
            {formatINR(stats.total_deposits)}
          </span>
          <span className="text-[10px] text-slate-400 block">{stats.deposit_count} transactions</span>
        </div>

        {/* Total Withdrawals */}
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] text-slate-400 font-medium block">Total Withdrawals</span>
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
              <span className="text-[10px] text-slate-400 block">31 Aug 2025</span>
              <span className="text-xs font-bold text-white font-mono-numbers">₹2,78,450</span>
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
                <label className="block text-slate-400 mb-1">Lot Size</label>
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
              <span>You can risk ₹{calcResults.riskAmt} per trade. With {calcForm.stop_loss} points SL, you can take {calcResults.recLots} lots (≈ 1 lot).</span>
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
              <span className="text-xl font-black text-white font-mono-numbers">15.0%</span>
              <span className="text-[9px] text-slate-400">Capital in Use</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-1 border-t border-[#1e293b]">
            <div className="flex justify-between text-slate-400">
              <span>Used in Open Positions</span>
              <span className="font-mono-numbers text-amber-400">₹41,770</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Available for Trading</span>
              <span className="font-mono-numbers text-cyan-400">₹2,08,450</span>
            </div>
            <div className="flex justify-between text-slate-400 font-semibold pt-1">
              <span>Total Capital</span>
              <span className="font-mono-numbers text-white">₹2,78,450</span>
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
                    onClick={() => setTxTab(t.toLowerCase())}
                    className={`px-2 py-0.5 rounded font-semibold ${
                      txTab === t.toLowerCase() ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1"
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
                {transactions.map((tx) => (
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
                        <button className="p-1 rounded text-slate-400 hover:text-blue-400"><Edit2 className="w-3 h-3" /></button>
                        <button className="p-1 rounded text-slate-400 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                {openPositions.map((pos, idx) => (
                  <tr key={idx} className="hover:bg-[#162033]/50">
                    <td className="py-2.5 font-semibold text-white">{pos.symbol}</td>
                    <td className="py-2.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        pos.type === 'CE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
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
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Used Capital</span>
            <span className="text-sm font-bold text-white font-mono-numbers">₹41,770</span>
          </div>
        </div>
      </div>

      {/* Row 5: Capital Milestones & Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Capital Milestones (7 cols) */}
        <div className="lg:col-span-7 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Capital Milestones
          </h2>

          <div className="relative py-4 px-2">
            <div className="absolute top-1/2 left-4 right-4 h-1 bg-[#1e293b] -translate-y-1/2 z-0" />
            <div className="absolute top-1/2 left-4 w-3/5 h-1 bg-gradient-to-r from-emerald-400 to-blue-500 -translate-y-1/2 z-0" />

            <div className="relative z-10 flex items-center justify-between text-center">
              <div>
                <div className="w-5 h-5 rounded-full bg-emerald-400 mx-auto mb-1 ring-4 ring-[#121b2d]" />
                <span className="text-xs font-bold text-white block">₹50K</span>
                <span className="text-[10px] text-slate-400">Initial</span>
              </div>

              <div>
                <div className="w-5 h-5 rounded-full bg-emerald-400 mx-auto mb-1 ring-4 ring-[#121b2d]" />
                <span className="text-xs font-bold text-emerald-400 block">₹1L</span>
                <span className="text-[9px] text-slate-400">Achieved 12 Feb 2025</span>
              </div>

              <div>
                <div className="w-5 h-5 rounded-full bg-emerald-400 mx-auto mb-1 ring-4 ring-[#121b2d]" />
                <span className="text-xs font-bold text-emerald-400 block">₹2L</span>
                <span className="text-[9px] text-slate-400">Achieved 28 Apr 2025</span>
              </div>

              <div>
                <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto mb-1 ring-4 ring-blue-500/30 animate-pulse" />
                <span className="text-xs font-bold text-blue-400 block">₹3L</span>
                <span className="text-[9px] text-blue-300 font-semibold">In Progress 92%</span>
              </div>

              <div>
                <div className="w-5 h-5 rounded-full bg-[#1e293b] mx-auto mb-1 ring-4 ring-[#121b2d]" />
                <span className="text-xs font-bold text-slate-400 block">₹5L</span>
                <span className="text-[10px] text-slate-500">Target</span>
              </div>

              <div>
                <div className="w-5 h-5 rounded-full bg-[#1e293b] mx-auto mb-1 ring-4 ring-[#121b2d]" />
                <span className="text-xs font-bold text-slate-400 block">₹10L</span>
                <span className="text-[10px] text-slate-500">Target</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights (5 cols) */}
        <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Key Insights
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">Your capital has grown by <strong className="text-emerald-400">25.7%</strong> this year.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">You have added <strong className="text-white">₹2,50,000</strong> in deposits (12 transactions).</p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">Keep at least <strong className="text-blue-400">10% cash reserve</strong> for risk management.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">Current position size is within recommended risk limit.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">Avoid over-leveraging. Current utilization is 15%.</p>
            </div>
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300">Consider increasing capital after 3 consecutive profitable months.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
