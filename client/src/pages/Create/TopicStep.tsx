import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Settings, ClipboardList, AlertTriangle, Mic } from 'lucide-react';
import { ToneSelector } from './ToneSelector';
import { AdvancedOptions } from './AdvancedOptions';
import { SectionLabel } from './SectionLabel';
import { TopicSuggestions } from './TopicSuggestions';
import { PlatformSelector, PlatformSummary } from './PlatformSelector';
import type { NewTemplateId } from '../Result/constants';

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
  hasContentDna: boolean;

  targetAudience: string;
  onTargetAudienceChange: (value: string) => void;
  audiencePlaceholder: string;

  templateId: NewTemplateId;
  onTemplateChange: (id: NewTemplateId) => void;
  paletteId: string;
  onPaletteChange: (id: string) => void;

  errorMsg: string;
  loading: boolean;
  generateLabel: string;
  onSubmit: () => void;
  countdownText?: string | null;
}

export function TopicStep({
  platform, onPlatformChange, showPlatformGrid, onTogglePlatformGrid,
  topic, onTopicChange, topicPlaceholder, topicRef, suggestRef, showSuggestions, onFocusTopic, onCloseSuggestions,
  filteredSuggestions, onPickSuggestion,
  tone, onToneChange,
  hasBrandVoice, hasContentDna,
  targetAudience, onTargetAudienceChange, audiencePlaceholder,
  templateId, onTemplateChange, paletteId, onPaletteChange,
  errorMsg, loading, generateLabel, onSubmit, countdownText,
}: TopicStepProps) {
  return (
    <div className="create-topic-step" style={{ marginBottom: 32, padding: '0 16px' }}>
      <style>{`
        @media (max-width: 480px) {
          .create-topic-step {
            padding: 0 8px !important;
          }
        }
        @media (max-width: 375px) {
          .create-topic-step {
            padding: 0 4px !important;
          }
        }
      `}</style>
      {/* Platform — compact summary once chosen, full grid on first arrival or "Change" */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Platform</SectionLabel>
        {showPlatformGrid ? (
          <PlatformSelector value={platform} onChange={onPlatformChange} onSelect={onTogglePlatformGrid} />
        ) : (
          <PlatformSummary platform={platform} onChangeClick={onTogglePlatformGrid} />
        )}
      </div>

      {/* Topic Input */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Write your topic</SectionLabel>
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
            // NOTE: mirrors server/src/schemas/jobs.ts's TOPIC_MAX_LENGTH — not
            // importable across the client/server boundary, keep in sync by hand.
            maxLength={250}
            onChange={(e) => onTopicChange(e.target.value)}
            onFocus={onFocusTopic}
            style={{ minHeight: 92, paddingBottom: 22 }}
          />
          {/* WHY overlaid inside the textarea, not a block row below it: a trailing
              row here added extra height only this section had, making the gap
              before "Select a tone" visibly larger than every other section's
              gap (which all end flush at their marginBottom:20 boundary). */}
          <div style={{
            position: 'absolute', right: 12, bottom: 8, pointerEvents: 'none',
            fontSize: 10.5, fontFamily: "var(--font-mono)",
            color: topic.length >= 250 ? 'var(--color-error)' : 'var(--text-muted)',
          }}>
            {topic.length}/250
          </div>
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
          trailing={<span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", textTransform: 'none', letterSpacing: 0.3 }}>optional</span>}
        >
          Select a tone
        </SectionLabel>
        <ToneSelector value={tone} onChange={onToneChange} />
      </div>

      {/* Brand Voice — its own section, not nested under Tone. WHY: "brand voice" is
          actually a bundle (voice description + phrases to use/avoid + industry, per
          the Profile type in types/api.ts) sent to the writer agent independently of
          the tone pill (writer.ts: <brand_voice>/<phrases_to_include>/<phrases_to_avoid>
          tags alongside, not inside, the tone resolution). Placing it directly beneath
          Tone made it read as a footnote to the tone pill; it's a separate, persistent
          profile, so it gets a parallel section instead. */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel icon={<Sparkles size={13} style={{ flexShrink: 0 }} />} withRule={false}>
          Brand voice
        </SectionLabel>
        {hasBrandVoice ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 14px',
            background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
            border: '1px solid var(--rule)',
            borderRadius: 9,
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Your voice, phrases &amp; style will be applied
            </span>
            <Link
              to="/brand"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'color-mix(in srgb, var(--accent) 60%, transparent)', textDecoration: 'none', transition: 'color .15s', fontFamily: "var(--font-mono)", flexShrink: 0 }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = 'color-mix(in srgb, var(--accent) 60%, transparent)')}
            >
              <Settings size={11} /> Edit
            </Link>
          </div>
        ) : null}
        {/* WHY a separate line, not folded into the banner above: Content DNA is sent to
            every job (create.ts) regardless of whether the brand-voice banner is showing
            the "configured" or "not set up" state — this confirms on-screen that it's
            active independent of that banner's own state. */}
        {hasContentDna && (
          <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--accent-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-2)', flexShrink: 0 }} />
            Content DNA is active — your writing fingerprint will shape this generation
          </p>
        )}
        {!hasBrandVoice && (
          <Link
            to="/brand"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 14px', textDecoration: 'none',
              background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)', border: '1px solid var(--rule)', borderRadius: 9,
              transition: 'border-color .18s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'color-mix(in srgb, var(--accent) 20%, transparent)')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--rule)')}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Add brand voice for better results</span>
            <span style={{ fontSize: 11, color: 'color-mix(in srgb, var(--accent) 55%, transparent)', fontFamily: "var(--font-mono)" }}>Set up →</span>
          </Link>
        )}
      </div>

      {/* Target Audience (optional, always visible — no expand/collapse) */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel icon={<ClipboardList size={13} style={{ flexShrink: 0 }} />} withRule={false}>
          Target audience
          <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: "var(--font-mono)", textTransform: 'none', letterSpacing: 0.3, marginLeft: 6 }}>optional</span>
        </SectionLabel>
        <input
          type="text"
          className="input"
          placeholder={audiencePlaceholder}
          value={targetAudience}
          onChange={(e) => onTargetAudienceChange(e.target.value)}
        />
      </div>

      {/* Advanced (carousel template + palette) — always visible — no expand/collapse */}
      <AdvancedOptions
        platform={platform}
        templateId={templateId}
        onTemplateChange={onTemplateChange}
        paletteId={paletteId}
        onPaletteChange={onPaletteChange}
      />

      {/* Error message */}
      {errorMsg && (
        <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 6 }} role="alert">
          <AlertTriangle size={13} /> {errorMsg}{countdownText && <span style={{ marginLeft: 6, fontWeight: 600 }}>({countdownText})</span>}
        </div>
      )}

      {/* Generate Button */}
      <button
        type="button"
        className="btn-primary"
        disabled={!topic.trim() || loading}
        onClick={onSubmit}
        style={{
          width: '100%',
          fontFamily: "'Inter',sans-serif", fontSize: 14,
          padding: '13px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          letterSpacing: 0.2,
        }}
      >
        {loading ? (
          <>
            <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--on-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
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
