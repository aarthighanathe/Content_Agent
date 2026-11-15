import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ContentDna } from '../../types/api';

interface BrandAccountResetArgs {
  clerkUserId: string;
  setIsHydrated: Dispatch<SetStateAction<boolean>>;
  setBrandName: Dispatch<SetStateAction<string>>;
  setIndustry: Dispatch<SetStateAction<string>>;
  setSelectedVoices: Dispatch<SetStateAction<string[]>>;
  setPhrasesUse: Dispatch<SetStateAction<string>>;
  setPhrasesAvoid: Dispatch<SetStateAction<string>>;
  setContentDna: Dispatch<SetStateAction<ContentDna | null>>;
  setDnaSamples: Dispatch<SetStateAction<string>>;
  setDnaError: Dispatch<SetStateAction<string>>;
  setSaveError: Dispatch<SetStateAction<string>>;
  setExportError: Dispatch<SetStateAction<string>>;
  setResetConfirming: Dispatch<SetStateAction<boolean>>;
  setShowDeleteModal: Dispatch<SetStateAction<boolean>>;
  setDeleteConfirmText: Dispatch<SetStateAction<string>>;
  setDeleteError: Dispatch<SetStateAction<string>>;
  setToast: Dispatch<SetStateAction<{ message: string; isError?: boolean } | null>>;
  toastTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  // WHY: DNA/export/save isPending must clear on switch or buttons stay stuck.
  resetMutations: () => void;
}

// WHY: extracted from Brand.tsx under the 400-line cap — account switch must
// blank the form + unlock hydrate for the new profile (isHydrated stayed true).
export function useBrandAccountReset({
  clerkUserId,
  setIsHydrated,
  setBrandName,
  setIndustry,
  setSelectedVoices,
  setPhrasesUse,
  setPhrasesAvoid,
  setContentDna,
  setDnaSamples,
  setDnaError,
  setSaveError,
  setExportError,
  setResetConfirming,
  setShowDeleteModal,
  setDeleteConfirmText,
  setDeleteError,
  setToast,
  toastTimerRef,
  resetMutations,
}: BrandAccountResetArgs): void {
  const formUserRef = useRef<string | null>(clerkUserId || null);
  // WHY: ref — callers pass an inline reset; keeping it out of effect deps
  // avoids re-running the switch wipe every render.
  const resetMutationsRef = useRef(resetMutations);
  resetMutationsRef.current = resetMutations;

  useEffect(() => {
    const prev = formUserRef.current;
    const next = clerkUserId || null;
    if (prev === next) return;
    formUserRef.current = next;
    // WHY: skip first bind (null/'' → first userId) so cache-seeded fields stay.
    if (!prev || !next) return;
    setIsHydrated(false);
    setBrandName('');
    setIndustry('');
    setSelectedVoices(['Professional']);
    setPhrasesUse('');
    setPhrasesAvoid('');
    setContentDna(null);
    setDnaSamples('');
    setDnaError('');
    setSaveError('');
    setExportError('');
    setResetConfirming(false);
    setShowDeleteModal(false);
    setDeleteConfirmText('');
    setDeleteError('');
    setToast(null);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    resetMutationsRef.current();
  }, [
    clerkUserId,
    setIsHydrated,
    setBrandName,
    setIndustry,
    setSelectedVoices,
    setPhrasesUse,
    setPhrasesAvoid,
    setContentDna,
    setDnaSamples,
    setDnaError,
    setSaveError,
    setExportError,
    setResetConfirming,
    setShowDeleteModal,
    setDeleteConfirmText,
    setDeleteError,
    setToast,
    toastTimerRef,
  ]);
}
