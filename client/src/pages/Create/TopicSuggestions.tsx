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

  if (!open || suggestions.length === 0) return null;

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Recent topics"
      style={{
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
        background: '#0D0D24', border: '1px solid rgba(245,158,11,0.22)',
        borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
        zIndex: 30, overflow: 'hidden', maxHeight: 200, overflowY: 'auto',
      }}
    >
      <div style={{ padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: "var(--font-mono)", fontSize: 8.5, color: 'rgba(255,255,255,0.22)', letterSpacing: 1, textTransform: 'uppercase' }}>
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
            cursor: 'pointer', color: 'rgba(255,255,255,0.72)', fontSize: 12.5,
            textAlign: 'left', fontFamily: "'Inter',sans-serif",
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: i === activeIndex ? 'rgba(245,158,11,0.07)' : 'none',
          }}
        >
          <RefreshCw size={10} style={{ color: 'rgba(245,158,11,0.5)', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</span>
        </button>
      ))}
    </div>
  );
}
