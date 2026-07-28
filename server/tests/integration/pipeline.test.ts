/**
 * lib/pipeline.ts — Pipeline Integration Test (P0)
 * Verifies the real 5-agent pipeline (runContentPipeline) fires in the
 * correct sequence and that each stage receives the output of the previous
 * stage. All agent modules are mocked; the pipeline orchestration itself is
 * the real implementation shared by routes/jobs/create.ts and contentWorker.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrchestratorResult = {
  taskPlan: 'Create carousel about AI tools',
  searchQueries: ['AI tools 2024', 'best AI marketing tools', 'AI content creation stats'],
  platformRules: { format: 'carousel', slides: '8 slides' },
};

const mockResearchResult = {
  trendingAngles: ['AI automation', 'prompt engineering'],
  keyFacts: ['AI adoption grew 74% in 2024', 'ChatGPT has 100M users'],
  suggestedHashtags: ['#AItools', '#marketing'],
  competitorHooks: ['10 AI tools that changed my business'],
  sourceUrls: ['https://example.com/ai-report'],
  rawResults: [],
};

const mockWriterResult = [
  { slide_number: 1, type: 'cover', headline: 'AI Tools Changed Everything', body: 'Here is why.', visual_hint: '🔥' },
  { slide_number: 2, type: 'content', headline: 'The Problem', body: 'Manual work is slow.', visual_hint: '😤' },
];

const mockFormatterResult = mockWriterResult.map((s, i) => ({ ...s, slide_number: i + 1, slideNumber: i + 1 }));

const mockCriticResult = {
  approved: true,
  totalScore: 82,
  scores: { hookStrength: 17, platformCompliance: 16, brandVoiceMatch: 16, valueDelivery: 17, ctaClarity: 16 },
  feedback: 'Strong content.',
};

const mockPredictorResult = {
  tier: 'high',
  confidenceScore: 0.85,
  topReason: 'Strong hook and data-backed',
  improvementSuggestion: 'Add more specific examples',
  benchmarkContext: 'Top 20% for this niche',
  estimatedEngagementMultiplier: 2.1,
};

const runOrchestrator = vi.fn();
const runResearcher = vi.fn();
const runWriter = vi.fn();
const runFormatter = vi.fn();
const runCritic = vi.fn();
const runPerformancePredictor = vi.fn();

vi.mock('../../src/agents/orchestrator.js', () => ({ runOrchestrator: (...args: any[]) => runOrchestrator(...args) }));
vi.mock('../../src/agents/researcher.js', () => ({ runResearcher: (...args: any[]) => runResearcher(...args) }));
vi.mock('../../src/agents/writer.js', () => ({ runWriter: (...args: any[]) => runWriter(...args) }));
vi.mock('../../src/agents/formatter.js', () => ({ runFormatter: (...args: any[]) => runFormatter(...args) }));
vi.mock('../../src/agents/critic.js', () => ({ runCritic: (...args: any[]) => runCritic(...args) }));
vi.mock('../../src/agents/performancePredictor.js', () => ({ runPerformancePredictor: (...args: any[]) => runPerformancePredictor(...args) }));

// runAndPersistPipeline (not used by these tests) pulls in jobsMemory/getJobFromStore/persistJobToDB —
// stub them so importing lib/pipeline.js doesn't require a live DB or the BullMQ worker.
vi.mock('../../src/routes/jobs/ownership.js', () => ({ jobsMemory: new Map() }));
vi.mock('../../src/workers/contentWorker.js', () => ({ getJobFromStore: () => undefined }));
vi.mock('../../src/lib/persistJob.js', () => ({ persistJobToDB: vi.fn() }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));

const { runContentPipeline } = await import('../../src/lib/pipeline.js');

describe('runContentPipeline — real pipeline, mocked agents', () => {
  const mockJob = {
    id: 'test-job-1',
    userId: 'user-1',
    topic: 'AI tools for marketers',
    platform: 'instagram_carousel',
    tone: 'professional',
    targetAudience: 'digital marketers',
    brandVoice: 'professional',
    status: 'pending',
    retryCount: 0,
  };

  const emitProgress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    runOrchestrator.mockResolvedValue(mockOrchestratorResult);
    runResearcher.mockResolvedValue(mockResearchResult);
    runWriter.mockResolvedValue(mockWriterResult);
    runFormatter.mockResolvedValue(mockFormatterResult);
    runCritic.mockResolvedValue(mockCriticResult);
    runPerformancePredictor.mockResolvedValue(mockPredictorResult);
  });

  it('calls all 6 agents exactly once on first-pass approval', async () => {
    const result = await runContentPipeline(mockJob as any, emitProgress);
    expect(runOrchestrator).toHaveBeenCalledTimes(1);
    expect(runResearcher).toHaveBeenCalledTimes(1);
    expect(runWriter).toHaveBeenCalledTimes(1);
    expect(runFormatter).toHaveBeenCalledTimes(1);
    expect(runCritic).toHaveBeenCalledTimes(1);
    expect(runPerformancePredictor).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('done');
  });

  it('passes orchestrator searchQueries to researcher', async () => {
    await runContentPipeline(mockJob as any, emitProgress);
    const call = runResearcher.mock.calls[0];
    expect(call[1]).toEqual(mockOrchestratorResult.searchQueries);
  });

  it('passes research report and task plan to writer', async () => {
    await runContentPipeline(mockJob as any, emitProgress);
    const call = runWriter.mock.calls[0];
    expect(call[1].researchReport).toEqual(mockResearchResult);
    expect(call[1].taskPlan).toBe(mockOrchestratorResult.taskPlan);
  });

  it('passes writer output to formatter', async () => {
    await runContentPipeline(mockJob as any, emitProgress);
    const call = runFormatter.mock.calls[0];
    expect(call[1]).toEqual(mockWriterResult);
  });

  it('passes formatted content to critic', async () => {
    await runContentPipeline(mockJob as any, emitProgress);
    const call = runCritic.mock.calls[0];
    expect(call[1]).toEqual(mockFormatterResult);
  });

  it('final output contains agentName=writer and outputType=final', async () => {
    const result = await runContentPipeline(mockJob as any, emitProgress);
    const finalOutput = result.outputs.find((o: any) => o.outputType === 'final');
    expect(finalOutput).toBeDefined();
    expect(finalOutput.agentName).toBe('writer');
    expect(finalOutput.qualityScore).toBe(82);
  });

  it('critic result is attached to pipeline result', async () => {
    const result = await runContentPipeline(mockJob as any, emitProgress);
    expect(result.criticResult.approved).toBe(true);
    expect(result.criticResult.totalScore).toBe(82);
  });

  it('retries writer+formatter+critic when critic rejects (max 3 attempts)', async () => {
    runCritic.mockResolvedValue({ ...mockCriticResult, approved: false, totalScore: 55, feedback: 'Hook is weak' });

    await runContentPipeline({ ...mockJob }, emitProgress);
    expect(runWriter).toHaveBeenCalledTimes(3);
    expect(runFormatter).toHaveBeenCalledTimes(3);
    expect(runCritic).toHaveBeenCalledTimes(3);
  });

  it('passes critic feedback to writer on retry', async () => {
    runCritic
      .mockResolvedValueOnce({ ...mockCriticResult, approved: false, totalScore: 60, feedback: 'Strengthen the CTA' })
      .mockResolvedValue({ ...mockCriticResult, approved: true, totalScore: 78 });

    await runContentPipeline({ ...mockJob }, emitProgress);
    const secondWriterCall = runWriter.mock.calls[1];
    expect(secondWriterCall[1].criticFeedback).toBe('Strengthen the CTA');
  });

  it('pipeline continues even if predictor throws', async () => {
    runPerformancePredictor.mockRejectedValue(new Error('Predictor API timeout'));
    const result = await runContentPipeline(mockJob as any, emitProgress);
    expect(result.status).toBe('done');
    const finalOutput = result.outputs.find((o: any) => o.outputType === 'final');
    expect(finalOutput).toBeDefined();
  });

  it('outputs array contains entries for orchestrator, researcher, critic, and writer', async () => {
    const result = await runContentPipeline(mockJob as any, emitProgress);
    const agentNames = result.outputs.map((o: any) => o.agentName);
    expect(agentNames).toContain('orchestrator');
    expect(agentNames).toContain('researcher');
    expect(agentNames).toContain('critic');
    expect(agentNames).toContain('writer');
  });

  it('uses initialFeedback as the first criticFeedback seed (regenerate flow)', async () => {
    await runContentPipeline({ ...mockJob, initialFeedback: 'Make it punchier' }, emitProgress);
    const firstWriterCall = runWriter.mock.calls[0];
    expect(firstWriterCall[1].criticFeedback).toBe('Make it punchier');
  });
});
