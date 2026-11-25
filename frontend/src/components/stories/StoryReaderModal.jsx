import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { renderStoryContent } from '../../utils/storyFormatter';

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
}) {
  const [themeKey, setThemeKey] = useState('night');
  const [fontSize, setFontSize] = useState(18); // 15, 17, 18, 20, 22
  const [fontFamily, setFontFamily] = useState('serif'); // 'serif', 'sans', 'mono'
  const [lineHeight, setLineHeight] = useState('relaxed'); // 'normal', 'relaxed', 'loose'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);

  const contentRef = useRef(null);
  const containerRef = useRef(null);

  useEscapeKey(() => {
    if (isOpen) {
      if (lightboxImage) {
        setLightboxImage(null);
      } else if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        onClose();
      }
    }
  }, isOpen);

  // Sync initial progress
  useEffect(() => {
    if (story) {
      setProgress(story.reading_progress || 0);
    }
  }, [story]);

  // Track scroll progress
  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const totalScrollable = scrollHeight - clientHeight;
    if (totalScrollable <= 0) {
      setProgress(100);
      return;
    }
    const currentProgress = Math.min(
      100,
      Math.max(0, Math.round((scrollTop / totalScrollable) * 100))
    );
    setProgress(currentProgress);
  };

  // Debounced save progress when unmounting or periodically
  useEffect(() => {
    if (!story) return;
    const timer = setTimeout(() => {
      if (progress > (story.reading_progress || 0)) {
        onUpdateProgress(story.id, progress);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [progress, story, onUpdateProgress]);

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
    onUpdateProgress(story.id, 100);
    setProgress(100);
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col ${currentTheme.bg} ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-5 bg-black/80 backdrop-blur-md'
      } animate-fadeIn select-text`}
    >
      <div
        className={`flex-1 flex flex-col overflow-hidden mx-auto w-full transition-all duration-200 ${
          isFullscreen
            ? 'h-full max-w-none rounded-none border-0'
            : 'max-w-4xl h-full rounded-2xl border shadow-2xl'
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
          className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 ${currentTheme.headerBg} select-none backdrop-blur-md`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: story.cover_color || '#3b82f6' }}
            />
            <div className="min-w-0">
              <h2
                className={`text-sm sm:text-base font-bold truncate ${currentTheme.text}`}
                title={story.title}
              >
                {story.title}
              </h2>
              <p className={`text-[11px] truncate ${currentTheme.textMuted}`}>
                {story.author || 'Anonymous'} · {story.category}
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Reading Settings Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl border transition-colors ${
                  showSettings
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : `${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10`
                }`}
                title="Reading typography & themes"
              >
                <Sliders className="w-4 h-4" />
              </button>

              {/* Settings Dropdown Popover */}
              {showSettings && (
                <div
                  className={`absolute right-0 top-12 z-50 w-72 p-4 rounded-2xl border shadow-2xl ${currentTheme.panel} ${currentTheme.border} ${currentTheme.text} animate-scaleUp`}
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
                  </div>
                </div>
              )}
            </div>

            {/* Favorite Bookmark */}
            <button
              type="button"
              onClick={() => onToggleFavorite(story.id)}
              className={`p-2 rounded-xl border transition-colors ${
                story.is_favorite
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : `${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10`
              }`}
              title={story.is_favorite ? 'Bookmarked' : 'Add bookmark'}
            >
              <Bookmark
                className={`w-4 h-4 ${story.is_favorite ? 'fill-amber-400' : ''}`}
              />
            </button>

            {/* Edit Shortcut */}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(story)}
                className={`p-2 rounded-xl border transition-colors ${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10`}
                title="Edit story"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 rounded-xl border transition-colors ${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10 hidden sm:inline-flex`}
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
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors ${currentTheme.textMuted} hover:${currentTheme.text} ${currentTheme.border} hover:bg-black/10`}
              title="Close reader (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Story Body */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-12 py-8 sm:py-12"
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
              })}
            </div>

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
                      : `${progress}% read · Keep enjoying`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
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
                  onClick={onClose}
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
