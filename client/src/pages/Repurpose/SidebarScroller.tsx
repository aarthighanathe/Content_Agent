import type { ReactNode } from 'react';
import { VisibleScroller } from '../../components/VisibleScroller';

interface SidebarScrollerProps {
  children: ReactNode;
}

// Repurpose sidebar frame. The painted track lives in VisibleScroller.
export function SidebarScroller({ children }: SidebarScrollerProps): React.ReactElement {
  return (
    <VisibleScroller
      frameClassName="repurpose-sidebar-wrap"
      className="repurpose-sidebar-col"
      stackClassName="repurpose-sidebar-stack"
      gutter={false}
    >
      {children}
    </VisibleScroller>
  );
}
