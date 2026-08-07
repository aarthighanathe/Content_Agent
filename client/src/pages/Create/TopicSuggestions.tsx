import { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface TopicSuggestionsProps {
  suggestions: string[];
  open: boolean;
  onClose: () => void;
  onPick: (topic: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

// WHY a dedicated component with roving activeIndex: the previous dropdown only
// supported onMouseDown selection, so a keyboard-only user could open it (via
// focus) but had no way to actually choose a suggestion. This adds ArrowUp/Down,
// Enter, and Escape on the textarea, wired through the same onKeyDown handler.
export function TopicSuggestions({ suggestions, open, onClose, onPick, inputRef }: TopicSuggestionsProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // WHY a plain effect (accepted lint warning): this repo's lint rules forbid
  // reading/writing refs during render (React Compiler rule), which rules out
  // the usual "adjust state during render" escape hatch for resetting on close.
  // The extra render this causes is a single cheap state reset, not worth a
  // less-supported workaround.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => { setActiveIndex(-1); }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return undefined;

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (!open || suggestions.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        onPick(suggestions[activeIndex]);
        setActiveIndex(-1);
      } else if (e.key === 'Escape') {
        setActiveIndex(-1);
        onClose();
      }
    }

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [open, suggestions, activeIndex, onPick, onClose, inputRef]);

  if (!open) return null;

  // WHY show an empty-state row instead of rendering nothing: a first-time user
  // with no recent topics yet previously saw no feedback at all on focus, which
  // read as broken rather than "you haven't generated anything yet."
  if (suggestions.length === 0) {
    return (
      <div
        role="listbox"
        aria-label="Recent topics"
        style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--rule)',
          borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
          zIndex: 50, overflow: 'hidden',
        }}
      >
        <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Your recent topics will appear here
        </div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Recent topics"
      style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
        background: 'var(--bg-card)', border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
        borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
        zIndex: 50, overflow: 'hidden', maxHeight: 200, overflowY: 'auto',
      }}
    >
      <div style={{ padding: '7px 12px', borderBottom: '1px solid var(--rule)', fontFamily: "var(--font-mono)", fontSize: 8.5, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
        Recent topics
      </div>
      {suggestions.map((t, i) => (
        <button
          key={t}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          onMouseDown={() => onPick(t)}
          onMouseEnter={() => setActiveIndex(i)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', border: 'none',
            cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12.5,
            textAlign: 'left', fontFamily: "'Inter',sans-serif",
            borderBottom: '1px solid var(--rule)',
            background: i === activeIndex ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : 'none',
          }}
        >
          <RefreshCw size={10} style={{ color: 'color-mix(in srgb, var(--accent) 50%, transparent)', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</span>
        </button>
      ))}
    </div>
  );
}
