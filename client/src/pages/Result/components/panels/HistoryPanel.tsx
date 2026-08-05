// WHY this panel exists: implements FUTURE_FEATURES.md's Library "No per-job
// version history" item — "Regenerate" used to overwrite the previous 'final'
// output in place with no way to look back. See server/src/db/schema.ts's
// jobOutputVersions WHY comment for why the snapshot is taken only at
// regenerate/restore time, not on every save.
import { useState } from 'react';
import { History, RotateCcw, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJobVersions, restoreJobVersion } from '../../../../api';
import { timeAgo } from '../../../../lib/utils';

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
    <div style={{ width: '100%', maxWidth: 500, background: 'color-mix(in srgb, var(--accent-2) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 18%, transparent)', borderRadius: 10, padding: '14px 16px', animation: 'rp-fadeUp .2s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent-2)' }}>
          <History size={11} /> Version History
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <X size={14} />
        </button>
      </div>

      {versionsQuery.isLoading && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Loading history…</p>
      )}

      {versionsQuery.isError && (
        <p style={{ fontSize: 12, color: 'var(--color-error)', margin: 0 }}>Failed to load version history.</p>
      )}

      {!versionsQuery.isLoading && !versionsQuery.isError && versions.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          No past versions yet — a snapshot is saved automatically each time you regenerate this content.
        </p>
      )}

      {versions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {versions.map((v) => (
            <div
              key={v.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '8px 10px', borderRadius: 8, background: 'color-mix(in srgb, var(--bg-raised) 60%, transparent)',
                border: '1px solid var(--rule)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.label}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'var(--font-mono)' }}>
                  {timeAgo(v.createdAt)}{v.qualityScore !== null ? ` · score ${v.qualityScore}` : ''}
                </p>
              </div>
              {confirmingId === v.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => restoreMutation.mutate(v.id)}
                    disabled={restoreMutation.isPending}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', fontSize: 11, cursor: 'pointer' }}
                  >
                    {restoreMutation.isPending ? <Loader2 size={11} style={{ animation: 'rp-spin .7s linear infinite' }} /> : null}
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    disabled={restoreMutation.isPending}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(v.id)}
                  title="Restore this version"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--rule)', background: 'none', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                >
                  <RotateCcw size={11} /> Restore
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {restoreMutation.isError && (
        <p style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 8, marginBottom: 0 }}>
          Failed to restore — please try again.
        </p>
      )}
    </div>
  );
}
