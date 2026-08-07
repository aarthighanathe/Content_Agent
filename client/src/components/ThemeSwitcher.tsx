import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { useAppStore, type ThemeName } from '../store';

interface ThemeOption {
  id: ThemeName;
  label: string;
  swatch: string;
}

// WHY swatch hex duplicated here (not read from CSS vars): the picker must show
// all 6 options at once, but only one [data-theme] block is active in the DOM at
// a time — there is no live var(--accent) to read for the other 5 themes.
const THEME_OPTIONS: ThemeOption[] = [
  { id: 'aurora', label: 'Aurora', swatch: '#F59E0B' },
  { id: 'deep-marine', label: 'Deep Marine', swatch: '#FF6F59' },
  { id: 'obsidian-ember', label: 'Obsidian Ember', swatch: '#FF7A1A' },
  { id: 'nightshade', label: 'Nightshade', swatch: '#C6FF3D' },
  { id: 'ink-verdigris', label: 'Ink & Verdigris', swatch: '#4FBF9F' },
  { id: 'carbon-signal', label: 'Carbon Signal', swatch: '#F5C518' },
];

interface ThemeSwitcherProps {
  /** Icon-only trigger for the collapsed sidebar; full label + trigger otherwise. */
  collapsed?: boolean;
  /** Menu opens above the trigger instead of below (for bottom-anchored triggers). */
  align?: 'up' | 'down';
}

export function ThemeSwitcher({ collapsed = false, align = 'down' }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  const themeName = useAppStore((s) => s.themeName);
  const setTheme = useAppStore((s) => s.setTheme);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(e: PointerEvent): void {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // WHY fixed-position portal: the sidebar container has overflow:hidden (for the
  // collapse/expand width transition), which clipped this menu when it was a plain
  // absolutely-positioned child. Rendering to document.body with coordinates computed
  // from the trigger's rect escapes that clipping context.
  // NOTE: Boundary checks already implemented - menu flips up/down and stays within viewport
  useLayoutEffect(() => {
    if (!open || !containerRef.current) return undefined;

    function updatePosition(): void {
      const rect = containerRef.current!.getBoundingClientRect();
      const menuWidth = 190;
      // 6 options x ~34px row + padding — approximate, only used for the fits-below check.
      const menuHeight = 230;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const pos: { top?: number; bottom?: number; left?: number; right?: number } = {};

      // Open downward/upward per `align`, but flip if the menu wouldn't fit in that
      // direction — otherwise it renders past the bottom (or top) of the viewport,
      // as happened with the mobile landing menu's low-on-page trigger.
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = align === 'up' ? spaceAbove >= menuHeight || spaceAbove >= spaceBelow
        : spaceBelow < menuHeight && spaceAbove > spaceBelow;

      if (openUp) {
        pos.bottom = Math.max(8, viewportHeight - rect.top + 6);
      } else {
        pos.top = Math.min(rect.bottom + 6, viewportHeight - menuHeight - 8);
      }

      // Prefer aligning to the trigger's left edge, but keep the menu on-screen.
      let left = collapsed ? rect.left : rect.right - menuWidth;
      left = Math.max(8, Math.min(left, viewportWidth - menuWidth - 8));
      pos.left = left;

      setMenuPos(pos);
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, align, collapsed]);

  const active = THEME_OPTIONS.find((t) => t.id === themeName) ?? THEME_OPTIONS[0];

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={collapsed ? 'Change theme' : undefined}
        title="Change theme"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          padding: collapsed ? 6 : '6px 10px',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: 12.5,
          fontFamily: 'var(--font-sans)',
          justifyContent: collapsed ? 'center' : undefined,
          width: collapsed ? 30 : undefined,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: active.swatch,
            flexShrink: 0,
            boxShadow: `0 0 6px ${active.swatch}88`,
          }}
        />
        {!collapsed && <span>{active.label}</span>}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Choose theme"
          style={{
            position: 'fixed',
            top: menuPos.top,
            bottom: menuPos.bottom,
            left: menuPos.left,
            minWidth: 190,
            maxHeight: 'calc(100vh - 16px)',
            overflowY: 'auto',
            background: 'var(--bg-card)',
            border: '1px solid var(--rule)',
            borderRadius: 10,
            padding: 6,
            zIndex: 1000,
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {THEME_OPTIONS.map((option) => {
            const isActive = option.id === themeName;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setTheme(option.id);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 7,
                  background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 12.5,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: option.swatch,
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${option.swatch}88`,
                  }}
                />
                <span style={{ flex: 1 }}>{option.label}</span>
                {isActive && <Check size={13} style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
