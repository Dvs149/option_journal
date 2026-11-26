import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Bookmark,
  Clock,
  FileText,
  User,
  Sparkles,
  LayoutGrid,
  List,
  CheckCircle2,
  Trash2,
  Edit3,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Coffee,
  Library,
  BookMarked,
  ArrowUpDown,
  Filter,
  Eye,
  Layers,
  CopyPlus,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { getPaginationPages } from '../utils/pagination';
import { extractFirstImageUrl, cleanStorySummary } from '../utils/storyFormatter';
import StoryFormModal from '../components/stories/StoryFormModal';
import StoryReaderModal from '../components/stories/StoryReaderModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import SeriesManagerModal from '../components/stories/SeriesManagerModal';

const STORIES_VIEW_MODE_KEY = 'tj_stories_view_mode';
const STORIES_PER_PAGE_KEY = 'tj_stories_per_page';

export default function Stories() {
  const { showToast } = useToast();
  const { isDark, isKite } = useTheme();

  // Story list state
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_stories: 0,
    total_words: 0,
    completed_count: 0,
    reading_count: 0,
    favorites_count: 0,
    categories: [],
    series_count: 0,
    series_list: [],
  });

  // Query / Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeries, setSelectedSeries] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, series_only, unread, reading, completed, favorites
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => {
    try {
      const saved = localStorage.getItem(STORIES_PER_PAGE_KEY);
      if (saved && [12, 24, 48].includes(Number(saved))) {
        return Number(saved);
      }
    } catch (e) {
      // ignore
    }
    return 12;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // View state: grid vs list (persisted in localStorage)
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORIES_VIEW_MODE_KEY);
      if (saved === 'list' || saved === 'grid') {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    return 'grid';
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORIES_VIEW_MODE_KEY, mode);
    } catch (e) {
      // ignore
    }
  };

  const handleSetPerPage = (num) => {
    const parsed = Number(num);
    setPerPage(parsed);
    setPage(1);
    try {
      localStorage.setItem(STORIES_PER_PAGE_KEY, String(parsed));
    } catch (e) {
      // ignore
    }
  };

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [readerOpen, setReaderOpen] = useState(false);
  const [readingStory, setReadingStory] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [seriesManagerOpen, setSeriesManagerOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Fetch stories
  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'all') params.category = selectedCategory;

      if (selectedSeries !== 'all') {
        if (selectedSeries === '__series_only__') {
          params.series_filter = 'series_only';
        } else if (selectedSeries === '__standalone_only__') {
          params.series_filter = 'standalone_only';
        } else {
          params.series_name = selectedSeries;
        }
      }

      if (statusFilter === 'favorites') {
        params.is_favorite = 1;
      } else if (statusFilter === 'series_only') {
        params.series_filter = 'series_only';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const res = await api.get('/stories', { params });
      if (res.data && res.data.status === 'success') {
        setStories(res.data.data || []);
        setTotalPages(res.data.last_page || 1);
        setTotalCount(res.data.total || 0);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load stories:', err);
      showToast('error', 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortOrder, search, selectedCategory, selectedSeries, statusFilter, showToast]);

  const handleAddNextPart = (story) => {
    const nextPartNum = (story.part_number || 1) + 1;
    setEditingStory({
      isNextPart: true,
      series_name: story.series_name || story.title,
      part_number: nextPartNum,
      title: `Part ${nextPartNum}`,
      author: story.author || '',
      category: story.category || 'General',
      cover_color: story.cover_color || '#3b82f6',
      tags: story.tags || '',
    });
    setFormModalOpen(true);
  };

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Handle Form Submit (Add or Edit)
  const handleSaveStory = async (payload) => {
    setFormSubmitting(true);
    try {
      if (editingStory) {
        const res = await api.put(`/stories/${editingStory.id}`, payload);
        if (res.data && res.data.status === 'success') {
          showToast('success', 'Story updated successfully');
          setFormModalOpen(false);
          setEditingStory(null);
          // If the edited story is currently being read, update reader view
          if (readingStory && readingStory.id === editingStory.id) {
            setReadingStory(res.data.data);
          }
          fetchStories();
        }
      } else {
        const res = await api.post('/stories', payload);
        if (res.data && res.data.status === 'success') {
          showToast('success', 'New story created');
          setFormModalOpen(false);
          fetchStories();
        }
      }
    } catch (err) {
      console.error('Failed to save story:', err);
      const msg = err.response?.data?.message || 'Failed to save story';
      showToast('error', msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Story
  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/stories/${storyToDelete.id}`);
      showToast('success', 'Story deleted');
      setDeleteModalOpen(false);
      setStoryToDelete(null);
      if (readingStory && readingStory.id === storyToDelete.id) {
        setReaderOpen(false);
        setReadingStory(null);
      }
      fetchStories();
    } catch (err) {
      console.error('Failed to delete story:', err);
      showToast('error', 'Failed to delete story');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id) => {
    try {
      const res = await api.patch(`/stories/${id}/favorite`);
      if (res.data && res.data.status === 'success') {
        const updated = res.data.data;
        setStories((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_favorite: updated.is_favorite } : s))
        );
        if (readingStory && readingStory.id === id) {
          setReadingStory((prev) => ({ ...prev, is_favorite: updated.is_favorite }));
        }
        setStats((prev) => ({
          ...prev,
          favorites_count: updated.is_favorite
            ? prev.favorites_count + 1
            : Math.max(0, prev.favorites_count - 1),
        }));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      showToast('error', 'Could not update bookmark');
    }
  };

  // Update Progress from reader
  const handleUpdateProgress = async (id, progress, paragraphIndex = null) => {
    try {
      const payload = { progress };
      if (typeof paragraphIndex === 'number') {
        payload.paragraph_index = paragraphIndex;
      }
      const res = await api.patch(`/stories/${id}/progress`, payload);
      if (res.data && res.data.status === 'success') {
        const updated = res.data.data;
        setStories((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  reading_progress: updated.reading_progress,
                  last_read_paragraph: updated.last_read_paragraph,
                  status: updated.status,
                  last_read_at: updated.last_read_at,
                }
              : s
          )
        );
        if (readingStory && readingStory.id === id) {
          setReadingStory((prev) => ({
            ...prev,
            reading_progress: updated.reading_progress,
            last_read_paragraph: updated.last_read_paragraph,
            status: updated.status,
            last_read_at: updated.last_read_at,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  // Open Reader Mode
  const handleOpenReader = async (story) => {
    setReadingStory(story);
    setReaderOpen(true);
    // Ping API to update last_read_at and transition unread to reading
    try {
      const res = await api.get(`/stories/${story.id}`);
      if (res.data && res.data.data) {
        setReadingStory(res.data.data);
        setStories((prev) =>
          prev.map((s) => (s.id === story.id ? res.data.data : s))
        );
      }
    } catch (e) {
      console.warn('Reader load:', e);
    }
  };

  // Seed sample stories
  const handleSeedSamples = async () => {
    setIsSeeding(true);
    try {
      const res = await api.post('/stories/samples');
      if (res.data && res.data.status === 'success') {
        showToast('success', 'Sample stories added to your library!');
        fetchStories();
      }
    } catch (err) {
      console.error('Failed to seed sample stories:', err);
      showToast('error', 'Failed to seed sample stories');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0b0f19] light:bg-[#f8fafc] text-white light:text-slate-900 pb-16">
      {/* Top Banner / Header */}
      <div className="px-4 sm:px-8 py-6 border-b border-[#1e293b] light:border-slate-200 bg-[#0e1626]/60 light:bg-white/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white light:text-slate-900 flex items-center gap-2">
                  Free Time Stories
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Reader Mode
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 light:text-slate-500">
                  Relax, reflect, and enjoy inspiring stories, literature, and thoughts in your free time
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle (Persisted) */}
            <div className="flex items-center bg-[#0b0f19] light:bg-slate-100 p-1 rounded-xl border border-[#1e293b] light:border-slate-200">
              <button
                type="button"
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? isKite
                      ? 'bg-[#252525] text-[#ff5722] ring-2 ring-blue-400/90 shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? isKite
                      ? 'bg-[#252525] text-[#ff5722] ring-2 ring-blue-400/90 shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Manage Series Button */}
            <button
              type="button"
              onClick={() => setSeriesManagerOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:border-blue-500/50 transition-all flex items-center gap-1.5 shadow-sm"
              title="Manage multi-part stories, series orders, and auto-detected parts"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Manage Series</span>
              {stats.series_count > 0 && (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-blue-500/20 text-blue-400 font-mono font-bold">
                  {stats.series_count}
                </span>
              )}
            </button>

            {/* Seed Sample Stories Button */}
            <button
              type="button"
              onClick={handleSeedSamples}
              disabled={isSeeding}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:border-blue-500/50 transition-all flex items-center gap-1.5 shadow-sm"
              title="Add 3 curated sample stories"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {isSeeding ? 'Adding...' : 'Sample Stories'}
            </button>

            {/* Add Story Button */}
            <button
              type="button"
              onClick={() => {
                setEditingStory(null);
                setFormModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Write Story
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Stories */}
          <div className="p-4 rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Library className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500 block truncate">
                Total Stories
              </span>
              <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
                {stats.total_stories.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Total Words Stored */}
          <div className="p-4 rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500 block truncate">
                Total Words
              </span>
              <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
                {stats.total_words.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Currently Reading */}
          <div className="p-4 rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500 block truncate">
                In Progress
              </span>
              <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
                {stats.reading_count.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Completed */}
          <div className="p-4 rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500 block truncate">
                Completed
              </span>
              <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
                {stats.completed_count.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Bookmarks */}
          <div className="p-4 rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Bookmark className="w-5 h-5 fill-amber-400/30" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500 block truncate">
                Favorites
              </span>
              <span className="text-lg font-bold text-white light:text-slate-900 font-mono-numbers">
                {stats.favorites_count.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search stories by title, author, category, or themes..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-sm text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category & Sorting Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {stats.categories &&
                  stats.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>

              {/* Series Dropdown */}
              <select
                value={selectedSeries}
                onChange={(e) => {
                  setSelectedSeries(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Series & Standalone</option>
                <option value="__series_only__">📚 Multi-Part Only</option>
                <option value="__standalone_only__">📄 Standalone Only</option>
                {stats.series_list && stats.series_list.length > 0 && (
                  <optgroup label="Specific Series">
                    {stats.series_list.map((s) => (
                      <option key={s} value={s}>
                        Series: {s}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* Sort By Dropdown */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, ord] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(ord);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="part_number-asc">Part Number (1, 2, 3...)</option>
                <option value="word_count-desc">Longest Read</option>
                <option value="word_count-asc">Shortest Read</option>
                <option value="last_read_at-desc">Recently Read</option>
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-[#1e293b]/50 light:border-slate-100">
            {[
              { id: 'all', label: 'All Stories', count: stats.total_stories },
              { id: 'series_only', label: 'Multi-Part Series', count: stats.series_count },
              { id: 'unread', label: 'Unread', count: stats.total_stories - stats.reading_count - stats.completed_count },
              { id: 'reading', label: 'In Progress', count: stats.reading_count },
              { id: 'completed', label: 'Completed', count: stats.completed_count },
              { id: 'favorites', label: 'Bookmarked', count: stats.favorites_count },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'bg-[#0b0f19] light:bg-slate-100 text-slate-400 hover:text-white light:hover:text-slate-900 border border-[#1e293b] light:border-slate-200'
                  }`}
                >
                  {tab.id === 'favorites' && (
                    <Bookmark
                      className={`w-3.5 h-3.5 ${active ? 'fill-white' : 'fill-amber-400/50 text-amber-400'}`}
                    />
                  )}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 light:bg-slate-200 text-slate-400 light:text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Series Filter Banner */}
        {selectedSeries !== 'all' && (
          <div className="p-3.5 rounded-2xl bg-blue-600/10 border border-blue-500/25 flex items-center justify-between gap-3 text-xs flex-wrap animate-fadeIn shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white light:text-slate-900 block">
                  {selectedSeries === '__series_only__'
                    ? 'Showing All Multi-Part Series Stories'
                    : selectedSeries === '__standalone_only__'
                    ? 'Showing Standalone Stories Only'
                    : `Viewing Series: ${selectedSeries}`}
                </span>
                <span className="text-[11px] text-slate-400">
                  {selectedSeries !== '__series_only__' && selectedSeries !== '__standalone_only__'
                    ? 'Parts are listed in chronological reading order'
                    : 'Filtered library view'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedSeries !== '__series_only__' && selectedSeries !== '__standalone_only__' && (
                <button
                  type="button"
                  onClick={() => {
                    handleAddNextPart({ series_name: selectedSeries, part_number: stories.length });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold flex items-center gap-1.5 hover:bg-emerald-500 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Next Part
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedSeries('all');
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#0b0f19] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 transition-colors"
              >
                Clear Series Filter
              </button>
            </div>
          </div>
        )}

        {/* Stories Listing Area */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Opening library...</p>
          </div>
        ) : stories.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-6 rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-inner">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white light:text-slate-900">
                No stories found
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 light:text-slate-500 mt-1 max-w-md mx-auto">
                {search || selectedCategory !== 'all' || statusFilter !== 'all'
                  ? 'No stories match your current search or filter criteria. Try clearing filters.'
                  : 'Your reading library is currently empty. Write your own story or load our inspiring free-time samples.'}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSeedSamples}
                disabled={isSeeding}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0b0f19] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                {isSeeding ? 'Adding Samples...' : 'Load Sample Stories'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingStory(null);
                  setFormModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Write First Story
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stories.map((story) => {
              const cover = story.cover_color || '#3b82f6';
              const isCompleted = story.status === 'completed';
              const isReading = story.status === 'reading';
              const firstImg = extractFirstImageUrl(story.content);

              return (
                <div
                  key={story.id}
                  className="group relative rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-600 light:hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden"
                >
                  {/* Top Cover Color Stripe */}
                  <div
                    className="h-2 w-full transition-opacity group-hover:opacity-100"
                    style={{ backgroundColor: cover }}
                  />

                  {/* Optional First Image Banner */}
                  {firstImg && (
                    <div
                      onClick={() => handleOpenReader(story)}
                      className="w-full h-36 overflow-hidden bg-black/20 cursor-pointer relative group/img"
                    >
                      <img
                        src={firstImg.url}
                        alt={firstImg.caption || story.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1626] light:from-white via-transparent to-transparent opacity-60" />
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Header Row: Category & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider truncate max-w-[140px]"
                          style={{
                            backgroundColor: `${cover}18`,
                            color: cover,
                          }}
                        >
                          {story.category}
                        </span>

                        {story.series_name && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSeries(story.series_name);
                              setPage(1);
                            }}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25 hover:bg-purple-500/30 transition-colors flex items-center gap-1 cursor-pointer truncate max-w-[140px]"
                            title={`Click to filter series: ${story.series_name}`}
                          >
                            <Layers className="w-3 h-3 text-purple-400 flex-shrink-0" />
                            <span className="truncate">{story.series_name}</span>
                            <span className="font-mono">· P{story.part_number || 1}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isCompleted ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : isReading ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center gap-1 font-mono-numbers">
                            <Clock className="w-3 h-3" />
                            {story.reading_progress || 0}%
                            {story.last_read_paragraph > 0 && ` · ¶${story.last_read_paragraph + 1}`}
                          </span>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(story.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                          title={story.is_favorite ? 'Favorited' : 'Add to favorites'}
                        >
                          <Bookmark
                            className={`w-4 h-4 ${
                              story.is_favorite
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-500'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => handleOpenReader(story)}
                      className="text-base font-bold text-white light:text-slate-900 group-hover:text-blue-400 light:group-hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer mb-1.5"
                      title={story.title}
                    >
                      {story.title}
                    </h3>

                    {/* Author */}
                    <p className="text-xs text-slate-400 light:text-slate-500 flex items-center gap-1.5 mb-3">
                      <User className="w-3.5 h-3.5 opacity-70" />
                      <span className="truncate">{story.author || 'Anonymous'}</span>
                    </p>

                    {/* Synopsis / Summary */}
                    <p className="text-xs text-slate-300/80 light:text-slate-600 line-clamp-3 leading-relaxed mb-4 flex-1">
                      {cleanStorySummary(story.summary || story.content, 140)}
                    </p>

                    {/* Reading Metrics */}
                    <div className="pt-3 border-t border-[#1e293b]/60 light:border-slate-100 flex items-center justify-between text-[11px] text-slate-400 light:text-slate-500 mb-3 font-mono-numbers">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        {(story.word_count || 0).toLocaleString()} words
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        ~{story.estimated_reading_time || 1} min
                      </span>
                    </div>

                    {/* Progress Bar if started */}
                    {story.reading_progress > 0 && (
                      <div className="w-full mb-3.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>{story.reading_progress}% read</span>
                          {story.last_read_paragraph > 0 && (
                            <span className="text-blue-400 font-semibold font-mono">
                              ¶{story.last_read_paragraph + 1}
                            </span>
                          )}
                        </div>
                        <div className="w-full h-1 bg-[#1e293b] light:bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${story.reading_progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Card Action Buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenReader(story)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Read Story
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddNextPart(story)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title={`Add next part to ${story.series_name || story.title}`}
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStory(story);
                            setFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-100 transition-colors"
                          title="Edit story"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStoryToDelete(story);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete story"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List / Table View */
          <div className="rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 overflow-hidden shadow-sm">
            {/* Mobile Stacked List View (< md screens: fits 100% width without horizontal scroll) */}
            <div className="block md:hidden divide-y divide-[#1e293b]/60 light:divide-slate-100">
              {stories.map((story) => {
                const cover = story.cover_color || '#3b82f6';
                const isCompleted = story.status === 'completed';
                return (
                  <div
                    key={story.id}
                    className="p-3.5 hover:bg-[#121b2d]/50 light:hover:bg-slate-50/80 transition-colors space-y-2.5"
                  >
                    {/* Top Row: Story Title, Category & Read Action */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span
                          className="w-1.5 h-10 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: cover }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4
                              onClick={() => handleOpenReader(story)}
                              className="font-bold text-white light:text-slate-900 hover:text-blue-400 cursor-pointer text-sm leading-snug"
                            >
                              {story.title}
                            </h4>
                            {story.last_read_paragraph > 0 && !isCompleted && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                                ¶{story.last_read_paragraph + 1}
                              </span>
                            )}
                            {story.series_name && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSeries(story.series_name);
                                  setPage(1);
                                }}
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 flex-shrink-0"
                              >
                                <Layers className="w-2.5 h-2.5 text-purple-400" />
                                <span>P{story.part_number || 1}</span>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 truncate">
                            <span className="truncate">by {story.author || 'Anonymous'}</span>
                            <span>·</span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                              style={{
                                backgroundColor: `${cover}18`,
                                color: cover,
                              }}
                            >
                              {story.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Read Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenReader(story)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors flex-shrink-0 shadow-sm"
                      >
                        Read
                      </button>
                    </div>

                    {/* Bottom Row: Words & Length, Status & Progress, and Secondary Actions */}
                    <div className="pt-2 border-t border-[#1e293b]/40 light:border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                      {/* Words & Time */}
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono-numbers">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-blue-400" />
                          {(story.word_count || 0).toLocaleString()}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          ~{story.estimated_reading_time || 1}m
                        </span>
                      </div>

                      {/* Status & Progress Bar */}
                      <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
                        <div className="w-full h-1.5 bg-slate-800 light:bg-slate-200 rounded-full overflow-hidden flex-1">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${story.reading_progress || 0}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-400 text-[10px] flex-shrink-0">
                          {story.reading_progress || 0}%
                        </span>
                      </div>

                      {/* Actions: Bookmark, Edit, Delete */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAddNextPart(story)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Add next part"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(story.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                          title={story.is_favorite ? 'Favorited' : 'Bookmark'}
                        >
                          <Bookmark
                            className={`w-3.5 h-3.5 ${
                              story.is_favorite
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-500'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStory(story);
                            setFormModalOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStoryToDelete(story);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1e293b] light:border-slate-200 bg-[#0b0f19]/40 light:bg-slate-50 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-4">Story</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Words & Length</th>
                    <th className="py-3 px-4">Status & Progress</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                  {stories.map((story) => {
                    const cover = story.cover_color || '#3b82f6';
                    return (
                      <tr
                        key={story.id}
                        className="hover:bg-[#121b2d]/50 light:hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-2.5 h-8 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cover }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h4
                                  onClick={() => handleOpenReader(story)}
                                  className="font-bold text-white light:text-slate-900 hover:text-blue-400 cursor-pointer text-sm truncate max-w-xs sm:max-w-md"
                                >
                                  {story.title}
                                </h4>
                                {story.last_read_paragraph > 0 && story.status !== 'completed' && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                                    ¶{story.last_read_paragraph + 1}
                                  </span>
                                )}
                                {story.series_name && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSeries(story.series_name);
                                      setPage(1);
                                    }}
                                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/25 hover:bg-purple-500/30 transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
                                    title={`Click to filter series: ${story.series_name}`}
                                  >
                                    <Layers className="w-3 h-3 text-purple-400" />
                                    <span className="truncate max-w-[130px]">{story.series_name}</span>
                                    <span className="font-mono font-bold">· Part {story.part_number || 1}</span>
                                  </button>
                                )}
                              </div>
                              <p className="text-slate-400 text-[11px] truncate">
                                by {story.author || 'Anonymous'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${cover}18`,
                              color: cover,
                            }}
                          >
                            {story.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono-numbers text-slate-300 light:text-slate-700">
                          <div>{(story.word_count || 0).toLocaleString()} words</div>
                          <div className="text-[11px] text-slate-500">
                            ~{story.estimated_reading_time || 1} min read
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-[140px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="capitalize text-slate-400">
                                {story.status}
                              </span>
                              <span className="font-mono text-slate-400">
                                {story.reading_progress || 0}%
                                {story.last_read_paragraph > 0 && story.status !== 'completed' && (
                                  <span className="text-blue-400 ml-1 font-mono">¶{story.last_read_paragraph + 1}</span>
                                )}
                              </span>
                            </div>
                            <div className="w-full h-1 bg-slate-800 light:bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${story.reading_progress || 0}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddNextPart(story)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              title={`Add next part to ${story.series_name || story.title}`}
                            >
                              <CopyPlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleFavorite(story.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                              title={story.is_favorite ? 'Favorited' : 'Bookmark'}
                            >
                              <Bookmark
                                className={`w-4 h-4 ${
                                  story.is_favorite
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-500'
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReader(story)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                            >
                              Read
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStory(story);
                                setFormModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStoryToDelete(story);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sliding Window Pagination Footer */}
        {stories.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs mt-auto select-none shadow-sm">
            <span className="text-slate-400 text-[11px] font-mono-numbers">
              Showing {(page - 1) * perPage + 1} to{' '}
              {Math.min(page * perPage, totalCount)} of {totalCount} stories
            </span>

            <div className="flex items-center gap-1.5">
              {/* Prev Button */}
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-[#0b0f19] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-400 hover:text-white light:hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Numbered Page Buttons with Sliding Window */}
              {getPaginationPages(page, totalPages).map((pg, idx) =>
                pg === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-500 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${pg}`}
                    type="button"
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      page === pg
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#0b0f19] light:bg-slate-100 text-slate-400 hover:text-white light:hover:text-slate-900 border border-[#1e293b] light:border-slate-200'
                    }`}
                  >
                    {pg}
                  </button>
                )
              )}

              {/* Next Button */}
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-[#0b0f19] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-400 hover:text-white light:hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Per Page Selector */}
              <select
                value={perPage}
                onChange={(e) => handleSetPerPage(e.target.value)}
                className="ml-2 px-2.5 py-1 rounded-lg bg-[#0b0f19] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700 text-xs"
              >
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
                <option value={48}>48 / page</option>
              </select>
            </div>
          </div>
        )}
      </main>

      {/* Story Form Modal (Add / Edit) */}
      <StoryFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingStory(null);
        }}
        onSubmit={handleSaveStory}
        initialData={editingStory}
        isLoading={formSubmitting}
        existingSeriesList={stats.series_list || []}
      />

      {/* Story Reader Modal (Immersive Reader Mode) */}
      <StoryReaderModal
        isOpen={readerOpen}
        onClose={() => {
          setReaderOpen(false);
          setReadingStory(null);
        }}
        story={readingStory}
        onToggleFavorite={handleToggleFavorite}
        onUpdateProgress={handleUpdateProgress}
        onEdit={(story) => {
          setEditingStory(story);
          setFormModalOpen(true);
        }}
        onNavigatePart={(part) => {
          handleOpenReader(part);
        }}
        onAddNextPart={(story) => {
          setReaderOpen(false);
          handleAddNextPart(story);
        }}
      />

      {/* Series Manager Modal */}
      <SeriesManagerModal
        isOpen={seriesManagerOpen}
        onClose={() => setSeriesManagerOpen(false)}
        onOpenReader={(part) => {
          handleOpenReader(part);
        }}
        onAddNewPart={(seriesData) => {
          setEditingStory({
            isNextPart: true,
            series_name: seriesData.series_name,
            part_number: seriesData.part_number,
            title: `Part ${seriesData.part_number}`,
            author: seriesData.author,
            category: seriesData.category,
            cover_color: seriesData.cover_color,
          });
          setFormModalOpen(true);
        }}
        onSeriesUpdated={() => {
          fetchStories();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setStoryToDelete(null);
        }}
        onConfirm={confirmDeleteStory}
        title="Delete Story?"
        message={`Are you sure you want to delete "${storyToDelete?.title || 'this story'}"? This action cannot be undone.`}
        confirmText="Delete Story"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </div>
  );
}
