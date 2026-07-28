import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarSidebar } from './Calendar/CalendarSidebar';
import { CalendarGrid } from './Calendar/CalendarGrid';
import { DayDetailPanel } from './Calendar/DayDetailPanel';
import { CALENDAR_STYLES } from './Calendar/calendarStyles';
import type { CalendarJob, ScheduleMap } from './Calendar/calendarHelpers';
import { fetchCalendarJobs, loadSchedule, saveSchedule } from './Calendar/calendarHelpers';

export default function CalendarPage() {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [schedule, setSchedule] = useState<ScheduleMap>(loadSchedule);
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
  const loading = jobsQuery.isLoading;
  const isError = jobsQuery.isError;

  // WHY only when !hitFetchCap: schedule ids for jobs that no longer appear in the
  // fetched set are never removed on their own — a job scheduled and later deleted
  // (or that fell outside the fetch window) leaves its id in localStorage forever,
  // an unbounded, silently-accumulating leak (FUNCTIONAL_AUDIT_2026-07.md finding
  // #29). This only prunes once the fetch is known-complete (not capped) — pruning
  // against a capped, partial job list would wrongly treat "not fetched yet" as
  // "deleted" and drop valid schedule entries for older content.
  useEffect(() => {
    if (loading || isError || hitFetchCap || jobs.length === 0) return undefined;
    const knownIds = new Set(jobs.map((j) => j.id));
    // WHY setTimeout(..., 0): calling setState synchronously inside an effect body
    // triggers react-hooks/set-state-in-effect. Deferring via a 0ms timeout keeps
    // the same user-visible behaviour (fires in the same microtask flush) while
    // satisfying the rule — matches the pattern already used elsewhere in this
    // codebase (e.g. Brand.tsx, BatchResult.tsx) for the same lint requirement.
    const t = setTimeout(() => {
      setSchedule((prev) => {
        let changed = false;
        const next: ScheduleMap = {};
        for (const [dateKey, ids] of Object.entries(prev)) {
          const kept = ids.filter((id) => knownIds.has(id));
          if (kept.length !== ids.length) changed = true;
          if (kept.length > 0) next[dateKey] = kept;
        }
        if (!changed) return prev;
        saveSchedule(next);
        return next;
      });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isError, hitFetchCap, jobs.length]);

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

  function allocate(dateKey: string, jobId: string) {
    setSchedule(prev => {
      // Remove from any existing date first
      const cleaned: ScheduleMap = {};
      for (const [k, ids] of Object.entries(prev)) {
        cleaned[k] = ids.filter(id => id !== jobId);
      }
      cleaned[dateKey] = [...(cleaned[dateKey] || []), jobId];
      saveSchedule(cleaned);
      return cleaned;
    });
  }

  function removeFromSchedule(jobId: string) {
    setSchedule(prev => {
      const next: ScheduleMap = {};
      for (const [k, ids] of Object.entries(prev)) {
        next[k] = ids.filter(id => id !== jobId);
      }
      saveSchedule(next);
      return next;
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
    <div style={{ display: 'flex', gap: 0, height: '100%', minHeight: 0 }}>
      <style>{CALENDAR_STYLES}</style>

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
        onRetry={() => jobsQuery.refetch().catch(() => {})}
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
            onClose={() => setSelectedDay(null)}
            onViewResult={(jobId) => navigate(`/result/${jobId}`)}
            onRemove={removeFromSchedule}
            unscheduled={unscheduled}
            onAddContent={(jobId) => allocate(selectedDay, jobId)}
          />
        )}
      </CalendarGrid>
    </div>
  );
}
