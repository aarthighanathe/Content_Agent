// WHY: the carousel design preset used to be computed inside IGCarouselPreview, which
// meant the PNG export path had no way to learn which design the user was actually
// looking at — the server then invented its own, so downloads never matched the preview.
// Lifting it here gives both the preview and the export a single shared value.
import { useEffect, useMemo } from 'react';
import type { SlideData } from '../components/content/carousel/IGSlide';
import { DESIGN_PRESET_COUNT } from '../components/content/carousel/IGSlide';

const DESIGN_HISTORY_KEY = 'ca_carousel_design_history';
const NO_REPEAT_WINDOW   = 10; // minimum generations before a design can repeat

/** Stable numeric hash of all slide headlines — changes when new content arrives. */
function topicHash(slides: SlideData[]): number {
  const str = slides.map((s) => s.headline || '').join('|');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function loadDesignHistory(): number[] {
  // NOTE: JSON.parse is wrapped because localStorage can hold anything a previous
  // version (or the user) wrote — a throw here would break the whole result page.
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DESIGN_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function saveDesignHistory(history: number[]): void {
  try {
    localStorage.setItem(DESIGN_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Quota or private-mode failure — the seed still works, it just may repeat sooner.
  }
}

/**
 * Picks the best available preset for a given topic:
 * - Starts from `topicHash % DESIGN_PRESET_COUNT` (topic-specific anchor)
 * - Skips any preset that appears in the recent-history window
 * - Guarantees a fresh design every generation until the pool is exhausted
 */
function pickDesignPreset(hash: number, history: number[]): number {
  const preferred = hash % DESIGN_PRESET_COUNT;
  for (let i = 0; i < DESIGN_PRESET_COUNT; i++) {
    const candidate = (preferred + i) % DESIGN_PRESET_COUNT;
    if (!history.includes(candidate)) return candidate;
  }
  return preferred; // all presets recently used — fall back to topic anchor
}

/**
 * Resolves the design preset for a carousel and records it in the no-repeat history.
 * Must be called once per result page — the returned value is passed to BOTH the
 * on-screen preview and the PNG export so the two render identically.
 */
export function useCarouselDesignSeed(slides: SlideData[] | undefined): number {
  const isCarousel = Array.isArray(slides);
  const firstHeadline = isCarousel ? slides[0]?.headline : undefined;
  const slideCount = isCarousel ? slides.length : 0;

  const designSeed = useMemo(
    () => (isCarousel && slideCount > 0 ? pickDesignPreset(topicHash(slides), loadDesignHistory()) : 0),
    // WHY: recompute only when the content itself changes (= a new generation), not on
    // every render — the seed must stay stable while the user is viewing one carousel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCarousel, slideCount, firstHeadline],
  );

  useEffect(() => {
    if (!isCarousel || slideCount === 0) return;
    const history = loadDesignHistory();
    // NOTE: dedup guard — without it, a remount would append the same seed again and
    // eventually rotate the design out from under the user mid-session.
    if (history[history.length - 1] === designSeed) return;
    saveDesignHistory([...history, designSeed].slice(-NO_REPEAT_WINDOW));
  }, [designSeed, isCarousel, slideCount]);

  return designSeed;
}
