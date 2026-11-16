import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { CalendarSidebar } from './Calendar/CalendarSidebar';
import { CalendarGrid } from './Calendar/CalendarGrid';
import { DayDetailPanel } from './Calendar/DayDetailPanel';
import { CALENDAR_STYLES } from './Calendar/calendarStyles';
import type { CalendarJob } from './Calendar/calendarHelpers';
import {
  fetchCalendarJobs,
  monthKey,
  scheduleFieldsForMove,
  todayDateKey,
  useSchedule,
} from './Calendar/calendarHelpers';
import type { PublishPlatform } from '../types/scheduledPost';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function CalendarPage() {
  const navigate = useNavigate();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const dayDialogRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const viewMonthKey = monthKey(viewDate);
  const {
    schedule,
    postsByJobId,
    scheduledJobIds,
    isLoading: scheduleLoading,
    isError: scheduleError,
    refetch: refetchSchedule,
    allocate: allocateRemote,
    removeFromSchedule: removeFromScheduleRemote,
    isMutating,
  } = useSchedule(viewMonthKey);
  const [scheduleActionError, setScheduleActionError] = useState<string | null>(null);
  // WHY: auto-dismiss like Brand/Library — manual ✕ remains, but errors shouldn't linger.
  useEffect(() => {
    if (!scheduleActionError) return undefined;
    const t = setTimeout(() => setScheduleActionError(null), 4000);
    return () => clearTimeout(t);
  }, [scheduleActionError]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // WHY: separate mobileOpen state (#12): on ≤640px the CSS forces .sc-sidebar to
  // width:0 regardless of `sidebarOpen`. A separate `mobileOpen` flag drives the
  // bottom-sheet drawer that replaces the sidebar on touch-sized screens, so the two
  // layouts can be toggled independently without fighting each other's CSS.
  const [mobileOpen, setMobileOpen] = useState(false);
  // WHY: sync gate — isMutating only flips after React Query re-render; double-drop
  // / rapid Schedule clicks used to fire overlapping mutateAsync calls first.
  const mutatingRef = useRef(false);

  // WHY: eager stale + no focus refetch: the Calendar jobs list is low-volatility
  // (jobs don't change once terminal, which is all the grid shows) but is fetched
  // 4 pages at once. The default 30s staleTime + null default focus-refetch re-issued
  // 4 GETs on every window focus (each with the now-optional pill aggregate). An
  // explicit 5-min stale window + refetchOnWindowFocus:false keeps month-grid data
  // fresh enough while avoiding that burst (perf audit). Auto-publish status is
  // still picked up live via the separate 30s-polled schedule query.
  const jobsQuery = useQuery({
    queryKey: ['calendar', 'jobs'],
    queryFn: fetchCalendarJobs,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    // WHY: gate like Create/Library — avoid an unauthenticated fetch before Clerk hydrates.
    enabled: authLoaded && isSignedIn,
  });
  const jobs: CalendarJob[] = jobsQuery.data?.jobs || [];
  const hitFetchCap = jobsQuery.data?.hitFetchCap ?? false;
  // WHY: combined across both queries: the grid/sidebar render from both the
  // jobs list AND the schedule map, so either one still loading/erroring
  // means the combined view isn't ready yet — same "both matter" reasoning
  // Dashboard.tsx uses for its own two independent queries.
  // WHY: isPending, not isLoading: while Clerk hydrates queries are disabled and
  // isLoading is false — that would flash an empty grid then fill in.
  const loading = jobsQuery.isPending || scheduleLoading;
  const isError = jobsQuery.isError || scheduleError;

  // WHY: schedule rows for jobs the current fetch doesn't know about are simply
  // not rendered (jobs.find(...) returns undefined, filtered out below) rather
  // than actively pruned client-side: pruning is now the server's job — a
  // deleted job's scheduled_posts row is orphaned data sitting in Postgres,
  // not an unbounded client-side leak the way localStorage was
  // (FUNCTIONAL_AUDIT_2026-07.md finding #29 no longer applies to this store).

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const today = new Date();

  // WHY: scheduledJobIds (full ±24-month window), not postsByJobId (±1) or the
  // viewed-month schedule map — far-future rows otherwise look unscheduled and
  // a re-drag upserts over their real date.
  const unscheduled = jobs.filter(j => !scheduledJobIds.has(j.id));

  // The set of dateKeys that have at least one scheduled item — forwarded to the
  // SchedulePicker so it can highlight "days with content" in the mini-grid.
  const scheduledDays = new Set(
    Object.entries(schedule)
      .filter(([, ids]) => ids.length > 0)
      .map(([dateKey]) => dateKey)
  );

  // WHY: thin wrappers around the mutation, not calling allocateRemote directly
  // at each JSX callsite: keeps a single place to surface a mutation failure
  // (e.g. a network blip, or the job-ownership check failing) as user-visible
  // feedback instead of a silently-reverted optimistic-looking UI — React
  // Query itself doesn't roll back an unchanged cache, but without this catch
  // a failed request would fail *silently* since none of these call sites
  // await the promise today.
  function allocate(
    dateKey: string,
    jobId: string,
    publishPlatform?: PublishPlatform | null,
    publishHour?: number,
  ) {
    // WHY: early-return while pending: double-drop / rapid Schedule clicks used to
    // fire overlapping mutateAsync calls before React Query flipped isPending.
    if (isMutating || mutatingRef.current) return;
    // WHY: reject *new* past-day schedules — picker/grid also disable pick/drop,
    // but DayDetailPanel "Add content" and any missed UI path still hit here.
    // WHY: allow when jobId is already on dateKey: Cancel / hour / platform for
    // an existing past-day row must still call allocate (same dateKey upsert).
    if (dateKey < todayDateKey()) {
      const alreadyOnDay = (schedule[dateKey] ?? []).includes(jobId);
      if (!alreadyOnDay) {
        setScheduleActionError('Cannot schedule on a past date — pick today or later.');
        return;
      }
    }
    mutatingRef.current = true;
    setScheduleActionError(null);
    const fields = scheduleFieldsForMove(postsByJobId[jobId], publishPlatform, publishHour);
    allocateRemote(dateKey, jobId, fields.publishPlatform, fields.publishHour)
      .catch(() => {
        setScheduleActionError('Failed to schedule — please try again.');
      })
      .finally(() => {
        mutatingRef.current = false;
      });
  }

  function removeFromSchedule(jobId: string) {
    if (isMutating || mutatingRef.current) return;
    mutatingRef.current = true;
    setScheduleActionError(null);
    removeFromScheduleRemote(jobId)
      .catch(() => {
        setScheduleActionError('Failed to remove from schedule — please try again.');
      })
      .finally(() => {
        mutatingRef.current = false;
      });
  }

  useEffect(() => {
    if (!selectedDay) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setSelectedDay(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedDay]);

  // WHY: focus trap (mirrors OnboardingModal/ActionDrawer): dialog had Escape +
  // role=dialog but Tab could leave into the calendar behind the scrim.
  useFocusTrap(dayDialogRef, selectedDay !== null);

  function prevMonth() { const d = new Date(viewDate); d.setMonth(d.getMonth()-1); setViewDate(d); setSelectedDay(null); }
  function nextMonth() { const d = new Date(viewDate); d.setMonth(d.getMonth()+1); setViewDate(d); setSelectedDay(null); }

  const scheduledOnDay = (dateKey: string): CalendarJob[] => {
    const ids = schedule[dateKey] || [];
    return ids.map(id => jobs.find(j => j.id === id)).filter(Boolean) as CalendarJob[];
  };

  const thisMonthScheduledCount = Object.entries(schedule).filter(([k]) => {
    const [y2, m2] = k.split('-').map(Number);
    return y2 === year && m2 === month + 1;
  }).reduce((acc, [, ids]) => acc + ids.length, 0);

  return (
    <div className="sc-page">
      <style>{CALENDAR_STYLES}</style>

      {/* WHY: a fixed toast, not an inline banner: a schedule/unschedule action can
          happen from either the sidebar, the grid, or the day-detail panel — a
          fixed-position toast surfaces the failure regardless of which of those
          three triggered it, without needing three separate banner slots. */}
      {scheduleActionError && (
        <div
          role="alert"
          style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-raised)', border: '1px solid color-mix(in srgb, var(--color-error) 40%, transparent)',
            color: 'var(--text-primary)', borderRadius: 10, padding: '10px 16px', fontSize: 12.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          {scheduleActionError}
          <button
            onClick={() => setScheduleActionError(null)}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      <CalendarSidebar
        open={sidebarOpen}
        loading={loading}
        isError={isError}
        jobs={jobs}
        unscheduled={unscheduled}
        hitFetchCap={hitFetchCap}
        dragJobId={dragJobId}
        onDragStart={setDragJobId}
        onDragEnd={() => setDragJobId(null)}
        onCreateNew={() => navigate('/create')}
        viewYear={year}
        viewMonth={month}
        scheduledDays={scheduledDays}
        onSchedule={(dateKey, jobId) => allocate(dateKey, jobId)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        isMutating={isMutating}
      />

      <CalendarGrid
        // WHY: desktop collapses .sc-sidebar; mobile opens the bottom sheet.
        // Flipping both left a .sc-mobile-scrim over the desktop calendar after
        // "close library" (sheet is display:none >640px but the scrim still captured clicks).
        onToggleSidebar={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
            setMobileOpen((p) => !p);
          } else {
            setSidebarOpen((p) => !p);
          }
        }}
        year={year}
        month={month}
        totalCells={totalCells}
        firstDayOfWeek={firstDayOfWeek}
        daysInMonth={daysInMonth}
        today={today}
        allScheduledCount={scheduledJobIds.size}
        thisMonthScheduledCount={thisMonthScheduledCount}
        unscheduledCount={unscheduled.length}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onToday={() => { const d = new Date(); d.setDate(1); setViewDate(d); setSelectedDay(null); }}
        isError={isError}
        loading={loading}
        onRetry={() => { jobsQuery.refetch().catch(() => {}); refetchSchedule().catch(() => {}); }}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        dragOver={dragOver}
        onDragOver={setDragOver}
        dragJobId={dragJobId}
        onDrop={(dateKey) => { if (dragJobId) { allocate(dateKey, dragJobId); setDragJobId(null); } }}
        scheduledOnDay={scheduledOnDay}
        isMutating={isMutating}
      />

      {selectedDay && (
        <div className="sc-modal-scrim" onClick={() => setSelectedDay(null)}>
          <div
            ref={dayDialogRef}
            className="sc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Scheduled posts"
            onClick={(e) => e.stopPropagation()}
          >
            <DayDetailPanel
              selectedDay={selectedDay}
              jobs={scheduledOnDay(selectedDay)}
              postsByJobId={postsByJobId}
              onClose={() => setSelectedDay(null)}
              onViewResult={(jobId) => navigate(`/result/${jobId}`)}
              onRemove={removeFromSchedule}
              unscheduled={unscheduled}
              onAddContent={(jobId) => allocate(selectedDay, jobId)}
              onSetPublishPlatform={(jobId, platform, publishHour) =>
                allocate(selectedDay, jobId, platform, publishHour)
              }
              isMutating={isMutating}
            />
          </div>
        </div>
      )}
    </div>
  );
}
