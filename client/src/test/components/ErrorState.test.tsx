import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '../../components/ErrorState';

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Something went wrong" onRetry={vi.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders default message when none provided', () => {
    render(<ErrorState onRetry={vi.fn()} />);
    expect(screen.getByText('Something went wrong while loading this data.')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<ErrorState title="Error" message="Something went wrong" onRetry={vi.fn()} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('does not render title when not provided', () => {
    render(<ErrorState message="Something went wrong" onRetry={vi.fn()} />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    render(<ErrorState message="Something went wrong" onRetry={handleRetry} />);
    
    await user.click(screen.getByText('Retry'));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders custom retry label when provided', () => {
    render(<ErrorState message="Something went wrong" onRetry={vi.fn()} retryLabel="Try again" />);
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('renders alert icon', () => {
    render(<ErrorState message="Something went wrong" onRetry={vi.fn()} />);
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
