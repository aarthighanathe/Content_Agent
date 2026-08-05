import { Layers } from 'lucide-react';

const label = {
  display: 'block', fontSize: 11.5, color: 'var(--text-muted)',
  marginBottom: 7, fontFamily: "var(--font-mono)", letterSpacing: 0.4,
} as const;

const voiceOptions = ['Professional', 'Casual', 'Witty', 'Educational', 'Direct', 'Inspirational'];

interface VoiceCardProps {
  selectedVoices: string[];
  onToggleVoice: (voice: string) => void;
  phrasesUse: string;
  onPhrasesUseChange: (v: string) => void;
  phrasesAvoid: string;
  onPhrasesAvoidChange: (v: string) => void;
}

export function VoiceCard({
  selectedVoices, onToggleVoice, phrasesUse, onPhrasesUseChange, phrasesAvoid, onPhrasesAvoidChange,
}: VoiceCardProps) {
  return (
    // WHY --accent-2, not fixed violet: this violet was decorative color variety chosen
    // for the Voice card, not an actual reuse of the .badge-purple category-tag system
    // (same hex values, but no shared class/meaning) — theming it keeps the card in step
    // with the active theme's secondary accent instead of a hardcoded #8B5CF6/#A78BFA.
    <div className="card" style={{ borderLeft: '3px solid color-mix(in srgb, var(--accent-2) 40%, transparent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 36, height: 36, background: 'color-mix(in srgb, var(--accent-2) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-2) 28%, transparent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-2)', flexShrink: 0 }}><Layers size={16} /></div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Voice</div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontFamily: "var(--font-mono)" }}>Select default tone(s)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {voiceOptions.map(voice => {
          const sel = selectedVoices.includes(voice);
          return (
            <button
              key={voice}
              style={{ background: sel ? 'color-mix(in srgb, var(--accent-2) 12%, transparent)' : 'var(--bg-card)', border: `1.5px solid ${sel ? 'var(--accent-2)' : 'var(--rule)'}`, color: sel ? 'var(--accent-2)' : 'var(--text-secondary)', fontSize: 13, padding: '7px 16px', borderRadius: 24, cursor: 'pointer', transition: 'all .18s', fontWeight: sel ? 600 : 400, boxShadow: sel ? '0 0 10px color-mix(in srgb, var(--accent-2) 15%, transparent)' : 'none' }}
              onClick={() => onToggleVoice(voice)}
              aria-pressed={sel}
            >{voice}</button>
          );
        })}
      </div>

      <label style={label}>Phrases to use</label>
      <textarea className="input" placeholder="e.g., data-driven, innovative, game-changer" value={phrasesUse} onChange={e => onPhrasesUseChange(e.target.value)} style={{ minHeight: 72, marginBottom: 14 }} />
      <label style={label}>Phrases to avoid</label>
      <textarea className="input" placeholder="e.g., synergy, disruption, pivot, guru" value={phrasesAvoid} onChange={e => onPhrasesAvoidChange(e.target.value)} style={{ minHeight: 72 }} />
    </div>
  );
}
