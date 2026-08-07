/**
 * Create/BatchTopicList.tsx — tests against the real component.
 *
 * WHY this suite exists: this component had zero test coverage — Create.test.tsx
 * (the only file that so much as mentioned it) is a literal `expect(true).toBe(true)`
 * placeholder whose own comment lists "Batch creation mode" under "TODO: Add
 * comprehensive tests for". The review flagged the concrete risk: a regression
 * that let an 8th row be added would pass client-side but get silently
 * truncated/rejected by the server's own independent `.max(7)`, a confusing
 * UX bug only caught by a user filing a bug report.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchTopicList, MAX_BATCH_ROWS, type BatchRow } from '../../pages/Create/BatchTopicList';

function makeRows(count: number): BatchRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    topic: '',
    platform: 'instagram_carousel',
  }));
}

function renderList(overrides: Partial<Parameters<typeof BatchTopicList>[0]> = {}) {
  const defaults = {
    rows: makeRows(1),
    onRowsChange: vi.fn(),
    tone: '',
    onToneChange: vi.fn(),
    targetAudience: '',
    onTargetAudienceChange: vi.fn(),
    loading: false,
    errorMsg: '',
    onSubmit: vi.fn(),
  };
  // WHY typed via an explicit intersection, not `{ ...defaults, ...overrides }`
  // inferred alone: spreading a Partial<Props> over the defaults widens each
  // mocked callback's inferred type back to the plain Props function
  // signature (`(rows: BatchRow[]) => void`), losing the `Mock` type
  // `onRowsChange.mock.calls` below needs — this keeps defaults' concrete
  // `vi.fn()` types while still letting a test override any individual prop.
  const props = { ...defaults, ...overrides } as typeof defaults & typeof overrides;
  render(<BatchTopicList {...props} />);
  return props;
}

describe('BatchTopicList', () => {
  it('renders one row per item in `rows`', () => {
    renderList({ rows: makeRows(3) });
    expect(screen.getAllByPlaceholderText('Topic for this post…')).toHaveLength(3);
  });

  it('the "Add topic" button is disabled once rows.length reaches MAX_BATCH_ROWS', () => {
    renderList({ rows: makeRows(MAX_BATCH_ROWS) });
    const addButton = screen.getByRole('button', { name: /Add topic/i });
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveTextContent(`max ${MAX_BATCH_ROWS}`);
  });

  it('the "Add topic" button is enabled and shows a live count below the max', () => {
    renderList({ rows: makeRows(3) });
    const addButton = screen.getByRole('button', { name: /Add topic/i });
    expect(addButton).not.toBeDisabled();
    expect(addButton).toHaveTextContent(`3/${MAX_BATCH_ROWS}`);
  });

  it('clicking "Add topic" below the max calls onRowsChange with one more row appended', async () => {
    const user = userEvent.setup();
    const { onRowsChange } = renderList({ rows: makeRows(2) });

    await user.click(screen.getByRole('button', { name: /Add topic/i }));

    expect(onRowsChange).toHaveBeenCalledTimes(1);
    const newRows = onRowsChange.mock.calls[0][0] as BatchRow[];
    expect(newRows).toHaveLength(3);
    expect(newRows[2].topic).toBe('');
  });

  it('removeRow (trash icon) is disabled when only one row remains — cannot remove the last row', () => {
    renderList({ rows: makeRows(1) });
    const removeButton = screen.getByRole('button', { name: /Remove this topic/i });
    expect(removeButton).toBeDisabled();
  });

  it('removeRow (trash icon) is enabled and calls onRowsChange when more than one row exists', async () => {
    const user = userEvent.setup();
    const rows = makeRows(2);
    const { onRowsChange } = renderList({ rows });

    const removeButtons = screen.getAllByRole('button', { name: /Remove this topic/i });
    expect(removeButtons[0]).not.toBeDisabled();
    await user.click(removeButtons[0]);

    expect(onRowsChange).toHaveBeenCalledWith([rows[1]]);
  });

  it('typing in a row\'s topic input calls onRowsChange with that row updated, others untouched', async () => {
    const user = userEvent.setup();
    const rows = makeRows(2);
    const { onRowsChange } = renderList({ rows });

    const inputs = screen.getAllByPlaceholderText('Topic for this post…');
    await user.type(inputs[0], 'A');

    expect(onRowsChange).toHaveBeenCalled();
    const lastCall = onRowsChange.mock.calls[onRowsChange.mock.calls.length - 1][0] as BatchRow[];
    expect(lastCall[0].topic).toBe('A');
    expect(lastCall[1]).toEqual(rows[1]);
  });

  it('a lone 1-2 character topic leaves validRowCount at 0, disabling submit before validation can even run', () => {
    // WHY this, not clicking the button: validRowCount only counts rows with
    // topic.trim().length >= 3, so a single 2-char row alone means the submit
    // button is disabled — handleSubmitWithValidation never fires. The
    // inline "must be at least 3 characters" error path is only reachable
    // when at least one OTHER row is long enough to keep the button enabled
    // (see the next test).
    renderList({ rows: [{ id: 'r1', topic: 'ab', platform: 'instagram_carousel' }] });
    expect(screen.getByRole('button', { name: /^Generate/i })).toBeDisabled();
  });

  it('submitting flags a too-short row with an inline error and blocks the whole submission, even with another valid row present', async () => {
    const user = userEvent.setup();
    const rows: BatchRow[] = [
      { id: 'r1', topic: 'ab', platform: 'instagram_carousel' },
      { id: 'r2', topic: 'A valid topic', platform: 'linkedin_post' },
    ];
    const onRowsChange = vi.fn();
    const onSubmit = vi.fn();
    renderList({ rows, onRowsChange, onSubmit });

    await user.click(screen.getByRole('button', { name: /Generate/i }));

    const validated = onRowsChange.mock.calls[0][0] as BatchRow[];
    expect(validated[0].error).toBe('Topic must be at least 3 characters');
    expect(validated[1].error).toBeUndefined();
    // WHY onSubmit does NOT fire here: handleSubmitWithValidation requires
    // EVERY row to be error-free (`validated.every((r) => !r.error)`) before
    // submitting — a too-short row blocks the whole batch rather than being
    // silently dropped, forcing the user to fix or clear it first.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submitting with at least one valid row (>=3 chars) and no invalid rows calls onSubmit', async () => {
    const user = userEvent.setup();
    const rows: BatchRow[] = [{ id: 'r1', topic: 'A valid topic', platform: 'instagram_carousel' }];
    const onSubmit = vi.fn();
    renderList({ rows, onSubmit });

    await user.click(screen.getByRole('button', { name: /Generate/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('a blank row alongside a valid row is not flagged as an error (partial submission is valid)', async () => {
    const user = userEvent.setup();
    const rows: BatchRow[] = [
      { id: 'r1', topic: 'A valid topic', platform: 'instagram_carousel' },
      { id: 'r2', topic: '', platform: 'linkedin_post' },
    ];
    const onSubmit = vi.fn();
    const onRowsChange = vi.fn();
    renderList({ rows, onSubmit, onRowsChange });

    await user.click(screen.getByRole('button', { name: /Generate/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const validated = onRowsChange.mock.calls[0][0] as BatchRow[];
    expect(validated[1].error).toBeUndefined();
  });

  it('the submit button is disabled while loading and shows the in-progress label', () => {
    const rows: BatchRow[] = [{ id: 'r1', topic: 'A valid topic', platform: 'instagram_carousel' }];
    renderList({ rows, loading: true });

    const submitButton = screen.getByRole('button', { name: /Generating/i });
    expect(submitButton).toBeDisabled();
  });

  it('the submit button is disabled when there are zero valid rows, even while not loading', () => {
    renderList({ rows: [{ id: 'r1', topic: '', platform: 'instagram_carousel' }] });
    // WHY the accessible name is "Generate" with no count when 0 rows are
    // valid: `Generate ${validRowCount || ''} ...` renders as bare "Generate"
    // when validRowCount is 0.
    const submitButton = screen.getByRole('button', { name: /^Generate/i });
    expect(submitButton).toBeDisabled();
  });

  it('renders the errorMsg banner when provided', () => {
    renderList({ errorMsg: 'Something went wrong on the server.' });
    expect(screen.getByText('Something went wrong on the server.')).toBeInTheDocument();
  });
});
