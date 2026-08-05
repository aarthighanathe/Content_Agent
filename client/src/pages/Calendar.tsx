import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarSidebar } from './Calendar/CalendarSidebar';
import { CalendarGrid } from './Calendar/CalendarGrid';
import { DayDetailPanel } from './Calendar/DayDetailPanel';
import { CALENDAR_STYLES } from './Calendar/calendarStyles';
import type { CalendarJob } from './Calendar/calendarHelpers';
import { fetchCalendarJobs, useSchedule } from './Calendar/calendarHelpers';
import type { PublishPlatform } from '../types/scheduledPost';

export default function CalendarPage() {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const {
    schedule,
    postsByJobId,
    isLoading: scheduleLoading,
    isError: scheduleError,
    refetch: refetchSchedule,
    allocate: allocateRemote,
    removeFromSchedule: removeFromScheduleRemote,
  } = useSchedule();
  const [scheduleActionError, setScheduleActionError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // WHY separate mobileOpen state (#12): on ≤640px the CSS forces .sc-sidebar to
  // width:0 regardless of `sidebarOpen`. A separate `mobileOpen` flag drives the
  // bottom-sheet drawer that replaces the sidebar on touch-sized screens, so the two
  // layouts can be toggled independently without fighting each other's CSS.
  const [mobileOpen, setMobileOpen] = useState(false);

  const jobsQuery = useQuery({ queryKey: ['calendar', 'jobs'], queryFn: fetchCalendarJobs });
  const jobs: CalendarJob[] = jobsQuery.data?.jobs || [];
  const hitFetchCap = jobsQuery.data?.hitFetchCap ?? false;
  // WHY combined across both queries: the grid/sidebar render from both the
  // jobs list AND the schedule map, so either one still loading/erroring
  // means the combined view isn't ready yet — same "both matter" reasoning
  // Dashboard.tsx uses for its own two independent queries.
  const loading = jobsQuery.isLoading || scheduleLoading;
  const isError = jobsQuery.isError || scheduleError;

  // WHY schedule rows for jobs the current fetch doesn't know about are simply
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

  // Scheduled job ids (all dates)
  const allScheduledIds = new Set(Object.values(schedule).flat());
  // Unscheduled = all jobs not in schedule
  const unscheduled = jobs.filter(j => !allScheduledIds.has(j.id));

  // The set of dateKeys that have at least one scheduled item — forwarded to the
  // SchedulePicker so it can highlight "days with content" in the mini-grid.
  const scheduledDays = new Set(
    Object.entries(schedule)
      .filter(([, ids]) => ids.length > 0)
      .map(([dateKey]) => dateKey)
  );

  // WHY thin wrappers around the mutation, not calling allocateRemote directly
  // at each JSX callsite: keeps a single place to surface a mutation failure
  // (e.g. a network blip, or the job-ownership check failing) as user-visible
  // feedback instead of a silently-reverted optimistic-looking UI — React
  // Query itself doesn't roll back an unchanged cache, but without this catch
  // a failed request would fail *silently* since none of these call sites
  // await the promise today.
  function allocate(dateKey: string, jobId: string, publishPlatform?: PublishPlatform) {
    setScheduleActionError(null);
    allocateRemote(dateKey, jobId, publishPlatform).catch(() => {
      setScheduleActionError('Failed to schedule — please try again.');
    });
  }

  function removeFromSchedule(jobId: string) {
    setScheduleActionError(null);
    removeFromScheduleRemote(jobId).catch(() => {
      setScheduleActionError('Failed to remove from schedule — please try again.');
    });
  }

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
    <div style={{ display: 'flex', gap: 0, height: '100%', minHeight: 0, position: 'relative' }}>
      <style>{CALENDAR_STYLES}</style>

      {/* WHY a fixed toast, not an inline banner: a schedule/unschedule action can
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
      />

      <CalendarGrid
        onToggleSidebar={() => { setSidebarOpen(p => !p); setMobileOpen(p => !p); }}
        year={year}
        month={month}
        totalCells={totalCells}
        firstDayOfWeek={firstDayOfWeek}
        daysInMonth={daysInMonth}
        today={today}
        allScheduledCount={allScheduledIds.size}
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
      >
        {selectedDay && (
          <DayDetailPanel
            selectedDay={selectedDay}
            jobs={scheduledOnDay(selectedDay)}
            postsByJobId={postsByJobId}
            onClose={() => setSelectedDay(null)}
            onViewResult={(jobId) => navigate(`/result/${jobId}`)}
            onRemove={removeFromSchedule}
            unscheduled={unscheduled}
            onAddContent={(jobId) => allocate(selectedDay, jobId)}
            onSetPublishPlatform={(jobId, platform) => allocate(selectedDay, jobId, platform)}
          />
        )}
      </CalendarGrid>
    </div>
  );
}
