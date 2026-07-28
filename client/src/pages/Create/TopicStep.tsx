import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Settings, ClipboardList, AlertTriangle, Mic } from 'lucide-react';
import { ToneSelector } from './ToneSelector';
import { AdvancedOptions } from './AdvancedOptions';
import { SectionLabel } from './SectionLabel';
import { TopicSuggestions } from './TopicSuggestions';
import { PlatformSelector, PlatformSummary } from './PlatformSelector';

interface TopicStepProps {
  platform: string;
  onPlatformChange: (platform: string) => void;
  showPlatformGrid: boolean;
  onTogglePlatformGrid: () => void;

  topic: string;
  onTopicChange: (topic: string) => void;
  topicPlaceholder: string;
  topicRef: RefObject<HTMLTextAreaElement | null>;
  suggestRef: RefObject<HTMLDivElement | null>;
  showSuggestions: boolean;
  onFocusTopic: () => void;
  onCloseSuggestions: () => void;
  filteredSuggestions: string[];
  onPickSuggestion: (topic: string) => void;

  tone: string;
  onToneChange: (tone: string) => void;

  hasBrandVoice: boolean;

  targetAudience: string;
  onTargetAudienceChange: (value: string) => void;
  audiencePlaceholder: string;

  carouselTheme: number;
  onCarouselThemeChange: (theme: number) => void;

  errorMsg: string;
  loading: boolean;
  generateLabel: string;
  onSubmit: () => void;
}

export function TopicStep({
  platform, onPlatformChange, showPlatformGrid, onTogglePlatformGrid,
  topic, onTopicChange, topicPlaceholder, topicRef, suggestRef, showSuggestions, onFocusTopic, onCloseSuggestions,
  filteredSuggestions, onPickSuggestion,
  tone, onToneChange,
  hasBrandVoice,
  targetAudience, onTargetAudienceChange, audiencePlaceholder,
  carouselTheme, onCarouselThemeChange,
  errorMsg, loading, generateLabel, onSubmit,
}: TopicStepProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      {/* Platform — compact summary once chosen, full grid on first arrival or "Change" */}
      <div style={{ marginBottom: 24 }}>
        <SectionLabel>Platform</SectionLabel>
        {showPlatformGrid ? (
          <PlatformSelector value={platform} onChange={onPlatformChange} onSelect={onTogglePlatformGrid} />
        ) : (
          <PlatformSummary platform={platform} onChangeClick={onTogglePlatformGrid} />
        )}
      </div>

      <SectionLabel>Write your topic</SectionLabel>

      {/* Topic Input */}
      <div style={{ marginBottom: 20 }}>
        <div ref={suggestRef} style={{ position: 'relative' }}>
          <label htmlFor="create-topic" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            Topic
          </label>
          <textarea
            id="create-topic"
            ref={topicRef}
            className="input"
            placeholder={topicPlaceholder}
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            onFocus={onFocusTopic}
            style={{ minHeight: 92 }}
          />
          <TopicSuggestions
            suggestions={filteredSuggestions}
            open={showSuggestions}
            onClose={onCloseSuggestions}
            onPick={onPickSuggestion}
            inputRef={topicRef}
          />
        </div>
      </div>

      {/* Tone Selector — no pill pre-selected; an unpicked tone silently falls back to
          'professional' server-side (see Create.tsx effectiveTone), so this row's only
          job is to honestly reflect whether the user has made an explicit choice. */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel
          icon={<Mic size={13} style={{ flexShrink: 0 }} />}
          withRule={false}
          trailing={<span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', fontFamily: "var(--font-mono)", textTransform: 'none', letterSpacing: 0.3 }}>optional</span>}
        >
          Select a tone
        </SectionLabel>
        <ToneSelector value={tone} onChange={onToneChange} />
      </div>

      {/* Brand Voice — its own section, not nested under Tone. WHY: "brand voice" is
          actually a bundle (voice description + phrases to use/avoid + industry, per
          UserProfile in store.ts) sent to the writer agent independently of the tone
          pill (writer.ts: <brand_voice>/<phrases_to_include>/<phrases_to_avoid> tags
          alongside, not inside, the tone resolution). Placing it directly beneath Tone
          made it read as a footnote to the tone pill; it's a separate, persistent
          profile, so it gets a parallel section instead. */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel icon={<Sparkles size={13} style={{ flexShrink: 0 }} />} withRule={false}>
          Brand voice
        </SectionLabel>
        {hasBrandVoice ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 9,
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
              Your voice, phrases &amp; style will be applied
            </span>
            <Link
              to="/brand"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(245,158,11,0.6)', textDecoration: 'none', transition: 'color .15s', fontFamily: "var(--font-mono)", flexShrink: 0 }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#F59E0B')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,158,11,0.6)')}
            >
              <Settings size={11} /> Edit
            </Link>
          </div>
        ) : (
          <Link
            to="/brand"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 14px', textDecoration: 'none',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9,
              transition: 'border-color .18s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(245,158,11,0.2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.06)')}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Add brand voice for better results</span>
            <span style={{ fontSize: 11, color: 'rgba(245,158,11,0.55)', fontFamily: "var(--font-mono)" }}>Set up →</span>
          </Link>
        )}
      </div>

      {/* Target Audience (optional, always visible — no expand/collapse) */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel icon={<ClipboardList size={13} style={{ flexShrink: 0 }} />} withRule={false}>
          Target audience
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', fontFamily: "var(--font-mono)", textTransform: 'none', letterSpacing: 0.3, marginLeft: 6 }}>optional</span>
        </SectionLabel>
        <input
          type="text"
          className="input"
          placeholder={audiencePlaceholder}
          value={targetAudience}
          onChange={(e) => onTargetAudienceChange(e.target.value)}
        />
      </div>

      {/* Advanced (carousel theme) — always visible — no expand/collapse */}
      <AdvancedOptions
        platform={platform}
        carouselTheme={carouselTheme}
        onCarouselThemeChange={onCarouselThemeChange}
      />

      {/* Error message */}
      {errorMsg && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 6 }} role="alert">
          <AlertTriangle size={13} /> {errorMsg}
        </div>
      )}

      {/* Generate Button */}
      <button
        type="button"
        disabled={!topic.trim() || loading}
        onClick={onSubmit}
        style={{
          width: '100%',
          background: topic.trim() && !loading ? 'linear-gradient(135deg,#F59E0B,#FBBF24)' : 'rgba(245,158,11,0.25)',
          color: topic.trim() && !loading ? '#050509' : 'rgba(245,158,11,0.5)',
          fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14,
          padding: '13px 20px', border: 'none', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          letterSpacing: 0.2,
          cursor: topic.trim() && !loading ? 'pointer' : 'not-allowed',
          transition: 'all .2s',
          boxShadow: topic.trim() && !loading ? '0 6px 28px rgba(245,158,11,0.28)' : 'none',
        }}
      >
        {loading ? (
          <>
            <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#050509', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span role="status" aria-live="polite">Generating…</span>
          </>
        ) : (
          <>
            <Sparkles size={15} />
            <span>Generate {generateLabel}</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.6, fontWeight: 400 }}>· ~25 sec</span>
          </>
        )}
      </button>
    </div>
  );
}
