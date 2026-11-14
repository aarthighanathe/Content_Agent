import { useState, useRef, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { repurposeUrl, repurposeBatchUrls } from '../../api';
import type { RepurposeHistoryEntry } from './useRepurposeHistory';

const AUDIENCE_DEFAULTS: Record<string, string> = {
  instagram_carousel: 'content creators and marketers',
  linkedin_post:      'founders and business professionals',
  twitter_thread:     'tech enthusiasts and entrepreneurs',
  instagram_caption:  'lifestyle and brand followers',
  video_script:       'short-form video viewers aged 18-35',
};

export { AUDIENCE_DEFAULTS };

interface PlatformOption {
  id: string;
}

interface Args {
  platforms: PlatformOption[];
  addEntry: (entry: Omit<RepurposeHistoryEntry, 'id' | 'createdAt'>) => void;
}

export interface UseRepurposeSubmitResult {
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
  platform: string;
  setPlatform: Dispatch<SetStateAction<string>>;
  tone: string;
  setTone: Dispatch<SetStateAction<string>>;
  audience: string;
  setAudience: Dispatch<SetStateAction<string>>;
  loading: boolean;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  batchMode: boolean;
  setBatchMode: Dispatch<SetStateAction<boolean>>;
  batchUrls: string;
  setBatchUrls: Dispatch<SetStateAction<string>>;
  multiPlatform: boolean;
  setMultiPlatform: Dispatch<SetStateAction<boolean>>;
  selectedPlatforms: Set<string>;
  togglePlatformSelection: (id: string) => void;
  effectiveAudience: string;
  parsedBatchUrls: Array<{ url: string; platform: string }>;
  isValid: string | boolean;
  handleRepurpose: () => Promise<void>;
  handleClear: () => void;
  handleRetryFromHistory: (entry: RepurposeHistoryEntry) => void;
}

export function useRepurposeSubmit({ platforms, addEntry }: Args): UseRepurposeSubmitResult {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('linkedin_post');
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');
  const [multiPlatform, setMultiPlatform] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(() => new Set(['linkedin_post']));

  function togglePlatformSelection(id: string): void {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const effectiveAudience = audience.trim() || AUDIENCE_DEFAULTS[platform] || 'general audience';

  const parsedBatchUrls = batchUrls.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split('|');
    if (parts.length === 2) {
      const [platformPart, urlPart] = parts;
      const trimmedPlatform = platformPart.trim();
      const trimmedUrl = urlPart.trim();
      const validPlatform = platforms.find(p => p.id === trimmedPlatform);
      if (validPlatform) {
        return { url: trimmedUrl, platform: validPlatform.id };
      }
    }
    return { url: line, platform };
  });

  const isValid = batchMode
    ? parsedBatchUrls.length > 0 && tone && platform
    : multiPlatform
      ? url.trim() && selectedPlatforms.size > 0 && tone
      : url.trim() && platform && tone;

  // WHY: validate with `new URL()` before ever hitting the network: the server's own
  // repurpose route does the identical `new URL(url)` try/catch (content/repurpose.ts)
  // and rejects malformed input with a 400 — previously the only client-side check was
  // the browser's built-in `type="url"`, which is easy to bypass (e.g. paste events,
  // some mobile keyboards) and still cost a full request/response round trip to fail.
  // This mirrors the server's exact validation logic (protocol must be http/https) so
  // the client-side and server-side rules can't silently drift apart.
  function validateUrl(value: string): string | null {
    const trimmed = value.trim();
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'Invalid URL — must start with http:// or https://';
      }
      return null;
    } catch {
      return 'That doesn\'t look like a valid URL — check for typos and try again.';
    }
  }

  // WHY: a single "Processing…" state, not a two-phase "fetching then generating" one:
  // the server's POST /content/repurpose route does URL-fetch + job creation in one
  // synchronous request/response (server/src/routes/content.ts) — there's no SSE/progress
  // signal to distinguish those two steps client-side. A fabricated setTimeout used to
  // fake that distinction, contradicting Result's own LoadingView comment about never
  // showing invented progress (audit #32). One honest state instead.
  async function handleRepurpose() {
    if (!isValid || loading || submittingRef.current) return;
    submittingRef.current = true;

    if (batchMode) {
      const badUrls = parsedBatchUrls.filter((item) => { try { const p = new URL(item.url); return !['http:', 'https:'].includes(p.protocol); } catch { return true; } });
      if (badUrls.length > 0) {
        setError(`Invalid URL(s): ${badUrls.slice(0, 2).map((i) => i.url).join(', ')}${badUrls.length > 2 ? ' …' : ''}`);
        submittingRef.current = false;
        return;
      }
      setLoading(true);
      setError('');
      try {
        const items = parsedBatchUrls.map((item) => ({
          url: item.url,
          platform: item.platform,
          tone,
          targetAudience: effectiveAudience,
        }));
        const { jobs, failedItems } = await repurposeBatchUrls(items);
        for (const j of jobs) addEntry({ url: j.topic, platform: j.platform, outcome: 'success', jobId: j.jobId });
        if (failedItems.length > 0) {
          setError(`${failedItems.length} URL(s) failed: ${failedItems.map((f) => f.error).slice(0, 2).join('; ')}`);
        }
        if (jobs.length > 0) {
          try {
            sessionStorage.setItem(
              'ca_batch_result_v1',
              JSON.stringify({ jobs, creationFailedCount: failedItems.length, savedAt: Date.now() }),
            );
          } catch { /* ignore */ }
          navigate('/batch-result', { state: { jobs, creationFailedCount: failedItems.length } });
        } else {
          // WHY: clear loading when every URL failed: previously only the catch
          // path called setLoading(false), so a 200 with jobs.length === 0 left
          // the button stuck on "Processing…" until the user left the page.
          setLoading(false);
          submittingRef.current = false;
        }
      } catch (err: unknown) {
        const msg = axios.isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
        setError(msg || 'Batch failed — please try again.');
        setLoading(false);
        submittingRef.current = false;
      }
      return;
    }

    const clientError = validateUrl(url);
    if (clientError) {
      setError(clientError);
      submittingRef.current = false;
      return;
    }
    setLoading(true);
    setError('');

    const trimmedUrl = url.trim();
    const platformsToSubmit = multiPlatform ? Array.from(selectedPlatforms) : undefined;
    try {
      const { jobId, topic, jobs } = await repurposeUrl({
        url: trimmedUrl, platform, platforms: platformsToSubmit, tone, targetAudience: effectiveAudience,
      });
      if (multiPlatform && jobs && jobs.length > 1) {
        // WHY: one history entry per platform, not one for the whole batch:
        // RepurposeHistoryList's retry/view-result actions are per-job (a
        // single jobId to link to) — recording per-platform keeps that
        // contract intact instead of teaching the history list a second,
        // batch-shaped entry type for this one case.
        for (const job of jobs) addEntry({ url: trimmedUrl, platform: job.platform, outcome: 'success', jobId: job.jobId });
        // WHY: BatchResult, not /result/:jobId: N jobs from one submission is
        // exactly BatchResult.tsx's shape (built for Create's batch mode) —
        // reusing it here instead of building a second "N jobs, one submission"
        // results page, and it already polls/displays per-job status+score.
        try {
          sessionStorage.setItem(
            'ca_batch_result_v1',
            JSON.stringify({
              jobs: jobs.map((j) => ({ ...j, topic })),
              savedAt: Date.now(),
            }),
          );
        } catch { /* ignore */ }
        navigate('/batch-result', { state: { jobs: jobs.map((j) => ({ ...j, topic })) } });
      } else {
        addEntry({ url: trimmedUrl, platform, outcome: 'success', jobId });
        navigate(`/result/${jobId}`);
      }
    } catch (err: unknown) {
      // WHY: axios.isAxiosError: narrows `unknown` to AxiosError before reading the
      // server's { error: string } response body, instead of trusting an `any` catch.
      const msg = axios.isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      const errorMessage = msg || 'Failed to process the URL — please try again.';
      // WHY: recorded here, not for a client-side validateUrl() rejection above:
      // this is a real attempt that reached the server (fetch failure,
      // insufficient content, etc.) — worth remembering so the user can retry
      // without re-finding the article. A malformed URL caught before the
      // network call isn't a meaningful "attempt" to look back on.
      addEntry({ url: trimmedUrl, platform, outcome: 'failed', errorMessage });
      setError(errorMessage);
      setLoading(false);
      submittingRef.current = false;
    }
  }

  // WHY: a dedicated reset, not just "type over it": after a failed submit (bad URL,
  // fetch failure, insufficient content, etc.) the stale field values previously just
  // sat there with no easy way back to a clean slate — this clears everything back to
  // the form's initial defaults in one click.
  function handleClear() {
    setUrl('');
    setBatchMode(false);
    setBatchUrls('');
    setPlatform('linkedin_post');
    setSelectedPlatforms(new Set(['linkedin_post']));
    setTone('professional');
    setAudience('');
    setError('');
    setLoading(false);
    submittingRef.current = false;
  }

  // WHY: re-fill, not re-submit: a past failure might need the user to check
  // the URL still works, or the platform choice still makes sense — re-filling
  // the form and letting them hit "Repurpose & Generate" themselves matches
  // how every other retry affordance in this app works (e.g. Ideate's regenerate),
  // rather than silently re-firing the exact same request that just failed.
  function handleRetryFromHistory(entry: RepurposeHistoryEntry): void {
    setUrl(entry.url);
    setPlatform(entry.platform);
    setMultiPlatform(false);
    setSelectedPlatforms(new Set([entry.platform]));
    setError('');
  }

  return {
    url, setUrl,
    platform, setPlatform,
    tone, setTone,
    audience, setAudience,
    loading,
    error, setError,
    batchMode, setBatchMode,
    batchUrls, setBatchUrls,
    multiPlatform, setMultiPlatform,
    selectedPlatforms,
    togglePlatformSelection,
    effectiveAudience,
    parsedBatchUrls,
    isValid,
    handleRepurpose,
    handleClear,
    handleRetryFromHistory,
  };
}
