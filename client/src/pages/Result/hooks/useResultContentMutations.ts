import { useRef, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateJobContent } from '../../../api';
import type { PlatformContent, ContentJob } from '../../../types/job';
import type { SlideData } from '../components/content/carousel/IGSlide';
import { useContentMutationLock } from './useContentMutationLock';

type SetJobData = Dispatch<SetStateAction<ContentJob | null>>;

export interface ResultContentMutations {
  handleContentSave: (newContent: SlideData[] | PlatformContent) => Promise<void>;
  handleRestoreBegin: () => boolean;
  handleRestored: () => Promise<void>;
  handleRestoreEnd: () => void;
  restoreDisabled: boolean;
}

// WHY: save ↔ restore cross-lock lives here so Result.tsx stays under the
// 400-line cap while still gating lost-update races on final content.
export function useResultContentMutations(
  jobId: string | undefined,
  setJobData: SetJobData,
  loadJob: () => Promise<void>,
  setSaveError: (message: string) => void,
): ResultContentMutations {
  const queryClient = useQueryClient();
  const contentMutation = useContentMutationLock();
  const restoreGenRef = useRef<number | null>(null);

  async function handleContentSave(newContent: SlideData[] | PlatformContent): Promise<void> {
    if (!jobId) return;
    const gen = contentMutation.acquire('save');
    if (gen == null) {
      setSaveError('Another content update is in progress — try again in a moment.');
      throw new Error('content_mutation_busy');
    }
    setSaveError('');
    try {
      // WHY: unknown->PlatformContent[] cast: updateJobContent's declared param type
      // predates carousel slide editing — SlideData[] is caller-guarded here.
      await updateJobContent(jobId, newContent as unknown as PlatformContent | PlatformContent[]);
      if (contentMutation.isStale(gen)) return;
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'jobs'] }),
      ]).catch(() => {});
      setJobData((p) => {
        if (!p) return p;
        const i = p.outputs.findIndex((o) => o.outputType === 'final');
        if (i > -1) {
          const np = { ...p, outputs: [...p.outputs] };
          np.outputs[i] = { ...np.outputs[i], content: newContent };
          return np;
        }
        return p;
      });
    } catch (err) {
      if (!contentMutation.isStale(gen)) {
        setSaveError('Failed to save your edit — please try again.');
      }
      throw err;
    } finally {
      contentMutation.release(gen);
    }
  }

  function handleRestoreBegin(): boolean {
    const gen = contentMutation.acquire('restore');
    if (gen == null) return false;
    restoreGenRef.current = gen;
    return true;
  }

  async function handleRestored(): Promise<void> {
    const gen = restoreGenRef.current;
    try {
      await loadJob();
    } finally {
      if (gen != null) contentMutation.release(gen);
      restoreGenRef.current = null;
    }
  }

  function handleRestoreEnd(): void {
    const gen = restoreGenRef.current;
    if (gen == null) return;
    contentMutation.release(gen);
    restoreGenRef.current = null;
  }

  return {
    handleContentSave,
    handleRestoreBegin,
    handleRestored,
    handleRestoreEnd,
    restoreDisabled: contentMutation.lock === 'save',
  };
}
