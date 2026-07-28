import { Award, AlertCircle } from 'lucide-react';
import type { CriticResult } from '../../../types/job';

interface StatusDisplayProps {
  isDone: boolean;
  regenerating: boolean;
  currentStage: string;
  progress: number;
  criticResult: CriticResult | null | undefined;
}

function getTierInfo(score: number | null | undefined): { tier: string; color: string; bgColor: string; description: string } {
  if (score === null || score === undefined) {
    return { tier: '?', color: 'rgba(255,255,255,0.45)', bgColor: 'rgba(255,255,255,0.08)', description: 'Pending evaluation' };
  }

  const s = score;
  if (s >= 85) return { tier: 'S', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)', description: 'Excellent content (85-100)' };
  if (s >= 70) return { tier: 'A', color: 'var(--color-success)', bgColor: 'rgba(16,185,129,0.15)', description: 'Good content (70-84)' };
  if (s >= 55) return { tier: 'B', color: '#6366F1', bgColor: 'rgba(99,102,241,0.15)', description: 'Fair content (55-69)' };
  return { tier: 'C', color: 'var(--color-error)', bgColor: 'rgba(239,68,68,0.15)', description: 'Needs improvement (< 55)' };
}

export function StatusDisplay({ isDone, regenerating, currentStage, progress, criticResult }: StatusDisplayProps) {
  const score: number | null = criticResult?.totalScore ?? null;
  const tier = getTierInfo(score);
  const stageLabel = regenerating ? 'Regenerating' : isDone ? 'Complete' : currentStage || 'Pending';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      {/* Stage badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: isDone ? 'rgba(16,185,129,0.12)' : regenerating ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.12)',
        border: `1px solid ${isDone ? 'rgba(16,185,129,0.3)' : regenerating ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        color: isDone ? 'var(--color-success)' : regenerating ? '#F59E0B' : '#6366F1',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isDone ? 'var(--color-success)' : regenerating ? '#F59E0B' : '#6366F1',
            animation: !isDone ? 'rp-pulse 1.2s infinite' : 'none',
          }}
        />
        {stageLabel}
      </div>

      {/* Progress bar */}
      {progress > 0 && progress < 100 && (
        <div style={{
          flex: 1,
          height: 4,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #F59E0B, #8B5CF6)',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 8px rgba(245,158,11,0.4)',
            }}
          />
        </div>
      )}

      {/* Quality tier badge */}
      {isDone && score !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 12px',
            background: tier.bgColor,
            border: `1px solid ${tier.color}33`,
            borderRadius: 6,
            cursor: 'help',
            position: 'relative',
            fontSize: 11,
            fontWeight: 600,
            color: tier.color,
          }}
          title={tier.description}
        >
          <Award size={12} />
          <span>Tier {tier.tier}</span>
          {score !== null && <span style={{ fontSize: 10, opacity: 0.7 }}>({score.toFixed(0)}/100)</span>}
        </div>
      )}

      {/* Info icon for pending */}
      {!isDone && score === null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
          }}
          title="Quality score will appear once generation completes"
        >
          <AlertCircle size={12} />
          Pending
        </div>
      )}
    </div>
  );
}
