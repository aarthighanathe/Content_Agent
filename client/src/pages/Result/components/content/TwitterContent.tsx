import { useState } from 'react';
import { Pencil, Copy } from 'lucide-react';
import { Button } from '../../../../components/Button';
import type { PlatformContent } from '../../../../types/job';
import { ContentEditShell } from './ContentEditShell';

interface Props {
  content: PlatformContent;
  onSave:  (newContent: PlatformContent) => Promise<void>;
}

export function TwitterContent({ content, onSave }: Props) {
  const [isEditing, setIsEditing]   = useState(false);
  const [editForm, setEditForm]     = useState<PlatformContent>({});
  const [useAltHook, setUseAltHook] = useState(false);
  const [copied, setCopied]         = useState(false);

  function startEditing() {
    const draft: PlatformContent = JSON.parse(JSON.stringify(content));
    // WHY: tweets are keyed by a synthetic _key assigned once here (not array index)
    // because tw.text mutates on every keystroke while editing — keying by text itself
    // would remount the textarea and drop focus/cursor position mid-edit. The list
    // isn't reordered by this UI, so a stable id assigned at edit-start is sufficient
    // and avoids the index-as-key anti-pattern for this user-editable list.
    if (Array.isArray(draft.tweets)) {
      draft.tweets = draft.tweets.map((tw, i) => ({ ...tw, _key: `tweet-${i}-${Date.now()}` }));
    }
    setEditForm(draft);
    setIsEditing(true);
  }

  // WHY no setIsEditing(false) here: ContentEditShell now owns closing the editor —
  // see InstagramContent.tsx's identical comment for the full rationale
  // (FUNCTIONAL_AUDIT_2026-07.md finding #15).
  async function saveEdit() {
    await onSave(editForm);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* A/B hook toggle */}
      {content.tweetOneAlt && !isEditing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#08081A', border: '1px solid rgba(34,211,238,0.12)', borderRadius: 10, padding: '9px 14px' }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, textTransform: 'uppercase' }}>Tweet 1 A/B</span>
          {(['A', 'B'] as const).map((v) => (
            <button key={v} onClick={() => setUseAltHook(v === 'B')} style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${(v === 'B') === useAltHook ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.1)'}`, background: (v === 'B') === useAltHook ? 'rgba(34,211,238,0.1)' : 'none', color: (v === 'B') === useAltHook ? '#22D3EE' : 'var(--color-text-muted)', fontSize: 11, fontFamily: "var(--font-mono)", cursor: 'pointer', transition: 'all .15s' }}>{v}</button>
          ))}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}>Pick your opening hook</span>
        </div>
      )}

      {isEditing ? (
        <div style={{ background: '#08081A', borderRadius: 14, border: '1px solid rgba(34,211,238,0.2)', overflow: 'hidden' }}>
          <ContentEditShell label="Edit Twitter Thread" onClose={() => setIsEditing(false)} onSave={saveEdit}>
            {(editForm.tweets || []).map((tw, i) => (
              <div key={tw._key ?? i} style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(34,211,238,0.5)', paddingTop: 10, flexShrink: 0, minWidth: 16 }}>{i + 1}</span>
                <textarea className="input" value={tw.text || ''} onChange={(e) => { const t = [...(editForm.tweets || [])]; t[i] = { ...t[i], text: e.target.value }; setEditForm({ ...editForm, tweets: t }); }} style={{ minHeight: 72 }} maxLength={280} />
              </div>
            ))}
          </ContentEditShell>
        </div>
      ) : (
        <>
          {(content.tweets || []).map((tw, i) => (
            <div key={tw.text || i} style={{ background: '#08081A', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(34,211,238,0.15)' }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(34,211,238,0.6)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Tweet {i + 1}</div>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65 }}>
                {i === 0 && useAltHook && content.tweetOneAlt ? content.tweetOneAlt : tw.text}
              </p>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" icon={<Pencil size={11} />} onClick={startEditing}>Edit thread</Button>
            <Button variant="secondary" size="sm" icon={<Copy size={11} />} onClick={() => { const tweets = content.tweets || []; const text = tweets.map((tw, i) => `${i + 1}/${tweets.length}\n${tw.text}`).join('\n\n'); navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }} style={{ borderColor: copied ? 'rgba(34,211,238,0.4)' : undefined, color: copied ? '#22D3EE' : undefined }}>
              {copied ? 'Copied!' : `Copy all ${(content.tweets || []).length} tweets`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
