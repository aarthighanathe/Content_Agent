// WHY: the carousel design preset used to be computed inside IGCarouselPreview, which
// meant the PNG export path had no way to learn which design the user was actually
// looking at — the server then invented its own, so downloads never matched the preview.
// Lifting it here gives both the preview and the export a single shared value.
import { useEffect, useMemo } from 'react';
import type { SlideData } from '../components/content/carousel/IGSlide';
import { DESIGN_PRESET_COUNT } from '../components/content/carousel/IGSlide';

const DESIGN_HISTORY_KEY = 'ca_carousel_design_history';
const DESIGN_SEED_KEY = 'ca_carousel_design_seeds';
const NO_REPEAT_WINDOW = 10; // minimum generations before a design can repeat
const MAX_STORED_SEEDS = 40;

interface StoredSeed {
  fp: string;
  seed: number;
}

/** Stable id of this carousel's copy. Same headlines+bodies must keep the same preset. */
function contentFingerprint(slides: SlideData[]): string {
  const str = slides.map((s) => `${s.headline ?? ''}\u0000${s.body ?? ''}`).join('\u0001');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
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

function isStoredSeed(value: unknown): value is StoredSeed {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.fp === 'string' && typeof row.seed === 'number';
}

function loadStoredSeeds(): StoredSeed[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DESIGN_SEED_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredSeed);
  } catch {
    return [];
  }
}

function lookupStoredSeed(fp: string): number | undefined {
  const entries = loadStoredSeeds();
  for (let i = entries.length - 1; i >= 0; i--) {
    const row = entries[i];
    if (row && row.fp === fp) return row.seed;
  }
  return undefined;
}

function isUsablePreset(seed: number | undefined): seed is number {
  return typeof seed === 'number'
    && Number.isInteger(seed)
    && seed >= 0
    && seed < DESIGN_PRESET_COUNT;
}

function rememberSeed(fp: string, seed: number): boolean {
  const next = loadStoredSeeds().filter((row) => row.fp !== fp);
  next.push({ fp, seed });
  try {
    localStorage.setItem(DESIGN_SEED_KEY, JSON.stringify(next.slice(-MAX_STORED_SEEDS)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Picks the best available preset for a given topic:
 * - Starts from a fingerprint anchor
 * - Skips any preset that appears in the recent-history window
 * - Guarantees a fresh design every new carousel until the pool is exhausted
 */
function pickDesignPreset(hash: number, history: number[]): number {
  const preferred = Math.abs(hash) % DESIGN_PRESET_COUNT;
  for (let i = 0; i < DESIGN_PRESET_COUNT; i++) {
    const candidate = (preferred + i) % DESIGN_PRESET_COUNT;
    if (!history.includes(candidate)) return candidate;
  }
  return preferred;
}

/**
 * Resolves the design preset for a carousel.
 * A fingerprint that already has a stored seed is reused and does not rotate
 * the no-repeat history. Only the first view of new copy appends history.
 */
export function useCarouselDesignSeed(slides: SlideData[] | undefined): number {
  const fingerprint = Array.isArray(slides) && slides.length > 0
    ? contentFingerprint(slides)
    : '';

  const designSeed = useMemo(() => {
    if (!fingerprint) return 0;
    const stored = lookupStoredSeed(fingerprint);
    if (isUsablePreset(stored)) return stored;
    const hash = Number.parseInt(fingerprint, 16);
    return pickDesignPreset(Number.isFinite(hash) ? hash : 0, loadDesignHistory());
  }, [fingerprint]);

  useEffect(() => {
    if (!fingerprint) return;
    const stored = lookupStoredSeed(fingerprint);
    // WHY: remounting the same carousel used to append history every visit,
    // so the next open skipped the preset the user had just seen.
    if (stored === designSeed) return;
    if (!rememberSeed(fingerprint, designSeed)) return;
    const history = loadDesignHistory();
    if (history[history.length - 1] === designSeed) return;
    saveDesignHistory([...history, designSeed].slice(-NO_REPEAT_WINDOW));
  }, [fingerprint, designSeed]);

  return designSeed;
}
