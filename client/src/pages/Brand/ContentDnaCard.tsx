import { Check, Hexagon, Clock } from 'lucide-react';
import type { ContentDna } from '../../types/api';
import type { DnaHistoryEntry } from './dnaHistory';

const label = {
  display: 'block', fontSize: 11.5, color: 'var(--text-muted)',
  marginBottom: 7, fontFamily: "var(--font-mono)", letterSpacing: 0.4,
} as const;

interface ContentDnaCardProps {
  contentDna: ContentDna | null;
  dnaSamples: string;
  onDnaSamplesChange: (v: string) => void;
  dnaError: string;
  analyzingDna: boolean;
  onAnalyze: () => void;
  // WHY optional: history is only available after clerkUserId resolves in Brand.tsx;
  // passing undefined is safe — the section simply won't render.
  dnaHistory?: DnaHistoryEntry[];
}

export function ContentDnaCard({
  contentDna, dnaSamples, onDnaSamplesChange, dnaError, analyzingDna, onAnalyze,
  dnaHistory = [],
}: ContentDnaCardProps) {
  return (
    // WHY --accent-2, not fixed cyan: Content DNA has no cross-app "brand" meaning of its
    // own (unlike LinkedIn blue or a real status color) — it was fixed cyan by mistake
    // during the theme migration, which broke visual consistency under themes whose accent
    // isn't cyan-adjacent. Dashboard's own Content DNA bubble (StatsOverview.tsx) already
    // themes this exact feature to var(--accent-2), so this card now matches it.
    <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '3px solid color-mix(in srgb, var(--accent-2) 40%, transparent)', background: 'linear-gradient(135deg,color-mix(in srgb, var(--accent-2) 2%, transparent),color-mix(in srgb, var(--accent-2) 2%, transparent))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, background: 'color-mix(in srgb, var(--accent-2) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 20%, transparent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-2)', flexShrink: 0 }}><Hexagon size={16} /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Content DNA</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", marginTop: 2 }}>AI analyzes your writing style from real posts</div>
        </div>
        {contentDna && (
          <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'color-mix(in srgb, var(--accent-2) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 20%, transparent)', color: 'var(--accent-2)', fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: 1, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase' }}><Check size={10} /> Active</div>
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
            <div key={trait.label} style={{ display: 'flex', gap: 6, background: 'color-mix(in srgb, var(--accent-2) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 15%, transparent)', borderRadius: 20, padding: '5px 12px', fontSize: 11.5 }}>
              <span style={{ color: 'color-mix(in srgb, var(--accent-2) 60%, transparent)', fontFamily: "var(--font-mono)", fontSize: 9.5 }}>{trait.label}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{trait.val}</span>
            </div>
          ))}
        </div>
      )}
      {contentDna?.writingPersonality && (
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 18, paddingLeft: 8, borderLeft: '2px solid color-mix(in srgb, var(--accent-2) 20%, transparent)' }}>
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
        style={{ minHeight: 130, marginBottom: 4 }}
      />
      {/* WHY: the 50-char minimum was only enforced (and surfaced as an error) on
          submit — this makes progress toward that minimum visible as the user types. */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', marginBottom: 10,
        fontSize: 10.5, fontFamily: "var(--font-mono)",
        color: dnaSamples.length >= 50 ? 'color-mix(in srgb, var(--accent-2) 70%, transparent)' : 'var(--text-muted)',
      }}>
        {dnaSamples.length}/50 minimum
      </div>
      {dnaError && <div style={{ fontSize: 11.5, color: 'var(--color-error)', marginBottom: 10 }}>{dnaError}</div>}
      <button
        onClick={onAnalyze}
        disabled={analyzingDna || !dnaSamples.trim()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: analyzingDna ? 'color-mix(in srgb, var(--accent-2) 8%, transparent)' : 'color-mix(in srgb, var(--accent-2) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 30%, transparent)', borderRadius: 8, padding: '9px 18px', cursor: analyzingDna ? 'not-allowed' : 'pointer', fontSize: 12.5, color: 'var(--accent-2)', fontWeight: 600, transition: 'all .18s' }}
      >
        {analyzingDna ? (
          <><div style={{ width: 14, height: 14, border: '1.5px solid color-mix(in srgb, var(--accent-2) 30%, transparent)', borderTopColor: 'var(--accent-2)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Analyzing style…</>
        ) : (
          <><Hexagon size={13} /> {contentDna ? 'Update' : 'Analyze'} my writing style</>
        )}
      </button>

      {/* ── DNA History (last 3 fingerprints, newest first) ── */}
      {dnaHistory.length > 1 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid color-mix(in srgb, var(--accent-2) 12%, transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Clock size={11} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Previous fingerprints
            </span>
          </div>
          {dnaHistory.slice(1).map((entry, i) => (
            <div
              key={entry.analyzedAt}
              style={{
                marginBottom: i < dnaHistory.length - 2 ? 12 : 0,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'color-mix(in srgb, var(--bg-raised) 60%, transparent)',
                border: '1px solid color-mix(in srgb, var(--rule) 80%, transparent)',
              }}
            >
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                {new Date(entry.analyzedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {[
                  { label: 'Hook',      val: entry.dna.hookPattern },
                  { label: 'Sentences', val: `~${entry.dna.avgSentenceWords}w` },
                  { label: 'Emojis',    val: entry.dna.emojiFrequency },
                  { label: 'CTA',       val: entry.dna.ctaStyle },
                ].filter(t => t.val).map(trait => (
                  <div
                    key={trait.label}
                    style={{
                      display: 'inline-flex', gap: 4, borderRadius: 20, padding: '3px 9px', fontSize: 10.5,
                      background: 'color-mix(in srgb, var(--accent-2) 4%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent-2) 10%, transparent)',
                    }}
                  >
                    <span style={{ color: 'color-mix(in srgb, var(--accent-2) 50%, transparent)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>{trait.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{trait.val}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
