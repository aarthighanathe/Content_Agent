import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Wrench, ChevronDown, X,
  Lightbulb, Link2, Search, CalendarDays,
} from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

// Tools items — ordered by user workflow: plan → research → create → schedule
// WHY still no "Batch" entry (2026-08-04, batch UI now exists): batch creation
// lives inside Create.tsx's "Plan multiple topics" toggle, not a standalone
// page — there's no separate destination worth a Tools link. /batch-result
// (formerly /batch) is a one-shot landing page reached only via a submission
// from Create; linking it directly would hit its "No batch found" empty state,
// same reasoning as before, just no longer because the feature is unbuilt.
const toolsItems = [
  { to: '/ideate',     icon: Lightbulb,   label: 'Ideate' },
  { to: '/competitor', icon: Search,      label: 'Competitor' },
  { to: '/repurpose',  icon: Link2,       label: 'Repurpose' },
  { to: '/calendar',   icon: CalendarDays, label: 'Calendar' },
];

interface ToolsDropdownProps {
  collapsed?: boolean;
  onItemClick?: () => void;
}

export function ToolsDropdown({ collapsed = false, onItemClick }: ToolsDropdownProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toolsActive = toolsItems.some(item => location.pathname.startsWith(item.to));

  const handleItemClick = () => {
    setOpen(false);
    onItemClick?.();
  };

  // SECURITY/ACCESSIBILITY: Focus trap when dropdown is open, Escape-to-close
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useFocusTrap(dropdownRef, open);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        title={collapsed ? 'Tools' : undefined}
        className={`sidebar-link ${toolsActive && !open ? 'sidebar-link-active' : ''}`}
        style={{
          background: 'none',
          border: 'none',
          padding: 'inherit',
          cursor: 'pointer',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 'inherit',
        }}
      >
        <Wrench size={15} style={{ minWidth: 15, flexShrink: 0 }} />
        <span className="sidebar-link-label" style={{ flex: 1, textAlign: 'left' }}>
          Tools
        </span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Tools Dropdown Menu */}
      {open && !collapsed && (
        <div
          ref={dropdownRef}
          role="menu"
          aria-label="Tools menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 8,
            right: 8,
            marginTop: 4,
            background: 'var(--bg-card)',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {toolsItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleItemClick}
              role="menuitem"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                fontSize: 13,
                margin: 0,
                borderRadius: 0,
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <item.icon size={14} style={{ minWidth: 14, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

interface ToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onItemClick?: () => void;
}

export function ToolsDrawer({ isOpen, onClose, onItemClick }: ToolsDrawerProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleItemClick = () => {
    onClose();
    onItemClick?.();
  };

  // SECURITY/ACCESSIBILITY: Escape-to-close, cleaned up on unmount/deactivation.
  useEffect(() => {
    if (!isOpen) return undefined;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useFocusTrap(sheetRef, isOpen);

  return (
    <>
      {isOpen && (
        <div className="mobile-overlay" onClick={onClose} />
      )}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Tools"
        aria-hidden={!isOpen}
        className={`mobile-more-sheet${isOpen ? ' mobile-more-sheet-open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-more-handle" />
        <div className="mobile-more-header">
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Tools</span>
          <button className="mobile-more-close" onClick={onClose} aria-label="Close">
            <X size={24} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />
          </button>
        </div>
        <div className="mobile-more-grid">
          {toolsItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleItemClick}
              className={({ isActive }) =>
                `mobile-more-item${isActive ? ' mobile-more-item-active' : ''}`
              }
            >
              <div className="mobile-more-item-icon">
                <item.icon size={20} />
              </div>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}
