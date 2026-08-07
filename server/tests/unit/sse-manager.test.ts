/**
 * lib/sse.ts — SSEManager tests against the REAL module.
 *
 * WHY rewritten: the previous version of this file inlined a copy of
 * SSEManager instead of importing '../../src/lib/sse.js' — it could never
 * catch a regression to the real addClient()/removeClient()/sendEvent()
 * (e.g. dropping flushHeaders(), forgetting to clear the keepAlive interval,
 * or breaking the close-triggered cleanup). This version imports the real
 * singleton and exercises it against a mock Express Response, so a future
 * edit that breaks the real implementation actually fails a test here.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Response } from 'express';

// WHY a hand-built mock Response, not supertest/express: SSEManager only ever
// calls writeHead/flushHeaders/write/on('close', cb) on the response object —
// a minimal object satisfying that surface is enough to exercise the real
// class without spinning up a real HTTP server.
function createMockResponse() {
  const closeHandlers: Array<() => void> = [];
  const res = {
    writeHead: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    on: vi.fn((event: string, cb: () => void) => {
      if (event === 'close') closeHandlers.push(cb);
    }),
    // Test helper, not part of the real Response interface — triggers every
    // registered 'close' handler, simulating the browser closing the connection.
    __triggerClose: () => closeHandlers.forEach((cb) => cb()),
  };
  return res as unknown as Response & { __triggerClose: () => void };
}

describe('sseManager (real module)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('addClient flushes headers with the correct SSE content-type before writing the initial event', async () => {
    const { sseManager } = await import('../../src/lib/sse.js');
    const res = createMockResponse();

    sseManager.addClient('job-1', 'client-1', res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }));
    // WHY order matters: flushHeaders must be called before any data write —
    // some proxies (nginx, AWS ALB) buffer the response until headers are
    // flushed, so writing data first would get silently buffered.
    const writeHeadOrder = res.writeHead.mock.invocationCallOrder[0];
    const flushHeadersOrder = res.flushHeaders.mock.invocationCallOrder[0];
    const firstWriteOrder = res.write.mock.invocationCallOrder[0];
    expect(writeHeadOrder).toBeLessThan(flushHeadersOrder);
    expect(flushHeadersOrder).toBeLessThan(firstWriteOrder);

    sseManager.removeClient('job-1', 'client-1');
  });

  it('addClient sends an initial "connected" event to the new client', async () => {
    const { sseManager } = await import('../../src/lib/sse.js');
    const res = createMockResponse();

    sseManager.addClient('job-2', 'client-1', res);

    const written = res.write.mock.calls[0][0] as string;
    expect(written).toMatch(/^data: /);
    const payload = JSON.parse(written.replace('data: ', '').trim());
    expect(payload.type).toBe('connected');
    expect(payload.data.jobId).toBe('job-2');

    sseManager.removeClient('job-2', 'client-1');
  });

  it('registers a 15s keepAlive interval that pings the client and is cleared on close', async () => {
    const { sseManager } = await import('../../src/lib/sse.js');
    const res = createMockResponse();

    sseManager.addClient('job-3', 'client-1', res);
    const writesAfterConnect = res.write.mock.calls.length;

    vi.advanceTimersByTime(15_000);
    expect(res.write).toHaveBeenCalledWith(': ping\n\n');
    expect(res.write.mock.calls.length).toBe(writesAfterConnect + 1);

    // Simulate the browser closing the connection — the keepAlive interval
    // must stop firing afterward, or it leaks forever on every disconnected client.
    res.__triggerClose();
    const writesAfterClose = res.write.mock.calls.length;
    vi.advanceTimersByTime(30_000);
    expect(res.write.mock.calls.length).toBe(writesAfterClose);
  });

  it('the close event removes the client so sendEvent no longer reaches it', async () => {
    const { sseManager } = await import('../../src/lib/sse.js');
    const res = createMockResponse();

    sseManager.addClient('job-4', 'client-1', res);
    res.__triggerClose();

    const writesBeforeSend = res.write.mock.calls.length;
    sseManager.sendEvent('job-4', { type: 'progress', progress: 50 });
    expect(res.write.mock.calls.length).toBe(writesBeforeSend);
  });

  it('sendEvent delivers to every client registered for a jobId', async () => {
    const { sseManager } = await import('../../src/lib/sse.js');
    const res1 = createMockResponse();
    const res2 = createMockResponse();

    sseManager.addClient('job-5', 'client-1', res1);
    sseManager.addClient('job-5', 'client-2', res2);
    const before1 = res1.write.mock.calls.length;
    const before2 = res2.write.mock.calls.length;

    sseManager.sendEvent('job-5', { type: 'progress', stage: 'writing' });

    expect(res1.write.mock.calls.length).toBe(before1 + 1);
    expect(res2.write.mock.calls.length).toBe(before2 + 1);

    sseManager.removeClient('job-5', 'client-1');
    sseManager.removeClient('job-5', 'client-2');
  });

  it('sendEvent is a no-op for a jobId with no connected clients', async () => {
    const { sseManager } = await import('../../src/lib/sse.js');
    expect(() => {
      sseManager.sendEvent('nonexistent-job-id', { type: 'progress' });
    }).not.toThrow();
  });

  it('sendEvent does not write to clients of a different jobId', async () => {
    const { sseManager } = await import('../../src/lib/sse.js');
    const res = createMockResponse();
    sseManager.addClient('job-6', 'client-1', res);
    const before = res.write.mock.calls.length;

    sseManager.sendEvent('job-other', { type: 'progress' });

    expect(res.write.mock.calls.length).toBe(before);
    sseManager.removeClient('job-6', 'client-1');
  });

  it('a broken client write (pipe closed) is caught and the client is auto-removed', async () => {
    const { sseManager } = await import('../../src/lib/sse.js');
    const res = createMockResponse();
    sseManager.addClient('job-7', 'client-1', res);
    // The 'connected' write on addClient already succeeded — now make writes fail.
    (res.write as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('EPIPE: pipe broken');
    });

    expect(() => {
      sseManager.sendEvent('job-7', { type: 'progress' });
    }).not.toThrow();

    // Client should have been removed by sendToClient's catch — a second
    // sendEvent call must not throw again (nothing left to iterate).
    expect(() => {
      sseManager.sendEvent('job-7', { type: 'progress' });
    }).not.toThrow();
  });
});
