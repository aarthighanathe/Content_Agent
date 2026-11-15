/**
 * pipelineWriteLoop — FALLBACK must not beat a prior real lower critique (Pass-5 H2).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/ai.js', () => ({ generateWithAI: vi.fn() }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));
vi.mock('../../src/lib/pipelineAbort.js', () => ({
  classifyAbort: vi.fn(async () => null),
}));
vi.mock('../../src/agents/writer.js', () => ({ runWriter: vi.fn() }));
vi.mock('../../src/agents/formatter.js', () => ({ runFormatter: vi.fn() }));
vi.mock('../../src/agents/critic.js', () => ({
  runCriticWithFallbackRetries: vi.fn(),
}));

const JOB = {
  id: 'job-fb',
  topic: 'AI tips',
  platform: 'linkedin_post',
  tone: 'professional',
  targetAudience: 'marketers',
  brandVoice: 'clear',
  retryCount: 0,
} as never;

const ORCH = { taskPlan: 'plan', platformRules: {}, searchQueries: [] };
const RESEARCH = {
  trendingAngles: [],
  keyFacts: [],
  suggestedHashtags: [],
  competitorHooks: [],
  rawResults: [],
};

describe('runWriteCritiqueLoop — FALLBACK vs real critique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps prior real score/critique when a later round returns usedFallback', async () => {
    const { runWriter } = await import('../../src/agents/writer.js');
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const { runCriticWithFallbackRetries } = await import('../../src/agents/critic.js');

    const draftA = { hook: 'A', body: 'Body A', cta: 'CTA A' };
    const draftB = { hook: 'B', body: 'Body B', cta: 'CTA B' };
    vi.mocked(runWriter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never);
    vi.mocked(runFormatter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never);
    vi.mocked(runCriticWithFallbackRetries)
      .mockResolvedValueOnce({
        result: {
          approved: false,
          totalScore: 42,
          scores: {
            hookStrength: 8,
            platformCompliance: 8,
            brandVoiceMatch: 9,
            valueDelivery: 9,
            ctaClarity: 8,
          },
          feedback: 'Sharpen the hook with a concrete number.',
        },
        durationMs: 10,
      })
      .mockResolvedValueOnce({
        result: {
          approved: false,
          totalScore: 50,
          scores: {
            hookStrength: 10,
            platformCompliance: 10,
            brandVoiceMatch: 10,
            valueDelivery: 10,
            ctaClarity: 10,
          },
          feedback: 'Quality evaluation could not be parsed.',
          usedFallback: true,
        },
        durationMs: 10,
      });

    const { runWriteCritiqueLoop } = await import('../../src/lib/pipelineWriteLoop.js');
    const outputs: never[] = [];
    const logs: never[] = [];
    const emitProgress = vi.fn();

    const result = await runWriteCritiqueLoop(
      JOB,
      emitProgress,
      RESEARCH as never,
      ORCH as never,
      outputs,
      logs,
    );

    expect(result.bestScore).toBe(42);
    expect(result.bestDraft).toEqual(draftA);
    expect(result.lastCriticResult?.totalScore).toBe(42);
    expect(result.lastCriticResult?.usedFallback).toBeUndefined();
    const critiques = outputs.filter((o: { outputType: string }) => o.outputType === 'critique');
    expect(critiques).toHaveLength(1);
    expect((critiques[0] as { qualityScore: number }).qualityScore).toBe(42);
  });

  it('seeds bestDraft without fake bestScore=0 when critic throws', async () => {
    const { runWriter } = await import('../../src/agents/writer.js');
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const { runCriticWithFallbackRetries } = await import('../../src/agents/critic.js');

    const draft = { hook: 'H', body: 'Body', cta: 'CTA' };
    vi.mocked(runWriter).mockResolvedValueOnce(draft as never);
    vi.mocked(runFormatter).mockResolvedValueOnce(draft as never);
    vi.mocked(runCriticWithFallbackRetries).mockRejectedValueOnce(new Error('critic boom'));

    const { runWriteCritiqueLoop } = await import('../../src/lib/pipelineWriteLoop.js');
    const outputs: never[] = [];
    const logs: never[] = [];

    const result = await runWriteCritiqueLoop(
      JOB,
      vi.fn(),
      RESEARCH as never,
      ORCH as never,
      outputs,
      logs,
    );

    expect(result.bestDraft).toEqual(draft);
    // WHY: -1 sentinel — never promote an unscored draft as 0/100.
    expect(result.bestScore).toBe(-1);
    expect(result.lastCriticResult).toBeNull();
    expect(result.approved).toBe(false);
  });

  it('sets bestScore only after a real critique lands', async () => {
    const { runWriter } = await import('../../src/agents/writer.js');
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const { runCriticWithFallbackRetries } = await import('../../src/agents/critic.js');

    const draft = { hook: 'H', body: 'Body', cta: 'CTA' };
    vi.mocked(runWriter).mockResolvedValueOnce(draft as never);
    vi.mocked(runFormatter).mockResolvedValueOnce(draft as never);
    vi.mocked(runCriticWithFallbackRetries).mockResolvedValueOnce({
      result: {
        approved: true,
        totalScore: 78,
        scores: {
          hookStrength: 16,
          platformCompliance: 15,
          brandVoiceMatch: 16,
          valueDelivery: 15,
          ctaClarity: 16,
        },
        feedback: 'Solid.',
      },
      durationMs: 10,
    });

    const { runWriteCritiqueLoop } = await import('../../src/lib/pipelineWriteLoop.js');
    const outputs: never[] = [];
    const logs: never[] = [];

    const result = await runWriteCritiqueLoop(
      JOB,
      vi.fn(),
      RESEARCH as never,
      ORCH as never,
      outputs,
      logs,
    );

    expect(result.bestScore).toBe(78);
    expect(result.bestDraft).toEqual(draft);
    expect(result.approved).toBe(true);
  });

  it('keeps prior best critique when a later real round scores lower', async () => {
    const { runWriter } = await import('../../src/agents/writer.js');
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const { runCriticWithFallbackRetries } = await import('../../src/agents/critic.js');

    const draftA = { hook: 'A', body: 'Body A', cta: 'CTA A' };
    const draftB = { hook: 'B', body: 'Body B', cta: 'CTA B' };
    vi.mocked(runWriter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never);
    vi.mocked(runFormatter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never);
    vi.mocked(runCriticWithFallbackRetries)
      .mockResolvedValueOnce({
        result: {
          approved: false,
          totalScore: 68,
          scores: {
            hookStrength: 14,
            platformCompliance: 14,
            brandVoiceMatch: 13,
            valueDelivery: 14,
            ctaClarity: 13,
          },
          feedback: 'Tighten the CTA.',
        },
        durationMs: 10,
      })
      .mockResolvedValueOnce({
        result: {
          approved: false,
          totalScore: 55,
          scores: {
            hookStrength: 11,
            platformCompliance: 11,
            brandVoiceMatch: 11,
            valueDelivery: 11,
            ctaClarity: 11,
          },
          feedback: 'Worse revision.',
        },
        durationMs: 10,
      });

    const { runWriteCritiqueLoop } = await import('../../src/lib/pipelineWriteLoop.js');
    const outputs: never[] = [];
    const logs: never[] = [];

    const result = await runWriteCritiqueLoop(
      JOB,
      vi.fn(),
      RESEARCH as never,
      ORCH as never,
      outputs,
      logs,
    );

    expect(result.bestScore).toBe(68);
    expect(result.bestDraft).toEqual(draftA);
    expect(result.lastCriticResult?.totalScore).toBe(68);
    const critiques = outputs.filter((o: { outputType: string }) => o.outputType === 'critique');
    expect(critiques).toHaveLength(1);
    expect((critiques[0] as { qualityScore: number }).qualityScore).toBe(68);
  });

  it('does not rank feedback-only inflated totals over real dimension scores', async () => {
    const { runWriter } = await import('../../src/agents/writer.js');
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const { runCriticWithFallbackRetries } = await import('../../src/agents/critic.js');

    const draftA = { hook: 'A', body: 'Body A', cta: 'CTA A' };
    const draftB = { hook: 'B', body: 'Body B', cta: 'CTA B' };
    vi.mocked(runWriter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never);
    vi.mocked(runFormatter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never);
    vi.mocked(runCriticWithFallbackRetries)
      .mockResolvedValueOnce({
        result: {
          approved: false,
          // WHY: inflated total without scores — must not become bestScore.
          totalScore: 92,
          feedback: 'Sharpen the hook.',
        },
        durationMs: 10,
      })
      .mockResolvedValueOnce({
        result: {
          approved: false,
          totalScore: 68,
          scores: {
            hookStrength: 14,
            platformCompliance: 14,
            brandVoiceMatch: 13,
            valueDelivery: 14,
            ctaClarity: 13,
          },
          feedback: 'Tighten the CTA.',
        },
        durationMs: 10,
      });

    const { runWriteCritiqueLoop } = await import('../../src/lib/pipelineWriteLoop.js');
    const outputs: never[] = [];
    const logs: never[] = [];

    const result = await runWriteCritiqueLoop(
      JOB,
      vi.fn(),
      RESEARCH as never,
      ORCH as never,
      outputs,
      logs,
    );

    expect(result.bestScore).toBe(68);
    expect(result.bestDraft).toEqual(draftB);
    expect(result.lastCriticResult?.totalScore).toBe(68);
    expect(result.lastCriticResult?.scores).toBeDefined();
    const critiques = outputs.filter((o: { outputType: string }) => o.outputType === 'critique');
    // WHY: feedback-only still appends a critique for UI; scored round adds another.
    expect(critiques).toHaveLength(2);
    expect((critiques[0] as { qualityScore: number }).qualityScore).toBe(92);
    expect((critiques[1] as { qualityScore: number }).qualityScore).toBe(68);
  });

  it('all-feedback-only rejects store critique + draft (quality card) and revise via feedback', async () => {
    const { runWriter } = await import('../../src/agents/writer.js');
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const { runCriticWithFallbackRetries } = await import('../../src/agents/critic.js');

    const draftA = { hook: 'A', body: 'Body A', cta: 'CTA A' };
    const draftB = { hook: 'B', body: 'Body B', cta: 'CTA B' };
    const draftC = { hook: 'C', body: 'Body C', cta: 'CTA C' };
    vi.mocked(runWriter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never)
      .mockResolvedValueOnce(draftC as never);
    vi.mocked(runFormatter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never)
      .mockResolvedValueOnce(draftC as never);
    vi.mocked(runCriticWithFallbackRetries)
      .mockResolvedValueOnce({
        result: {
          approved: false,
          totalScore: 90,
          feedback: 'Sharpen the hook.',
        },
        durationMs: 10,
      })
      .mockResolvedValueOnce({
        result: {
          approved: false,
          totalScore: 88,
          feedback: 'Tighten the CTA.',
        },
        durationMs: 10,
      })
      .mockResolvedValueOnce({
        result: {
          approved: false,
          totalScore: 85,
          feedback: 'Add a concrete number.',
        },
        durationMs: 10,
      });

    const { runWriteCritiqueLoop } = await import('../../src/lib/pipelineWriteLoop.js');
    const outputs: never[] = [];
    const logs: never[] = [];

    const result = await runWriteCritiqueLoop(
      JOB,
      vi.fn(),
      RESEARCH as never,
      ORCH as never,
      outputs,
      logs,
    );

    expect(result.approved).toBe(false);
    // WHY: no dimension scores — bestScore stays -1; draft advances to latest revision.
    expect(result.bestScore).toBe(-1);
    expect(result.bestDraft).toEqual(draftC);
    expect(result.lastCriticResult?.feedback).toBe('Add a concrete number.');
    expect(result.lastCriticResult?.scores).toBeUndefined();
    const critiques = outputs.filter((o: { outputType: string }) => o.outputType === 'critique');
    expect(critiques).toHaveLength(3);
    expect(vi.mocked(runWriter).mock.calls[1]?.[1]?.criticFeedback).toContain('Sharpen the hook');
    expect(vi.mocked(runWriter).mock.calls[2]?.[1]?.criticFeedback).toContain('Tighten the CTA');
  });

  it('allows FALLBACK to seed quality card when prior feedback-only never stored a critique', async () => {
    // WHY: regression guard — sawRealCritique must not be set until a critique
    // row is actually stored; otherwise FALLBACK cannot fill an empty card.
    const { runWriter } = await import('../../src/agents/writer.js');
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const { runCriticWithFallbackRetries } = await import('../../src/agents/critic.js');

    const draft = { hook: 'H', body: 'Body', cta: 'CTA' };
    vi.mocked(runWriter).mockResolvedValue(draft as never);
    vi.mocked(runFormatter).mockResolvedValue(draft as never);
    vi.mocked(runCriticWithFallbackRetries).mockResolvedValueOnce({
      result: {
        approved: false,
        totalScore: 50,
        scores: {
          hookStrength: 10,
          platformCompliance: 10,
          brandVoiceMatch: 10,
          valueDelivery: 10,
          ctaClarity: 10,
        },
        feedback: 'Quality evaluation could not be parsed.',
        usedFallback: true,
      },
      durationMs: 10,
    });

    const { runWriteCritiqueLoop } = await import('../../src/lib/pipelineWriteLoop.js');
    const outputs: never[] = [];
    const logs: never[] = [];

    const result = await runWriteCritiqueLoop(
      JOB,
      vi.fn(),
      RESEARCH as never,
      ORCH as never,
      outputs,
      logs,
    );

    expect(result.bestScore).toBe(50);
    expect(result.lastCriticResult?.usedFallback).toBe(true);
    const critiques = outputs.filter((o: { outputType: string }) => o.outputType === 'critique');
    expect(critiques).toHaveLength(1);
  });

  it('on approve, always adopts current draft/critique even if score is lower than prior best', async () => {
    const { runWriter } = await import('../../src/agents/writer.js');
    const { runFormatter } = await import('../../src/agents/formatter.js');
    const { runCriticWithFallbackRetries } = await import('../../src/agents/critic.js');

    const draftA = { hook: 'A', body: 'Body A', cta: 'CTA A' };
    const draftB = { hook: 'B', body: 'Body B', cta: 'CTA B' };
    vi.mocked(runWriter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never);
    vi.mocked(runFormatter)
      .mockResolvedValueOnce(draftA as never)
      .mockResolvedValueOnce(draftB as never);
    vi.mocked(runCriticWithFallbackRetries)
      .mockResolvedValueOnce({
        result: {
          approved: false,
          totalScore: 80,
          scores: {
            hookStrength: 16,
            platformCompliance: 16,
            brandVoiceMatch: 16,
            valueDelivery: 16,
            ctaClarity: 16,
          },
          feedback: 'Close — strengthen CTA.',
        },
        durationMs: 10,
      })
      .mockResolvedValueOnce({
        result: {
          approved: true,
          totalScore: 72,
          scores: {
            hookStrength: 14,
            platformCompliance: 15,
            brandVoiceMatch: 14,
            valueDelivery: 15,
            ctaClarity: 14,
          },
          feedback: 'Approved with minor notes.',
        },
        durationMs: 10,
      });

    const { runWriteCritiqueLoop } = await import('../../src/lib/pipelineWriteLoop.js');
    const outputs: never[] = [];
    const logs: never[] = [];

    const result = await runWriteCritiqueLoop(
      JOB,
      vi.fn(),
      RESEARCH as never,
      ORCH as never,
      outputs,
      logs,
    );

    expect(result.approved).toBe(true);
    expect(result.bestScore).toBe(72);
    expect(result.bestDraft).toEqual(draftB);
    expect(result.lastCriticResult?.totalScore).toBe(72);
    expect(result.lastCriticResult?.feedback).toBe('Approved with minor notes.');
    const critiques = outputs.filter((o: { outputType: string }) => o.outputType === 'critique');
    expect(critiques).toHaveLength(2);
    expect((critiques[1] as { qualityScore: number }).qualityScore).toBe(72);
    const finals = outputs.filter((o: { outputType: string }) => o.outputType === 'final');
    expect(finals).toHaveLength(1);
    expect((finals[0] as { content: unknown }).content).toEqual(draftB);
    expect((finals[0] as { qualityScore: number }).qualityScore).toBe(72);
  });
});
