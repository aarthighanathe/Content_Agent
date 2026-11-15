// WHY: timezoneOffsetMinutes, not just trusting scheduledDate as a UTC day:
// CalendarGrid builds scheduledDate from the browser's LOCAL calendar day,
// but Date.UTC() alone treats that string as a UTC day — "9am" can fire
// hours off, or on the wrong day. The offset is JS Date.getTimezoneOffset()
// (minutes to ADD to local time to reach UTC). The client must send the
// offset of the target local date+hour; today's offset is wrong across DST.
// Optional and defaults to 0 so an older client still schedules, with the
// original UTC-day imprecision.
export const DEFAULT_PUBLISH_HOUR = 9;

export function publishDelayMs(
  scheduledDate: string,
  timezoneOffsetMinutes = 0,
  publishHour = DEFAULT_PUBLISH_HOUR,
): number {
  const hour = Number.isFinite(publishHour)
    ? Math.min(23, Math.max(0, Math.floor(publishHour)))
    : DEFAULT_PUBLISH_HOUR;
  const [y, m, d] = scheduledDate.split('-').map(Number);
  const publishAtUtc = Date.UTC(y, m - 1, d, hour, 0, 0);
  const publishAt = publishAtUtc + timezoneOffsetMinutes * 60_000;
  return publishAt - Date.now();
}
