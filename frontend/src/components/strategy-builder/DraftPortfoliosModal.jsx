import React, { useState, useEffect } from 'react';
import {
  X,
  FolderKanban,
  Plus,
  Play,
  ArrowRight,
  Trash2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function DraftPortfoliosModal({
  isOpen,
  onClose,
  onLoadStrategy,
  currentBuilderLegs = [],
  currentUnderlying = 'NIFTY',
}) {
  const [portfolios, setPortfolios] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('portfolios'); // 'portfolios' or 'new'
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newStrategyName, setNewStrategyName] = useState('');
  const [convertingId, setConvertingId] = useState(null);

  const toast = useToast();
  const notify = (msg, type = 'success') => {
    if (type === 'error' && typeof toast?.error === 'function') toast.error(msg);
    else if (type === 'info' && typeof toast?.info === 'function') toast.info(msg);
    else if (type === 'success' && typeof toast?.success === 'function') toast.success(msg);
    else if (typeof toast?.showToast === 'function') toast.showToast(msg, type);
    else if (typeof toast?.show === 'function') toast.show(msg, type);
    else console.log(`[${type}] ${msg}`);
  };

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const [draftsRes, portfoliosRes] = await Promise.all([
        api.get('/strategy-drafts'),
        api.get('/strategy-drafts/portfolios'),
      ]);
      setDrafts(draftsRes.data?.data || []);
      setPortfolios(portfoliosRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load strategy drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDrafts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save current builder legs as a draft
  const handleSaveCurrentStrategy = async (e) => {
    e.preventDefault();
    if (!currentBuilderLegs || currentBuilderLegs.length === 0) {
      notify('Add at least 1 leg to the builder before saving.', 'error');
      return;
    }

    try {
      setLoading(true);
      await api.post('/strategy-drafts', {
        portfolio_name: newPortfolioName || 'Default Portfolio',
        strategy_name: newStrategyName || `${currentUnderlying} Custom Strategy`,
        underlying: currentUnderlying,
        legs: currentBuilderLegs,
      });

      notify('Strategy saved to Draft Portfolios!', 'success');
      setNewStrategyName('');
      setActiveTab('portfolios');
      fetchDrafts();
    } catch (err) {
      console.error('Error saving draft:', err);
      notify(err.response?.data?.message || 'Failed to save strategy', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete draft
  const handleDeleteDraft = async (id) => {
    if (!window.confirm('Delete this saved strategy draft?')) return;
    try {
      await api.delete(`/strategy-drafts/${id}`);
      notify('Strategy draft deleted.', 'info');
      fetchDrafts();
    } catch (err) {
      notify('Failed to delete draft', 'error');
    }
  };

  // Convert draft to real trade in TradeJournal
  const handleConvertToRealTrade = async (draft) => {
    try {
      setConvertingId(draft.id);
      const res = await api.post(`/strategy-drafts/${draft.id}/convert-to-trade`);
      notify(res.data?.message || 'Converted to real trades in TradeJournal!', 'success');
      onClose();
    } catch (err) {
      console.error('Conversion failed:', err);
      notify(err.response?.data?.message || 'Failed to convert to real trade', 'error');
    } finally {
      setConvertingId(null);
    }
  };

  // Load into Strategy Builder
  const handleLoad = (draft) => {
    onLoadStrategy({
      name: draft.strategy_name,
      underlying: draft.underlying,
      legs: draft.legs,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#0e1626] border border-[#1e293b] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#121b2d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Draft Portfolios & Saved Strategies</h2>
              <p className="text-xs text-slate-400">
                Manage virtual paper portfolios and convert winning setups to real trades
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar & Action */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-[#1e293b] bg-[#0e1626]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('portfolios')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'portfolios'
                  ? 'border-blue-500 text-white bg-[#121b2d]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Saved Strategies ({drafts.length})
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'new'
                  ? 'border-blue-500 text-white bg-[#121b2d]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              + Save Current Strategy
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'new' ? (
            /* Save Current Strategy Form */
            <form onSubmit={handleSaveCurrentStrategy} className="max-w-md mx-auto space-y-4 py-4">
              <div className="text-center mb-6">
                <h3 className="text-base font-bold text-white">Save Current Builder Strategy</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Save all {currentBuilderLegs.length} active legs for {currentUnderlying} into your draft portfolios.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Expiry Strangle, Earnings Play"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  className="w-full bg-[#121b2d] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Strategy Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Iron Condor, Bull Call Spread"
                  value={newStrategyName}
                  onChange={(e) => setNewStrategyName(e.target.value)}
                  className="w-full bg-[#121b2d] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('portfolios')}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Save Draft
                </button>
              </div>
            </form>
          ) : (
            /* Saved Strategies List */
            <div className="space-y-4">
              {drafts.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <FolderKanban className="w-12 h-12 mx-auto stroke-[1.5] text-slate-600 mb-3" />
                  <p className="text-sm font-medium">No saved strategies yet.</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Build a strategy on the graph and click &quot;+ Save Current Strategy&quot; to track it here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {drafts.map((draft) => {
                    const legs = Array.isArray(draft.legs) ? draft.legs : [];
                    return (
                      <div
                        key={draft.id}
                        className="bg-[#121b2d] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {draft.underlying}
                              </span>
                              <h4 className="text-sm font-bold text-white mt-1">
                                {draft.strategy_name}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                Portfolio: {draft.portfolio_name || 'Default'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteDraft(draft.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors"
                              title="Delete draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Legs summary list */}
                          <div className="bg-[#0b101c] rounded-lg p-2.5 my-3 border border-slate-800/80 space-y-1">
                            {legs.slice(0, 4).map((leg, i) => (
                              <div key={i} className="flex justify-between text-[11px] font-mono">
                                <span className={leg.side === 'BUY' ? 'text-blue-400' : 'text-rose-400'}>
                                  {leg.side} {leg.lots}L {leg.strike} {leg.type}
                                </span>
                                <span className="text-slate-400">₹{leg.entryPrice || leg.ltp}</span>
                              </div>
                            ))}
                            {legs.length > 4 && (
                              <div className="text-[10px] text-slate-500 text-center pt-1">
                                + {legs.length - 4} more legs
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                          <button
                            onClick={() => handleLoad(draft)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Open in Builder
                          </button>

                          <button
                            onClick={() => handleConvertToRealTrade(draft)}
                            disabled={convertingId === draft.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {convertingId === draft.id ? 'Converting...' : 'Convert to Real Trade'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
