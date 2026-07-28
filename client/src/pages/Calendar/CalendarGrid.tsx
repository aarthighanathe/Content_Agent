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
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:2.5, textTransform:'uppercase', color:'#F59E0B', marginBottom:4 }}>
              Content Calendar
            </div>
            <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'clamp(18px,4vw,24px)', fontWeight:700, color:'rgba(255,255,255,0.92)', lineHeight:1.1 }}>
              {MONTH_NAMES[month]} {year}
            </h1>
          </div>
        </div>

        <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#F59E0B', lineHeight:1 }}>{allScheduledCount}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.28)', fontFamily:'var(--font-mono)', letterSpacing:0.5, marginTop:2 }}>scheduled</div>
            </div>
            <div style={{ width:1, height:26, background:'rgba(255,255,255,0.07)' }} />
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#F59E0B', lineHeight:1 }}>{thisMonthScheduledCount}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.28)', fontFamily:'var(--font-mono)', letterSpacing:0.5, marginTop:2 }}>this month</div>
            </div>
            <div style={{ width:1, height:26, background:'rgba(255,255,255,0.07)' }} />
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'rgba(255,255,255,0.5)', lineHeight:1 }}>{unscheduledCount}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.28)', fontFamily:'var(--font-mono)', letterSpacing:0.5, marginTop:2 }}>unscheduled</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button className="sc-nav-btn" onClick={onPrevMonth}><ChevronLeft size={15} /></button>
            <button
              onClick={onToday}
              style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:0.5, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'#F59E0B', borderRadius:7, padding:'6px 12px', cursor:'pointer', transition:'all .15s' }}
            >Today</button>
            <button className="sc-nav-btn" onClick={onNextMonth}><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
        {Object.entries(platformMeta).map(([id, cfg]) => (
          <div key={id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,0.4)' }}>
            <div style={{ width:9, height:9, borderRadius:3, background:cfg.color+'44', border:`1px solid ${cfg.color}77` }} />
            {cfg.label}
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,0.25)' }}>
          <Clock size={10} aria-hidden />
          {/* WHY updated hint (#12): old text said "Drag content from library to schedule" —
              now acknowledges both drag and the new click/keyboard path. */}
          Drag a card to schedule · or tap <strong style={{ color:'rgba(255,255,255,0.35)' }}>Schedule…</strong> on any card
        </div>
      </div>

      {/* WHY this disclosure: the schedule (what's placed on which day) is saved to
          this browser's localStorage only — there is no server sync, so it won't
          appear on another device/browser and is lost if site data is cleared. This
          wasn't disclosed anywhere before, unlike the sidebar's hitFetchCap banner
          for its own limitation (FUNCTIONAL_AUDIT_2026-07.md finding #28). */}
      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10.5, color:'rgba(245,158,11,0.5)', fontFamily:'var(--font-mono)' }}>
        <Clock size={10} aria-hidden />
        Schedule is saved to this browser only — it won't appear on other devices.
      </div>

      {/* Grid */}
      {isError ? (
        <ErrorState message="Couldn't load your content. Please try again." onRetry={onRetry} />
      ) : loading ? (
        <div className="sc-grid">
          {Array.from({length:35}).map((_,i) => (
            <SkeletonBlock key={i} height={100} radius={10} delay={i * 0.04} style={{ border:'1px solid rgba(255,255,255,0.04)' }} />
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
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', fontFamily:'var(--font-mono)', padding:'1px 4px' }}>
                    +{dayJobs.length-3} more
                  </div>
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
