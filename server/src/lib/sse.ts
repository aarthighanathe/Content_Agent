import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  jobId: string;
  lastActivityAt: number;
  keepAlive: ReturnType<typeof setInterval>;
  idleTimer: ReturnType<typeof setTimeout>;
}

// WHY: SSE (Server-Sent Events) lets the server push progress updates to the
// browser without polling. One job can have multiple connected clients (e.g.,
// two browser tabs open on the same result page) — hence the clients array per jobId.
const MAX_SSE_CLIENTS_PER_JOB = 5;
// WHY 5 min idle: terminal jobs may leave tabs open; without an idle drop the
// keep-alive ping keeps proxy sockets forever (O5). Heartbeat stays at 20s so
// proxies under ~60s idle timeout still stay open during active streams.
const SSE_IDLE_MS = 5 * 60 * 1000;
const SSE_PING_MS = 20_000;
const SSE_CLOSE_AFTER_TERMINAL_MS = 2_000;

class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(jobId: string, clientId: string, res: Response): boolean {
    const existing = this.clients.get(jobId) || [];
    if (existing.length >= MAX_SSE_CLIENTS_PER_JOB) {
      return false;
    }
    // NOTE: headers must be flushed before any data is written.
    // Some proxies (nginx, AWS ALB) buffer until headers are sent otherwise.
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disables nginx proxy buffering for this response
      // CORS is handled by the global cors() middleware in index.ts — no wildcard needed here
    });
    res.flushHeaders();

    const touch = (): void => {
      const list = this.clients.get(jobId);
      const c = list?.find((x) => x.id === clientId);
      if (!c) return;
      c.lastActivityAt = Date.now();
      clearTimeout(c.idleTimer);
      c.idleTimer = setTimeout(() => {
        this.closeClient(jobId, clientId, 'idle');
      }, SSE_IDLE_MS);
    };

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n'); // SSE comment — ignored by EventSource, keeps TCP alive
      } catch {
        clearInterval(keepAlive);
      }
    }, SSE_PING_MS);

    const idleTimer = setTimeout(() => {
      this.closeClient(jobId, clientId, 'idle');
    }, SSE_IDLE_MS);

    const client: SSEClient = {
      id: clientId,
      res,
      jobId,
      lastActivityAt: Date.now(),
      keepAlive,
      idleTimer,
    };
    existing.push(client);
    this.clients.set(jobId, existing);

    // FLOW: browser navigating away or closing tab fires the 'close' event.
    // We clean up the interval and remove the client so memory doesn't accumulate.
    res.on('close', () => {
      this.closeClient(jobId, clientId, 'close');
    });

    this.sendToClient(client, { type: 'connected', data: { jobId } });
    touch();
    return true;
  }

  private closeClient(jobId: string, clientId: string, _reason: string): void {
    const clients = this.clients.get(jobId);
    if (!clients) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    // WHY remove before end(): res.end() fires 'close', which would re-enter
    // closeClient while the client is still in the Map.
    clearInterval(client.keepAlive);
    clearTimeout(client.idleTimer);
    this.removeClient(jobId, clientId);
    try {
      client.res.end();
    } catch { /* already closed */ }
  }

  removeClient(jobId: string, clientId: string): void {
    const clients = this.clients.get(jobId);
    if (clients) {
      const filtered = clients.filter((c) => c.id !== clientId);
      if (filtered.length === 0) {
        this.clients.delete(jobId); // free the Map entry entirely when no listeners remain
      } else {
        this.clients.set(jobId, filtered);
      }
    }
  }

  /** Close every live stream for a job (used after terminal progress). */
  closeJob(jobId: string): void {
    const clients = this.clients.get(jobId);
    if (!clients) return;
    for (const client of [...clients]) {
      this.closeClient(jobId, client.id, 'job-closed');
    }
  }

  sendEvent(jobId: string, data: Record<string, unknown>): void {
    const clients = this.clients.get(jobId);
    if (clients) {
      clients.forEach((client) => {
        client.lastActivityAt = Date.now();
        clearTimeout(client.idleTimer);
        client.idleTimer = setTimeout(() => {
          this.closeClient(jobId, client.id, 'idle');
        }, SSE_IDLE_MS);
        this.sendToClient(client, data);
      });
    }

    // WHY close shortly after terminal: client has the final event; keeping the
    // socket open only burns keep-alive pings until the browser navigates away.
    const stage = data.stage;
    if (stage === 'done' || stage === 'failed' || data.type === 'error') {
      setTimeout(() => this.closeJob(jobId), SSE_CLOSE_AFTER_TERMINAL_MS);
    }
  }

  private sendToClient(client: SSEClient, data: Record<string, unknown>): void {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Client socket closed unexpectedly (network drop, page refresh mid-stream)
      this.closeClient(client.jobId, client.id, 'write-error');
    }
  }
}

export const sseManager = new SSEManager();
