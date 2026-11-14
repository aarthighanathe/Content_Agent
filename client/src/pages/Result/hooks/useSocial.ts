import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSocialConnections, postToSocial } from '../../../api';
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
): { socialConnections: SocialConnection[]; postingTo: string | null; postResult: Record<string, 'ok' | 'error'>; postLinks: Record<string, string>; handlePostNow: (platform: string) => Promise<void> } {
  const [postingTo, setPostingTo]   = useState<string | null>(null);
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

  // WHY: shared ['social','connections'] query key: one cached fetch is reused by Result,
  // Brand.tsx and DayDetailPanel. Connected-only filtering stays local to this hook.
  const { data: connectionsData } = useQuery({
    queryKey: ['social', 'connections'],
    queryFn: getSocialConnections,
    staleTime: 5 * 60 * 1000,
  });
  // WHY: derive, not an effect: avoids setState-in-effect and a per-mount refetch.
  const socialConnections = (connectionsData?.connections || []).filter((c) => c.connected);

  async function handlePostNow(platform: string) {
    if (!content || postingTo) return;
    setPostingTo(platform);
    try {
      // WHY: unknown->postToSocial's param cast: VideoScriptContentData (a plain interface,
      // no index signature) doesn't structurally satisfy Record<string, unknown> under TS's
      // rules even though it's a genuine object at runtime — the `!content` guard above
      // already confirmed it's defined, so this is a type-system technicality, not an
      // unchecked cast.
      const res = await postToSocial(platform, content as unknown as PlatformContent | PlatformContent[] | string, jobId);
      if (!isMountedRef.current) return;
      setPostResult((p) => ({ ...p, [platform]: 'ok' }));
      if (res.postUrl) setPostLinks((p) => ({ ...p, [platform]: res.postUrl! }));
    } catch {
      if (!isMountedRef.current) return;
      setPostResult((p) => ({ ...p, [platform]: 'error' }));
    }
    if (!isMountedRef.current) return;
    setPostingTo(null);
    pendingTimers.set(() => {
      setPostResult((p) => { const n = { ...p }; delete n[platform]; return n; });
    }, 4000);
  }

  return { socialConnections, postingTo, postResult, postLinks, handlePostNow };
}
