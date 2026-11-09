import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  ChevronDown,
  Bell,
  Menu,
  ShieldAlert,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function Navbar({
  filter,
  onFilterChange,
  dateRangeDisplay,
  customFrom,
  customTo,
  onCustomDateChange,
  onOpenMobileSidebar,
}) {
  const { user } = useAuth();
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [localFrom, setLocalFrom] = useState(customFrom || '');
  const [localTo, setLocalTo] = useState(customTo || '');

  // Close modals, dropdowns, and notifications on Escape
  useEscapeKey(() => setShowCustomModal(false), showCustomModal);
  useEscapeKey(() => setShowNotifications(false), showNotifications);
  useEscapeKey(() => setShowFilterDropdown(false), showFilterDropdown);

  // Keep local dates in sync when custom modal opens or props change
  useEffect(() => {
    if (showCustomModal) {
      setLocalFrom(customFrom || new Date().toISOString().split('T')[0]);
      setLocalTo(customTo || new Date().toISOString().split('T')[0]);
    }
  }, [showCustomModal, customFrom, customTo]);

  const filterOptions = [
    { key: 'today', label: "Today" },
    { key: 'yesterday', label: "Yesterday" },
    { key: 'tomorrow', label: "Tomorrow / Next Working Day" },
    { key: 'this_week', label: "This Week" },
    { key: 'this_month', label: "This Month" },
    { key: 'last_month', label: "Last Month" },
    { key: 'this_year', label: "This Year" },
    { key: 'all', label: "All Time" },
    { key: 'custom', label: "Custom Range..." },
  ];

  const currentLabel = filterOptions.find((o) => o.key === filter)?.label || 'This Month';

  return (
    <header className="h-16 px-4 md:px-8 border-b border-[#1e293b] light:border-slate-200 bg-[#0e1626]/80 light:bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      {/* Mobile Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#162033] light:hover:bg-slate-100"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="lg:hidden font-bold text-base text-white light:text-slate-900">
          TradeJournal
        </span>
      </div>

      {/* Date Filters & Range Pill (Matches reference image) */}
      <div className="flex items-center gap-3">
        {/* Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#162033] light:bg-slate-100 hover:bg-[#1f2d47] light:hover:bg-slate-200 text-xs font-semibold text-slate-200 light:text-slate-700 border border-[#1e293b] light:border-slate-200 transition-colors shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="max-w-[190px] sm:max-w-none truncate">{currentLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showFilterDropdown && (
            <div className="absolute left-0 mt-2 w-56 sm:w-60 rounded-xl bg-[#162033] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl py-1 z-50">
              {filterOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setShowFilterDropdown(false);
                    if (opt.key === 'custom') {
                      setShowCustomModal(true);
                    } else {
                      onFilterChange(opt.key);
                    }
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                    filter === opt.key
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-300 light:text-slate-700 hover:bg-[#1f2d47] light:hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Range Display Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131c2e] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs font-mono-numbers text-slate-300 light:text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{dateRangeDisplay || 'All Time'}</span>
        </div>
      </div>

      {/* Right Actions: Notifications & Avatar */}
      <div className="flex items-center gap-3">
        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#162033] light:hover:bg-slate-100 transition-colors relative"
            aria-label="Risk Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#162033] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1e293b] light:border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Risk & System Alerts
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">
                  Live
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Risk Parameters Healthy</p>
                    <p className="text-[11px] text-emerald-300/80">
                      Current drawdown is well within your defined ₹50,000 threshold.
                    </p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Trading Activity</p>
                    <p className="text-[11px] text-blue-300/80">
                      System synchronized and journal ready.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Circle */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase ring-2 ring-blue-500/30">
          {user?.name ? user.name[0] : 'T'}
        </div>
      </div>

      {/* Custom Date Range Modal rendered in document.body via Portal to escape header containing block */}
      {showCustomModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#162033] light:bg-white border border-[#1e293b] light:border-slate-200 p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Select Custom Date Range
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-white light:hover:text-slate-900 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={localFrom}
                  onChange={(e) => setLocalFrom(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 font-mono-numbers cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={localTo}
                  onChange={(e) => setLocalTo(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 font-mono-numbers cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!localFrom || !localTo}
                  onClick={() => {
                    if (localFrom && localTo) {
                      onCustomDateChange(localFrom, localTo);
                      setShowCustomModal(false);
                    }
                  }}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                  Apply Range
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
