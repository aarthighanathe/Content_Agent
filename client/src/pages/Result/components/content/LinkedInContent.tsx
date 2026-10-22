import { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '../../../../components/Button';
import type { PlatformContent } from '../../../../types/job';
import { ContentEditShell } from './ContentEditShell';

interface Props {
  content: PlatformContent;
  onSave:  (newContent: PlatformContent) => Promise<void>;
}

type HookVariant = 'A' | 'B';

interface HookPair {
  A: string;
  B: string;
}

function pairFromContent(content: PlatformContent): HookPair {
  return {
    A: content.hook ?? '',
    B: content.hookAlt ?? '',
  };
}

export function LinkedInContent({ content, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm]   = useState<PlatformContent>({});
  const [promoting, setPromoting] = useState(false);
  // WHY stable A/B texts: promoting used to swap hook↔hookAlt then clear the
  // "B selected" flag so Copy/Export saw the chosen opener — but the pills
  // snapped back to A. Keep labels fixed; selected tracks which pill is active.
  const [pair, setPair] = useState<HookPair>(() => pairFromContent(content));
  const [selected, setSelected] = useState<HookVariant>('A');
  const pairRef = useRef(pair);
  // WHY: after our own promote, content.hook/hookAlt swap — don't treat that
  // as a fresh job and reset selection to A.
  const skipContentSync = useRef(false);

  useEffect(() => {
    if (skipContentSync.current) {
      skipContentSync.current = false;
      return;
    }
    const next = pairFromContent(content);
    const prev = pairRef.current;
    const isSame = next.A === prev.A && next.B === prev.B;
    const isSwap = next.A === prev.B && next.B === prev.A;
    if (isSame || isSwap) {
      // Same two hooks (possibly swapped) — light the pill matching content.hook.
      if (content.hook === prev.B) setSelected('B');
      else if (content.hook === prev.A) setSelected('A');
      return;
    }
    // New content (regen / different job output)
    pairRef.current = next;
    setPair(next);
    setSelected('A');
  }, [content.hook, content.hookAlt]);

  function startEditing() {
    setEditForm(JSON.parse(JSON.stringify(content)));
    setIsEditing(true);
  }

  // WHY no setIsEditing(false) here: ContentEditShell now owns closing the editor —
  // see InstagramContent.tsx's identical comment for the full rationale
  // (FUNCTIONAL_AUDIT_2026-07.md finding #15).
  async function saveEdit() {
    await onSave(editForm);
    const next: HookPair = {
      A: editForm.hook ?? pair.A,
      B: editForm.hookAlt ?? pair.B,
    };
    pairRef.current = next;
    setPair(next);
    setSelected('A');
  }

  // WHY persist on pick: a view-only toggle left Copy / Export / Post on hook A
  // while the card showed B. Saving puts the chosen opener in `hook` and the
  // other in `hookAlt` so every path uses the selected variant.
  async function pickHook(variant: HookVariant): Promise<void> {
    if (!content.hookAlt || promoting || variant === selected) return;
    const previous = selected;
    setSelected(variant);
    setPromoting(true);
    skipContentSync.current = true;
    try {
      await onSave({
        ...content,
        hook: pair[variant],
        hookAlt: pair[variant === 'A' ? 'B' : 'A'],
      });
    } catch {
      // Revert pill; saveError toast is owned by Result.tsx.
      setSelected(previous);
      skipContentSync.current = false;
    } finally {
      setPromoting(false);
    }
  }

  const displayHook = pair[selected] || content.hook;

  return (
    <div style={{ background: 'var(--bg-raised)', borderRadius: 14, border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)', overflow: 'hidden' }}>
      {/* A/B hook toggle — padding-bottom keeps pills clear of the rule line */}
      {content.hookAlt && !isEditing && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px 12px',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Hook A/B</span>
          {(['A', 'B'] as const).map((v) => {
            const on = selected === v;
            return (
              <button
                key={v}
                type="button"
                disabled={promoting}
                aria-pressed={on}
                onClick={() => { void pickHook(v); }}
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: `1px solid ${on ? 'color-mix(in srgb, var(--accent) 50%, transparent)' : 'var(--rule)'}`,
                  background: on ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'none',
                  color: on ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  cursor: promoting ? 'wait' : 'pointer',
                  transition: 'all .15s',
                  lineHeight: 1.2,
                  flexShrink: 0,
                }}
              >
                {v}
              </button>
            );
          })}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
            {promoting ? 'Saving…' : 'Pick your best hook'}
          </span>
        </div>
      )}

      {isEditing ? (
        <ContentEditShell label="Edit LinkedIn Post" onClose={() => setIsEditing(false)} onSave={saveEdit}>
          <textarea className="input" value={editForm.hook  || ''} onChange={(e) => setEditForm({ ...editForm, hook:     e.target.value })} placeholder="Hook"            style={{ minHeight: 60,  fontWeight: 600 }} />
          {content.hookAlt !== undefined && (
            <textarea
              className="input"
              value={editForm.hookAlt || ''}
              onChange={(e) => setEditForm({ ...editForm, hookAlt: e.target.value })}
              placeholder="Alternate hook (B)"
              style={{ minHeight: 60 }}
            />
          )}
          <textarea className="input" value={editForm.body  || ''} onChange={(e) => setEditForm({ ...editForm, body:     e.target.value })} placeholder="Body"            style={{ minHeight: 150 }} />
          <input    className="input" value={editForm.cta   || ''} onChange={(e) => setEditForm({ ...editForm, cta:      e.target.value })} placeholder="Call to action" />
          <input    className="input" value={(editForm.hashtags || []).join(' ')} onChange={(e) => setEditForm({ ...editForm, hashtags: e.target.value.split(/\s+/).filter(Boolean) })} placeholder="#hashtags" />
        </ContentEditShell>
      ) : (
        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.6 }}>
            {displayHook}
          </p>
          <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.7, fontSize: 14 }}>{content.body}</div>
          <p style={{ color: 'var(--accent)', fontWeight: 700 }}>{content.cta}</p>
          {content.hashtags && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, paddingTop: 14, borderTop: '1px solid var(--rule)' }}>
              {content.hashtags.map((tag: string) => (
                <span key={tag} style={{ padding: '4px 10px', borderRadius: 20, background: 'color-mix(in srgb, var(--accent) 8%, transparent)', color: 'var(--accent)', fontSize: 11, fontFamily: 'var(--font-mono)', border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)' }}>{tag}</span>
              ))}
            </div>
          )}
          <div style={{ paddingTop: 10, borderTop: '1px solid var(--rule)' }}>
            <Button variant="secondary" size="sm" icon={<Pencil size={11} />} onClick={startEditing}>Edit post</Button>
          </div>
        </div>
      )}
    </div>
  );
}
