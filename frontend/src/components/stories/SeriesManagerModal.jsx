import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ChevronRight,
  Eye,
  Check,
  Search,
  AlertCircle,
} from 'lucide-react';
import api from '../../api/client';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useToast } from '../../context/ToastContext';

export default function SeriesManagerModal({
  isOpen,
  onClose,
  onOpenReader,
  onAddNewPart,
  onSeriesUpdated,
}) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('series'); // 'series' | 'group'
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Grouping state
  const [allStories, setAllStories] = useState([]);
  const [groupSeriesName, setGroupSeriesName] = useState('');
  const [selectedStoryIds, setSelectedStoryIds] = useState([]);
  const [storySearch, setStorySearch] = useState('');
  const [detectedCandidates, setDetectedCandidates] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Renaming state
  const [editingSeriesName, setEditingSeriesName] = useState(null);
  const [renamedValue, setRenamedValue] = useState('');

  useEscapeKey(() => {
    if (isOpen) onClose();
  }, isOpen);

  // Fetch all series with parts
  const fetchSeries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stories/series');
      if (res.data?.status === 'success') {
        setSeriesList(res.data.data || []);
      }
    } catch (e) {
      showToast('Failed to load series', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch unlinked stories for manual grouping
  const fetchUnlinkedStories = async () => {
    try {
      const res = await api.get('/stories', {
        params: { per_page: 100, sort_by: 'title', sort_order: 'asc' },
      });
      if (res.data?.status === 'success') {
        setAllStories(res.data.data || []);
      }
    } catch (e) {
      // ignore
    }
  };

  // Run auto-detection
  const runAutoDetect = async () => {
    setIsDetecting(true);
    try {
      const res = await api.post('/stories/series/auto-detect');
      if (res.data?.status === 'success') {
        setDetectedCandidates(res.data.data || []);
      }
    } catch (e) {
      showToast('Auto-detection failed', 'error');
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSeries();
      fetchUnlinkedStories();
      runAutoDetect();
      setActiveTab('series');
    }
  }, [isOpen]);

  // Handle reordering a part up or down
  const handleMovePart = async (series, partIdx, direction) => {
    const targetIdx = direction === 'up' ? partIdx - 1 : partIdx + 1;
    if (targetIdx < 0 || targetIdx >= series.parts.length) return;

    const newParts = [...series.parts];
    const temp = newParts[partIdx];
    newParts[partIdx] = newParts[targetIdx];
    newParts[targetIdx] = temp;

    // Build payload
    const storiesPayload = newParts.map((p, idx) => ({
      id: p.id,
      part_number: idx + 1,
    }));

    try {
      const res = await api.post('/stories/series/assign', {
        series_name: series.series_name,
        stories: storiesPayload,
      });
      if (res.data?.status === 'success') {
        showToast('Part reordered successfully', 'success');
        fetchSeries();
        onSeriesUpdated?.();
      }
    } catch (e) {
      showToast('Failed to reorder parts', 'error');
    }
  };

  // Handle series rename across all parts
  const handleRenameSeries = async (oldName) => {
    if (!renamedValue.trim() || renamedValue.trim() === oldName) {
      setEditingSeriesName(null);
      return;
    }

    const series = seriesList.find((s) => s.series_name === oldName);
    if (!series) return;

    const storiesPayload = series.parts.map((p, idx) => ({
      id: p.id,
      part_number: p.part_number || idx + 1,
    }));

    try {
      const res = await api.post('/stories/series/assign', {
        series_name: renamedValue.trim(),
        stories: storiesPayload,
      });
      if (res.data?.status === 'success') {
        showToast(`Series renamed to "${renamedValue.trim()}"`, 'success');
        setEditingSeriesName(null);
        fetchSeries();
        onSeriesUpdated?.();
      }
    } catch (e) {
      showToast('Failed to rename series', 'error');
    }
  };

  // Handle manual group submit
  const handleAssignStories = async (e) => {
    e.preventDefault();
    if (!groupSeriesName.trim()) {
      showToast('Please enter a series name', 'error');
      return;
    }
    if (selectedStoryIds.length === 0) {
      showToast('Please select at least one story', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const storiesPayload = selectedStoryIds.map((id, idx) => ({
        id,
        part_number: idx + 1,
      }));

      const res = await api.post('/stories/series/assign', {
        series_name: groupSeriesName.trim(),
        stories: storiesPayload,
      });

      if (res.data?.status === 'success') {
        showToast(
          `Grouped ${selectedStoryIds.length} parts into "${groupSeriesName.trim()}"`,
          'success'
        );
        setGroupSeriesName('');
        setSelectedStoryIds([]);
        fetchSeries();
        fetchUnlinkedStories();
        runAutoDetect();
        setActiveTab('series');
        onSeriesUpdated?.();
      }
    } catch (e) {
      showToast('Failed to group stories', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick accept auto-detected group
  const handleAcceptCandidate = async (candidate) => {
    setIsSubmitting(true);
    try {
      const storiesPayload = candidate.items.map((item, idx) => ({
        id: item.story_id,
        part_number: item.suggested_part || idx + 1,
      }));

      const res = await api.post('/stories/series/assign', {
        series_name: candidate.series_name,
        stories: storiesPayload,
      });

      if (res.data?.status === 'success') {
        showToast(
          `Linked ${candidate.items.length} parts into "${candidate.series_name}"`,
          'success'
        );
        fetchSeries();
        fetchUnlinkedStories();
        runAutoDetect();
        onSeriesUpdated?.();
      }
    } catch (e) {
      showToast('Failed to group detected candidate', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] light:border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white light:text-slate-900 flex items-center gap-2">
                Manage Multi-Part Stories & Series
              </h3>
              <p className="text-xs text-slate-400 light:text-slate-500">
                Organize chapters, reorder parts, and group stories into cohesive reading series
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-[#1e293b]/50 light:border-slate-100 bg-[#0b0f19]/40 light:bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab('series')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'series'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Active Series ({seriesList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('group')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'group'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Group Existing Stories ({detectedCandidates.length > 0 ? `${detectedCandidates.length} detected` : 'New'})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'series' ? (
            /* Tab 1: Active Series List */
            loading ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Loading series collection...</p>
              </div>
            ) : seriesList.length === 0 ? (
              /* No series created yet */
              <div className="py-16 text-center text-slate-400 space-y-3 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white light:text-slate-900">
                  No multi-part series created yet
                </h4>
                <p className="text-xs text-slate-400 light:text-slate-500">
                  You can group your stories (like "part 1", "part 2", etc.) into a series or create one when writing a new story.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('group')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Group Existing Stories into Series
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {seriesList.map((series) => {
                  const isEditingThis = editingSeriesName === series.series_name;
                  return (
                    <div
                      key={series.series_name}
                      className="p-4 rounded-2xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-3.5 shadow-sm"
                    >
                      {/* Series Header */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          {isEditingThis ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={renamedValue}
                                onChange={(e) => setRenamedValue(e.target.value)}
                                className="px-3 py-1.5 rounded-xl bg-[#0e1626] border border-blue-500 text-white text-sm font-bold focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameSeries(series.series_name)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSeriesName(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: series.cover_color || '#3b82f6' }}
                                />
                                {series.series_name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSeriesName(series.series_name);
                                  setRenamedValue(series.series_name);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                                title="Rename series across all parts"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap font-mono-numbers">
                            <span>by {series.author}</span>
                            <span>•</span>
                            <span className="text-blue-400 font-semibold">{series.parts_count} Parts</span>
                            <span>•</span>
                            <span>{(series.total_words || 0).toLocaleString()} words</span>
                            <span>•</span>
                            <span>~{series.estimated_reading_time} min read</span>
                          </div>
                        </div>

                        {/* Top Series Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {series.parts.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenReader?.(series.parts[0]);
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-all flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Read Part 1
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onAddNewPart?.({
                                series_name: series.series_name,
                                part_number: series.parts_count + 1,
                                author: series.author,
                                category: series.category,
                                cover_color: series.cover_color,
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Part {series.parts_count + 1}
                          </button>
                        </div>
                      </div>

                      {/* Parts Table */}
                      <div className="rounded-xl border border-[#1e293b]/70 light:border-slate-200 overflow-hidden divide-y divide-[#1e293b]/50 light:divide-slate-200 bg-[#0e1626]/60 light:bg-white">
                        {series.parts.map((part, pIdx) => (
                          <div
                            key={part.id}
                            className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-6 text-center font-mono font-bold text-blue-400 text-[11px] bg-blue-500/10 py-0.5 rounded">
                                P{part.part_number || pIdx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-white light:text-slate-900 block truncate">
                                  {part.title}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {(part.word_count || 0).toLocaleString()} words · ~{part.estimated_reading_time}m
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {part.status === 'completed' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  100%
                                </span>
                              ) : part.reading_progress > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                  {part.reading_progress}%
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] text-slate-500 bg-slate-800/40">
                                  Unread
                                </span>
                              )}

                              {/* Reorder Arrows */}
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={pIdx === 0}
                                  onClick={() => handleMovePart(series, pIdx, 'up')}
                                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move part up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={pIdx === series.parts.length - 1}
                                  onClick={() => handleMovePart(series, pIdx, 'down')}
                                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move part down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenReader?.(part);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                title="Read part"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Tab 2: Group Stories into Series */
            <div className="space-y-6">
              {/* Auto-detected Series Banner */}
              {detectedCandidates.length > 0 && (
                <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <h4 className="text-xs font-bold text-white light:text-slate-900">
                      Auto-Detected Multi-Part Stories ({detectedCandidates.length})
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    We scanned your library and found stories that match series naming patterns (like "part 1", "part 2", etc.). You can link them with 1 click:
                  </p>

                  <div className="space-y-2 pt-1">
                    {detectedCandidates.map((cand, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-white light:text-slate-900 block truncate">
                            {cand.series_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {cand.count} parts: {cand.items.map((it) => it.title).join(', ')}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAcceptCandidate(cand)}
                          className="px-3 py-1.5 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center gap-1.5 flex-shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Link as Series
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Series Grouping Form */}
              <form onSubmit={handleAssignStories} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 light:text-slate-700">
                    Series Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={groupSeriesName}
                    onChange={(e) => setGroupSeriesName(e.target.value)}
                    placeholder="e.g. Forbidden Love, The Amsterdam Chronicles"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 light:text-slate-700">
                      Select Stories to Include (Selected: {selectedStoryIds.length})
                    </label>
                    <div className="relative w-48">
                      <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={storySearch}
                        onChange={(e) => setStorySearch(e.target.value)}
                        placeholder="Filter stories..."
                        className="w-full pl-8 pr-2 py-1 text-xs rounded-lg bg-[#0b0f19] border border-slate-700 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Stories Selector List */}
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-[#1e293b] light:border-slate-200 divide-y divide-[#1e293b]/60 light:divide-slate-200 bg-[#0b0f19]/60">
                    {allStories
                      .filter((s) =>
                        storySearch ? s.title.toLowerCase().includes(storySearch.toLowerCase()) : true
                      )
                      .map((story) => {
                        const isSelected = selectedStoryIds.includes(story.id);
                        const selectedIndex = selectedStoryIds.indexOf(story.id);

                        return (
                          <div
                            key={story.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedStoryIds(selectedStoryIds.filter((id) => id !== story.id));
                              } else {
                                setSelectedStoryIds([...selectedStoryIds, story.id]);
                              }
                            }}
                            className={`p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-600/15 border-l-4 border-blue-500'
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent div
                                className="w-3.5 h-3.5 rounded text-blue-600 bg-[#0e1626] border-slate-700 pointer-events-none"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-white light:text-slate-900 block truncate">
                                  {story.title}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {story.author || 'Anonymous'} · {story.category}
                                  {story.series_name && ` · currently in "${story.series_name}"`}
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                                Part {selectedIndex + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || selectedStoryIds.length === 0 || !groupSeriesName.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSubmitting
                      ? 'Grouping Stories...'
                      : `Group as "${groupSeriesName || 'Series'}"`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
