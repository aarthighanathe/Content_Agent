import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '../../../../components/Button';
import type { PlatformContent } from '../../../../types/job';
import { ContentEditShell } from './ContentEditShell';

interface Props {
  content: PlatformContent;
  onSave:  (newContent: PlatformContent) => Promise<void>;
}

export function InstagramContent({ content, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm]   = useState<PlatformContent>({});

  function startEditing() {
    setEditForm(JSON.parse(JSON.stringify(content)));
    setIsEditing(true);
  }

  // WHY no setIsEditing(false) here: ContentEditShell now owns closing the editor —
  // it calls onClose() itself only after this promise resolves, and shows an inline
  // error (leaving the form open) if it rejects, instead of always closing regardless
  // of outcome (FUNCTIONAL_AUDIT_2026-07.md finding #15).
  async function saveEdit() {
    await onSave(editForm);
  }

  return (
    <div style={{ background: '#08081A', borderRadius: 14, border: '1px solid rgba(236,72,153,0.18)', overflow: 'hidden' }}>
      {isEditing ? (
        <ContentEditShell label="Edit Caption" onClose={() => setIsEditing(false)} onSave={saveEdit}>
          <textarea className="input" value={editForm.caption || ''} onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })} placeholder="Caption" style={{ minHeight: 140 }} />
          <input className="input" value={(editForm.hashtags || []).join(' ')} onChange={(e) => setEditForm({ ...editForm, hashtags: e.target.value.split(/\s+/).filter(Boolean) })} placeholder="#hashtags" />
        </ContentEditShell>
      ) : (
        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, whiteSpace: 'pre-line', fontSize: 14 }}>{content.caption}</p>
          {content.hashtags && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {content.hashtags.map((tag: string) => (
                <span key={tag} style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(236,72,153,0.08)', color: '#F472B6', fontSize: 11, fontFamily: "var(--font-mono)", border: '1px solid rgba(236,72,153,0.18)' }}>{tag}</span>
              ))}
            </div>
          )}
          <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Button variant="secondary" size="sm" icon={<Pencil size={11} />} onClick={startEditing}>Edit caption</Button>
          </div>
        </div>
      )}
    </div>
  );
}
