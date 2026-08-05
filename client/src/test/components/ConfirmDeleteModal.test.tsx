import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';

describe('ConfirmDeleteModal', () => {
  it('renders title and message', () => {
    render(
      <ConfirmDeleteModal
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();
    render(
      <ConfirmDeleteModal
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );
    
    await user.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(
      <ConfirmDeleteModal
        title="Delete Item"
        message="Are you sure?"
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );
    
    await user.click(screen.getByText('Delete'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows typed confirmation input when provided', () => {
    render(
      <ConfirmDeleteModal
        title="Delete Account"
        message="This action cannot be undone"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        typedConfirmation={{ requiredText: 'DELETE' }}
      />
    );
    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
  });

  it('disables confirm button until typed text matches required text', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(
      <ConfirmDeleteModal
        title="Delete Account"
        message="This action cannot be undone"
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
        typedConfirmation={{ requiredText: 'DELETE' }}
      />
    );
    
    const confirmButton = screen.getByText('Delete');
    expect(confirmButton).toBeDisabled();
    
    const input = screen.getByPlaceholderText('DELETE');
    await user.type(input, 'DELETE');
    
    expect(confirmButton).not.toBeDisabled();
  });

  it('shows custom confirm label when provided', () => {
    render(
      <ConfirmDeleteModal
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        confirmLabel="Remove"
      />
    );
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('shows pending label when isPending is true', () => {
    render(
      <ConfirmDeleteModal
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isPending
        pendingLabel="Deleting…"
      />
    );
    expect(screen.getByText('Deleting…')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(
      <ConfirmDeleteModal
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        error="Failed to delete item"
      />
    );
    expect(screen.getByText('Failed to delete item')).toBeInTheDocument();
  });

  it('closes on backdrop click when not pending', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();
    render(
      <ConfirmDeleteModal
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );
    
    const backdrop = screen.getByRole('dialog').parentElement;
    if (backdrop) {
      await user.click(backdrop);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    }
  });

  it('has correct ARIA attributes', () => {
    render(
      <ConfirmDeleteModal
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
