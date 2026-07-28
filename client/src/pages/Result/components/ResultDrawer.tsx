import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface Props {
  title:    string;
  onClose:  () => void;
  children: React.ReactNode;
}

export function ResultDrawer({ title, onClose, children }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // SECURITY/ACCESSIBILITY: Escape-to-close, cleaned up on unmount.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useFocusTrap(drawerRef, true);

  return (
    <>
      <div className="rp-drawer-backdrop" onClick={onClose} />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-drawer-title"
        className="rp-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rp-drawer-hd">
          <span id="result-drawer-title" className="rp-drawer-title">{title}</span>
          <button className="rp-drawer-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="rp-drawer-body">
          {children}
        </div>
      </div>
    </>
  );
}
