import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityTierBadge } from '../../components/QualityTierBadge';

describe('QualityTierBadge', () => {
  it('renders dash when score is null', () => {
    render(<QualityTierBadge score={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders dash when score is undefined', () => {
    render(<QualityTierBadge score={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders "Exceptional" tier for score >= 95', () => {
    render(<QualityTierBadge score={95} />);
    expect(screen.getByText('Exceptional')).toBeInTheDocument();
  });

  it('renders "Strong" tier for score >= 85', () => {
    render(<QualityTierBadge score={85} />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('renders "Solid" tier for score >= 70', () => {
    render(<QualityTierBadge score={70} />);
    expect(screen.getByText('Solid')).toBeInTheDocument();
  });

  it('renders "Needs Work" tier for score < 70', () => {
    render(<QualityTierBadge score={69} />);
    expect(screen.getByText('Needs Work')).toBeInTheDocument();
  });

  it('clamps score to 100 when above', () => {
    render(<QualityTierBadge score={150} />);
    expect(screen.getByText('Exceptional')).toBeInTheDocument();
  });

  it('clamps score to 0 when below', () => {
    render(<QualityTierBadge score={-10} />);
    expect(screen.getByText('Needs Work')).toBeInTheDocument();
  });

  it('renders SVG ring for valid score', () => {
    render(<QualityTierBadge score={80} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(<QualityTierBadge score={80} className="custom-class" />);
    const badge = document.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });

  it('renders sm size by default', () => {
    render(<QualityTierBadge score={80} size="sm" />);
    const badge = screen.getByText('Solid');
    expect(badge).toBeInTheDocument();
  });

  it('renders md size when specified', () => {
    render(<QualityTierBadge score={80} size="md" />);
    const badge = screen.getByText('Solid');
    expect(badge).toBeInTheDocument();
  });
});
