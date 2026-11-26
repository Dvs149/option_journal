import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  Palette,
  Tag,
  User,
  Clock,
  FileText,
  Bookmark,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  ImagePlus,
  Upload,
  Link,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Quote,
  Minus,
  WrapText,
  Layers,
  Eye,
  Edit3,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import api from '../../api/client';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { renderStoryContent, splitIntoShortParagraphs } from '../../utils/storyFormatter';

const POPULAR_CATEGORIES = [
  'Philosophy & Wisdom',
  'Sci-Fi & Wonder',
  'History & Commerce',
  'Trading Psychology',
  'Life & Motivation',
  'Short Fiction',
  'Biography',
  'General',
];

const COVER_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
];

export default function StoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
  existingSeriesList = [],
}) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Philosophy & Wisdom');
  const [customCategory, setCustomCategory] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [partNumber, setPartNumber] = useState('1');
  const [partTitle, setPartTitle] = useState('');
  const [isSeries, setIsSeries] = useState(false);
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverColor, setCoverColor] = useState('#3b82f6');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState('unread');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState('');

  // Editor specific states
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlCaption, setUrlCaption] = useState('');
  const [splitFeedback, setSplitFeedback] = useState('');

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEscapeKey(() => {
    if (isOpen && !isLoading && !uploadingImage) {
      if (showUrlModal) {
        setShowUrlModal(false);
      } else {
        onClose();
      }
    }
  }, isOpen && !isLoading);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setAuthor(initialData.author || '');
      const cat = initialData.category || 'General';
      if (POPULAR_CATEGORIES.includes(cat)) {
        setCategory(cat);
        setCustomCategory('');
      } else {
        setCategory('Other');
        setCustomCategory(cat);
      }
      const hasSeries = Boolean(initialData.series_name);
      setIsSeries(hasSeries);
      setSeriesName(initialData.series_name || '');
      setPartNumber(
        initialData.part_number !== undefined && initialData.part_number !== null
          ? String(initialData.part_number)
          : '1'
      );
      setPartTitle(initialData.part_title || '');
      setSummary(initialData.summary || '');
      setContent(initialData.content || '');
      setCoverColor(initialData.cover_color || '#3b82f6');
      const tags = Array.isArray(initialData.tags)
        ? initialData.tags.join(', ')
        : (initialData.tags || '');
      setTagsInput(tags);
      setStatus(initialData.status || 'unread');
      setIsFavorite(Boolean(initialData.is_favorite));
    } else {
      setTitle('');
      setAuthor('');
      setCategory('Philosophy & Wisdom');
      setCustomCategory('');
      setIsSeries(false);
      setSeriesName('');
      setPartNumber('1');
      setPartTitle('');
      setSummary('');
      setContent('');
      setCoverColor('#3b82f6');
      setTagsInput('');
      setStatus('unread');
      setIsFavorite(false);
    }
    setActiveTab('write');
    setError('');
  }, [initialData, isOpen]);

  // Compute live stats
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedMins = Math.max(1, Math.ceil(wordCount / 200));

  // Extract list of images embedded in current content
  const embeddedImages = React.useMemo(() => {
    const matches = [];
    const regex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({ caption: match[1], url: match[2] });
    }
    return matches;
  }, [content]);

  if (!isOpen) return null;

  // Insert markdown text helper
  const insertAtCursor = (prefix, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + prefix + defaultText + suffix);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;
    const replacement = prefix + selectedText + suffix;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  // Upload image to backend
  const handleUploadImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WEBP, GIF, SVG).');
      return;
    }

    setUploadingImage(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/stories/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.url) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const markdown = `\n\n![${cleanName}](${res.data.url})\n\n`;
        insertAtCursor(markdown, '', '');
      }
    } catch (err) {
      console.error('Failed to upload story image:', err);
      const msg = err.response?.data?.message || 'Failed to upload image. Max 10MB.';
      setError(msg);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Clipboard paste detection (Ctrl+V / Cmd+V with image)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadImageFile(file);
          return;
        }
      }
    }
  };

  // Drag and drop onto editor
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadImageFile(e.dataTransfer.files[0]);
    }
  };

  // Insert image via URL modal
  const handleInsertImageUrl = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const caption = urlCaption.trim() || 'illustration';
    const markdown = `\n\n![${caption}](${urlInput.trim()})\n\n`;
    insertAtCursor(markdown, '', '');
    setUrlInput('');
    setUrlCaption('');
    setShowUrlModal(false);
  };

  // Converts big paragraphs into small 2-3 line paragraphs without deleting any content
  const handleSplitParagraphs = () => {
    if (!content.trim()) return;

    const textarea = textareaRef.current;
    const selStart = textarea?.selectionStart;
    const selEnd = textarea?.selectionEnd;
    const hasSelection =
      selStart !== undefined && selEnd !== undefined && selStart !== selEnd;

    let newContent = '';
    let beforeCount = 0;
    let afterCount = 0;

    if (hasSelection) {
      const selectedText = content.substring(selStart, selEnd);
      const splitSelected = splitIntoShortParagraphs(selectedText);
      newContent =
        content.substring(0, selStart) + splitSelected + content.substring(selEnd);
      beforeCount = selectedText.split(/\n\s*\n/).filter((b) => b.trim()).length;
      afterCount = splitSelected.split(/\n\s*\n/).filter((b) => b.trim()).length;
    } else {
      newContent = splitIntoShortParagraphs(content);
      beforeCount = content.split(/\n\s*\n/).filter((b) => b.trim()).length;
      afterCount = newContent.split(/\n\s*\n/).filter((b) => b.trim()).length;
    }

    setContent(newContent);

    if (afterCount > beforeCount) {
      setSplitFeedback(
        `Split ${beforeCount} large paragraph${beforeCount === 1 ? '' : 's'} into ${afterCount} short paragraphs (2-3 lines each)`
      );
    } else {
      setSplitFeedback(
        `Formatted into ${afterCount} paragraphs (2-3 lines each)`
      );
    }

    setTimeout(() => {
      setSplitFeedback('');
    }, 4500);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Story title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Story content is required.');
      return;
    }
    if (isSeries && !seriesName.trim()) {
      setError('Series name is required when marking this story as part of a series.');
      return;
    }

    const finalCategory =
      category === 'Other' && customCategory.trim()
        ? customCategory.trim()
        : category;

    const payload = {
      title: title.trim(),
      author: author.trim() || 'Anonymous',
      category: finalCategory,
      series_name: isSeries && seriesName.trim() ? seriesName.trim() : null,
      part_number: isSeries && partNumber ? Math.max(1, parseInt(partNumber, 10)) : null,
      part_title: isSeries && partTitle.trim() ? partTitle.trim() : null,
      summary: summary.trim(),
      content: content.trim(),
      cover_color: coverColor,
      tags: tagsInput,
      status,
      is_favorite: isFavorite,
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadImageFile(e.target.files[0]);
          }
        }}
      />

      <div
        className={`bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 w-full ${
          isExpanded ? 'h-[97vh] max-w-6xl' : 'max-h-[94vh] max-w-4xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] light:border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-colors"
              style={{ backgroundColor: coverColor }}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white light:text-slate-900 flex items-center gap-2 flex-wrap">
                <span>{initialData ? 'Edit Story' : 'Add New Story'}</span>
                {isSeries && seriesName && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {seriesName} · Part {partNumber || 1}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 light:text-slate-500">
                {wordCount > 0
                  ? `${wordCount.toLocaleString()} words · ~${estimatedMins} min read${
                      embeddedImages.length > 0 ? ` · ${embeddedImages.length} image(s)` : ''
                    }`
                  : 'Write or paste your story with images, chapters, and thoughts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-100 transition-colors"
              title={isExpanded ? 'Restore window size' : 'Expand window'}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading || uploadingImage}
              className="p-2 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Title & Author */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                  Story Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Archer and the Mountain"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                  Author / Source
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Ancient Parable"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Multi-Part Story / Series Control Card */}
            <div className="p-3.5 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-300 light:text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={isSeries}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsSeries(checked);
                      if (checked && !seriesName) {
                        // Smart auto-detect from title: e.g. "Story Name - Part 3" or "Story Name (Part 3)"
                        const match =
                          title.match(/^(.*?)\s*[-–:]\s*part\s*(\d+)/i) ||
                          title.match(/^(.*?)\s*[\(\[]part\s*(\d+)[\)\]]/i);
                        if (match) {
                          setSeriesName(match[1].trim());
                          setPartNumber(match[2]);
                        }
                      }
                    }}
                    className="w-4 h-4 rounded text-blue-600 bg-[#0e1626] border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-400" />
                    This story is part of a Multi-Part Series (Part 1, 2, 3...)
                  </span>
                </label>

                {isSeries && (
                  <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                    Part {partNumber || 1}
                  </span>
                )}
              </div>

              {isSeries && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2.5 border-t border-[#1e293b]/60 light:border-slate-200 animate-fadeIn">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-300 light:text-slate-700 mb-1">
                      Series Name / Main Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      list="existing-series-list"
                      value={seriesName}
                      onChange={(e) => setSeriesName(e.target.value)}
                      placeholder="e.g. The Archer Chronicles, Amsterdam Mystery"
                      required={isSeries}
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <datalist id="existing-series-list">
                      {existingSeriesList &&
                        existingSeriesList.map((s) => <option key={s} value={s} />)}
                    </datalist>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Type a new series name or pick from existing
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 light:text-slate-700 mb-1">
                      Part Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      placeholder="1"
                      required={isSeries}
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500 font-mono-numbers"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      1, 2, 3, 4...
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 light:text-slate-700 mb-1">
                      Part Subtitle <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={partTitle}
                      onChange={(e) => setPartTitle(e.target.value)}
                      placeholder="e.g. The Arrival"
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Custom chapter title
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Category & Status & Color */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                  Category / Genre
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {POPULAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Other">Other (Custom)...</option>
                </select>

                {category === 'Other' && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="mt-2 w-full px-3.5 py-2 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                  Reading Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="unread">Unread</option>
                  <option value="reading">Currently Reading</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                  Theme Accent Color
                </label>
                <div className="flex items-center gap-1.5 pt-1">
                  {COVER_COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setCoverColor(col.value)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        coverColor === col.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0e1626] scale-110'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: col.value }}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Short Synopsis */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                Short Synopsis / Hook{' '}
                <span className="text-slate-500 font-normal">(Optional, max 2-3 sentences)</span>
              </label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief summary to show on story cards..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* Rich Story Content Editor Area */}
            <div className="flex-1 flex flex-col space-y-2">
              {/* Toolbar & View Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-300 light:text-slate-700">
                    Story Content <span className="text-rose-400">*</span>
                  </label>

                  {/* Write vs Preview Mode Toggle */}
                  <div className="flex items-center bg-[#0b0f19] light:bg-slate-100 p-0.5 rounded-lg border border-[#1e293b] light:border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveTab('write')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === 'write'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === 'preview'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    {wordCount.toLocaleString()} words
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    ~{estimatedMins} min read
                  </span>
                  {uploadingImage && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-blue-400 font-semibold animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading image...
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Formatting Toolbar */}
              {activeTab === 'write' && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#0b0f19] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Primary Image Upload Button */}
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Upload an image from your device"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      Add Image
                    </button>

                    {/* Image from Web URL Button */}
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => setShowUrlModal(true)}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-200 transition-colors flex items-center gap-1"
                      title="Insert image from external link"
                    >
                      <Link className="w-3.5 h-3.5 text-slate-400" />
                      Image URL
                    </button>

                    <div className="w-[1px] h-4 bg-slate-700 light:bg-slate-300 mx-1" />

                    {/* Quick Formatting Tools */}
                    <button
                      type="button"
                      onClick={() => insertAtCursor('**', '**', 'bold text')}
                      className="p-1.5 rounded-lg text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-200 transition-colors"
                      title="Bold text (**text**)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => insertAtCursor('*', '*', 'italic text')}
                      className="p-1.5 rounded-lg text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-200 transition-colors"
                      title="Italic text (*text*)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n\n## ', '\n\n', 'Chapter Title')}
                      className="p-1.5 rounded-lg text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-200 transition-colors"
                      title="Heading 2 (## Title)"
                    >
                      <Heading2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n\n> ', '\n\n', 'Inspiring quote or reflection')}
                      className="p-1.5 rounded-lg text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-200 transition-colors"
                      title="Quote block (> Quote)"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n\n---\n\n', '', '')}
                      className="p-1.5 rounded-lg text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-200 transition-colors"
                      title="Scene break / Divider (---)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-700 light:bg-slate-300 mx-1" />

                    {/* Split Paragraphs Button (2-3 lines each) */}
                    <button
                      type="button"
                      onClick={handleSplitParagraphs}
                      disabled={!content.trim()}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Convert large paragraphs into 2-3 lines each without deleting any content (works on selected text or whole story)"
                    >
                      <WrapText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Split Paragraphs</span>
                      <span className="sm:hidden">Split</span>
                    </button>
                  </div>

                  {splitFeedback ? (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-fadeIn flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {splitFeedback}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 hidden md:inline">
                      💡 Tip: Drag & drop or paste (<kbd className="font-mono px-1 py-0.5 rounded bg-black/20 text-slate-300">Ctrl+V</kbd>) images directly into the text
                    </span>
                  )}
                </div>
              )}

              {/* Textarea or Preview View */}
              {activeTab === 'write' ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={handleDrop}
                  className={`relative rounded-xl transition-all ${
                    isDraggingOver
                      ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0e1626]'
                      : ''
                  }`}
                >
                  {isDraggingOver && (
                    <div className="absolute inset-0 z-10 bg-blue-600/20 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-blue-400 text-blue-300 pointer-events-none">
                      <Upload className="w-8 h-8 animate-bounce mb-2" />
                      <p className="text-sm font-bold">Drop image here to insert into story</p>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Write or paste your story here...&#10;&#10;To add an image:&#10;• Click 'Add Image' above&#10;• Drag and drop any image file directly here&#10;• Copy an image and paste (Ctrl+V) directly into this editor&#10;&#10;Long texts, chapters, and multi-image stories are fully supported."
                    rows={isExpanded ? 18 : 10}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-sm leading-relaxed font-sans focus:outline-none focus:border-blue-500 transition-colors resize-y min-h-[220px]"
                  />
                </div>
              ) : (
                /* Live Preview Canvas */
                <div
                  className={`p-6 sm:p-8 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-slate-200 light:text-slate-800 text-sm overflow-y-auto ${
                    isExpanded ? 'min-h-[440px] max-h-[60vh]' : 'min-h-[240px] max-h-[42vh]'
                  }`}
                >
                  {content.trim() ? (
                    <div className="space-y-4 max-w-2xl mx-auto">
                      <div className="pb-4 mb-4 border-b border-current/15">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${coverColor}20`,
                            color: coverColor,
                          }}
                        >
                          {category}
                        </span>
                        <h2 className="text-2xl font-bold mt-2 text-white light:text-slate-900">
                          {title || 'Untitled Story'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          by {author || 'Anonymous'} · ~{estimatedMins} min read
                        </p>
                      </div>
                      {renderStoryContent(content)}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nothing to preview yet. Switch back to Write to add story text and images.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Embedded Images Tray (if any images exist in text) */}
              {embeddedImages.length > 0 && activeTab === 'write' && (
                <div className="p-2.5 rounded-xl bg-[#0b0f19]/60 light:bg-slate-100 border border-[#1e293b] light:border-slate-200 flex items-center gap-3 overflow-x-auto text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    Embedded ({embeddedImages.length}):
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {embeddedImages.map((img, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700 text-[11px]"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="truncate max-w-[130px]">{img.caption || `Image ${i + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tags & Favorite */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
                  Tags <span className="text-slate-500 font-normal">(Comma separated)</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. wisdom, mindset, space, history"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-slate-300 light:text-slate-700">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-700 cursor-pointer"
                  />
                  <Bookmark
                    className={`w-4 h-4 ${
                      isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span>Bookmark as Favorite</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#1e293b] light:border-slate-200 bg-[#0b0f19]/50 light:bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Esc to cancel
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || uploadingImage}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#1e293b] light:hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading || uploadingImage || !title.trim() || !content.trim()}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isLoading
                  ? 'Saving...'
                  : initialData
                  ? 'Update Story'
                  : 'Save Story'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Insert Image via URL Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#0e1626] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-2xl shadow-2xl p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white light:text-slate-900 flex items-center gap-2">
                <Link className="w-4 h-4 text-blue-400" />
                Insert Image via URL
              </h4>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInsertImageUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Image Web URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/illustration.jpg"
                  required
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Caption / Alt Text <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={urlCaption}
                  onChange={(e) => setUrlCaption(e.target.value)}
                  placeholder="e.g. Mountain landscape at dusk"
                  className="w-full px-3 py-2 rounded-xl bg-[#0b0f19] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                >
                  Insert Image
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
