// AUDIT FIX #10 — First-run onboarding modal (2 steps)
import { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Check, Briefcase, Smile, Zap, BookOpen, Star } from 'lucide-react';
import { getOnboardingStatus, completeOnboarding } from '../api';
import { useFocusTrap } from '../hooks/useFocusTrap';

const TONES = [
  { id: 'professional',  label: 'Professional', Icon: Briefcase  },
  { id: 'casual',        label: 'Casual',       Icon: Smile      },
  { id: 'witty',         label: 'Witty',        Icon: Zap        },
  { id: 'educational',   label: 'Educational',  Icon: BookOpen   },
  { id: 'inspirational', label: 'Inspirational',Icon: Star       },
];

const SAMPLE_POST = {
  hook: "Most founders spend 40 hours a week on content. Here's how AI does it in 2 minutes.",
  body: "The research → write → critique loop that powers ContentAgent:\n\n1. 3 live Tavily searches surface what's trending right now\n2. A Writer agent drafts platform-specific content\n3. A Critic agent scores it 0-100 and rewrites until it passes 70\n4. You only see the polished result\n\nResult: content that actually performs, not just content that exists.",
  hashtags: ['#ContentMarketing', '#AItools', '#SocialMediaStrategy'],
  score: 87,
};

export function OnboardingModal() {
  const [show, setShow]           = useState(false);
  const [step, setStep]           = useState(1);
  const [brandName, setBrandName] = useState('');
  const [tone, setTone]           = useState('professional');
  const [saving, setSaving]       = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip if already dismissed in this session
    if (sessionStorage.getItem('ca_onboarding_dismissed')) return;

    getOnboardingStatus()
      .then(({ completed }) => { if (!completed) setShow(true); })
      .catch(() => { /* no auth yet or network fail — stay hidden */ });
  }, []);

  async function handleComplete() {
    setSaving(true);
    try {
      await completeOnboarding({ brandName: brandName.trim(), preferredTone: tone });
    } catch { /* non-blocking */ } finally {
      setSaving(false);
    }
    sessionStorage.setItem('ca_onboarding_dismissed', '1');
    setShow(false);
  }

  function handleSkip() {
    sessionStorage.setItem('ca_onboarding_dismissed', '1');
    setShow(false);
  }

  // SECURITY/ACCESSIBILITY: Escape-to-close, cleaned up on unmount/deactivation.
  useEffect(() => {
    if (!show) return undefined;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') handleSkip();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [show]);

  useFocusTrap(modalRef, show);

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(3,3,14,0.7)', backdropFilter: 'blur(6px)', zIndex: 900, animation: 'rp-fadeIn .2s ease both' }}
        onClick={handleSkip}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 901, width: 'min(540px, calc(100vw - 32px))',
          background: '#08081A', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '32px 32px 28px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.08)',
          animation: 'rp-fadeUp .25s cubic-bezier(.16,1,.3,1) both',
        }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{
              width: s === step ? 28 : 8, height: 8, borderRadius: 4,
              background: s === step ? '#F59E0B' : s < step ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s cubic-bezier(.16,1,.3,1)',
            }} />
          ))}
        </div>

        {/* ── STEP 1 — Brand setup ── */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Sparkles size={22} color="#F59E0B" />
              </div>
              <h2 id="onboarding-modal-title" style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.96)', margin: '0 0 8px' }}>
                Welcome to ContentAgent
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>
                Let's personalise your content in 30 seconds.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                  Brand or Creator Name
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Acme Inc · or your own name"
                  maxLength={80}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: 'var(--color-text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
                  Preferred Tone
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      style={{
                        background: tone === t.id ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${tone === t.id ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                        color: tone === t.id ? '#F59E0B' : 'var(--color-text-secondary)',
                        fontSize: 13, fontFamily: 'inherit', transition: 'all .15s',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <t.Icon size={13} />{t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
              <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                Skip for now
              </button>
              <button
                onClick={() => setStep(2)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '10px 20px' }}
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2 — Sample output preview ── */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 id="onboarding-modal-title" style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.96)', margin: '0 0 6px' }}>
                Here's what you'll get
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                AI-researched, critic-reviewed content — ready in ~25 seconds.
              </p>
            </div>

            {/* Sample post card */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
              {/* Score badge */}
              <div style={{ position: 'absolute', top: 14, right: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 20, padding: '3px 10px', fontFamily: "var(--font-mono)", fontSize: 10, color: '#F59E0B', letterSpacing: 1 }}>
                <Check size={10} /> {SAMPLE_POST.score}/100
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
                LinkedIn Post · Sample
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, margin: '0 0 10px' }}>
                {SAMPLE_POST.hook}
              </p>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: '0 0 12px', whiteSpace: 'pre-line' }}>
                {SAMPLE_POST.body}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SAMPLE_POST.hashtags.map((h) => (
                  <span key={h} style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#A78BFA', fontFamily: "var(--font-mono)" }}>{h}</span>
                ))}
              </div>
            </div>

            {/* Feature bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {[
                'Research from live web sources — not hallucinated facts',
                'Critic loop rewrites until it scores ≥ 70/100',
                'Works for LinkedIn, Instagram, Twitter, and Video Scripts',
              ].map((t) => (
                <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Check size={9} color="#34D399" />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                ← Back
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '10px 20px' }}
              >
                {saving ? 'Saving…' : <><Sparkles size={14} /> Start creating</>}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
