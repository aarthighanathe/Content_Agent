import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

describe('useFocusTrap', () => {
  it('does nothing when ref current is null', () => {
    const ref = { current: null };
    const { result } = renderHook(() => useFocusTrap(ref, false));
    expect(result.current).toBeUndefined();
  });

  it('does nothing when isActive is false', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useFocusTrap(ref, false));
    expect(result.current).toBeUndefined();
  });

  it('focuses the first focusable element when activated', () => {
    // WHY appendChild(container) to document.body: the hook's getFocusable()
    // filters out elements whose offsetParent is null (skips hidden/detached
    // elements) — see setup.ts's offsetParent stub for why this needs a real
    // document.body attachment to read as "visible" under jsdom.
    const container = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Test';
    container.appendChild(button);
    document.body.appendChild(container);

    const ref = { current: container };
    const focusSpy = vi.spyOn(button, 'focus');

    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    expect(focusSpy).toHaveBeenCalled();
    unmount();
    document.body.removeChild(container);
  });

  it('handles Tab key to cycle focus', () => {
    // WHY dispatch on document, not container: the hook listens at the
    // document level (so Tab is trapped regardless of what currently has
    // focus, not just events bubbling up through the container) — see the
    // hook's own `document.addEventListener('keydown', ...)`.
    const container = document.createElement('div');
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    container.appendChild(button1);
    container.appendChild(button2);
    document.body.appendChild(container);

    const ref = { current: container };
    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    // WHY focus button2 first: the hook only intervenes at the trap boundary
    // — Tab from the last focusable element wraps back to the first (and
    // Shift+Tab from the first wraps to the last). Tabbing forward from the
    // *first* element is native browser behavior the hook deliberately lets
    // through uninterrupted, so asserting preventDefault from button1 would
    // test the wrong case.
    button2.focus();

    // WHY cancelable: true: KeyboardEvent defaults to cancelable: false, which
    // makes preventDefault() a silent no-op — without this the assertion
    // below would fail regardless of whether the hook calls preventDefault().
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    document.dispatchEvent(tabEvent);

    expect(tabEvent.defaultPrevented).toBe(true);
    unmount();
    document.body.removeChild(container);
  });

  it('handles Shift+Tab to cycle focus backwards', () => {
    const container = document.createElement('div');
    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    const button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    container.appendChild(button1);
    container.appendChild(button2);
    document.body.appendChild(container);

    const ref = { current: container };
    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
    document.dispatchEvent(shiftTabEvent);

    expect(shiftTabEvent.defaultPrevented).toBe(true);
    unmount();
    document.body.removeChild(container);
  });

  it('cleans up event listeners on unmount', () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Test';
    container.appendChild(button);
    document.body.appendChild(container);

    const ref = { current: container };
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    document.body.removeChild(container);
  });
});
