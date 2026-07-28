import { useState } from 'react';
import { Copy, Film, Camera, MessageSquare } from 'lucide-react';
import { Button } from '../../../../components/Button';
import type { VideoScriptContentData } from '../../../../types/job';

interface Props {
  content: VideoScriptContentData;
}

export function VideoScriptContent({ content }: Props) {
  const [copied, setCopied] = useState(false);

  function copyScript() {
    const lines = [
      `[HOOK — ${content.hook.duration}]\n${content.hook.text}\n${content.hook.visual ? `[Visual] ${content.hook.visual}` : ''}`,
      ...(content.segments || []).map((s) => `[SEGMENT ${s.number || ''} — ${s.duration}]\n${s.script}\n${s.broll ? `[B-roll] ${s.broll}` : ''}`),
      `[CTA — ${content.cta.duration}]\n${content.cta.text}`,
      content.speakerNotes ? `[NOTES]\n${content.speakerNotes}` : '',
      content.hashtags ? content.hashtags.join(' ') : '',
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hook */}
      <div style={{ background: '#08081A', borderRadius: 14, border: '1px solid rgba(239,68,68,0.25)', overflow: 'hidden' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,var(--color-error),rgba(239,68,68,0.25))' }} />
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '2px 9px', fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--color-error)', letterSpacing: 1, textTransform: 'uppercase' }}>HOOK</div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{content.hook.duration}</span>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(content.hook.text ?? '').catch(() => {}); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}><Copy size={10} /> Copy</button>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, margin: 0 }}>{content.hook.text}</p>
          {content.hook.visual && <p style={{ fontSize: 11.5, color: 'rgba(239,68,68,0.65)', lineHeight: 1.5, margin: 0, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}><Film size={11} /> {content.hook.visual}</p>}
        </div>
      </div>

      {/* Segments */}
      {content.segments.map((seg, i) => (
        // WHY: keyed by seg.script (the segment's actual unique text) rather than array
        // index — segments are user-editable/reorderable content, so an index key would
        // cause React to misattribute local state/DOM across re-renders on edits. Falls
        // back to index only in the (rare) case two segments share identical script text.
        <div key={seg.script || i} style={{ background: '#08081A', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{seg.number || i + 1}</div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{seg.duration}</span>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(seg.script ?? '').catch(() => {}); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Copy size={11} /></button>
          </div>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, margin: 0 }}>{seg.script}</p>
          {seg.broll   && <p style={{ fontSize: 11, color: 'rgba(139,92,246,0.7)', margin: 0, display: 'flex', gap: 5, alignItems: 'center' }}><Camera size={10} /><span>{seg.broll}</span></p>}
          {seg.caption && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, display: 'flex', gap: 5, alignItems: 'center' }}><MessageSquare size={10} /><span>{seg.caption}</span></p>}
        </div>
      ))}

      {/* CTA */}
      <div style={{ background: '#08081A', borderRadius: 14, border: '1px solid rgba(239,68,68,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, padding: '2px 9px', fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--color-error)', letterSpacing: 1, textTransform: 'uppercase' }}>CTA</div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{content.cta.duration}</span>
            {content.totalDuration && <span style={{ marginLeft: 'auto', fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>Total: {content.totalDuration}</span>}
          </div>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-error)', margin: 0 }}>{content.cta.text}</p>
          {content.cta.visual && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}><Film size={10} /> {content.cta.visual}</p>}
        </div>
      </div>

      {/* Speaker notes */}
      {content.speakerNotes && (
        <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'rgba(245,158,11,0.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Speaker Notes</div>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{content.speakerNotes}</p>
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
