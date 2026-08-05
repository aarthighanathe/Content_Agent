import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string | number> {
  value: T;
  options: ReadonlyArray<DropdownOption<T>>;
  onChange: (value: T) => void;
  label?: string;
  disabled?: boolean;
  /** 'sm' for compact contexts (e.g. inline toolbars, mobile) — defaults to the standard size. */
  size?: 'sm' | 'md';
}

// WHY a custom listbox instead of a native <select>: native selects render with the
// OS/browser's own popup styling (system font, platform accent color) that can't be
// themed via CSS, so they break out of the app's dark, per-theme design system — this
// is the one shared dropdown component all pages should use for value pickers.
export function Dropdown<T extends string | number>({
  value, options, onChange, label, disabled = false, size = 'md',
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  // WHY set together, not derived via a separate open-triggered effect: setting
  // activeIndex synchronously inside an effect body causes an extra cascading render
  // on every open. Since every code path that opens the dropdown already knows
  // selectedIndex at that moment, resetting both in the same event handler avoids it.
  function openDropdown(): void {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>): void {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDropdown();
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
      }
      return;
    }
    if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
          gap: size === 'sm' ? 6 : 10,
          background: 'var(--bg-base)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--rule)'}`,
          borderRadius: 9,
          padding: size === 'sm' ? '6px 9px' : '9px 12px',
          minWidth: size === 'sm' ? 88 : 120,
          color: 'var(--text-primary)', fontSize: size === 'sm' ? 12 : 13, fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color .15s',
        }}
      >
        <span>{selected?.label}</span>
        <ChevronDown
          size={size === 'sm' ? 12 : 14}
          color="var(--text-muted)"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s', flexShrink: 0 }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--bg-card)', border: '1px solid var(--rule)',
            borderRadius: 9, overflow: 'hidden', zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            maxHeight: 240, overflowY: 'auto',
          }}
          ref={(el) => { if (el) el.focus(); }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <div
                key={opt.value}
                ref={(el) => { optionRefs.current[i] = el; }}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                  color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
