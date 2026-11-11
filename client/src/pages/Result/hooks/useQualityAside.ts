// Measures the wide Result workspace and eases the AI Quality column.
// The column width is a registered <length> (--rp-aside in Result.css) so it
// can interpolate; minmax()/fr could not, and that snap was the flicker.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

const ASIDE_EASE_MS = 380;
const WIDE_MIN_PX = 1100;

interface QualityAside {
  layoutWide: boolean;
  asideAnimating: boolean;
  beginAsideToggle: (collapsed: boolean) => void;
}

function measureOpenAside(el: HTMLElement): number {
  const styles = getComputedStyle(el);
  const slide = Number.parseFloat(styles.getPropertyValue('--rp-slide'));
  const tools = Number.parseFloat(styles.getPropertyValue('--rp-tools'));
  const slidePx = Number.isFinite(slide) ? slide : 470;
  const toolsPx = Number.isFinite(tools) ? tools : 300;
  // 16px is .rp-grid's gap; 24px is the slide↔tools gap. Same cap as the
  // old minmax(0, slide+tools+24) content column.
  return Math.max(320, el.clientWidth - 16 - slidePx - toolsPx - 24);
}

export function useQualityAside(rpRef: RefObject<HTMLDivElement | null>): QualityAside {
  const [layoutWide, setLayoutWide] = useState(false);
  const [asideAnimating, setAsideAnimating] = useState(false);
  const asideAnimatingRef = useRef(false);
  const asideAnimTimer = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = rpRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let instantFrame = 0;
    const measure = (): void => {
      const width = el.clientWidth;
      setLayoutWide(width >= WIDE_MIN_PX);
      // WHY skip during the toggle: rewriting --rp-aside-open with the instant
      // class drops the column transition, which is the flicker on open/close.
      if (asideAnimatingRef.current) return;
      el.classList.add('rp-aside-instant');
      el.style.setProperty('--rp-aside-open', `${Math.round(measureOpenAside(el))}px`);
      window.cancelAnimationFrame(instantFrame);
      instantFrame = window.requestAnimationFrame(() => {
        el.classList.remove('rp-aside-instant');
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(instantFrame);
    };
  }, [rpRef]);

  useEffect(() => {
    return () => {
      if (asideAnimTimer.current !== null) window.clearTimeout(asideAnimTimer.current);
    };
  }, []);

  function beginAsideToggle(collapsed: boolean): void {
    const root = rpRef.current;
    // Freeze the open width at the pixels on screen so the card doesn't
    // reflow while the column eases shut.
    if (root && layoutWide && !collapsed) {
      const asideEl = root.querySelector('.rp-sidebar');
      if (asideEl instanceof HTMLElement) {
        const px = Math.max(48, Math.round(asideEl.getBoundingClientRect().width));
        root.style.setProperty('--rp-aside-open', `${px}px`);
      }
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    asideAnimatingRef.current = true;
    setAsideAnimating(true);
    if (asideAnimTimer.current !== null) window.clearTimeout(asideAnimTimer.current);
    // Just past the 360ms --rp-aside ease so the pin drops after it settles.
    asideAnimTimer.current = window.setTimeout(() => {
      asideAnimatingRef.current = false;
      setAsideAnimating(false);
      asideAnimTimer.current = null;
    }, ASIDE_EASE_MS);
  }

  return { layoutWide, asideAnimating, beginAsideToggle };
}
