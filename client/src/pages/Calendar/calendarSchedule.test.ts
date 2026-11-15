import { describe, it, expect } from 'vitest';
import {
  scheduleFieldsForMove,
  timezoneOffsetMinutesForDateKey,
} from './calendarHelpers';
import type { ScheduledPost } from '../../types/scheduledPost';

function row(overrides: Partial<ScheduledPost>): ScheduledPost {
  return {
    id: 'sp',
    userId: 'u',
    jobId: 'job',
    scheduledDate: '2026-12-01',
    createdAt: '2026-11-01T00:00:00.000Z',
    publishPlatform: 'linkedin',
    publishHour: 15,
    publishStatus: 'pending',
    publishedAt: null,
    postUrl: null,
    publishError: null,
    ...overrides,
  };
}

describe('scheduleFieldsForMove', () => {
  it('keeps platform and hour when the move does not set them', () => {
    expect(scheduleFieldsForMove(row({}), undefined, undefined)).toEqual({
      publishPlatform: 'linkedin',
      publishHour: 15,
    });
  });

  it('omits both when the job has no scheduled row', () => {
    expect(scheduleFieldsForMove(undefined, undefined, undefined)).toEqual({
      publishPlatform: undefined,
      publishHour: undefined,
    });
  });

  it('explicit null clears the platform and keeps the stored hour', () => {
    expect(scheduleFieldsForMove(row({}), null, undefined)).toEqual({
      publishPlatform: null,
      publishHour: 15,
    });
  });

  it('an explicit hour replaces the stored hour', () => {
    expect(scheduleFieldsForMove(row({}), 'twitter', 8)).toEqual({
      publishPlatform: 'twitter',
      publishHour: 8,
    });
  });
});

describe('timezoneOffsetMinutesForDateKey', () => {
  it('matches the offset of that local date and hour', () => {
    const winter = timezoneOffsetMinutesForDateKey('2026-01-15', 9);
    const summer = timezoneOffsetMinutesForDateKey('2026-07-15', 9);
    expect(winter).toBe(new Date(2026, 0, 15, 9, 0, 0, 0).getTimezoneOffset());
    expect(summer).toBe(new Date(2026, 6, 15, 9, 0, 0, 0).getTimezoneOffset());
  });
});
