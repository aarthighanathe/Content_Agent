import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { ColorSystem } from '../../../../../lib/colorSystem';
import { IGSlide } from './IGSlide';
import type { SlideData } from './IGSlide';
import { EditSlideModal } from './EditSlideModal';
import { useTrackedTimeout } from '../../../../../hooks/useTrackedTimeout';
import { Pen, Copy, Check } from 'lucide-react';
import { ChevLeft, ChevRight } from './IGFrameIcons';

interface Props {
  slides:          SlideData[];
  colors:          ColorSystem;
  brandName:       string;
  handle:          string;
  currentSlide:    number;
  setCurrentSlide: (n: number) => void;
  onSave:          (newSlides: SlideData[]) => Promise<void>;
  slideRefs:       React.MutableRefObject<(HTMLDivElement | null)[]>;
  /** Resolved by useCarouselDesignSeed in Result.tsx — shared with the PNG export
   *  so the downloaded slides match exactly what is rendered here. */
  designPreset:    number;
  // New template system fields — optional for backward compatibility with
  // carousels created before this feature shipped (falls back to the legacy
  // designPreset-driven layout in IGSlide when absent).
  templateId?:     string;
  paletteId?:      string;
}

/** Instagram portrait posts are 1080×1350. The desktop feed shows that card at 470px. */
const IG_POST_W = 470;
const IG_POST_RATIO = 1350 / 1080;

let fontsInjected = false;
function injectFonts() {
  if (fontsInjected || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap';
  document.head.appendChild(link);
  fontsInjected = true;
}

const EMOJI_RE = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
function stripEmoji(t: string) { return t.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim(); }

// NOTE: the design-seed system moved to hooks/useCarouselDesignSeed.ts so the PNG
// export can render the same preset the user is looking at. This component now
// receives the resolved preset as a prop.

export function IGCarouselPreview({ slides, colors, brandName, handle, currentSlide, setCurrentSlide, onSave, slideRefs, designPreset, templateId, paletteId }: Props) {
  const total = slides.length;
  // WHY: copyAll fires from a click handler, not an effect — there's no
  // natural cleanup point for its 2s "revert to Copy" timer, so it's tracked
  // and cleared on unmount via the shared hook (same pattern as useSocial.ts,
  // ExportModal.tsx, FeedMonitorPanel.tsx).
  const pendingTimers = useTrackedTimeout();

  // WHY the slide fills its column: side arrows and the fake Instagram
  // chrome used to leave a wide empty band around a small card.
  // WHY MIN_PREVIEW_W 280 (was 180): height-driven shrink under the old
  // one-screen lock + DevTools mid-width crushed the card to a postage stamp;
  // prefer a readable preview and let the page scroll when height is short.
  const MIN_PREVIEW_W = 280;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [renderW, setRenderW] = useState(IG_POST_W);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const fit = (): void => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0) return;
      const maxW = Math.min(IG_POST_W, Math.floor(w));
      // Floor at MIN_PREVIEW_W unless the column itself is narrower — then
      // use the full column (Template/Adapt already stacked under the slide).
      const floorW = Math.min(MIN_PREVIEW_W, maxW);
      // WHY height too: a 470×588 card plus the header is taller than a laptop
      // window. The card keeps the 4:5 ratio and shrinks to the space left.
      // A stage with no assigned height reports its own content, so leave the
      // width cap in place instead of shrinking toward zero.
      if (h < 120) {
        setRenderW(maxW);
        return;
      }
      const toolbar = el.querySelector('.rp-slide-toolbar');
      const toolbarH = toolbar instanceof HTMLElement ? toolbar.offsetHeight : 40;
      const maxH = Math.max(160, h - toolbarH - 8);
      const widthFromH = Math.floor(maxH / IG_POST_RATIO);
      // Never go below floorW for height pressure — page scroll is preferred.
      setRenderW(Math.min(maxW, Math.max(floorW, widthFromH)));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    fit();
    return () => observer.disconnect();
  }, []);
  const renderH = Math.round(renderW * IG_POST_RATIO);

  const [internalSlide, setInternalSlide] = useState(currentSlide);
  useEffect(() => {
    const t = setTimeout(() => { setInternalSlide(currentSlide); }, 0);
    return () => clearTimeout(t);
  }, [currentSlide]);

  // WHY clamp: after regenerate/edit the slide count can shrink while
  // currentSlide still points past the last index — empty frame + broken dots.
  useEffect(() => {
    if (total <= 0) return;
    if (currentSlide > total - 1) {
      setCurrentSlide(total - 1);
    }
  }, [total, currentSlide, setCurrentSlide]);

  function goTo(n: number) {
    const clamped = Math.max(0, Math.min(total - 1, n));
    setInternalSlide(clamped);
    setCurrentSlide(clamped);
  }

  // Drag / swipe
  const dragStart  = useRef<number | null>(null);
  const [dragging, setDragging]     = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = e.clientX;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || dragStart.current === null) return;
    setDragOffset(e.clientX - dragStart.current);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!dragging || dragStart.current === null) return;
    const delta = e.clientX - dragStart.current;
    if (Math.abs(delta) > 40) goTo(internalSlide + (delta < 0 ? 1 : -1));
    setDragging(false);
    setDragOffset(0);
    dragStart.current = null;
  }

  // Edit
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  async function handleSave(updated: SlideData) {
    const next = [...slides];
    if (editingIdx !== null) next[editingIdx] = updated;
    await onSave(next);
  }

  // Copy all
  const [copiedAll, setCopiedAll] = useState(false);
  function copyAll() {
    const text = slides.map((s, i) => `[Slide ${i + 1}]\n${stripEmoji(s.headline || '')}\n${stripEmoji(s.body || '')}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      pendingTimers.set(() => setCopiedAll(false), 2000);
    }).catch(() => {});
  }

  useEffect(() => { injectFonts(); }, []);
  useEffect(() => {
    // WHY splice instead of direct assignment: react-hooks/immutability flags
    // `ref.current = newValue` because it looks like a state mutation. Mutating
    // the ref's contents (splice) rather than re-assigning `.current` itself is
    // semantically equivalent and satisfies the rule.
    slideRefs.current.splice(0, slideRefs.current.length, ...Array<null>(total).fill(null));
  }, [total, slideRefs]);

  const trackX = -(internalSlide * renderW) + (dragging ? dragOffset : 0);
  const slideType = slides[internalSlide]?.type || 'slide';
  // NOTE: the viewport used to shrink to a square when AI-rendered PNGs arrived. The
  // export is now 4:5 like these slides, so the preview stays one consistent shape.
  const viewportH = renderH;

  return (
    <div ref={wrapRef} className="rp-carousel-stage">
      <div
        className="rp-slide-frame"
        style={{ width: renderW }}
      >
        <div
          style={{
            width: renderW, height: viewportH, overflow: 'hidden',
            position: 'relative',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div style={{
            display: 'flex',
            transform: `translateX(${trackX}px)`,
            transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)',
            willChange: 'transform',
          }}>
            {slides.map((slide, i) => (
              <IGSlide
                key={slide.slide_number ?? i}
                ref={el => { slideRefs.current[i] = el; }}
                slide={slide}
                index={i}
                total={total}
                colors={colors}
                isLast={i === total - 1}
                brandName={brandName}
                handle={handle}
                width={renderW}
                height={renderH}
                designPreset={designPreset}
                templateId={templateId}
                paletteId={paletteId}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rp-slide-toolbar" style={{ width: renderW }}>
        <button
          type="button"
          className="rp-slide-btn"
          onClick={() => goTo(internalSlide - 1)}
          disabled={internalSlide <= 0}
          aria-label="Previous slide"
        >
          <ChevLeft />
        </button>
        <div className="rp-slide-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.slide_number ?? i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === internalSlide}
            >
              <span
                aria-hidden="true"
                style={{
                  width: i === internalSlide ? 16 : 6,
                  height: 6,
                  borderRadius: 4,
                  background: i === internalSlide ? colors.BRAND_PRIMARY : 'var(--rule)',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rp-slide-btn"
          onClick={() => goTo(internalSlide + 1)}
          disabled={internalSlide >= total - 1}
          aria-label="Next slide"
        >
          <ChevRight />
        </button>
        <span className="rp-slide-count">
          {internalSlide + 1}/{total}
          <span>{slideType}</span>
        </span>
        <button type="button" className="rp-slide-textbtn" onClick={() => setEditingIdx(internalSlide)}>
          <Pen size={12} /> Edit
        </button>
        <button type="button" className="rp-slide-textbtn" onClick={copyAll}>
          {copiedAll ? <Check size={12} /> : <Copy size={12} />}
          {copiedAll ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Edit modal */}
      {(() => {
        const editingSlide = editingIdx !== null ? slides[editingIdx] : undefined;
        if (editingIdx === null || !editingSlide) return null;
        return (
          <EditSlideModal
            slide={editingSlide}
            index={editingIdx}
            onSave={handleSave}
            onClose={() => setEditingIdx(null)}
          />
        );
      })()}
    </div>
  );
}
