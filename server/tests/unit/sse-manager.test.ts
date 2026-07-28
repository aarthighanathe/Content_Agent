/**
 * TC-043 through TC-046 — SSEManager Unit Tests
 * Inlines the SSEManager class to avoid server startup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Inline SSEManager (mirrors lib/sse.ts) ──────────────────────────────────

interface SSEClient {
  id: string;
  res: any;
  jobId: string;
}

class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(jobId: string, clientId: string, res: any): void {
    const client: SSEClient = { id: clientId, res, jobId };
    const clients = this.clients.get(jobId) || [];
    clients.push(client);
    this.clients.set(jobId, clients);
  }

  removeClient(jobId: string, clientId: string): void {
    const clients = this.clients.get(jobId);
    if (clients) {
      const filtered = clients.filter((c) => c.id !== clientId);
      if (filtered.length === 0) {
        this.clients.delete(jobId);
      } else {
        this.clients.set(jobId, filtered);
      }
    }
  }

  sendEvent(jobId: string, data: Record<string, unknown>): void {
    const clients = this.clients.get(jobId);
    if (clients) {
      clients.forEach((client) => {
        this.sendToClient(client, data);
      });
    }
  }

  private sendToClient(client: SSEClient, data: Record<string, unknown>): void {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      this.removeClient(client.jobId, client.id);
    }
  }

  getClientCount(jobId: string): number {
    return (this.clients.get(jobId) || []).length;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SSEManager', () => {
  let manager: SSEManager;
  let mockRes: any;

  beforeEach(() => {
    manager = new SSEManager();
    mockRes = { write: vi.fn() };
  });

  it('TC-043 — addClient registers client under jobId', () => {
    manager.addClient('job-1', 'client-1', mockRes);
    expect(manager.getClientCount('job-1')).toBe(1);
  });

  it('TC-043b — multiple clients can register for same jobId', () => {
    manager.addClient('job-1', 'client-1', mockRes);
    manager.addClient('job-1', 'client-2', { write: vi.fn() });
    expect(manager.getClientCount('job-1')).toBe(2);
  });

  it('TC-044 — removeClient removes correct client', () => {
    manager.addClient('job-1', 'client-1', mockRes);
    manager.addClient('job-1', 'client-2', { write: vi.fn() });
    manager.removeClient('job-1', 'client-1');
    expect(manager.getClientCount('job-1')).toBe(1);
  });

  it('TC-044b — removing last client deletes the jobId entry', () => {
    manager.addClient('job-1', 'client-1', mockRes);
    manager.removeClient('job-1', 'client-1');
    expect(manager.getClientCount('job-1')).toBe(0);
  });

  it('TC-045 — sendEvent writes to all clients for jobId', () => {
    const res1 = { write: vi.fn() };
    const res2 = { write: vi.fn() };
    manager.addClient('job-1', 'c1', res1);
    manager.addClient('job-1', 'c2', res2);
    manager.sendEvent('job-1', { type: 'progress', stage: 'writing' });
    expect(res1.write).toHaveBeenCalledOnce();
    expect(res2.write).toHaveBeenCalledOnce();
  });

  it('TC-045b — sendEvent serializes data as JSON SSE format', () => {
    manager.addClient('job-1', 'c1', mockRes);
    manager.sendEvent('job-1', { type: 'progress', stage: 'done', progress: 100 });
    const written = mockRes.write.mock.calls[0][0];
    expect(written).toMatch(/^data: \{/);
    expect(written).toMatch(/\n\n$/);
    const payload = JSON.parse(written.replace('data: ', '').trim());
    expect(payload.type).toBe('progress');
    expect(payload.stage).toBe('done');
  });

  it('TC-046 — sendEvent is no-op for unknown jobId', () => {
    // Should not throw, just silently skip
    expect(() => {
      manager.sendEvent('nonexistent-job-id', { type: 'progress' });
    }).not.toThrow();
  });

  it('TC-046b — sendEvent does not write to clients of other jobs', () => {
    const otherRes = { write: vi.fn() };
    manager.addClient('job-2', 'c1', otherRes);
    manager.sendEvent('job-1', { type: 'progress' });
    expect(otherRes.write).not.toHaveBeenCalled();
  });

  it('handles broken client write gracefully (auto-removes)', () => {
    const brokenRes = {
      write: vi.fn().mockImplementation(() => { throw new Error('pipe broken'); }),
    };
    manager.addClient('job-1', 'broken-client', brokenRes);
    // Should not throw even though write fails
    expect(() => {
      manager.sendEvent('job-1', { type: 'test' });
    }).not.toThrow();
    // Client should be auto-removed
    expect(manager.getClientCount('job-1')).toBe(0);
  });
});
