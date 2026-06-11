# Plán 2a: Interakce — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obousměrná interakce viewbase: eventy klient→server (klik, hover, kamera) do Python handlerů, akce server→klient (show_detail, focus, highlight, set_theme), lokální odezva na klik (zvýraznění sousedů, dolet kamery, detail box), klávesnice, 2D režim a hardening spojení.

**Architecture:** Staví na chodící kostře z Plánu 1 (commit 9ebd013). Klient posílá eventy přes existující `Connection.send`, server jim přimíchá `client_id` a předá `canvas.dispatch_event`, který spouští uživatelské handlery v thread-poolu. Akce Canvasu se řadí do fronty a broadcast smyčka je vysílá po patchích. Klient na akce i lokální klik reaguje přes Renderer (per-instance barvy, tween kamery) a jediný HTML detail box. Kamera/controls se nově tvoří lazy po `init` (kvůli `dimensions=2`).

**Tech Stack:** Python 3.10+ (FastAPI, uvicorn, pytest, httpx), JS (Vite, vitest, three r165, d3-force-3d), Playwright pro E2E.

**Předpoklady:** Plán 1 je kompletně implementovaný a mergnutý v `main` (commit 9ebd013). Příkazy se spouštějí z kořene repa; aktivní venv (`source .venv/bin/activate`, balíček nainstalovaný `pip install -e "python[dev]"`); ve `frontend/` proběhlo `npm install`; Node.js ≥ 20.

**Konvence protokolu (rozšíření Plánu 1, závazné pro všechny tasky):**

- Event ↑: `{"type":"event","event":"...","payload":{...}}`. Eventy: `node_click` `{node_id}`, `node_hover` `{node_id|null}` (null = leave), `background_click` `{}`, `view_change` `{position:{x,y,z}, target:{x,y,z}, zoom}`.
- Server každému WS spojení přidělí `client_id = uuid4().hex[:8]` a do payloadu eventu ho přimíchá: `canvas.dispatch_event(msg["event"], {**payload, "client_id": client_id})`.
- Action ↓: `{"type":"action","action":"...", ...}`. Akce: `show_detail` `{node_id}`, `focus` `{node_id}`, `highlight` `{node_id, depth|null}`, `set_theme` `{theme}`.
- V jednom kroku broadcast smyčky jde vždy **nejdřív patch, pak akce** (akce smí odkazovat na čerstvě přidané uzly). Pozor: `batch()` zadržuje jen delty, ne akce — akce na uzly z otevřeného batche volej až po opuštění bloku (nebo na uzly, které klient už zná).
- Handler eventu běží v thread-poolu Canvasu; výjimka se zaloguje s tracebackem, server běží dál; neznámý event je no-op.

---

### Task 1: Hardening spojení + stavový overlay

**Files:**
- Create: `frontend/src/core/status.js`
- Modify: `frontend/src/core/connection.js`, `frontend/src/main.js`
- Test: `frontend/tests/connection.test.js`

Carry-forward z review Plánu 1: po `protocol_mismatch` se nesmí reconnectovat; URL musí respektovat ws/wss podle `location.protocol`.

- [ ] **Step 1: Failing testy na Connection**

Do `frontend/tests/connection.test.js` přidej na konec `describe('Connection', ...)` bloku (za poslední `it`):

```js
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
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/connection.test.js`
Expected: FAIL — 2 nové testy padají (`statuses` je prázdné, `scheduled` není prázdné).

- [ ] **Step 3: Implementace — connection.js**

Nahraď celý obsah `frontend/src/core/connection.js`:

```js
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
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd frontend && npx vitest run`
Expected: vše PASS (store 5, connection 6, physics 4 = 15 testů).

- [ ] **Step 5: StatusOverlay**

Vytvoř `frontend/src/core/status.js` (jediný overlay element pro stavové hlášky — výpadek, mismatch, chybějící WebGL; bez unit testů — čisté DOM, ruční ověření v Step 7):

```js
/** Jediný stavový overlay aplikace (výpadek spojení, mismatch, chybějící WebGL). */
export class StatusOverlay {
  constructor(container = document.body) {
    this.el = document.createElement('div');
    this.el.dataset.role = 'status-overlay';
    this.el.style.cssText = [
      'position:fixed', 'top:16px', 'left:50%', 'transform:translateX(-50%)',
      'max-width:70%', 'padding:10px 18px', 'border-radius:6px',
      'background:rgba(20,23,28,0.85)', 'color:#fff',
      'font:14px/1.4 system-ui,sans-serif', 'z-index:1000',
      'display:none', 'pointer-events:none', 'text-align:center',
    ].join(';');
    container.appendChild(this.el);
  }

  show(message) {
    this.el.textContent = message;
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
  }
}
```

- [ ] **Step 6: main.js — ws/wss, overlay, detekce WebGL**

Nahraď celý obsah `frontend/src/main.js` (`window.__viewbase` je ladicí handle — použije ho E2E driver v Tasku 9):

```js
import { Connection } from './core/connection.js';
import { GraphStore } from './core/store.js';
import { StatusOverlay } from './core/status.js';
import { PhysicsEngine } from './physics/engine.js';
import { Renderer } from './render/renderer.js';

const status = new StatusOverlay();

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext
      && (probe.getContext('webgl2') || probe.getContext('webgl')));
  } catch {
    return false;
  }
}

function bootstrap() {
  const store = new GraphStore();
  const engine = new PhysicsEngine(store);
  const renderer = new Renderer(document.getElementById('app'), store, engine);

  store.subscribe((event) => {
    if (event.kind === 'init' && store.config.title) {
      document.title = `${store.config.title} – viewbase`;
    }
  });

  const wsScheme = location.protocol === 'https:' ? 'wss' : 'ws';
  const connection = new Connection(`${wsScheme}://${location.host}/ws`, store, {
    onStatus: (state) => {
      if (state === 'init') {
        status.hide();
      } else if (state === 'close') {
        status.show('Spojení se serverem vypadlo – zkouším se znovu připojit…');
      } else if (state === 'protocol_mismatch') {
        status.show('Server běží s jinou verzí protokolu – obnovte stránku (F5).');
      }
    },
  });

  connection.connect();
  renderer.start();
  window.__viewbase = { store, engine, renderer, connection };
}

if (webglAvailable()) {
  bootstrap();
} else {
  status.show('Tento prohlížeč nemá dostupné WebGL – vizualizaci nelze spustit. '
    + 'Zkus jiný prohlížeč nebo zapni hardwarovou akceleraci.');
}
```

- [ ] **Step 7: Build a ruční ověření**

```bash
cd frontend && npx vitest run && npm run build && cd ..
python examples/quickstart.py
```

Ověř v prohlížeči (http://127.0.0.1:8080):

1. Graf běží jako dřív, žádný overlay.
2. Zabij server (Ctrl+C) → do pár sekund se nahoře objeví tmavý pruh „Spojení se serverem vypadlo…“.
3. Spusť server znovu → po reconnectu overlay zmizí a graf se obnoví.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/core/status.js frontend/src/core/connection.js frontend/src/main.js frontend/tests/connection.test.js
git commit -m "fix: ws/wss, protocol_mismatch bez reconnectu a stavový overlay"
```

---

### Task 2: Python eventy — dekorátory a dispatch v thread-poolu

**Files:**
- Modify: `python/viewbase/canvas.py`
- Test: `python/tests/test_events.py`, `python/tests/test_canvas.py`

- [ ] **Step 1: Failing testy eventů**

Vytvoř `python/tests/test_events.py`:

```python
import logging
import threading
import time

from viewbase import Canvas


def test_on_click_registers_and_returns_function():
    c = Canvas()

    @c.on_click
    def handler(event):
        pass

    assert callable(handler)
    assert handler.__name__ == "handler"


def test_dispatch_runs_handler_with_namespace_event():
    c = Canvas()
    done = threading.Event()
    seen = {}

    @c.on_click
    def handler(event):
        seen["node_id"] = event.node_id
        seen["client_id"] = event.client_id
        done.set()

    c.dispatch_event("node_click", {"node_id": "a", "client_id": "c1"})
    assert done.wait(timeout=2)
    assert seen == {"node_id": "a", "client_id": "c1"}


def test_all_decorators_map_to_protocol_events():
    c = Canvas()
    fired = {"node_click": threading.Event(), "node_hover": threading.Event(),
             "background_click": threading.Event(),
             "view_change": threading.Event()}

    def make(name):
        def handler(event):
            fired[name].set()
        return handler

    c.on_click(make("node_click"))
    c.on_hover(make("node_hover"))
    c.on_background_click(make("background_click"))
    c.on_view_change(make("view_change"))
    for name, event in fired.items():
        c.dispatch_event(name, {})
        assert event.wait(timeout=2), name


def test_handler_exception_logged_server_survives(caplog):
    c = Canvas()
    ok = threading.Event()

    @c.on_click
    def boom(event):
        raise RuntimeError("bum")

    with caplog.at_level(logging.ERROR, logger="viewbase"):
        c.dispatch_event("node_click", {"node_id": "a"})
        deadline = time.monotonic() + 2
        while "bum" not in caplog.text and time.monotonic() < deadline:
            time.sleep(0.01)
    assert "bum" in caplog.text
    assert "Traceback" in caplog.text       # zalogováno s tracebackem

    @c.on_hover
    def fine(event):
        ok.set()

    c.dispatch_event("node_hover", {})      # canvas dál funguje
    assert ok.wait(timeout=2)


def test_unknown_event_is_noop():
    Canvas().dispatch_event("ghost_event", {"x": 1})   # nesmí spadnout


def test_two_handlers_for_same_event_both_run():
    c = Canvas()
    first, second = threading.Event(), threading.Event()
    c.on_click(lambda e: first.set())
    c.on_click(lambda e: second.set())
    c.dispatch_event("node_click", {})
    assert first.wait(timeout=2) and second.wait(timeout=2)
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd python && python -m pytest tests/test_events.py -v`
Expected: FAIL — `AttributeError: 'Canvas' object has no attribute 'on_click'`.

- [ ] **Step 3: Implementace eventů na Canvasu**

V `python/viewbase/canvas.py` uprav importy na začátku souboru:

```python
"""Canvas – zdroj pravdy grafu a veřejné API knihovny."""
from __future__ import annotations

import logging
import re
import threading
import types
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from typing import Any, Callable, Iterator
```

V `Canvas.__init__` přidej za řádek `self._pending = self._empty_pending()`:

```python
        self._handlers: dict[str, list[Callable[[Any], None]]] = {}
        self._executor = ThreadPoolExecutor(
            max_workers=4, thread_name_prefix="viewbase-handler")
```

Na konec třídy `Canvas` (za metodu `drain`) přidej:

```python
    # ---- eventy ----------------------------------------------------------

    def on_click(self, func: Callable[[Any], None]) -> Callable[[Any], None]:
        return self._register("node_click", func)

    def on_hover(self, func: Callable[[Any], None]) -> Callable[[Any], None]:
        return self._register("node_hover", func)

    def on_background_click(
            self, func: Callable[[Any], None]) -> Callable[[Any], None]:
        return self._register("background_click", func)

    def on_view_change(
            self, func: Callable[[Any], None]) -> Callable[[Any], None]:
        return self._register("view_change", func)

    def _register(self, event: str,
                  func: Callable[[Any], None]) -> Callable[[Any], None]:
        with self._lock:
            self._handlers.setdefault(event, []).append(func)
        return func

    def dispatch_event(self, name: str, payload: dict[str, Any]) -> None:
        """Spustí handlery eventu ve sdíleném thread-poolu (smí blokovat).
        Neznámý event je no-op; výjimka handleru se zaloguje, server běží dál."""
        with self._lock:
            handlers = list(self._handlers.get(name, ()))
        if not handlers:
            return
        event = types.SimpleNamespace(**payload)
        for handler in handlers:
            self._executor.submit(self._run_handler, handler, name, event)

    @staticmethod
    def _run_handler(handler: Callable[[Any], None], name: str,
                     event: types.SimpleNamespace) -> None:
        try:
            handler(event)
        except Exception:
            logger.exception("Výjimka v handleru eventu '%s'", name)
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd python && python -m pytest tests/test_events.py -v`
Expected: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add python/viewbase/canvas.py python/tests/test_events.py
git commit -m "feat: event dekorátory a dispatch v thread-poolu na Canvasu"
```

- [ ] **Step 6: Failing test — update_node odmítá label a type**

Carry-forward z review Plánu 1: `update_node` zatím neumí přegenerovat label šablonu ani typ — tichá změna by se ztratila. Do `python/tests/test_canvas.py` přidej na konec:

```python
def test_update_node_rejects_label_and_type_keys():
    c = Canvas()
    c.add_node("a")
    with pytest.raises(ValueError, match="label"):
        c.update_node("a", label="X")
    with pytest.raises(ValueError, match="type"):
        c.update_node("a", type="server")
```

- [ ] **Step 7: Ověřit selhání**

Run: `cd python && python -m pytest tests/test_canvas.py::test_update_node_rejects_label_and_type_keys -v`
Expected: FAIL — `DID NOT RAISE`.

- [ ] **Step 8: Implementace validace**

V `python/viewbase/canvas.py` v metodě `update_node` přidej hned za kontrolu existence uzlu (za řádek `raise ValueError(f"Uzel '{node_id}' neexistuje")` patřící k podmínce `if node_id not in self._nodes:`):

```python
            for reserved in ("label", "type"):
                if reserved in meta:
                    raise ValueError(
                        f"update_node neumí měnit '{reserved}' – label šablona"
                        " a typ se zadávají v add_node (změna za běhu přijde"
                        " v Plánu 2b)")
```

- [ ] **Step 9: Ověřit průchod všech testů**

Run: `cd python && python -m pytest -v`
Expected: vše PASS (32 testů).

- [ ] **Step 10: Commit**

```bash
git add python/viewbase/canvas.py python/tests/test_canvas.py
git commit -m "fix: update_node odmítá klíče label a type"
```

---

### Task 3: Server přijímá eventy + client_id

**Files:**
- Modify: `python/viewbase/server.py`
- Test: `python/tests/test_server.py`

- [ ] **Step 1: Failing testy**

Do `python/tests/test_server.py` přidej `import threading` na začátek souboru (nad `from fastapi.testclient import TestClient`) a na konec souboru tyto testy:

```python
def test_event_reaches_handler_with_client_id():
    canvas = Canvas()
    canvas.add_node("a")
    seen = {}
    done = threading.Event()

    @canvas.on_click
    def handler(event):
        seen["node_id"] = event.node_id
        seen["client_id"] = event.client_id
        done.set()

    with make_client(canvas) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(hello())
            assert protocol.decode(ws.receive_text())["type"] == "init"
            ws.send_text(protocol.encode(
                {"type": "event", "event": "node_click",
                 "payload": {"node_id": "a"}}))
            assert done.wait(timeout=2)
    assert seen["node_id"] == "a"
    assert isinstance(seen["client_id"], str)
    assert len(seen["client_id"]) == 8


def test_invalid_message_keeps_connection_alive():
    canvas = Canvas()
    done = threading.Event()

    @canvas.on_background_click
    def handler(event):
        done.set()

    with make_client(canvas) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(hello())
            assert protocol.decode(ws.receive_text())["type"] == "init"
            ws.send_text("tohle není JSON")          # log + ignorovat
            ws.send_text(protocol.encode(
                {"type": "event", "event": "background_click"}))
            assert done.wait(timeout=2)
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd python && python -m pytest tests/test_server.py -v`
Expected: FAIL — oba nové testy timeoutují na `done.wait` (server eventy zatím zahazuje).

- [ ] **Step 3: Implementace**

V `python/viewbase/server.py` přidej `import uuid` mezi importy (za `import threading`). Pak nahraď celou funkci `ws_endpoint` uvnitř `create_app`:

```python
    @app.websocket("/ws")
    async def ws_endpoint(ws: WebSocket) -> None:
        await ws.accept()
        client_id = uuid.uuid4().hex[:8]
        try:
            hello = protocol.decode(await ws.receive_text())
        except WebSocketDisconnect:
            return
        except ValueError:
            await ws.close()
            return
        try:
            if (hello.get("type") != "hello"
                    or hello.get("protocol") != protocol.PROTOCOL_VERSION):
                await ws.send_text(protocol.encode(
                    {"type": "error", "error": "protocol_mismatch"}))
                await ws.close()
                return
            await ws.send_text(protocol.encode(
                protocol.init_message(**canvas.snapshot())))
        except WebSocketDisconnect:
            return
        clients.add(ws)
        try:
            while True:
                raw = await ws.receive_text()
                try:
                    msg = protocol.decode(raw)
                except ValueError:
                    logger.warning("Vadná zpráva od klienta %s: %r",
                                   client_id, raw[:200])
                    continue
                if msg.get("type") == "event" and isinstance(msg.get("event"), str):
                    payload = msg.get("payload")
                    if not isinstance(payload, dict):
                        payload = {}
                    canvas.dispatch_event(
                        msg["event"], {**payload, "client_id": client_id})
                else:
                    logger.warning("Nečekaná zpráva od klienta %s: %r",
                                   client_id, raw[:200])
        except WebSocketDisconnect:
            pass
        finally:
            clients.discard(ws)
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd python && python -m pytest tests/test_server.py -v`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add python/viewbase/server.py python/tests/test_server.py
git commit -m "feat: server přijímá eventy a přimíchává client_id"
```

---

### Task 4: Akce server→klient + oprava handshake race

**Files:**
- Modify: `python/viewbase/canvas.py`, `python/viewbase/server.py`
- Test: `python/tests/test_actions.py`

Carry-forward z review Plánu 1: mezi `canvas.snapshot()` a `clients.add(ws)` v handshaku může broadcast smyčka odvysílat patch, který novému klientovi uteče (mezera v seq hned po připojení). Oprava = sdílený `asyncio.Lock` mezi handshakem a broadcast krokem. NEopravovat přidáním klienta před init.

- [ ] **Step 1: Failing testy**

Vytvoř `python/tests/test_actions.py`:

```python
import pytest
from fastapi.testclient import TestClient

from viewbase import Canvas, create_app, protocol


def test_actions_queue_and_drain():
    c = Canvas()
    c.add_node("a")
    c.show_detail("a")
    c.focus("a")
    c.highlight("a", depth=2)
    c.set_theme("cyber")
    assert c.drain_actions() == [
        {"action": "show_detail", "node_id": "a"},
        {"action": "focus", "node_id": "a"},
        {"action": "highlight", "node_id": "a", "depth": 2},
        {"action": "set_theme", "theme": "cyber"},
    ]
    assert c.drain_actions() == []          # fronta je vyprázdněná


def test_highlight_default_depth_is_none():
    c = Canvas()
    c.add_node("a")
    c.highlight("a")
    assert c.drain_actions() == [
        {"action": "highlight", "node_id": "a", "depth": None}]


def test_action_on_missing_node_raises():
    c = Canvas()
    with pytest.raises(ValueError):
        c.show_detail("ghost")
    with pytest.raises(ValueError):
        c.focus("ghost")
    with pytest.raises(ValueError):
        c.highlight("ghost")
    assert c.drain_actions() == []          # nic se nezařadilo


def test_set_theme_updates_config():
    c = Canvas()
    c.set_theme("cyber")
    assert c.snapshot()["config"]["theme"] == "cyber"


def make_ws(canvas):
    client = TestClient(create_app(canvas))
    return client


def test_action_is_delivered_over_ws():
    canvas = Canvas()
    canvas.add_node("a")
    with make_ws(canvas) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(protocol.encode(
                {"type": "hello", "protocol": protocol.PROTOCOL_VERSION}))
            assert protocol.decode(ws.receive_text())["type"] == "init"
            canvas.show_detail("a")
            msg = protocol.decode(ws.receive_text())
            assert msg == {"type": "action", "action": "show_detail",
                           "node_id": "a"}


def test_patch_arrives_before_action_from_same_window():
    canvas = Canvas()
    with make_ws(canvas) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(protocol.encode(
                {"type": "hello", "protocol": protocol.PROTOCOL_VERSION}))
            assert protocol.decode(ws.receive_text())["type"] == "init"
            canvas.add_node("b")
            canvas.show_detail("b")
            first = protocol.decode(ws.receive_text())
            second = protocol.decode(ws.receive_text())
            assert first["type"] == "patch"
            assert [n["id"] for n in first["add_nodes"]] == ["b"]
            assert second == {"type": "action", "action": "show_detail",
                              "node_id": "b"}
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd python && python -m pytest tests/test_actions.py -v`
Expected: FAIL — `AttributeError: 'Canvas' object has no attribute 'show_detail'`.

- [ ] **Step 3: Implementace na Canvasu**

V `python/viewbase/canvas.py` v `Canvas.__init__` přidej za řádek `self._executor = ThreadPoolExecutor(...)` (celé přiřazení):

```python
        self._actions: list[dict[str, Any]] = []
```

Na konec třídy `Canvas` (za metodu `_run_handler`) přidej:

```python
    # ---- akce server -> klient -------------------------------------------

    def show_detail(self, node_id: str) -> None:
        """Zobrazí na klientech detail box s metadaty uzlu."""
        self._queue_node_action("show_detail", node_id)

    def focus(self, node_id: str) -> None:
        """Plynulý dolet kamery na uzel."""
        self._queue_node_action("focus", node_id)

    def highlight(self, node_id: str, depth: int | None = None) -> None:
        """Zvýrazní uzel a sousedy do hloubky depth (None = config klienta)."""
        with self._lock:
            self._require_node(node_id)
            self._actions.append(
                {"action": "highlight", "node_id": node_id, "depth": depth})

    def set_theme(self, theme: Any) -> None:
        """Přepne téma. Vizuální zpracování přijde v Plánu 2b – klient si
        hodnotu zatím jen uloží do configu."""
        with self._lock:
            self.config["theme"] = theme
            self._actions.append({"action": "set_theme", "theme": theme})

    def _queue_node_action(self, action: str, node_id: str) -> None:
        with self._lock:
            self._require_node(node_id)
            self._actions.append({"action": action, "node_id": node_id})

    def _require_node(self, node_id: str) -> None:
        if node_id not in self._nodes:
            raise ValueError(f"Uzel '{node_id}' neexistuje")

    def drain_actions(self) -> list[dict[str, Any]]:
        """Vrátí akce k odeslání (v pořadí volání) a frontu vyprázdní."""
        with self._lock:
            actions, self._actions = self._actions, []
            return actions
```

- [ ] **Step 4: Implementace na serveru (broadcast akcí + handshake lock)**

Nahraď celý obsah `python/viewbase/server.py`:

```python
"""FastAPI server: statické assety + WebSocket protokol + runner."""
from __future__ import annotations

import asyncio
import logging
import threading
import uuid
import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from . import protocol
from .canvas import Canvas

logger = logging.getLogger("viewbase")

STATIC_DIR = Path(__file__).parent / "static"
PATCH_INTERVAL = 1 / 30


async def _broadcast_step(canvas: Canvas, clients: set[WebSocket]) -> None:
    """Jeden krok vysílání: nejdřív patch (data), pak akce (odkazují na data)."""
    drained = canvas.drain()
    actions = canvas.drain_actions()
    messages = []
    if drained is not None:
        seq, deltas = drained
        messages.append(protocol.encode(protocol.patch_message(seq, deltas)))
    messages.extend(
        protocol.encode({"type": "action", **action}) for action in actions)
    if not messages or not clients:
        return
    for ws in list(clients):
        try:
            for raw in messages:
                await ws.send_text(raw)
        except Exception:
            clients.discard(ws)


async def _broadcast_loop(canvas: Canvas, clients: set[WebSocket],
                          state_lock: asyncio.Lock) -> None:
    while True:
        await asyncio.sleep(PATCH_INTERVAL)
        try:
            async with state_lock:
                await _broadcast_step(canvas, clients)
        except Exception:
            logger.exception("Chyba ve vysílací smyčce")


def create_app(canvas: Canvas) -> FastAPI:
    clients: set[WebSocket] = set()
    state_lock = asyncio.Lock()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        task = asyncio.create_task(_broadcast_loop(canvas, clients, state_lock))
        yield
        task.cancel()

    app = FastAPI(lifespan=lifespan)

    @app.websocket("/ws")
    async def ws_endpoint(ws: WebSocket) -> None:
        await ws.accept()
        client_id = uuid.uuid4().hex[:8]
        try:
            hello = protocol.decode(await ws.receive_text())
        except WebSocketDisconnect:
            return
        except ValueError:
            await ws.close()
            return
        try:
            if (hello.get("type") != "hello"
                    or hello.get("protocol") != protocol.PROTOCOL_VERSION):
                await ws.send_text(protocol.encode(
                    {"type": "error", "error": "protocol_mismatch"}))
                await ws.close()
                return
            # Sdílený zámek: snapshot + zařazení mezi klienty musí být atomické
            # vůči broadcast kroku, jinak novému klientovi uteče patch (mezera
            # v seq hned po připojení).
            async with state_lock:
                await ws.send_text(protocol.encode(
                    protocol.init_message(**canvas.snapshot())))
                clients.add(ws)
        except WebSocketDisconnect:
            return
        try:
            while True:
                raw = await ws.receive_text()
                try:
                    msg = protocol.decode(raw)
                except ValueError:
                    logger.warning("Vadná zpráva od klienta %s: %r",
                                   client_id, raw[:200])
                    continue
                if msg.get("type") == "event" and isinstance(msg.get("event"), str):
                    payload = msg.get("payload")
                    if not isinstance(payload, dict):
                        payload = {}
                    canvas.dispatch_event(
                        msg["event"], {**payload, "client_id": client_id})
                else:
                    logger.warning("Nečekaná zpráva od klienta %s: %r",
                                   client_id, raw[:200])
        except WebSocketDisconnect:
            pass
        finally:
            clients.discard(ws)

    if STATIC_DIR.is_dir():
        app.mount("/", StaticFiles(directory=STATIC_DIR, html=True),
                  name="static")
    return app


def serve(canvas: Canvas, *, host: str = "127.0.0.1", port: int = 8080,
          open_browser: bool = False) -> None:
    """Spustí server a blokuje. Mutace canvasu dělej z jiných vláken."""
    app = create_app(canvas)
    if open_browser:
        threading.Timer(
            0.7, webbrowser.open, args=(f"http://{host}:{port}/",)).start()
    uvicorn.run(app, host=host, port=port, log_level="warning")
```

- [ ] **Step 5: Ověřit průchod všech testů**

Run: `cd python && python -m pytest -v`
Expected: vše PASS (39 testů — i původní serverové testy z Plánu 1 musí dál procházet).

- [ ] **Step 6: Commit**

```bash
git add python/viewbase/canvas.py python/viewbase/server.py python/tests/test_actions.py
git commit -m "feat: akce server→klient (show_detail, focus, highlight, set_theme) a oprava handshake race"
```

---

### Task 5: Klient eventy ven — throttle, picking, view_change

**Files:**
- Create: `frontend/src/interact/throttle.js`, `frontend/src/interact/picking.js`
- Modify: `frontend/src/render/renderer.js`, `frontend/src/core/store.js`, `frontend/src/main.js`
- Test: `frontend/tests/throttle.test.js`, `frontend/tests/picking.test.js`, `frontend/tests/store.test.js`

- [ ] **Step 1: Failing testy throttle**

Vytvoř `frontend/tests/throttle.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { throttle } from '../src/interact/throttle.js';

function makeClock() {
  let t = 0;
  let timers = [];
  return {
    now: () => t,
    schedule: (cb, delay) => timers.push({ at: t + delay, cb }),
    advance(ms) {
      t += ms;
      const due = timers.filter((x) => x.at <= t);
      timers = timers.filter((x) => x.at > t);
      for (const timer of due) timer.cb();
    },
  };
}

describe('throttle (trailing edge)', () => {
  it('první volání projde okamžitě', () => {
    const clock = makeClock();
    const calls = [];
    const fn = throttle((v) => calls.push(v), 100, clock);
    fn('a');
    expect(calls).toEqual(['a']);
  });

  it('volání v intervalu se slijí a po uplynutí odejde poslední', () => {
    const clock = makeClock();
    const calls = [];
    const fn = throttle((v) => calls.push(v), 100, clock);
    fn('a');
    clock.advance(30); fn('b');
    clock.advance(30); fn('c');
    expect(calls).toEqual(['a']);
    clock.advance(40);                  // 100 ms od 'a'
    expect(calls).toEqual(['a', 'c']);  // 'b' přepsáno, odešlo poslední
  });

  it('po vyprázdnění jde další volání zase hned', () => {
    const clock = makeClock();
    const calls = [];
    const fn = throttle((v) => calls.push(v), 100, clock);
    fn('a');
    clock.advance(50); fn('b');
    clock.advance(50);                  // trailing 'b' odejde
    clock.advance(200);
    fn('c');
    expect(calls).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/throttle.test.js`
Expected: FAIL — nelze resolvnout `../src/interact/throttle.js`.

- [ ] **Step 3: Implementace throttle**

Vytvoř `frontend/src/interact/throttle.js`:

```js
/** Trailing-edge throttle: první volání projde hned, volání v intervalu se
 *  slijí a po jeho uplynutí odejdou poslední argumenty. */
export function throttle(fn, interval, {
  now = () => Date.now(),
  schedule = (cb, delay) => setTimeout(cb, delay),
} = {}) {
  let lastCall = -Infinity;
  let pendingArgs = null;
  let timerActive = false;

  function fire(args) {
    lastCall = now();
    fn(...args);
  }

  return (...args) => {
    const elapsed = now() - lastCall;
    if (!timerActive && elapsed >= interval) {
      fire(args);
      return;
    }
    pendingArgs = args;
    if (!timerActive) {
      timerActive = true;
      schedule(() => {
        timerActive = false;
        const toSend = pendingArgs;
        pendingArgs = null;
        fire(toSend);
      }, Math.max(0, interval - elapsed));
    }
  };
}
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd frontend && npx vitest run tests/throttle.test.js`
Expected: `3 passed`.

- [ ] **Step 5: Failing testy picking**

Vytvoř `frontend/tests/picking.test.js` (Picker je čistá logika nad nainjektovaným elementem — testovatelné bez DOM):

```js
import { describe, expect, it } from 'vitest';
import { Picker, buildEvent, isClick } from '../src/interact/picking.js';

class FakeElement {
  constructor() { this.handlers = {}; }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  fire(type, event) { this.handlers[type](event); }
}

describe('buildEvent', () => {
  it('staví zprávu protokolu', () => {
    expect(buildEvent('node_click', { node_id: 'a' }))
      .toEqual({ type: 'event', event: 'node_click', payload: { node_id: 'a' } });
    expect(buildEvent('background_click'))
      .toEqual({ type: 'event', event: 'background_click', payload: {} });
  });
});

describe('isClick', () => {
  it('pohyb pod 5 px je klik, víc je drag', () => {
    expect(isClick(10, 10, 12, 12)).toBe(true);
    expect(isClick(10, 10, 15, 10)).toBe(false);   // přesně 5 px už je drag
  });
});

describe('Picker hover', () => {
  function setup(pickFn) {
    const el = new FakeElement();
    const sent = [];
    const frames = [];
    new Picker(el, pickFn, (m) => sent.push(m),
      { requestFrame: (cb) => frames.push(cb) });
    return { el, sent, flushFrames: () => { for (const cb of frames.splice(0)) cb(); } };
  }

  it('posílá node_hover jen při změně (enter/leave)', () => {
    const { el, sent, flushFrames } = setup((x) => (x < 100 ? 'a' : null));
    el.fire('pointermove', { clientX: 50, clientY: 0 });
    flushFrames();
    el.fire('pointermove', { clientX: 60, clientY: 0 });   // pořád 'a'
    flushFrames();
    el.fire('pointermove', { clientX: 200, clientY: 0 });  // leave
    flushFrames();
    expect(sent).toEqual([
      { type: 'event', event: 'node_hover', payload: { node_id: 'a' } },
      { type: 'event', event: 'node_hover', payload: { node_id: null } },
    ]);
  });

  it('víc pointermove mezi snímky = jeden pick na poslední pozici', () => {
    const picks = [];
    const { el, flushFrames } = setup((x) => { picks.push(x); return null; });
    el.fire('pointermove', { clientX: 10, clientY: 0 });
    el.fire('pointermove', { clientX: 20, clientY: 0 });
    el.fire('pointermove', { clientX: 30, clientY: 0 });
    flushFrames();
    expect(picks).toEqual([30]);
  });
});

describe('Picker klik', () => {
  it('klik na uzel pošle node_click a zavolá onNodeClick', () => {
    const el = new FakeElement();
    const sent = [];
    const clicks = [];
    new Picker(el, () => 'a', (m) => sent.push(m), {
      requestFrame: () => {},
      onNodeClick: (id) => clicks.push(id),
    });
    el.fire('pointerdown', { clientX: 10, clientY: 10 });
    el.fire('pointerup', { clientX: 11, clientY: 12 });
    expect(sent).toEqual([
      { type: 'event', event: 'node_click', payload: { node_id: 'a' } }]);
    expect(clicks).toEqual(['a']);
  });

  it('drag (pohyb 5 px a víc) klik nevyvolá', () => {
    const el = new FakeElement();
    const sent = [];
    new Picker(el, () => 'a', (m) => sent.push(m), { requestFrame: () => {} });
    el.fire('pointerdown', { clientX: 10, clientY: 10 });
    el.fire('pointerup', { clientX: 60, clientY: 40 });
    expect(sent).toEqual([]);
  });

  it('klik mimo uzel pošle background_click a zavolá onBackgroundClick', () => {
    const el = new FakeElement();
    const sent = [];
    let bg = 0;
    new Picker(el, () => null, (m) => sent.push(m), {
      requestFrame: () => {},
      onBackgroundClick: () => { bg += 1; },
    });
    el.fire('pointerdown', { clientX: 10, clientY: 10 });
    el.fire('pointerup', { clientX: 10, clientY: 10 });
    expect(sent).toEqual([
      { type: 'event', event: 'background_click', payload: {} }]);
    expect(bg).toBe(1);
  });
});
```

- [ ] **Step 6: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/picking.test.js`
Expected: FAIL — nelze resolvnout `../src/interact/picking.js`.

- [ ] **Step 7: Implementace Picker**

Vytvoř `frontend/src/interact/picking.js`:

```js
const CLICK_MAX_DISTANCE = 5;   // px – víc už je drag (ovládání kamery)

/** Zpráva protokolu pro odchozí event. */
export function buildEvent(event, payload = {}) {
  return { type: 'event', event, payload };
}

/** Čistá rozhodovací logika: klik vs. drag. */
export function isClick(downX, downY, upX, upY,
  maxDistance = CLICK_MAX_DISTANCE) {
  return Math.hypot(upX - downX, upY - downY) < maxDistance;
}

/** Převádí ukazatel na eventy protokolu.
 *  pickFn(clientX, clientY) -> nodeId | null; sendFn(message) je odeslání.
 *  Hover se vyhodnocuje max 1x za snímek (throttle na requestAnimationFrame)
 *  a posílá se jen změna (enter/leave). Klik = down+up s pohybem < 5 px. */
export class Picker {
  constructor(canvasElement, pickFn, sendFn, {
    requestFrame = (cb) => requestAnimationFrame(cb),
    onNodeClick = () => {},
    onBackgroundClick = () => {},
  } = {}) {
    this.pickFn = pickFn;
    this.sendFn = sendFn;
    this.requestFrame = requestFrame;
    this.onNodeClick = onNodeClick;
    this.onBackgroundClick = onBackgroundClick;
    this.hoverId = null;
    this.pointerDown = null;
    this.pendingMove = null;

    canvasElement.addEventListener('pointermove', (e) => this._onMove(e));
    canvasElement.addEventListener('pointerdown', (e) => {
      this.pointerDown = { x: e.clientX, y: e.clientY };
    });
    canvasElement.addEventListener('pointerup', (e) => this._onUp(e));
  }

  _onMove(e) {
    const firstThisFrame = this.pendingMove === null;
    this.pendingMove = { x: e.clientX, y: e.clientY };
    if (firstThisFrame) {
      this.requestFrame(() => {
        const move = this.pendingMove;
        this.pendingMove = null;
        this._hover(move.x, move.y);
      });
    }
  }

  _hover(x, y) {
    const id = this.pickFn(x, y);
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.sendFn(buildEvent('node_hover', { node_id: id }));
  }

  _onUp(e) {
    if (!this.pointerDown) return;
    const { x, y } = this.pointerDown;
    this.pointerDown = null;
    if (!isClick(x, y, e.clientX, e.clientY)) return;
    const id = this.pickFn(e.clientX, e.clientY);
    if (id !== null) {
      this.sendFn(buildEvent('node_click', { node_id: id }));
      this.onNodeClick(id);
    } else {
      this.sendFn(buildEvent('background_click'));
      this.onBackgroundClick();
    }
  }
}
```

- [ ] **Step 8: Ověřit průchod**

Run: `cd frontend && npx vitest run tests/picking.test.js`
Expected: `7 passed` (2 describe bloky hover + klik, buildEvent, isClick).

- [ ] **Step 9: Renderer — pick a viewState**

V `frontend/src/render/renderer.js` přidej do konstruktoru za řádek `this._matrix = new THREE.Matrix4();`:

```js
    this.raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
```

Na konec třídy `Renderer` (za metodu `_syncEdges`) přidej:

```js
  /** Vrátí id uzlu pod souřadnicemi obrazovky, nebo null.
   *  instanceId odpovídá pořadí v engine.ids – stejné jako v _syncNodes. */
  pick(clientX, clientY) {
    if (!this.camera || !this.nodeMesh || this.nodeMesh.count === 0) return null;
    const rect = this.webgl.domElement.getBoundingClientRect();
    this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this._pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.nodeMesh)[0];
    if (!hit || hit.instanceId === undefined) return null;
    return this.engine.ids[hit.instanceId] ?? null;
  }

  /** Stav pohledu pro view_change event; null dokud kamera neexistuje. */
  viewState() {
    if (!this.camera || !this.controls) return null;
    const p = this.camera.position;
    const t = this.controls.target;
    return {
      position: { x: p.x, y: p.y, z: p.z },
      target: { x: t.x, y: t.y, z: t.z },
      zoom: this.camera.zoom,
    };
  }
```

(Guard na `!this.camera` je příprava na Task 8, kde kamera vzniká lazy.)

- [ ] **Step 10: main.js — zapojení Pickeru a view_change**

Nahraď celý obsah `frontend/src/main.js`:

```js
import { Connection } from './core/connection.js';
import { GraphStore } from './core/store.js';
import { StatusOverlay } from './core/status.js';
import { Picker, buildEvent } from './interact/picking.js';
import { throttle } from './interact/throttle.js';
import { PhysicsEngine } from './physics/engine.js';
import { Renderer } from './render/renderer.js';

const status = new StatusOverlay();

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext
      && (probe.getContext('webgl2') || probe.getContext('webgl')));
  } catch {
    return false;
  }
}

function bootstrap() {
  const store = new GraphStore();
  const engine = new PhysicsEngine(store);
  const renderer = new Renderer(document.getElementById('app'), store, engine);

  store.subscribe((event) => {
    if (event.kind === 'init' && store.config.title) {
      document.title = `${store.config.title} – viewbase`;
    }
  });

  const wsScheme = location.protocol === 'https:' ? 'wss' : 'ws';
  const connection = new Connection(`${wsScheme}://${location.host}/ws`, store, {
    onStatus: (state) => {
      if (state === 'init') {
        status.hide();
      } else if (state === 'close') {
        status.show('Spojení se serverem vypadlo – zkouším se znovu připojit…');
      } else if (state === 'protocol_mismatch') {
        status.show('Server běží s jinou verzí protokolu – obnovte stránku (F5).');
      }
    },
  });

  new Picker(renderer.webgl.domElement,
    (x, y) => renderer.pick(x, y),
    (message) => connection.send(message));

  const sendViewChange = throttle(() => {
    const state = renderer.viewState();
    if (state) connection.send(buildEvent('view_change', state));
  }, 100);
  renderer.controls.addEventListener('change', sendViewChange);

  connection.connect();
  renderer.start();
  window.__viewbase = { store, engine, renderer, connection };
}

if (webglAvailable()) {
  bootstrap();
} else {
  status.show('Tento prohlížeč nemá dostupné WebGL – vizualizaci nelze spustit. '
    + 'Zkus jiný prohlížeč nebo zapni hardwarovou akceleraci.');
}
```

- [ ] **Step 11: Build, testy a ruční ověření**

```bash
cd frontend && npx vitest run && npm run build && cd ..
python examples/quickstart.py
```

Ověř v devtools (Network → ws → Messages): pohyb myší přes uzel posílá `node_hover` s id a po opuštění s `null`; klik na uzel `node_click`; klik do prázdna `background_click`; tažení kamery posílá `view_change` max ~10×/s.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/interact frontend/src/render/renderer.js frontend/src/main.js frontend/tests/throttle.test.js frontend/tests/picking.test.js
git commit -m "feat: picking, throttle a odchozí eventy klienta (klik, hover, view_change)"
```

- [ ] **Step 13: Failing test — warning při hraně s chybějícím koncem (carry-forward)**

V `frontend/tests/store.test.js` uprav první řádek importu na:

```js
import { describe, expect, it, vi } from 'vitest';
```

a přidej na konec `describe('GraphStore', ...)` bloku:

```js
  it('add_edge s chybějícím koncem se přeskočí s console.warn', () => {
    const store = new GraphStore();
    store.applyInit(initMsg());
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    store.applyPatch(patchMsg(1, {
      add_edges: [{ source: 'a', target: 'ghost', meta: {} }],
    }));
    expect(store.edges.size).toBe(1);    // jen původní a–b
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
```

Run: `cd frontend && npx vitest run tests/store.test.js`
Expected: FAIL — `warn` nebyl zavolán.

- [ ] **Step 14: Implementace ve store.js**

V `frontend/src/core/store.js` v metodě `applyPatch` nahraď smyčku přes `msg.add_edges`:

```js
    for (const edge of msg.add_edges) {
      if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
        console.warn('viewbase: hrana s neznámým koncem přeskočena',
          edge.source, edge.target);
        continue;
      }
      this.edges.set(GraphStore.edgeKey(edge.source, edge.target), edge);
    }
```

Run: `cd frontend && npx vitest run`
Expected: vše PASS (26 testů).

- [ ] **Step 15: Commit**

```bash
git add frontend/src/core/store.js frontend/tests/store.test.js
git commit -m "fix: warning při patchi hrany s chybějícím koncem"
```

---

### Task 6: Klient akce dovnitř — highlight, focus, detail box

**Files:**
- Create: `frontend/src/interact/highlight.js`, `frontend/src/interact/detail.js`
- Modify: `frontend/src/core/connection.js`, `frontend/src/render/renderer.js`, `frontend/src/main.js`
- Test: `frontend/tests/highlight.test.js`, `frontend/tests/connection.test.js`

- [ ] **Step 1: Failing testy BFS**

Vytvoř `frontend/tests/highlight.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { GraphStore } from '../src/core/store.js';
import { neighborhood } from '../src/interact/highlight.js';

function makeStore() {
  const store = new GraphStore();
  store.applyInit({
    type: 'init', protocol: 1, seq: 0, config: {}, node_types: {},
    nodes: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, label: id, meta: {} })),
    edges: [
      { source: 'a', target: 'b', meta: {} },
      { source: 'b', target: 'c', meta: {} },
      { source: 'c', target: 'd', meta: {} },
    ],
  });
  return store;
}

describe('neighborhood (BFS nad store.edges)', () => {
  it('hloubka 1 = uzel + přímí sousedé', () => {
    expect(neighborhood(makeStore(), 'b', 1)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('hloubka 2 jde po hranách dál', () => {
    expect(neighborhood(makeStore(), 'a', 2)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('hloubka 0 = jen samotný uzel', () => {
    expect(neighborhood(makeStore(), 'a', 0)).toEqual(new Set(['a']));
  });

  it('izolovaný uzel zůstane sám, neznámý start = prázdná množina', () => {
    expect(neighborhood(makeStore(), 'e', 3)).toEqual(new Set(['e']));
    expect(neighborhood(makeStore(), 'ghost', 1)).toEqual(new Set());
  });
});
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/highlight.test.js`
Expected: FAIL — nelze resolvnout `../src/interact/highlight.js`.

- [ ] **Step 3: Implementace BFS**

Vytvoř `frontend/src/interact/highlight.js`:

```js
/** BFS nad store.edges od startId do hloubky depth (0 = jen samotný uzel).
 *  Vrací Set id uzlů ke zvýraznění; neznámý start = prázdná množina. */
export function neighborhood(store, startId, depth) {
  const result = new Set();
  if (!store.nodes.has(startId)) return result;
  result.add(startId);
  if (depth <= 0) return result;

  const adjacency = new Map();
  const link = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a).push(b);
  };
  for (const edge of store.edges.values()) {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }

  let frontier = [startId];
  for (let level = 0; level < depth && frontier.length > 0; level += 1) {
    const next = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!result.has(neighbor)) {
          result.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }
  return result;
}
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd frontend && npx vitest run tests/highlight.test.js`
Expected: `4 passed`.

- [ ] **Step 5: Failing test — Connection routuje akce**

Do `frontend/tests/connection.test.js` přidej na konec `describe('Connection', ...)` bloku:

```js
  it('akce ze serveru jde do onAction', () => {
    const actionsSeen = [];
    const conn = new Connection('ws://x/ws', store,
      { WebSocketImpl: FakeWebSocket, schedule, onAction: (m) => actionsSeen.push(m) });
    conn.connect();
    const ws = FakeWebSocket.instances.at(-1);
    ws.open();
    ws.message(initMsg);
    ws.message({ type: 'action', action: 'focus', node_id: 'a' });
    expect(actionsSeen).toEqual([{ type: 'action', action: 'focus', node_id: 'a' }]);
  });
```

Run: `cd frontend && npx vitest run tests/connection.test.js`
Expected: FAIL — `actionsSeen` je prázdné.

- [ ] **Step 6: Implementace — onAction v Connection**

V `frontend/src/core/connection.js`:

1. Do destrukturovaných options konstruktoru přidej za `onStatus = () => {},` řádek:

```js
    onAction = () => {},
```

2. Do těla konstruktoru přidej za `this.onStatus = onStatus;` řádek:

```js
    this.onAction = onAction;
```

3. V `_onMessage` přidej před větev `else if (msg.type === 'error')` novou větev:

```js
    } else if (msg.type === 'action') {
      this.onAction(msg);
```

Run: `cd frontend && npx vitest run tests/connection.test.js`
Expected: `7 passed`.

- [ ] **Step 7: Renderer — setHighlight a focusOn**

Rendering se jednotkově netestuje (spec §10) — ověření je ruční ve Step 10 a v Tasku 9. V `frontend/src/render/renderer.js`:

1. Za konstantu `SMOOTHING` přidej:

```js
const DIM_TOWARD_BG = 0.75;  // ztlumené uzly: 75 % cesty k barvě pozadí
const FOCUS_DURATION = 0.6;  // s – dolet kamery na uzel
```

2. Do konstruktoru za řádky s `this.raycaster` / `this._pointer` přidej:

```js
    this.highlightSet = null;   // Set id | null = bez zvýraznění
    this._fullColor = new THREE.Color(NODE_COLOR);
    this._dimColor = new THREE.Color(NODE_COLOR)
      .lerp(new THREE.Color(BACKGROUND), DIM_TOWARD_BG);
    this.focusId = null;        // id uzlu, ke kterému letí kamera
    this.focusElapsed = 0;
    this._focusFrom = new THREE.Vector3();
```

3. V `_ensureNodeCapacity` změň materiál na bílý (barvu nese per-instance atribut — Three.js násobí `material.color * instanceColor`):

```js
    const material = new THREE.MeshStandardMaterial(
      { color: 0xffffff, roughness: 0.4 });
```

4. V `_syncNodes` přidej do for-smyčky hned za `this.nodeMesh.setMatrixAt(i, this._matrix);`:

```js
      const color = (this.highlightSet === null || this.highlightSet.has(id))
        ? this._fullColor : this._dimColor;
      this.nodeMesh.setColorAt(i, color);
```

a za řádek `this.nodeMesh.instanceMatrix.needsUpdate = true;` přidej:

```js
    if (this.nodeMesh.instanceColor) this.nodeMesh.instanceColor.needsUpdate = true;
```

5. V `_frame` přidej za `this._syncEdges();` řádek:

```js
    this._stepFocus(dt);
```

6. Na konec třídy `Renderer` (za metodu `viewState`) přidej:

```js
  /** Zvýrazni množinu uzlů (Set id); ostatní se ztlumí. null = reset. */
  setHighlight(ids) {
    this.highlightSet = ids;
  }

  /** Plynulý dolet kamery: tween controls.target k display pozici uzlu. */
  focusOn(nodeId) {
    if (!this.controls) return;
    this.focusId = nodeId;
    this.focusElapsed = 0;
    this._focusFrom.copy(this.controls.target);
  }

  _stepFocus(dt) {
    if (this.focusId === null) return;
    if (!this.store.nodes.has(this.focusId)) {   // uzel mezitím zmizel
      this.focusId = null;
      return;
    }
    const pos = this.display.get(this.focusId);
    if (!pos) return;                            // čeká na první pozici z fyziky
    this.focusElapsed = Math.min(this.focusElapsed + dt, FOCUS_DURATION);
    const t = this.focusElapsed / FOCUS_DURATION;
    const eased = 1 - (1 - t) ** 3;              // easeOutCubic
    this.controls.target.lerpVectors(this._focusFrom, pos, eased);
    if (t >= 1) this.focusId = null;
  }
```

- [ ] **Step 8: DetailBox**

Vytvoř `frontend/src/interact/detail.js` (jediný HTML overlay; CSS inline — témata přijdou v Plánu 2b; bez unit testů — čisté DOM):

```js
/** Jediný HTML overlay s tabulkou metadat uzlu a zavíracím křížkem. */
export class DetailBox {
  constructor(container = document.body) {
    this.el = document.createElement('div');
    this.el.dataset.role = 'detail-box';
    this.el.style.cssText = [
      'position:fixed', 'top:16px', 'right:16px', 'min-width:220px',
      'max-width:320px', 'padding:12px 14px', 'border-radius:8px',
      'background:rgba(255,255,255,0.95)', 'color:#1f2430',
      'font:13px/1.5 system-ui,sans-serif',
      'box-shadow:0 4px 16px rgba(0,0,0,0.18)', 'z-index:900', 'display:none',
    ].join(';');
    container.appendChild(this.el);
  }

  show({ label, meta }) {
    this.el.replaceChildren();

    const close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText = 'position:absolute;top:6px;right:8px;border:0;'
      + 'background:none;font-size:16px;cursor:pointer;color:#666';
    close.addEventListener('click', () => this.hide());
    this.el.appendChild(close);

    const title = document.createElement('div');
    title.textContent = label;
    title.style.cssText = 'font-weight:600;margin:0 18px 8px 0';
    this.el.appendChild(title);

    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;width:100%';
    for (const [key, value] of Object.entries(meta)) {
      const row = table.insertRow();
      const keyCell = row.insertCell();
      keyCell.textContent = key;
      keyCell.style.cssText = 'padding:2px 10px 2px 0;color:#667;vertical-align:top';
      row.insertCell().textContent = String(value);
    }
    this.el.appendChild(table);
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
  }
}
```

- [ ] **Step 9: main.js — mapa akcí a lokální odezva na klik**

Nahraď celý obsah `frontend/src/main.js` (server akce show_detail/focus/highlight volají tytéž mechanismy jako lokální klik):

```js
import { Connection } from './core/connection.js';
import { GraphStore } from './core/store.js';
import { StatusOverlay } from './core/status.js';
import { DetailBox } from './interact/detail.js';
import { neighborhood } from './interact/highlight.js';
import { Picker, buildEvent } from './interact/picking.js';
import { throttle } from './interact/throttle.js';
import { PhysicsEngine } from './physics/engine.js';
import { Renderer } from './render/renderer.js';

const status = new StatusOverlay();

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext
      && (probe.getContext('webgl2') || probe.getContext('webgl')));
  } catch {
    return false;
  }
}

function bootstrap() {
  const store = new GraphStore();
  const engine = new PhysicsEngine(store);
  const renderer = new Renderer(document.getElementById('app'), store, engine);
  const detail = new DetailBox();

  store.subscribe((event) => {
    if (event.kind === 'init' && store.config.title) {
      document.title = `${store.config.title} – viewbase`;
    }
  });

  function applyHighlight(nodeId, depth) {
    const levels = depth ?? store.config.highlight_neighbors ?? 1;
    renderer.setHighlight(neighborhood(store, nodeId, levels));
  }

  function showDetail(nodeId) {
    const node = store.nodes.get(nodeId);
    if (node) detail.show({ label: node.label, meta: node.meta });
  }

  const actions = {
    show_detail: (msg) => showDetail(msg.node_id),
    focus: (msg) => renderer.focusOn(msg.node_id),
    highlight: (msg) => applyHighlight(msg.node_id, msg.depth),
    set_theme: (msg) => { store.config.theme = msg.theme; },  // vizuál v Plánu 2b
  };

  const wsScheme = location.protocol === 'https:' ? 'wss' : 'ws';
  const connection = new Connection(`${wsScheme}://${location.host}/ws`, store, {
    onStatus: (state) => {
      if (state === 'init') {
        status.hide();
      } else if (state === 'close') {
        status.show('Spojení se serverem vypadlo – zkouším se znovu připojit…');
      } else if (state === 'protocol_mismatch') {
        status.show('Server běží s jinou verzí protokolu – obnovte stránku (F5).');
      }
    },
    onAction: (msg) => {
      const handler = actions[msg.action];
      if (handler) handler(msg);
      else console.warn('viewbase: neznámá akce', msg.action);
    },
  });

  new Picker(renderer.webgl.domElement,
    (x, y) => renderer.pick(x, y),
    (message) => connection.send(message), {
      onNodeClick: (id) => {                  // okamžitá lokální odezva
        const levels = store.config.highlight_neighbors ?? 1;
        if (levels > 0) applyHighlight(id, levels);
        renderer.focusOn(id);
      },
      onBackgroundClick: () => {
        renderer.setHighlight(null);
        detail.hide();
      },
    });

  const sendViewChange = throttle(() => {
    const state = renderer.viewState();
    if (state) connection.send(buildEvent('view_change', state));
  }, 100);
  renderer.controls.addEventListener('change', sendViewChange);

  connection.connect();
  renderer.start();
  window.__viewbase = { store, engine, renderer, connection };
}

if (webglAvailable()) {
  bootstrap();
} else {
  status.show('Tento prohlížeč nemá dostupné WebGL – vizualizaci nelze spustit. '
    + 'Zkus jiný prohlížeč nebo zapni hardwarovou akceleraci.');
}
```

- [ ] **Step 10: Testy, build a ruční ověření**

```bash
cd frontend && npx vitest run && npm run build && cd ..
python examples/quickstart.py
```

Ověř v prohlížeči:

1. Klik na uzel → uzel a jeho sousedé zůstanou plně modří, zbytek grafu zbledne; kamera plynule doletí (~0,6 s) tak, aby byl uzel ve středu pohledu.
2. Klik do prázdna → zvýraznění zmizí (všechny uzly plná barva).
3. Drag (orbit) klik nevyvolá.
4. V konzoli nejsou chyby.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/interact/highlight.js frontend/src/interact/detail.js frontend/src/core/connection.js frontend/src/render/renderer.js frontend/src/main.js frontend/tests/highlight.test.js frontend/tests/connection.test.js
git commit -m "feat: akce na klientu – highlight sousedů, dolet kamery a detail box"
```

---

### Task 7: Klávesnice — W/S, A/D, Q/E, mezerník

**Files:**
- Create: `frontend/src/interact/keyboard.js`
- Modify: `frontend/src/main.js`

Kamera se jednotkově netestuje (spec §10) — ruční ověření ve Step 3. OrbitControls v three r165 nemá veřejné rotate metody — manipulujeme přímo kamerou kolem `controls.target` přes `THREE.Spherical` a voláme `controls.update()` (OrbitControls si stav odvozuje z aktuální pozice kamery, přímá manipulace je bezpečná). Držení klávesy = auto-repeat keydown = opakované kroky.

- [ ] **Step 1: Implementace KeyboardControls**

Vytvoř `frontend/src/interact/keyboard.js`:

```js
import * as THREE from 'three';

const ORBIT_STEP = 0.06;    // rad na krok (auto-repeat klávesy = plynulost)
const ZOOM_FACTOR = 0.92;   // násobek vzdálenosti (3D) / zoomu (2D) na krok
const PAN_STEP = 40;        // světové jednotky na krok (2D pan)
const MIN_POLAR = 0.05;     // rad – nepřeklápět kameru přes póly

/** Klávesy: W/S = orbit nahoru/dolů (polar), A/D = vlevo/vpravo (azimut),
 *  Q/E = zoom in/out, mezerník = reset na výchozí pohled.
 *  Ve 2D režimu WASD = pan, Q/E = zoom (ortografická kamera). */
export class KeyboardControls {
  constructor(camera, controls, { is2d = false, target = window } = {}) {
    this.camera = camera;
    this.controls = controls;
    this.is2d = is2d;
    this._spherical = new THREE.Spherical();
    this._offset = new THREE.Vector3();
    this.home = {                       // výchozí stav pro reset mezerníkem
      position: camera.position.clone(),
      target: controls.target.clone(),
      zoom: camera.zoom,
    };
    target.addEventListener('keydown', (e) => {
      if (this.handleKey(e.code)) e.preventDefault();
    });
  }

  /** Vrací true, když byla klávesa obsloužená. */
  handleKey(code) {
    if (this.is2d) {
      switch (code) {
        case 'KeyW': this._pan(0, PAN_STEP); return true;
        case 'KeyS': this._pan(0, -PAN_STEP); return true;
        case 'KeyA': this._pan(-PAN_STEP, 0); return true;
        case 'KeyD': this._pan(PAN_STEP, 0); return true;
        case 'KeyQ': this._zoom(ZOOM_FACTOR); return true;
        case 'KeyE': this._zoom(1 / ZOOM_FACTOR); return true;
        case 'Space': this.reset(); return true;
        default: return false;
      }
    }
    switch (code) {
      case 'KeyW': this._orbit(0, -ORBIT_STEP); return true;
      case 'KeyS': this._orbit(0, ORBIT_STEP); return true;
      case 'KeyA': this._orbit(ORBIT_STEP, 0); return true;
      case 'KeyD': this._orbit(-ORBIT_STEP, 0); return true;
      case 'KeyQ': this._zoom(ZOOM_FACTOR); return true;
      case 'KeyE': this._zoom(1 / ZOOM_FACTOR); return true;
      case 'Space': this.reset(); return true;
      default: return false;
    }
  }

  /** Orbit kolem controls.target přes sférické souřadnice. */
  _orbit(deltaAzimuth, deltaPolar) {
    this._offset.copy(this.camera.position).sub(this.controls.target);
    this._spherical.setFromVector3(this._offset);
    this._spherical.theta += deltaAzimuth;
    this._spherical.phi = Math.min(Math.PI - MIN_POLAR,
      Math.max(MIN_POLAR, this._spherical.phi + deltaPolar));
    this._offset.setFromSpherical(this._spherical);
    this.camera.position.copy(this.controls.target).add(this._offset);
    this.camera.lookAt(this.controls.target);
    this._changed();
  }

  /** factor < 1 přibližuje: 3D zmenší vzdálenost, 2D zvětší camera.zoom. */
  _zoom(factor) {
    if (this.is2d) {
      this.camera.zoom /= factor;
      this.camera.updateProjectionMatrix();
    } else {
      this._offset.copy(this.camera.position).sub(this.controls.target);
      this._offset.multiplyScalar(factor);
      this.camera.position.copy(this.controls.target).add(this._offset);
    }
    this._changed();
  }

  /** Posun kamery i targetu v rovině XY (2D režim). */
  _pan(dx, dy) {
    this.camera.position.x += dx;
    this.camera.position.y += dy;
    this.controls.target.x += dx;
    this.controls.target.y += dy;
    this._changed();
  }

  reset() {
    this.camera.position.copy(this.home.position);
    this.controls.target.copy(this.home.target);
    this.camera.zoom = this.home.zoom;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.controls.target);
    this._changed();
  }

  _changed() {
    this.controls.update();
    // OrbitControls 'change' event => view_change odejde i pro klávesnici
    this.controls.dispatchEvent({ type: 'change' });
  }
}
```

- [ ] **Step 2: Zapojení v main.js**

V `frontend/src/main.js` přidej import (abecedně mezi `highlight.js` a `picking.js`):

```js
import { KeyboardControls } from './interact/keyboard.js';
```

a za řádek `renderer.controls.addEventListener('change', sendViewChange);` přidej:

```js
  new KeyboardControls(renderer.camera, renderer.controls);
```

(Parametr `is2d` doplní Task 8, až bude kamera vznikat podle `config.dimensions`.)

- [ ] **Step 3: Build a ruční ověření**

```bash
cd frontend && npx vitest run && npm run build && cd ..
python examples/quickstart.py
```

Ověř v prohlížeči:

1. W/S orbituje kameru nahoru/dolů (u pólů se zastaví, nepřeklopí se), A/D vlevo/vpravo.
2. Q přibližuje, E oddaluje.
3. Držení klávesy = plynulý pohyb (auto-repeat).
4. Po rozhlédnutí mezerník vrátí výchozí pohled.
5. V devtools (Network → ws → Messages) odcházejí `view_change` eventy i při ovládání klávesnicí.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/interact/keyboard.js frontend/src/main.js
git commit -m "feat: klávesové ovládání kamery (W/S, A/D, Q/E, mezerník)"
```

---

### Task 8: 2D režim — ortografická kamera, lazy init kamery

**Files:**
- Create: `examples/quickstart2d.py`
- Modify: `frontend/src/render/renderer.js`, `frontend/src/main.js`

POZOR na pořadí: `config.dimensions` přichází až v `init` zprávě přes WS. Renderer proto musí kameru/controls vytvářet lazy při prvním `'init'` eventu ze store a do té doby nerendrovat. Picker, klávesnice a view_change listener se na kameru vážou také až po initu (callback `onCameraReady`). Rendering se jednotkově netestuje — ruční ověření ve Step 4 a E2E v Tasku 9.

- [ ] **Step 1: Refactor Rendereru — lazy `_initCamera(dimensions)`**

Nahraď celý obsah `frontend/src/render/renderer.js` (integruje i změny z Tasků 5 a 6 — pick, viewState, highlight, focus):

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const NODE_COLOR = 0x2f7fe8;
const EDGE_COLOR = 0x9aa3af;
const BACKGROUND = 0xf4f5f7;
const SMOOTHING = 8;            // 1/s – rychlost dobíhání zobrazené pozice k fyzice
const DIM_TOWARD_BG = 0.75;     // ztlumené uzly: 75 % cesty k barvě pozadí
const FOCUS_DURATION = 0.6;     // s – dolet kamery na uzel
const ORTHO_HALF_HEIGHT = 600;  // světové jednotky – polovina výšky 2D pohledu

/** Instancovaný renderer: jeden InstancedMesh pro uzly, jeden LineSegments
 *  pro hrany. Zobrazené pozice se vyhlazují exponenciálně mezi fyz. ticky.
 *  Kamera a controls vznikají lazy při prvním 'init' eventu ze store
 *  (config.dimensions: 3 = perspektivní orbit, 2 = ortografický pan/zoom);
 *  do té doby se nerendruje (guard v _frame). */
export class Renderer {
  constructor(container, store, engine, { onCameraReady = () => {} } = {}) {
    this.container = container;
    this.store = store;
    this.engine = engine;
    this.onCameraReady = onCameraReady;
    this.display = new Map();   // id -> THREE.Vector3 (vyhlazená pozice)

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND);
    this.camera = null;         // vznikne v _initCamera po initu
    this.controls = null;

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setSize(container.clientWidth, container.clientHeight);
    this.webgl.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.webgl.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(1, 2, 3);
    this.scene.add(sun);

    this.nodeCapacity = 0;
    this.nodeMesh = null;
    this._ensureNodeCapacity(1024);

    this.edgeCapacity = 0;
    this.edgeLines = null;
    this._ensureEdgeCapacity(4096);

    this.clock = new THREE.Clock();
    this._matrix = new THREE.Matrix4();
    this.raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();

    this.highlightSet = null;   // Set id | null = bez zvýraznění
    this._fullColor = new THREE.Color(NODE_COLOR);
    this._dimColor = new THREE.Color(NODE_COLOR)
      .lerp(new THREE.Color(BACKGROUND), DIM_TOWARD_BG);
    this.focusId = null;        // id uzlu, ke kterému letí kamera
    this.focusElapsed = 0;
    this._focusFrom = new THREE.Vector3();

    store.subscribe((event) => {
      if (event.kind === 'init' && !this.camera) {
        this._initCamera(store.config.dimensions);
      }
    });

    window.addEventListener('resize', () => this._onResize());
  }

  /** Kamera + controls podle config.dimensions. Volá se jen jednou – změna
   *  dimenzí za běhu serveru vyžaduje obnovení stránky. */
  _initCamera(dimensions) {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    if (dimensions === 2) {
      this.camera = new THREE.OrthographicCamera(
        -ORTHO_HALF_HEIGHT * aspect, ORTHO_HALF_HEIGHT * aspect,
        ORTHO_HALF_HEIGHT, -ORTHO_HALF_HEIGHT, -10000, 10000);
      this.camera.position.set(0, 0, 1000);
    } else {
      this.camera = new THREE.PerspectiveCamera(60, aspect, 1, 50000);
      this.camera.position.set(0, 0, 900);
    }
    this.controls = new OrbitControls(this.camera, this.webgl.domElement);
    this.controls.enableDamping = true;
    if (dimensions === 2) {
      this.controls.enableRotate = false;
      this.controls.screenSpacePanning = true;
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN,
      };
      this.controls.touches = {
        ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN,
      };
    }
    this.onCameraReady();
  }

  _onResize() {
    this.webgl.setSize(this.container.clientWidth, this.container.clientHeight);
    if (!this.camera) return;
    const aspect = this.container.clientWidth / this.container.clientHeight;
    if (this.camera.isOrthographicCamera) {
      this.camera.left = -ORTHO_HALF_HEIGHT * aspect;
      this.camera.right = ORTHO_HALF_HEIGHT * aspect;
    } else {
      this.camera.aspect = aspect;
    }
    this.camera.updateProjectionMatrix();
  }

  _ensureNodeCapacity(count) {
    if (count <= this.nodeCapacity) return;
    const capacity = Math.max(1024, 2 ** Math.ceil(Math.log2(count)));
    if (this.nodeMesh) {
      this.scene.remove(this.nodeMesh);
      this.nodeMesh.geometry.dispose();
      this.nodeMesh.material.dispose();
      this.nodeMesh.dispose();
    }
    const geometry = new THREE.SphereGeometry(3, 12, 8);
    // Barvu nese per-instance atribut (highlight) – materiál je bílý,
    // shader násobí material.color * instanceColor.
    const material = new THREE.MeshStandardMaterial(
      { color: 0xffffff, roughness: 0.4 });
    this.nodeMesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.nodeMesh.count = 0;
    this.scene.add(this.nodeMesh);
    this.nodeCapacity = capacity;
  }

  _ensureEdgeCapacity(count) {
    if (count <= this.edgeCapacity) return;
    const capacity = Math.max(4096, 2 ** Math.ceil(Math.log2(count)));
    if (this.edgeLines) {
      this.scene.remove(this.edgeLines);
      this.edgeLines.geometry.dispose();
      this.edgeLines.material.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array(capacity * 6), 3));
    geometry.setDrawRange(0, 0);
    this.edgeLines = new THREE.LineSegments(geometry,
      new THREE.LineBasicMaterial(
        { color: EDGE_COLOR, transparent: true, opacity: 0.5 }));
    this.edgeLines.frustumCulled = false;
    this.scene.add(this.edgeLines);
    this.edgeCapacity = capacity;
  }

  start() {
    this.webgl.setAnimationLoop(() => this._frame());
  }

  _frame() {
    const dt = this.clock.getDelta();
    if (!this.camera) return;       // čekáme na init (config.dimensions)
    this._syncNodes(dt);
    this._syncEdges();
    this._stepFocus(dt);
    this.controls.update();
    this.webgl.render(this.scene, this.camera);
  }

  _syncNodes(dt) {
    const { ids, positions } = this.engine;
    const count = Math.min(ids.length, positions.length / 3);
    this._ensureNodeCapacity(count);
    const k = Math.min(1, dt * SMOOTHING);
    const seen = new Set();
    for (let i = 0; i < count; i += 1) {
      const id = ids[i];
      seen.add(id);
      const tx = positions[i * 3];
      const ty = positions[i * 3 + 1];
      const tz = positions[i * 3 + 2];
      let pos = this.display.get(id);
      if (!pos) {
        pos = new THREE.Vector3(tx, ty, tz);
        this.display.set(id, pos);
      }
      pos.x += (tx - pos.x) * k;
      pos.y += (ty - pos.y) * k;
      pos.z += (tz - pos.z) * k;
      this._matrix.makeTranslation(pos.x, pos.y, pos.z);
      this.nodeMesh.setMatrixAt(i, this._matrix);
      const color = (this.highlightSet === null || this.highlightSet.has(id))
        ? this._fullColor : this._dimColor;
      this.nodeMesh.setColorAt(i, color);
    }
    for (const id of this.display.keys()) {
      if (!seen.has(id)) this.display.delete(id);
    }
    this.nodeMesh.count = count;
    this.nodeMesh.instanceMatrix.needsUpdate = true;
    if (this.nodeMesh.instanceColor) this.nodeMesh.instanceColor.needsUpdate = true;
  }

  _syncEdges() {
    const { edges } = this.store;
    this._ensureEdgeCapacity(edges.size);
    const attr = this.edgeLines.geometry.getAttribute('position');
    let i = 0;
    for (const edge of edges.values()) {
      const a = this.display.get(edge.source);
      const b = this.display.get(edge.target);
      if (!a || !b) continue;
      attr.setXYZ(i * 2, a.x, a.y, a.z);
      attr.setXYZ(i * 2 + 1, b.x, b.y, b.z);
      i += 1;
    }
    this.edgeLines.geometry.setDrawRange(0, i * 2);
    attr.needsUpdate = true;
  }

  /** Vrátí id uzlu pod souřadnicemi obrazovky, nebo null.
   *  instanceId odpovídá pořadí v engine.ids – stejné jako v _syncNodes. */
  pick(clientX, clientY) {
    if (!this.camera || !this.nodeMesh || this.nodeMesh.count === 0) return null;
    const rect = this.webgl.domElement.getBoundingClientRect();
    this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this._pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.nodeMesh)[0];
    if (!hit || hit.instanceId === undefined) return null;
    return this.engine.ids[hit.instanceId] ?? null;
  }

  /** Stav pohledu pro view_change event; null dokud kamera neexistuje. */
  viewState() {
    if (!this.camera || !this.controls) return null;
    const p = this.camera.position;
    const t = this.controls.target;
    return {
      position: { x: p.x, y: p.y, z: p.z },
      target: { x: t.x, y: t.y, z: t.z },
      zoom: this.camera.zoom,
    };
  }

  /** Zvýrazni množinu uzlů (Set id); ostatní se ztlumí. null = reset. */
  setHighlight(ids) {
    this.highlightSet = ids;
  }

  /** Plynulý dolet kamery: tween controls.target k display pozici uzlu. */
  focusOn(nodeId) {
    if (!this.controls) return;
    this.focusId = nodeId;
    this.focusElapsed = 0;
    this._focusFrom.copy(this.controls.target);
  }

  _stepFocus(dt) {
    if (this.focusId === null) return;
    if (!this.store.nodes.has(this.focusId)) {   // uzel mezitím zmizel
      this.focusId = null;
      return;
    }
    const pos = this.display.get(this.focusId);
    if (!pos) return;                            // čeká na první pozici z fyziky
    this.focusElapsed = Math.min(this.focusElapsed + dt, FOCUS_DURATION);
    const t = this.focusElapsed / FOCUS_DURATION;
    const eased = 1 - (1 - t) ** 3;              // easeOutCubic
    this.controls.target.lerpVectors(this._focusFrom, pos, eased);
    if (t >= 1) this.focusId = null;
  }
}
```

- [ ] **Step 2: main.js — vazby na kameru až po initu**

Nahraď celý obsah `frontend/src/main.js` (Picker, KeyboardControls a view_change listener se tvoří v `onCameraReady`; `_initCamera` má guard, takže callback proběhne právě jednou):

```js
import { Connection } from './core/connection.js';
import { GraphStore } from './core/store.js';
import { StatusOverlay } from './core/status.js';
import { DetailBox } from './interact/detail.js';
import { neighborhood } from './interact/highlight.js';
import { KeyboardControls } from './interact/keyboard.js';
import { Picker, buildEvent } from './interact/picking.js';
import { throttle } from './interact/throttle.js';
import { PhysicsEngine } from './physics/engine.js';
import { Renderer } from './render/renderer.js';

const status = new StatusOverlay();

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext
      && (probe.getContext('webgl2') || probe.getContext('webgl')));
  } catch {
    return false;
  }
}

function bootstrap() {
  const store = new GraphStore();
  const engine = new PhysicsEngine(store);
  const detail = new DetailBox();

  function applyHighlight(nodeId, depth) {
    const levels = depth ?? store.config.highlight_neighbors ?? 1;
    renderer.setHighlight(neighborhood(store, nodeId, levels));
  }

  function showDetail(nodeId) {
    const node = store.nodes.get(nodeId);
    if (node) detail.show({ label: node.label, meta: node.meta });
  }

  const renderer = new Renderer(document.getElementById('app'), store, engine, {
    onCameraReady: () => {
      new Picker(renderer.webgl.domElement,
        (x, y) => renderer.pick(x, y),
        (message) => connection.send(message), {
          onNodeClick: (id) => {              // okamžitá lokální odezva
            const levels = store.config.highlight_neighbors ?? 1;
            if (levels > 0) applyHighlight(id, levels);
            renderer.focusOn(id);
          },
          onBackgroundClick: () => {
            renderer.setHighlight(null);
            detail.hide();
          },
        });
      new KeyboardControls(renderer.camera, renderer.controls,
        { is2d: store.config.dimensions === 2 });
      const sendViewChange = throttle(() => {
        const state = renderer.viewState();
        if (state) connection.send(buildEvent('view_change', state));
      }, 100);
      renderer.controls.addEventListener('change', sendViewChange);
    },
  });

  store.subscribe((event) => {
    if (event.kind === 'init' && store.config.title) {
      document.title = `${store.config.title} – viewbase`;
    }
  });

  const actions = {
    show_detail: (msg) => showDetail(msg.node_id),
    focus: (msg) => renderer.focusOn(msg.node_id),
    highlight: (msg) => applyHighlight(msg.node_id, msg.depth),
    set_theme: (msg) => { store.config.theme = msg.theme; },  // vizuál v Plánu 2b
  };

  const wsScheme = location.protocol === 'https:' ? 'wss' : 'ws';
  const connection = new Connection(`${wsScheme}://${location.host}/ws`, store, {
    onStatus: (state) => {
      if (state === 'init') {
        status.hide();
      } else if (state === 'close') {
        status.show('Spojení se serverem vypadlo – zkouším se znovu připojit…');
      } else if (state === 'protocol_mismatch') {
        status.show('Server běží s jinou verzí protokolu – obnovte stránku (F5).');
      }
    },
    onAction: (msg) => {
      const handler = actions[msg.action];
      if (handler) handler(msg);
      else console.warn('viewbase: neznámá akce', msg.action);
    },
  });

  connection.connect();
  renderer.start();
  window.__viewbase = { store, engine, renderer, connection };
}

if (webglAvailable()) {
  bootstrap();
} else {
  status.show('Tento prohlížeč nemá dostupné WebGL – vizualizaci nelze spustit. '
    + 'Zkus jiný prohlížeč nebo zapni hardwarovou akceleraci.');
}
```

- [ ] **Step 3: Příklad quickstart2d**

Vytvoř `examples/quickstart2d.py`:

```python
"""Quickstart 2D: stejný živý graf v rovině (ortografická kamera, pan/zoom)."""
import random
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="Quickstart 2D", dimensions=2)

with canvas.batch():
    for i in range(30):
        canvas.add_node(f"n{i}", value=i)
    for i in range(1, 30):
        canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")


def zivy_graf() -> None:
    i = 30
    while True:
        time.sleep(2.0)
        with canvas.batch():
            canvas.add_node(f"n{i}", value=i)
            canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")
        i += 1


threading.Thread(target=zivy_graf, daemon=True).start()
vb.serve(canvas, port=8080, open_browser=True)
```

- [ ] **Step 4: Testy, build a ruční ověření obou režimů**

```bash
cd frontend && npx vitest run && npm run build && cd ..
python examples/quickstart2d.py
```

Ověř 2D (http://127.0.0.1:8080):

1. Graf je plochý (žádná perspektiva), uzly se usadí v rovině.
2. Tažení levým tlačítkem posouvá pohled (pan, žádná rotace), kolečko zoomuje.
3. WASD panuje, Q/E zoomuje, mezerník resetuje pohled.
4. Klik na uzel zvýrazní sousedy a kamera plynule docentruje; hover/klik eventy odcházejí (devtools → ws).

Pak `Ctrl+C` a ověř, že 3D režim dál funguje:

```bash
python examples/quickstart.py
```

5. Perspektivní orbit, klávesnice i klik fungují jako v Tasku 6/7.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/render/renderer.js frontend/src/main.js examples/quickstart2d.py
git commit -m "feat: 2D režim – ortografická kamera, lazy init kamery a quickstart2d"
```

---

### Task 9: E2E ověření interakce (Playwright)

**Files:**
- Create: `examples/interactive.py`
- Create (mimo repo, throwaway): `/tmp/vb-2a-verify/package.json`, `/tmp/vb-2a-verify/interact.mjs`

Driver po vzoru ověření Plánu 1 (`/tmp/vb-verify`): spustí server, headless Chromium, sleduje WS rámce oběma směry a přes ladicí handle `window.__viewbase` deterministicky promítá pozice uzlů na obrazovku (žádné slepé klikání do mřížky).

- [ ] **Step 1: Příklad interactive.py (demo rozbalování grafu)**

Vytvoř `examples/interactive.py`:

```python
"""Interaktivní demo: klik na uzel zobrazí detail a přidá mu 3 sousedy."""
import itertools
import random

import viewbase as vb

canvas = vb.Canvas(title="Interaktivní graf", dimensions=3,
                   highlight_neighbors=1)

with canvas.batch():
    for i in range(12):
        canvas.add_node(f"n{i}", value=i)
    for i in range(1, 12):
        canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")

_counter = itertools.count()


@canvas.on_click
def expand(event):                       # event.node_id, .client_id
    canvas.show_detail(event.node_id)    # akce na uzel, který klient už zná
    with canvas.batch():
        for _ in range(3):
            new_id = f"x{next(_counter)}"
            canvas.add_node(new_id, parent=event.node_id)
            canvas.add_edge(event.node_id, new_id)


@canvas.on_hover
def hover(event):
    print(f"hover: {event.node_id} (klient {event.client_id})")


@canvas.on_view_change
def view(event):
    print(f"view_change: zoom={event.zoom}")


vb.serve(canvas, port=8080, open_browser=True)
```

- [ ] **Step 2: Vše zelené + čerstvý build**

```bash
cd python && python -m pytest -v && cd ..
cd frontend && npx vitest run && npm run build && cd ..
```

Expected: pytest 39 passed, vitest 31 passed, build bez chyb.

- [ ] **Step 3: Příprava driveru**

```bash
lsof -ti :8080 | xargs kill -9 2>/dev/null || true
mkdir -p /tmp/vb-2a-verify
sed 's/open_browser=True/open_browser=False/' examples/interactive.py > /tmp/vb-2a-verify/interactive_noopen.py
sed 's/open_browser=True/open_browser=False/' examples/quickstart2d.py > /tmp/vb-2a-verify/quickstart2d_noopen.py
```

Vytvoř `/tmp/vb-2a-verify/package.json`:

```json
{
  "name": "vb-2a-verify",
  "private": true,
  "type": "module",
  "dependencies": {
    "playwright": "^1.44.0"
  }
}
```

```bash
cd /tmp/vb-2a-verify && npm install && npx playwright install chromium
```

- [ ] **Step 4: E2E driver**

Vytvoř `/tmp/vb-2a-verify/interact.mjs` (cesta `PY` ukazuje na venv repa — uprav, pokud máš venv jinde):

```js
// E2E ověření interakce (Plán 2a): klik → server handler → nové uzly,
// hover, view_change, detail box, klávesnice a 2D režim.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const REPO = '/Users/j/Projects/viewBase';
const PY = `${REPO}/.venv/bin/python`;
const OUT = '/tmp/vb-2a-verify';
const URL = 'http://127.0.0.1:8080/';

const summary = { pageErrors: [], consoleErrors: [], checks: {} };

function startServer(script) {
  const proc = spawn(PY, [script], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (d) => fs.appendFileSync(`${OUT}/server.log`, d));
  proc.stderr.on('data', (d) => fs.appendFileSync(`${OUT}/server.log`, d));
  return proc;
}

async function waitForServer(tries = 50) {
  for (let i = 0; i < tries; i += 1) {
    try { if ((await fetch(URL)).status === 200) return true; } catch { /* čekej */ }
    await sleep(200);
  }
  return false;
}

/** Promítne display pozici uzlu (podle indexu v engine.ids, nebo id)
 *  na souřadnice obrazovky přes window.__viewbase. */
async function nodeScreenPos(page, indexOrId) {
  return page.evaluate((key) => {
    const { renderer } = window.__viewbase;
    const id = typeof key === 'number' ? renderer.engine.ids[key] : key;
    if (!id) return null;
    const pos = renderer.display.get(id);
    if (!pos) return null;
    const projected = pos.clone().project(renderer.camera);
    const rect = renderer.webgl.domElement.getBoundingClientRect();
    return {
      id,
      x: rect.left + ((projected.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - projected.y) / 2) * rect.height,
    };
  }, indexOrId);
}

let server = startServer(`${OUT}/interactive_noopen.py`);
if (!(await waitForServer())) {
  console.log('FATAL: server nenastartoval, viz /tmp/vb-2a-verify/server.log');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => summary.pageErrors.push(String(e).slice(0, 300)));
page.on('console', (m) => {
  if (m.type() === 'error') summary.consoleErrors.push(m.text().slice(0, 300));
});

const sent = [];      // event zprávy klient -> server
const received = [];  // init/patch/action server -> klient
page.on('websocket', (ws) => {
  ws.on('framesent', (f) => { try { sent.push(JSON.parse(f.payload)); } catch { /* hello aj. */ } });
  ws.on('framereceived', (f) => { try { received.push(JSON.parse(f.payload)); } catch { /* ne-JSON */ } });
});

await page.goto(URL);
await sleep(5000);                          // init + usazení grafu

// --- 1. klik na uzel (promítnutá pozice; zkoušej uzly, dokud klik neprojde) ---
const sentClicks = () => sent.filter((m) => m.type === 'event' && m.event === 'node_click');
let clicked = null;
for (let i = 0; i < 12 && !clicked; i += 1) {
  const pt = await nodeScreenPos(page, i);
  if (!pt || pt.x < 5 || pt.y < 5 || pt.x > 1275 || pt.y > 795) continue;
  const before = sentClicks().length;
  await page.mouse.click(pt.x, pt.y);
  await sleep(400);
  if (sentClicks().length > before) clicked = sentClicks().at(-1).payload.node_id;
}
summary.checks.nodeClicked = clicked;
await sleep(1500);                          // handler + patch + akce + dolet kamery

// --- 2. server handler přidal 3 sousedy (patch s add_nodes x*) ---
const expandPatch = received.find((m) => m.type === 'patch'
  && (m.add_nodes ?? []).some((n) => n.id.startsWith('x')));
summary.checks.expandedNodes = expandPatch
  ? expandPatch.add_nodes.map((n) => n.id) : null;

// --- 3. akce show_detail dorazila a detail box je vidět ---
summary.checks.showDetailAction = received.some(
  (m) => m.type === 'action' && m.action === 'show_detail');
summary.checks.detailBoxVisible = await page.evaluate(() => {
  const el = document.querySelector('[data-role="detail-box"]');
  return Boolean(el) && el.style.display === 'block';
});
await page.screenshot({ path: `${OUT}/1-po-kliku.png` });

// --- 4. hover enter/leave na kliknutém uzlu ---
await page.mouse.move(30, 30);
await sleep(400);
const hoverPt = await nodeScreenPos(page, clicked);
if (hoverPt) {
  await page.mouse.move(hoverPt.x, hoverPt.y);
  await sleep(400);
  await page.mouse.move(30, 30);
  await sleep(400);
}
summary.checks.hoverEnter = sent.some((m) => m.type === 'event'
  && m.event === 'node_hover' && m.payload.node_id !== null);
summary.checks.hoverLeave = sent.some((m) => m.type === 'event'
  && m.event === 'node_hover' && m.payload.node_id === null);

// --- 5. view_change po dragu (orbit) ---
const viewBefore = sent.filter((m) => m.event === 'view_change').length;
await page.mouse.move(400, 300);
await page.mouse.down();
for (let i = 1; i <= 8; i += 1) {
  await page.mouse.move(400 + i * 30, 300 + i * 10);
  await sleep(40);
}
await page.mouse.up();
await sleep(500);
summary.checks.viewChange =
  sent.filter((m) => m.event === 'view_change').length > viewBefore;

// --- 6. klávesnice: orbit posune kameru (screenshot diff jako artefakt) ---
await page.screenshot({ path: `${OUT}/2-pred-orbitem.png` });
const camBefore = await page.evaluate(
  () => window.__viewbase.renderer.camera.position.toArray());
for (let i = 0; i < 12; i += 1) {
  await page.keyboard.press('KeyA');
  await sleep(40);
}
await sleep(400);
const camAfter = await page.evaluate(
  () => window.__viewbase.renderer.camera.position.toArray());
summary.checks.keyboardOrbit = JSON.stringify(camBefore) !== JSON.stringify(camAfter);
await page.screenshot({ path: `${OUT}/3-po-orbitu.png` });

server.kill('SIGKILL');
await sleep(1000);

// --- 7. 2D příklad: ortografický pohled, vykreslené uzly, pan dragem ---
server = startServer(`${OUT}/quickstart2d_noopen.py`);
summary.checks.server2dUp = await waitForServer();
await page.goto(URL);
await sleep(5000);
summary.checks.ortho2d = await page.evaluate(() => ({
  ortho: window.__viewbase.renderer.camera.isOrthographicCamera === true,
  nodes: window.__viewbase.renderer.nodeMesh.count,
}));
const pan2dBefore = await page.evaluate(
  () => window.__viewbase.renderer.camera.position.toArray());
await page.mouse.move(640, 400);
await page.mouse.down();
for (let i = 1; i <= 8; i += 1) {
  await page.mouse.move(640 + i * 25, 400 + i * 10);
  await sleep(40);
}
await page.mouse.up();
await sleep(500);
const pan2dAfter = await page.evaluate(
  () => window.__viewbase.renderer.camera.position.toArray());
summary.checks.pan2d = pan2dBefore[0] !== pan2dAfter[0]
  || pan2dBefore[1] !== pan2dAfter[1];
await page.screenshot({ path: `${OUT}/4-2d.png` });

await browser.close();
server.kill('SIGKILL');
console.log(JSON.stringify(summary, null, 1));
```

- [ ] **Step 5: Spuštění driveru a vyhodnocení**

```bash
cd /tmp/vb-2a-verify && node interact.mjs
```

Expected — JSON souhrn, kde `pageErrors` i `consoleErrors` jsou prázdné a checks vypadají takto (`nodeClicked` a `expandedNodes` se liší podle náhody):

```json
{
 "pageErrors": [],
 "consoleErrors": [],
 "checks": {
  "nodeClicked": "n0",
  "expandedNodes": ["x0", "x1", "x2"],
  "showDetailAction": true,
  "detailBoxVisible": true,
  "hoverEnter": true,
  "hoverLeave": true,
  "viewChange": true,
  "keyboardOrbit": true,
  "server2dUp": true,
  "ortho2d": { "ortho": true, "nodes": 30 },
  "pan2d": true
 }
}
```

Vizuálně zkontroluj screenshoty `/tmp/vb-2a-verify/1-po-kliku.png` (detail box vpravo nahoře, zvýrazněný shluk, zbytek bledý), `2-pred-orbitem.png` vs. `3-po-orbitu.png` (jiný úhel pohledu) a `4-2d.png` (plochý graf).

Pokud je některý check `false`/`null`: najdi příčinu (server.log, screenshoty, konzole), oprav kód, přebuilduj frontend (`cd frontend && npm run build`) a spusť driver znovu. Opravy commitni samostatně s popisem.

- [ ] **Step 6: Závěrečný commit**

```bash
cd python && python -m pytest -q && cd ..
cd frontend && npx vitest run && cd ..
git add -A
git commit -m "feat: interakce end-to-end – eventy, akce, klávesnice a 2D režim ověřeny Playwrightem"
```

---

## Pokrytí spec ↔ plán (pro orientaci)

| Spec | Tady | Spec | Tady |
|---|---|---|---|
| Event dekorátory (§5) | T2 | Lokální highlight + BFS (§7) | T6 |
| Handlery v thread-poolu, výjimky (§5, §9) | T2 | Dolet kamery focus (§7) | T6 |
| `client_id` u eventů (§5) | T3 | Detail box (jediný overlay) (§7) | T6 |
| Vadná zpráva → log + ignorovat (§9) | T3 | Klávesnice W/S, A/D, Q/E, mezerník (§7) | T7 |
| Akce show_detail/focus/highlight/set_theme (§5, §6) | T4 | 2D režim: ortho + pan/zoom (§7) | T8 |
| `event`/`action` zprávy protokolu (§6) | T3, T4, T5, T6 | Picking raycastem, instanceId → id (§7) | T5 |
| view_change throttle 10 Hz (§6) | T5 | Klik vs. drag, hover enter/leave (§7) | T5 |
| Reconnect indikátor + WebGL hláška (§9) | T1 | E2E klik → Python handler (§10) | T9 |
| protocol_mismatch → výzva k F5 (§9) | T1 | Interaktivní rozbalování (§3, §5) | T9 |
| ws/wss dle stránky (§6 jeden kanál) | T1 | Validace akcí ValueError (§5) | T4 |

**Carry-forward opravy z review Plánu 1:** mismatch bez reconnectu + ws/wss → T1; handshake race (asyncio.Lock) → T4; `update_node` s `label`/`type` → T2; warning při hraně s chybějícím koncem → T5.

**Odloženo do Plánu 2b (estetika — záměrně NENÍ v tomto plánu):**

- Témata `modern` a `cyber` (palety, materiály, světla, mlha, CSS detail boxu) a theme engine; vizuální zpracování `set_theme` (tady se jen ukládá do `store.config.theme`).
- Vzhled podle typů uzlů (`define_type` → tvar/barva/velikost/GLB) a propagace `define_type` za běhu.
- Labely (SDF text, troika-three-text, LOD s rozpočtem).
- Bloom / post-processing, `quality="low|high|auto"`.
- Kategorická paleta, toky a typy toků (Plán 3 dle spec §12).
