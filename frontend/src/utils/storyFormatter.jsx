import React from 'react';

/**
 * Resolves an image URL whether local public storage, relative, or external HTTPS.
 */
export function resolveStoryImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const clean = url.replace(/^\/?(storage\/)?/, '');
  return `/storage/${clean}`;
}

/**
 * Extracts the first image URL and caption from story content if present.
 */
export function extractFirstImageUrl(content) {
  if (!content || typeof content !== 'string') return null;
  const match = content.match(/!\[(.*?)\]\((.*?)\)/);
  if (match && match[2]) {
    return {
      caption: match[1] || '',
      url: resolveStoryImageUrl(match[2]),
    };
  }
  return null;
}

/**
 * Cleans markdown and image tags from text to produce a clean plain-text summary snippet.
 */
export function cleanStorySummary(text, maxLen = 160) {
  if (!text || typeof text !== 'string') return '';
  const cleaned = text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/^[#>-]+\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + '...';
}

/**
 * Helper to render inline formatting: **bold**, *italic*, `code`.
 */
export function renderInlineText(text) {
  if (!text) return null;

  // Split on bold, italic, or code
  const tokens = [];
  let remaining = text;
  let keyIndex = 0;

  // Match **bold**, *italic*, `code`, [link](url)
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/;

  while (remaining) {
    const match = remaining.match(regex);
    if (!match) {
      tokens.push(remaining);
      break;
    }

    const matchIndex = match.index;
    if (matchIndex > 0) {
      tokens.push(remaining.substring(0, matchIndex));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**')) {
      tokens.push(
        <strong key={`b-${keyIndex++}`} className="font-bold">
          {match[2]}
        </strong>
      );
    } else if (fullMatch.startsWith('*')) {
      tokens.push(
        <em key={`i-${keyIndex++}`} className="italic">
          {match[3]}
        </em>
      );
    } else if (fullMatch.startsWith('`')) {
      tokens.push(
        <code
          key={`c-${keyIndex++}`}
          className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[0.9em]"
        >
          {match[4]}
        </code>
      );
    } else if (fullMatch.startsWith('[')) {
      tokens.push(
        <a
          key={`a-${keyIndex++}`}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-400"
        >
          {match[5]}
        </a>
      );
    }

    remaining = remaining.substring(matchIndex + fullMatch.length);
  }

  return tokens;
}

/**
 * Parses and renders rich story content with embedded images, headings, and formatting.
 *
 * @param {string} content - Raw story content
 * @param {object} options - Options including theme classes and onImageClick callback
 * @returns {React.ReactNode[]} Array of rendered React nodes
 */
export function renderStoryContent(content = '', options = {}) {
  const {
    onImageClick,
    imageBorderClass = 'border-current/15',
    quoteBgClass = 'bg-black/5 dark:bg-white/5 border-l-4 border-blue-500',
    resumedBlockIdx = null,
  } = options;

  if (!content || typeof content !== 'string') return null;

  // Split content into paragraph/blocks by double newlines
  const rawBlocks = content.split(/\n\s*\n/);

  return rawBlocks.map((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    const isResumed = resumedBlockIdx !== null && Number(resumedBlockIdx) === blockIdx;
    const resumeClass = isResumed
      ? 'ring-2 ring-blue-500/60 bg-blue-500/10 rounded-xl p-3 -mx-3 shadow-sm transition-all duration-700 ease-out animate-pulse-once'
      : '';

    // Check for Image Markdown: ![alt](url)
    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      const altText = imageMatch[1] || '';
      const srcUrl = resolveStoryImageUrl(imageMatch[2] || '');

      return (
        <figure
          key={`img-${blockIdx}`}
          id={`story-block-${blockIdx}`}
          data-block-idx={blockIdx}
          data-paragraph-block="true"
          className={`my-8 text-center select-none ${resumeClass}`}
        >
          <div className="relative inline-block max-w-full overflow-hidden rounded-2xl shadow-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
            <img
              src={srcUrl}
              alt={altText}
              loading="lazy"
              onClick={() => onImageClick?.(srcUrl, altText)}
              className="max-h-[550px] w-auto mx-auto object-contain cursor-zoom-in hover:scale-[1.01] transition-transform duration-200"
            />
          </div>
          {altText && altText !== 'image' && altText !== 'illustration' && (
            <figcaption className="mt-2.5 text-xs text-center opacity-70 italic max-w-md mx-auto">
              {altText}
            </figcaption>
          )}
        </figure>
      );
    }

    // Check if block contains embedded inline image among text
    if (trimmed.includes('![') && trimmed.includes('](')) {
      const parts = trimmed.split(/(!\[.*?\]\(.*?\))/g);
      return (
        <div
          key={`mixed-${blockIdx}`}
          id={`story-block-${blockIdx}`}
          data-block-idx={blockIdx}
          data-paragraph-block="true"
          className={`space-y-4 ${resumeClass}`}
        >
          {parts.map((part, pIdx) => {
            const subImage = part.match(/^!\[(.*?)\]\((.*?)\)$/);
            if (subImage) {
              const altText = subImage[1] || '';
              const srcUrl = resolveStoryImageUrl(subImage[2] || '');
              return (
                <figure key={`sub-img-${pIdx}`} className="my-6 text-center select-none">
                  <div className="relative inline-block max-w-full overflow-hidden rounded-2xl shadow-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                    <img
                      src={srcUrl}
                      alt={altText}
                      loading="lazy"
                      onClick={() => onImageClick?.(srcUrl, altText)}
                      className="max-h-[520px] w-auto mx-auto object-contain cursor-zoom-in hover:scale-[1.01] transition-transform duration-200"
                    />
                  </div>
                  {altText && altText !== 'image' && (
                    <figcaption className="mt-2 text-xs text-center opacity-70 italic">
                      {altText}
                    </figcaption>
                  )}
                </figure>
              );
            }
            return part.trim() ? (
              <p key={`sub-p-${pIdx}`} className="leading-relaxed">
                {renderInlineText(part.trim())}
              </p>
            ) : null;
          })}
        </div>
      );
    }

    // Heading 1: #
    if (trimmed.startsWith('# ')) {
      return (
        <h2
          key={`h1-${blockIdx}`}
          id={`story-block-${blockIdx}`}
          data-block-idx={blockIdx}
          data-paragraph-block="true"
          className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-10 mb-4 first:mt-0 ${resumeClass}`}
        >
          {renderInlineText(trimmed.replace(/^#\s+/, ''))}
        </h2>
      );
    }

    // Heading 2: ##
    if (trimmed.startsWith('## ')) {
      return (
        <h3
          key={`h2-${blockIdx}`}
          id={`story-block-${blockIdx}`}
          data-block-idx={blockIdx}
          data-paragraph-block="true"
          className={`text-xl sm:text-2xl font-bold tracking-tight mt-8 mb-3 first:mt-0 ${resumeClass}`}
        >
          {renderInlineText(trimmed.replace(/^##\s+/, ''))}
        </h3>
      );
    }

    // Heading 3: ###
    if (trimmed.startsWith('### ')) {
      return (
        <h4
          key={`h3-${blockIdx}`}
          id={`story-block-${blockIdx}`}
          data-block-idx={blockIdx}
          data-paragraph-block="true"
          className={`text-lg sm:text-xl font-bold tracking-tight mt-6 mb-2 first:mt-0 ${resumeClass}`}
        >
          {renderInlineText(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
    }

    // Horizontal Rule: --- or ***
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      return (
        <div
          key={`hr-${blockIdx}`}
          id={`story-block-${blockIdx}`}
          data-block-idx={blockIdx}
          data-paragraph-block="true"
          className="my-10 flex items-center justify-center gap-2 opacity-30 select-none"
        >
          <span className="w-2 h-2 rounded-full bg-current" />
          <span className="w-2 h-2 rounded-full bg-current" />
          <span className="w-2 h-2 rounded-full bg-current" />
        </div>
      );
    }

    // Blockquote: >
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed
        .split('\n')
        .map((l) => l.replace(/^>\s*/, ''))
        .join('\n');
      return (
        <blockquote
          key={`quote-${blockIdx}`}
          id={`story-block-${blockIdx}`}
          data-block-idx={blockIdx}
          data-paragraph-block="true"
          className={`p-4 sm:p-5 my-6 rounded-2xl italic border-l-4 border-blue-500 ${quoteBgClass} ${resumeClass}`}
        >
          {renderInlineText(quoteText)}
        </blockquote>
      );
    }

    // Standard narrative paragraph
    return (
      <p
        key={`p-${blockIdx}`}
        id={`story-block-${blockIdx}`}
        data-block-idx={blockIdx}
        data-paragraph-block="true"
        className={`leading-relaxed transition-all duration-700 ${resumeClass}`}
      >
        {renderInlineText(trimmed)}
      </p>
    );
  });
}

/**
 * Intelligently converts big/long paragraphs into smaller, readable paragraphs of 2 to 3 lines each
 * (~20-32 words, ~140-200 characters), without deleting or altering any content.
 * Preserves all words, punctuation, dialogue quotes, markdown headings, blockquotes, images, dividers, and lists.
 *
 * @param {string} text - Raw input story content or selected text
 * @param {object} [options] - Optional parameter overrides
 * @returns {string} Text formatted into 2-3 line paragraphs separated by double newlines
 */
export function splitIntoShortParagraphs(text, options = {}) {
  if (!text || typeof text !== 'string') return '';
  const {
    maxSentencesPerPara = 2,
    maxWordsPerPara = 32,
    maxCharsPerPara = 200,
  } = options;

  // Split on double newlines to honor existing block boundaries
  const rawBlocks = text.split(/\n\s*\n/);
  const resultBlocks = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Preserve special markdown blocks intact (headings, blockquotes, images, dividers, lists, code)
    const isImage = /^!\[.*?\]\(.*?\)$/.test(trimmed);
    const isHeading = /^#{1,6}\s/.test(trimmed);
    const isQuote = /^>\s?/.test(trimmed);
    const isDivider = /^(---|---|\*\*\*|___)$/.test(trimmed);
    const isList = /^(\*|-|\+|\d+\.)\s/.test(trimmed);
    const isCode = /^```/.test(trimmed);

    if (isImage || isHeading || isQuote || isDivider || isList || isCode) {
      resultBlocks.push(trimmed);
      continue;
    }

    // Protect common abbreviations, titles, and decimal numbers from sentence splitting
    const protectedText = trimmed
      .replace(/\b(Mr|Mrs|Ms|Miss|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|vol|no|gen|capt|col)\./gi, '$1__DOT__')
      .replace(/(\d+)\.(\d+)/g, '$1__DOT__$2');

    // Tokenize sentences ending with . ! ? followed by optional quotes/brackets/whitespace
    const sentenceTokens = protectedText.match(/[^.!?]+(?:[.!?]+["'’”)]*|\s*$)/g) || [protectedText];
    const sentences = sentenceTokens
      .map((s) => s.replace(/__DOT__/g, '.').trim())
      .filter((s) => s.length > 0);

    // If single sentence, keep intact (or split on semicolon / em-dash if sentence is exceptionally long)
    if (sentences.length <= 1) {
      if (
        sentences.length === 1 &&
        sentences[0].split(/\s+/).filter(Boolean).length > 38 &&
        /[;—]/.test(sentences[0])
      ) {
        const subParts = sentences[0].split(/([;—])/).reduce((acc, cur, idx) => {
          if (idx % 2 === 1) {
            if (acc.length > 0) acc[acc.length - 1] += cur;
          } else if (cur.trim()) {
            acc.push(cur.trim());
          }
          return acc;
        }, []);
        if (subParts.length > 1) {
          resultBlocks.push(...subParts);
          continue;
        }
      }
      resultBlocks.push(trimmed);
      continue;
    }

    const paragraphs = [];
    let currentPara = [];
    let currentWords = 0;
    let currentChars = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sent = sentences[i];
      const sentWords = sent.split(/\s+/).filter(Boolean).length;
      const sentChars = sent.length;

      // Check constraints for 2 to 3 lines:
      // 1 line is ~10-14 words (~60-80 chars). 2-3 lines is ~20-32 words (140-200 chars).
      const wouldExceedSentences =
        currentPara.length >= maxSentencesPerPara && (currentWords >= 16 || sentWords >= 12);
      const wouldExceedWords = currentWords + sentWords > maxWordsPerPara && currentPara.length >= 1;
      const wouldExceedChars = currentChars + sentChars > maxCharsPerPara && currentPara.length >= 1;

      if ((wouldExceedSentences || wouldExceedWords || wouldExceedChars) && currentPara.length > 0) {
        paragraphs.push(currentPara.join(' '));
        currentPara = [sent];
        currentWords = sentWords;
        currentChars = sentChars;
      } else {
        currentPara.push(sent);
        currentWords += sentWords;
        currentChars += sentChars;
      }
    }

    if (currentPara.length > 0) {
      // If trailing sentence is very short (< 6 words) and previous paragraph exists, merge it if total words <= maxWordsPerPara + 4
      if (currentPara.length === 1 && currentWords <= 6 && paragraphs.length > 0) {
        const lastIdx = paragraphs.length - 1;
        const prevWords = paragraphs[lastIdx].split(/\s+/).filter(Boolean).length;
        if (prevWords + currentWords <= maxWordsPerPara + 4) {
          paragraphs[lastIdx] = `${paragraphs[lastIdx]} ${currentPara[0]}`;
          currentPara = [];
        }
      }
      if (currentPara.length > 0) {
        paragraphs.push(currentPara.join(' '));
      }
    }

    resultBlocks.push(...paragraphs);
  }

  return resultBlocks.join('\n\n');
}
