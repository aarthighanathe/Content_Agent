import { useState } from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import { Instagram, Linkedin, XTwitter } from '../../components/BrandIcons';
import { Button } from '../../components/Button';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonBlock } from '../../components/SkeletonCard';

interface SocialConnection {
  platform: string;
  label: string;
  connected: boolean;
  displayName: string | null;
  expiresAt?: number | null;
}

interface PublishingConnectionsCardProps {
  socialConnections: SocialConnection[];
  disconnectingPlatform: string | null;
  onDisconnect: (platform: string) => void;
  /** WHY added: a failed or not-yet-loaded connections fetch previously rendered
      identically to "nothing connected" — every platform showed its disconnected
      "Connect" state either way, with no way to tell the two apart. */
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const platformMeta = [
  { platform: 'linkedin',  label: 'LinkedIn',    Icon: Linkedin,   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  desc: 'Post to your LinkedIn profile' },
  { platform: 'twitter',   label: 'Twitter / X', Icon: XTwitter,   color: '#22d3ee', bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.25)',  desc: 'Tweet from your account' },
  { platform: 'instagram', label: 'Instagram',   Icon: Instagram,  color: '#ec4899', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.25)', desc: 'Requires Instagram Business approval', soon: true },
];

export function PublishingConnectionsCard({
  socialConnections, disconnectingPlatform, onDisconnect, isLoading, isError, onRetry,
}: PublishingConnectionsCardProps) {
  // Check for expired or near-expiry LinkedIn tokens
  // WHY a frozen `now` captured once per mount instead of Date.now() at render:
  // calling Date.now() during render is impure (React Compiler purity rule) — the
  // badge would recompute on every unrelated re-render and the value could change
  // mid-render. Capturing the clock once per mount keeps the expiry badge stable
  // and render-pure; token expiry happens over days, so per-mount freshness is fine.
  const [now] = useState(() => Date.now());
  const linkedinConn = socialConnections.find(c => c.platform === 'linkedin');
  const isLinkedinExpired = linkedinConn?.connected && linkedinConn.expiresAt && linkedinConn.expiresAt < now;
  const isLinkedinNearExpiry = linkedinConn?.connected && linkedinConn.expiresAt && linkedinConn.expiresAt < now + (7 * 24 * 60 * 60 * 1000); // 7 days

  return (
    <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '3px solid rgba(96,165,250,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}><Zap size={16} /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Publishing Connections</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Post directly to your social platforms</div>
        </div>
      </div>

      {/* Token expiry warning */}
      {(isLinkedinExpired || isLinkedinNearExpiry) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: isLinkedinExpired ? 'rgba(239,68,68,0.08)' : 'rgba(250,204,21,0.08)', border: `1px solid ${isLinkedinExpired ? 'rgba(239,68,68,0.25)' : 'rgba(250,204,21,0.25)'}`, borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ color: isLinkedinExpired ? 'var(--color-error)' : '#eab308', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 11, color: isLinkedinExpired ? 'var(--color-error)' : '#eab308', lineHeight: 1.5 }}>
            {isLinkedinExpired
              ? 'Your LinkedIn access token has expired. Please reconnect your account to continue posting.'
              : 'Your LinkedIn access token will expire soon. Please reconnect your account to avoid posting issues.'}
          </div>
        </div>
      )}

      {isError ? (
        <ErrorState message="We couldn't load your publishing connections. Please try again." onRetry={onRetry} />
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 11, padding: '13px 16px' }}>
              <SkeletonBlock width={38} height={38} radius={9} delay={i * 0.1} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SkeletonBlock width="40%" height={10} />
                <SkeletonBlock width="60%" height={8} delay={0.1} />
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {platformMeta.map(({ platform, label: pLabel, Icon: PlatIcon, color, bg, border, desc, soon }) => {
          const conn = socialConnections.find(c => c.platform === platform);
          const isConnected = conn?.connected;
          return (
            <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 14, background: isConnected ? bg : 'var(--bg-raised)', border: `1px solid ${isConnected ? border : 'var(--rule)'}`, borderRadius: 11, padding: '13px 16px', transition: 'all .2s' }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: isConnected ? bg : 'color-mix(in srgb, var(--text-primary) 4%, transparent)', border: `1px solid ${isConnected ? border : 'var(--rule)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isConnected ? color : 'var(--text-muted)' }}>
                <PlatIcon size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: isConnected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{pLabel}</div>
                <div style={{ fontSize: 10.5, color: isConnected ? color : 'var(--text-muted)', fontFamily: "var(--font-mono)", marginTop: 1 }}>
                  {isConnected ? (conn?.displayName || 'Connected') : (soon ? 'Coming soon — requires app approval' : desc)}
                </div>
              </div>
              {soon ? (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)', border: '1px solid var(--rule)', borderRadius: 20, padding: '3px 9px', fontFamily: "var(--font-mono)" }}>Soon</span>
              ) : isConnected ? (
                <Button
                  variant="danger"
                  size="sm"
                  loading={disconnectingPlatform === platform}
                  onClick={() => onDisconnect(platform)}
                  style={{ flexShrink: 0 }}
                >
                  Disconnect
                </Button>
              ) : (
                <a
                  href={`/api/social/connect/${platform}`}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, background: bg, border: `1px solid ${border}`, color, borderRadius: 8, padding: '7px 13px', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, textDecoration: 'none', transition: 'all .18s' }}
                >
                  <Zap size={11} /> Connect
                </a>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
