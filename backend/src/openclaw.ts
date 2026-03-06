import WebSocket from 'ws';
import crypto from 'node:crypto';

// --- Configuration ---
const WS_URL = process.env.OPENCLAW_WS_URL || 'wss://openclaw-bsxi.srv1461346.hstgr.cloud';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '3qxzuZLzJ0r8q1WDMBbKdTmAsbJA1gfm';

// --- Types ---
interface WsRequest {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, unknown>;
}

interface WsResponse {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: unknown;
}

interface WsEvent {
  type: 'event';
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: number;
}

type WsFrame = WsResponse | WsEvent;

type EventHandler = (payload: unknown) => void;

interface PendingRequest {
  resolve: (payload: unknown) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

// --- OpenClaw Client ---

/**
 * Extract text from OpenClaw's message format.
 * Messages have shape: { role: "assistant", content: [{ type: "text", text: "..." }] }
 */
function extractMessageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';

  const msg = message as Record<string, unknown>;

  // Handle content array format: content: [{ type: "text", text: "..." }]
  if (Array.isArray(msg.content)) {
    return (msg.content as Array<Record<string, unknown>>)
      .filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text as string)
      .join('');
  }

  // Fallback: content as plain string
  if (typeof msg.content === 'string') return msg.content;

  // Fallback: text field
  if (typeof msg.text === 'string') return msg.text;

  return '';
}

class OpenClawClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private handshakeComplete = false;
  private pendingRequests = new Map<string, PendingRequest>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.destroyed) {
        reject(new Error('Client has been destroyed'));
        return;
      }

      console.log(`[OpenClaw] Connecting to ${WS_URL}...`);

      try {
        this.ws = new WebSocket(WS_URL);
      } catch (err) {
        console.error('[OpenClaw] Failed to create WebSocket:', err);
        reject(err);
        return;
      }

      let settled = false;

      this.ws.on('open', () => {
        console.log('[OpenClaw] WebSocket open, sending connect handshake...');
        this.connected = true;
        this.reconnectAttempts = 0;

        // Send connect handshake — token-only auth (dangerouslyDisableDeviceAuth is enabled)
        const connectReq: WsRequest = {
          type: 'req',
          id: crypto.randomUUID(),
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'gateway-client',
              version: '1.0.0',
              platform: 'server',
              mode: 'backend',
            },
            role: 'operator',
            scopes: ['operator.read', 'operator.write'],
            caps: [],
            commands: [],
            permissions: {},
            auth: {
              token: GATEWAY_TOKEN,
            },
            locale: 'en-US',
            userAgent: 'swarm-backend/1.0.0',
          },
        };

        this.ws!.send(JSON.stringify(connectReq));

        // Wait for hello-ok response
        const connectHandler = (data: WebSocket.Data) => {
          try {
            const frame = JSON.parse(data.toString()) as WsFrame;

            // Handle connect.challenge event — just wait for the response
            if (frame.type === 'event' && (frame as WsEvent).event === 'connect.challenge') {
              return; // Ignore challenge when dangerouslyDisableDeviceAuth is on
            }

            if (frame.type === 'res') {
              const res = frame as WsResponse;
              if (res.id === connectReq.id) {
                this.ws!.off('message', connectHandler);

                if (res.ok) {
                  console.log('[OpenClaw] Handshake complete ✓');
                  this.handshakeComplete = true;
                  this.setupMessageHandler();
                  if (!settled) {
                    settled = true;
                    resolve();
                  }
                } else {
                  console.error('[OpenClaw] Handshake failed:', res.error);
                  if (!settled) {
                    settled = true;
                    reject(new Error(`Handshake failed: ${JSON.stringify(res.error)}`));
                  }
                }
              }
            }
          } catch (err) {
            console.error('[OpenClaw] Error parsing handshake frame:', err);
          }
        };

        this.ws!.on('message', connectHandler);

        // Handshake timeout
        setTimeout(() => {
          if (!this.handshakeComplete && !settled) {
            settled = true;
            this.ws!.off('message', connectHandler);
            reject(new Error('Handshake timeout'));
          }
        }, 15000);
      });

      this.ws.on('error', (err) => {
        console.error('[OpenClaw] WebSocket error:', err.message);
        if (!settled) {
          settled = true;
          reject(err);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[OpenClaw] WebSocket closed: ${code} ${reason.toString()}`);
        this.connected = false;
        this.handshakeComplete = false;

        if (!settled) {
          settled = true;
          reject(new Error(`Connection closed: ${code}`));
        }

        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
          clearTimeout(pending.timer);
          pending.reject(new Error('Connection closed'));
          this.pendingRequests.delete(id);
        }

        this.scheduleReconnect();
      });
    });
  }

  private setupMessageHandler() {
    if (!this.ws) return;

    this.ws.on('message', (data) => {
      try {
        const frame = JSON.parse(data.toString()) as WsFrame;

        if (frame.type === 'res') {
          const res = frame as WsResponse;
          const pending = this.pendingRequests.get(res.id);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(res.id);
            if (res.ok) {
              pending.resolve(res.payload);
            } else {
              pending.reject(res.error);
            }
          }
        } else if (frame.type === 'event') {
          const evt = frame as WsEvent;

          // DEBUG: log all incoming events
          console.log(`[OpenClaw] Event: "${evt.event}"`, JSON.stringify(evt.payload).slice(0, 300));

          const handlers = this.eventHandlers.get(evt.event);
          if (handlers) {
            for (const handler of handlers) {
              try {
                handler(evt.payload);
              } catch (err) {
                console.error(`[OpenClaw] Event handler error for ${evt.event}:`, err);
              }
            }
          }

          // Also notify wildcard handlers
          const wildcardHandlers = this.eventHandlers.get('*');
          if (wildcardHandlers) {
            for (const handler of wildcardHandlers) {
              try {
                handler({ event: evt.event, payload: evt.payload });
              } catch (err) {
                console.error('[OpenClaw] Wildcard handler error:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('[OpenClaw] Error parsing message:', err);
      }
    });
  }

  private scheduleReconnect() {
    if (this.destroyed || this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[OpenClaw] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`[OpenClaw] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (err) {
        console.error('[OpenClaw] Reconnect failed:', err);
      }
    }, delay);
  }

  /**
   * Send a typed request and wait for the response.
   */
  async sendRequest(method: string, params: Record<string, unknown> = {}, timeoutMs = 30000): Promise<unknown> {
    if (!this.ws || !this.handshakeComplete) {
      throw new Error('Not connected to OpenClaw');
    }

    const id = crypto.randomUUID();
    const req: WsRequest = { type: 'req', id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.ws!.send(JSON.stringify(req));
    });
  }

  /**
   * Send a chat message and stream the response via callbacks.
   */
  async sendChatMessage(
    message: string,
    sessionKey: string,
    onChunk: (text: string) => void,
    onDone: (fullText: string) => void,
    onError: (error: unknown) => void,
  ): Promise<void> {
    if (!this.ws || !this.handshakeComplete) {
      onError(new Error('Not connected to OpenClaw'));
      return;
    }

    let fullResponse = '';
    let responseComplete = false;

    // Listen for chat events with streaming content
    // ChatEventSchema: { runId, sessionKey, seq, state, message?, errorMessage?, usage?, stopReason? }
    // state: "delta" | "final" | "aborted" | "error"
    // NOTE: OpenClaw prefixes sessionKey with "agent:main:" so we use includes() matching
    // NOTE: message.content is an array like [{type:"text", text:"..."}], not a plain string
    const chatHandler = (payload: unknown) => {
      if (responseComplete) return;

      const p = payload as Record<string, unknown>;

      // Only handle events for our session (OpenClaw prefixes with "agent:main:")
      const evtSessionKey = p.sessionKey as string | undefined;
      if (evtSessionKey && !evtSessionKey.includes(sessionKey)) return;

      const state = p.state as string | undefined;

      if (state === 'delta') {
        // Extract text from message content array
        const text = extractMessageText(p.message);
        if (text) {
          fullResponse = text; // delta events contain cumulative content
          onChunk(text);
        }
      } else if (state === 'final') {
        responseComplete = true;
        const finalText = extractMessageText(p.message) || fullResponse;
        this.off('chat', chatHandler);
        onDone(finalText);
      } else if (state === 'aborted') {
        responseComplete = true;
        this.off('chat', chatHandler);
        onDone(fullResponse);
      } else if (state === 'error') {
        responseComplete = true;
        this.off('chat', chatHandler);
        onError(p.errorMessage || 'Unknown agent error');
      }
    };

    this.on('chat', chatHandler);

    // Timeout: clean up if no response in 120 seconds
    const timeout = setTimeout(() => {
      if (!responseComplete) {
        responseComplete = true;
        this.off('chat', chatHandler);
        if (fullResponse) {
          onDone(fullResponse);
        } else {
          onError(new Error('Response timeout'));
        }
      }
    }, 120000);

    try {
      const params: Record<string, unknown> = {
        message: message,
        sessionKey: sessionKey,
        idempotencyKey: crypto.randomUUID(),
      };

      await this.sendRequest('chat.send', params, 60000);
    } catch (err) {
      if (!responseComplete) {
        responseComplete = true;
        clearTimeout(timeout);
        this.off('chat', chatHandler);
        onError(err);
      }
    }
  }

  /**
   * Subscribe to an event type.
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event type.
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Send a chat message and return the full response as a Promise.
   */
  sendChatMessageAsync(message: string, sessionKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.sendChatMessage(
        message,
        sessionKey,
        () => {},
        (fullText: string) => resolve(fullText),
        (error: unknown) => reject(error),
      );
    });
  }

  /**
   * Check if the client is connected and ready.
   */
  isReady(): boolean {
    return this.connected && this.handshakeComplete;
  }

  /**
   * Gracefully close the connection.
   */
  destroy(): void {
    this.destroyed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Client destroyed'));
      this.pendingRequests.delete(id);
    }

    if (this.ws) {
      this.ws.close(1000, 'Client shutdown');
      this.ws = null;
    }
  }
}

// Singleton instance
const openclawClient = new OpenClawClient();

export default openclawClient;
