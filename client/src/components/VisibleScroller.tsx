import { forwardRef, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface VisibleScrollerProps {
  children: ReactNode;
  className?: string;
  stackClassName?: string;
  frameClassName?: string;
  style?: CSSProperties;
  frameStyle?: CSSProperties;
  /** When the track is showing, keep copy clear of it. */
  gutter?: boolean;
}

interface ThumbMetrics {
  overflow: boolean;
  height: number;
  top: number;
}

const HIDDEN_THUMB: ThumbMetrics = { overflow: false, height: 0, top: 0 };

// WHY a painted track, not the native bar: macOS overlay scrollbars stay
// hidden until the user is already scrolling, so a clipped column looks finished.
export const VisibleScroller = forwardRef<HTMLDivElement, VisibleScrollerProps>(
  function VisibleScroller(
    { children, className, stackClassName, frameClassName, style, frameStyle, gutter = true },
    ref,
  ): React.ReactElement {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const stackRef = useRef<HTMLDivElement>(null);
    const [thumb, setThumb] = useState<ThumbMetrics>(HIDDEN_THUMB);

    useEffect(() => {
      const scroller = scrollerRef.current;
      const stack = stackRef.current;
      if (!scroller || !stack) return;

      const update = (): void => {
        const overflowPx = scroller.scrollHeight - scroller.clientHeight;
        const overflow = overflowPx > 8;
        // WHY 12: the track is inset 6px from the top and bottom of the frame.
        const trackHeight = Math.max(0, scroller.clientHeight - 12);
        const ratio = scroller.scrollHeight > 0 ? scroller.clientHeight / scroller.scrollHeight : 1;
        const height = Math.max(40, Math.round(trackHeight * ratio));
        const maxTop = Math.max(0, trackHeight - height);
        const top = overflowPx > 0 ? (scroller.scrollTop / overflowPx) * maxTop : 0;
        setThumb({ overflow, height, top });
      };

      update();
      const observer = new ResizeObserver(() => update());
      observer.observe(scroller);
      observer.observe(stack);
      scroller.addEventListener('scroll', update, { passive: true });
      return () => {
        observer.disconnect();
        scroller.removeEventListener('scroll', update);
      };
    }, []);

    return (
      <div
        className={['visible-scroll-frame', frameClassName].filter(Boolean).join(' ')}
        style={frameStyle}
      >
        <div
          ref={(node) => {
            scrollerRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          className={['visible-scroll', className].filter(Boolean).join(' ')}
          style={style}
        >
          {/* WHY pad the stack, not the scroller: callers often set padding on
              the scroller. Overwriting paddingRight to 10 crushed that inset
              (AI Quality Analysis text sat on the card border). */}
          <div
            ref={stackRef}
            className={['visible-scroll-stack', stackClassName].filter(Boolean).join(' ')}
            style={gutter && thumb.overflow ? { paddingRight: 10 } : undefined}
          >
            {children}
          </div>
        </div>
        {thumb.overflow && (
          <div className="visible-scroll-track" aria-hidden="true">
            <div
              className="visible-scroll-thumb"
              style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }}
            />
          </div>
        )}
      </div>
    );
  },
);
