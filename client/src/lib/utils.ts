// WHY this contract, and not more: Create.tsx (client/src/pages/Create.tsx) only ever reads
// `topic`/`platform` off `location.state` on mount — tone/targetAudience are draft-only
// (sessionStorage via Create/useDraft.ts, populated by the user typing on the page itself,
// never by router state), and `templateId` was previously passed by Library.tsx but never
// read anywhere in Create.tsx. Widening this contract to fields Create can't actually restore
// would just recreate the "5 call sites disagree about what's supported" problem this helper
// exists to fix. If Create.tsx's draft-handling grows to accept tone/audience/templateId as
// real prefill, extend this type and Create.tsx's `prefill` read together, in the same change.
export interface CreateHandoff {
  topic: string;
  platform?: string;
}

// WHY this narrow navigate type, not react-router's NavigateFunction: some call sites
// (Dashboard/RecentGenerations.tsx) aren't route components — they receive `navigate` as a
// prop typed to only what that component actually calls, not the full NavigateFunction
// overload set. Accepting the minimal shape this helper actually uses lets every call site
// pass its `navigate` in regardless of how narrowly its own prop type declares it.
type NavigateWithState = (path: string, options?: { state?: unknown }) => void;

export function navigateToCreate(navigate: NavigateWithState, handoff: CreateHandoff): void {
  navigate('/create', { state: handoff });
}

export function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getScoreColor(score: number): string {
  return score >= 80 ? 'var(--color-success)' : score >= 60 ? '#F59E0B' : '#F87171';
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
