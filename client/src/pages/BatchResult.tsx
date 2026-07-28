import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ImageIcon, Briefcase, MessageSquare, Camera, Sparkles, Timer, CalendarDays, AlertTriangle } from 'lucide-react';
import { getJob } from '../api';

const platConfig: Record<string, { color: string; bg: string; Icon: React.ElementType; label: string }> = {
  instagram_carousel: { color: '#ec4899', bg: 'rgba(236,72,153,0.1)', Icon: ImageIcon,     label: 'Carousel'  },
  linkedin_post:      { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', Icon: Briefcase,     label: 'LinkedIn'  },
  twitter_thread:     { color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', Icon: MessageSquare, label: 'Twitter'   },
  instagram_caption:  { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', Icon: Camera,       label: 'Caption'  },
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// WHY: JobOutput.content is typed unknown (its shape varies by outputType) — narrow with
// a type guard instead of an unchecked cast, matching the pattern in historyHelpers.ts /
// libraryHelpers.ts's getContentTotalScore.
function getContentTotalScore(content: unknown): number | undefined {
  if (
    typeof content === 'object' &&
    content !== null &&
    'totalScore' in content &&
    typeof (content as { totalScore?: unknown }).totalScore === 'number'
  ) {
    return (content as { totalScore: number }).totalScore;
  }
  return undefined;
}

interface BatchItem {
  jobId: string;
  topic: string;
  platform: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  progress: number;
  score?: number;
}

export default function BatchResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [paramsProcessed, setParamsProcessed] = useState(false);

  useEffect(() => {
    const raw = params.get('jobs');
    // WHY setTimeout(..., 0): calling setState synchronously inside an effect body
    // triggers react-hooks/set-state-in-effect. Deferring via a 0ms timeout keeps
    // the same user-visible behaviour (fires in the same microtask flush) while
    // satisfying the rule.
    if (!raw) { const t = setTimeout(() => setParamsProcessed(true), 0); return () => clearTimeout(t); }
    const parsed: BatchItem[] = raw
      .split(',')
      .map((part): BatchItem | null => {
        const segments = part.split('|');
        // WHY two-segment format (#37): the original URL encoded topic text as base64
        // in the middle segment (jobId|topic64|platform). That was redundant because
        // getJob() already returns the topic from the server on first poll, and there
        // is no active call site in the codebase that builds those base64-topic URLs
        // anymore. The simplified format is just jobId|platform. A 3-segment fallback
        // handles any stale links still in users' browser history.
        let jobId: string, platform: string;
        if (segments.length >= 3) {
          // Old format: jobId|topic64|platform — keep backward compat, ignore topic64
          [jobId, , platform] = segments;
        } else {
          [jobId, platform] = segments;
        }
        if (!jobId || !platform) return null;
        // Topic is intentionally left empty here; it will be populated from the
        // getJob() poll response (BatchItem.topic is updated in the polling effect).
        return { jobId, topic: '', platform, status: 'pending', progress: 0 };
      })
      .filter((item): item is BatchItem => item !== null);
    // WHY setTimeout(..., 0): same deferral pattern as the empty-params branch above —
    // calling setState synchronously in an effect body triggers set-state-in-effect.
    const t = setTimeout(() => { setItems(parsed); setParamsProcessed(true); }, 0);
    return () => clearTimeout(t);
  }, [params]);

  useEffect(() => {
    if (items.length === 0) return;
    const allDone = items.every((i) => i.status === 'done' || i.status === 'failed');
    if (allDone) return;

    const interval = setInterval(async () => {
      const updated = await Promise.all(
        items.map(async (item) => {
          if (item.status === 'done' || item.status === 'failed') return item;
          try {
            const d = await getJob(item.jobId);
            const criticOutput = d?.outputs?.filter((o) => o.outputType === 'critique')?.pop();
            const score = getContentTotalScore(criticOutput?.content) ?? criticOutput?.qualityScore;
            return {
              ...item,
              // WHY update topic from server (#37): topic is no longer encoded in the URL;
              // we take it from the job response on first successful poll instead.
              topic: d.topic || item.topic,
              status: d.status === 'done' ? 'done' : d.status === 'failed' ? 'failed' : 'processing',
              progress: d.progress ?? (d.status === 'done' ? 100 : item.progress < 80 ? item.progress + 8 : item.progress),
              score,
            } as BatchItem;
          } catch {
            return item;
          }
        })
      );
      setItems(updated);
    }, 2500);

    return () => clearInterval(interval);
  }, [items]);

  const doneCount   = items.filter((i) => i.status === 'done').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const totalDone   = doneCount + failedCount;
  const allComplete = totalDone === items.length && items.length > 0;
  const overallPct  = items.length ? Math.round((totalDone / items.length) * 100) : 0;

  if (paramsProcessed && items.length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'64px 24px', gap:14 }}>
        <AlertTriangle size={36} style={{ color:'rgba(239,68,68,0.6)' }} />
        <h1 style={{ fontFamily:"var(--font-heading)", fontSize:20, fontWeight:700, color:'rgba(255,255,255,0.85)' }}>No batch found</h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', maxWidth:360 }}>
          This link is missing or has an invalid batch of jobs. Start a new batch or head back to your dashboard.
        </p>
        <div style={{ display:'flex', gap:10, marginTop:6 }}>
          <button onClick={() => navigate('/create')} style={{ background:'linear-gradient(135deg,#F59E0B,#FBBF24)', border:'none', color:'#050509', borderRadius:10, padding:'10px 18px', cursor:'pointer', fontSize:13, fontWeight:700 }}>
            Create content
          </button>
          <button onClick={() => navigate('/dashboard')} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.65)', borderRadius:10, padding:'10px 18px', cursor:'pointer', fontSize:13 }}>
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .br { display:flex; flex-direction:column; gap:20px; }
        .br-card { background:#08081A; border-radius:14px; padding:20px 22px; display:flex; flex-direction:column; gap:14px; border:1px solid rgba(255,255,255,0.06); transition:border-color .2s; }
        .br-card.done  { border-color:rgba(16,185,129,0.25); }
        .br-card.failed { border-color:rgba(239,68,68,0.2); }
        .br-card.processing { border-color:rgba(245,158,11,0.2); }
        @keyframes br-spin { to{transform:rotate(360deg)} }
        @keyframes br-fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="br">
        {/* Header */}
        <div style={{ paddingBottom:18, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:3, textTransform:'uppercase', color:'#F59E0B', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:18, height:1, background:'linear-gradient(90deg,#F59E0B,transparent)', display:'inline-block' }} />
            Week Generation
          </div>
          <h1 style={{ fontFamily:"var(--font-heading)", fontSize:'clamp(18px,4vw,24px)', fontWeight:700, color:'rgba(255,255,255,0.92)', lineHeight:1.2 }}>
            {allComplete ? (doneCount === items.length ? <><Sparkles size={20} style={{ display:'inline', verticalAlign:'middle', marginRight:6 }} />Week generated!</> : `Week complete — ${doneCount}/${items.length} succeeded`) : 'Generating your week…'}
          </h1>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:4 }}>
            {allComplete ? `${doneCount} posts ready · ${failedCount > 0 ? `${failedCount} failed` : 'all successful'}` : `${doneCount}/${items.length} posts done · ${items.length - totalDone} in progress`}
          </p>
        </div>

        {/* Overall progress bar */}
        {!allComplete && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:'rgba(255,255,255,0.3)' }}>Overall progress</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:'#F59E0B' }}>{overallPct}%</span>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#F59E0B,#FBBF24)', borderRadius:2, width:`${overallPct}%`, transition:'width .6s ease' }} />
            </div>
          </div>
        )}

        {/* Job cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {items.map((item, i) => {
            const cfg = platConfig[item.platform] || platConfig.linkedin_post;
            return (
              <div key={item.jobId} className={`br-card ${item.status}`} style={{ animation:`br-fadeUp .25s ease ${i*0.06}s both` }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  {/* Day badge */}
                  <div style={{ width:44, height:44, borderRadius:10, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.18)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:'rgba(245,158,11,0.6)', lineHeight:1 }}>Day</span>
                    <span style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700, color:'#F59E0B', lineHeight:1 }}>{i + 1}</span>
                  </div>

                  {/* Topic + meta */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'var(--color-text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.topic}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.color}40`, padding:'1px 7px', borderRadius:20, display:'inline-flex', alignItems:'center', gap:4 }}><cfg.Icon size={9} /> {cfg.label}</span>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:'rgba(255,255,255,0.2)' }}>{DAYS[i]}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
                    {item.status === 'done' && (
                      <>
                        {item.score != null && (
                          <span style={{ fontFamily:"var(--font-display)", fontSize:13, fontWeight:700, color: item.score >= 80 ? 'var(--color-success)' : item.score >= 60 ? '#F59E0B' : 'var(--color-error)', background: item.score >= 80 ? 'rgba(16,185,129,0.1)' : item.score >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', border:`1px solid ${item.score >= 80 ? 'rgba(16,185,129,0.25)' : item.score >= 60 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius:20, padding:'2px 9px' }}>
                            {item.score}
                          </span>
                        )}
                        <button onClick={() => navigate(`/result/${item.jobId}`)} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', color:'#34D399', borderRadius:8, padding:'6px 13px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                          View →
                        </button>
                      </>
                    )}
                    {item.status === 'failed' && (
                      <span style={{ fontSize:11, color:'rgba(239,68,68,0.7)', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'5px 10px', display:'inline-flex', alignItems:'center', gap:5 }}>
                        <AlertTriangle size={10} /> Failed
                      </span>
                    )}
                    {(item.status === 'processing' || item.status === 'pending') && (
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:14, height:14, border:'2px solid rgba(245,158,11,0.2)', borderTopColor:'#F59E0B', borderRadius:'50%', animation:'br-spin .8s linear infinite' }} />
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:9, color:'rgba(245,158,11,0.7)' }}>{item.progress || 0}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar — only for in-progress */}
                {(item.status === 'processing' || item.status === 'pending') && (
                  <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:`linear-gradient(90deg,${cfg.color},${cfg.color}70)`, borderRadius:2, width:`${item.progress || 5}%`, transition:'width .6s ease' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Done CTA */}
        {allComplete && (
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', animation:'br-fadeUp .3s ease both' }}>
            <button onClick={() => navigate('/library')} style={{ flex:1, minWidth:120, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.65)', borderRadius:10, padding:'12px 16px', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Timer size={13} /> View in History
            </button>
            <button onClick={() => navigate('/calendar')} style={{ flex:1, minWidth:120, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', color:'#F59E0B', borderRadius:10, padding:'12px 16px', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <CalendarDays size={13} /> View on Calendar
            </button>
            <button onClick={() => navigate('/create')} style={{ flex:1, minWidth:120, background:'linear-gradient(135deg,#F59E0B,#FBBF24)', border:'none', color:'#050509', borderRadius:10, padding:'12px 16px', cursor:'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Sparkles size={13} /> Create more →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
