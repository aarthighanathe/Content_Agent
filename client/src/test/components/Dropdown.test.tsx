import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from '../../components/Dropdown';

describe('Dropdown', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('renders dropdown trigger with selected option', () => {
    render(<Dropdown options={options} value="option1" onChange={vi.fn()} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('opens dropdown menu when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<Dropdown options={options} value="option1" onChange={vi.fn()} />);
    
    await user.click(screen.getByText('Option 1'));
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Dropdown options={options} value="option1" onChange={handleChange} />);
    
    await user.click(screen.getByText('Option 1'));
    await user.click(screen.getByText('Option 2'));
    
    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Dropdown options={options} value="option1" onChange={vi.fn()} />
        <div data-testid="outside">Outside</div>
      </div>
    );
    
    await user.click(screen.getByText('Option 1'));
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    
    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Dropdown options={options} value="option1" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('displays label when provided', () => {
    render(<Dropdown options={options} value="option1" onChange={vi.fn()} label="Choose option" />);
    expect(screen.getByRole('button', { name: 'Choose option' })).toBeInTheDocument();
  });
});
