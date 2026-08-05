import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, Lightbulb, Layers, RefreshCw, X } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { timeAgo, navigateToCreate } from '../../lib/utils';
import { QualityTierBadge } from '../../components/QualityTierBadge';
import { SkeletonCard } from '../../components/SkeletonCard';
import type { DashboardJob } from './dashboardTypes';
import { getContentTotalScore } from './dashboardTypes';

const DASHBOARD_LIMIT = 5;

const statusBadges: Record<string, string> = {
  pending: 'badge-orange', researching: 'badge-blue', writing: 'badge-purple',
  formatting: 'badge-cyan', critiquing: 'badge-pink', done: 'badge-green', failed: 'badge-red',
};

interface RecentGenerationsProps {
  jobs: DashboardJob[];
  loading: boolean;
  onNavigate: (path: string, options?: { state?: unknown }) => void;
  onRequestDelete: (jobId: string) => void;
}

export function RecentGenerations({ jobs, loading, onNavigate, onRequestDelete }: RecentGenerationsProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Recent generations
        </span>
        <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,var(--rule),transparent)' }} />
        <Link
          to="/library"
          style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: 'color-mix(in srgb, var(--accent) 50%, transparent)', letterSpacing: 0.5, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'color .18s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'color-mix(in srgb, var(--accent) 50%, transparent)')}
        >
          View all <ChevronRight size={10} />
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} size="md" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div
          className="dash-empty-generations"
          style={{
            background: 'var(--bg-raised)', border: '1px dashed var(--rule)', borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 'clamp(2rem,7vw,3rem) 1.5rem', textAlign: 'center',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 16, marginBottom: 16,
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent-2) 16%, transparent))',
            border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={24} color="var(--accent)" />
          </div>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(15px,3vw,19px)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            No generations yet
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 20px', maxWidth: 320, lineHeight: 1.6 }}>
            Your AI-generated posts, carousels, and threads will show up here. Create your
            first piece of content to get started.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/create" className="btn-primary">
              <Sparkles size={14} /> Create your first post
            </Link>
            <Link
              to="/ideate"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)',
                textDecoration: 'none', padding: '10px 14px', borderRadius: 10,
                border: '1px solid var(--rule)', transition: 'border-color .15s, color .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 30%, transparent)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Lightbulb size={14} /> Not sure what to post? Get ideas
            </Link>
          </div>

          <style>{`
            @media (max-width: 480px) {
              .dash-empty-generations { padding: 28px 16px !important; border-radius: 14px !important; }
              .dash-empty-generations > div:first-child { width: 48px !important; height: 48px !important; border-radius: 13px !important; margin-bottom: 12px !important; }
              .dash-empty-generations .btn-primary { width: 100%; justify-content: center; }
              .dash-empty-generations a[href="/ideate"] { width: 100%; justify-content: center; }
            }
          `}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {jobs.slice(0, DASHBOARD_LIMIT).map((job) => {
            const platform = platformMeta[job.platform] || { label: job.platform, badgeClass: 'badge-purple', color: '#A78BFA', Icon: Layers, bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.20)' }; // fixed badge-purple fallback — matches platformMeta's badge-purple semantic color, not brand accent
            const statusCls = statusBadges[job.status] || 'badge-purple';
            const critique = job.outputs?.find((o) => o.outputType === 'critique');
            const qualityScore: number | null = critique?.qualityScore ?? getContentTotalScore(critique?.content) ?? null;
            return (
              <div
                key={job.id}
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 13, overflow: 'hidden' }}
              >
                <div
                  className="dash-job-row"
                  role="button"
                  tabIndex={0}
                  aria-label={`View result for ${job.topic}`}
                  style={{ borderColor: 'transparent', borderRadius: 0 }}
                  onClick={() => onNavigate(`/result/${job.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(`/result/${job.id}`); } }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${platform.color}22`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}
                >
                  {/* Platform icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: platform.bg, border: `1px solid ${platform.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <platform.Icon size={15} style={{ color: platform.color }} />
                  </div>

                  {/* Topic + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, lineHeight: 1.3 }}>
                      {job.topic}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: platform.color, fontWeight: 600 }}>{platform.label}</span>
                      <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                      <span className={`badge ${statusCls}`} style={{ fontSize: 7.5 }}>{job.status}</span>
                    </div>
                  </div>

                  {/* Score + time */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <QualityTierBadge score={qualityScore} />
                    <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: "var(--font-mono)" }}>
                      {timeAgo(job.createdAt)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button
                      type="button"
                      title="Create again"
                      aria-label="Create again"
                      className="dash-row-icon-btn"
                      onClick={(e) => { e.stopPropagation(); navigateToCreate(onNavigate, { topic: job.topic, platform: job.platform }); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: 6, borderRadius: 8, cursor: 'pointer', display: 'flex' }}
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete"
                      className="dash-row-icon-btn"
                      onClick={(e) => { e.stopPropagation(); onRequestDelete(job.id); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: 6, borderRadius: 8, cursor: 'pointer', display: 'flex' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {jobs.length > DASHBOARD_LIMIT && (
            <Link to="/library" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
              View all {jobs.length} generations <ChevronRight size={13} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
