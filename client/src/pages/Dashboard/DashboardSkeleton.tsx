import { JobRowSkeleton, SkeletonBlock } from '../../components/SkeletonCard';

function StatSkeleton(): React.JSX.Element {
  return (
    <div className="dash-stat-card" aria-hidden="true">
      <SkeletonBlock width={40} height={40} radius={11} style={{ marginBottom: 14 }} />
      <SkeletonBlock width={90} height={8} radius={4} style={{ marginBottom: 10 }} />
      <SkeletonBlock width={72} height={34} radius={6} />
      {/* WHY the note line: loaded stat cards include a caption under the value,
          and the grid stretches to that height. */}
      <SkeletonBlock width={110} height={11} radius={4} style={{ marginTop: 10 }} />
    </div>
  );
}

function PanelHeader(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
      <SkeletonBlock width={26} height={26} radius={7} />
      <SkeletonBlock width={120} height={12} radius={4} />
    </div>
  );
}

/**
 * One placeholder for the whole dashboard, in the same order as the loaded
 * page: stats, content DNA, next scheduled post, recent rows, quality +
 * prediction, then insights. Feed health is omitted — that card stays hidden
 * until the user actually has monitors.
 */
export function DashboardSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <span className="sr-only">Loading your dashboard</span>

      <div className="grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>

      <div className="card" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px' }}>
        <SkeletonBlock width={34} height={34} radius={9} />
        <div style={{ flex: 1 }}>
          <SkeletonBlock width="42%" height={12} radius={5} style={{ marginBottom: 6 }} />
          <SkeletonBlock width="62%" height={11} radius={4} />
        </div>
        <SkeletonBlock width={52} height={10} radius={4} />
      </div>

      <div className="card" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
        <SkeletonBlock width={38} height={38} radius={10} />
        <div style={{ flex: 1 }}>
          <SkeletonBlock width="48%" height={12} radius={5} style={{ marginBottom: 6 }} />
          <SkeletonBlock width="32%" height={11} radius={4} />
        </div>
        <SkeletonBlock width={64} height={11} radius={4} />
      </div>

      <div>
        <SkeletonBlock width={140} height={8} radius={4} style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['a', 'b', 'c'].map((id) => <JobRowSkeleton key={id} />)}
        </div>
      </div>

      <div className="grid-halves" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card" aria-hidden="true">
          <PanelHeader />
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <SkeletonBlock width={220} height={220} radius={110} />
          </div>
        </div>
        <div className="card" aria-hidden="true">
          <PanelHeader />
          <SkeletonBlock height={8} radius={4} width="100%" style={{ marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 14 }}>
            {['high', 'mid', 'low'].map((id) => (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SkeletonBlock width={36} height={18} radius={4} />
                <SkeletonBlock width={48} height={9} radius={4} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-halves" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card" aria-hidden="true">
          <PanelHeader />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['one', 'two', 'three'].map((id) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <SkeletonBlock width={14} height={14} radius={3} />
                <SkeletonBlock width={64} height={8} />
                <div style={{ flex: 1 }}><SkeletonBlock width="100%" height={4} radius={2} /></div>
                <SkeletonBlock width={26} height={8} />
              </div>
            ))}
          </div>
        </div>
        <div className="card" aria-hidden="true">
          <PanelHeader />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {['tip-a', 'tip-b', 'tip-c'].map((id) => (
              <div key={id} style={{ padding: '11px 13px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--rule)', display: 'flex', gap: 11 }}>
                <SkeletonBlock width={5} height={5} radius={3} style={{ marginTop: 6 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <SkeletonBlock width="88%" height={10} />
                  <SkeletonBlock width="62%" height={7} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
