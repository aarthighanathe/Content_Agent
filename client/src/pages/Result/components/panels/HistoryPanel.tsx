// WHY: this panel exists: implements FUTURE_FEATURES.md's Library "No per-job
// version history" item — "Regenerate" used to overwrite the previous 'final'
// output in place with no way to look back. See server/src/db/schema.ts's
// jobOutputVersions WHY comment for why the snapshot is taken only at
// regenerate/restore time, not on every save.
import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { RotateCcw, Loader2, History } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobVersions, restoreJobVersion } from '../../../../api';
import { timeAgo } from '../../../../lib/utils';
import { Button } from '../../../../components/Button';
import { SkeletonBlock } from '../../../../components/SkeletonCard';

interface Props {
  jobId: string | undefined;
  /** False until Result revalidated ownership for the current user. */
  jobReady?: boolean;
  onClose: () => void;
  onRestoreBegin?: () => boolean;
  onRestored: () => void;
  onRestoreEnd?: () => void;
  restoreDisabled?: boolean;
}

export function HistoryPanel({
  jobId,
  jobReady = false,
  onClose,
  onRestoreBegin,
  onRestored,
  onRestoreEnd,
  restoreDisabled = false,
}: Props) {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const versionsQuery = useQuery({
    queryKey: ['jobVersions', userId ?? 'anon', jobId],
    queryFn: () => getJobVersions(jobId as string),
    enabled: authLoaded && isSignedIn && Boolean(jobId) && jobReady,
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreJobVersion(jobId as string, versionId),
    onSuccess: () => {
      // WHY: must match the queryKey above (includes userId) — bare ['jobVersions', jobId]
      // never invalidated the active cache entry after restore.
      queryClient.invalidateQueries({
        queryKey: ['jobVersions', userId ?? 'anon', jobId],
      });
      // WHY: restore changes the job's final content/score shown in list cards.
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'jobs'] }),
      ]).catch(() => {});
      setConfirmingId(null);
      onRestored();
      onClose();
    },
    onError: () => {
      onRestoreEnd?.();
    },
  });

  function beginRestore(versionId: string): void {
    if (restoreDisabled || restoreMutation.isPending) return;
    if (onRestoreBegin && !onRestoreBegin()) return;
    restoreMutation.mutate(versionId);
  }

  const versions = versionsQuery.data?.versions ?? [];

  return (
    <div className="rp-history-panel">
      {/* WHY: isPending, not isLoading: while Clerk hydrates / jobReady is false the
          query is disabled and isLoading is false — that flashed empty history. */}
      {versionsQuery.isPending && (
        <ul className="rp-history-list" aria-busy="true" aria-label="Loading history">
          {['a', 'b', 'c'].map((id) => (
            <li key={id} className="rp-history-row">
              <div className="rp-history-meta" style={{ flex: 1 }}>
                <SkeletonBlock width="46%" height={13} radius={4} />
                <SkeletonBlock width="32%" height={11} radius={4} delay={0.1} style={{ marginTop: 6 }} />
              </div>
              <SkeletonBlock width={92} height={28} radius={8} />
            </li>
          ))}
        </ul>
      )}

      {versionsQuery.isError && (
        <div className="rp-panel-banner rp-panel-banner-error">
          Failed to load version history.
        </div>
      )}

      {!versionsQuery.isPending && !versionsQuery.isError && versions.length === 0 && (
        <div className="rp-panel-empty">
          <span className="rp-panel-empty-icon" aria-hidden>
            <History size={22} />
          </span>
          <p className="rp-panel-empty-title">No past versions yet</p>
          <p className="rp-panel-empty-blurb">
            A snapshot is saved automatically each time you regenerate this content.
          </p>
        </div>
      )}

      {versions.length > 0 && (
        <ul className="rp-history-list">
          {versions.map((v) => (
            <li key={v.id} className="rp-history-row">
              <div className="rp-history-meta">
                <p className="rp-history-label">{v.label}</p>
                <p className="rp-history-sub">
                  {timeAgo(v.createdAt)}
                  {v.qualityScore !== null ? ` · score ${v.qualityScore}` : ''}
                </p>
              </div>
              {confirmingId === v.id ? (
                <div className="rp-history-confirm">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={restoreMutation.isPending || restoreDisabled}
                    icon={
                      restoreMutation.isPending
                        ? <Loader2 size={11} className="btn-spinner" />
                        : undefined
                    }
                    onClick={() => beginRestore(v.id)}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={restoreMutation.isPending}
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw size={11} />}
                  disabled={restoreDisabled}
                  onClick={() => setConfirmingId(v.id)}
                >
                  Restore
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {restoreMutation.isError && (
        <p className="rp-panel-banner rp-panel-banner-error" role="alert">
          Failed to restore — please try again.
        </p>
      )}
    </div>
  );
}
