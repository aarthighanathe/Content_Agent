import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, RefreshCw, ArrowRight, Loader2, Smartphone } from 'lucide-react';
import { generateIdeas } from '../api';
import { platformMeta } from '../lib/platformMeta';
import { navigateToCreate } from '../lib/utils';
import { SkeletonCard } from '../components/SkeletonCard';
import { useAppStore } from '../store';
import type { IdeatedIdea } from '../store';

export default function IdeatePage() {
  const navigate = useNavigate();
  // WHY store instead of local state: ideas must survive navigating to /create and back,
  // but should still reset on a hard refresh — Zustand (no persist middleware) does exactly that.
  const ideas = useAppStore((s) => s.ideatedIdeas);
  const setIdeas = useAppStore((s) => s.setIdeatedIdeas);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function fetchIdeas() {
    setLoading(true);
    setError('');
    try {
      const { ideas: newIdeas } = await generateIdeas(10);
      setIdeas(newIdeas);
    } catch {
      // WHY context-aware copy (#40): when ideas already exist and regeneration fails,
      // a generic error banner reads ambiguously \u2014 the user can't tell whether the old
      // ideas are still actionable or have been cleared. The message now explicitly
      // acknowledges the previous ideas are still shown and usable.
      setError(
        ideas.length > 0
          ? "Couldn't generate new ideas \u2014 here are your last ones. Try again when ready."
          : 'Failed to generate ideas \u2014 please try again.'
      );
    }
    setLoading(false);
  }

  function handleCreate(idea: IdeatedIdea) {
    navigateToCreate(navigate, { topic: idea.title, platform: idea.platform });
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(139,92,246,0.18))',
              border: '1px solid rgba(245,158,11,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lightbulb size={18} color="#F59E0B" />
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: '#fff', margin: 0 }}>
              Ideation Mode
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, margin: 0, maxWidth: 520 }}>
            AI generates 10 trending topic ideas based on your brand voice and industry.
            Click any idea to jump straight into creation.
          </p>
        </div>

        {/* Generate button — top-right on desktop */}
        <button
          onClick={fetchIdeas}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: loading ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg,#F59E0B,#F97316)',
            border: loading ? '1px solid rgba(245,158,11,0.2)' : 'none',
            borderRadius: 11, padding: '11px 22px',
            color: loading ? 'rgba(245,158,11,0.6)' : '#050509',
            fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .2s',
            flexShrink: 0,
          }}
        >
          {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
          {loading ? 'Generating ideas…' : ideas.length > 0 ? 'Regenerate ideas' : 'Suggest 10 topics'}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
          borderRadius: 10, padding: '12px 16px', color: 'var(--color-error)',
          fontSize: 13, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Loading skeletons — 2-column grid */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 10 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} size="lines" />
          ))}
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {/* Ideas grid — 2 columns on desktop */}
      {!loading && ideas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 10 }}>
          {ideas.map((idea, i) => {
            const meta = platformMeta[idea.platform] || { label: idea.platform, Icon: Smartphone, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' };
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                style={{
                  background: '#08081A',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 13,
                  padding: '16px 18px',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  transition: 'border-color .2s, background .2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,158,11,0.25)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(245,158,11,0.03)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLDivElement).style.background = '#08081A';
                }}
                onClick={() => handleCreate(idea)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCreate(idea); } }}
              >
                {/* Number badge */}
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "var(--font-mono)", fontSize: 11, color: '#F59E0B', fontWeight: 500,
                }}>
                  {i + 1}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.90)', lineHeight: 1.4, flex: 1 }}>
                      {idea.title}
                    </p>
                    {/* Platform pill */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: meta.bg, border: `1px solid ${meta.color}28`,
                      borderRadius: 20, padding: '2px 9px',
                      fontSize: 10.5, fontWeight: 600, color: meta.color, whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      <meta.Icon size={10} /> {meta.label}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    <span style={{ color: 'rgba(139,92,246,0.8)', fontWeight: 500 }}>Angle: </span>
                    {idea.angle}
                  </p>
                  <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.32)', lineHeight: 1.4 }}>
                    {idea.why}
                  </p>
                </div>

                {/* Arrow */}
                <ArrowRight size={14} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0, marginTop: 4 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && ideas.length === 0 && (
        <div style={{
          background: '#08081A', border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '64px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(139,92,246,0.12))',
            border: '1px solid rgba(245,158,11,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lightbulb size={26} color="rgba(245,158,11,0.7)" />
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
            No ideas yet
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.3)' }}>
            Click "Suggest 10 topics" to get AI-powered ideas tailored to your brand.
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            Tip: Set your industry in Brand Settings for better results.
          </p>
        </div>
      )}
    </div>
  );
}
