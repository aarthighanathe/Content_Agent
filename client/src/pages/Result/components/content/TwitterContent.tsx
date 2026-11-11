import { useState, useEffect, useRef } from 'react';
import { Pencil, Copy } from 'lucide-react';
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
  const tweetOne = content.tweets?.[0]?.text ?? '';
  return {
    A: tweetOne,
    B: content.tweetOneAlt ?? '',
  };
}

function tweetsWithOpening(content: PlatformContent, opening: string): NonNullable<PlatformContent['tweets']> {
  const tweets = content.tweets ?? [];
  if (tweets.length === 0) return [{ number: 1, text: opening }];
  return [{ ...tweets[0], text: opening }, ...tweets.slice(1)];
}

export function TwitterContent({ content, onSave }: Props) {
  const [isEditing, setIsEditing]   = useState(false);
  const [editForm, setEditForm]     = useState<PlatformContent>({});
  const [promoting, setPromoting]   = useState(false);
  const [copied, setCopied]         = useState(false);
  // WHY same A/B persist model as LinkedInContent: a view-only toggle left
  // Copy / Export / header Copy on tweet A while the card showed B (QA-D3-001).
  const [pair, setPair] = useState<HookPair>(() => pairFromContent(content));
  const [selected, setSelected] = useState<HookVariant>('A');
  const pairRef = useRef(pair);
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
    const opening = content.tweets?.[0]?.text ?? '';
    if (isSame || isSwap) {
      if (opening === prev.B) setSelected('B');
      else if (opening === prev.A) setSelected('A');
      return;
    }
    pairRef.current = next;
    setPair(next);
    setSelected('A');
    // WHY tweet text + alt only (not tweets[] identity): parent re-renders pass a
    // fresh array reference every time; hooking that remounted A/B state.
  }, [content.tweets?.[0]?.text, content.tweetOneAlt]);

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
  async function saveEdit(): Promise<void> {
    await onSave(editForm);
    const next: HookPair = {
      A: editForm.tweets?.[0]?.text ?? pair.A,
      B: editForm.tweetOneAlt ?? pair.B,
    };
    pairRef.current = next;
    setPair(next);
    setSelected('A');
  }

  async function pickTweetOne(variant: HookVariant): Promise<void> {
    if (!content.tweetOneAlt || promoting || variant === selected) return;
    const previous = selected;
    setSelected(variant);
    setPromoting(true);
    skipContentSync.current = true;
    try {
      await onSave({
        ...content,
        tweets: tweetsWithOpening(content, pair[variant]),
        tweetOneAlt: pair[variant === 'A' ? 'B' : 'A'],
      });
    } catch {
      setSelected(previous);
      skipContentSync.current = false;
    } finally {
      setPromoting(false);
    }
  }

  function copyAllTweets(): void {
    const tweets = content.tweets || [];
    // Opening already reflects the persisted A/B pick (tweets[0].text).
    const text = tweets
      .map((tw, i) => `${i + 1}/${tweets.length}\n${tw.text ?? ''}`)
      .join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const displayOpening = pair[selected] || content.tweets?.[0]?.text;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {content.tweetOneAlt && !isEditing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-raised)', border: '1px solid rgba(34,211,238,0.12)', borderRadius: 10, padding: '9px 14px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Tweet 1 A/B</span>
          {(['A', 'B'] as const).map((v) => {
            const on = selected === v;
            return (
              <button
                key={v}
                type="button"
                disabled={promoting}
                aria-pressed={on}
                onClick={() => { void pickTweetOne(v); }}
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: `1px solid ${on ? 'rgba(34,211,238,0.5)' : 'var(--rule)'}`,
                  background: on ? 'rgba(34,211,238,0.1)' : 'none',
                  color: on ? '#22D3EE' : 'var(--color-text-muted)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  cursor: promoting ? 'wait' : 'pointer',
                  transition: 'all .15s',
                }}
              >
                {v}
              </button>
            );
          })}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
            {promoting ? 'Saving…' : 'Pick your opening hook'}
          </span>
        </div>
      )}

      {isEditing ? (
        <div style={{ background: 'var(--bg-raised)', borderRadius: 14, border: '1px solid rgba(34,211,238,0.2)', overflow: 'hidden' }}>
          <ContentEditShell label="Edit Twitter Thread" onClose={() => setIsEditing(false)} onSave={saveEdit}>
            {(editForm.tweets || []).map((tw, i) => (
              <div key={tw._key ?? `edit-${i}`} style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(34,211,238,0.5)', paddingTop: 10, flexShrink: 0, minWidth: 16 }}>{i + 1}</span>
                <textarea
                  className="input"
                  value={tw.text || ''}
                  onChange={(e) => {
                    const t = [...(editForm.tweets || [])];
                    t[i] = { ...t[i], text: e.target.value };
                    setEditForm({ ...editForm, tweets: t });
                  }}
                  style={{ minHeight: 72 }}
                  maxLength={280}
                />
              </div>
            ))}
          </ContentEditShell>
        </div>
      ) : (
        <>
          {(content.tweets || []).map((tw, i) => (
            <div key={tw.text || `tweet-${i}`} style={{ background: 'var(--bg-raised)', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(34,211,238,0.15)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(34,211,238,0.6)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Tweet {i + 1}</div>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {i === 0 ? displayOpening : tw.text}
              </p>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" icon={<Pencil size={11} />} onClick={startEditing}>Edit thread</Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Copy size={11} />}
              onClick={copyAllTweets}
              style={{ borderColor: copied ? 'rgba(34,211,238,0.4)' : undefined, color: copied ? '#22D3EE' : undefined }}
            >
              {copied ? 'Copied!' : `Copy all ${(content.tweets || []).length} tweets`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
