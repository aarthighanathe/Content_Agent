import type { CSSProperties } from 'react';
import { RefreshCw, Loader2, Search } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { Dropdown } from '../../components/Dropdown';
import type { CompetitorAnalysisHistoryItem } from '../../types/social';

const FILTERABLE_PLATFORMS = Object.keys(platformMeta);
const COUNT_OPTIONS = [5, 10, 15, 20].map((n) => ({ value: n, label: `${n} ideas` }));

interface IdeateControlsProps {
  focusTopic: string;
  onFocusTopicChange: (value: string) => void;
  platformFilter: string | null;
  onPlatformFilterChange: (value: string | null) => void;
  count: number;
  onCountChange: (value: number) => void;
  loading: boolean;
  hasIdeas: boolean;
  onGenerate: () => void;
  // I5: competitor-gap ideation mode — the toggle + analysis picker are
  // hidden entirely when competitorAnalyses is empty (nothing to pick from).
  competitorAnalyses: CompetitorAnalysisHistoryItem[];
  useCompetitorGaps: boolean;
  onUseCompetitorGapsChange: (value: boolean) => void;
  competitorAnalysisId: string | undefined;
  onCompetitorAnalysisIdChange: (id: string | undefined) => void;
}

export function IdeateControls({
  focusTopic, onFocusTopicChange,
  platformFilter, onPlatformFilterChange,
  count, onCountChange,
  loading, hasIdeas, onGenerate,
  competitorAnalyses, useCompetitorGaps, onUseCompetitorGapsChange,
  competitorAnalysisId, onCompetitorAnalysisIdChange,
}: IdeateControlsProps) {
  const analysisOptions = competitorAnalyses.map((a) => ({ value: a.id, label: `@${a.handle}` }));
  // WHY fallback to first analysis when competitorAnalysisId is undefined: when the user
  // first enables the competitor-gap toggle, we auto-select the most recent analysis
  // rather than forcing them to manually pick one. This provides a smoother UX.
  const selectedAnalysisId = competitorAnalysisId ?? competitorAnalyses[0]?.id;
  return (
    <div className="ideate-controls" style={{
      background: 'var(--bg-raised)', border: '1px solid var(--rule)',
      borderRadius: 13, padding: '18px 20px', marginBottom: 20,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Row 1: focus topic + count, styled as one connected input group */}
      <div className="ideate-controls-row1" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="ideate-focus-input" style={{
          flex: '1 1 260px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-base)', border: '1px solid var(--rule)',
          borderRadius: 9, padding: '0 12px',
        }}>
          <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={focusTopic}
            onChange={(e) => onFocusTopicChange(e.target.value)}
            maxLength={200}
            placeholder="Focus ideas on a specific topic or theme (optional)"
            style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
              padding: '10px 0', color: 'var(--text-primary)', fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
        </div>
        <Dropdown
          value={count}
          options={COUNT_OPTIONS}
          onChange={onCountChange}
          label="Number of ideas to generate"
          size="sm"
        />
      </div>

      {/* I5: competitor-gap ideation mode — only shown once the user has at
          least one saved competitor analysis to base ideas on. */}
      {analysisOptions.length > 0 && (
        <div className="ideate-controls-row15" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useCompetitorGaps}
              onChange={(e) => {
                onUseCompetitorGapsChange(e.target.checked);
                if (e.target.checked && !competitorAnalysisId) onCompetitorAnalysisIdChange(selectedAnalysisId);
              }}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
            />
            Base ideas on gaps from a recent competitor analysis
          </label>
          {useCompetitorGaps && (
            <Dropdown
              value={selectedAnalysisId ?? analysisOptions[0].value}
              options={analysisOptions}
              onChange={onCompetitorAnalysisIdChange}
              label="Competitor analysis to base ideas on"
              size="sm"
            />
          )}
        </div>
      )}

      {/* Row 2: platform filter chips + generate action on the same line */}
      <div className="ideate-controls-row2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="ideate-platform-chips" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="ideate-platform-label" style={{
            fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em', marginRight: 4,
          }}>
            PLATFORM
          </span>
          <button
            type="button"
            onClick={() => onPlatformFilterChange(null)}
            style={filterChipStyle(platformFilter === null, 'var(--accent)')}
          >
            All
          </button>
          {FILTERABLE_PLATFORMS.map((key) => {
            const meta = platformMeta[key];
            const active = platformFilter === key;
            return (
              <button
                type="button"
                key={key}
                onClick={() => onPlatformFilterChange(active ? null : key)}
                style={filterChipStyle(active, meta.color)}
              >
                <meta.Icon size={11} /> {meta.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="ideate-generate-btn"
          onClick={onGenerate}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            flexShrink: 0,
            background: loading ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'linear-gradient(135deg,var(--accent),color-mix(in srgb, var(--accent) 70%, white))',
            border: loading ? '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' : 'none',
            borderRadius: 10, padding: '9px 18px',
            color: loading ? 'color-mix(in srgb, var(--accent) 60%, transparent)' : 'var(--on-accent)',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .2s',
          }}
        >
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
          {loading ? 'Generating…' : hasIdeas ? 'Regenerate ideas' : 'Suggest topics'}
        </button>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .ideate-controls { padding: 12px 14px !important; gap: 10px !important; border-radius: 12px !important; }
          .ideate-controls-row1 { gap: 8px !important; }
          .ideate-focus-input input { padding: 7px 0 !important; font-size: 12.5px !important; }
          .ideate-controls-row2 { gap: 8px !important; }
          .ideate-platform-label { display: none !important; }
          .ideate-platform-chips { gap: 5px !important; }
          .ideate-platform-chips button { padding: 4px 8px !important; font-size: 10.5px !important; }
          .ideate-generate-btn { width: 100%; padding: 8px 16px !important; font-size: 12.5px !important; }
        }
      `}</style>
    </div>
  );
}

function filterChipStyle(active: boolean, activeColor: string): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: active ? `color-mix(in srgb, ${activeColor} 12%, transparent)` : 'transparent',
    border: `1px solid ${active ? `color-mix(in srgb, ${activeColor} 35%, transparent)` : 'var(--rule)'}`,
    borderRadius: 20, padding: '5px 11px',
    fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
    color: active ? activeColor : 'var(--text-muted)',
    transition: 'all .15s',
  };
}
