import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import {
  getSocialConnections,
  disconnectSocial,
  startSocialConnect,
} from '../../api';
import type { SocialConnection } from '../../types/api';

const SOCIAL_CONNECTIONS_KEY = ['social', 'connections'] as const;

type FlashToast = (message: string, isError?: boolean, durationMs?: number) => void;

interface UseBrandSocialResult {
  socialConnections: SocialConnection[];
  oauthConfigured: { linkedin: boolean; twitter: boolean } | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  disconnectingPlatform: string | null;
  disconnectConfirm: string | null;
  setDisconnectConfirm: (platform: string | null) => void;
  connectingPlatform: string | null;
  onConnect: (platform: string) => void;
  handleConfirmDisconnect: () => void;
  disconnectPending: boolean;
}

// WHY: extracted from Brand.tsx: remounting PublishingConnectionsCard without
// this hook pushed Brand past the 400-line cap again. Connect/disconnect/
// confirm + OAuth redirect toasts are self-contained here.
export function useBrandSocial(flashToast: FlashToast): UseBrandSocialResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  // WHY: live id for disconnect/connect after await — render-time userId is stale.
  const userIdRef = useRef(userId ?? null);
  userIdRef.current = userId ?? null;
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const socialConnectionsQuery = useQuery({
    queryKey: SOCIAL_CONNECTIONS_KEY,
    queryFn: getSocialConnections,
    // WHY: gate like Create/Library — avoid an unauthenticated fetch before Clerk hydrates.
    enabled: authLoaded && isSignedIn,
  });
  const socialConnections = socialConnectionsQuery.data?.connections ?? [];
  const oauthConfigured = socialConnectionsQuery.data?.oauthConfigured;

  const disconnectSocialMutation = useMutation({
    mutationFn: disconnectSocial,
    // WHY: capture at mutate — setQueryData/toast must not land on a switched account.
    onMutate: (): { mutateUserId: string | null } => ({
      mutateUserId: userIdRef.current,
    }),
    onSuccess: (_data, platform, context) => {
      if (userIdRef.current !== (context?.mutateUserId ?? null)) return;
      queryClient.setQueryData(
        SOCIAL_CONNECTIONS_KEY,
        (prev: { connections: SocialConnection[]; oauthConfigured?: { linkedin: boolean; twitter: boolean } } | undefined) =>
          prev
            ? {
                ...prev,
                connections: prev.connections.map((c) =>
                  c.platform === platform
                    ? { ...c, connected: false, displayName: null }
                    : c,
                ),
              }
            : prev,
      );
      setDisconnectConfirm(null);
      flashToast(`${platform} disconnected`, false, 2500);
    },
    onError: (_err, platform, context) => {
      if (userIdRef.current !== (context?.mutateUserId ?? null)) return;
      setDisconnectConfirm(null);
      flashToast(`Failed to disconnect ${platform} — please try again.`, true, 4000);
    },
  });

  // WHY: account switch must clear connect/disconnect UI + reset the mutation —
  // otherwise the new user inherits a stuck "Connecting…" / pending disconnect
  // from the previous account's in-flight request.
  useEffect(() => {
    setConnectingPlatform(null);
    setDisconnectConfirm(null);
    setDisconnectingPlatform(null);
    disconnectSocialMutation.reset();
    // WHY: reset only on userId — mutation object identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleConfirmDisconnect = useCallback((): void => {
    if (!disconnectConfirm) return;
    const platform = disconnectConfirm;
    setDisconnectingPlatform(platform);
    disconnectSocialMutation.mutate(platform, {
      // WHY: same mutateUserId gate as onSuccess/onError — a settled request from
      // the previous account must not clear the new account's disconnecting UI.
      onSettled: (_data, _error, _vars, context) => {
        if (userIdRef.current !== (context?.mutateUserId ?? null)) return;
        setDisconnectingPlatform(null);
      },
    });
  }, [disconnectConfirm, disconnectSocialMutation]);

  const onConnect = useCallback((platform: string): void => {
    // WHY: authenticated startSocialConnect + navigate: bare /api <a href> skips
    // the Clerk Bearer and hits Vercel SPA rewrite (SEC-001).
    if (connectingPlatform) return;
    // WHY: capture at click — OAuth assign must not send a switched account to
    // the previous user's authorize URL.
    const connectUserId = userIdRef.current;
    setConnectingPlatform(platform);
    startSocialConnect(platform)
      .then(({ authorizeUrl }) => {
        if (userIdRef.current !== connectUserId) {
          setConnectingPlatform(null);
          return;
        }
        window.location.assign(authorizeUrl);
      })
      .catch(() => {
        if (userIdRef.current !== connectUserId) {
          setConnectingPlatform(null);
          return;
        }
        flashToast(`Failed to start ${platform} connection — please try again.`, true, 4000);
        setConnectingPlatform(null);
      });
  }, [connectingPlatform, flashToast]);

  const onRetry = useCallback((): void => {
    socialConnectionsQuery.refetch().catch(() => {});
  }, [socialConnectionsQuery]);

  // OAuth callback lands on /brand?social_connected=… or ?social_error=…
  useEffect(() => {
    const connected = searchParams.get('social_connected');
    const error = searchParams.get('social_error');
    if (!connected && !error) return;
    // WHY: capture at effect start — timer must no-op if the user switched accounts
    // before the deferred toast/refetch runs.
    const callbackUserId = userIdRef.current;
    // SECURITY: allowlist only — never toast raw query-string text (SEC-014).
    const SOCIAL_CONNECTED = new Set(['linkedin', 'twitter']);
    const SOCIAL_ERROR_COPY: Record<string, string> = {
      provider_denied: 'You denied access — connection was cancelled.',
      missing_params: 'OAuth callback was incomplete — please try connecting again.',
      invalid_state: 'OAuth session was invalid — please try connecting again.',
      csrf_mismatch: 'OAuth session mismatch — please try connecting again.',
      session_expired: 'OAuth session expired or already used — please try again.',
      linkedin_not_configured: 'LinkedIn OAuth is not configured on this server.',
      twitter_not_configured: 'Twitter OAuth is not configured on this server.',
      connection_failed: 'Connection failed — please try again.',
    };
    const timer = setTimeout(() => {
      // WHY: always strip callback params; only toast/refetch if still same user.
      setSearchParams({}, { replace: true });
      if (userIdRef.current !== callbackUserId) return;
      if (connected && SOCIAL_CONNECTED.has(connected)) {
        flashToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`, false, 3500);
        socialConnectionsQuery.refetch().catch(() => {});
      }
      if (error) {
        const code = decodeURIComponent(error);
        flashToast(SOCIAL_ERROR_COPY[code] ?? SOCIAL_ERROR_COPY.connection_failed, true, 4000);
      }
    }, 0);
    return () => clearTimeout(timer);
    // WHY: socialConnectionsQuery omitted: new object identity every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, flashToast, setSearchParams, userId]);

  return {
    socialConnections,
    oauthConfigured,
    // WHY: isPending, not isLoading: while Clerk hydrates the query is disabled
    // and isLoading is false — that would flash a disconnected state briefly.
    isLoading: socialConnectionsQuery.isPending,
    isError: socialConnectionsQuery.isError,
    onRetry,
    disconnectingPlatform,
    disconnectConfirm,
    setDisconnectConfirm,
    connectingPlatform,
    onConnect,
    handleConfirmDisconnect,
    disconnectPending: disconnectSocialMutation.isPending,
  };
}
