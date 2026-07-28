import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/Button';

interface Props {
  onSubmit: (feedback: string) => void;
}

export function FeedbackPanel({ onSubmit }: Props) {
  const [text, setText] = useState('');

  return (
    <div className="rp-feedback-bar">
      <input
        className="input"
        placeholder="e.g. More data-driven, add statistics…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) onSubmit(text.trim()); }}
        style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
        autoFocus
      />
      <Button variant="primary" size="sm" icon={<RefreshCw size={11} />} onClick={() => text.trim() && onSubmit(text.trim())} disabled={!text.trim()}>
        Apply
      </Button>
    </div>
  );
}
