import { useCallback, useRef, useState } from 'react';

export type ContentMutationKind = 'idle' | 'save' | 'restore';

export interface ContentMutationLock {
  /** Current lock for UI disable (save ↔ restore cross-gate). */
  lock: ContentMutationKind;
  /** Sync check — React state alone cannot stop a double-click race. */
  isBusy: () => boolean;
  /** Bump generation + take lock. Returns gen to pass to `release`. */
  acquire: (kind: 'save' | 'restore') => number | null;
  /** Clear lock only if this caller still owns the latest generation. */
  release: (gen: number) => void;
  /** True when a newer mutation superseded this caller’s generation. */
  isStale: (gen: number) => boolean;
}

// WHY: save PATCH and version restore both write the final output — overlapping
// them races setJobData (lost update). Shared lock + generation gate both UIs.
export function useContentMutationLock(): ContentMutationLock {
  const lockRef = useRef<ContentMutationKind>('idle');
  const genRef = useRef(0);
  const [lock, setLock] = useState<ContentMutationKind>('idle');

  const isBusy = useCallback((): boolean => lockRef.current !== 'idle', []);

  const isStale = useCallback((gen: number): boolean => gen !== genRef.current, []);

  const acquire = useCallback((kind: 'save' | 'restore'): number | null => {
    if (lockRef.current !== 'idle') return null;
    lockRef.current = kind;
    const gen = ++genRef.current;
    setLock(kind);
    return gen;
  }, []);

  const release = useCallback((gen: number): void => {
    if (gen !== genRef.current) return;
    lockRef.current = 'idle';
    setLock('idle');
  }, []);

  return { lock, isBusy, acquire, release, isStale };
}
