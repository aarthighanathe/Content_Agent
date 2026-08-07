// WHY this contract, and not more: Create.tsx (client/src/pages/Create.tsx) only ever reads
// `topic`/`platform` off `location.state` on mount — tone/targetAudience are draft-only
// (sessionStorage via Create/useDraft.ts, populated by the user typing on the page itself,
// never by router state), and `templateId` was previously passed by Library.tsx but never
// read anywhere in Create.tsx. Widening this contract to fields Create can't actually restore
// would just recreate the "5 call sites disagree about what's supported" problem this helper
// exists to fix. If Create.tsx's draft-handling grows to accept tone/audience/templateId as
// real prefill, extend this type and Create.tsx's `prefill` read together, in the same change.
//
// WHY industry/competitorContext/competitorAnalysisId were added together (not
// industry alone): Competitor.tsx's "Create content →" CTAs (content gap /
// suggested angle) needed a way to carry enough competitor-analysis context
// for POST /jobs/create to inject it into the writer's prompt (see
// routes/jobs/create.ts's WHY comment on the same field names) — industry
// alone wouldn't let the server thread the actual gap/angle text through.
// All three are optional and silently flow through as extra prompt context
// (no new Create.tsx UI field), same "simplest option" reasoning Create
// already uses for tone/audience defaults. Widened here AND Create.tsx's
// prefill read in the same change, per this comment's own rule above.
export interface CreateHandoff {
  topic: string;
  platform?: string;
  industry?: string;
  competitorContext?: string;
  competitorAnalysisId?: string;
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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// SECURITY: extracted from two near-identical inline copies (Ideate/IdeaCard.tsx's
// idea.sourceUrl, Result/ResultHeader.tsx's job.sourceUrl) to avoid a third
// diverging one here — every value rendered as an <a href> that ultimately
// traces back to LLM output or a DB-echoed value (not a same-request literal)
// needs this same check: a crafted javascript: URL executes on click despite
// React's JSX escaping, since React only escapes markup, not URL schemes.
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
