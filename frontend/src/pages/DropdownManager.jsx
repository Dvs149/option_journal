import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Plus,
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Sliders,
  Filter,
  Layers,
  Database,
  TrendingUp,
  ListFilter,
  BookOpen,
  Sparkles,
  Info,
  Check,
  Tag,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useDropdown, MODULE_METADATA } from '../context/DropdownContext';
import { useToast } from '../context/ToastContext';

// Color map for badge preview
const COLOR_VARIANTS = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const MODULE_ICONS = {
  'add-trade': TrendingUp,
  'trades': ListFilter,
  'journal': BookOpen,
};

export default function DropdownManager() {
  const {
    options,
    grouped,
    loading,
    toggleOptionStatus,
    bulkToggleStatus,
    addOption,
    updateOption,
    deleteOption,
    resetDefaults,
  } = useDropdown();

  const { showToast } = useToast();

  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    module_key: 'add-trade',
    dropdown_key: 'strategy_name',
    dropdown_label: 'Strategy Name',
    option_value: '',
    option_label: '',
    color: 'blue',
    is_active: true,
    apply_to_all_modules: true,
  });

  const [editingOption, setEditingOption] = useState(null);
  const [editForm, setEditForm] = useState({
    option_label: '',
    option_value: '',
    color: 'blue',
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Compute available modules in data
  const availableModules = useMemo(() => {
    return Object.keys(grouped);
  }, [grouped]);

  // Overall stats
  const totalOptions = options.length;
  const activeOptions = options.filter((o) => o.is_active).length;
  const inactiveOptions = totalOptions - activeOptions;

  // Filtered dropdown groups
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result = {};

    Object.keys(grouped).forEach((modKey) => {
      if (selectedModule !== 'ALL' && selectedModule !== modKey) return;

      Object.keys(grouped[modKey]).forEach((ddKey) => {
        const ddData = grouped[modKey][ddKey];
        let opts = ddData.options;

        // Status filter
        if (selectedStatusFilter === 'ACTIVE') {
          opts = opts.filter((o) => o.is_active);
        } else if (selectedStatusFilter === 'INACTIVE') {
          opts = opts.filter((o) => !o.is_active);
        }

        // Search query filter
        if (q) {
          opts = opts.filter(
            (o) =>
              o.option_label.toLowerCase().includes(q) ||
              o.option_value.toLowerCase().includes(q) ||
              ddData.dropdown_label.toLowerCase().includes(q) ||
              modKey.toLowerCase().includes(q)
          );
        }

        if (opts.length > 0 || !q) {
          if (!result[modKey]) result[modKey] = {};
          result[modKey][ddKey] = {
            ...ddData,
            filteredOptions: opts,
          };
        }
      });
    });

    return result;
  }, [grouped, selectedModule, selectedStatusFilter, searchQuery]);

  const handleOpenAdd = (modKey = 'add-trade', ddKey = 'strategy_name', ddLabel = 'Strategy Name') => {
    setAddForm({
      module_key: modKey,
      dropdown_key: ddKey,
      dropdown_label: ddLabel,
      option_value: '',
      option_label: '',
      color: 'blue',
      is_active: true,
      apply_to_all_modules: modKey === 'add-trade' && ddKey === 'strategy_name',
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.option_label.trim() || !addForm.option_value.trim()) {
      showToast('Please enter both label and value', 'error');
      return;
    }

    const res = await addOption(addForm);
    if (res.success) {
      setShowAddModal(false);
    }
  };

  const handleOpenEdit = (opt) => {
    setEditingOption(opt);
    setEditForm({
      option_label: opt.option_label,
      option_value: opt.option_value,
      color: opt.color || 'blue',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingOption) return;

    const res = await updateOption(editingOption.id, editForm);
    if (res.success) {
      setEditingOption(null);
    }
  };

  const handleDelete = async (opt) => {
    if (window.confirm(`Are you sure you want to delete the option "${opt.option_label}"?`)) {
      await deleteOption(opt.id);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      await resetDefaults(selectedModule === 'ALL' ? null : selectedModule);
      setShowResetConfirm(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 animate-fadeIn text-slate-100">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-white light:text-slate-900 tracking-tight">
              Dropdown & Option Manager
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage all options & dropdown lists module-wise (Add Trade, All Trades, Journal). Easily activate, deactivate, or add custom options.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 hover:bg-[#162033] text-slate-300 light:text-slate-700 hover:text-white border border-[#1e293b] light:border-slate-300 text-xs font-semibold transition-all shadow-sm"
            title="Reset options to exchange & system defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Custom Option</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Total Dropdown Options</span>
            <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
              {totalOptions}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Active in Dropdowns</span>
            <span className="text-lg font-bold text-emerald-400 font-mono-numbers">
              {activeOptions}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Deactivated (Hidden)</span>
            <span className="text-lg font-bold text-slate-400 font-mono-numbers">
              {inactiveOptions}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center">
            <EyeOff className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Configured Modules</span>
            <span className="text-lg font-bold text-purple-400 font-mono-numbers">
              {availableModules.length}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Module Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => setSelectedModule('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedModule === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white light:hover:text-slate-900 bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300'
            }`}
          >
            <span>All Modules</span>
            <span className="text-[10px] opacity-75 font-mono-numbers">({totalOptions})</span>
          </button>

          {availableModules.map((modKey) => {
            const meta = MODULE_METADATA[modKey] || { name: modKey, color: 'blue' };
            const Icon = MODULE_ICONS[modKey] || Sliders;
            const count = options.filter((o) => o.module_key === modKey).length;
            const isSel = selectedModule === modKey;

            return (
              <button
                key={modKey}
                onClick={() => setSelectedModule(modKey)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white light:hover:text-slate-900 bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.name}</span>
                <span className="text-[10px] opacity-75 font-mono-numbers">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Right Status Filter and Search Input */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-[11px] font-semibold">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Active Only' },
              { id: 'INACTIVE', label: 'Inactive' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStatusFilter === st.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white light:hover:text-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search options..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* Main Content: Grouped by Module and Dropdown */}
      {Object.keys(filteredGroups).length === 0 ? (
        <div className="py-20 text-center bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-8 max-w-md mx-auto space-y-3">
          <Search className="w-10 h-10 text-slate-500 mx-auto opacity-60" />
          <h3 className="text-base font-bold text-white light:text-slate-900">
            No dropdown options match your filters
          </h3>
          <p className="text-xs text-slate-400">
            Try clearing the search query or changing the active/inactive status filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedStatusFilter('ALL');
              setSelectedModule('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(filteredGroups).map((modKey) => {
            const meta = MODULE_METADATA[modKey] || {
              name: modKey,
              desc: 'Module dropdowns and options',
              color: 'blue',
            };
            const Icon = MODULE_ICONS[modKey] || Sliders;
            const dropdownsInMod = filteredGroups[modKey];

            return (
              <div key={modKey} className="space-y-4">
                {/* Module Section Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white light:text-slate-900">
                          {meta.name}
                        </h2>
                        <span className="text-[10px] text-slate-400 font-mono-numbers">
                          ({Object.keys(dropdownsInMod).length} Dropdowns)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{meta.desc}</p>
                    </div>
                  </div>
                </div>

                {/* Dropdowns Grid under this module */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                  {Object.keys(dropdownsInMod).map((ddKey) => {
                    const dd = dropdownsInMod[ddKey];
                    const activeCount = dd.options.filter((o) => o.is_active).length;
                    const totalCount = dd.options.length;

                    return (
                      <div
                        key={ddKey}
                        className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4"
                      >
                        {/* Dropdown Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-white light:text-slate-900">
                                {dd.dropdown_label}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono-numbers ${
                                  activeCount > 0
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}
                              >
                                {activeCount} / {totalCount} Active
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              Key: {ddKey}
                            </p>
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => bulkToggleStatus(modKey, ddKey, true)}
                              className="px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-100 hover:bg-[#162033] text-emerald-400 text-[10px] font-semibold border border-[#1e293b] transition-colors"
                              title="Enable all options in this dropdown"
                            >
                              Enable All
                            </button>
                            <button
                              type="button"
                              onClick={() => bulkToggleStatus(modKey, ddKey, false)}
                              className="px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-100 hover:bg-[#162033] text-slate-400 text-[10px] font-semibold border border-[#1e293b] transition-colors"
                              title="Deactivate all options in this dropdown"
                            >
                              Disable All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAdd(modKey, ddKey, dd.dropdown_label)}
                              className="p-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs transition-colors"
                              title="Add custom option to this dropdown"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* List of Options */}
                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                          {dd.filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-[#1e293b] rounded-2xl">
                              No options match status filter.
                            </div>
                          ) : (
                            dd.filteredOptions.map((opt) => {
                              const col = COLOR_VARIANTS[opt.color] || COLOR_VARIANTS.blue;

                              return (
                                <div
                                  key={opt.id}
                                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                    opt.is_active
                                      ? 'bg-[#0e1626] light:bg-slate-50 border-[#1e293b] light:border-slate-200'
                                      : 'bg-[#0a0f1d]/40 light:bg-slate-100/60 border-[#1e293b]/50 opacity-60'
                                  }`}
                                >
                                  {/* Left Details */}
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {/* Color Pill */}
                                    <div
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 font-mono ${col.bg} ${col.text} ${col.border}`}
                                    >
                                      {opt.option_value}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className={`text-xs font-semibold truncate ${
                                            opt.is_active
                                              ? 'text-white light:text-slate-900'
                                              : 'text-slate-400 line-through'
                                          }`}
                                        >
                                          {opt.option_label}
                                        </span>

                                        {!opt.is_system && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            Custom
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-500 block mt-0.5">
                                        Status:{' '}
                                        <strong
                                          className={
                                            opt.is_active
                                              ? 'text-emerald-400'
                                              : 'text-slate-500'
                                          }
                                        >
                                          {opt.is_active ? 'Active' : 'Inactive (Hidden)'}
                                        </strong>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right Controls: Edit, Delete (if custom), and Active Toggle */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(opt)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                      title="Edit option label"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    {!opt.is_system && (
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(opt)}
                                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                                        title="Delete custom option"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Toggle Switch */}
                                    <button
                                      type="button"
                                      onClick={() => toggleOptionStatus(opt.id, !opt.is_active)}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        opt.is_active ? 'bg-emerald-500' : 'bg-[#1e293b]'
                                      }`}
                                      title={
                                        opt.is_active
                                          ? 'Click to Deactivate (Hide from dropdown)'
                                          : 'Click to Activate (Show in dropdown)'
                                      }
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                          opt.is_active ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Changes take effect instantly in {meta.name}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenAdd(modKey, ddKey, dd.dropdown_label)}
                            className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Option
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Option Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Add New Dropdown Option
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Module *</label>
                <select
                  value={addForm.module_key}
                  onChange={(e) => {
                    const m = e.target.value;
                    const firstDdKey = Object.keys(grouped[m] || {})[0] || 'strategy_name';
                    const firstLabel = grouped[m]?.[firstDdKey]?.dropdown_label || 'Strategy';
                    setAddForm((prev) => ({
                      ...prev,
                      module_key: m,
                      dropdown_key: firstDdKey,
                      dropdown_label: firstLabel,
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  {availableModules.map((m) => (
                    <option key={m} value={m}>
                      {MODULE_METADATA[m]?.name || m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Dropdown *</label>
                <select
                  value={addForm.dropdown_key}
                  onChange={(e) => {
                    const dd = e.target.value;
                    const label = grouped[addForm.module_key]?.[dd]?.dropdown_label || dd;
                    setAddForm((prev) => ({
                      ...prev,
                      dropdown_key: dd,
                      dropdown_label: label,
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  {Object.keys(grouped[addForm.module_key] || {}).map((ddKey) => (
                    <option key={ddKey} value={ddKey}>
                      {grouped[addForm.module_key][ddKey].dropdown_label} ({ddKey})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Option Display Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Iron Fly, Ratio Spread, Positional"
                  value={addForm.option_label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddForm((prev) => ({
                      ...prev,
                      option_label: val,
                      option_value: prev.option_value ? prev.option_value : val,
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Option Value (Stored Key) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Iron Fly, Ratio Spread"
                  value={addForm.option_value}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, option_value: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Color Theme Badge</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(COLOR_VARIANTS).map((cKey) => {
                    const c = COLOR_VARIANTS[cKey];
                    const isSel = addForm.color === cKey;
                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => setAddForm((prev) => ({ ...prev, color: cKey }))}
                        className={`p-2 rounded-xl text-center text-xs font-bold border transition-all ${
                          c.bg
                        } ${c.text} ${
                          isSel ? 'border-white scale-105 shadow-sm' : c.border
                        }`}
                      >
                        {cKey}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Apply to all modules checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="apply_all"
                  checked={addForm.apply_to_all_modules}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      apply_to_all_modules: e.target.checked,
                    }))
                  }
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="apply_all" className="text-[11px] text-slate-300 cursor-pointer">
                  Also make this option available in filters (e.g. All Trades & Journal)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Create Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Option Modal */}
      {editingOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
              <h3 className="text-sm font-bold text-white light:text-slate-900">
                Edit Dropdown Option
              </h3>
              <button
                onClick={() => setEditingOption(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Option Display Label *</label>
                <input
                  type="text"
                  required
                  value={editForm.option_label}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, option_label: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Color Theme Badge</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(COLOR_VARIANTS).map((cKey) => {
                    const c = COLOR_VARIANTS[cKey];
                    const isSel = editForm.color === cKey;
                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, color: cKey }))}
                        className={`p-2 rounded-xl text-center text-xs font-bold border transition-all ${
                          c.bg
                        } ${c.text} ${
                          isSel ? 'border-white scale-105 shadow-sm' : c.border
                        }`}
                      >
                        {cKey}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setEditingOption(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Reset Dropdown Options?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will restore all options to system defaults.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {selectedModule === 'ALL'
                ? 'All custom options across all modules will be reset to official system defaults.'
                : `Options for module "${MODULE_METADATA[selectedModule]?.name || selectedModule}" will be restored to defaults.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleReset}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-all disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Defaults'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
