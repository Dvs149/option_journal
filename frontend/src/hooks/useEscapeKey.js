import { useEffect } from 'react';

// Global stack of registered escape handlers (LIFO: last added / topmost executes first)
const activeEscapeHandlers = [];

/**
 * Fallback to close any unmanaged modal/dialog/drawer/overlay currently visible in the DOM.
 * @returns {boolean} True if a popup was found and closed, false otherwise.
 */
export function closeTopmostDomModal() {
  if (typeof document === 'undefined') return false;

  // 1. Native HTML5 dialogs
  const nativeDialogs = Array.from(document.querySelectorAll('dialog[open]'));
  if (nativeDialogs.length > 0) {
    const topDialog = nativeDialogs[nativeDialogs.length - 1];
    try {
      topDialog.close();
      return true;
    } catch {
      // continue to general DOM check
    }
  }

  // 2. Full-screen fixed overlays, modals, and drawers
  const overlays = Array.from(
    document.querySelectorAll(
      '[role="dialog"], [aria-modal="true"], [data-modal], .fixed.inset-0, [class*="fixed inset-0"], [class*="fixed top-0 right-0"]'
    )
  ).filter((el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      style.pointerEvents === 'none'
    ) {
      return false;
    }
    const zIndex = parseInt(style.zIndex, 10);
    // Ignore low z-index non-overlay background elements
    return isNaN(zIndex) || zIndex >= 20;
  });

  if (overlays.length === 0) return false;

  // Sort by highest z-index, then by document order (later in DOM = higher)
  overlays.sort((a, b) => {
    const zA = parseInt(window.getComputedStyle(a).zIndex, 10) || 0;
    const zB = parseInt(window.getComputedStyle(b).zIndex, 10) || 0;
    if (zA !== zB) return zB - zA;
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : -1;
  });

  const topOverlay = overlays[0];

  // Look for a close button inside the topmost overlay
  const closeBtn =
    topOverlay.querySelector('button[aria-label*="close" i]') ||
    topOverlay.querySelector('button[title*="close" i]') ||
    topOverlay.querySelector('button[data-close]') ||
    topOverlay.querySelector('button.close-btn') ||
    topOverlay.querySelector('button:has(svg.lucide-x)') ||
    topOverlay.querySelector('svg.lucide-x')?.closest('button') ||
    Array.from(topOverlay.querySelectorAll('button')).find((btn) => {
      const text = (btn.textContent || '').trim().toLowerCase();
      return (
        text === 'close' ||
        text === 'cancel' ||
        text === '✕' ||
        text === '×' ||
        text.includes('close') ||
        text.includes('cancel')
      );
    });

  if (closeBtn) {
    closeBtn.click();
    return true;
  }

  // If topOverlay has backdrop click handler
  topOverlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return true;
}

// Global window event listener (capture phase to intercept before component blur/loss of focus)
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        // Blur active element to clear any search/input focus
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }

        // If an explicit handler is registered on the stack, invoke the topmost one
        if (activeEscapeHandlers.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const top = activeEscapeHandlers[activeEscapeHandlers.length - 1];
          top.handler(e);
        } else {
          // Otherwise, inspect the DOM and dismiss the topmost modal/overlay
          const handled = closeTopmostDomModal();
          if (handled) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    },
    { capture: true }
  );
}

/**
 * Hook to execute a callback when the Escape key is pressed.
 * Automatically manages a stack so only the topmost popup closes.
 *
 * @param {Function} onEscape - Callback function to run on Escape.
 * @param {boolean} [isActive=true] - Only active when true (e.g. `isOpen`).
 */
export function useEscapeKey(onEscape, isActive = true) {
  useEffect(() => {
    if (!isActive || typeof onEscape !== 'function') return;

    const entry = { handler: onEscape };
    activeEscapeHandlers.push(entry);

    return () => {
      const index = activeEscapeHandlers.lastIndexOf(entry);
      if (index !== -1) {
        activeEscapeHandlers.splice(index, 1);
      }
    };
  }, [onEscape, isActive]);
}

export default useEscapeKey;
