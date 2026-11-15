import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import {
  deleteJob, tagJob,
  createCollection, deleteCollection,
  addJobToCollection, removeJobFromCollection,
} from '../../api';

// WHY: extracted from useLibraryData: that hook exceeded the 400-line cap.

interface Args {
  flashToast: (message: string, isError?: boolean, durationMs?: number) => void;
  activeCollectionId: string | null;
  setActiveCollectionId: Dispatch<SetStateAction<string | null>>;
  setDeleteCollectionConfirm: Dispatch<SetStateAction<{ id: string; name: string } | null>>;
  setDeleteJobConfirm: Dispatch<SetStateAction<string | null>>;
  setDeleteJobError: Dispatch<SetStateAction<string>>;
  setOpenJobMenu: Dispatch<SetStateAction<string | null>>;
  setFailedJobIds: Dispatch<SetStateAction<string[]>>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  setManageMode: Dispatch<SetStateAction<boolean>>;
  setBulkDeleteConfirm: Dispatch<SetStateAction<boolean>>;
  setBulkDeleteError: Dispatch<SetStateAction<string>>;
  setEditingTagJobId: Dispatch<SetStateAction<string | null>>;
}

export function useLibraryMutations({
  flashToast,
  activeCollectionId,
  setActiveCollectionId,
  setDeleteCollectionConfirm,
  setDeleteJobConfirm,
  setDeleteJobError,
  setOpenJobMenu,
  setFailedJobIds,
  setSelectedIds,
  setManageMode,
  setBulkDeleteConfirm,
  setBulkDeleteError,
  setEditingTagJobId,
}: Args) {
  const queryClient = useQueryClient();

  const createCollectionMutation = useMutation({
    mutationFn: (name: string) => createCollection(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'collections'] });
      flashToast('Collection created');
    },
    onError: () => flashToast('Failed to create collection — please try again.', true),
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: (collectionId: string) => deleteCollection(collectionId),
    onSuccess: (_data, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'collections'] });
      if (activeCollectionId === collectionId) setActiveCollectionId(null);
      setDeleteCollectionConfirm(null);
      flashToast('Collection deleted');
    },
    // WHY: closes the modal on failure too (unlike deleteJobMutation, which
    // keeps its modal open with a persistent error prop): this mutation
    // already had an established toast-based error convention (matching
    // createCollectionMutation right above) before the confirm step was
    // added — the toast is sufficient feedback, and the delete (X) button on
    // the pill remains available to retry without reopening a modal.
    onError: () => {
      setDeleteCollectionConfirm(null);
      flashToast('Failed to delete collection — please try again.', true);
    },
  });

  const addToCollectionMutation = useMutation({
    mutationFn: ({ collectionId, jobId }: { collectionId: string; jobId: string }) =>
      addJobToCollection(collectionId, jobId),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'collections'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'collectionJobs', collectionId] });
      flashToast('Added to collection');
    },
    onError: () => flashToast('Failed to add to collection — please try again.', true),
  });

  const removeFromCollectionMutation = useMutation({
    mutationFn: ({ collectionId, jobId }: { collectionId: string; jobId: string }) =>
      removeJobFromCollection(collectionId, jobId),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['library', 'collections'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'collectionJobs', collectionId] });
      flashToast('Removed from collection');
    },
    onError: () => flashToast('Failed to remove from collection — please try again.', true),
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => deleteJob(jobId),
    onSuccess: () => {
      // WHY: also invalidate collectionJobs — folder view caches a separate query;
      // without it a deleted job stays visible until that cache goes stale.
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['library', 'collectionJobs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar', 'jobs'] }),
      ]).catch(() => {});
      setDeleteJobConfirm(null);
      setDeleteJobError('');
      setOpenJobMenu(null);
    },
    onError: () => {
      setDeleteJobError('Failed to delete — please try again.');
    },
  });

  const bulkDeleteJobsMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.allSettled(ids.map(id => deleteJob(id))),
    onSuccess: (results, ids) => {
      // WHY: variables (ids), not selectedIds: selectedIds is closure-captured
      // component state that may have changed by the time this callback fires,
      // which would misattribute failures to the wrong job IDs. `ids` is the
      // exact array passed to mutate(), guaranteed to match `results` by index.
      const failed = results
        .map((r, i) => r.status === 'rejected' ? ids[i] : null)
        .filter((id): id is string => id !== null);
      setFailedJobIds(failed);
      // WHY: jobs + collectionJobs + dashboard/calendar — bulk delete left deleted
      // rows visible in folder view and elsewhere until staleTime expired.
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['library', 'collectionJobs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar', 'jobs'] }),
      ]).catch(() => {});
      setSelectedIds(new Set());
      setManageMode(false);
      setBulkDeleteConfirm(false);
      setBulkDeleteError('');
      if (failed.length > 0) {
        flashToast(`${failed.length} job${failed.length !== 1 ? 's' : ''} failed to delete`);
      } else {
        flashToast('Selected jobs deleted');
      }
    },
    onError: () => {
      setBulkDeleteError('Failed to delete — please try again.');
    },
  });

  const tagJobMutation = useMutation({
    mutationFn: ({ jobId, tag }: { jobId: string; tag: string }) => tagJob(jobId, tag),
    onSuccess: () => {
      // WHY: invalidate jobs + collectionJobs: the tag column is in the DB; folder
      // view uses a separate cache that would otherwise keep the old chip.
      queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'collectionJobs'] });
      setEditingTagJobId(null);
      setOpenJobMenu(null);
      flashToast('Tag saved');
    },
    onError: () => {
      flashToast('Failed to save tag — must be 1–30 characters.', true);
    },
  });

  return {
    createCollectionMutation,
    deleteCollectionMutation,
    addToCollectionMutation,
    removeFromCollectionMutation,
    deleteJobMutation,
    bulkDeleteJobsMutation,
    tagJobMutation,
  };
}
