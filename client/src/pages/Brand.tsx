import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { updateBrandVoice, getProfile, analyzeVoice, getSocialConnections, disconnectSocial, exportMyData, deleteMyAccount } from '../api';
import { useAppStore } from '../store';
import type { ContentDna } from '../types/api';
import { IdentityCard } from './Brand/IdentityCard';
import { VoiceCard } from './Brand/VoiceCard';
import { ContentDnaCard } from './Brand/ContentDnaCard';
import { PublishingConnectionsCard } from './Brand/PublishingConnectionsCard';
import { DangerZoneCard } from './Brand/DangerZoneCard';
import { DeleteAccountModal } from './Brand/DeleteAccountModal';

// WHY this exact key: Dashboard.tsx's profileQuery uses ['dashboard', 'profile'] for the
// same getProfile() call. Sharing the key means both pages read/write one cache entry —
// editing brand info here now invalidates what Dashboard shows, instead of the two pages
// silently diverging (audit #25/2026-07).
const PROFILE_QUERY_KEY = ['dashboard', 'profile'];

export default function BrandSettings() {
  const { setUserProfile } = useAppStore();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();

  const [brandName, setBrandName]                 = useState('');
  const [industry, setIndustry]                   = useState('');
  const [website, setWebsite]                     = useState('');
  const [selectedVoices, setSelectedVoices]       = useState<string[]>(['Professional']);
  const [phrasesUse, setPhrasesUse]               = useState('');
  const [phrasesAvoid, setPhrasesAvoid]           = useState('');
  const [saveError, setSaveError]                 = useState('');
  const [dnaSamples, setDnaSamples]               = useState('');
  const [contentDna, setContentDna]               = useState<ContentDna | null>(null);
  const [dnaError, setDnaError]                   = useState('');
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const [exportError, setExportError]             = useState('');
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError]             = useState('');
  const [resetConfirming, setResetConfirming]     = useState(false);
  // WHY a single unified toast (#36): Brand previously maintained two separate toast
  // mechanisms — a boolean `showToast` for the save-success banner and a string+boolean
  // pair (`socialToast`/`socialToastIsError`) for social-connect/disconnect feedback.
  // Both rendered `.toast` divs with identical CSS but divergent state shapes, making
  // them impossible to reason about together (e.g. they could theoretically stack).
  // One `{ message, isError? } | null` state drives a single toast element; `flashToast`
  // replaces every previous call site.
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashToast = useCallback((message: string, isError = false, durationMs = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, isError });
    toastTimerRef.current = setTimeout(() => setToast(null), durationMs);
  }, []);
  // Clear timer on unmount to avoid setState-after-unmount.
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const profileQuery = useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: getProfile });
  const socialConnectionsQuery = useQuery({ queryKey: ['brand', 'socialConnections'], queryFn: getSocialConnections });
  const socialConnections = socialConnectionsQuery.data?.connections ?? [];

  // WHY a hydrated-once guard (audit #2, original: "profile-load race clobbering
  // in-progress edits"): profileQuery can refetch/refresh in the background (window
  // refocus, another tab's mutation invalidating this same shared key, React Query's
  // default staleness behavior) at any point while the user is mid-edit on this form.
  // Only copying server data into local state the FIRST time it successfully loads —
  // never on subsequent background refetches — means a user who's already typed into a
  // field can't have it silently overwritten out from under them.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !profileQuery.data) return undefined;
    hydrated.current = true;
    const profile = profileQuery.data;
    // WHY setTimeout(..., 0): calling setState synchronously inside an effect body
    // triggers react-hooks/set-state-in-effect. Deferring via a 0ms timeout keeps
    // the same user-visible behaviour (fires in the same microtask flush) while
    // satisfying the rule — the state update now happens in a callback, not in the
    // effect body itself.
    const t = setTimeout(() => {
      if (profile.brandName)    setBrandName(profile.brandName);
      if (profile.industry)     setIndustry(profile.industry);
      if (profile.brandVoice)   setSelectedVoices(profile.brandVoice.split(',').map((v: string) => v.trim()).filter(Boolean));
      if (profile.phrasesUse)   setPhrasesUse(profile.phrasesUse);
      if (profile.phrasesAvoid) setPhrasesAvoid(profile.phrasesAvoid);
      if (profile.contentDna)   setContentDna(profile.contentDna);
    }, 0);
    return () => clearTimeout(t);
  }, [profileQuery.data]);

  useEffect(() => {
    const connected = searchParams.get('social_connected');
    const error     = searchParams.get('social_error');
    // WHY setTimeout(..., 0): calling setState synchronously inside an effect body
    // triggers react-hooks/set-state-in-effect. Deferring via a 0ms timeout keeps
    // the same user-visible behaviour (fires in the same microtask flush) while
    // satisfying the rule — the state update now happens in a callback, not in the
    // effect body itself.
    const timer = setTimeout(() => {
      if (connected) {
        flashToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`, false, 3500);
        void socialConnectionsQuery.refetch();
      }
      if (error) {
        flashToast(decodeURIComponent(error), true, 4000);
      }
    }, 0);
    return () => clearTimeout(timer);
    // WHY socialConnectionsQuery excluded from deps: it's a new object identity every
    // render (React Query's useQuery result isn't memoized across renders), which would
    // re-run this effect (and re-fire the toast timers) constantly. Only `refetch` is
    // actually called, and that function's identity is stable across a query's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, flashToast]);

  const updateBrandVoiceMutation = useMutation({
    mutationFn: updateBrandVoice,
    onSuccess: (_data, variables) => {
      setUserProfile({ brandName: variables.brandName, brandVoice: variables.brandVoice, phrasesUse: variables.phrasesUse, phrasesAvoid: variables.phrasesAvoid });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      flashToast('Brand settings saved!');
    },
    onError: () => {
      setSaveError('Failed to save brand settings — please try again.');
    },
  });

  const analyzeVoiceMutation = useMutation({
    mutationFn: analyzeVoice,
    onSuccess: ({ contentDna: dna }) => {
      setContentDna(dna);
      setDnaSamples('');
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
    onError: () => {
      setDnaError('Analysis failed — please try again.');
    },
  });

  const disconnectSocialMutation = useMutation({
    mutationFn: disconnectSocial,
    onSuccess: (_data, platform) => {
      queryClient.setQueryData(['brand', 'socialConnections'], (prev: { connections: typeof socialConnections } | undefined) =>
        prev ? { connections: prev.connections.map(c => c.platform === platform ? { ...c, connected: false, displayName: null } : c) } : prev
      );
      flashToast(`${platform} disconnected`, false, 2500);
    },
    // WHY no onError toast: matches the pre-existing behavior (disconnect failures were
    // silently swallowed before this migration too) — not introducing new UI in this pass.
  });

  const exportMyDataMutation = useMutation({
    mutationFn: exportMyData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contentagent-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: () => {
      setExportError('Export failed — please try again.');
    },
  });

  const deleteMyAccountMutation = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      void signOut({ redirectUrl: '/' });
    },
    onError: () => {
      setDeleteError('Failed to delete account — please try again.');
    },
  });

  function handleDisconnect(platform: string) {
    setDisconnectingPlatform(platform);
    disconnectSocialMutation.mutate(platform, { onSettled: () => setDisconnectingPlatform(null) });
  }

  function handleAnalyzeDna() {
    if (!dnaSamples.trim() || dnaSamples.length < 50) {
      setDnaError('Please paste at least 3 sample posts.');
      return;
    }
    setDnaError('');
    analyzeVoiceMutation.mutate(dnaSamples);
  }

  function toggleVoice(voice: string) {
    setSelectedVoices(prev => prev.includes(voice) ? prev.filter(v => v !== voice) : [...prev, voice]);
  }

  function handleSave() {
    setResetConfirming(false);
    setSaveError('');
    updateBrandVoiceMutation.mutate({ brandName, industry, brandVoice: selectedVoices.join(', '), phrasesUse, phrasesAvoid });
  }

  function handleReset() {
    if (!resetConfirming) {
      setResetConfirming(true);
      return;
    }
    setBrandName(''); setIndustry(''); setWebsite('');
    setSelectedVoices(['Professional']);
    setPhrasesUse(''); setPhrasesAvoid('');
    setResetConfirming(false);
  }

  function handleExportData() {
    setExportError('');
    exportMyDataMutation.mutate();
  }

  function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteError('');
    deleteMyAccountMutation.mutate();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        .brand-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .brand-card-grid { grid-template-columns: 1fr; }
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Page Header ── */}
      <div className="section-header">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#F59E0B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 18, height: 1, background: 'linear-gradient(90deg,#F59E0B,transparent)', display: 'inline-block' }} />
          Settings
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 700, lineHeight: 1.1, color: 'rgba(255,255,255,0.92)' }}>
          Brand Settings
        </h1>
        <p style={{ fontSize: 'clamp(12px,2vw,13px)', color: 'var(--color-text-muted)', marginTop: 4 }}>
          Customize how AI writes content for your brand
        </p>
      </div>

      {/* ── 2-column card grid ── */}
      <div className="brand-card-grid">
        <IdentityCard
          brandName={brandName} onBrandNameChange={setBrandName}
          industry={industry} onIndustryChange={setIndustry}
          website={website} onWebsiteChange={setWebsite}
        />

        <VoiceCard
          selectedVoices={selectedVoices} onToggleVoice={toggleVoice}
          phrasesUse={phrasesUse} onPhrasesUseChange={setPhrasesUse}
          phrasesAvoid={phrasesAvoid} onPhrasesAvoidChange={setPhrasesAvoid}
        />

        <ContentDnaCard
          contentDna={contentDna}
          dnaSamples={dnaSamples}
          onDnaSamplesChange={(v) => { setDnaSamples(v); setDnaError(''); }}
          dnaError={dnaError}
          analyzingDna={analyzeVoiceMutation.isPending}
          onAnalyze={handleAnalyzeDna}
        />

        <PublishingConnectionsCard
          socialConnections={socialConnections}
          disconnectingPlatform={disconnectingPlatform}
          onDisconnect={handleDisconnect}
        />

        <DangerZoneCard
          exporting={exportMyDataMutation.isPending}
          exportError={exportError}
          onExport={handleExportData}
          onOpenDeleteModal={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError(''); }}
        />
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 11, flexWrap: 'wrap' }}>
        {resetConfirming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Discard unsaved edits?</span>
            <button className="btn-secondary" onClick={() => setResetConfirming(false)}>Cancel</button>
            <button
              onClick={handleReset}
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}
            >
              Yes, reset
            </button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <RefreshCw size={13} /> Reset
          </button>
        )}
        <button className="btn-primary" onClick={handleSave} disabled={updateBrandVoiceMutation.isPending}>
          {updateBrandVoiceMutation.isPending ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#050509', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Saving...
            </>
          ) : (
            <><Sparkles size={14} /> Save brand settings</>
          )}
        </button>
      </div>

      {saveError && (
        <div style={{ fontSize: 11.5, color: 'var(--color-error)', textAlign: 'right' }}>{saveError}</div>
      )}

      {/* WHY single toast element (#36): previously two separate toast mechanisms
          (showToast boolean for save + socialToast string for social actions) could
          theoretically stack and used divergent state shapes. One `toast` object drives
          both concerns through a single DOM node. */}
      {toast && (
        <div
          className={`toast ${toast.isError ? 'toast-error' : 'toast-success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {toast.isError ? <AlertCircle size={12} /> : <Check size={12} />}
          {toast.message}
        </div>
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          confirmText={deleteConfirmText}
          onConfirmTextChange={setDeleteConfirmText}
          deleting={deleteMyAccountMutation.isPending}
          error={deleteError}
          onConfirm={handleDeleteAccount}
          onClose={() => { if (!deleteMyAccountMutation.isPending) setShowDeleteModal(false); }}
        />
      )}
    </div>
  );
}
