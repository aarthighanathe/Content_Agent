import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Instagram, Linkedin, XTwitter, Twitter } from '../../components/BrandIcons';

describe('BrandIcons', () => {
  describe('Instagram', () => {
    it('renders Instagram icon', () => {
      render(<Instagram />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders with default size', () => {
      render(<Instagram />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('renders with custom size', () => {
      render(<Instagram size={24} />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('renders with custom color', () => {
      render(<Instagram color="#FF0000" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('fill', '#FF0000');
    });

    it('applies custom style', () => {
      render(<Instagram style={{ display: 'block' }} />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveStyle({ display: 'block' });
    });
  });

  describe('Linkedin', () => {
    it('renders Linkedin icon', () => {
      render(<Linkedin />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders with default size', () => {
      render(<Linkedin />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('renders with custom size', () => {
      render(<Linkedin size={32} />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '32');
      expect(svg).toHaveAttribute('height', '32');
    });
  });

  describe('XTwitter', () => {
    it('renders X/Twitter icon', () => {
      render(<XTwitter />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders with default size', () => {
      render(<XTwitter />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('renders with custom color', () => {
      render(<XTwitter color="#1DA1F2" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('fill', '#1DA1F2');
    });
  });

  describe('Twitter (legacy alias)', () => {
    it('Twitter is an alias for XTwitter', () => {
      expect(Twitter).toBe(XTwitter);
    });

    it('renders Twitter icon (alias)', () => {
      render(<Twitter />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});
