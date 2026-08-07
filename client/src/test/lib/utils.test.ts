import { describe, it, expect, vi } from 'vitest';
import { timeAgo, formatDate, isSafeHttpUrl, navigateToCreate } from '../../lib/utils';

describe('timeAgo', () => {
  it('returns "just now" for less than a minute', () => {
    const now = new Date();
    const oneSecondAgo = new Date(now.getTime() - 1000).toISOString();
    expect(timeAgo(oneSecondAgo)).toBe('just now');
  });

  it('returns minutes ago for less than an hour', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns hours ago for less than a day', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe('2h ago');
  });

  it('returns formatted date for older dates', () => {
    // WHY noon UTC: see formatDate's tests below — avoids the same
    // timezone-boundary flakiness for a date this far outside timeAgo's
    // relative-time window (which always falls through to formatDate).
    const oldDate = '2023-01-15T12:00:00.000Z';
    expect(timeAgo(oldDate)).toMatch(/Jan 15/);
  });
});

describe('formatDate', () => {
  // WHY noon UTC, not midnight/23:59: formatDate uses toLocaleDateString with
  // no timeZone option, so it renders in the *local* system timezone. A
  // timestamp near a UTC day boundary lands on a different calendar date
  // depending on the machine's offset (e.g. 23:59 UTC is already "tomorrow"
  // in any UTC+ timezone) — flaky across CI runners/dev machines in
  // different timezones. Noon UTC has a full 12-hour margin in both
  // directions, safely covering every real-world UTC offset (-12 to +14).
  it('formats date correctly', () => {
    const date = '2023-01-15T12:00:00.000Z';
    expect(formatDate(date)).toMatch(/Jan 15/);
    expect(formatDate(date)).toMatch(/2023/);
  });

  it('handles different date formats', () => {
    const date = '2023-12-31T12:00:00.000Z';
    expect(formatDate(date)).toMatch(/Dec 31/);
  });
});

describe('isSafeHttpUrl', () => {
  it('returns true for http URLs', () => {
    expect(isSafeHttpUrl('http://example.com')).toBe(true);
  });

  it('returns true for https URLs', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true);
  });

  it('returns false for javascript URLs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
  });

  it('returns false for data URLs', () => {
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isSafeHttpUrl('not-a-url')).toBe(false);
  });

  it('returns false for ftp URLs', () => {
    expect(isSafeHttpUrl('ftp://example.com')).toBe(false);
  });
});

describe('navigateToCreate', () => {
  it('calls navigate with correct path and state', () => {
    const navigate = vi.fn();
    const handoff = { topic: 'Test topic', platform: 'instagram_carousel' };
    
    navigateToCreate(navigate, handoff);
    
    expect(navigate).toHaveBeenCalledWith('/create', { state: handoff });
  });
});
