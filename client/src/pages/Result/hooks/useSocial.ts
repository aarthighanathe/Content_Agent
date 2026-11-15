import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { getJob, getSocialConnections, postToSocial } from '../../../api';
import { useIsMountedRef, useTrackedTimeout } from '../../../hooks/useTrackedTimeout';
import type { PlatformContent, VideoScriptContentData } from '../../../types/job';
import type { SocialConnection } from '../../../types/api';
import type { SlideData } from '../components/content/carousel/IGSlide';

// WHY: the full ResultContent-shaped union (not just PlatformContent): Result.tsx passes
// whatever `content` currently is — carousel slides, a flat platform post, or a video
// script — straight through to this hook (same as before typing, when it was `any`).
// postToSocial's own signature is widened to match below.
export type SocialContent = SlideData[] | PlatformContent | VideoScriptContentData;

export function useSocial(
  content: SocialContent | string | undefined,
  jobId: string | undefined,
): {
  socialConnections: SocialConnection[];
  connectionsPending: boolean;
  postingTo: string | null;
  postResult: Record<string, 'ok' | 'error'>;
  postLinks: Record<string, string>;
  handlePostNow: (platform: string) => Promise<void>;
} {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const [postingTo, setPostingTo]   = useState<string | null>(null);
  // WHY: ref + postingTo: postingTo alone races a second click before re-render (Create pattern).
  const postingRef = useRef(false);
  const [postResult, setPostResult] = useState<Record<string, 'ok' | 'error'>>({});
  // WHY: not cleared with postResult's 4s timeout: the ok/error badge is transient, but
  // "View post" should stay clickable for the whole drawer session.
  const [postLinks, setPostLinks] = useState<Record<string, string>>({});
  // WHY: handlePostNow fires from a click handler, not an effect: there's no
  // natural cleanup point for its 4s "clear the ok/error badge" timer, so it's
  // tracked and cleared on unmount via the shared hook below.
  const pendingTimers = useTrackedTimeout();
  // WHY: handlePostNow is invoked from PostPanel, which (like HashtagPanel)
  // unmounts when ActionDrawer's tab changes or the drawer closes. If
  // postToSocial()'s request is still in flight at that point, the setState
  // calls right after the await would otherwise fire against an unmounted
  // component.
  const isMountedRef = useIsMountedRef();
  // WHY: ref mirror so a post that outlives A→B navigation cannot paint ok/error
  // onto B's drawer (closure jobId alone stays the started-for id).
  const jobIdRef = useRef(jobId);
  const userIdRef = useRef(userId ?? null);
  const postAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);

  userIdRef.current = userId ?? null;

  // WHY: abort + clear on account switch — jobId-only gates left an in-flight
  // post painting ok/error into the new session when the route jobId stayed put.
  useEffect(() => {
    postAbortRef.current?.abort();
    postAbortRef.current = null;
    setPostingTo(null);
    postingRef.current = false;
    setPostResult({});
    setPostLinks({});
  }, [userId]);

  // WHY: shared ['social','connections'] query key: one cached fetch is reused by Result,
  // Brand.tsx and DayDetailPanel. Connected-only filtering stays local to this hook.
  const { data: connectionsData, isPending: connectionsPending } = useQuery({
    // WHY: same key as useBrandSocial / DayDetailPanel — UserScopeSync clears on switch.
    queryKey: ['social', 'connections'],
    queryFn: getSocialConnections,
    staleTime: 5 * 60 * 1000,
    enabled: authLoaded && isSignedIn,
  });
  // WHY: derive, not an effect: avoids setState-in-effect and a per-mount refetch.
  const socialConnections = (connectionsData?.connections || []).filter((c) => c.connected);

  async function handlePostNow(platform: string) {
    if (!content || !jobId || postingTo || postingRef.current) return;
    postingRef.current = true;
    const startedFor = jobId;
    const startedForUserId = userIdRef.current;
    postAbortRef.current?.abort();
    const abort = new AbortController();
    postAbortRef.current = abort;
    setPostingTo(platform);
    try {
      // SECURITY: re-getJob before posting — ownership 404 is a hard stop so a
      // stale drawer body from a previous account cannot be published.
      await getJob(jobId, abort.signal);
      if (
        !isMountedRef.current
        || jobIdRef.current !== startedFor
        || userIdRef.current !== startedForUserId
        || abort.signal.aborted
      ) {
        return;
      }
      // WHY: unknown->postToSocial's param cast: VideoScriptContentData (a plain interface,
      // no index signature) doesn't structurally satisfy Record<string, unknown> under TS's
      // rules even though it's a genuine object at runtime — the `!content` guard above
      // already confirmed it's defined, so this is a type-system technicality, not an
      // unchecked cast.
      const res = await postToSocial(
        platform,
        content as unknown as PlatformContent | PlatformContent[] | string,
        jobId,
        abort.signal,
      );
      if (
        !isMountedRef.current
        || jobIdRef.current !== startedFor
        || userIdRef.current !== startedForUserId
        || abort.signal.aborted
      ) {
        return;
      }
      setPostResult((p) => ({ ...p, [platform]: 'ok' }));
      if (res.postUrl) setPostLinks((p) => ({ ...p, [platform]: res.postUrl! }));
    } catch {
      if (
        !isMountedRef.current
        || jobIdRef.current !== startedFor
        || userIdRef.current !== startedForUserId
        || abort.signal.aborted
      ) {
        return;
      }
      setPostResult((p) => ({ ...p, [platform]: 'error' }));
    } finally {
      // WHY: always clear — navigation mid-await must not leave postingRef stuck true.
      postingRef.current = false;
      if (postAbortRef.current === abort) {
        postAbortRef.current = null;
      }
    }
    if (!isMountedRef.current) return;
    // WHY: idle the button even after A→B nav; only gate result/link updates below.
    if (userIdRef.current === startedForUserId) {
      setPostingTo(null);
    }
    if (jobIdRef.current !== startedFor || userIdRef.current !== startedForUserId) return;
    pendingTimers.set(() => {
      setPostResult((p) => { const n = { ...p }; delete n[platform]; return n; });
    }, 4000);
  }

  return {
    socialConnections,
    // WHY: isPending (not isLoading) — Clerk-gated query would flash empty "No connected
    // accounts" while auth hydrates / the first fetch is in flight.
    connectionsPending: !authLoaded || (isSignedIn && connectionsPending),
    postingTo,
    postResult,
    postLinks,
    handlePostNow,
  };
}
