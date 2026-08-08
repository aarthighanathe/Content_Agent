import { useEffect, useRef } from 'react';

// WHY this hook exists: the "track every live setTimeout in a ref Set and
// clear them all on unmount" pattern was independently reimplemented in
// useSocial.ts, ExportModal.tsx, and FeedMonitorPanel.tsx (each with its own
// near-identical ref + cleanup effect) rather than sharing one. A timer set
// from a click handler (not an effect) has no natural cleanup point of its
// own, so without this, a component/panel that unmounts before the timer
// fires leaves a stray setState call targeting an unmounted component.
export function useTrackedTimeout(): {
  set: (callback: () => void, delayMs: number) => void;
} {
  const pending = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timers = pending.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  function set(callback: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      pending.current.delete(timer);
      callback();
    }, delayMs);
    pending.current.add(timer);
  }

  return { set };
}

// WHY a separate hook, not folded into useTrackedTimeout: HashtagPanel.tsx's
// cancelledRef guards a plain in-flight promise (.then/.catch/.finally), not
// a timer — a component can need "am I still mounted" with no timers
// involved at all. Kept as the single shared implementation of that check
// (previously duplicated inline in HashtagPanel.tsx and useSocial.ts).
export function useIsMountedRef(): React.RefObject<boolean> {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  return isMountedRef;
}
