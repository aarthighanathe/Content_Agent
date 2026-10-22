import { Children, cloneElement, isValidElement, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

interface FitFrameProps {
  /** Changes when the slide copy or frame size changes, so the fit is remeasured. */
  watch: string;
  /**
   * Scale baked into the markup. Export screenshots run with JavaScript
   * disabled, so they cannot remeasure; this estimate is what the PNG uses.
   * The browser effect below replaces it with a measured scale.
   */
  initialScale?: number;
  /**
   * Template padding, in CSS pixels. When the copy is too tall, this stays on
   * the frame and only the copy shrinks, so the inset matches a short slide.
   */
  padding?: number;
  children: ReactNode;
}

interface PaddedElementProps {
  style?: CSSProperties;
}

/** Moves root padding onto the frame; the card color has to fill that ring. */
function withoutRootPadding(node: ReactNode): {
  background?: CSSProperties['background'];
  node: ReactNode;
} {
  let background: CSSProperties['background'];
  const next = Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    const props = child.props as PaddedElementProps;
    if (props.style?.padding == null) return child;
    background = props.style.background;
    return cloneElement(child as ReactElement<PaddedElementProps>, {
      style: { ...props.style, padding: 0 },
    });
  });
  return { background, node: next };
}

/**
 * Shrinks a slide so a long headline, body, and point list stay inside the
 * fixed preview frame. Template type is absolute pixels authored for a short
 * slide, so denser copy used to clip through the card edge.
 *
 * WHY the effect is not the only fit: PNG export screenshots this same CSS
 * layout with JavaScript disabled, so `initialScale` is written into the
 * markup and the effect only corrects it in the live preview.
 */
export function FitFrame({ watch, children, initialScale = 1, padding = 0 }: FitFrameProps): ReactElement {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<() => void>(() => {});
  const pad = padding > 0 ? padding : 0;
  const holdPad = initialScale > 0 && initialScale < 0.999 && pad > 0;
  const scale = initialScale > 0 && initialScale < 0.999 ? initialScale : 1;
  const framed = holdPad ? withoutRootPadding(children) : null;

  // WHY no dependency list: each React commit writes the estimated inline
  // scale back onto the node. This runs after that write and replaces it
  // with the measured scale before paint.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // WHY not scrollHeight: decorative circles are position:absolute and stick
    // out of the card, which inflated scrollHeight and scaled even short slides.
    const contentBottom = (): number => {
      const base = inner.getBoundingClientRect().top;
      let max = 0;
      inner.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (getComputedStyle(el).position === 'absolute') return;
        const bottom = el.getBoundingClientRect().bottom - base;
        if (bottom > max) max = bottom;
      });
      return max;
    };

    const fit = (): void => {
      const canvas = inner.firstElementChild instanceof HTMLElement ? inner.firstElementChild : null;
      inner.style.transform = 'none';
      inner.style.width = '100%';
      inner.style.height = 'auto';
      inner.style.flex = '0 1 auto';
      outer.style.padding = '0px';
      outer.style.boxSizing = 'border-box';
      if (canvas && pad > 0) canvas.style.padding = `${pad}px`;

      const availableH = outer.clientHeight;
      const availableW = outer.clientWidth;
      if (availableH <= 0 || availableW <= 0) return;
      // WHY a few pixels short of the frame: a scale that lands exactly on
      // the clip edge still slices the last line on some slides.
      const targetH = Math.max(40, availableH - 12);

      if (canvas) {
        const bg = getComputedStyle(canvas).backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          outer.style.background = bg;
        }
      }

      const neededH = contentBottom();
      const neededW = inner.scrollWidth;
      const overflowsH = neededH > availableH + 1;
      const overflowsW = neededW > availableW + 1;
      const scaleH = overflowsH ? targetH / neededH : 1;
      const scaleW = overflowsW ? availableW / neededW : 1;

      // WHY padding stays outside the scale: shrinking the whole card from
      // the center made a tall slide's inset larger than a short slide's.
      // The 12px gap applies only once the copy is actually past the frame.
      if (pad > 0 && overflowsH && !overflowsW) {
        const contentNeeded = Math.max(1, neededH - pad * 2);
        const contentTarget = Math.max(40, availableH - pad * 2 - 12);
        const fitScale = contentNeeded > contentTarget
          ? Math.max(0.45, contentTarget / contentNeeded)
          : 1;
        if (fitScale < 0.999) {
          outer.style.padding = `${pad}px`;
          if (canvas) canvas.style.padding = '0px';
          inner.style.flex = '0 0 auto';
          inner.style.width = `calc(100% / ${fitScale})`;
          inner.style.height = `calc(100% / ${fitScale})`;
          inner.style.transform = `scale(${fitScale})`;
          inner.style.transformOrigin = 'center center';
          return;
        }
      }

      if (canvas && pad > 0) canvas.style.padding = `${pad}px`;
      outer.style.padding = '0px';
      inner.style.width = '100%';
      inner.style.height = '';
      inner.style.flex = '';
      inner.style.minHeight = '100%';
      if (Math.min(scaleH, scaleW) < 0.999) {
        const fitScale = Math.max(0.45, Math.min(scaleH, scaleW));
        inner.style.transform = `scale(${fitScale})`;
        inner.style.transformOrigin = 'center center';
      } else {
        inner.style.transform = 'none';
      }
    };

    fitRef.current = fit;
    fit();
  });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => fitRef.current());
    observer.observe(outer);
    return () => observer.disconnect();
  }, [watch]);

  return (
    <div
      ref={outerRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: holdPad ? pad : 0,
        background: framed?.background,
      }}
    >
      {/* WHY inline: Result.css is not part of the export document. Point lists
          clip with overflow:hidden, which would hide copy before the scale. */}
      <style>
        {'.rp-fit-inner *{min-width:0 !important;min-height:min-content !important;'
          + 'overflow:visible !important;overflow-wrap:break-word;}'
          + '.rp-fit-inner>*{justify-content:center !important;}'
          + '.rp-fit-inner>*>*{margin-top:0 !important;flex-grow:0 !important;'
          + 'flex-shrink:0 !important;}'}
      </style>
      <div
        ref={innerRef}
        className="rp-fit-inner"
        style={{
          width: holdPad ? `calc(100% / ${scale})` : '100%',
          height: holdPad ? `calc(100% / ${scale})` : undefined,
          minHeight: holdPad ? 0 : '100%',
          flex: holdPad ? '0 0 auto' : undefined,
          display: 'flex',
          flexDirection: 'column',
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'center center',
        }}
      >
        {framed ? framed.node : children}
      </div>
    </div>
  );
}
