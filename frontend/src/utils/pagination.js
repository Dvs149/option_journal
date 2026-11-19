/**
 * Generates an array of page numbers and ellipsis markers for pagination controls.
 * Ensures the active page is always visible with a smooth sliding window.
 *
 * @param {number} currentPage - The current active page (1-based)
 * @param {number} lastPage - The total number of pages
 * @returns {(number|string)[]} Array of page numbers and '...' strings
 */
export function getPaginationPages(currentPage = 1, lastPage = 1) {
  const current = Math.max(1, Number(currentPage) || 1);
  const total = Math.max(1, Number(lastPage) || 1);

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let start = Math.max(1, current - 2);
  let end = Math.min(total, current + 2);

  if (current <= 3) {
    start = 1;
    end = 5;
  } else if (current >= total - 2) {
    end = total;
    start = total - 4;
  }

  const pages = [];

  // Head
  if (start > 1) {
    pages.push(1);
    if (start === 3) {
      pages.push(2);
    } else if (start > 3) {
      pages.push('...');
    }
  }

  // Window
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Tail
  if (end < total) {
    if (end === total - 2) {
      pages.push(total - 1);
    } else if (end < total - 2) {
      pages.push('...');
    }
    pages.push(total);
  }

  return pages;
}
