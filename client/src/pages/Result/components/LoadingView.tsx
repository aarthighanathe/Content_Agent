import { useRef, useMemo } from 'react';
import { Check } from 'lucide-react';
import { agentNames, agentSubs, agentColors, stageOrder } from '../constants';

interface AgentLogEntry {
  agentName:  string;
  action:     string;
  durationMs?: number;
}

interface Props {
  regenerating:  boolean;
  currentStage:  string;
  stageMessage:  string;
  progress:      number;
  agentLogs?:    AgentLogEntry[];
}

function getStageIndex(s: string) { return stageOrder.indexOf(s); }

// WHY: the "packet" pill must never show fabricated numbers — the SSE payload only ever
// carries a free-text `message` (see server/src/agents/*.ts sendEvent calls) plus an
// optional `durationMs`. We surface exactly those two real fields, nothing invented.
function packetLabel(log: AgentLogEntry | undefined): string | null {
  if (!log?.action) return null;
  const short = log.action.length > 42 ? `${log.action.slice(0, 41)}…` : log.action;
  return log.durationMs ? `${short} · ${(log.durationMs / 1000).toFixed(1)}s` : short;
}

export function LoadingView({ regenerating, currentStage, stageMessage, progress, agentLogs }: Props) {
  const latestLogRef = useRef<HTMLDivElement>(null);
  const ci = getStageIndex(currentStage);

  // WHY: the most recent real agent-log entry becomes the "handoff packet" text flying
  // into the currently-active node — it's literally the last thing the backend reported,
  // not a synthetic count. useMemo avoids recomputing the packet label on unrelated re-renders.
  const lastLog = agentLogs && agentLogs.length > 0 ? agentLogs[agentLogs.length - 1] : undefined;
  const packet = useMemo(() => packetLabel(lastLog), [lastLog]);

  return (
    <div className="rp-lv card">
      {/* Spinner */}
      <div className="rp-lv-spinner-wrap">
        <div style={{ position: 'relative', width: 56, height: 56 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid color-mix(in srgb, var(--accent) 12%, transparent)', borderTopColor: 'var(--accent)', animation: 'rp-spin .9s linear infinite', boxShadow: '0 0 20px color-mix(in srgb, var(--accent) 15%, transparent)' }} />
          <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', border: '1.5px solid color-mix(in srgb, var(--accent-2) 12%, transparent)', borderBottomColor: 'color-mix(in srgb, var(--accent-2) 45%, transparent)', animation: 'rp-spinR .65s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px color-mix(in srgb, var(--accent) 60%, transparent)' }} />
          </div>
        </div>
        <h3 className="rp-lv-title">{regenerating ? 'Regenerating content…' : 'Generating your content…'}</h3>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>
            Estimated time: ~30 sec · {progress}%
          </p>
          {stageMessage && (
            <p key={stageMessage} aria-live="polite" style={{ fontSize: 12, color: 'color-mix(in srgb, var(--accent) 75%, transparent)', textAlign: 'center', animation: 'rp-fadeUp .3s ease both', margin: 0 }}>
              {stageMessage}
            </p>
          )}
        </div>
      </div>

      {/* Pipeline stepper — the agent relay is the visual centerpiece: each node lights up
          in sequence and a real handoff "packet" (the agent's actual latest SSE message)
          flies along the connector into the next active node. */}
      <div className="rp-lv-steps">
        {agentNames.map((name, i) => {
          const stage  = stageOrder[i];
          const si     = getStageIndex(stage);
          const done   = si < ci;
          const active = si === ci;
          const color  = agentColors[i];
          // WHY: only render the flying packet on the connector leading INTO the currently
          // active node (i.e. the line after the previous, now-done, node) — this is the
          // literal handoff that just happened, so it can't legitimately appear anywhere else.
          const showPacket = active && i > 0 && packet !== null;
          return (
            <div key={name} className="rp-lv-step">
              {i < agentNames.length - 1 && (
                <div className={`rp-lv-step-line${done ? ' done' : ''}`} />
              )}
              {showPacket && (
                <div
                  key={`${currentStage}-${packet}`}
                  className="rp-lv-packet"
                  style={{ background: `${color}20`, border: `1px solid ${color}55`, color }}
                >
                  {packet}
                </div>
              )}
              <div className="rp-lv-step-dot" style={{ border: `1.5px solid ${done || active ? color : 'var(--rule)'}`, background: done ? `${color}18` : active ? `${color}12` : 'var(--bg-card)', color: done ? color : active ? color : 'var(--text-muted)', animation: active ? 'rp-pulse 1.4s infinite' : 'none' }}>
                {done ? <Check size={9} /> : active ? <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} /> : null}
              </div>
              <div className="rp-lv-step-text">
                <span className={`rp-lv-step-name${done || active ? ' lit' : ''}`}>{name}</span>
                {active && <span className="rp-lv-step-sub">{agentSubs[i]}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity feed */}
      {agentLogs && agentLogs.length > 0 ? (
        <div className="rp-lv-feed">
          {agentLogs.slice(-6).map((log, i, arr) => (
            <div key={`${log.agentName}::${log.action}::${log.durationMs ?? 'x'}`} ref={i === arr.length - 1 ? latestLogRef : undefined} className="rp-lv-log">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: 'var(--accent)', textTransform: 'uppercase', flexShrink: 0, paddingTop: 1, minWidth: 62 }}>[{log.agentName}]</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{log.action}</span>
            </div>
          ))}
        </div>
      ) : (
        !stageMessage && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            5 AI agents working · {progress}%
          </p>
        )
      )}
    </div>
  );
}
