import { useState, useEffect, useRef } from 'react';
import { getSocialConnections, postToSocial } from '../../../api';
import type { PlatformContent, VideoScriptContentData } from '../../../types/job';
import type { SocialConnection } from '../../../types/api';
import type { SlideData } from '../components/content/carousel/IGSlide';

// WHY the full ResultContent-shaped union (not just PlatformContent): Result.tsx passes
// whatever `content` currently is — carousel slides, a flat platform post, or a video
// script — straight through to this hook (same as before typing, when it was `any`).
// postToSocial's own signature is widened to match below.
export type SocialContent = SlideData[] | PlatformContent | VideoScriptContentData;

export function useSocial(
  content: SocialContent | string | undefined,
  jobId: string | undefined,
): { socialConnections: SocialConnection[]; postingTo: string | null; postResult: Record<string, 'ok' | 'error'>; postLinks: Record<string, string>; handlePostNow: (platform: string) => Promise<void> } {
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [postingTo, setPostingTo]   = useState<string | null>(null);
  const [postResult, setPostResult] = useState<Record<string, 'ok' | 'error'>>({});
  // WHY not cleared alongside postResult's 4s timeout: unlike the ok/error badge
  // (which is meant to be transient), "View post" should stay clickable for as
  // long as the drawer session lasts — clearing it after 4s would make a real,
  // successfully-posted link vanish while the user is still looking at the panel
  // (FUNCTIONAL_AUDIT_2026-07.md finding #10).
  const [postLinks, setPostLinks] = useState<Record<string, string>>({});
  // WHY a ref-tracked Set, not a bare setTimeout: handlePostNow fires from a
  // click handler, not an effect, so there's no natural cleanup point for its
  // 4s "clear the ok/error badge" timer. Tracking every live timer here and
  // clearing them all on unmount prevents a setState call landing after the
  // component (or drawer) has unmounted.
  const pendingTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    getSocialConnections()
      .then(({ connections }) => setSocialConnections(connections.filter((c) => c.connected)))
      .catch(() => {});
  }, []);

  useEffect(() => () => {
    pendingTimers.current.forEach(clearTimeout);
    pendingTimers.current.clear();
  }, []);

  async function handlePostNow(platform: string) {
    if (!content || postingTo) return;
    setPostingTo(platform);
    try {
      // WHY unknown->postToSocial's param cast: VideoScriptContentData (a plain interface,
      // no index signature) doesn't structurally satisfy Record<string, unknown> under TS's
      // rules even though it's a genuine object at runtime — the `!content` guard above
      // already confirmed it's defined, so this is a type-system technicality, not an
      // unchecked cast.
      const res = await postToSocial(platform, content as unknown as PlatformContent | PlatformContent[] | string, jobId);
      setPostResult((p) => ({ ...p, [platform]: 'ok' }));
      if (res.postUrl) setPostLinks((p) => ({ ...p, [platform]: res.postUrl! }));
    } catch {
      setPostResult((p) => ({ ...p, [platform]: 'error' }));
    }
    setPostingTo(null);
    const timer = setTimeout(() => {
      pendingTimers.current.delete(timer);
      setPostResult((p) => { const n = { ...p }; delete n[platform]; return n; });
    }, 4000);
    pendingTimers.current.add(timer);
  }

  return { socialConnections, postingTo, postResult, postLinks, handlePostNow };
}
