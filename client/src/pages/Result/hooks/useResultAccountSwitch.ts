import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { ActionTab } from '../components/ActionDrawer';

interface ResultAccountSwitchArgs {
  jobId: string | undefined;
  setActionDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setActionDrawerTab: Dispatch<SetStateAction<ActionTab | null>>;
  setFeedbackPrefill: Dispatch<SetStateAction<string>>;
  setExportModalOpen: Dispatch<SetStateAction<boolean>>;
  setSaveError: Dispatch<SetStateAction<string>>;
  setCurrentSlide: Dispatch<SetStateAction<number>>;
}

// WHY: account switch OR job navigation — close drawers/modals so Post/Hashtags
// cannot act on the previous job body (or previous user's job) after the route
// or Clerk session changes.
export function useResultAccountSwitch({
  jobId,
  setActionDrawerOpen,
  setActionDrawerTab,
  setFeedbackPrefill,
  setExportModalOpen,
  setSaveError,
  setCurrentSlide,
}: ResultAccountSwitchArgs): void {
  const { userId } = useAuth();

  useEffect(() => {
    setActionDrawerOpen(false);
    setActionDrawerTab(null);
    setFeedbackPrefill('');
    setExportModalOpen(false);
    setSaveError('');
    setCurrentSlide(0);
  }, [
    userId,
    jobId,
    setActionDrawerOpen,
    setActionDrawerTab,
    setFeedbackPrefill,
    setExportModalOpen,
    setSaveError,
    setCurrentSlide,
  ]);
}
