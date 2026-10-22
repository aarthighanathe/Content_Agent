// WHY this panel exists: implements FUTURE_FEATURES.md's Library "No per-job
// version history" item — "Regenerate" used to overwrite the previous 'final'
// output in place with no way to look back. See server/src/db/schema.ts's
// jobOutputVersions WHY comment for why the snapshot is taken only at
// regenerate/restore time, not on every save.
import { useState } from 'react';
import { RotateCcw, Loader2, History } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobVersions, restoreJobVersion } from '../../../../api';
import { timeAgo } from '../../../../lib/utils';
import { Button } from '../../../../components/Button';

interface Props {
  jobId: string | undefined;
  onClose: () => void;
  onRestored: () => void;
}

export function HistoryPanel({ jobId, onClose, onRestored }: Props) {
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const versionsQuery = useQuery({
    queryKey: ['jobVersions', jobId],
    queryFn: () => getJobVersions(jobId as string),
    enabled: !!jobId,
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreJobVersion(jobId as string, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobVersions', jobId] });
      setConfirmingId(null);
      onRestored();
      onClose();
    },
  });

  const versions = versionsQuery.data?.versions ?? [];

  return (
    <div className="rp-history-panel">
      {versionsQuery.isLoading && (
        <div className="rp-panel-status">
          <span className="rp-panel-spinner" aria-hidden />
          <span>Loading history…</span>
        </div>
      )}

      {versionsQuery.isError && (
        <div className="rp-panel-banner rp-panel-banner-error">
          Failed to load version history.
        </div>
      )}

      {!versionsQuery.isLoading && !versionsQuery.isError && versions.length === 0 && (
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
                    disabled={restoreMutation.isPending}
                    icon={
                      restoreMutation.isPending
                        ? <Loader2 size={11} className="btn-spinner" />
                        : undefined
                    }
                    onClick={() => restoreMutation.mutate(v.id)}
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
