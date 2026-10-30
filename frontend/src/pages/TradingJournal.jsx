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

export default function TradingJournal() {
  const navigate = useNavigate();
  const { dateRangeDisplay } = useFilter();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState('ALL');
  const [journalEntries, setJournalEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerTab, setDrawerTab] = useState('journal_notes');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  useEffect(() => {
    fetchJournal();
  }, [selectedType, selectedStrategy, page]);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const res = await api.get('/journal', {
        params: {
          strategy_name: selectedStrategy === 'ALL' ? undefined : selectedStrategy,
          outcome: selectedType === 'ALL' ? undefined : (selectedType === 'WIN' ? 'win' : 'loss'),
          page,
        },
      });
      const data = res.data?.data || [];
      const formatted = data.map((t) => {
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
      });
      setJournalEntries(formatted);
      setPagination({
        current_page: res.data?.current_page || 1,
        last_page: res.data?.last_page || 1,
        total: res.data?.total || formatted.length,
      });
      if (formatted.length > 0) {
        setSelectedEntry(formatted[0]);
      } else {
        setSelectedEntry(null);
      }
    } catch (e) {
      console.warn('Failed to load journal entries', e);
    } finally {
      setLoading(false);
    }
  };

  // Top Metrics derived from real data
  const stats = useMemo(() => {
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
  }, [journalEntries, pagination.total]);

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
              {stats.best_trade_date}
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
              {stats.worst_trade_date}
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
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-xs text-white light:text-slate-900 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="CE">CE</option>
                <option value="PE">PE</option>
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
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
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

          {/* Pagination */}
          <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
            <span>Showing 1 to 10 of 123 entries</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded bg-[#0e1626] border border-[#1e293b]"><ChevronLeft className="w-3 h-3" /></button>
              <button className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-xs">1</button>
              <button className="px-2 py-0.5 rounded bg-[#0e1626] border border-[#1e293b] text-xs">2</button>
              <button className="px-2 py-0.5 rounded bg-[#0e1626] border border-[#1e293b] text-xs">3</button>
              <button className="p-1 rounded bg-[#0e1626] border border-[#1e293b]"><ChevronRight className="w-3 h-3" /></button>
            </div>
          </div>
        </div>

        {/* Right: Journal Details Drawer Card */}
        {selectedEntry && (
          <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4 lg:sticky lg:top-20">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Journal Details
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-[#0e1626] border border-[#1e293b] text-[11px] text-slate-300 hover:text-white flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-400 hover:bg-rose-500/20 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>

            {/* 4 Tabs: Trade Details / Journal Notes / Screenshots / Lessons */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#0e1626] light:bg-slate-100 rounded-xl border border-[#1e293b] text-xs">
              {['Trade Details', 'Journal Notes', 'Screenshots', 'Lessons'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDrawerTab(tab.toLowerCase().replace(' ', '_'))}
                  className={`py-1 rounded-lg font-semibold transition-all text-[11px] whitespace-nowrap ${
                    drawerTab === tab.toLowerCase().replace(' ', '_')
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Journal Notes Content */}
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">Journal Notes</span>
                <p className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700 leading-relaxed text-xs">
                  {selectedEntry.notes}
                </p>
              </div>

              {/* Trade Screenshots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400">Trade Screenshots</span>
                  <button className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Screenshot
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-20 rounded-xl bg-[#0e1626] border border-[#1e293b] flex flex-col items-center justify-center text-slate-500 p-2 text-center">
                    <span className="text-[9px] font-bold text-emerald-400 mb-0.5">Entry Setup</span>
                    <span className="text-[9px]">Breakout chart screenshot</span>
                  </div>
                  <div className="h-20 rounded-xl bg-[#0e1626] border border-[#1e293b] flex flex-col items-center justify-center text-slate-500 p-2 text-center">
                    <span className="text-[9px] font-bold text-rose-400 mb-0.5">Exit Setup</span>
                    <span className="text-[9px]">Target profit screenshot</span>
                  </div>
                </div>
              </div>

              {/* What Went Right vs What Went Wrong */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-[#0e1626] border border-[#1e293b] space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 block">What Went Right?</span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {selectedEntry.what_went_right.map((item, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-emerald-400">•</span> {item}
                      </li>
                    ))}
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
                  <span className="text-amber-400 font-bold">★★★★☆ 4/5</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Mood</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5" /> Confident
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Tags</span>
                  <div className="flex gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Breakout
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Good Entry
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
    </div>
  );
}
