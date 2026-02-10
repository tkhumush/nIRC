import { verifyEvent } from 'nostr-tools/pure';
import type { NostrEvent, NostrFilter, RelayInfo } from './types';

type EventHandler = (event: NostrEvent, relayUrl: string) => void;
type EoseHandler = (relayUrl: string, subId: string) => void;

interface Subscription {
  id: string;
  filters: NostrFilter[];
  onEvent: EventHandler;
  onEose?: EoseHandler;
}

interface RelayConnection {
  url: string;
  ws: WebSocket | null;
  status: RelayInfo['status'];
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  subscriptions: Map<string, Subscription>;
  pendingMessages: string[];
}

const INITIAL_BACKOFF = 1000;
const MAX_BACKOFF = 60000;
const BACKOFF_MULTIPLIER = 2;

export class RelayManager {
  private relays: Map<string, RelayConnection> = new Map();
  private globalSubscriptions: Map<string, Subscription> = new Map();
  private subCounter = 0;
  private onStatusChange: ((relays: RelayInfo[]) => void) | null = null;

  setStatusHandler(handler: (relays: RelayInfo[]) => void) {
    this.onStatusChange = handler;
  }

  private emitStatus() {
    if (this.onStatusChange) {
      this.onStatusChange(this.getRelayStatus());
    }
  }

  getRelayStatus(): RelayInfo[] {
    return Array.from(this.relays.values()).map((r) => ({
      url: r.url,
      status: r.status,
      reconnectAttempts: r.reconnectAttempts,
    }));
  }

  connect(url: string): void {
    if (this.relays.has(url)) return;

    const relay: RelayConnection = {
      url,
      ws: null,
      status: 'connecting',
      reconnectAttempts: 0,
      reconnectTimer: null,
      subscriptions: new Map(),
      pendingMessages: [],
    };

    this.relays.set(url, relay);
    this.emitStatus();
    this.openWebSocket(relay);
  }

  disconnect(url: string): void {
    const relay = this.relays.get(url);
    if (!relay) return;
    if (relay.reconnectTimer) clearTimeout(relay.reconnectTimer);
    if (relay.ws) {
      relay.ws.onclose = null;
      relay.ws.close();
    }
    this.relays.delete(url);
    this.emitStatus();
  }

  disconnectAll(): void {
    for (const url of this.relays.keys()) {
      this.disconnect(url);
    }
  }

  private openWebSocket(relay: RelayConnection) {
    try {
      const ws = new WebSocket(relay.url);
      relay.ws = ws;
      relay.status = 'connecting';
      this.emitStatus();

      ws.onopen = () => {
        relay.status = 'connected';
        relay.reconnectAttempts = 0;
        this.emitStatus();

        // Flush pending messages
        for (const msg of relay.pendingMessages) {
          ws.send(msg);
        }
        relay.pendingMessages = [];

        // Resubscribe global subscriptions
        for (const [id, sub] of this.globalSubscriptions) {
          if (!relay.subscriptions.has(id)) {
            relay.subscriptions.set(id, sub);
            const reqMsg = JSON.stringify(['REQ', id, ...sub.filters]);
            ws.send(reqMsg);
          }
        }
      };

      ws.onmessage = (e) => {
        this.handleMessage(relay, e.data);
      };

      ws.onclose = () => {
        relay.status = 'disconnected';
        relay.ws = null;
        this.emitStatus();
        this.scheduleReconnect(relay);
      };

      ws.onerror = () => {
        relay.status = 'error';
        this.emitStatus();
      };
    } catch {
      relay.status = 'error';
      this.emitStatus();
      this.scheduleReconnect(relay);
    }
  }

  private scheduleReconnect(relay: RelayConnection) {
    if (relay.reconnectTimer) clearTimeout(relay.reconnectTimer);

    const backoff = Math.min(
      INITIAL_BACKOFF * Math.pow(BACKOFF_MULTIPLIER, relay.reconnectAttempts),
      MAX_BACKOFF
    );
    relay.reconnectAttempts++;

    relay.reconnectTimer = setTimeout(() => {
      if (this.relays.has(relay.url)) {
        this.openWebSocket(relay);
      }
    }, backoff);
  }

  private handleMessage(relay: RelayConnection, data: string) {
    try {
      const msg = JSON.parse(data);
      if (!Array.isArray(msg)) return;

      const [type, subId, ...rest] = msg;

      switch (type) {
        case 'EVENT': {
          const event = rest[0] as NostrEvent;
          if (!event || !verifyEvent(event)) return;

          // Deliver to matching subscription
          const sub =
            relay.subscriptions.get(subId) ||
            this.globalSubscriptions.get(subId);
          if (sub) {
            sub.onEvent(event, relay.url);
          }
          break;
        }
        case 'EOSE': {
          const sub =
            relay.subscriptions.get(subId) ||
            this.globalSubscriptions.get(subId);
          if (sub?.onEose) {
            sub.onEose(relay.url, subId);
          }
          break;
        }
        case 'OK':
          // Event accepted/rejected — can extend later
          break;
        case 'NOTICE':
          console.warn(`[${relay.url}] NOTICE:`, subId);
          break;
      }
    } catch {
      // ignore parse errors
    }
  }

  subscribe(filters: NostrFilter[], onEvent: EventHandler, onEose?: EoseHandler): string {
    const id = `nirc_${++this.subCounter}`;
    const sub: Subscription = { id, filters, onEvent, onEose };

    this.globalSubscriptions.set(id, sub);

    // Send REQ to all connected relays
    for (const relay of this.relays.values()) {
      relay.subscriptions.set(id, sub);
      const msg = JSON.stringify(['REQ', id, ...filters]);
      if (relay.ws && relay.status === 'connected') {
        relay.ws.send(msg);
      } else {
        relay.pendingMessages.push(msg);
      }
    }

    return id;
  }

  unsubscribe(id: string): void {
    this.globalSubscriptions.delete(id);

    for (const relay of this.relays.values()) {
      relay.subscriptions.delete(id);
      const msg = JSON.stringify(['CLOSE', id]);
      if (relay.ws && relay.status === 'connected') {
        relay.ws.send(msg);
      }
    }
  }

  publish(event: NostrEvent): void {
    const msg = JSON.stringify(['EVENT', event]);

    for (const relay of this.relays.values()) {
      if (relay.ws && relay.status === 'connected') {
        relay.ws.send(msg);
      } else {
        relay.pendingMessages.push(msg);
      }
    }
  }

  getConnectedCount(): number {
    let count = 0;
    for (const relay of this.relays.values()) {
      if (relay.status === 'connected') count++;
    }
    return count;
  }
}

// Singleton relay manager
export const relayManager = new RelayManager();
