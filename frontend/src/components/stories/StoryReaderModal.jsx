import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Bookmark,
  CheckCircle2,
  Clock,
  FileText,
  User,
  Sliders,
  Maximize2,
  Minimize2,
  Edit2,
  Share2,
  Sparkles,
  BookOpen,
  ZoomIn,
  Download,
  ArrowUp,
  MapPin,
  RotateCcw,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  WifiOff,
} from 'lucide-react';
import api from '../../api/client';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { renderStoryContent } from '../../utils/storyFormatter';
import { getOfflineStory } from '../../utils/storyOfflineStorage';

const THEMES = {
  night: {
    id: 'night',
    name: 'Night',
    bg: 'bg-[#0b0f19]',
    panel: 'bg-[#0e1626]',
    text: 'text-slate-200',
    textMuted: 'text-slate-400',
    border: 'border-[#1e293b]',
    headerBg: 'bg-[#0e1626]/95 border-[#1e293b]',
    quoteBg: 'bg-[#121b2d] border-blue-500/30 text-slate-300',
  },
  sepia: {
    id: 'sepia',
    name: 'Sepia',
    bg: 'bg-[#fcf7ec]',
    panel: 'bg-[#f5ede0]',
    text: 'text-[#2c2317]',
    textMuted: 'text-[#705e4c]',
    border: 'border-[#e4d7c5]',
    headerBg: 'bg-[#f5ede0]/95 border-[#e4d7c5]',
    quoteBg: 'bg-[#efe3d1] border-[#cbb295] text-[#3d3122]',
  },
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    bg: 'bg-[#121214]',
    panel: 'bg-[#18181b]',
    text: 'text-[#e4e4e7]',
    textMuted: 'text-[#a1a1aa]',
    border: 'border-[#27272a]',
    headerBg: 'bg-[#18181b]/95 border-[#27272a]',
    quoteBg: 'bg-[#202024] border-[#3f3f46] text-[#d4d4d8]',
  },
  paper: {
    id: 'paper',
    name: 'Paper',
    bg: 'bg-white',
    panel: 'bg-slate-50',
    text: 'text-slate-800',
    textMuted: 'text-slate-500',
    border: 'border-slate-200',
    headerBg: 'bg-white/95 border-slate-200',
    quoteBg: 'bg-slate-100 border-slate-300 text-slate-700',
  },
};

export default function StoryReaderModal({
  isOpen,
  onClose,
  story,
  onToggleFavorite,
  onUpdateProgress,
  onEdit,
  onNavigatePart,
  onAddNextPart,
}) {
  const [themeKey, setThemeKey] = useState('night');
  const [fontSize, setFontSize] = useState(18); // 14 to 26
  const [fontFamily, setFontFamily] = useState('serif'); // 'serif', 'sans', 'mono'
  const [lineHeight, setLineHeight] = useState('relaxed'); // 'normal', 'relaxed', 'loose'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPartsDropdown, setShowPartsDropdown] = useState(false);
  const [siblingParts, setSiblingParts] = useState([]);
  const [progress, setProgress] = useState(0);
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [resumedParagraph, setResumedParagraph] = useState(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const contentRef = useRef(null);
  const containerRef = useRef(null);
  const hasAutoScrolledRef = useRef(false);
  const lastScrolledStoryIdRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const currentPosRef = useRef({ progress: 0, paragraph: 0 });

  // Fetch or update sibling parts whenever story or series changes
  useEffect(() => {
    if (story?.series_name && story?.id) {
      if (Array.isArray(story.sibling_parts) && story.sibling_parts.length > 0) {
        setSiblingParts(story.sibling_parts);
      } else {
        api
          .get(`/stories/${story.id}/parts`)
          .then((res) => {
            if (res.data?.status === 'success') {
              setSiblingParts(res.data.data || []);
            }
          })
          .catch(() => {
            // Offline fallback: load sibling parts from IndexedDB
            getOfflineStory(story.id)
              .then((cached) => {
                if (cached && Array.isArray(cached.sibling_parts)) {
                  setSiblingParts(cached.sibling_parts);
                }
              })
              .catch(() => {});
          });
      }
    } else {
      setSiblingParts([]);
    }
    setShowPartsDropdown(false);
  }, [story?.id, story?.series_name]);

  const sortedParts = React.useMemo(() => {
    return [...siblingParts].sort(
      (a, b) => (a.part_number || 0) - (b.part_number || 0)
    );
  }, [siblingParts]);

  const currentPartIndex = React.useMemo(() => {
    return sortedParts.findIndex((p) => p.id === story?.id);
  }, [sortedParts, story?.id]);

  const prevPart =
    currentPartIndex > 0 ? sortedParts[currentPartIndex - 1] : null;
  const nextPart =
    currentPartIndex !== -1 && currentPartIndex < sortedParts.length - 1
      ? sortedParts[currentPartIndex + 1]
      : null;

  const handleSwitchPart = (targetPart) => {
    if (!targetPart || targetPart.id === story?.id) return;
    // Persist current story progress before switching
    if (story?.id) {
      onUpdateProgress?.(story.id, progress, currentParagraph);
    }
    setShowPartsDropdown(false);
    onNavigatePart?.(targetPart);
  };

  // Clear all auto-scroll and highlight timers
  const clearTimers = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  // Helper to persist position to localStorage and update ref
  const saveLocalPosition = useCallback((storyId, prog, paragraphIdx) => {
    try {
      localStorage.setItem(
        `tj_story_pos_${storyId}`,
        JSON.stringify({
          paragraph: paragraphIdx,
          progress: prog,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      // LocalStorage non-fatal
    }
  }, []);

  // Calculate which paragraph block is currently at the user's reading gaze point
  const getVisibleParagraphIndex = useCallback(() => {
    const el = contentRef.current;
    if (!el) return 0;
    const containerRect = el.getBoundingClientRect();
    const blocks = el.querySelectorAll('[data-paragraph-block="true"]');
    if (!blocks || blocks.length === 0) return 0;

    // The user's active reading focus is ~70px down from the top edge of the scroll view
    const targetY = containerRect.top + 70;
    let bestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const rect = b.getBoundingClientRect();
      if (rect.top <= targetY && rect.bottom >= targetY) {
        return parseInt(b.getAttribute('data-block-idx') || '0', 10);
      }
      const dist = Math.abs(rect.top - targetY);
      if (dist < minDistance) {
        minDistance = dist;
        bestIdx = parseInt(b.getAttribute('data-block-idx') || '0', 10);
      }
    }
    return bestIdx;
  }, []);

  // Safe close handler that ensures latest position is pushed to parent
  const handleSafeClose = useCallback(() => {
    clearTimers();
    setShowResumeBanner(false);
    setResumedParagraph(null);
    lastScrolledStoryIdRef.current = null;
    hasAutoScrolledRef.current = false;

    if (story) {
      const activeIdx = getVisibleParagraphIndex();
      const currentProg = currentPosRef.current.progress;
      saveLocalPosition(story.id, currentProg, activeIdx);
      onUpdateProgress?.(story.id, currentProg, activeIdx);
    }
    onClose();
  }, [story, getVisibleParagraphIndex, saveLocalPosition, onUpdateProgress, onClose, clearTimers]);

  useEscapeKey(() => {
    if (isOpen) {
      if (lightboxImage) {
        setLightboxImage(null);
      } else if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        handleSafeClose();
      }
    }
  }, isOpen);

  // Reset session refs when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      lastScrolledStoryIdRef.current = null;
      hasAutoScrolledRef.current = false;
      setShowResumeBanner(false);
      setResumedParagraph(null);
    }
  }, [isOpen, clearTimers]);

  // Initial setup and auto-scroll: runs ONCE ONLY per story open session
  useEffect(() => {
    if (!isOpen || !story) return;

    // If we have already auto-scrolled for this story in this open session, do nothing!
    if (lastScrolledStoryIdRef.current === story.id) {
      return;
    }
    lastScrolledStoryIdRef.current = story.id;

    setProgress(story.reading_progress || 0);

    // Resolve saved paragraph index (prefer server model, fallback to localStorage)
    let savedParagraph = 0;
    if (typeof story.last_read_paragraph === 'number' && story.last_read_paragraph > 0) {
      savedParagraph = story.last_read_paragraph;
    } else {
      try {
        const local = localStorage.getItem(`tj_story_pos_${story.id}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed.paragraph === 'number' && parsed.paragraph > 0) {
            savedParagraph = parsed.paragraph;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    currentPosRef.current = {
      progress: story.reading_progress || 0,
      paragraph: savedParagraph,
    };
    setCurrentParagraph(savedParagraph);

    // If there is a saved reading point, automatically scroll ONCE to that paragraph
    if (savedParagraph > 0 && !hasAutoScrolledRef.current) {
      clearTimers();

      scrollTimerRef.current = setTimeout(() => {
        if (!contentRef.current) return;
        const targetEl =
          document.getElementById(`story-block-${savedParagraph}`) ||
          contentRef.current.querySelector(`[data-block-idx="${savedParagraph}"]`);

        if (targetEl && contentRef.current) {
          const container = contentRef.current;
          const containerRect = container.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();
          const scrollOffset =
            targetRect.top - containerRect.top + container.scrollTop - 60; // 60px padding from top

          container.scrollTo({
            top: Math.max(0, scrollOffset),
            behavior: 'smooth',
          });

          hasAutoScrolledRef.current = true;
          setResumedParagraph(savedParagraph);
          setShowResumeBanner(true);

          // Fade out the resume banner after 3.5s
          bannerTimerRef.current = setTimeout(() => {
            setShowResumeBanner(false);
          }, 3500);

          // Gentle fade-out of paragraph highlight after 3.5s
          highlightTimerRef.current = setTimeout(() => {
            setResumedParagraph(null);
          }, 3500);
        }
      }, 250);
    }

    return () => {
      clearTimers();
    };
  }, [isOpen, story?.id, clearTimers]);

  // Track scroll progress and active paragraph
  const handleScroll = () => {
    const el = contentRef.current;
    if (!el || !story) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const totalScrollable = scrollHeight - clientHeight;
    let currentProgress = 0;
    if (totalScrollable <= 0) {
      currentProgress = 100;
    } else {
      currentProgress = Math.min(
        100,
        Math.max(0, Math.round((scrollTop / totalScrollable) * 100))
      );
    }

    const activeParagraphIdx = getVisibleParagraphIndex();

    setProgress(currentProgress);
    setCurrentParagraph(activeParagraphIdx);

    currentPosRef.current = {
      progress: currentProgress,
      paragraph: activeParagraphIdx,
    };

    saveLocalPosition(story.id, currentProgress, activeParagraphIdx);
  };

  // Debounced save progress and paragraph to server when reading or scrolling stops
  useEffect(() => {
    if (!story) return;
    const timer = setTimeout(() => {
      const shouldSave =
        progress !== story.reading_progress ||
        currentParagraph !== (story.last_read_paragraph || 0);

      if (shouldSave) {
        onUpdateProgress?.(story.id, progress, currentParagraph);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [progress, currentParagraph, story, onUpdateProgress]);

  // Jump to top / restart from paragraph 0
  const handleJumpToTop = () => {
    clearTimers();
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setShowResumeBanner(false);
    setResumedParagraph(null);
    setCurrentParagraph(0);
    hasAutoScrolledRef.current = true;
    if (story) {
      saveLocalPosition(story.id, 0, 0);
      onUpdateProgress?.(story.id, 0, 0);
    }
  };

  if (!isOpen || !story) return null;

  const currentTheme = THEMES[themeKey] || THEMES.night;

  const getFontFamilyStyle = () => {
    switch (fontFamily) {
      case 'serif':
        return { fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' };
      case 'mono':
        return { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' };
      case 'sans':
      default:
        return { fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' };
    }
  };

  const getLineHeightClass = () => {
    switch (lineHeight) {
      case 'normal':
        return 'leading-normal';
      case 'loose':
        return 'leading-[2.2]';
      case 'relaxed':
      default:
        return 'leading-[1.85]';
    }
  };

  const handleMarkCompleted = () => {
    onUpdateProgress?.(story.id, 100, currentParagraph);
    setProgress(100);
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col ${currentTheme.bg} ${
        isFullscreen ? 'p-0' : 'p-0 sm:p-4 md:p-5 bg-black/80 backdrop-blur-md'
      } animate-fadeIn select-text`}
    >
      <div
        className={`flex-1 flex flex-col overflow-hidden mx-auto w-full transition-all duration-200 relative ${
          isFullscreen
            ? 'h-full max-w-none rounded-none border-0'
            : 'max-w-4xl h-full rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl'
        } ${currentTheme.panel} ${currentTheme.border}`}
      >
        {/* Progress Bar (Pinned Top) */}
        <div className="w-full h-1 bg-black/20 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Reader Top Navbar */}
        <header
          className={`px-3 sm:px-6 py-2.5 sm:py-3 border-b flex items-center justify-between gap-2 sm:gap-3 ${currentTheme.headerBg} select-none backdrop-blur-md`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: story.cover_color || '#3b82f6' }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <h2
                  className={`text-xs sm:text-base font-bold truncate max-w-xs sm:max-w-md ${currentTheme.text}`}
                  title={story.title}
                >
                  {story.title}
                </h2>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0 shadow-xs"
                  title={`Current paragraph: ${currentParagraph + 1}`}
                >
                  ¶{currentParagraph + 1}
                </span>

                {/* Series & Part Badge / Dropdown Toggle */}
                {story.series_name && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPartsDropdown(!showPartsDropdown)}
                      className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
                      title="Click to view all parts in this series"
                    >
                      <Layers className="w-3 h-3 text-blue-400" />
                      <span className="truncate max-w-[100px] sm:max-w-[150px]">
                        {story.series_name}
                      </span>
                      <span>
                        · Part {story.part_number || 1}
                        {sortedParts.length > 1 ? `/${sortedParts.length}` : ''}
                      </span>
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    </button>

                    {/* Series Parts Dropdown Menu */}
                    {showPartsDropdown && (
                      <div
                        className={`absolute left-0 top-7 z-50 w-72 max-w-[85vw] p-2 rounded-2xl border shadow-2xl ${currentTheme.panel} ${currentTheme.border} ${currentTheme.text} animate-scaleUp`}
                      >
                        <div className="px-2 py-1.5 border-b border-current/10 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            {story.series_name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {sortedParts.length} {sortedParts.length === 1 ? 'Part' : 'Parts'}
                          </span>
                        </div>
                        <div className="max-h-60 overflow-y-auto divide-y divide-current/5 py-1">
                          {sortedParts.map((part) => {
                            const isCurrent = part.id === story.id;
                            return (
                              <button
                                key={part.id}
                                type="button"
                                onClick={() => {
                                  setShowPartsDropdown(false);
                                  if (!isCurrent) handleSwitchPart(part);
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                                  isCurrent
                                    ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30'
                                    : 'hover:bg-black/10 light:hover:bg-slate-100 opacity-80 hover:opacity-100'
                                }`}
                              >
                                <div className="min-w-0">
                                  <span className="font-semibold block truncate">
                                    Part {part.part_number || 1}: {part.title}
                                  </span>
                                  <span className="text-[10px] opacity-70">
                                    {(part.word_count || 0).toLocaleString()} words · ~{part.estimated_reading_time || 1}m
                                  </span>
                                </div>
                                <div className="flex-shrink-0">
                                  {part.status === 'completed' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : part.reading_progress > 0 ? (
                                    <span className="text-[10px] font-mono text-blue-400">{part.reading_progress}%</span>
                                  ) : (
                                    <span className="text-[10px] opacity-50">Unread</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {onAddNextPart && (
                          <div className="pt-1.5 border-t border-current/10">
                            <button
                              type="button"
                              onClick={() => {
                                setShowPartsDropdown(false);
                                onAddNextPart(story);
                              }}
                              className="w-full py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-500/10 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Next Part
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-[10px] sm:text-[11px] truncate ${currentTheme.textMuted}`}>
                  {story.author || 'Anonymous'} · {story.category}
                </p>
                {typeof navigator !== 'undefined' && !navigator.onLine && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <WifiOff className="w-2.5 h-2.5" />
                    Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Reading Settings Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                  showSettings
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : `${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10`
                }`}
                title="Reading typography & themes"
              >
                <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Settings Dropdown Popover */}
              {showSettings && (
                <div
                  className={`absolute right-0 top-11 sm:top-12 z-50 w-72 max-w-[calc(100vw-24px)] p-4 rounded-2xl border shadow-2xl ${currentTheme.panel} ${currentTheme.border} ${currentTheme.text} animate-scaleUp`}
                >
                  <div className="space-y-4 text-xs select-none">
                    {/* Theme selector */}
                    <div>
                      <span className={`block font-semibold mb-2 ${currentTheme.textMuted}`}>
                        Theme Background
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.values(THEMES).map((th) => (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => setThemeKey(th.id)}
                            className={`px-2 py-1.5 rounded-xl text-center border font-semibold transition-all ${
                              themeKey === th.id
                                ? 'ring-2 ring-blue-500 border-blue-500 scale-105'
                                : `${th.border} opacity-80 hover:opacity-100`
                            }`}
                            style={{
                              backgroundColor:
                                th.id === 'night'
                                  ? '#0b0f19'
                                  : th.id === 'sepia'
                                  ? '#fcf7ec'
                                  : th.id === 'charcoal'
                                  ? '#121214'
                                  : '#ffffff',
                              color:
                                th.id === 'night'
                                  ? '#e2e8f0'
                                  : th.id === 'sepia'
                                  ? '#2c2317'
                                  : th.id === 'charcoal'
                                  ? '#e4e4e7'
                                  : '#1e293b',
                            }}
                          >
                            {th.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family selector */}
                    <div>
                      <span className={`block font-semibold mb-2 ${currentTheme.textMuted}`}>
                        Font Style
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFontFamily('serif')}
                          className={`py-1.5 rounded-lg border font-serif font-medium transition-all ${
                            fontFamily === 'serif'
                              ? 'bg-blue-600 text-white border-blue-500'
                              : `${currentTheme.border} hover:bg-black/5`
                          }`}
                        >
                          Book Serif
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontFamily('sans')}
                          className={`py-1.5 rounded-lg border font-sans font-medium transition-all ${
                            fontFamily === 'sans'
                              ? 'bg-blue-600 text-white border-blue-500'
                              : `${currentTheme.border} hover:bg-black/5`
                          }`}
                        >
                          Clean Sans
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontFamily('mono')}
                          className={`py-1.5 rounded-lg border font-mono font-medium transition-all ${
                            fontFamily === 'mono'
                              ? 'bg-blue-600 text-white border-blue-500'
                              : `${currentTheme.border} hover:bg-black/5`
                          }`}
                        >
                          Mono
                        </button>
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${currentTheme.textMuted}`}>
                          Text Size
                        </span>
                        <span className="font-mono">{fontSize}px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={fontSize <= 14}
                          onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                          className="px-2.5 py-1 rounded-lg border text-sm font-bold disabled:opacity-40"
                        >
                          A-
                        </button>
                        <input
                          type="range"
                          min="14"
                          max="26"
                          step="1"
                          value={fontSize}
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="flex-1 accent-blue-600 cursor-pointer"
                        />
                        <button
                          type="button"
                          disabled={fontSize >= 26}
                          onClick={() => setFontSize((s) => Math.min(26, s + 2))}
                          className="px-2.5 py-1 rounded-lg border text-sm font-bold disabled:opacity-40"
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* Line Spacing */}
                    <div>
                      <span className={`block font-semibold mb-2 ${currentTheme.textMuted}`}>
                        Line Spacing
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['normal', 'relaxed', 'loose'].map((lh) => (
                          <button
                            key={lh}
                            type="button"
                            onClick={() => setLineHeight(lh)}
                            className={`py-1 rounded-lg border capitalize transition-all ${
                              lineHeight === lh
                                ? 'bg-blue-600 text-white border-blue-500'
                                : `${currentTheme.border} hover:bg-black/5`
                            }`}
                          >
                            {lh}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Jump to Beginning */}
                    <div className="pt-2 border-t border-current/10">
                      <button
                        type="button"
                        onClick={handleJumpToTop}
                        className="w-full py-1.5 px-3 rounded-lg border border-current/20 hover:bg-black/10 flex items-center justify-center gap-1.5 text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restart from Beginning
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Favorite Bookmark */}
            <button
              type="button"
              onClick={() => onToggleFavorite(story.id)}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                story.is_favorite
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : `${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10`
              }`}
              title={story.is_favorite ? 'Bookmarked' : 'Add bookmark'}
            >
              <Bookmark
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${story.is_favorite ? 'fill-amber-400' : ''}`}
              />
            </button>

            {/* Edit Shortcut */}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(story)}
                className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10`}
                title="Edit story"
              >
                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10 hidden sm:inline-flex`}
              title={isFullscreen ? 'Exit fullscreen' : 'Distraction-free fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleSafeClose}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10`}
              title="Close reader (Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Floating Resumed Reading Pill Banner */}
        {showResumeBanner && (
          <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-40 animate-slideDown pointer-events-auto max-w-[94vw]">
            <div className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-blue-600/95 text-white text-[11px] sm:text-xs font-semibold shadow-xl border border-blue-400/40 backdrop-blur-md flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-200 animate-bounce flex-shrink-0" />
              <span>Resumed at paragraph {((resumedParagraph ?? currentParagraph) || 0) + 1}</span>
              <button
                type="button"
                onClick={handleJumpToTop}
                className="ml-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[10px] sm:text-[11px] font-medium transition-colors flex items-center gap-1 flex-shrink-0"
                title="Scroll back to beginning"
              >
                <ArrowUp className="w-3 h-3" />
                Top
              </button>
              <button
                type="button"
                onClick={() => setShowResumeBanner(false)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Story Body */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-12 py-8 sm:py-12 scroll-smooth"
        >
          <article className="max-w-2xl mx-auto">
            {/* Story Header */}
            <header className="mb-10 pb-8 border-b border-current/10">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${story.cover_color || '#3b82f6'}20`,
                    color: story.cover_color || '#3b82f6',
                  }}
                >
                  {story.category}
                </span>

                <span
                  className={`flex items-center gap-1 text-xs font-medium ${currentTheme.textMuted}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  ~{story.estimated_reading_time || 1} min read
                </span>

                <span
                  className={`flex items-center gap-1 text-xs font-medium ${currentTheme.textMuted}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {(story.word_count || 0).toLocaleString()} words
                </span>
              </div>

              <h1
                className={`text-2xl sm:text-4xl font-extrabold tracking-tight mb-4 ${currentTheme.text}`}
                style={getFontFamilyStyle()}
              >
                {story.title}
              </h1>

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div
                  className={`flex items-center gap-2 font-medium ${currentTheme.textMuted}`}
                >
                  <User className="w-4 h-4 opacity-70" />
                  <span>{story.author || 'Anonymous'}</span>
                </div>

                {story.tags && story.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(story.tags)
                      ? story.tags
                      : String(story.tags).split(',')
                    ).map((tg, i) => (
                      <span
                        key={i}
                        className={`text-[11px] px-2 py-0.5 rounded-md ${currentTheme.quoteBg}`}
                      >
                        #{tg.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary / Synopsis quote */}
              {story.summary && (
                <div
                  className={`mt-6 p-4 sm:p-5 rounded-2xl border-l-4 italic text-sm sm:text-base ${currentTheme.quoteBg}`}
                  style={getFontFamilyStyle()}
                >
                  "{story.summary}"
                </div>
              )}
            </header>

            {/* Story Content with Embedded Images and Headings */}
            <div
              className={`space-y-6 ${currentTheme.text} ${getLineHeightClass()}`}
              style={{
                fontSize: `${fontSize}px`,
                ...getFontFamilyStyle(),
              }}
            >
              {renderStoryContent(story.content, {
                onImageClick: (url, caption) => setLightboxImage({ url, caption }),
                quoteBgClass: currentTheme.quoteBg,
                resumedBlockIdx: resumedParagraph,
              })}
            </div>

            {/* Multi-Part Series Navigation Card */}
            {story.series_name && (
              <div
                className={`mt-12 p-4 sm:p-5 rounded-2xl border ${currentTheme.border} ${currentTheme.quoteBg} space-y-3.5`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold">
                      Series: {story.series_name}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-semibold">
                      Part {story.part_number || 1}
                      {sortedParts.length > 1 ? ` of ${sortedParts.length}` : ''}
                    </span>
                  </div>

                  {progress >= 100 && nextPart && (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Part completed! Continue below:
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-current/10 flex-wrap">
                  {prevPart ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchPart(prevPart)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border ${currentTheme.border} hover:bg-black/10 transition-colors flex items-center gap-1.5 cursor-pointer`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous: Part {prevPart.part_number}</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {nextPart ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchPart(nextPart)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>
                        Next: Part {nextPart.part_number}
                        {nextPart.title ? ` (${nextPart.title})` : ''}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    onAddNextPart && (
                      <button
                        type="button"
                        onClick={() => onAddNextPart(story)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Part {(story.part_number || sortedParts.length) + 1}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Bottom Story Footer */}
            <footer className="mt-16 pt-10 border-t border-current/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  {progress}%
                </div>
                <div className="text-xs">
                  <p className={`font-semibold ${currentTheme.text}`}>
                    Reading Progress
                  </p>
                  <p className={currentTheme.textMuted}>
                    {progress >= 100
                      ? 'Story completed! 🎉'
                      : `${progress}% read · Paragraph ${currentParagraph + 1}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {currentParagraph > 0 && (
                  <button
                    type="button"
                    onClick={handleJumpToTop}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border ${currentTheme.border} ${currentTheme.textMuted} hover:${currentTheme.text} transition-colors flex items-center gap-1.5`}
                    title="Jump to the top of the story"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    Back to Top
                  </button>
                )}

                {story.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={handleMarkCompleted}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark as Completed
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSafeClose}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${currentTheme.border} ${currentTheme.textMuted} hover:${currentTheme.text} transition-colors`}
                >
                  Close Reader
                </button>
              </div>
            </footer>
          </article>
        </div>
      </div>

      {/* High-Resolution Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-70 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn select-none"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <a
              href={lightboxImage.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Open full image in new tab"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close image view (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            className="max-w-5xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.caption || 'Illustration'}
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/15"
            />
            {lightboxImage.caption && (
              <p className="mt-3 text-sm text-slate-300 font-medium text-center">
                {lightboxImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
