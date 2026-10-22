import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/Button';

interface Props {
  onSubmit: (feedback: string) => void;
  /** Seeded when opened from Insights “Fix with AI”. */
  initialText?: string;
}

const SUGGESTIONS = [
  'Make it shorter',
  'Stronger opening hook',
  'More casual tone',
  'Add a clearer CTA',
  'More data-driven',
] as const;

export function FeedbackPanel({ onSubmit, initialText = '' }: Props) {
  const [text, setText] = useState(initialText);

  function applySuggestion(chip: string): void {
    setText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      if (trimmed.toLowerCase().includes(chip.toLowerCase())) return trimmed;
      return `${trimmed}. ${chip}`;
    });
  }

  return (
    <div className="rp-feedback-panel">
      <div className="rp-panel-hints" role="group" aria-label="Quick suggestions">
        {SUGGESTIONS.map((chip) => (
          <button
            key={chip}
            type="button"
            className="rp-panel-chip"
            onClick={() => applySuggestion(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <textarea
        className="input"
        placeholder="e.g. More data-driven, shorter sentences, add a clearer call to action…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) {
            onSubmit(text.trim());
          }
        }}
        style={{ flex: 1, minHeight: 160, width: '100%', resize: 'vertical' }}
        autoFocus
      />

      <p className="rp-panel-footnote">
        ⌘/Ctrl + Enter to apply. The current draft stays in History.
      </p>

      <Button
        variant="primary"
        icon={<RefreshCw size={14} />}
        onClick={() => text.trim() && onSubmit(text.trim())}
        disabled={!text.trim()}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        Apply and regenerate
      </Button>
    </div>
  );
}
