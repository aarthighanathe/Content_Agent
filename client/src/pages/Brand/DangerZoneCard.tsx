import { AlertTriangle, Download, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';

interface DangerZoneCardProps {
  exporting: boolean;
  exportError: string;
  onExport: () => void;
  onOpenDeleteModal: () => void;
}

export function DangerZoneCard({ exporting, exportError, onExport, onOpenDeleteModal }: DangerZoneCardProps) {
  return (
    <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '3px solid rgba(239,68,68,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', flexShrink: 0 }}><AlertTriangle size={16} /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Danger Zone</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Export or permanently delete your data</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 11, padding: '13px 16px' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Export your data</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>Download everything as JSON</div>
          </div>
          <Button
            variant="secondary"
            icon={<Download size={13} />}
            onClick={onExport}
            disabled={exporting}
            style={{ flexShrink: 0 }}
          >
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        </div>

        <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 11, padding: '13px 16px' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Delete account</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>Permanently erase all your content and data</div>
          </div>
          <Button
            variant="danger"
            icon={<Trash2 size={13} />}
            onClick={onOpenDeleteModal}
            style={{ flexShrink: 0 }}
          >
            Delete
          </Button>
        </div>
      </div>
      {exportError && <div style={{ fontSize: 11.5, color: 'var(--color-error)', marginTop: 10 }}>{exportError}</div>}
    </div>
  );
}
