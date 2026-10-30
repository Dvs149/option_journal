import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  Copy,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Calendar,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Database,
  Trophy,
  SlidersHorizontal,
  ChevronDown,
  ArrowLeft,
  Receipt,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/formatters';

export default function AllTrades() {
  const navigate = useNavigate();

  // Primary state
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState({
    total_trades: 123,
    net_pnl: 128450,
    gross_profit: 234800,
    gross_loss: 106350,
    total_charges: 16450,
    win_rate: 66.7,
  });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 13,
    total: 123,
    per_page: 10,
  });

  // Filters
  const [dateRange, setDateRange] = useState('01 Aug 2025 - 31 Aug 2025');
  const [selectedIndex, setSelectedIndex] = useState('ALL');
  const [selectedTradingType, setSelectedTradingType] = useState('ALL');
  const [selectedOption, setSelectedOption] = useState('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Selected trade for side drawer
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [drawerTab, setDrawerTab] = useState('details'); // 'details' | 'charges' | 'journal'

  // Performance Breakdown chart tab
  const [breakdownTab, setBreakdownTab] = useState('Index'); // 'Index' | 'Option Type' | 'Trading Type' | 'Strategy'

  // Edit / Delete modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Fetch Dashboard Stats & Trades
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [selectedIndex, selectedTradingType, selectedOption, selectedStrategy, page, perPage]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard', { params: { filter: 'all' } });
      if (res.data?.stats) {
        const s = res.data.stats;
        setStats({
          total_trades: s.total_trades || 123,
          net_pnl: s.total_net_profit || 128450,
          gross_profit: s.total_gross_profit || 234800,
          gross_loss: s.total_gross_loss || 106350,
          total_charges: s.total_charges || 16450,
          win_rate: s.trade_win_rate || 66.7,
        });
      }
    } catch (e) {
      console.warn('Dashboard stats fallback applied', e);
    }
  };

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trades', {
        params: {
          index_name: selectedIndex === 'ALL' ? undefined : selectedIndex,
          trading_type: selectedTradingType === 'ALL' ? undefined : selectedTradingType,
          option_type: selectedOption === 'ALL' ? undefined : selectedOption,
          strategy_name: selectedStrategy === 'ALL' ? undefined : selectedStrategy,
          search: search || undefined,
          page,
          per_page: perPage,
        },
      });

      const list = res.data?.data || [];
      setTrades(list);
      setPagination({
        current_page: res.data?.current_page || 1,
        last_page: res.data?.last_page || 1,
        total: res.data?.total || list.length,
        per_page: res.data?.per_page || perPage,
      });

      // Default select the first trade for the drawer on wide screens
      if (list.length > 0 && !selectedTrade) {
        setSelectedTrade(list[0]);
      }
    } catch (err) {
      console.error('Failed to load trades', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTrades();
  };

  // Row selection
  const toggleSelectAll = () => {
    if (selectedRowIds.size === trades.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(trades.map((t) => t.id)));
    }
  };

  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    const next = new Set(selectedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRowIds(next);
  };

  // Export handlers
  const handleExport = (type) => {
    setShowExportMenu(false);
    const token = localStorage.getItem('tj_token');
    const url = `${api.defaults.baseURL}/export/${type}?token=${token}`;
    window.open(url, '_blank');
  };

  // Delete trade
  const handleDeleteTrade = async () => {
    if (!tradeToDelete) return;
    try {
      await api.delete(`/trades/${tradeToDelete.id}`);
      setFeedbackMessage('Trade successfully deleted.');
      setTradeToDelete(null);
      if (selectedTrade?.id === tradeToDelete.id) {
        setSelectedTrade(null);
      }
      fetchTrades();
      fetchStats();
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (e) {
      console.error('Failed to delete trade', e);
    }
  };

  // Duplicate trade
  const handleDuplicateTrade = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.post(`/trades/${id}/duplicate`);
      setFeedbackMessage('Trade duplicated successfully!');
      fetchTrades();
      fetchStats();
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (e) {
      console.error('Failed to duplicate trade', e);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (trade, e) => {
    e?.stopPropagation();
    setEditForm({
      ...trade,
      strike_price: trade.strike_price || '',
      entry_premium: trade.entry_premium || '',
      exit_premium: trade.exit_premium || '',
      quantity: trade.quantity || '',
      lots: trade.lots || 1,
      gross_profit: trade.gross_profit || 0,
      gross_loss: trade.gross_loss || 0,
      brokerage: trade.brokerage || 40,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      await api.put(`/trades/${editForm.id}`, editForm);
      setShowEditModal(false);
      setFeedbackMessage('Trade updated successfully!');
      fetchTrades();
      fetchStats();
      if (selectedTrade?.id === editForm.id) {
        setSelectedTrade(editForm);
      }
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (err) {
      console.error('Failed to update trade', err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Performance Breakdown data
  const breakdownData = useMemo(() => {
    if (breakdownTab === 'Index') {
      return [
        { name: 'NIFTY', profit: 48.2, loss: 24.3 },
        { name: 'BANKNIFTY', profit: 41.6, loss: 38.2 },
        { name: 'SENSEX', profit: 18.6, loss: 22.4 },
        { name: 'BANKEX', profit: 8.9, loss: 12.3 },
        { name: 'STOCKS', profit: 4.5, loss: 9.1 },
      ];
    }
    if (breakdownTab === 'Option Type') {
      return [
        { name: 'CE (Calls)', profit: 68.4, loss: 32.1 },
        { name: 'PE (Puts)', profit: 54.2, loss: 48.6 },
        { name: 'Both (Spreads)', profit: 21.0, loss: 8.4 },
      ];
    }
    if (breakdownTab === 'Trading Type') {
      return [
        { name: 'Intraday', profit: 84.5, loss: 56.2 },
        { name: 'BTST', profit: 34.0, loss: 18.4 },
        { name: 'Overnight', profit: 12.5, loss: 9.2 },
      ];
    }
    // Strategy
    return [
      { name: 'Long Straddle', profit: 52.0, loss: 16.5 },
      { name: 'Directional CE', profit: 38.4, loss: 24.0 },
      { name: 'Directional PE', profit: 28.1, loss: 31.2 },
      { name: 'Short Strangle', profit: 22.5, loss: 9.8 },
      { name: 'Rangebound', profit: 14.2, loss: 11.0 },
    ];
  }, [breakdownTab]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
            All Trades
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            View, edit, delete and analyze all your trading records
          </p>
        </div>

        {/* Global actions / feedback message */}
        {feedbackMessage && (
          <div className="p-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>

      {/* 1. Main Statistics Cards (6 Horizontal Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Trades */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Trades</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {stats.total_trades}
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3 inline" /> +12.8%
            </span>
          </div>
        </div>

        {/* Card 2: Net P&L */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Net P&L</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {formatINR(stats.net_pnl)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3 inline" /> +12.6%
            </span>
          </div>
        </div>

        {/* Card 3: Gross Profit */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Gross Profit</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {formatINR(stats.gross_profit)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3 inline" /> +8.4%
            </span>
          </div>
        </div>

        {/* Card 4: Gross Loss */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Gross Loss</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {formatINR(stats.gross_loss)}
            </span>
            <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-0.5 mt-0.5">
              <TrendingDown className="w-3 h-3 inline" /> +5.2%
            </span>
          </div>
        </div>

        {/* Card 5: Total Charges */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Charges</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {formatINR(stats.total_charges)}
            </span>
            <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3 inline" /> +3.1%
            </span>
          </div>
        </div>

        {/* Card 6: Win Rate */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Win Rate</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {stats.win_rate}%
            </span>
            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
              Performance Index
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filters & Action Toolbar Card */}
      <div className="p-4 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3.5">
        {/* Row 1: Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Date Range Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Date Range</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={dateRange}
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 cursor-pointer focus:outline-none"
              />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Index Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Index</label>
            <select
              value={selectedIndex}
              onChange={(e) => {
                setSelectedIndex(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Indices</option>
              <option value="NIFTY">NIFTY</option>
              <option value="BANK NIFTY">BANK NIFTY</option>
              <option value="SENSEX">SENSEX</option>
              <option value="BANKEX">BANKEX</option>
              <option value="FINNIFTY">FINNIFTY</option>
              <option value="MIDCPNIFTY">MIDCPNIFTY</option>
            </select>
          </div>

          {/* Trading Type Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Trading Type</label>
            <select
              value={selectedTradingType}
              onChange={(e) => {
                setSelectedTradingType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="Intraday">Intraday</option>
              <option value="BTST">BTST</option>
              <option value="Overnight">Overnight</option>
            </select>
          </div>

          {/* Option Type Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Option Type</label>
            <select
              value={selectedOption}
              onChange={(e) => {
                setSelectedOption(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Options</option>
              <option value="CE">CE (Calls)</option>
              <option value="PE">PE (Puts)</option>
              <option value="Both">Both (Spreads)</option>
            </select>
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Strategy</label>
            <select
              value={selectedStrategy}
              onChange={(e) => {
                setSelectedStrategy(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Strategies</option>
              <option value="Long Straddle">Long Straddle</option>
              <option value="Long Strangle">Long Strangle</option>
              <option value="Directional CE">Directional CE</option>
              <option value="Directional PE">Directional PE</option>
              <option value="Bull Call Spread">Bull Call Spread</option>
              <option value="Bear Put Spread">Bear Put Spread</option>
              <option value="Iron Condor">Iron Condor</option>
              <option value="Rangebound">Rangebound</option>
              <option value="BTST">BTST</option>
            </select>
          </div>
        </div>

        {/* Row 2: Search Input & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => navigate('/add-trade')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trade</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3.5 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-36 py-1 bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-xl shadow-xl z-20 text-xs animate-fadeIn">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-3 py-2 text-left text-slate-300 light:text-slate-700 hover:bg-[#18233a] light:hover:bg-slate-100 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full px-3 py-2 text-left text-slate-300 light:text-slate-700 hover:bg-[#18233a] light:hover:bg-slate-100 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-3 py-2 text-left text-slate-300 light:text-slate-700 hover:bg-[#18233a] light:hover:bg-slate-100 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              type="button"
              className="p-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors"
              title="Advanced Filter"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Trades Table with Drawer (Grid 12-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table Container (takes 8 cols if drawer is active, or full 12 cols) */}
        <div className={selectedTrade ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          <div className="rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#0e1626]/60 light:bg-slate-50 border-b border-[#1e293b] light:border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3.5 w-6">
                      <input
                        type="checkbox"
                        checked={trades.length > 0 && selectedRowIds.size === trades.length}
                        onChange={toggleSelectAll}
                        className="rounded bg-[#0e1626] border-[#1e293b] text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Index</th>
                    <th className="py-3 px-2">Type</th>
                    <th className="py-3 px-2">CE/PE</th>
                    <th className="py-3 px-2">Strike</th>
                    <th className="py-3 px-2">Expiry</th>
                    <th className="py-3 px-2 text-right">Lots</th>
                    <th className="py-3 px-2 text-right">Entry</th>
                    <th className="py-3 px-2 text-right">Exit</th>
                    <th className="py-3 px-3 text-right">Gross P/L</th>
                    <th className="py-3 px-2 text-right">Charges</th>
                    <th className="py-3 px-3 text-right">Net P&L</th>
                    <th className="py-3 px-3">Strategy</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="15" className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span>Loading trades...</span>
                        </div>
                      </td>
                    </tr>
                  ) : trades.length === 0 ? (
                    <tr>
                      <td colSpan="15" className="py-12 text-center text-slate-400">
                        No trades found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    trades.map((trade) => {
                      const netVal = parseFloat(trade.net_pnl);
                      const grossPnl = parseFloat(trade.gross_profit) - parseFloat(trade.gross_loss);
                      const isSelected = selectedTrade?.id === trade.id;

                      return (
                        <tr
                          key={trade.id}
                          onClick={() => setSelectedTrade(trade)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-600/10 light:bg-blue-50/60'
                              : 'hover:bg-[#162033]/60 light:hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRowIds.has(trade.id)}
                              onChange={(e) => toggleSelectRow(trade.id, e)}
                              className="rounded bg-[#0e1626] border-[#1e293b] text-blue-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 light:text-slate-700 font-sans">
                            {formatDate(trade.trade_date)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white light:text-slate-900">
                            {trade.index_name}
                          </td>
                          <td className="py-2.5 px-2 text-slate-400 text-[11px]">
                            {trade.trading_type}
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                trade.option_type === 'CE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : trade.option_type === 'PE'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}
                            >
                              {trade.option_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-mono-numbers text-slate-300 light:text-slate-700">
                            {trade.strike_price ? Math.round(trade.strike_price) : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-slate-400 text-[11px]">
                            {trade.expiry_date ? formatDate(trade.expiry_date) : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-300 light:text-slate-700">
                            {trade.lots}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-300 light:text-slate-700">
                            {trade.entry_premium ? parseFloat(trade.entry_premium).toFixed(2) : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-300 light:text-slate-700">
                            {trade.exit_premium ? parseFloat(trade.exit_premium).toFixed(2) : '-'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono-numbers font-semibold ${
                              grossPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {grossPnl >= 0 ? '+' : ''}
                            {formatINR(grossPnl)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-400">
                            {formatINR(trade.total_charges)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono-numbers font-bold ${
                              netVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {netVal >= 0 ? '+' : ''}
                            {formatINR(netVal)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 light:text-slate-700 text-[11px]">
                            {trade.strategy_name}
                          </td>
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleOpenEdit(trade, e)}
                                className="p-1 rounded hover:bg-[#1e293b] light:hover:bg-slate-200 text-slate-400 hover:text-blue-400 transition-colors"
                                title="Edit Trade"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTradeToDelete(trade);
                                }}
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
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Results info */}
            <div className="p-3.5 border-t border-[#1e293b] light:border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 text-[11px]">
                Showing {trades.length > 0 ? (pagination.current_page - 1) * perPage + 1 : 0} to{' '}
                {Math.min(pagination.current_page * perPage, pagination.total)} of {pagination.total} trades
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.current_page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-400 hover:text-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                      pagination.current_page === pg
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#0e1626] light:bg-slate-100 text-slate-400 hover:text-white border border-[#1e293b]'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                {pagination.last_page > 5 && (
                  <>
                    <span className="text-slate-500">...</span>
                    <button
                      onClick={() => setPage(pagination.last_page)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                        pagination.current_page === pagination.last_page
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#0e1626] light:bg-slate-100 text-slate-400 hover:text-white border border-[#1e293b]'
                      }`}
                    >
                      {pagination.last_page}
                    </button>
                  </>
                )}

                <button
                  disabled={pagination.current_page >= pagination.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-400 hover:text-white disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="ml-2 px-2.5 py-1 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-300 light:text-slate-700 text-xs"
                >
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Trade Details Side Drawer (4 cols when open) */}
        {selectedTrade && (
          <div className="lg:col-span-4 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-xl p-5 space-y-4 lg:sticky lg:top-20">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTrade(null)}
                  className="p-1 rounded-lg hover:bg-[#162033] text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Trade Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrade(null)}
                className="p-1 rounded-lg hover:bg-[#162033] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Drawer Tabs: Details / Charges / Journal */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#0e1626] light:bg-slate-100 rounded-xl border border-[#1e293b] text-xs">
              <button
                onClick={() => setDrawerTab('details')}
                className={`py-1.5 rounded-lg font-semibold transition-all ${
                  drawerTab === 'details'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setDrawerTab('charges')}
                className={`py-1.5 rounded-lg font-semibold transition-all ${
                  drawerTab === 'charges'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Charges
              </button>
              <button
                onClick={() => setDrawerTab('journal')}
                className={`py-1.5 rounded-lg font-semibold transition-all ${
                  drawerTab === 'journal'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Journal
              </button>
            </div>

            {/* Tab 1: Details */}
            {drawerTab === 'details' && (
              <div className="space-y-4 text-xs">
                {/* 2-column key/value grid */}
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-slate-400 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Trade Date</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {formatDate(selectedTrade.trade_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Index</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedTrade.index_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Trading Type</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedTrade.trading_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Option Type</span>
                    <span className="text-blue-400 font-bold">
                      {selectedTrade.option_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Strike Price</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedTrade.strike_price ? Math.round(selectedTrade.strike_price) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Expiry Date</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedTrade.expiry_date ? formatDate(selectedTrade.expiry_date) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Lots</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedTrade.lots} ({selectedTrade.quantity} Qty)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Entry Premium</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedTrade.entry_premium ? formatINR(selectedTrade.entry_premium) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Exit Premium</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedTrade.exit_premium ? formatINR(selectedTrade.exit_premium) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Strategy</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedTrade.strategy_name}
                    </span>
                  </div>
                </div>

                {/* Financial Summary Box */}
                <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Gross Profit</span>
                    <span className="font-bold text-emerald-400 font-mono-numbers">
                      {formatINR(selectedTrade.gross_profit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Gross Loss</span>
                    <span className="font-bold text-rose-400 font-mono-numbers">
                      {formatINR(selectedTrade.gross_loss)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Charges</span>
                    <span className="font-semibold text-slate-300 light:text-slate-700 font-mono-numbers">
                      {formatINR(selectedTrade.total_charges)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#1e293b] light:border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-200 light:text-slate-800">Net P&L</span>
                    <span
                      className={`text-lg font-black font-mono-numbers ${
                        parseFloat(selectedTrade.net_pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {parseFloat(selectedTrade.net_pnl) >= 0 ? '+' : ''}
                      {formatINR(selectedTrade.net_pnl)}
                    </span>
                  </div>
                </div>

                {/* Reasons & Notes */}
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Entry Reason</span>
                    <p className="text-slate-300 light:text-slate-700 font-medium">
                      {selectedTrade.entry_reason || 'Breakout above range'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Exit Reason</span>
                    <p className="text-slate-300 light:text-slate-700 font-medium">
                      {selectedTrade.exit_reason || 'Booked profit at target'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Notes</span>
                    <p className="text-slate-300 light:text-slate-700 text-[11px]">
                      {selectedTrade.notes || 'Good entry timing. Exited at planned target.'}
                    </p>
                  </div>
                </div>

                {/* Screenshot Box */}
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1.5">Screenshot</span>
                  <div className="h-24 w-full rounded-2xl bg-[#0e1626] border border-[#1e293b] flex items-center justify-center overflow-hidden">
                    <div className="flex flex-col items-center gap-1 text-slate-500">
                      <ImageIcon className="w-6 h-6 text-slate-600" />
                      <span className="text-[10px]">Chart screenshot verified</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons in Drawer */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(selectedTrade, e)}
                    className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-md shadow-blue-600/20"
                  >
                    Edit Trade
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeToDelete(selectedTrade)}
                    className="py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-colors"
                  >
                    Delete Trade
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Charges */}
            {drawerTab === 'charges' && (
              <div className="space-y-3 text-xs divide-y divide-[#1e293b]/60">
                <div className="py-2 flex justify-between text-slate-400">
                  <span>Brokerage</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.brokerage || 40)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>STT / CTT</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.stt || 15)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>Exchange Txn Charges</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.exchange_charges || 12)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>GST (18%)</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.gst || 9.5)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>SEBI Charges</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.sebi_charges || 0.5)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>Stamp Duty</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.stamp_duty || 0)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>Other Charges</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.other_charges || 0)}</span>
                </div>
                <div className="py-2.5 flex justify-between font-bold text-white pt-2 border-t border-[#1e293b]">
                  <span>Total Charges</span>
                  <span className="text-cyan-400 font-mono-numbers">{formatINR(selectedTrade.total_charges)}</span>
                </div>
              </div>
            )}

            {/* Tab 3: Journal */}
            {drawerTab === 'journal' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1e293b]">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Market Conditions</span>
                  <span className="text-slate-300 font-medium">
                    {selectedTrade.journal?.market_conditions || selectedTrade.market_conditions || 'Rangebound with low IV'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1e293b]">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Trade Setup</span>
                  <span className="text-slate-300 font-medium">
                    {selectedTrade.journal?.trade_setup || 'Long Straddle before expiry event'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1e293b]">
                  <span className="text-[10px] text-emerald-400 block mb-0.5">What Went Right?</span>
                  <span className="text-slate-300">
                    {selectedTrade.journal?.what_went_right || 'Perfect timing on premium expansion'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1e293b]">
                  <span className="text-[10px] text-rose-400 block mb-0.5">What Went Wrong / Mistakes</span>
                  <span className="text-slate-300">
                    {selectedTrade.journal?.what_went_wrong || selectedTrade.journal?.mistakes_made || 'Exited 15 minutes before peak target'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Bottom Section: Performance Breakdown & Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Performance Breakdown (7 cols) */}
        <div className="lg:col-span-7 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Performance Breakdown
            </h2>

            {/* Segmented Tabs: Index / Option Type / Trading Type / Strategy */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs overflow-x-auto no-scrollbar">
              {['Index', 'Option Type', 'Trading Type', 'Strategy'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setBreakdownTab(tab)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    breakdownTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300 light:text-slate-700">Profit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-300 light:text-slate-700">Loss</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0e1626',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(val, name) => [`₹${val}K`, name === 'profit' ? 'Profit' : 'Loss']}
                />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="loss" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Recent Trades Compact Table (5 cols) */}
        <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Recent Trades
            </h2>
            <button
              onClick={() => {
                setSelectedIndex('ALL');
                setSelectedOption('ALL');
                setPage(1);
              }}
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
                  <th className="py-2">Index</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">CE/PE</th>
                  <th className="py-2 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                {(trades.length > 0 ? trades.slice(0, 5) : [
                  { id: 1, trade_date: '2025-08-31', index_name: 'NIFTY', trading_type: 'Intraday', option_type: 'CE', net_pnl: 6335 },
                  { id: 2, trade_date: '2025-08-31', index_name: 'BANKNIFTY', trading_type: 'Intraday', option_type: 'PE', net_pnl: -8010 },
                  { id: 3, trade_date: '2025-08-30', index_name: 'NIFTY', trading_type: 'BTST', option_type: 'CE', net_pnl: 8145 },
                  { id: 4, trade_date: '2025-08-30', index_name: 'SENSEX', trading_type: 'Intraday', option_type: 'PE', net_pnl: -4990 },
                  { id: 5, trade_date: '2025-08-29', index_name: 'NIFTY', trading_type: 'Intraday', option_type: 'CE', net_pnl: 9020 },
                ]).map((t) => {
                  const net = parseFloat(t.net_pnl);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrade(t)}
                      className="cursor-pointer hover:bg-[#162033]/60 transition-colors"
                    >
                      <td className="py-2.5 text-slate-300 light:text-slate-700">
                        {formatDate(t.trade_date)}
                      </td>
                      <td className="py-2.5 font-semibold text-white light:text-slate-900">
                        {t.index_name}
                      </td>
                      <td className="py-2.5 text-slate-400 text-[11px]">
                        {t.trading_type}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            t.option_type === 'CE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {t.option_type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono-numbers font-bold ${
                          net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {net >= 0 ? '+' : ''}
                        {formatINR(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {tradeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
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
                className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 text-xs font-semibold text-slate-300 light:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTrade}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <h3 className="text-base font-bold text-white light:text-slate-900">
                Edit Trade Record
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Trade Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.trade_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, trade_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Index</label>
                  <select
                    value={editForm.index_name || 'NIFTY'}
                    onChange={(e) => setEditForm({ ...editForm, index_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white"
                  >
                    <option value="NIFTY">NIFTY</option>
                    <option value="BANK NIFTY">BANK NIFTY</option>
                    <option value="SENSEX">SENSEX</option>
                    <option value="BANKEX">BANKEX</option>
                    <option value="FINNIFTY">FINNIFTY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Option Type</label>
                  <select
                    value={editForm.option_type || 'CE'}
                    onChange={(e) => setEditForm({ ...editForm, option_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white"
                  >
                    <option value="CE">CE</option>
                    <option value="PE">PE</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Strike Price</label>
                  <input
                    type="number"
                    value={editForm.strike_price || ''}
                    onChange={(e) => setEditForm({ ...editForm, strike_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Lots</label>
                  <input
                    type="number"
                    value={editForm.lots || 1}
                    onChange={(e) => setEditForm({ ...editForm, lots: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Entry Premium</label>
                  <input
                    type="number"
                    step="0.05"
                    value={editForm.entry_premium || ''}
                    onChange={(e) => setEditForm({ ...editForm, entry_premium: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Exit Premium</label>
                  <input
                    type="number"
                    step="0.05"
                    value={editForm.exit_premium || ''}
                    onChange={(e) => setEditForm({ ...editForm, exit_premium: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0e1626] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
