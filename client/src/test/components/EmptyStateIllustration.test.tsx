import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EmptyStateIllustration } from '../../components/EmptyStateIllustration';

describe('EmptyStateIllustration', () => {
  it('renders dashboard variant', () => {
    render(<EmptyStateIllustration variant="dashboard" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders history variant', () => {
    render(<EmptyStateIllustration variant="history" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders search variant', () => {
    render(<EmptyStateIllustration variant="search" />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with default size', () => {
    const { container } = render(<EmptyStateIllustration variant="dashboard" />);
    expect(container.querySelector('div[aria-hidden]')).toHaveStyle({ width: '96px' });
  });

  it('renders with custom size', () => {
    const { container } = render(<EmptyStateIllustration variant="dashboard" size={120} />);
    expect(container.querySelector('div[aria-hidden]')).toHaveStyle({ width: '120px' });
  });

  it('applies custom style', () => {
    const { container } = render(<EmptyStateIllustration variant="dashboard" style={{ marginTop: '20px' }} />);
    expect(container.querySelector('div[aria-hidden]')).toHaveStyle({ marginTop: '20px' });
  });

  it('has aria-hidden attribute', () => {
    const { container } = render(<EmptyStateIllustration variant="dashboard" />);
    expect(container.querySelector('div[aria-hidden]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders dashboard illustration with circles and lines', () => {
    render(<EmptyStateIllustration variant="dashboard" />);
    const circles = document.querySelectorAll('circle');
    const lines = document.querySelectorAll('line');
    expect(circles.length).toBeGreaterThan(0);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('renders history illustration with clock', () => {
    render(<EmptyStateIllustration variant="history" />);
    const circles = document.querySelectorAll('circle');
    const paths = document.querySelectorAll('path');
    expect(circles.length).toBe(1);
    expect(paths.length).toBe(1);
  });

  it('renders search illustration with magnifier', () => {
    render(<EmptyStateIllustration variant="search" />);
    const rects = document.querySelectorAll('rect');
    const circles = document.querySelectorAll('circle');
    expect(rects.length).toBe(1);
    expect(circles.length).toBe(1);
  });
});
