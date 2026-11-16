import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type Dispatch,
  type SetStateAction,
} from 'react';

export interface BrandToast {
  message: string;
  isError?: boolean;
}

interface UseBrandToastResult {
  toast: BrandToast | null;
  flashToast: (message: string, isError?: boolean, durationMs?: number) => void;
  setToast: Dispatch<SetStateAction<BrandToast | null>>;
  toastTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

// WHY: extracted from Brand.tsx under the 400-line cap — one toast object for
// save + social (previously two stacked mechanisms).
export function useBrandToast(): UseBrandToastResult {
  const [toast, setToast] = useState<BrandToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // WHY: 3s default matches Library — callers still pass 4s for errors when needed.
  const flashToast = useCallback((message: string, isError = false, durationMs = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, isError });
    toastTimerRef.current = setTimeout(() => setToast(null), durationMs);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  return { toast, flashToast, setToast, toastTimerRef };
}
