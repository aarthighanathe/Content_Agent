// WHY: Shared accessibility hook for all modal/dialog/drawer overlays — audit finding U-4
// (no focus trap, no Escape-to-close, no role="dialog" anywhere in client/src).
// Centralizing this logic here means every modal gets the same, correct behavior
// instead of each component reimplementing (or forgetting) it.
import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Traps keyboard focus within a modal/dialog container while it is active.
 *
 * - Remembers the element that had focus before the modal opened.
 * - Moves focus into the container (first focusable element, else the container itself).
 * - Cycles Tab/Shift+Tab within the container's focusable elements.
 * - Restores focus to the previously focused element when deactivated/unmounted.
 *
 * @param containerRef Ref to the modal/dialog container element.
 * @param active       Whether the trap should be engaged (i.e. the modal is open).
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    // WHY: restore focus to whatever triggered the modal (e.g. the button that opened it)
    // so keyboard/screen-reader users aren't stranded at the top of the document on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      if (!container) return [];
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null, // skip hidden elements
      );
    }

    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      container.focus();
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Tab') return;

      const focusableEls = getFocusable();
      if (focusableEls.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];
      const current = document.activeElement;

      if (e.shiftKey) {
        if (current === first || !container?.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (current === last || !container?.contains(current)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // WHY: only restore focus if the element is still attached — it may have been
      // removed from the DOM (e.g. a "Delete" button whose row unmounted).
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef]);
}
