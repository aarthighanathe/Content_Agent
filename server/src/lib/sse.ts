import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  jobId: string;
}

// WHY: SSE (Server-Sent Events) lets the server push progress updates to the
// browser without polling. One job can have multiple connected clients (e.g.,
// two browser tabs open on the same result page) — hence the clients array per jobId.
class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(jobId: string, clientId: string, res: Response): void {
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

    const client: SSEClient = { id: clientId, res, jobId };
    const clients = this.clients.get(jobId) || [];
    clients.push(client);
    this.clients.set(jobId, clients);

    // WHY: SSE connections sit idle between events. Proxies and load balancers
    // close connections they consider "dead" after ~60s. A 15s ping keeps them alive.
    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n'); // SSE comment — ignored by EventSource, keeps TCP alive
      } catch {
        clearInterval(keepAlive);
      }
    }, 15000);

    // FLOW: browser navigating away or closing tab fires the 'close' event.
    // We clean up the interval and remove the client so memory doesn't accumulate.
    res.on('close', () => {
      clearInterval(keepAlive);
      this.removeClient(jobId, clientId);
    });

    this.sendToClient(client, { type: 'connected', data: { jobId } });
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
      // Client socket closed unexpectedly (network drop, page refresh mid-stream)
      this.removeClient(client.jobId, client.id);
    }
  }
}

export const sseManager = new SSEManager();
