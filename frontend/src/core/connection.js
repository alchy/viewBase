import { decode, encode, hello } from './protocol.js';

/** WebSocket klient: handshake, routing zpráv do store, reconnect s backoffem.
 *  Stavy hlásí přes onStatus('init' | 'close' | 'protocol_mismatch'). */
export class Connection {
  constructor(url, store, {
    WebSocketImpl = globalThis.WebSocket,
    schedule = (fn, delay) => setTimeout(fn, delay),
    minBackoff = 500,
    maxBackoff = 10000,
    onStatus = () => {},
  } = {}) {
    this.url = url;
    this.store = store;
    this.WebSocketImpl = WebSocketImpl;
    this.schedule = schedule;
    this.minBackoff = minBackoff;
    this.maxBackoff = maxBackoff;
    this.backoff = minBackoff;
    this.onStatus = onStatus;
    this.stopped = false;   // po protocol_mismatch se už nereconnectuje
    this.ws = null;
  }

  connect() {
    const ws = new this.WebSocketImpl(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = this.minBackoff;
      ws.send(encode(hello()));
    };
    ws.onmessage = (event) => this._onMessage(event.data);
    ws.onclose = () => {
      if (this.stopped) return;   // mismatch: uživatel už vidí výzvu k F5
      this.onStatus('close');
      this.schedule(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
    };
  }

  _onMessage(raw) {
    let msg;
    try {
      msg = decode(raw);
    } catch (err) {
      console.warn('viewbase: vadná zpráva ze serveru', err);
      return;
    }
    if (msg.type === 'init') {
      this.store.applyInit(msg);
      this.onStatus('init');
    } else if (msg.type === 'patch') {
      if (!this.store.applyPatch(msg)) this.ws.close();  // mezera v seq
    } else if (msg.type === 'error') {
      console.error('viewbase server:', msg.error);
      if (msg.error === 'protocol_mismatch') {
        this.stopped = true;
        this.onStatus('protocol_mismatch');
      }
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(encode(message));
  }
}
