import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom doesn't implement scrollIntoView — stub it so components that call it
// (e.g. Dropdown's keyboard-nav auto-scroll) don't throw in tests.
Element.prototype.scrollIntoView = vi.fn();

// jsdom has no layout engine, so offsetParent is always null — code that uses
// it as a "is this element visible/attached" check (e.g. useFocusTrap's
// getFocusable filter) always sees every element as hidden in tests. This
// approximates real browser behavior closely enough for that purpose:
// non-null whenever the element is connected to the document and not
// display:none, matching what a real layout engine would report for the
// plain block/inline elements these tests render.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get(this: HTMLElement) {
    if (!this.isConnected) return null;
    if (this.style.display === 'none') return null;
    return this.ownerDocument.body;
  },
});
