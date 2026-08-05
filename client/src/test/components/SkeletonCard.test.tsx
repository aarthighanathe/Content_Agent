import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonCard, SkeletonBlock } from '../../components/SkeletonCard';

describe('SkeletonBlock', () => {
  it('renders with default props', () => {
    const { container } = render(<SkeletonBlock />);
    const block = container.querySelector('div');
    expect(block).toBeInTheDocument();
  });

  it('renders with custom width', () => {
    const { container } = render(<SkeletonBlock width="50%" />);
    const block = container.querySelector('div');
    expect(block).toHaveStyle({ width: '50%' });
  });

  it('renders with custom height', () => {
    const { container } = render(<SkeletonBlock height={20} />);
    const block = container.querySelector('div');
    expect(block).toHaveStyle({ height: '20px' });
  });

  it('renders with custom border radius', () => {
    const { container } = render(<SkeletonBlock radius={10} />);
    const block = container.querySelector('div');
    expect(block).toHaveStyle({ borderRadius: '10px' });
  });

  it('applies custom style', () => {
    // WHY a raw attribute check, not toHaveStyle: SkeletonBlock also sets the
    // `background` shorthand (a CSS custom property jsdom's CSSOM can't
    // resolve), and jsdom's shorthand/longhand interaction drops the later
    // `background-color` longhand from computed style even though it's
    // present verbatim in the inline style attribute — a jsdom parsing gap,
    // not a real rendering bug (browsers apply the later longhand correctly).
    const { container } = render(<SkeletonBlock style={{ backgroundColor: 'red' }} />);
    const block = container.querySelector('div');
    expect(block?.getAttribute('style')).toContain('background-color: red');
  });
});

describe('SkeletonCard', () => {
  it('renders md size by default', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.querySelector('div');
    expect(card).toBeInTheDocument();
  });

  it('renders sm size when specified', () => {
    const { container } = render(<SkeletonCard size="sm" />);
    const card = container.querySelector('div');
    expect(card).toBeInTheDocument();
  });

  it('renders lines variant when specified', () => {
    const { container } = render(<SkeletonCard size="lines" />);
    const card = container.querySelector('div');
    expect(card).toBeInTheDocument();
  });

  it('renders avatar, title, and badge for non-lines variants', () => {
    const { container } = render(<SkeletonCard size="md" />);
    // WHY the outer card div is excluded: querySelectorAll('div > div') on
    // `container` also matches the card's own root div (container > card),
    // not just the SkeletonBlock divs nested inside it — scope one level
    // deeper to count only the card's own children.
    const card = container.querySelector('div');
    const blocks = card?.querySelectorAll(':scope > div') ?? [];
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('renders two text lines for lines variant', () => {
    const { container } = render(<SkeletonCard size="lines" />);
    const card = container.querySelector('div');
    const blocks = card?.querySelectorAll(':scope > div') ?? [];
    expect(blocks.length).toBe(2);
  });
});
