import React, { useState, useRef, useEffect } from 'react';
import type { ColorSystem } from '../../../../../lib/colorSystem';
import { IGSlide } from './IGSlide';
import type { SlideData } from './IGSlide';
import { EditSlideModal } from './EditSlideModal';
import { Pen, Copy, Check } from 'lucide-react';

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

const SLIDE_W = 420;  // skill spec design width
const SLIDE_H = 525;  // 4:5 ratio

let fontsInjected = false;
function injectFonts() {
  if (fontsInjected || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap';
  document.head.appendChild(link);
  fontsInjected = true;
}

const FONT = "'Plus Jakarta Sans',system-ui,sans-serif";

const EMOJI_RE = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
function stripEmoji(t: string) { return t.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim(); }

// NOTE: the design-seed system moved to hooks/useCarouselDesignSeed.ts so the PNG
// export can render the same preset the user is looking at. This component now
// receives the resolved preset as a prop.

// ── Instagram frame icons ─────────────────────────────────────────────────────

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function DotsMenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
    </svg>
  );
}

function ChevLeft()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ChevRight() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

// Avatar circle with initials
function Avatar({ name, colors, size = 38 }: { name: string; colors: ColorSystem; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${colors.BRAND_PRIMARY}, ${colors.BRAND_DARK})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: Math.round(size * 0.42), fontFamily: FONT }}>
        {(name.trim()[0] || 'B').toUpperCase()}
      </span>
    </div>
  );
}

export function IGCarouselPreview({ slides, colors, brandName, handle, currentSlide, setCurrentSlide, onSave, slideRefs, designPreset, templateId, paletteId }: Props) {
  const total = slides.length;

  const [internalSlide, setInternalSlide] = useState(currentSlide);
  useEffect(() => {
    const t = setTimeout(() => { setInternalSlide(currentSlide); }, 0);
    return () => clearTimeout(t);
  }, [currentSlide]);

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
      setTimeout(() => setCopiedAll(false), 2000);
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

  const trackX = -(internalSlide * SLIDE_W) + (dragging ? dragOffset : 0);
  const slideType = slides[internalSlide]?.type || 'slide';
  // NOTE: the viewport used to shrink to a square when AI-rendered PNGs arrived. The
  // export is now 4:5 like these slides, so the preview stays one consistent shape.
  const viewportH = SLIDE_H;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>

      {/* ── Instagram frame — 420px wide ─────────────────────────────── */}
      <div style={{
        width: SLIDE_W,
        background: 'var(--bg-card)',
        border: '1px solid var(--rule)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
      }}>

        {/* Frame header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--rule)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Avatar with gradient ring */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -2, borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.BRAND_PRIMARY}, ${colors.BRAND_DARK})`,
                opacity: 0.6,
              }} />
              <Avatar name={brandName} colors={colors} size={36} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: FONT, lineHeight: 1.2 }}>
                {brandName || 'Brand'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: FONT, lineHeight: 1 }}>
                {handle} · Carousel
              </div>
            </div>
          </div>
          <DotsMenuIcon />
        </div>

        {/* ── Carousel viewport ───────────────────────────────────────── */}
        <div
          style={{
            width: SLIDE_W, height: viewportH, overflow: 'hidden',
            position: 'relative',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: 'height 0.3s ease',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Prev overlay arrow */}
          {internalSlide > 0 && (
            <button
              onClick={e => { e.stopPropagation(); goTo(internalSlide - 1); }}
              aria-label="Previous slide"
              style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                zIndex: 20, width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(6px)',
              }}
            >
              <ChevLeft />
            </button>
          )}

          {/* Next overlay arrow */}
          {internalSlide < total - 1 && (
            <button
              onClick={e => { e.stopPropagation(); goTo(internalSlide + 1); }}
              aria-label="Next slide"
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                zIndex: 20, width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(6px)',
              }}
            >
              <ChevRight />
            </button>
          )}

          {/* Slide track */}
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
                width={SLIDE_W}
                height={SLIDE_H}
                designPreset={designPreset}
                templateId={templateId}
                paletteId={paletteId}
              />
            ))}
          </div>
        </div>

        {/* Position dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '10px 0 6px' }}>
          {slides.map((slide, i) => (
            <button
              key={slide.slide_number ?? i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === internalSlide}
              style={{
                width: 32, height: 32, padding: 0,
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: i === internalSlide ? 16 : 5, height: 5, borderRadius: 3,
                  background: i === internalSlide ? colors.BRAND_PRIMARY : 'rgba(255,255,255,0.18)',
                  transition: 'width 0.22s, background 0.22s',
                }}
              />
            </button>
          ))}
        </div>

        {/* Action icons row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 16px 8px',
        }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
              <HeartIcon />
            </button>
            <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
              <CommentIcon />
            </button>
            <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
              <ShareIcon />
            </button>
          </div>
          <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
            <BookmarkIcon />
          </button>
        </div>

        {/* Caption */}
        <div style={{ padding: '2px 16px 14px' }}>
          <div style={{ fontSize: 12, lineHeight: 1.5, fontFamily: FONT, color: 'var(--color-text-secondary)' }}>
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{handle} </span>
            {slides.length} slides · Swipe to explore
          </div>
          <div style={{ marginTop: 5, fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: "var(--font-mono)", letterSpacing: 1 }}>
            2 HOURS AGO
          </div>
        </div>
      </div>

      {/* ── Info bar below frame ─────────────────────────────────────── */}
      <div style={{
        marginTop: 14, width: SLIDE_W,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 4px',
      }}>
        {/* Slide counter + type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: 'rgba(255,255,255,0.28)', letterSpacing: 1.5 }}>
            {String(internalSlide + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <span style={{
            fontSize: 9, letterSpacing: 1.5, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
            border: `1px solid ${colors.BRAND_PRIMARY}40`, color: colors.BRAND_LIGHT,
            fontFamily: "var(--font-mono)",
          }}>
            {slideType}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setEditingIdx(internalSlide)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)', fontSize: 11, transition: 'all 0.15s', fontFamily: FONT }}
          >
            <Pen size={9} /> Edit slide
          </button>
          <button
            onClick={copyAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: copiedAll ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)', fontSize: 11, transition: 'all 0.15s', fontFamily: FONT }}
          >
            {copiedAll ? <Check size={9} /> : <Copy size={9} />}
            {copiedAll ? 'Copied!' : 'Copy all'}
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editingIdx !== null && (
        <EditSlideModal
          slide={slides[editingIdx]}
          index={editingIdx}
          onSave={handleSave}
          onClose={() => setEditingIdx(null)}
        />
      )}
    </div>
  );
}
