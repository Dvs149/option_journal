import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Code2,
  Copy,
  Check,
  Plus,
  Search,
  Star,
  ExternalLink,
  Download,
  Trash2,
  Edit2,
  FileCode,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  Tag,
  BookOpen,
  Sliders,
  RefreshCw,
  Upload,
  FileDown,
  X,
  Maximize2,
  Minimize2,
  AlertCircle,
  HelpCircle,
  Clock,
  Terminal,
  Activity,
  ChevronRight,
  Filter,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export default function PineScriptManager() {
  const { showToast } = useToast();
  const { isKite } = useTheme();

  const [scripts, setScripts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    strategies: 0,
    indicators: 0,
    libraries: 0,
    alerts: 0,
    favorites: 0,
    categories: [],
    markets: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMarket, setSelectedMarket] = useState('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // Copy state
  const [copiedId, setCopiedId] = useState(null);
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedAlert, setCopiedAlert] = useState(false);

  // Viewer options
  const [viewerTab, setViewerTab] = useState('code'); // 'code' | 'notes' | 'webhook'
  const [wrapLines, setWrapLines] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState(null);
  const [importJsonText, setImportJsonText] = useState('');

  // Form State
  const initialForm = {
    title: '',
    script_type: 'indicator',
    version: 'v5',
    category: 'Options',
    target_market: 'All',
    timeframe: '5m',
    description: '',
    code: '',
    tradingview_url: '',
    is_favorite: false,
    tagsInput: '',
  };
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch scripts
  const fetchScripts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pine-scripts', {
        params: {
          search: search || undefined,
          script_type: selectedType === 'ALL' ? undefined : selectedType,
          category: selectedCategory === 'ALL' ? undefined : selectedCategory,
          target_market: selectedMarket === 'ALL' ? undefined : selectedMarket,
          is_favorite: onlyFavorites ? true : undefined,
          sort_by: sortBy,
        },
      });

      if (res.data) {
        const fetchedScripts = res.data.scripts || [];
        setScripts(fetchedScripts);
        if (res.data.stats) {
          setStats(res.data.stats);
        }

        // Maintain or select first
        if (fetchedScripts.length > 0) {
          if (!selectedScript) {
            setSelectedScript(fetchedScripts[0]);
          } else {
            const stillExists = fetchedScripts.find((s) => s.id === selectedScript.id);
            setSelectedScript(stillExists || fetchedScripts[0]);
          }
        } else {
          setSelectedScript(null);
        }
      }
    } catch (err) {
      console.error('Failed to load Pine Scripts:', err);
      showToast('Failed to load Pine Scripts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, [selectedType, selectedCategory, selectedMarket, onlyFavorites, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchScripts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Copy to clipboard helper
  const handleCopyCode = async (code, scriptId = null) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      if (scriptId) {
        setCopiedId(scriptId);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        setCopiedMain(true);
        setTimeout(() => setCopiedMain(false), 2000);
      }
      showToast('Pine Script copied to clipboard! Ready to paste into TradingView.', 'success');
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      if (scriptId) {
        setCopiedId(scriptId);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        setCopiedMain(true);
        setTimeout(() => setCopiedMain(false), 2000);
      }
      showToast('Pine Script copied to clipboard!', 'success');
    }
  };

  // Download .pine file
  const handleDownloadFile = (script) => {
    if (!script) return;
    const filename = `${script.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pine`;
    const blob = new Blob([script.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'info');
  };

  // Toggle favorite
  const handleToggleFavorite = async (script, e) => {
    e && e.stopPropagation();
    try {
      const res = await api.post(`/pine-scripts/${script.id}/favorite`);
      const updated = res.data.script;
      setScripts((prev) => prev.map((s) => (s.id === script.id ? updated : s)));
      if (selectedScript?.id === script.id) {
        setSelectedScript(updated);
      }
      setStats((prev) => ({
        ...prev,
        favorites: updated.is_favorite ? prev.favorites + 1 : Math.max(0, prev.favorites - 1),
      }));
      showToast(updated.is_favorite ? 'Added to starred favorites' : 'Removed from favorites', 'info');
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      showToast('Failed to update favorite status', 'error');
    }
  };

  // Duplicate / Clone
  const handleDuplicate = async (script, e) => {
    e && e.stopPropagation();
    try {
      const res = await api.post(`/pine-scripts/${script.id}/duplicate`);
      const cloned = res.data.script;
      setScripts((prev) => [cloned, ...prev]);
      setSelectedScript(cloned);
      setStats((prev) => ({ ...prev, total: prev.total + 1 }));
      showToast(`Cloned as "${cloned.title}"`, 'success');
    } catch (err) {
      console.error('Failed to duplicate script:', err);
      showToast('Failed to clone script', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (script) => {
    setForm({
      id: script.id,
      title: script.title,
      script_type: script.script_type || 'indicator',
      version: script.version || 'v5',
      category: script.category || 'Options',
      target_market: script.target_market || 'All',
      timeframe: script.timeframe || '5m',
      description: script.description || '',
      code: script.code || '',
      tradingview_url: script.tradingview_url || '',
      is_favorite: Boolean(script.is_favorite),
      tagsInput: Array.isArray(script.tags) ? script.tags.join(', ') : '',
    });
    setShowEditModal(true);
  };

  // Submit Save / Update
  const handleSaveScript = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.code.trim()) {
      showToast('Please provide a title and Pine Script code.', 'warning');
      return;
    }

    const payload = {
      title: form.title.trim(),
      script_type: form.script_type,
      version: form.version,
      category: form.category,
      target_market: form.target_market,
      timeframe: form.timeframe,
      description: form.description.trim(),
      code: form.code,
      tradingview_url: form.tradingview_url.trim() || null,
      is_favorite: form.is_favorite,
      tags: form.tagsInput
        ? form.tagsInput
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : [],
    };

    try {
      setFormSubmitting(true);
      if (showEditModal && form.id) {
        const res = await api.put(`/pine-scripts/${form.id}`, payload);
        const updated = res.data.script;
        setShowEditModal(false);
        setForm(initialForm);
        setScripts((prev) => prev.map((s) => (s.id === form.id ? updated : s)));
        setSelectedScript(updated);
        showToast('Pine Script updated successfully!', 'success');
      } else {
        const res = await api.post('/pine-scripts', payload);
        const created = res.data.script;
        setShowAddModal(false);
        setForm(initialForm);
        setScripts((prev) => [created, ...prev]);
        setSelectedScript(created);
        showToast('Pine Script added to library!', 'success');
      }
      fetchScripts();
    } catch (err) {
      console.error('Failed to save Pine Script:', err);
      const errMsg = err.response?.data?.message || 'Error saving Pine Script';
      showToast(errMsg, 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete
  const confirmDelete = async () => {
    if (!scriptToDelete) return;
    try {
      await api.delete(`/pine-scripts/${scriptToDelete.id}`);
      setScripts((prev) => prev.filter((s) => s.id !== scriptToDelete.id));
      if (selectedScript?.id === scriptToDelete.id) {
        setSelectedScript(scripts.find((s) => s.id !== scriptToDelete.id) || null);
      }
      showToast('Pine Script deleted.', 'info');
      setShowDeleteModal(false);
      setScriptToDelete(null);
      fetchScripts();
    } catch (err) {
      console.error('Failed to delete Pine Script:', err);
      showToast('Failed to delete Pine Script', 'error');
    }
  };

  // Export JSON backup
  const handleExportJson = async () => {
    try {
      const res = await api.get('/pine-scripts/export-json');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `tradejournal_pine_scripts_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Pine Scripts exported as JSON backup', 'success');
    } catch (err) {
      console.error('Failed to export Pine Scripts:', err);
      showToast('Export failed', 'error');
    }
  };

  // Import JSON backup
  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const scriptsArray = Array.isArray(parsed) ? parsed : parsed.scripts;
      if (!Array.isArray(scriptsArray) || scriptsArray.length === 0) {
        showToast('Invalid JSON: Must contain an array of scripts', 'error');
        return;
      }

      const res = await api.post('/pine-scripts/import-json', { scripts: scriptsArray });
      showToast(res.data.message || 'Scripts imported successfully', 'success');
      setShowImportModal(false);
      setImportJsonText('');
      fetchScripts();
    } catch (err) {
      console.error('JSON import error:', err);
      showToast('Invalid JSON format: ' + err.message, 'error');
    }
  };

  // Template insert shortcuts
  const insertTemplate = (type) => {
    let tCode = '';
    if (type === 'strategy') {
      tCode = `//@version=5
strategy("My Custom Strategy", overlay=true, initial_capital=100000, default_qty_type=strategy.percent_of_equity, default_qty_value=20)

// Inputs
fastLength = input.int(9, "Fast Length")
slowLength = input.int(21, "Slow Length")

// Calculations
fastMA = ta.ema(close, fastLength)
slowMA = ta.ema(close, slowLength)

// Conditions
longCondition  = ta.crossover(fastMA, slowMA)
shortCondition = ta.crossunder(fastMA, slowMA)

// Entries & Exits
if longCondition
    strategy.entry("Long", strategy.long)
if shortCondition
    strategy.entry("Short", strategy.short)

plot(fastMA, "Fast EMA", color=color.green)
plot(slowMA, "Slow EMA", color=color.red)`;
      setForm((prev) => ({
        ...prev,
        script_type: 'strategy',
        code: tCode,
      }));
    } else if (type === 'indicator') {
      tCode = `//@version=5
indicator("My Custom Indicator", overlay=true)

// Inputs
length = input.int(20, "Period Length")
src    = input.source(close, "Source")

// Calculations
basis = ta.sma(src, length)
dev   = ta.stdev(src, length) * 2
upper = basis + dev
lower = basis - dev

// Visuals
plot(basis, "Middle Band", color=color.yellow)
p1 = plot(upper, "Upper Band", color=color.blue)
p2 = plot(lower, "Lower Band", color=color.blue)
fill(p1, p2, color=color.new(color.blue, 90))`;
      setForm((prev) => ({
        ...prev,
        script_type: 'indicator',
        code: tCode,
      }));
    } else if (type === 'alert') {
      tCode = `//@version=5
indicator("Automated Webhook Alert Engine", overlay=false)

token = input.string("API_TOKEN_HERE", "Broker Secret")
fastMA = ta.ema(close, 9)
slowMA = ta.ema(close, 21)

buySignal  = ta.crossover(fastMA, slowMA)
sellSignal = ta.crossunder(fastMA, slowMA)

if buySignal
    alert('{"secret":"' + token + '", "action":"BUY", "symbol":"' + syminfo.ticker + '", "quantity":1, "price":' + str.tostring(close) + '}', alert.freq_once_per_bar_close)

if sellSignal
    alert('{"secret":"' + token + '", "action":"SELL", "symbol":"' + syminfo.ticker + '", "quantity":1, "price":' + str.tostring(close) + '}', alert.freq_once_per_bar_close)

plot(fastMA - slowMA, "Signal Momentum", color=fastMA > slowMA ? color.green : color.red)`;
      setForm((prev) => ({
        ...prev,
        script_type: 'alert',
        code: tCode,
      }));
    }
  };

  // Helper badge renderers
  const getTypeBadge = (type) => {
    switch (type) {
      case 'strategy':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
            Strategy
          </span>
        );
      case 'indicator':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
            Indicator
          </span>
        );
      case 'alert':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
            Webhook Alert
          </span>
        );
      case 'library':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
            Library
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase tracking-wider">
            Script
          </span>
        );
    }
  };

  // Code line numbers calculation
  const codeLines = useMemo(() => {
    if (!selectedScript?.code) return [];
    return selectedScript.code.split('\n');
  }, [selectedScript?.code]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 1. Header & KPI Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white light:text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
              <Code2 className="w-6 h-6" />
            </div>
            <span>Pine Script Manager</span>
          </h1>
          <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
            Store, organize, copy and deploy TradingView indicators, options strategies, and webhook alerts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121b2d] light:bg-slate-100 hover:bg-[#18233a] light:hover:bg-slate-200 border border-[#1e293b] light:border-slate-200 text-xs font-semibold text-slate-300 light:text-slate-700 transition-colors cursor-pointer"
            title="Export all scripts as JSON"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121b2d] light:bg-slate-100 hover:bg-[#18233a] light:hover:bg-slate-200 border border-[#1e293b] light:border-slate-200 text-xs font-semibold text-slate-300 light:text-slate-700 transition-colors cursor-pointer"
            title="Import scripts from JSON"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setForm(initialForm);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Script</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Total Scripts</span>
            <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
              {stats.total}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Strategies</span>
            <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
              {stats.strategies}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Indicators</span>
            <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
              {stats.indicators}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Webhook Alerts</span>
            <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
              {stats.alerts}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 fill-yellow-400/20" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Starred</span>
            <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
              {stats.favorites}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scripts by title, strategy logic, tags, or code content..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'strategy', label: 'Strategies' },
              { id: 'indicator', label: 'Indicators' },
              { id: 'alert', label: 'Alerts' },
              { id: 'library', label: 'Libraries' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(t.id)}
                className={`px-3 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedType === t.id
                    ? isKite
                      ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent border border-[#ff5722]/30'
                      : 'bg-blue-600 text-white shadow-sm'
                    : isKite
                      ? 'bg-[#1e1e1e] text-[#9b9b9b] hover:text-white border border-[#292929]'
                      : 'bg-[#0e1626] light:bg-slate-100 text-slate-400 hover:text-white light:hover:text-slate-900 border border-[#1e293b] light:border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Starred Only Toggle */}
          <button
            type="button"
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold border transition-all cursor-pointer whitespace-nowrap ${
              onlyFavorites
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-sm'
                : 'bg-[#0e1626] light:bg-slate-100 text-slate-400 hover:text-white light:hover:text-slate-900 border-[#1e293b] light:border-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
            <span>Starred</span>
          </button>
        </div>

        {/* Secondary Filter Row: Category, Market, Sort */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 border-t border-[#1e293b]/60 text-xs">
          <div>
            <label className="block text-slate-400 text-[10px] mb-1 font-medium">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Options">Options</option>
              <option value="Scalping">Scalping</option>
              <option value="Trend Following">Trend Following</option>
              <option value="Breakout">Breakout</option>
              <option value="Mean Reversion">Mean Reversion</option>
              <option value="Price Action">Price Action</option>
              <option value="Risk Management">Risk Management</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] mb-1 font-medium">Target Market</label>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Markets</option>
              <option value="NIFTY / BANKNIFTY">NIFTY / BANKNIFTY</option>
              <option value="NIFTY">NIFTY</option>
              <option value="BANKNIFTY">BANKNIFTY</option>
              <option value="SENSEX">SENSEX</option>
              <option value="All Indices">All Indices</option>
              <option value="Stocks">Stocks</option>
              <option value="All">Global / All</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] mb-1 font-medium">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title (A - Z)</option>
              <option value="title_desc">Title (Z - A)</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>

          <div className="flex items-end">
            <span className="text-[11px] text-slate-400 font-medium py-1.5">
              Showing <span className="text-white light:text-slate-900 font-bold">{scripts.length}</span> script{scripts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Main Two-Column Workspace (List & Code Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Script Cards List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="p-8 text-center bg-[#121b2d] light:bg-white rounded-3xl border border-[#1e293b]">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading Pine Scripts...</p>
            </div>
          ) : scripts.length === 0 ? (
            <div className="p-10 text-center bg-[#121b2d] light:bg-white rounded-3xl border border-[#1e293b] light:border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white light:text-slate-900">No Pine Scripts Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search || selectedType !== 'ALL' || selectedCategory !== 'ALL' || selectedMarket !== 'ALL' || onlyFavorites
                  ? 'No scripts match your active filters or search terms.'
                  : 'Your Pine Script library is currently empty. Click below to add your first indicator, strategy, or webhook alert.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md shadow-blue-600/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Pine Script</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[820px] overflow-y-auto pr-1">
              {scripts.map((script) => {
                const isSelected = selectedScript?.id === script.id;
                return (
                  <div
                    key={script.id}
                    onClick={() => setSelectedScript(script)}
                    className={`p-4 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#152238] light:bg-blue-50/70 border-blue-500/70 shadow-lg shadow-blue-600/10'
                        : 'bg-[#121b2d] light:bg-white border-[#1e293b] light:border-slate-200 hover:border-slate-700 light:hover:border-slate-300'
                    }`}
                  >
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getTypeBadge(script.script_type)}
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0e1626] light:bg-slate-100 text-slate-400 font-semibold border border-[#1e293b] light:border-slate-200">
                          {script.version || 'v5'}
                        </span>
                        {script.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 light:bg-slate-100 text-slate-300 light:text-slate-700 font-medium">
                            {script.category}
                          </span>
                        )}
                      </div>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(script, e)}
                        className="p-1 rounded-lg hover:bg-[#1f2d47] text-slate-400 hover:text-yellow-400 transition-colors"
                        title={script.is_favorite ? 'Starred' : 'Add to Stars'}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            script.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-white light:text-slate-900 leading-snug line-clamp-1 mb-1">
                      {script.title}
                    </h4>

                    {/* Description */}
                    {script.description && (
                      <p className="text-xs text-slate-400 light:text-slate-600 line-clamp-2 leading-relaxed mb-2.5">
                        {script.description}
                      </p>
                    )}

                    {/* Bottom Metadata & Quick Copy Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]/60 text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>{script.target_market || 'All Markets'}</span>
                        <span>•</span>
                        <span className="font-mono">{script.timeframe || '5m'}</span>
                      </div>

                      {/* Quick Copy Button on Card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCode(script.code, script.id);
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          copiedId === script.id
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-[#18233a] light:bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-300 light:text-slate-700'
                        }`}
                        title="Copy code directly to clipboard"
                      >
                        {copiedId === script.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Code Viewer & Inspector (7 cols) */}
        <div className={`lg:col-span-7 ${isFullscreen ? 'fixed inset-4 z-50 bg-[#0e1626] rounded-3xl p-6 shadow-2xl overflow-y-auto' : ''}`}>
          {selectedScript ? (
            <div className="rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-xl p-5 space-y-4">
              {/* Top Details & Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#1e293b] light:border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(selectedScript.script_type)}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-[#0e1626] light:bg-slate-100 text-slate-400 font-semibold border border-[#1e293b] light:border-slate-200">
                      Pine {selectedScript.version || 'v5'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
                      {selectedScript.category || 'General'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Market: <strong className="text-slate-300 light:text-slate-700">{selectedScript.target_market}</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white light:text-slate-900 mt-1">
                    {selectedScript.title}
                  </h3>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Big Copy Code Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedScript.code)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                      copiedMain
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 active:scale-95'
                    }`}
                    title="Copy full Pine Script code to clipboard"
                  >
                    {copiedMain ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedMain ? 'Copied Code!' : 'Copy Code'}</span>
                  </button>

                  {/* Download .pine */}
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(selectedScript)}
                    className="p-2 rounded-xl bg-[#0e1626] light:bg-slate-100 hover:bg-[#18233a] light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-[#1e293b] light:border-slate-200 transition-colors"
                    title="Download as .pine file"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                  </button>

                  {/* Open in TradingView */}
                  <a
                    href={selectedScript.tradingview_url || 'https://www.tradingview.com/chart/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-[#0e1626] light:bg-slate-100 hover:bg-[#18233a] light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-[#1e293b] light:border-slate-200 transition-colors"
                    title="Open TradingView Chart / Pine Editor"
                  >
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                  </a>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => handleDuplicate(selectedScript)}
                    className="p-2 rounded-xl bg-[#0e1626] light:bg-slate-100 hover:bg-[#18233a] light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-[#1e293b] light:border-slate-200 transition-colors"
                    title="Clone / Duplicate this script"
                  >
                    <Layers className="w-4 h-4 text-purple-400" />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedScript)}
                    className="p-2 rounded-xl bg-[#0e1626] light:bg-slate-100 hover:bg-[#18233a] light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-[#1e293b] light:border-slate-200 transition-colors"
                    title="Edit Script Details & Code"
                  >
                    <Edit2 className="w-4 h-4 text-amber-400" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => {
                      setScriptToDelete(selectedScript);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                    title="Delete Script"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-xl bg-[#0e1626] light:bg-slate-100 hover:bg-[#18233a] light:hover:bg-slate-200 text-slate-400 hover:text-white border border-[#1e293b] light:border-slate-200 transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Viewer Tabs: Code, Setup Notes, Webhook Payload */}
              <div className="flex items-center justify-between border-b border-[#1e293b] light:border-slate-200 pb-2 text-xs">
                <div className="flex items-center gap-1 p-1 bg-[#0e1626] light:bg-slate-100 rounded-xl border border-[#1e293b] light:border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewerTab('code')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      viewerTab === 'code'
                        ? isKite
                          ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                          : 'bg-blue-600 text-white shadow-sm'
                        : isKite
                          ? 'text-[#9b9b9b] hover:text-white'
                          : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                    }`}
                  >
                    Pine Script Code ({codeLines.length} lines)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerTab('notes')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      viewerTab === 'notes'
                        ? isKite
                          ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                          : 'bg-blue-600 text-white shadow-sm'
                        : isKite
                          ? 'text-[#9b9b9b] hover:text-white'
                          : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                    }`}
                  >
                    Setup & Logic Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerTab('webhook')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      viewerTab === 'webhook'
                        ? isKite
                          ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                          : 'bg-blue-600 text-white shadow-sm'
                        : isKite
                          ? 'text-[#9b9b9b] hover:text-white'
                          : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                    }`}
                  >
                    Webhook Alert Setup
                  </button>
                </div>

                {/* Wrap lines toggle */}
                {viewerTab === 'code' && (
                  <button
                    type="button"
                    onClick={() => setWrapLines(!wrapLines)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {wrapLines ? 'No Wrap' : 'Wrap Lines'}
                  </button>
                )}
              </div>

              {/* TAB 1: CODE VIEWER */}
              {viewerTab === 'code' && (
                <div className="relative rounded-2xl bg-[#080d1a] border border-[#1e293b] overflow-hidden font-mono text-xs">
                  {/* Code Editor Header Bar */}
                  <div className="flex items-center justify-between px-4 py-2 bg-[#0e1626] border-b border-[#1e293b] text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-semibold text-slate-300">
                        {selectedScript.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pine
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{codeLines.length} lines</span>
                      <span>{selectedScript.code.length} chars</span>
                    </div>
                  </div>

                  {/* Code Block with Line Numbers */}
                  <div className="max-h-[560px] overflow-auto flex select-text p-3">
                    {/* Line numbers gutter */}
                    <div className="select-none text-right pr-4 text-slate-600 font-mono text-[11px] leading-5 border-r border-[#1e293b]/70 mr-3">
                      {codeLines.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>

                    {/* Code lines */}
                    <pre
                      className={`flex-1 text-slate-200 font-mono text-[11px] leading-5 m-0 ${
                        wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                      }`}
                    >
                      {selectedScript.code}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 2: SETUP & STRATEGY NOTES */}
              {viewerTab === 'notes' && (
                <div className="space-y-4 p-4 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-slate-300 light:text-slate-700 leading-relaxed">
                  <div>
                    <h4 className="text-xs font-bold text-white light:text-slate-900 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      <span>Setup & Execution Guide</span>
                    </h4>
                    <p className="text-slate-400 light:text-slate-600">
                      {selectedScript.description || 'No specific description provided for this script.'}
                    </p>
                  </div>

                  {/* Quick Guide on TradingView deployment */}
                  <div className="pt-3 border-t border-[#1e293b] light:border-slate-200 space-y-2">
                    <h5 className="font-bold text-white light:text-slate-900">How to use in TradingView:</h5>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-400 light:text-slate-600">
                      <li>Click the <strong>Copy Code</strong> button above to copy the script.</li>
                      <li>Open <a href="https://www.tradingview.com/chart/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">TradingView Charts</a>.</li>
                      <li>At the bottom panel, click on <strong>Pine Editor</strong>.</li>
                      <li>Select all existing code, paste this copied script, and click <strong>Save</strong>.</li>
                      <li>Click <strong>Add to Chart</strong> to apply and start monitoring signals!</li>
                    </ol>
                  </div>

                  {/* Tags */}
                  {Array.isArray(selectedScript.tags) && selectedScript.tags.length > 0 && (
                    <div className="pt-3 border-t border-[#1e293b] light:border-slate-200 flex items-center gap-1.5 flex-wrap">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[11px] text-slate-500 font-medium">Tags:</span>
                      {selectedScript.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full bg-[#162033] light:bg-slate-200 text-[10px] text-slate-300 light:text-slate-700 font-semibold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: WEBHOOK ALERT SETUP */}
              {viewerTab === 'webhook' && (
                <div className="space-y-4 p-4 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white light:text-slate-900">Webhook JSON Alert Payload</h4>
                      <p className="text-[11px] text-slate-400 light:text-slate-600">
                        Paste this JSON format into your TradingView Alert Message box for automated order routing.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const alertJson = `{\n  "secret": "YOUR_WEBHOOK_SECRET",\n  "action": "{{strategy.order.action}}",\n  "ticker": "{{ticker}}",\n  "price": {{close}},\n  "contracts": {{strategy.order.contracts}},\n  "time": "{{timenow}}"\n}`;
                        handleCopyCode(alertJson);
                        setCopiedAlert(true);
                        setTimeout(() => setCopiedAlert(false), 2000);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-sm cursor-pointer"
                    >
                      {copiedAlert ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAlert ? 'Copied' : 'Copy Alert JSON'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#080d1a] border border-[#1e293b] font-mono text-slate-300 text-[11px]">
                    <pre className="whitespace-pre-wrap">
{`{
  "secret": "YOUR_WEBHOOK_SECRET",
  "action": "{{strategy.order.action}}",
  "ticker": "{{ticker}}",
  "price": {{close}},
  "contracts": {{strategy.order.contracts}},
  "time": "{{timenow}}"
}`}
                    </pre>
                  </div>

                  <div className="space-y-1.5 text-slate-400 light:text-slate-600 text-[11px]">
                    <p><strong>Supported Broker Bridges:</strong> Zerodha Kite Webhooks, DhanHQ Webhooks, OpenAlgo, Fyers API, Tradetron, AutoTrader.</p>
                    <p>In TradingView, check <strong>Webhook URL</strong> in Alert settings, enter your broker bridge endpoint, and paste the above payload.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-[#121b2d] light:bg-white rounded-3xl border border-[#1e293b] light:border-slate-200 space-y-2">
              <FileCode className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white light:text-slate-900">Select a Pine Script</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select any script from the left list to view code, copy with one-click, inspect strategy parameters, or export.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. ADD / EDIT PINE SCRIPT MODAL */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 md:p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div>
                <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-blue-400" />
                  <span>{showEditModal ? 'Edit Pine Script' : 'Add New Pine Script'}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Save your custom indicators, options strategies, or webhook scripts with parameters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Template Inserter (Only in Add Mode) */}
            {showAddModal && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs">
                <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Start from Template:
                </span>
                <button
                  type="button"
                  onClick={() => insertTemplate('strategy')}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[11px] font-semibold transition-colors"
                >
                  + v5 Strategy
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate('indicator')}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-semibold transition-colors"
                >
                  + v5 Indicator
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate('alert')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition-colors"
                >
                  + Webhook Alert
                </button>
              </div>
            )}

            <form onSubmit={handleSaveScript} className="space-y-4 text-xs">
              {/* Row 1: Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 text-[11px] mb-1 font-semibold">
                    Script Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., 9:20 AM Short Straddle Engine"
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Script Type</label>
                  <select
                    value={form.script_type}
                    onChange={(e) => setForm({ ...form, script_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 focus:outline-none"
                  >
                    <option value="indicator">Indicator</option>
                    <option value="strategy">Strategy</option>
                    <option value="alert">Webhook Alert</option>
                    <option value="library">Library</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Category, Target Market, Timeframe, Version */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 focus:outline-none"
                  >
                    <option value="Options">Options</option>
                    <option value="Scalping">Scalping</option>
                    <option value="Trend Following">Trend Following</option>
                    <option value="Breakout">Breakout</option>
                    <option value="Mean Reversion">Mean Reversion</option>
                    <option value="Price Action">Price Action</option>
                    <option value="Risk Management">Risk Management</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Target Market</label>
                  <select
                    value={form.target_market}
                    onChange={(e) => setForm({ ...form, target_market: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 focus:outline-none"
                  >
                    <option value="NIFTY / BANKNIFTY">NIFTY / BANKNIFTY</option>
                    <option value="NIFTY">NIFTY</option>
                    <option value="BANKNIFTY">BANKNIFTY</option>
                    <option value="SENSEX">SENSEX</option>
                    <option value="All Indices">All Indices</option>
                    <option value="Stocks">Stocks</option>
                    <option value="All">All / Global</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Timeframe</label>
                  <input
                    type="text"
                    value={form.timeframe}
                    onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                    placeholder="e.g. 5m, 15m, Daily"
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Pine Version</label>
                  <select
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 focus:outline-none"
                  >
                    <option value="v5">v5 (Recommended)</option>
                    <option value="v6">v6</option>
                    <option value="v4">v4</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-semibold">
                  Description / Strategy Rules
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Explain trade triggers, indicator formulas, entry/exit rules, or notes..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 focus:outline-none"
                />
              </div>

              {/* Row 4: Code Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 text-[11px] font-semibold">
                    Pine Script Code <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {form.code.split('\n').length} lines
                  </span>
                </div>
                <textarea
                  required
                  rows={12}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Paste your Pine Script code here (//@version=5 ...)"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080d1a] border border-[#1e293b] text-white font-mono text-[11px] leading-5 focus:outline-none focus:border-blue-500"
                  spellCheck="false"
                />
              </div>

              {/* Row 5: URL & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-semibold">
                    TradingView Chart or Script URL
                  </label>
                  <input
                    type="url"
                    value={form.tradingview_url}
                    onChange={(e) => setForm({ ...form, tradingview_url: e.target.value })}
                    placeholder="https://www.tradingview.com/script/..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1 font-semibold">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.tagsInput}
                    onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                    placeholder="options, straddle, breakout, rsi"
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-white light:text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Favorite Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-300 light:text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_favorite}
                  onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0 bg-[#0e1626]"
                />
                <span className="text-xs font-semibold">Bookmark as Starred Favorite</span>
              </label>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 hover:bg-[#18233a] text-slate-400 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : showEditModal ? 'Update Script' : 'Add to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {showDeleteModal && scriptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white light:text-slate-900">Delete Pine Script</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 light:text-slate-700">
              Are you sure you want to permanently delete <strong>{scriptToDelete.title}</strong> from your library?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setScriptToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 text-slate-400 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Delete Script
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. IMPORT JSON MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 md:p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white light:text-slate-900">Import Pine Scripts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste a previously exported JSON backup or list of Pine Scripts below:
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='[ { "title": "My Script", "code": "//@version=5..." } ]'
              className="w-full px-3 py-2.5 rounded-xl bg-[#080d1a] border border-[#1e293b] text-white font-mono text-xs focus:outline-none focus:border-blue-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 text-slate-400 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!importJsonText.trim()}
                onClick={handleImportJson}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                Import Scripts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
