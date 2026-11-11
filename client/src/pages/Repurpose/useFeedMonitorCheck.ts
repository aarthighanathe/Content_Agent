import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { checkFeedMonitorNow } from '../../api';
import { useTrackedTimeout } from '../../hooks/useTrackedTimeout';

// WHY extracted: FeedMonitorPanel hit the 400-line cap after QA-FEED-001's
// longer post-check polling; the check mutation + error + pending id are a
// self-contained unit the panel can wire into row buttons.
export function useFeedMonitorCheck(): {
  checkMutation: {
    mutate: (id: string) => void;
    isPending: boolean;
    variables: string | undefined;
  };
  checkingId: string | null;
  checkError: { id: string; message: string } | null;
} {
  const queryClient = useQueryClient();
  const pendingTimeouts = useTrackedTimeout();
  const [checkError, setCheckError] = useState<{ id: string; message: string } | null>(null);

  const checkMutation = useMutation({
    mutationFn: (id: string) => checkFeedMonitorNow(id),
    onSuccess: () => {
      setCheckError(null);
      // WHY poll ~15s (QA-FEED-001): Check now returns 202 while the worker
      // may take up to the feed fetch timeout (+ retries) before writing
      // lastCheckedAt / lastError. A single 2s invalidate often refreshed too
      // early and left the row looking unchanged / healthy.
      const startedAt = Date.now();
      const refreshMonitors = (): void => {
        Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: ['feedMonitors'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'feedMonitors'] }),
        ]).catch(() => {});
        if (Date.now() - startedAt < 15_000) {
          pendingTimeouts.set(refreshMonitors, 2000);
        }
      };
      pendingTimeouts.set(refreshMonitors, 1500);
    },
    onError: (_err, id) => setCheckError({ id, message: 'Check failed — try again shortly.' }),
  });

  const checkingId = checkMutation.isPending ? checkMutation.variables : null;
  return { checkMutation, checkingId, checkError };
}
