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
  const { onImageClick, imageBorderClass = 'border-current/15', quoteBgClass = 'bg-black/5 dark:bg-white/5 border-l-4 border-blue-500' } = options;

  if (!content || typeof content !== 'string') return null;

  // Split content into paragraph/blocks by double newlines
  const rawBlocks = content.split(/\n\s*\n/);

  return rawBlocks.map((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Check for Image Markdown: ![alt](url)
    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      const altText = imageMatch[1] || '';
      const srcUrl = resolveStoryImageUrl(imageMatch[2] || '');

      return (
        <figure key={`img-${blockIdx}`} className="my-8 text-center select-none">
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
        <div key={`mixed-${blockIdx}`} className="space-y-4">
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
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-10 mb-4 first:mt-0"
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
          className="text-xl sm:text-2xl font-bold tracking-tight mt-8 mb-3 first:mt-0"
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
          className="text-lg sm:text-xl font-bold tracking-tight mt-6 mb-2 first:mt-0"
        >
          {renderInlineText(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
    }

    // Horizontal Rule: --- or ***
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      return (
        <div key={`hr-${blockIdx}`} className="my-10 flex items-center justify-center gap-2 opacity-30 select-none">
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
          className={`p-4 sm:p-5 my-6 rounded-2xl italic border-l-4 border-blue-500 ${quoteBgClass}`}
        >
          {renderInlineText(quoteText)}
        </blockquote>
      );
    }

    // Standard narrative paragraph
    return (
      <p key={`p-${blockIdx}`} className="leading-relaxed">
        {renderInlineText(trimmed)}
      </p>
    );
  });
}
