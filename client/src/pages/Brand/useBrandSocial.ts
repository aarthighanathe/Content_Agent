import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const socialConnectionsQuery = useQuery({
    queryKey: SOCIAL_CONNECTIONS_KEY,
    queryFn: getSocialConnections,
  });
  const socialConnections = socialConnectionsQuery.data?.connections ?? [];
  const oauthConfigured = socialConnectionsQuery.data?.oauthConfigured;

  const disconnectSocialMutation = useMutation({
    mutationFn: disconnectSocial,
    onSuccess: (_data, platform) => {
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
    onError: (_err, platform) => {
      setDisconnectConfirm(null);
      flashToast(`Failed to disconnect ${platform} — please try again.`, true, 4000);
    },
  });

  const handleConfirmDisconnect = useCallback((): void => {
    if (!disconnectConfirm) return;
    const platform = disconnectConfirm;
    setDisconnectingPlatform(platform);
    disconnectSocialMutation.mutate(platform, {
      onSettled: () => setDisconnectingPlatform(null),
    });
  }, [disconnectConfirm, disconnectSocialMutation]);

  const onConnect = useCallback((platform: string): void => {
    // WHY: authenticated startSocialConnect + navigate: bare /api <a href> skips
    // the Clerk Bearer and hits Vercel SPA rewrite (SEC-001).
    if (connectingPlatform) return;
    setConnectingPlatform(platform);
    startSocialConnect(platform)
      .then(({ authorizeUrl }) => {
        window.location.assign(authorizeUrl);
      })
      .catch(() => {
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
      if (connected && SOCIAL_CONNECTED.has(connected)) {
        flashToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`, false, 3500);
        socialConnectionsQuery.refetch().catch(() => {});
      }
      if (error) {
        const code = decodeURIComponent(error);
        flashToast(SOCIAL_ERROR_COPY[code] ?? SOCIAL_ERROR_COPY.connection_failed, true, 4000);
      }
      setSearchParams({}, { replace: true });
    }, 0);
    return () => clearTimeout(timer);
    // WHY: socialConnectionsQuery omitted: new object identity every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, flashToast, setSearchParams]);

  return {
    socialConnections,
    oauthConfigured,
    isLoading: socialConnectionsQuery.isLoading,
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
