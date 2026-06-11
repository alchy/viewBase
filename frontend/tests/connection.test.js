import { beforeEach, describe, expect, it } from 'vitest';
import { Connection } from '../src/core/connection.js';
import { GraphStore } from '../src/core/store.js';

class FakeWebSocket {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.closed = false;
    FakeWebSocket.instances.push(this);
  }
  send(raw) { this.sent.push(raw); }
  close() { this.closed = true; if (this.onclose) this.onclose(); }
  open() { this.readyState = 1; if (this.onopen) this.onopen(); }
  message(obj) { if (this.onmessage) this.onmessage({ data: JSON.stringify(obj) }); }
}

const initMsg = {
  type: 'init', protocol: 1, seq: 0, config: {}, node_types: {},
  nodes: [{ id: 'a', label: 'a', meta: {} }], edges: [],
};

describe('Connection', () => {
  let store, scheduled;
  const schedule = (fn, delay) => scheduled.push({ fn, delay });

  beforeEach(() => {
    FakeWebSocket.instances = [];
    scheduled = [];
    store = new GraphStore();
  });

  function connect() {
    const conn = new Connection('ws://x/ws', store,
      { WebSocketImpl: FakeWebSocket, schedule });
    conn.connect();
    return [conn, FakeWebSocket.instances.at(-1)];
  }

  it('po otevření pošle hello', () => {
    const [, ws] = connect();
    ws.open();
    expect(JSON.parse(ws.sent[0])).toEqual({ type: 'hello', protocol: 1 });
  });

  it('init a navazující patch jdou do store', () => {
    const [, ws] = connect();
    ws.open();
    ws.message(initMsg);
    ws.message({ type: 'patch', seq: 1, add_nodes: [{ id: 'b', label: 'b', meta: {} }],
      update_nodes: [], remove_nodes: [], add_edges: [], remove_edges: [] });
    expect(store.nodes.size).toBe(2);
  });

  it('mezera v seq zavře spojení (reconnect přinese čerstvý init)', () => {
    const [, ws] = connect();
    ws.open();
    ws.message(initMsg);
    ws.message({ type: 'patch', seq: 9, add_nodes: [], update_nodes: [],
      remove_nodes: [], add_edges: [], remove_edges: [] });
    expect(ws.closed).toBe(true);
  });

  it('po zavření plánuje reconnect s rostoucím backoffem', () => {
    const [, ws] = connect();
    ws.open();
    ws.close();
    expect(scheduled[0].delay).toBe(500);
    scheduled[0].fn();                            // reconnect č. 1
    FakeWebSocket.instances.at(-1).close();
    expect(scheduled[1].delay).toBe(1000);        // backoff ×2
  });

  it('protocol_mismatch zastaví reconnect a ohlásí stav', () => {
    const statuses = [];
    const conn = new Connection('ws://x/ws', store,
      { WebSocketImpl: FakeWebSocket, schedule, onStatus: (s) => statuses.push(s) });
    conn.connect();
    const ws = FakeWebSocket.instances.at(-1);
    ws.open();
    ws.message({ type: 'error', error: 'protocol_mismatch' });
    ws.close();                                   // server spojení zavře
    expect(statuses).toEqual(['protocol_mismatch']);
    expect(scheduled).toHaveLength(0);            // žádný reconnect
  });

  it('hlásí close při výpadku a init po obnově', () => {
    const statuses = [];
    const conn = new Connection('ws://x/ws', store,
      { WebSocketImpl: FakeWebSocket, schedule, onStatus: (s) => statuses.push(s) });
    conn.connect();
    let ws = FakeWebSocket.instances.at(-1);
    ws.open();
    ws.message(initMsg);
    ws.close();
    scheduled[0].fn();                            // naplánovaný reconnect
    ws = FakeWebSocket.instances.at(-1);
    ws.open();
    ws.message(initMsg);
    expect(statuses).toEqual(['init', 'close', 'init']);
  });
});
