import { SkeletonBlock } from '../../components/SkeletonCard';

function SectionSkeleton({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
        <SkeletonBlock width={26} height={26} radius={7} />
        <SkeletonBlock width={130} height={12} radius={4} />
      </div>
      {children}
    </div>
  );
}

/** Same stack as a finished competitor analysis: header, two columns, compare card. */
export function CompetitorSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <span className="sr-only">Analyzing competitor</span>
      <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 14, padding: '22px 24px' }}>
        <SkeletonBlock width={72} height={9} radius={4} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="42%" height={21} radius={6} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="28%" height={12} radius={4} />
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--rule)' }}>
          <SkeletonBlock width="100%" height={13} radius={4} />
          <SkeletonBlock width="74%" height={13} radius={4} delay={0.1} style={{ marginTop: 8 }} />
        </div>
      </div>

      <div className="comp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SectionSkeleton>
          {['theme-a', 'theme-b', 'theme-c', 'theme-d'].map((id) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <SkeletonBlock width={4} height={4} radius={2} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <SkeletonBlock width="68%" height={12} radius={4} />
                <SkeletonBlock width="36%" height={9} radius={4} delay={0.05} style={{ marginTop: 4 }} />
              </div>
              <SkeletonBlock width={52} height={16} radius={20} />
            </div>
          ))}
        </SectionSkeleton>
        <SectionSkeleton>
          {['format', 'hook', 'cta'].map((id) => (
            <div key={id} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <SkeletonBlock width={80} height={10} radius={4} />
              <SkeletonBlock width="55%" height={12} radius={4} />
            </div>
          ))}
        </SectionSkeleton>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
          <SkeletonBlock width={26} height={26} radius={7} />
          <SkeletonBlock width={140} height={12} radius={4} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', alignItems: 'center' }}>
          <SkeletonBlock width={28} height={9} radius={4} />
          <SkeletonBlock width={48} height={9} radius={4} />
          <SkeletonBlock width={64} height={22} radius={6} />
          <SkeletonBlock height={12} radius={4} width="70%" />
        </div>
      </div>
    </div>
  );
}
