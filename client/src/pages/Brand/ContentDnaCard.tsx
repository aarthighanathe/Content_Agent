import { Check, Hexagon } from 'lucide-react';
import type { ContentDna } from '../../types/api';

const label = {
  display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.28)',
  marginBottom: 7, fontFamily: "var(--font-mono)", letterSpacing: 0.4,
} as const;

interface ContentDnaCardProps {
  contentDna: ContentDna | null;
  dnaSamples: string;
  onDnaSamplesChange: (v: string) => void;
  dnaError: string;
  analyzingDna: boolean;
  onAnalyze: () => void;
}

export function ContentDnaCard({
  contentDna, dnaSamples, onDnaSamplesChange, dnaError, analyzingDna, onAnalyze,
}: ContentDnaCardProps) {
  return (
    <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '3px solid rgba(34,211,238,0.4)', background: 'linear-gradient(135deg,rgba(34,211,238,0.02),rgba(139,92,246,0.02))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22D3EE', flexShrink: 0 }}><Hexagon size={16} /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Content DNA</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "var(--font-mono)", marginTop: 2 }}>AI analyzes your writing style from real posts</div>
        </div>
        {contentDna && (
          <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#22D3EE', fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase' }}><Check size={10} /> Active</div>
        )}
      </div>

      {contentDna && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {[
            { label: 'Hook',       val: contentDna.hookPattern },
            { label: 'Sentences',  val: `~${contentDna.avgSentenceWords} words` },
            { label: 'Emojis',     val: contentDna.emojiFrequency },
            { label: 'CTA',        val: contentDna.ctaStyle },
            { label: 'Structure',  val: contentDna.structuralSignature },
            { label: 'Vocabulary', val: contentDna.vocabularyLevel },
          ].filter(t => t.val).map(trait => (
            <div key={trait.label} style={{ display: 'flex', gap: 6, background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 20, padding: '5px 12px', fontSize: 11.5 }}>
              <span style={{ color: 'rgba(34,211,238,0.6)', fontFamily: "var(--font-mono)", fontSize: 9.5 }}>{trait.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{trait.val}</span>
            </div>
          ))}
        </div>
      )}
      {contentDna?.writingPersonality && (
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 18, paddingLeft: 8, borderLeft: '2px solid rgba(34,211,238,0.2)' }}>
          "{contentDna.writingPersonality}"
        </p>
      )}

      <label style={label}>
        {contentDna ? 'Update fingerprint — paste new sample posts' : 'Paste 3–5 of your best-performing posts'}
      </label>
      <textarea
        className="input"
        placeholder={'Post 1:\n...\n\nPost 2:\n...\n\nPost 3:\n...'}
        value={dnaSamples}
        onChange={e => onDnaSamplesChange(e.target.value)}
        style={{ minHeight: 130, marginBottom: 10 }}
      />
      {dnaError && <div style={{ fontSize: 11.5, color: 'var(--color-error)', marginBottom: 10 }}>{dnaError}</div>}
      <button
        onClick={onAnalyze}
        disabled={analyzingDna || !dnaSamples.trim()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: analyzingDna ? 'rgba(34,211,238,0.08)' : 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8, padding: '9px 18px', cursor: analyzingDna ? 'not-allowed' : 'pointer', fontSize: 12.5, color: '#22D3EE', fontWeight: 600, transition: 'all .18s' }}
      >
        {analyzingDna ? (
          <><div style={{ width: 14, height: 14, border: '1.5px solid rgba(34,211,238,0.3)', borderTopColor: '#22D3EE', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Analyzing style…</>
        ) : (
          <><Hexagon size={13} /> {contentDna ? 'Update' : 'Analyze'} my writing style</>
        )}
      </button>
    </div>
  );
}
