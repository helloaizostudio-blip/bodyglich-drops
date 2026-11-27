import { EXPRESSION_NAMES, type ExpressionName } from '../expressions/presets';
import type { WsStatus } from '../state/store';

/**
 * Messages the avatar understands over WebSocket. Your backend (which holds
 * any API keys) sends these; see server/bridge.mjs for a reference relay.
 */
export type LiveMessage =
  | { type: 'expression'; name: ExpressionName; intensity?: number }
  | { type: 'speak'; audio?: string; url?: string; text?: string }
  | { type: 'stop' }
  | { type: 'stats'; viewers?: number; subscribers?: number }
  | { type: 'title'; text: string }
  | { type: 'camera'; preset: 'face' | 'bust' | 'upper' | 'full' }
  | { type: 'chat'; user: string; text: string };

export interface LiveHandlers {
  onMessage(msg: LiveMessage): void;
  onStatus(status: WsStatus, detail?: string): void;
}

export class LiveClient {
  private ws: WebSocket | null = null;
  private retry = 0;
  private retryTimer = 0;
  private wanted = false;
  private url = '';

  constructor(private handlers: LiveHandlers) {}

  connect(url: string) {
    if (!/^wss?:\/\//.test(url)) {
      this.handlers.onStatus('error', 'URL must start with ws:// or wss://');
      return;
    }
    this.url = url;
    this.wanted = true;
    this.retry = 0;
    this.open();
  }

  private open() {
    clearTimeout(this.retryTimer);
    this.ws?.close();
    this.handlers.onStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch (e) {
      this.handlers.onStatus('error', (e as Error).message);
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.handlers.onStatus('connected');
      ws.send(JSON.stringify({ type: 'hello', client: 'vtuber-studio', version: 1 }));
    };
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      try {
        const msg = JSON.parse(ev.data) as LiveMessage;
        if (!validate(msg)) throw new Error('unknown message');
        this.handlers.onMessage(msg);
      } catch {
        console.warn('[LiveClient] ignored invalid message', ev.data.slice(0, 200));
      }
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.wanted) {
        const delay = Math.min(15000, 1000 * 2 ** this.retry++);
        this.handlers.onStatus('connecting', `Reconnecting in ${Math.round(delay / 1000)}s…`);
        this.retryTimer = window.setTimeout(() => this.open(), delay);
      } else this.handlers.onStatus('disconnected');
    };
    ws.onerror = () => this.handlers.onStatus('error', 'Connection failed — is the bridge running?');
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(data));
  }

  disconnect() {
    this.wanted = false;
    clearTimeout(this.retryTimer);
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.handlers.onStatus('disconnected');
  }
}

function validate(m: LiveMessage): boolean {
  if (!m || typeof m !== 'object') return false;
  switch (m.type) {
    case 'expression':
      return (EXPRESSION_NAMES as readonly string[]).includes(m.name);
    case 'speak':
      return typeof m.audio === 'string' || typeof m.url === 'string' || typeof m.text === 'string';
    case 'stats':
    case 'stop':
      return true;
    case 'title':
      return typeof m.text === 'string';
    case 'camera':
      return ['face', 'bust', 'upper', 'full'].includes(m.preset);
    case 'chat':
      return typeof m.user === 'string' && typeof m.text === 'string';
    default:
      return false;
  }
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.replace(/^data:[^;]+;base64,/, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
