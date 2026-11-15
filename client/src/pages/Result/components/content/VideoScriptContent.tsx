import { useState } from 'react';
import { Copy, Film, Camera, MessageSquare } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { useTrackedTimeout } from '../../../../hooks/useTrackedTimeout';
import type { VideoScriptContentData } from '../../../../types/job';

interface Props {
  content: VideoScriptContentData;
}

export function VideoScriptContent({ content }: Props) {
  const [copied, setCopied] = useState(false);
  const pendingTimers = useTrackedTimeout();
  // WHY: hook/cta/segments are optional on stored scripts. Reading `.duration`
  // or calling `.map` on a missing field blanked the whole Result page.
  const hook = content.hook ?? {};
  const cta = content.cta ?? {};
  const segments = Array.isArray(content.segments) ? content.segments : [];

  function copyScript(): void {
    const hookVisual = hook.visual ? `\n[Visual] ${hook.visual}` : '';
    const lines = [
      `[HOOK — ${hook.duration ?? ''}]\n${hook.text ?? ''}${hookVisual}`,
      ...segments.map((s) => {
        const beat = s ?? {};
        const visual = beat.broll ? `\n[B-roll] ${beat.broll}` : '';
        const label = `[SEGMENT ${beat.number || ''} — ${beat.duration ?? ''}]`;
        return `${label}\n${beat.script ?? ''}${visual}`;
      }),
      `[CTA — ${cta.duration ?? ''}]\n${cta.text ?? ''}`,
      content.speakerNotes ? `[NOTES]\n${content.speakerNotes}` : '',
      content.hashtags ? content.hashtags.join(' ') : '',
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      pendingTimers.set(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hook */}
      <div style={{ background: 'var(--bg-raised)', borderRadius: 14, border: '1px solid rgba(239,68,68,0.25)', overflow: 'hidden' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,var(--color-error),rgba(239,68,68,0.25))' }} />
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '2px 9px', fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--color-error)', letterSpacing: 1, textTransform: 'uppercase' }}>HOOK</div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--text-muted)' }}>{hook.duration}</span>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(hook.text ?? '').catch(() => {}); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}><Copy size={10} /> Copy</button>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>{hook.text}</p>
          {hook.visual && <p style={{ fontSize: 11.5, color: 'rgba(239,68,68,0.65)', lineHeight: 1.5, margin: 0, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}><Film size={11} /> {hook.visual}</p>}
        </div>
      </div>

      {/* Segments */}
      {segments.map((seg, i) => {
        const beat = seg ?? {};
        const script = beat.script ?? '';
        // WHY: keyed by script text rather than array index — segments are
        // reorderable. Index is only the fallback when the script is empty.
        const rowKey = script ? `${beat.number ?? ''}:${script}` : `segment-${beat.number ?? i}`;
        return (
        <div key={rowKey} style={{ background: 'var(--bg-raised)', borderRadius: 12, border: '1px solid var(--rule)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'color-mix(in srgb, var(--text-primary) 5%, transparent)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--text-muted)' }}>{beat.number || i + 1}</div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--text-muted)' }}>{beat.duration}</span>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(script).catch(() => {}); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Copy size={11} /></button>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{script}</p>
          {beat.broll   && <p style={{ fontSize: 11, color: 'color-mix(in srgb, var(--accent-2) 70%, transparent)', margin: 0, display: 'flex', gap: 5, alignItems: 'center' }}><Camera size={10} /><span>{beat.broll}</span></p>}
          {beat.caption && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, display: 'flex', gap: 5, alignItems: 'center' }}><MessageSquare size={10} /><span>{beat.caption}</span></p>}
        </div>
        );
      })}

      {/* CTA */}
      <div style={{ background: 'var(--bg-raised)', borderRadius: 14, border: '1px solid rgba(239,68,68,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, padding: '2px 9px', fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--color-error)', letterSpacing: 1, textTransform: 'uppercase' }}>CTA</div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--text-muted)' }}>{cta.duration}</span>
            {content.totalDuration && <span style={{ marginLeft: 'auto', fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--text-muted)' }}>Total: {content.totalDuration}</span>}
          </div>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-error)', margin: 0 }}>{cta.text}</p>
          {cta.visual && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}><Film size={10} /> {cta.visual}</p>}
        </div>
      </div>

      {/* Speaker notes */}
      {content.speakerNotes && (
        <div style={{ background: 'color-mix(in srgb, var(--accent) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'color-mix(in srgb, var(--accent) 60%, transparent)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Speaker Notes</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{content.speakerNotes}</p>
        </div>
      )}

      {/* Hashtags */}
      {content.hashtags && content.hashtags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {content.hashtags.map((tag) => (
            <span key={tag} style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.07)', color: 'var(--color-error)', fontSize: 11, fontFamily: "var(--font-mono)", border: '1px solid rgba(239,68,68,0.18)' }}>{tag}</span>
          ))}
        </div>
      )}

      <div style={{ paddingTop: 4 }}>
        <Button variant="secondary" size="sm" icon={<Copy size={11} />} onClick={copyScript}>
          {copied ? 'Copied!' : 'Copy full script'}
        </Button>
      </div>
    </div>
  );
}
