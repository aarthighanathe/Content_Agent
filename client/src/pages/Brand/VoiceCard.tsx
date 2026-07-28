import { Layers } from 'lucide-react';

const label = {
  display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.28)',
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
    <div className="card" style={{ borderLeft: '3px solid rgba(139,92,246,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.28)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA', flexShrink: 0 }}><Layers size={16} /></div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Voice</div>
      </div>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 12, fontFamily: "var(--font-mono)" }}>Select default tone(s)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {voiceOptions.map(voice => {
          const sel = selectedVoices.includes(voice);
          return (
            <button
              key={voice}
              style={{ background: sel ? 'rgba(139,92,246,0.12)' : '#0C0C28', border: `1.5px solid ${sel ? '#8B5CF6' : 'rgba(255,255,255,0.07)'}`, color: sel ? '#A78BFA' : 'rgba(255,255,255,0.42)', fontSize: 13, padding: '7px 16px', borderRadius: 24, cursor: 'pointer', transition: 'all .18s', fontWeight: sel ? 600 : 400, boxShadow: sel ? '0 0 10px rgba(139,92,246,0.15)' : 'none' }}
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
