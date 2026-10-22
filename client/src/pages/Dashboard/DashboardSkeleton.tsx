import { SkeletonBlock, SkeletonCard } from '../../components/SkeletonCard';

function StatSkeleton() {
  return (
    <div className="dash-stat-card" aria-hidden="true">
      <SkeletonBlock width={40} height={40} radius={11} style={{ marginBottom: 14 }} />
      <SkeletonBlock width={90} height={8} radius={4} style={{ marginBottom: 10 }} />
      <SkeletonBlock width={72} height={28} radius={6} />
    </div>
  );
}

function PanelSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className="card" aria-hidden="true" style={{ minHeight: tall ? 240 : 180 }}>
      <SkeletonBlock width={140} height={10} radius={4} style={{ marginBottom: 18 }} />
      <SkeletonBlock width="100%" height={tall ? 150 : 96} radius={10} />
    </div>
  );
}

/**
 * One placeholder for the whole dashboard. Sections used to resolve on their
 * own clocks, so stats, the schedule strip, and the job list popped in
 * separately and the feed row appeared and then vanished.
 */
export function DashboardSkeleton() {
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
          <SkeletonBlock width="42%" height={11} radius={5} style={{ marginBottom: 6 }} />
          <SkeletonBlock width="28%" height={9} radius={4} />
        </div>
      </div>

      <div className="card" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
        <SkeletonBlock width={38} height={38} radius={10} />
        <div style={{ flex: 1 }}>
          <SkeletonBlock width="55%" height={11} radius={5} style={{ marginBottom: 6 }} />
          <SkeletonBlock width="35%" height={9} radius={4} />
        </div>
      </div>

      <div>
        <SkeletonBlock width={140} height={8} radius={4} style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonCard size="md" />
          <SkeletonCard size="md" />
          <SkeletonCard size="md" />
        </div>
      </div>

      <div className="grid-halves" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <PanelSkeleton tall />
        <PanelSkeleton tall />
      </div>

      <div className="grid-halves" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    </div>
  );
}
