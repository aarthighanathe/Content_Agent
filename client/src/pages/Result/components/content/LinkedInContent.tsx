import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '../../../../components/Button';
import type { PlatformContent } from '../../../../types/job';
import { ContentEditShell } from './ContentEditShell';

interface Props {
  content: PlatformContent;
  onSave:  (newContent: PlatformContent) => Promise<void>;
}

export function LinkedInContent({ content, onSave }: Props) {
  const [isEditing, setIsEditing]   = useState(false);
  const [editForm, setEditForm]     = useState<PlatformContent>({});
  const [useAltHook, setUseAltHook] = useState(false);

  function startEditing() {
    setEditForm(JSON.parse(JSON.stringify(content)));
    setIsEditing(true);
  }

  // WHY no setIsEditing(false) here: ContentEditShell now owns closing the editor —
  // see InstagramContent.tsx's identical comment for the full rationale
  // (FUNCTIONAL_AUDIT_2026-07.md finding #15).
  async function saveEdit() {
    await onSave(editForm);
  }

  return (
    <div style={{ background: '#08081A', borderRadius: 14, border: '1px solid rgba(245,158,11,0.18)', overflow: 'hidden' }}>
      {/* A/B hook toggle */}
      {content.hookAlt && !isEditing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, textTransform: 'uppercase' }}>Hook A/B</span>
          {(['A', 'B'] as const).map((v) => (
            <button key={v} onClick={() => setUseAltHook(v === 'B')} style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${(v === 'B') === useAltHook ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`, background: (v === 'B') === useAltHook ? 'rgba(245,158,11,0.1)' : 'none', color: (v === 'B') === useAltHook ? '#F59E0B' : 'var(--color-text-muted)', fontSize: 11, fontFamily: "var(--font-mono)", cursor: 'pointer', transition: 'all .15s' }}>{v}</button>
          ))}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>Pick your best hook</span>
        </div>
      )}

      {isEditing ? (
        <ContentEditShell label="Edit LinkedIn Post" onClose={() => setIsEditing(false)} onSave={saveEdit}>
          <textarea className="input" value={editForm.hook  || ''} onChange={(e) => setEditForm({ ...editForm, hook:     e.target.value })} placeholder="Hook"            style={{ minHeight: 60,  fontWeight: 600 }} />
          <textarea className="input" value={editForm.body  || ''} onChange={(e) => setEditForm({ ...editForm, body:     e.target.value })} placeholder="Body"            style={{ minHeight: 150 }} />
          <input    className="input" value={editForm.cta   || ''} onChange={(e) => setEditForm({ ...editForm, cta:      e.target.value })} placeholder="Call to action" />
          <input    className="input" value={(editForm.hashtags || []).join(' ')} onChange={(e) => setEditForm({ ...editForm, hashtags: e.target.value.split(/\s+/).filter(Boolean) })} placeholder="#hashtags" />
        </ContentEditShell>
      ) : (
        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.6 }}>
            {useAltHook && content.hookAlt ? content.hookAlt : content.hook}
          </p>
          <div style={{ color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-line', lineHeight: 1.7, fontSize: 14 }}>{content.body}</div>
          <p style={{ color: '#F59E0B', fontWeight: 700 }}>{content.cta}</p>
          {content.hashtags && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {content.hashtags.map((tag: string) => (
                <span key={tag} style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.08)', color: '#F59E0B', fontSize: 11, fontFamily: "var(--font-mono)", border: '1px solid rgba(245,158,11,0.18)' }}>{tag}</span>
              ))}
            </div>
          )}
          <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Button variant="secondary" size="sm" icon={<Pencil size={11} />} onClick={startEditing}>Edit post</Button>
          </div>
        </div>
      )}
    </div>
  );
}
