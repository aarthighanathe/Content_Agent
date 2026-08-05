import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RowActionStrip } from '../../components/RowActionStrip';
import { Trash2, Edit, Copy } from 'lucide-react';

describe('RowActionStrip', () => {
  const actions = [
    { key: 'edit', Icon: Edit, label: 'Edit', onClick: vi.fn() },
    { key: 'copy', Icon: Copy, label: 'Copy', onClick: vi.fn() },
    { key: 'delete', Icon: Trash2, label: 'Delete', onClick: vi.fn(), danger: true },
  ];

  it('renders all actions', () => {
    render(<RowActionStrip actions={actions} />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onClick when action button is clicked', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    
    const testActions = [
      { key: 'edit', Icon: Edit, label: 'Edit', onClick: handleEdit },
      { key: 'delete', Icon: Trash2, label: 'Delete', onClick: handleDelete, danger: true },
    ];
    
    render(<RowActionStrip actions={testActions} />);
    
    await user.click(screen.getByText('Edit'));
    expect(handleEdit).toHaveBeenCalledTimes(1);
    
    await user.click(screen.getByText('Delete'));
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('applies danger styling to danger actions', () => {
    render(<RowActionStrip actions={actions} />);
    const deleteButton = screen.getByText('Delete').closest('button');
    expect(deleteButton).toHaveStyle({ color: 'var(--color-error)' });
  });

  it('does not apply danger styling to non-danger actions', () => {
    render(<RowActionStrip actions={actions} />);
    const editButton = screen.getByText('Edit').closest('button');
    expect(editButton).toHaveStyle({ color: 'var(--text-secondary)' });
  });

  it('stops event propagation when action is clicked', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleRowClick = vi.fn();
    
    const testActions = [
      { key: 'edit', Icon: Edit, label: 'Edit', onClick: handleEdit },
    ];
    
    render(
      <div onClick={handleRowClick}>
        <RowActionStrip actions={testActions} />
      </div>
    );
    
    await user.click(screen.getByText('Edit'));
    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleRowClick).not.toHaveBeenCalled();
  });

  it('renders icons for each action', () => {
    render(<RowActionStrip actions={actions} />);
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBe(3);
  });

  it('has correct ARIA attributes', () => {
    render(<RowActionStrip actions={actions} />);
    const strip = screen.getByRole('group');
    expect(strip).toHaveAttribute('aria-label', 'Row actions');
  });

  it('renders empty when no actions provided', () => {
    render(<RowActionStrip actions={[]} />);
    const strip = screen.getByRole('group');
    expect(strip.children).toHaveLength(0);
  });
});
