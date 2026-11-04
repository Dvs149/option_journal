import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trophy,
  TrendingDown,
  TrendingUp,
  Search,
  Plus,
  Calendar,
  Smile,
  Meh,
  Frown,
  Star,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Tag,
  X,
  Upload,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/formatters';
import { useFilter } from '../context/FilterContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import EditTradeModal from '../components/trades/EditTradeModal';

const resolveScreenshot = (tradeOrUrl) => {
  if (!tradeOrUrl) return null;
  let url = typeof tradeOrUrl === 'string' ? tradeOrUrl : (tradeOrUrl.screenshot_url || tradeOrUrl.screenshot_path);
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (typeof window !== 'undefined' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        const clientHost = window.location.hostname || '127.0.0.1';
        parsed.hostname = (clientHost === 'localhost') ? '127.0.0.1' : clientHost;
        return parsed.toString();
      }
    } catch (e) {
      // ignore
    }
    return url;
  }
  const clean = url.replace(/^\/?(storage\/)?/, '');
  return `/storage/${clean}`;
};

const getTradeScreenshots = (trade) => {
  if (!trade) return [];
  if (trade.screenshots_list && Array.isArray(trade.screenshots_list) && trade.screenshots_list.length > 0) {
    return trade.screenshots_list.map((s) => ({
      id: s.id,
      url: resolveScreenshot(s.url || s.path),
      path: s.path,
      filename: s.filename || 'Screenshot',
      caption: s.caption || '',
    }));
  }
  if (trade.screenshots && Array.isArray(trade.screenshots) && trade.screenshots.length > 0) {
    return trade.screenshots.map((s) => ({
      id: s.id,
      url: resolveScreenshot(s.url || s.path),
      path: s.path,
      filename: s.filename || (s.path ? s.path.split('/').pop() : 'Screenshot'),
      caption: s.caption || '',
    }));
  }
  const single = resolveScreenshot(trade);
  if (single) {
    return [{
      id: null,
      url: single,
      path: trade.screenshot_path,
      filename: 'Chart Screenshot',
      caption: '',
    }];
  }
  return [];
};

const getLegPrices = (trade) => {
  if (!trade) return { ceEntry: null, peEntry: null, ceExit: null, peExit: null };
  let ceEntry = trade.ce_entry_price != null ? parseFloat(trade.ce_entry_price) : null;
  let peEntry = trade.pe_entry_price != null ? parseFloat(trade.pe_entry_price) : null;
  let ceExit = trade.ce_exit_price != null ? parseFloat(trade.ce_exit_price) : null;
  let peExit = trade.pe_exit_price != null ? parseFloat(trade.pe_exit_price) : null;

  if (ceEntry === null && peEntry === null) {
    const raw = (trade.journal?.trade_setup || '') + ' ' + (trade.notes || '');
    const m = raw.match(/CE Entry:\s*₹?([0-9.]+),\s*Exit:\s*₹?([0-9.]+).*PE Entry:\s*₹?([0-9.]+),\s*Exit:\s*₹?([0-9.]+)/i);
    if (m) {
      ceEntry = parseFloat(m[1]);
      ceExit = parseFloat(m[2]);
      peEntry = parseFloat(m[3]);
      peExit = parseFloat(m[4]);
    }
  }

  return { ceEntry, peEntry, ceExit, peExit };
};

const formatJournalEntry = (t) => {
  if (!t) return null;
  const net = parseFloat(t.net_pnl) || 0;
  const j = t.journal || {};
  return {
    id: t.id,
    trade_id: t.id,
    date: formatDate(t.trade_date),
    index_name: t.index_name,
    option_type: t.option_type,
    strategy: t.strategy_name,
    net_pnl: net,
    mood: net > 0 ? 'happy' : (net < 0 ? 'sad' : 'neutral'),
    rating: net > 0 ? 4 : 2,
    tags: [t.index_name, t.strategy_name].filter(Boolean),
    notes: j.personal_notes || j.trade_setup || t.notes || 'No journal notes logged.',
    what_went_right: j.what_went_right ? [j.what_went_right] : [],
    what_went_wrong: j.what_went_wrong ? [j.what_went_wrong] : [],
    lessons_learned: j.lessons_learned,
    market_conditions: j.market_conditions,
    raw: t,
  };
};

export default function TradingJournal() {
  const navigate = useNavigate();
  const { dateRangeDisplay } = useFilter();
  const { showToast } = useToast();
  const { isKite } = useTheme();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState('ALL');
  const [journalEntries, setJournalEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerTab, setDrawerTab] = useState('trade_details');
  const [uploadingDrawerScreenshot, setUploadingDrawerScreenshot] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [summaryStats, setSummaryStats] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const tradeScreenshots = useMemo(() => {
    return selectedEntry?.raw ? getTradeScreenshots(selectedEntry.raw) : [];
  }, [selectedEntry]);

  const selLegs = useMemo(() => {
    return selectedEntry?.raw ? getLegPrices(selectedEntry.raw) : { ceEntry: null, peEntry: null, ceExit: null, peExit: null };
  }, [selectedEntry]);

  const handleDrawerScreenshotUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedEntry) return;

    try {
      setUploadingDrawerScreenshot(true);
      const formData = new FormData();
      for (const file of files) {
        formData.append('screenshots[]', file);
      }
      const res = await api.post(`/trades/${selectedEntry.id}/screenshots`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.trade) {
        const updated = formatJournalEntry(res.data.trade);
        setSelectedEntry(updated);
        setJournalEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
      showToast('✓ Screenshot uploaded successfully!');
    } catch (err) {
      showToast('Failed to upload screenshot.', 'error');
    } finally {
      setUploadingDrawerScreenshot(false);
      e.target.value = '';
    }
  };

  const handleDrawerDeleteScreenshot = async (screenshotId) => {
    if (!selectedEntry || !screenshotId) return;
    try {
      setUploadingDrawerScreenshot(true);
      const res = await api.delete(`/trades/${selectedEntry.id}/screenshots/${screenshotId}`);
      if (res.data?.trade) {
        const updated = formatJournalEntry(res.data.trade);
        setSelectedEntry(updated);
        setJournalEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
      showToast('✓ Screenshot removed successfully!');
    } catch (err) {
      showToast('Failed to delete screenshot.', 'error');
    } finally {
      setUploadingDrawerScreenshot(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchJournal();
  }, [selectedType, selectedStrategy, page, perPage, debouncedSearch]);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const res = await api.get('/journal', {
        params: {
          strategy_name: selectedStrategy === 'ALL' ? undefined : selectedStrategy,
          option_type: selectedType === 'ALL' ? undefined : selectedType,
          search: debouncedSearch ? debouncedSearch.trim() : undefined,
          page,
          per_page: perPage,
        },
      });
      const data = res.data?.data || [];
      const formatted = data.map(formatJournalEntry);
      setJournalEntries(formatted);

      if (res.data?.summary_stats) {
        setSummaryStats(res.data.summary_stats);
      }

      setPagination({
        current_page: res.data?.current_page || 1,
        last_page: res.data?.last_page || 1,
        total: res.data?.total !== undefined ? res.data.total : formatted.length,
        from: res.data?.from || (formatted.length > 0 ? (page - 1) * perPage + 1 : 0),
        to: res.data?.to || (formatted.length > 0 ? (page - 1) * perPage + formatted.length : 0),
        per_page: res.data?.per_page || perPage,
      });

      if (formatted.length > 0) {
        setSelectedEntry((prev) => {
          if (!prev) return formatted[0];
          const found = formatted.find((x) => x.id === prev.id);
          return found || formatted[0];
        });
      } else {
        setSelectedEntry(null);
      }
    } catch (e) {
      console.warn('Failed to load journal entries', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    try {
      setIsDeletingEntry(true);
      await api.delete(`/trades/${entryToDelete.id}`);
      showToast('Trade & journal record deleted successfully');
      setEntryToDelete(null);
      if (selectedEntry?.id === entryToDelete.id) {
        setSelectedEntry(null);
      }
      fetchJournal();
    } catch (e) {
      console.error('Failed to delete trade', e);
      showToast(e.response?.data?.message || 'Failed to delete trade', 'error');
    } finally {
      setIsDeletingEntry(false);
    }
  };

  // Top Metrics derived from real data
  const stats = useMemo(() => {
    if (summaryStats) {
      return {
        total_entries: summaryStats.total_entries,
        total_entries_pct: '0.0%',
        successful_trades: summaryStats.successful_trades,
        win_rate: `${summaryStats.win_rate}%`,
        failed_trades: summaryStats.failed_trades,
        failed_pct: `${summaryStats.failed_pct}%`,
        best_trade_pnl: summaryStats.best_trade_pnl,
        best_trade_date: summaryStats.best_trade_date,
        worst_trade_pnl: summaryStats.worst_trade_pnl,
        worst_trade_date: summaryStats.worst_trade_date,
      };
    }

    const total = pagination.total || journalEntries.length;
    const wins = journalEntries.filter((e) => e.net_pnl > 0).length;
    const losses = journalEntries.filter((e) => e.net_pnl < 0).length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
    const lossRate = total > 0 ? ((losses / total) * 100).toFixed(1) : '0.0';

    let best = null;
    let worst = null;
    journalEntries.forEach((e) => {
      if (best === null || e.net_pnl > best.net_pnl) best = e;
      if (worst === null || e.net_pnl < worst.net_pnl) worst = e;
    });

    return {
      total_entries: total,
      total_entries_pct: '0.0%',
      successful_trades: wins,
      win_rate: `${winRate}%`,
      failed_trades: losses,
      failed_pct: `${lossRate}%`,
      best_trade_pnl: best && best.net_pnl > 0 ? best.net_pnl : 0,
      best_trade_date: best && best.net_pnl > 0 ? best.date : '-',
      worst_trade_pnl: worst && worst.net_pnl < 0 ? worst.net_pnl : 0,
      worst_trade_date: worst && worst.net_pnl < 0 ? worst.date : '-',
    };
  }, [journalEntries, pagination.total, summaryStats]);

  // Sentiment Donut Data derived from real entries
  const sentimentPieData = useMemo(() => {
    const happy = journalEntries.filter((e) => e.mood === 'happy').length;
    const neutral = journalEntries.filter((e) => e.mood === 'neutral').length;
    const sad = journalEntries.filter((e) => e.mood === 'sad').length;
    const tot = happy + neutral + sad || 1;
    return [
      { name: 'Positive', value: happy, pct: `${((happy / tot) * 100).toFixed(1)}%`, color: '#10b981' },
      { name: 'Neutral', value: neutral, pct: `${((neutral / tot) * 100).toFixed(1)}%`, color: '#3b82f6' },
      { name: 'Negative', value: sad, pct: `${((sad / tot) * 100).toFixed(1)}%`, color: '#f43f5e' },
    ];
  }, [journalEntries]);

  // Strategy Performance List (From Journal)
  const strategyPerfList = useMemo(() => {
    const map = {};
    journalEntries.forEach((e) => {
      const s = e.strategy || 'Other';
      if (!map[s]) map[s] = { count: 0, wins: 0 };
      map[s].count++;
      if (e.net_pnl > 0) map[s].wins++;
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      count: data.count,
      winRate: parseFloat(((data.wins / data.count) * 100).toFixed(1)),
      color: '#06b6d4',
    }));
  }, [journalEntries]);

  // Common Tags List
  const commonTagsList = useMemo(() => {
    const map = {};
    journalEntries.forEach((e) => {
      (e.tags || []).forEach((tag) => {
        map[tag] = (map[tag] || 0) + 1;
      });
    });
    const maxVal = Math.max(1, ...Object.values(map));
    return Object.entries(map).map(([tag, count]) => ({
      tag,
      count,
      max: maxVal,
    }));
  }, [journalEntries]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
            Trading Journal
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Document your trades, thoughts, strategies and lessons to become a better trader
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>{dateRangeDisplay || 'All Time'}</span>
        </div>
      </div>

      {/* Row 1: Top 5 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Journal Entries */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Journal Entries</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {stats.total_entries}
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3 inline" /> {stats.total_entries_pct}
            </span>
          </div>
        </div>

        {/* Successful Trades */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Successful Trades</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-emerald-400 font-mono-numbers block">
              {stats.successful_trades}
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 block mt-0.5">
              {stats.win_rate} win rate
            </span>
          </div>
        </div>

        {/* Failed Trades */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Failed Trades</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-rose-400 font-mono-numbers block">
              {stats.failed_trades}
            </span>
            <span className="text-[10px] font-semibold text-rose-400 block mt-0.5">
              {stats.failed_pct}
            </span>
          </div>
        </div>

        {/* Best Trade */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Best Trade</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-emerald-400 font-mono-numbers block">
              +{formatINR(stats.best_trade_pnl)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {stats.best_trade_date && stats.best_trade_date !== '-' ? formatDate(stats.best_trade_date) : '-'}
            </span>
          </div>
        </div>

        {/* Worst Trade */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Worst Trade</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-rose-400 font-mono-numbers block">
              {formatINR(stats.worst_trade_pnl)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {stats.worst_trade_date && stats.worst_trade_date !== '-' ? formatDate(stats.worst_trade_date) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Journal Entries Table (Left 7 cols) & Journal Details Drawer (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Journal Entries Table Card */}
        <div className="lg:col-span-7 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Journal Entries
            </h2>

            {/* Search, Filter & Add Journal button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by notes, strategy..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-xs text-white light:text-slate-900 focus:outline-none w-44"
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-xs text-white light:text-slate-900 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="CE">CE</option>
                <option value="PE">PE</option>
                <option value="Both">Both</option>
              </select>

              <button
                type="button"
                onClick={() => navigate('/add-trade')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-600/30 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Add Journal
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#0e1626]/60 light:bg-slate-50 border-b border-[#1e293b] text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-2">Index</th>
                  <th className="py-2.5 px-2">Type</th>
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3 text-right">P&L</th>
                  <th className="py-2.5 px-2 text-center">Mood</th>
                  <th className="py-2.5 px-2 text-center">Rating</th>
                  <th className="py-2.5 px-3">Tags</th>
                  <th className="py-2.5 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500 text-xs">
                      Loading journal reflections...
                    </td>
                  </tr>
                ) : journalEntries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500 text-xs">
                      No journal entries recorded yet. Add your trades to document reflections here.
                    </td>
                  </tr>
                ) : (
                  journalEntries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-600/10 light:bg-blue-50'
                          : 'hover:bg-[#162033]/60 light:hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-300 light:text-slate-700">{entry.date}</td>
                      <td className="py-2.5 px-2 font-semibold text-white light:text-slate-900">{entry.index_name}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            entry.option_type === 'CE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : entry.option_type === 'PE'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {entry.option_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 light:text-slate-700">{entry.strategy}</td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono-numbers font-bold ${
                          entry.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {entry.net_pnl >= 0 ? '+' : ''}{formatINR(entry.net_pnl)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {entry.mood === 'happy' ? (
                          <Smile className="w-4 h-4 text-emerald-400 inline" />
                        ) : entry.mood === 'sad' ? (
                          <Frown className="w-4 h-4 text-rose-400 inline" />
                        ) : (
                          <Meh className="w-4 h-4 text-amber-400 inline" />
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-300 font-mono-numbers">
                        {entry.rating}/5
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#0e1626] border border-[#1e293b] text-slate-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEntry(entry);
                            }}
                            className="p-1 rounded hover:bg-[#1e293b] text-slate-400 hover:text-blue-400"
                          >
                            <Eye className="w-3.5 h-3.5" />
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

          {/* Dynamic Pagination */}
          <div className="pt-3 border-t border-[#1e293b] light:border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              {pagination.total > 0 ? (
                <span>
                  Showing <strong className="text-white light:text-slate-900 font-mono-numbers">{pagination.from || 1}</strong> to{' '}
                  <strong className="text-white light:text-slate-900 font-mono-numbers">{pagination.to || journalEntries.length}</strong> of{' '}
                  <strong className="text-white light:text-slate-900 font-mono-numbers">{pagination.total}</strong> entries
                </span>
              ) : (
                <span>No entries recorded</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Prev Button */}
              <button
                type="button"
                disabled={pagination.current_page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-slate-400 hover:text-white light:hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Number Buttons */}
              {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                .filter((p) => {
                  if (p === 1 || p === pagination.last_page) return true;
                  if (Math.abs(p - pagination.current_page) <= 1) return true;
                  return false;
                })
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    acc.push('ellipsis-' + p);
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item) => {
                  if (typeof item === 'string') {
                    return (
                      <span key={item} className="px-1 text-slate-600">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = pagination.current_page === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={loading}
                      onClick={() => setPage(item)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold font-mono-numbers transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-slate-400 hover:text-white light:hover:text-slate-900'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}

              {/* Next Button */}
              <button
                type="button"
                disabled={pagination.current_page >= pagination.last_page || loading}
                onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-slate-400 hover:text-white light:hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Per Page Selector */}
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="ml-2 px-2.5 py-1 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-slate-300 light:text-slate-700 text-xs focus:outline-none"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: Journal Details Drawer Card */}
        {selectedEntry && (
          <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4 lg:sticky lg:top-20">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="p-1 rounded-lg hover:bg-[#162033] light:hover:bg-slate-100 text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors"
                  title="Close Drawer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Journal Details
                </h3>
              </div>

              {/* Action Icons: Edit, Delete, Close */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEntryToEdit(selectedEntry.raw || selectedEntry)}
                  className="p-1.5 rounded-lg hover:bg-[#162033] light:hover:bg-slate-100 text-slate-400 hover:text-blue-400 transition-colors"
                  title="Edit Trade Record"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEntryToDelete(selectedEntry)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete Trade Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="p-1.5 rounded-lg hover:bg-[#162033] light:hover:bg-slate-100 text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors ml-0.5"
                  title="Close Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4 Tabs: Trade Details / Journal Notes / Screenshots / Lessons */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#0e1626] light:bg-slate-100 rounded-xl border border-[#1e293b] text-xs">
              {[
                { id: 'trade_details', label: 'Trade Details' },
                { id: 'journal_notes', label: 'Journal Notes' },
                { id: 'screenshots', label: 'Screenshots' },
                { id: 'lessons', label: 'Lessons' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDrawerTab(tab.id)}
                  className={`py-1.5 rounded-lg font-semibold transition-all text-[11px] whitespace-nowrap text-center cursor-pointer ${
                    drawerTab === tab.id
                      ? isKite
                        ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                        : 'bg-blue-600 text-white shadow-sm'
                      : isKite
                        ? 'text-[#9b9b9b] hover:text-white'
                        : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Trade Details Content */}
            {drawerTab === 'trade_details' && (
              <div className="space-y-4 text-xs animate-fadeIn">
                {/* 2-column key/value grid */}
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-slate-400 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Trade Date</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedEntry.date || formatDate(selectedEntry.raw?.trade_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Index</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedEntry.raw?.index_name || selectedEntry.index_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Trading Type</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedEntry.raw?.trading_type || 'Intraday'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Option Type</span>
                    <span
                      className={`font-bold ${
                        selectedEntry.option_type === 'CE'
                          ? 'text-emerald-400'
                          : selectedEntry.option_type === 'PE'
                          ? 'text-rose-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {selectedEntry.option_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Strike Price</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedEntry.raw?.strike_price ? Math.round(selectedEntry.raw.strike_price) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Expiry Date</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedEntry.raw?.expiry_date ? formatDate(selectedEntry.raw.expiry_date) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Lots</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedEntry.raw?.lots || 1} ({selectedEntry.raw?.quantity || 0} Qty)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Strategy</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedEntry.strategy}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Entry Premium</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedEntry.raw?.entry_premium ? formatINR(selectedEntry.raw.entry_premium) : (selectedEntry.raw?.entry_price ? `₹${selectedEntry.raw.entry_price}` : '-')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Exit Premium</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedEntry.raw?.exit_premium ? formatINR(selectedEntry.raw.exit_premium) : (selectedEntry.raw?.exit_price ? `₹${selectedEntry.raw.exit_price}` : '-')}
                    </span>
                  </div>
                </div>

                {/* Dedicated Option Leg Breakdown Box for Both (Straddle / Strangle) */}
                {selectedEntry.option_type === 'Both' && (selLegs.ceEntry != null || selLegs.peEntry != null) && (
                  <div className="p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200 light:text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Option Leg Breakdown
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                        CE & PE Legs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-[#121b2d] light:bg-white border border-emerald-500/30">
                        <span className="text-[10px] font-bold text-emerald-400 block mb-1">CALL (CE)</span>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Entry: <strong className="text-white light:text-slate-900 font-mono-numbers">{selLegs.ceEntry != null ? `₹${selLegs.ceEntry}` : '-'}</strong></span>
                          <span>Exit: <strong className="text-white light:text-slate-900 font-mono-numbers">{selLegs.ceExit != null ? `₹${selLegs.ceExit}` : '-'}</strong></span>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#121b2d] light:bg-white border border-rose-500/30">
                        <span className="text-[10px] font-bold text-rose-400 block mb-1">PUT (PE)</span>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Entry: <strong className="text-white light:text-slate-900 font-mono-numbers">{selLegs.peEntry != null ? `₹${selLegs.peEntry}` : '-'}</strong></span>
                          <span>Exit: <strong className="text-white light:text-slate-900 font-mono-numbers">{selLegs.peExit != null ? `₹${selLegs.peExit}` : '-'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Summary Card */}
                <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Gross Profit</span>
                    <span className="text-emerald-400 font-mono-numbers font-semibold">
                      +{formatINR(selectedEntry.raw?.gross_profit || Math.max(0, selectedEntry.raw?.gross_pnl || (selectedEntry.net_pnl > 0 ? selectedEntry.net_pnl : 0)))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Gross Loss</span>
                    <span className="text-rose-400 font-mono-numbers font-semibold">
                      -{formatINR(selectedEntry.raw?.gross_loss || Math.abs(Math.min(0, selectedEntry.raw?.gross_pnl || (selectedEntry.net_pnl < 0 ? selectedEntry.net_pnl : 0))))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Charges</span>
                    <span className="text-slate-300 light:text-slate-700 font-mono-numbers">
                      {formatINR(selectedEntry.raw?.total_charges || 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#1e293b] light:border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-white light:text-slate-900 text-xs">Net P&L</span>
                    <span
                      className={`text-sm font-extrabold font-mono-numbers ${
                        selectedEntry.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {selectedEntry.net_pnl >= 0 ? '+' : ''}{formatINR(selectedEntry.net_pnl)}
                    </span>
                  </div>
                </div>

                {/* Entry & Exit Reasons */}
                {(selectedEntry.raw?.entry_reason || selectedEntry.raw?.exit_reason) && (
                  <div className="space-y-2 pt-1">
                    {selectedEntry.raw?.entry_reason && (
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Entry Reason</span>
                        <p className="text-slate-300 light:text-slate-700 text-xs bg-[#0e1626] light:bg-slate-50 p-2.5 rounded-xl border border-[#1e293b] light:border-slate-200">
                          {selectedEntry.raw.entry_reason}
                        </p>
                      </div>
                    )}
                    {selectedEntry.raw?.exit_reason && (
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Exit Reason</span>
                        <p className="text-slate-300 light:text-slate-700 text-xs bg-[#0e1626] light:bg-slate-50 p-2.5 rounded-xl border border-[#1e293b] light:border-slate-200">
                          {selectedEntry.raw.exit_reason}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Journal Notes Content */}
            {drawerTab === 'journal_notes' && (
              <div className="space-y-4 text-xs animate-fadeIn">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Journal Notes</span>
                  <p className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700 leading-relaxed text-xs">
                    {selectedEntry.notes}
                  </p>
                </div>

                {/* Trade Setup description if available */}
                {selectedEntry.raw?.journal?.trade_setup && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Trade Setup & Context</span>
                    <p className="p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700 leading-relaxed text-xs">
                      {selectedEntry.raw.journal.trade_setup}
                    </p>
                  </div>
                )}

                {/* What Went Right vs What Went Wrong */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-[#0e1626] border border-[#1e293b] space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 block">What Went Right?</span>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {selectedEntry.what_went_right.length > 0 ? (
                        selectedEntry.what_went_right.map((item, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-emerald-400">•</span> {item}
                          </li>
                        ))
                      ) : (
                        <li className="text-slate-500">None specified</li>
                      )}
                    </ul>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#0e1626] border border-[#1e293b] space-y-1.5">
                    <span className="text-[10px] font-bold text-rose-400 block">What Went Wrong?</span>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {selectedEntry.what_went_wrong.length > 0 ? (
                        selectedEntry.what_went_wrong.map((item, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-rose-400">•</span> {item}
                          </li>
                        ))
                      ) : (
                        <li className="text-slate-500">None reported</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Metadata Badges */}
                <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Trade Rating</span>
                    <span className="text-amber-400 font-bold">
                      {'★'.repeat(selectedEntry.rating || 4)}{'☆'.repeat(5 - (selectedEntry.rating || 4))} {selectedEntry.rating || 4}/5
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Mood</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Smile className="w-3.5 h-3.5" /> {selectedEntry.net_pnl >= 0 ? 'Confident' : 'Reflective'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedEntry.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Screenshots Content */}
            {drawerTab === 'screenshots' && (
              <div className="space-y-4 text-xs animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Trade Screenshots</span>
                    {tradeScreenshots.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold">
                        {tradeScreenshots.length}
                      </span>
                    )}
                  </div>

                  <label className="cursor-pointer text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{uploadingDrawerScreenshot ? 'Uploading...' : 'Add Screenshot'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingDrawerScreenshot}
                      className="hidden"
                      onChange={handleDrawerScreenshotUpload}
                    />
                  </label>
                </div>

                {tradeScreenshots.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {tradeScreenshots.map((shot, idx) => (
                      <div
                        key={shot.id || idx}
                        className="group relative rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 overflow-hidden shadow-sm"
                      >
                        <div
                          className="cursor-pointer aspect-video w-full bg-black/40 overflow-hidden flex items-center justify-center"
                          onClick={() => setLightboxImage(shot)}
                        >
                          <img
                            src={shot.url}
                            alt={shot.filename || `Trade Screenshot ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://placehold.co/600x400/121b2d/3b82f6?text=Chart+Screenshot';
                            }}
                          />
                        </div>

                        <div className="p-2.5 flex items-center justify-between bg-[#121b2d] light:bg-white border-t border-[#1e293b] light:border-slate-200">
                          <span className="text-[11px] text-slate-300 light:text-slate-700 font-medium truncate max-w-[200px]">
                            {shot.filename || `Screenshot #${idx + 1}`}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setLightboxImage(shot)}
                              className="p-1 rounded text-slate-400 hover:text-blue-400"
                              title="View Fullsize"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {shot.id && (
                              <button
                                type="button"
                                onClick={() => handleDrawerDeleteScreenshot(shot.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400"
                                title="Delete Screenshot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-dashed border-[#1e293b] light:border-slate-300 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-300 light:text-slate-700 block">
                        No Chart Screenshots
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Attach chart setups, execution proofs, or exit logs for post-trade review.
                      </span>
                    </div>
                    <label className="cursor-pointer mt-1 text-[11px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDrawerScreenshot ? 'Uploading...' : 'Upload Screenshot'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploadingDrawerScreenshot}
                        className="hidden"
                        onChange={handleDrawerScreenshotUpload}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Lessons Content */}
            {drawerTab === 'lessons' && (
              <div className="space-y-4 text-xs animate-fadeIn">
                {/* Key Lessons Learned */}
                <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <BookOpen className="w-4 h-4" />
                    <span>Key Lessons Learned</span>
                  </div>
                  <p className="text-slate-300 light:text-slate-700 text-xs leading-relaxed">
                    {selectedEntry.lessons_learned || selectedEntry.raw?.journal?.lessons_learned || (
                      selectedEntry.net_pnl >= 0
                        ? 'Great execution. Followed entry trigger precisely and took profit at designated resistance without hesitation.'
                        : 'Review trade sizing and avoid entering near high-volatility session boundaries without confirmation.'
                    )}
                  </p>
                </div>

                {/* Mistakes Made / Rule Adherence */}
                <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Mistakes & Pitfalls Avoided</span>
                  </div>
                  <p className="text-slate-300 light:text-slate-700 text-xs leading-relaxed">
                    {selectedEntry.raw?.journal?.mistakes_made || (
                      selectedEntry.net_pnl < 0
                        ? 'Exit was delayed by two candles waiting for break-even. Stick strictly to initial stop-loss level.'
                        : 'No trading rules broken. Proper risk parameters honored.'
                    )}
                  </p>
                </div>

                {/* Market Conditions */}
                <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Activity className="w-4 h-4" />
                    <span>Market Conditions & Volatility</span>
                  </div>
                  <p className="text-slate-300 light:text-slate-700 text-xs leading-relaxed">
                    {selectedEntry.market_conditions || selectedEntry.raw?.journal?.market_conditions || 'Normal session volatility with trending directional momentum.'}
                  </p>
                </div>

                {/* Execution & Discipline Review Checklist */}
                <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-300 light:text-slate-800 block">
                    Discipline & Mindset Checklist
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Adhered to System Rules
                      </span>
                      <span className="text-emerald-400 font-semibold">Yes</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Controlled Emotional Impulses
                      </span>
                      <span className="text-emerald-400 font-semibold">Yes</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Respected Risk / Capital Limits
                      </span>
                      <span className="text-emerald-400 font-semibold">Yes</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 3: Strategy Performance (5 cols), Notes Sentiment (3.5 cols), Common Tags (3.5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Strategy Performance (From Journal) */}
        <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Strategy Performance (From Journal)
          </h2>

          <div className="space-y-2.5 text-xs">
            {strategyPerfList.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <div className="w-32 truncate text-slate-300 light:text-slate-700">
                  <span>{item.name}</span>
                  <span className="text-[10px] text-slate-500 block">{item.count} trades</span>
                </div>
                <div className="flex-1 bg-[#0e1626] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.winRate}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="w-12 text-right font-mono-numbers font-semibold text-white light:text-slate-900">
                  {item.winRate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Notes Sentiment Donut */}
        <div className="lg:col-span-4 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Trade Notes Sentiment
          </h2>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="relative w-32 h-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentPieData}
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sentimentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-white font-mono-numbers">123</span>
                <span className="text-[9px] text-slate-400">Entries</span>
              </div>
            </div>

            <div className="space-y-2 text-xs flex-1">
              {sentimentPieData.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-300 light:text-slate-700">{s.name}</span>
                  </div>
                  <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                    {s.value} ({s.pct})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Common Tags */}
        <div className="lg:col-span-3 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white light:text-slate-900 border-b border-[#1e293b] pb-2">
            Common Tags
          </h2>

          <div className="space-y-2 text-xs">
            {commonTagsList.map((tag) => (
              <div key={tag.tag} className="flex items-center justify-between gap-2">
                <span className="text-slate-300 light:text-slate-700 w-24 truncate">{tag.tag}</span>
                <div className="flex-1 bg-[#0e1626] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${(tag.count / tag.max) * 100}%` }}
                  />
                </div>
                <span className="font-mono-numbers text-slate-400 text-[11px] w-6 text-right">
                  {tag.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Trade Modal */}
      {entryToEdit && (
        <EditTradeModal
          trade={entryToEdit.raw || entryToEdit}
          isOpen={!!entryToEdit}
          onClose={() => setEntryToEdit(null)}
          onSaved={(updated) => {
            fetchJournal();
            if (updated) {
              const formatted = formatJournalEntry(updated);
              setSelectedEntry(formatted);
            }
            setEntryToEdit(null);
          }}
        />
      )}

      {/* Screenshot Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#121b2d] border border-[#1e293b] rounded-2xl overflow-hidden p-3 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors z-10"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage.url || lightboxImage}
              alt="Trade Screenshot"
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            {lightboxImage.filename && (
              <span className="text-[11px] text-slate-400 mt-2 block font-medium">
                {lightboxImage.filename}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Delete Entry Confirmation Modal */}
      {entryToDelete && (
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
              Are you sure you want to permanently delete this trade record and its journal notes for{' '}
              <strong className="text-white light:text-slate-900">
                {entryToDelete.index_name} ({entryToDelete.date})
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                disabled={isDeletingEntry}
                className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEntry}
                disabled={isDeletingEntry}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingEntry ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
