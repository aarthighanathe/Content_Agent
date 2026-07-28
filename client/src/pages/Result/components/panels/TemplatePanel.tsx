import { useState } from 'react';
import axios from 'axios';
import { Bookmark, Check, AlertCircle } from 'lucide-react';
import { saveTemplate } from '../../../../api';
import type { ContentJob, CriticResult } from '../../../../types/job';
import type { ResultContent } from '../ContentColumn';

interface Props {
  jobData: ContentJob | null;
  content: ResultContent | undefined;
  criticResult: CriticResult | null | undefined;
  onClose: () => void;
}

// WHY derive from content rather than criticResult: the previous TemplatePanel.tsx read a
// `criticResult.subscores` field that never existed on the real CriticResult shape (see
// CHANGELOG "Tightening CriticResult's type" entry) — hook/CTA text lives on the content
// itself, not on the critic's score breakdown, so pulling the preview text directly from
// `content` is both simpler and actually correct.
function getHookAndCta(content: ResultContent | undefined): { hook: string; cta: string } {
  if (!content) return { hook: '', cta: '' };
  if (Array.isArray(content)) {
    // SlideData[] (carousel) — first slide's headline/subhead approximate hook/cta.
    return { hook: content[0]?.headline ?? '', cta: content[content.length - 1]?.body ?? '' };
  }
  if ('segments' in content) {
    return { hook: content.hook?.text ?? '', cta: content.cta?.text ?? '' };
  }
  return { hook: content.hook ?? content.caption ?? '', cta: content.cta ?? '' };
}

export function TemplatePanel({ jobData, content, criticResult, onClose }: Props) {
  const { hook, cta } = getHookAndCta(content);
  const [name, setName] = useState(jobData?.topic ? `${jobData.topic} template` : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!jobData || !name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await saveTemplate({
        name: name.trim(),
        platform: jobData.platform,
        topic: jobData.topic,
        hookStyle: hook.slice(0, 500),
        ctaPattern: cta.slice(0, 500),
      });
      setSaved(true);
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(message || 'Failed to save template — please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={22} style={{ color: 'var(--color-success)' }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Template saved!</div>
        <button
          onClick={onClose}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: "var(--font-mono)" }}>
        Save this content as a reusable template
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
          Template name
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Product launch hook"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '9px 12px', color: 'rgba(255,255,255,0.85)', fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {(hook || cta) && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: "var(--font-mono)" }}>
              What gets saved
            </div>
            {criticResult && (
              <div style={{ fontSize: 10.5, fontWeight: 600, color: criticResult.approved ? 'var(--color-success)' : '#F59E0B', fontFamily: "var(--font-mono)" }}>
                Quality {criticResult.totalScore}/100
              </div>
            )}
          </div>
          {hook && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: cta ? 6 : 0 }}><strong style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Hook:</strong> {hook.slice(0, 120)}{hook.length > 120 ? '…' : ''}</div>}
          {cta && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}><strong style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>CTA:</strong> {cta.slice(0, 120)}{cta.length > 120 ? '…' : ''}</div>}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--color-error)' }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!name.trim() || saving}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          background: name.trim() && !saving ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${name.trim() && !saving ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
          color: name.trim() && !saving ? '#F59E0B' : 'rgba(255,255,255,0.3)',
          borderRadius: 9, padding: '11px 0', cursor: name.trim() && !saving ? 'pointer' : 'default',
          fontSize: 13, fontWeight: 600, transition: 'all .18s',
        }}
      >
        {saving ? (
          <><div style={{ width: 11, height: 11, border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'rp-spin .7s linear infinite', flexShrink: 0 }} /> Saving…</>
        ) : (
          <><Bookmark size={12} /> Save Template</>
        )}
      </button>
    </div>
  );
}
