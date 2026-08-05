import type { ReactNode } from 'react';
import { GripVertical, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonBlock } from '../../components/SkeletonCard';
import type { CalendarJob } from './calendarHelpers';
import { DAY_LABELS, MONTH_NAMES } from './calendarHelpers';

interface CalendarGridProps {
  onToggleSidebar: () => void;
  year: number;
  month: number;
  totalCells: number;
  firstDayOfWeek: number;
  daysInMonth: number;
  today: Date;
  allScheduledCount: number;
  thisMonthScheduledCount: number;
  unscheduledCount: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  isError: boolean;
  loading: boolean;
  onRetry: () => void;
  selectedDay: string | null;
  onSelectDay: (dateKey: string | null) => void;
  dragOver: string | null;
  onDragOver: (dateKey: string | null) => void;
  dragJobId: string | null;
  onDrop: (dateKey: string) => void;
  scheduledOnDay: (dateKey: string) => CalendarJob[];
  /** DayDetailPanel, rendered by the caller — lives in the same scrollable .sc-cal column below the grid. */
  children?: ReactNode;
}

export function CalendarGrid({
  onToggleSidebar, year, month, totalCells, firstDayOfWeek, daysInMonth, today,
  allScheduledCount, thisMonthScheduledCount, unscheduledCount, onPrevMonth, onNextMonth, onToday,
  isError, loading, onRetry, selectedDay, onSelectDay, dragOver, onDragOver, dragJobId, onDrop, scheduledOnDay,
  children,
}: CalendarGridProps) {
  return (
    <div className="sc-cal">
      {/* Header */}
      <div className="sc-cal-hd">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="sc-toggle" onClick={onToggleSidebar} title="Toggle content library" aria-label="Toggle content library">
            <GripVertical size={15} aria-hidden />
          </button>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:2.5, textTransform:'uppercase', color:'var(--accent)', marginBottom:4 }}>
              Content Calendar
            </div>
            <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'clamp(18px,4vw,24px)', fontWeight:700, color:'var(--text-primary)', lineHeight:1.1 }}>
              {MONTH_NAMES[month]} {year}
            </h1>
          </div>
        </div>

        <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--accent)', lineHeight:1 }}>{allScheduledCount}</div>
              <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:0.5, marginTop:2 }}>scheduled</div>
            </div>
            <div style={{ width:1, height:26, background:'var(--rule)' }} />
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--accent)', lineHeight:1 }}>{thisMonthScheduledCount}</div>
              <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:0.5, marginTop:2 }}>this month</div>
            </div>
            <div style={{ width:1, height:26, background:'var(--rule)' }} />
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--text-secondary)', lineHeight:1 }}>{unscheduledCount}</div>
              <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:0.5, marginTop:2 }}>unscheduled</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button className="sc-nav-btn" onClick={onPrevMonth}><ChevronLeft size={15} /></button>
            <button
              onClick={onToday}
              style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:0.5, background:'color-mix(in srgb, var(--accent) 8%, transparent)', border:'1px solid color-mix(in srgb, var(--accent) 20%, transparent)', color:'var(--accent)', borderRadius:7, padding:'6px 12px', cursor:'pointer', transition:'all .15s' }}
            >Today</button>
            <button className="sc-nav-btn" onClick={onNextMonth}><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
        {Object.entries(platformMeta).map(([id, cfg]) => (
          <div key={id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-secondary)' }}>
            <div style={{ width:9, height:9, borderRadius:3, background:cfg.color+'44', border:`1px solid ${cfg.color}77` }} />
            {cfg.label}
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-muted)' }}>
          <Clock size={10} aria-hidden />
          {/* WHY updated hint (#12): old text said "Drag content from library to schedule" —
              now acknowledges both drag and the new click/keyboard path. */}
          Drag a card to schedule · or tap <strong style={{ color:'var(--text-secondary)' }}>Schedule…</strong> on any card
        </div>
      </div>

      {/* WHY this disclosure: the schedule (what's placed on which day) is now
          saved server-side (scheduled_posts table, via calendarHelpers.ts's
          useSchedule() hook — see CLAUDE.md §9), so placements survive a
          cleared browser and sync across devices. The auto-publish caveat
          below is still true and still needs disclosure, unlike the old
          "browser only" claim which this replaced once server sync shipped
          (previously undisclosed at all, unlike the sidebar's hitFetchCap
          banner for its own limitation — FUNCTIONAL_AUDIT_2026-07.md finding #28).
          WHY the second sentence: PostPanel.tsx has its own, separate reminder-only
          social-scheduling concept ("schedule to actually publish to LinkedIn/Twitter
          later") — without calling out that this calendar view is planning-only, a
          user could reasonably assume placing a card here also queues a real post. */}
      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10.5, color:'color-mix(in srgb, var(--accent) 50%, transparent)', fontFamily:'var(--font-mono)' }}>
        <Clock size={10} aria-hidden />
        Your schedule syncs across devices. This is a personal planning view, not an
        auto-publish action — posting to social still happens separately from the Result page.
      </div>

      {/* Grid */}
      {isError ? (
        <ErrorState message="Couldn't load your content. Please try again." onRetry={onRetry} />
      ) : loading ? (
        <div className="sc-grid">
          {Array.from({length:35}).map((_,i) => (
            <SkeletonBlock key={i} height={100} radius={10} delay={i * 0.04} style={{ border:'1px solid var(--rule)' }} />
          ))}
        </div>
      ) : (
        <div className="sc-grid">
          {DAY_LABELS.map(d => (
            <div key={d} className="sc-day-lbl">{d}</div>
          ))}
          {Array.from({length: totalCells}).map((_, cellIdx) => {
            const dayNum = cellIdx - firstDayOfWeek + 1;
            if (dayNum < 1 || dayNum > daysInMonth) return <div key={cellIdx} className="sc-cell empty" />;
            const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
            const dayJobs = scheduledOnDay(dateKey);
            const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===dayNum;
            const isSelected = selectedDay === dateKey;
            const isDragOver = dragOver === dateKey;
            const isPast = new Date(year, month, dayNum) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

            return (
              <div
                key={cellIdx}
                className={`sc-cell${isToday?' today':''}${isSelected?' selected':''}${isDragOver?' drag-over':''}`}
                role="button"
                tabIndex={0}
                style={{ opacity: isPast && !isToday ? 0.55 : 1 }}
                onClick={() => onSelectDay(isSelected ? null : dateKey)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectDay(isSelected ? null : dateKey); } }}
                onDragOver={e => { e.preventDefault(); onDragOver(dateKey); }}
                onDragLeave={() => onDragOver(null)}
                onDrop={e => {
                  e.preventDefault();
                  onDragOver(null);
                  if (dragJobId) onDrop(dateKey);
                }}
              >
                <div className={`sc-num${isToday?' is-today':''}`}>{dayNum}</div>
                {dayJobs.slice(0,3).map(job => {
                  const cfg = platformMeta[job.platform] || platformMeta['linkedin_post'];
                  return (
                    <div key={job.id} className="sc-pill" style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.color }}>
                      <cfg.Icon size={8} />
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', minWidth:0, flex:1, fontSize:9 }}>
                        {job.topic?.slice(0,16)}{(job.topic?.length||0)>16?'…':''}
                      </span>
                    </div>
                  );
                })}
                {dayJobs.length > 3 && (
                  // WHY its own <button>, not just text inside the cell: previously this
                  // was inert text — clicking it only worked because it happened to sit
                  // inside the whole-cell click target, and it never explicitly opened the
                  // day (a click while already selected would toggle it closed instead of
                  // guaranteeing the extra items become visible). This is now a distinct
                  // affordance that always opens (never toggles closed) the day's detail
                  // panel, where the remaining scheduled items are visible.
                  <button
                    type="button"
                    className="sc-more-btn"
                    aria-label={`Show ${dayJobs.length - 3} more scheduled item${dayJobs.length - 3 !== 1 ? 's' : ''} on this day`}
                    onClick={(e) => { e.stopPropagation(); onSelectDay(dateKey); }}
                    style={{
                      fontSize:9, color:'var(--accent)', fontFamily:'var(--font-mono)', padding:'1px 4px',
                      background:'none', border:'none', cursor:'pointer', textAlign:'left', textDecoration:'underline',
                      textUnderlineOffset: 2,
                    }}
                  >
                    +{dayJobs.length-3} more
                  </button>
                )}
                <div className="sc-drop-hint">
                  {dragJobId ? '+ Schedule here' : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {children}
    </div>
  );
}
