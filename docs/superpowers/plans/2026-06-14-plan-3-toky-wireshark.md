# Plán 3: Toky a wireshark — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dotáhnout vizualizaci datových toků: Python API (`define_flow_type`, `flow`, `stop_flow`) s validací hran a trvalými toky v `init`, protokol akcí `flow`/`stop_flow`, klientskou vrstvu instancovaných glow částic, které jedou po hranách mezi živými pozicemi uzlů (i multi-hop), vzhled částic z tématu, ukázky (showcase + vlajková `examples/wireshark/`) a E2E ověření přes Playwright.

**Architecture:** Toky mají dvě části. **Python** (`canvas.py`) drží registr typů toků (jako typy uzlů) a registr aktivních *trvalých* toků (`count=None`), které jdou do `snapshot()` pod klíčem `"flows"`; jednorázové toky (`count=N`) jsou fire-and-forget — jen se zařadí akce a server je neudržuje. Server vysílá akce `flow`/`stop_flow` stejnou cestou jako stávající akce. **Klient** má `FlowController` (čistá logika emise + životní cyklus toků, řízená akcemi a `init.flows`) a `FlowLayer` (`THREE.InstancedMesh` glow částic s aditivním blendingem, per-frame přepočet pozic interpolací po hraně mezi *živými* pozicemi koncových uzlů z `renderer.display`). Barvu typu toku řeší **klient**: Python posílá název typu + volitelně explicitní barvu; když explicitní není, klient sáhne do `theme.palette[typeIndex]` (kategorická paleta). Vzhled částic (velikost, základní rychlost, glow) přidá nový blok `theme.flow` do témat `modern` a `cyber`.

**Tech Stack:** Python 3.10+ (FastAPI, uvicorn, pytest, `uuid` ze std. knihovny, ukázka navíc `scapy`), JS (Vite, vitest, three r165 + three/addons, d3-force-3d, troika-three-text), Playwright pro E2E.

**Předpoklady:** Plán 2b je kompletně v `main`. Příkazy se spouštějí z kořene repa; aktivní venv (`source .venv/bin/activate`, balíček nainstalovaný `pip install -e "python[dev]"`); ve `frontend/` proběhlo `npm install`; Node.js ≥ 20. Pro task T5 (wireshark) navíc `pip install scapy`. Pro task T6 (E2E) je k dispozici Playwright v `node_modules` (symlink jako v `/tmp/vb-2b-verify`).

---

## Konvence — závazné tvary pro všechny tasky

Tyto tvary definuje T1 (Python) a T2/T3 (klient) a **musí** je dodržet i T4/T5/T6. Žádná pozdější úprava je nesmí rozejít.

### 1. Typ toku (flow type)

Uložen v Canvasu jako `self._flow_types[name] = {"color": str|None, "size": float, "speed": float}`. V `snapshot()`/`init` jde pod klíčem `"flow_types"` jako `{name: {"color", "size", "speed"}}`. Pořadí registrace určuje **index typu** (`typeIndex`), který klient používá pro výběr barvy z kategorické palety, když `color` je `None`.

### 2. Akce `flow` (server → klient)

Jednorázový (fire-and-forget, `count=N`) i trvalý (`count=None`) tok posílá stejný tvar akce; trvalý navíc nese `flow_id`:

```json
{
  "type": "action",
  "action": "flow",
  "flow_id": "a1b2c3d4",          // jen u trvalého toku; u jednorázového klíč chybí
  "path": ["client", "fw-1", "srv-1"],   // ≥2 uzly; jednoduchý tok je [source, target]
  "flow_type": "dns",            // název typu nebo null
  "type_index": 1,               // index typu v registru, nebo null (pro výběr palety)
  "count": 5,                    // int (jednorázový) nebo null (trvalý)
  "interval": 0.2,               // s mezi částicemi
  "speed": 1.5,                  // násobek theme.flow.baseSpeed
  "color": "#ffd166",            // explicitní barva nebo null (klient pak vezme paletu)
  "size": null                   // explicitní velikost nebo null (klient vezme typ/téma)
}
```

### 3. Akce `stop_flow` (server → klient)

```json
{ "type": "action", "action": "stop_flow", "flow_id": "a1b2c3d4" }
```

### 4. `init` nese aktivní trvalé toky

`init` (a `snapshot()`) dostane dva nové klíče:

```json
{
  "flow_types": { "dns": {"color": "#ffd166", "size": 0.7, "speed": 1.5} },
  "flows": [ { "flow_id": "a1b2c3d4", "path": [...], "flow_type": "dns",
              "type_index": 1, "count": null, "interval": 0.5, "speed": 1.0,
              "color": null, "size": null } ]
}
```

`"flows"` obsahuje **jen aktivní trvalé** toky (jednorázové se neukládají). Klient je při `init` přehraje jako trvalé.

### 5. Rozdělení barvy (color-resolution split) — ZÁVAZNÉ

- **Python** posílá název typu (`flow_type`), jeho index (`type_index`) a volitelně explicitní `color`. Python **nezná** paletu tématu (paleta žije v JS).
- **Klient** řeší výslednou barvu v tomto pořadí: `color` (explicitní per-flow) > `flowTypeStyle.color` (explicitní u `define_flow_type`) > `theme.palette[type_index % palette.length]` (kategorická paleta) > `theme.flow.color` (default tématu, když typ není žádný).

### 6. Tvar `theme.flow` (přidá T3 do `modern` i `cyber`)

```js
flow: {
  size: 2.4,          // poloměr glow částice ve světových jednotkách (modern)
  baseSpeed: 220,     // světové jednotky/s při speed=1.0
  color: '#2f7fe8',   // default barva, když tok nemá typ ani explicitní barvu
  opacity: 0.85,      // alpha částice
}
```

### 7. JS API napříč tasky (pinned signatury)

- `FlowController(store, { now })` (T2, `render/flow.js`): metody `applyFlow(action)`, `stopFlow(flow_id)`, `replayInit(flowsArray)`, `update(dt, theme)`, `activeCount()`, `particles()` (vrátí pole `{x,y,z,color}` pro vykreslení).
- `FlowLayer(scene, store, controller)` (T2/T3, `render/flow.js`): metody `update(dt, theme, display)`, `applyTheme(theme)`, `dispose()`.
- Čisté funkce v `render/flow.js`: `interpolateAlongPath(path, t, display)` → `{x,y,z}|null`; `resolveFlowColor(flow, flowTypeStyle, theme)` → hex string.
- `renderer.flows` (T3) = instance `FlowLayer`; `renderer.flowController` = instance `FlowController` (zpřístupněné pro E2E přes `window.__viewbase`).

---

### Task 1 (T1): Flow protokol + Python API

**Files:**
- Modify: `python/viewbase/canvas.py`
- Modify: `python/viewbase/protocol.py`
- Test: `python/tests/test_flows.py` (create)

Cíl: `Canvas.define_flow_type`, `Canvas.flow`, `Canvas.stop_flow`; trvalé toky v `snapshot()` pod `"flows"`, typy toků pod `"flow_types"`; akce `flow`/`stop_flow` přes stávající `_actions`; `init_message` nese nové klíče.

- [ ] **Step 1: Napiš failing testy pro define_flow_type a flow validaci**

Vytvoř `python/tests/test_flows.py`:

```python
import pytest

from viewbase import Canvas, create_app, protocol
from fastapi.testclient import TestClient


def _graph():
    c = Canvas()
    c.add_node("a")
    c.add_node("b")
    c.add_node("c")
    c.add_edge("a", "b")
    c.add_edge("b", "c")
    return c


def test_define_flow_type_stored_in_snapshot():
    c = Canvas()
    c.define_flow_type("dns", color="#ffd166", size=0.7, speed=1.5)
    c.define_flow_type("http")
    snap = c.snapshot()
    assert snap["flow_types"] == {
        "dns": {"color": "#ffd166", "size": 0.7, "speed": 1.5},
        "http": {"color": None, "size": 1.0, "speed": 1.0},
    }


def test_flow_simple_edge_queues_action():
    c = _graph()
    assert c.flow("a", "b", count=3, interval=0.2) is None   # fire-and-forget
    (action,) = c.drain_actions()
    assert action["action"] == "flow"
    assert action["path"] == ["a", "b"]
    assert action["count"] == 3
    assert action["interval"] == 0.2
    assert "flow_id" not in action


def test_flow_missing_edge_raises():
    c = _graph()
    with pytest.raises(ValueError):
        c.flow("a", "c")          # hrana a-c neexistuje (jen a-b, b-c)
    assert c.drain_actions() == []


def test_flow_missing_node_raises():
    c = _graph()
    with pytest.raises(ValueError):
        c.flow("a", "ghost")
    assert c.drain_actions() == []


def test_flow_multihop_path_validates_each_edge():
    c = _graph()
    c.flow(path=["a", "b", "c"], count=2)
    (action,) = c.drain_actions()
    assert action["path"] == ["a", "b", "c"]
    # chybějící hrana uprostřed cesty:
    with pytest.raises(ValueError):
        c.flow(path=["a", "b", "c", "a"])     # hrana c-a neexistuje


def test_flow_requires_source_target_or_path():
    c = _graph()
    with pytest.raises(ValueError):
        c.flow()                                # nic
    with pytest.raises(ValueError):
        c.flow("a")                             # jen source
    with pytest.raises(ValueError):
        c.flow(path=["a"])                      # cesta < 2 uzly


def test_flow_unknown_type_raises():
    c = _graph()
    with pytest.raises(ValueError):
        c.flow("a", "b", type="ghost")


def test_flow_type_index_propagated():
    c = _graph()
    c.define_flow_type("first")
    c.define_flow_type("dns", color="#ffd166")
    c.flow("a", "b", type="dns")
    (action,) = c.drain_actions()
    assert action["flow_type"] == "dns"
    assert action["type_index"] == 1            # druhý registrovaný typ
    assert action["color"] is None              # explicitní per-flow barva chybí


def test_persistent_flow_returns_id_and_is_in_snapshot():
    c = _graph()
    fid = c.flow("a", "b", count=None, interval=0.5)
    assert isinstance(fid, str) and len(fid) == 8
    (action,) = c.drain_actions()
    assert action["action"] == "flow"
    assert action["flow_id"] == fid
    assert action["count"] is None
    snap = c.snapshot()
    assert [f["flow_id"] for f in snap["flows"]] == [fid]
    assert snap["flows"][0]["path"] == ["a", "b"]


def test_fire_and_forget_not_retained():
    c = _graph()
    c.flow("a", "b", count=5)
    assert c.snapshot()["flows"] == []          # jednorázový se neukládá


def test_stop_flow_removes_and_queues_action():
    c = _graph()
    fid = c.flow("a", "b", count=None)
    c.drain_actions()                            # spotřebuj flow akci
    c.stop_flow(fid)
    (action,) = c.drain_actions()
    assert action == {"action": "stop_flow", "flow_id": fid}
    assert c.snapshot()["flows"] == []


def test_stop_flow_unknown_id_raises():
    c = _graph()
    with pytest.raises(ValueError):
        c.stop_flow("deadbeef")


def test_flow_explicit_color_and_size_passed_through():
    c = _graph()
    c.flow("a", "b", color="#112233", size=2.0, speed=1.5)
    (action,) = c.drain_actions()
    assert action["color"] == "#112233"
    assert action["size"] == 2.0
    assert action["speed"] == 1.5
    assert action["flow_type"] is None
    assert action["type_index"] is None


def test_init_message_carries_flow_types_and_flows():
    c = _graph()
    c.define_flow_type("dns", color="#ffd166")
    fid = c.flow("a", "b", count=None)
    with TestClient(create_app(c)) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(protocol.encode(
                {"type": "hello", "protocol": protocol.PROTOCOL_VERSION}))
            init = protocol.decode(ws.receive_text())
    assert init["type"] == "init"
    assert init["flow_types"]["dns"]["color"] == "#ffd166"
    assert [f["flow_id"] for f in init["flows"]] == [fid]
```

- [ ] **Step 2: Ověř selhání**

Run: `python -m pytest python/tests/test_flows.py -q`
Expected: FAIL — `AttributeError: 'Canvas' object has no attribute 'define_flow_type'`.

- [ ] **Step 3: Přidej registr typů toků a trvalých toků do `Canvas.__init__`**

V `python/viewbase/canvas.py`, v `__init__` (za řádkem `self._node_types: dict[str, dict[str, Any]] = {}`), přidej:

```python
        self._flow_types: dict[str, dict[str, Any]] = {}
        self._flows: dict[str, dict[str, Any]] = {}   # flow_id -> trvalý tok (do init)
```

A nahoře u importů (za `import threading`) přidej:

```python
import uuid
```

- [ ] **Step 4: Implementuj `define_flow_type`, `flow`, `stop_flow` a pomocné metody**

V `python/viewbase/canvas.py`, hned za metodu `define_type` (před `# ---- uzly ----`), přidej:

```python
    def define_flow_type(self, name: str, *, color: str | None = None,
                         size: float = 1.0, speed: float = 1.0) -> None:
        """Definuj typ toku (jako typ uzlu). Bez `color` dostane tok barvu
        z kategorické palety aktivního tématu (řeší klient podle indexu typu)."""
        with self._lock:
            self._flow_types[name] = {
                "color": color, "size": float(size), "speed": float(speed)}

    def _flow_type_index(self, name: str | None) -> int | None:
        """Index typu v pořadí registrace (pro výběr barvy z palety na klientu)."""
        if name is None:
            return None
        return list(self._flow_types).index(name)

    def _resolve_flow_path(self, source: str | None, target: str | None,
                           path: list[str] | None) -> list[str]:
        """Sestav a zvaliduj cestu toku: každá sousední dvojice musí být
        existující hrana, každý uzel musí existovat. Vrátí cestu (≥2 uzly)."""
        if path is not None:
            resolved = list(path)
        elif source is not None and target is not None:
            resolved = [source, target]
        else:
            raise ValueError(
                "flow vyžaduje buď (source, target), nebo path=[...]")
        if len(resolved) < 2:
            raise ValueError("flow path musí mít aspoň 2 uzly")
        for node_id in resolved:
            if node_id not in self._nodes:
                raise ValueError(f"flow: uzel '{node_id}' neexistuje")
        for a, b in zip(resolved, resolved[1:]):
            if _edge_key(a, b) not in self._edges:
                raise ValueError(
                    f"flow: hrana {a}–{b} neexistuje – tok jede jen po hranách")
        return resolved

    def flow(self, source: str | None = None, target: str | None = None, *,
             path: list[str] | None = None, type: str | None = None,
             count: int | None = 1, interval: float = 0.2, speed: float = 1.0,
             color: str | None = None, size: float | None = None) -> str | None:
        """Vyšli tok částic po hraně/cestě (source → target nebo path=[...]).

        `count=N` je jednorázový (fire-and-forget; server tok neudržuje, vrací
        None). `count=None` je trvalý: vrací `flow_id`, tok je v `init` a přežije
        reconnect; zastavíš ho `stop_flow(flow_id)`. `interval` je rozestup částic
        v sekundách, `speed` násobek výchozí rychlosti tématu."""
        with self._lock:
            if type is not None and type not in self._flow_types:
                raise ValueError(
                    f"Neznámý typ toku '{type}' – nejdřív define_flow_type")
            resolved = self._resolve_flow_path(source, target, path)
            payload = {
                "action": "flow",
                "path": resolved,
                "flow_type": type,
                "type_index": self._flow_type_index(type),
                "count": count,
                "interval": float(interval),
                "speed": float(speed),
                "color": color,
                "size": size,
            }
            if count is None:
                flow_id = uuid.uuid4().hex[:8]
                payload["flow_id"] = flow_id
                self._flows[flow_id] = {k: v for k, v in payload.items()
                                        if k != "action"}
                self._actions.append(payload)
                return flow_id
            self._actions.append(payload)
            return None

    def stop_flow(self, flow_id: str) -> None:
        """Zastav trvalý tok: odeber ho ze stavu a zařaď akci stop_flow."""
        with self._lock:
            if flow_id not in self._flows:
                raise ValueError(f"Trvalý tok '{flow_id}' neexistuje")
            del self._flows[flow_id]
            self._actions.append({"action": "stop_flow", "flow_id": flow_id})
```

- [ ] **Step 5: Doplň `snapshot()` o `flow_types` a `flows`**

V `python/viewbase/canvas.py`, v metodě `snapshot()`, do vraceného dictu (za řádek `"node_types": {...}`) přidej:

```python
                "flow_types": {n: dict(s) for n, s in self._flow_types.items()},
                "flows": [dict(f) for f in self._flows.values()],
```

- [ ] **Step 6: Rozšiř `init_message` v protocol.py**

V `python/viewbase/protocol.py` uprav `init_message`:

```python
def init_message(*, seq: int, config: dict, node_types: dict,
                 nodes: list, edges: list,
                 flow_types: dict, flows: list) -> dict[str, Any]:
    return {
        "type": "init",
        "protocol": PROTOCOL_VERSION,
        "seq": seq,
        "config": config,
        "node_types": node_types,
        "nodes": nodes,
        "edges": edges,
        "flow_types": flow_types,
        "flows": flows,
    }
```

Pozn.: server volá `protocol.init_message(**snap)` a `snapshot()` teď nese `flow_types` i `flows`, takže server.py nepotřebuje úpravu pro init. Akce `flow`/`stop_flow` jdou stávající cestou `_broadcast_step` (drain_actions → `{"type":"action", **action}`), server.py je beze změny — ověříme to v dalším kroku.

- [ ] **Step 7: Ověř, že testy projdou**

Run: `python -m pytest python/tests/test_flows.py -q`
Expected: PASS — všech 14 testů zelených.

- [ ] **Step 8: Ověř, že akce `flow`/`stop_flow` projde přes WS (regrese serveru)**

Doplň do `python/tests/test_flows.py` na konec:

```python
def test_flow_action_delivered_over_ws():
    c = _graph()
    with TestClient(create_app(c)) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(protocol.encode(
                {"type": "hello", "protocol": protocol.PROTOCOL_VERSION}))
            assert protocol.decode(ws.receive_text())["type"] == "init"
            c.flow("a", "b", count=3)
            msg = None
            for _ in range(5):
                msg = protocol.decode(ws.receive_text())
                if msg["type"] == "action":
                    break
            assert msg["action"] == "flow"
            assert msg["path"] == ["a", "b"]
```

Run: `python -m pytest python/tests/test_flows.py -q`
Expected: PASS — 15 testů.

- [ ] **Step 9: Celý pytest zelený (regrese)**

Run: `python -m pytest python/tests -q`
Expected: PASS — žádný fail/skip (existující `test_actions.py`, `test_server.py` atd. nesmí spadnout na nových klíčích initu).

- [ ] **Step 10: Commit**

```bash
git add python/viewbase/canvas.py python/viewbase/protocol.py python/tests/test_flows.py
git commit -m "feat: Python API toků (define_flow_type, flow, stop_flow) + protokol"
```

---

### Task 2 (T2): Klient — FlowController + čistá logika částic

**Files:**
- Create: `frontend/src/render/flow.js`
- Test: `frontend/tests/flow.test.js` (create)

Cíl: `FlowController` (životní cyklus + emise částic, čistá logika nad časem) a čisté funkce `interpolateAlongPath` + `resolveFlowColor`, vše jednotkově testovatelné. `FlowLayer` (render částic) přidá tento task jako kostru a dotáhne T3.

- [ ] **Step 1: Napiš failing vitest pro interpolaci a barvu**

Vytvoř `frontend/tests/flow.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  FlowController, interpolateAlongPath, resolveFlowColor,
} from '../src/render/flow.js';

function displayMap(entries) {
  const m = new Map();
  for (const [id, [x, y, z]] of entries) m.set(id, { x, y, z });
  return m;
}

describe('interpolateAlongPath', () => {
  const disp = displayMap([['a', [0, 0, 0]], ['b', [10, 0, 0]]]);

  it('t=0 je počátek, t=1 je konec', () => {
    expect(interpolateAlongPath(['a', 'b'], 0, disp)).toEqual({ x: 0, y: 0, z: 0 });
    expect(interpolateAlongPath(['a', 'b'], 1, disp)).toEqual({ x: 10, y: 0, z: 0 });
  });

  it('t=0.5 je střed hrany', () => {
    expect(interpolateAlongPath(['a', 'b'], 0.5, disp)).toEqual({ x: 5, y: 0, z: 0 });
  });

  it('multi-hop: výběr segmentu podle kumulativní délky', () => {
    // a-b délka 10, b-c délka 30, celkem 40; t=0.5 → 20 od začátku =
    // 10 (celé a-b) + 10 do b-c (třetina) → x = 10 + 10 = 20
    const d = displayMap([['a', [0, 0, 0]], ['b', [10, 0, 0]], ['c', [40, 0, 0]]]);
    const p = interpolateAlongPath(['a', 'b', 'c'], 0.5, d);
    expect(p.x).toBeCloseTo(20, 5);
  });

  it('chybějící koncová pozice → null (uzel ještě nemá pozici)', () => {
    expect(interpolateAlongPath(['a', 'x'], 0.5, disp)).toBeNull();
  });

  it('degenerovaná cesta (nulová délka) → počátek', () => {
    const d = displayMap([['a', [5, 5, 5]], ['b', [5, 5, 5]]]);
    expect(interpolateAlongPath(['a', 'b'], 0.7, d)).toEqual({ x: 5, y: 5, z: 5 });
  });
});

describe('resolveFlowColor', () => {
  const theme = { palette: ['#111111', '#222222', '#333333'], flow: { color: '#999999' } };

  it('explicitní per-flow barva má přednost', () => {
    expect(resolveFlowColor({ color: '#abcdef', type_index: 1 }, { color: '#000000' }, theme))
      .toBe('#abcdef');
  });

  it('barva typu (z define_flow_type) je druhá v pořadí', () => {
    expect(resolveFlowColor({ color: null, type_index: 1 }, { color: '#0f0f0f' }, theme))
      .toBe('#0f0f0f');
  });

  it('bez explicitní barvy → kategorická paleta podle indexu typu', () => {
    expect(resolveFlowColor({ color: null, type_index: 2 }, null, theme)).toBe('#333333');
  });

  it('index mimo rozsah se cyklí (modulo)', () => {
    expect(resolveFlowColor({ color: null, type_index: 4 }, null, theme)).toBe('#222222');
  });

  it('bez typu i barvy → default tématu', () => {
    expect(resolveFlowColor({ color: null, type_index: null }, null, theme)).toBe('#999999');
  });
});

describe('FlowController', () => {
  let t = 0;
  const now = () => t;
  const store = { flowTypes: { dns: { color: '#ffd166', size: 0.7, speed: 1.5 } } };

  function makeAction(extra = {}) {
    return {
      action: 'flow', path: ['a', 'b'], flow_type: null, type_index: null,
      count: 3, interval: 0.2, speed: 1.0, color: '#abcdef', size: null, ...extra,
    };
  }

  it('jednorázový tok vyemituje count částic po interval sekundách', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.applyFlow(makeAction({ count: 3, interval: 0.2 }));
    fc.update(0, null); expect(fc.particles().length).toBe(1);   // 1. částice hned
    t = 0.2; fc.update(0.2, null); expect(fc.particles().length).toBe(2);
    t = 0.4; fc.update(0.2, null); expect(fc.particles().length).toBe(3);
    t = 0.6; fc.update(0.2, null); expect(fc.particles().length).toBe(3); // už ne 4.
  });

  it('jednorázový tok se po doletu částic uklidí (activeCount → 0)', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    // krátká cesta + vysoká rychlost → částice doletí rychle
    fc.applyFlow(makeAction({ count: 1, interval: 0.2, speed: 1000 }));
    const theme = { flow: { baseSpeed: 1000 }, palette: [] };
    fc.update(0, theme);
    t = 5; fc.update(5, theme);          // dost času na dolet i úklid
    expect(fc.activeCount()).toBe(0);
    expect(fc.particles().length).toBe(0);
  });

  it('trvalý tok emituje dál a žije, dokud ho stopFlow nezastaví', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.applyFlow(makeAction({ count: null, interval: 0.2, flow_id: 'aa' }));
    t = 1.0; fc.update(1.0, null);
    expect(fc.activeCount()).toBe(1);
    fc.stopFlow('aa');
    expect(fc.activeCount()).toBe(0);
  });

  it('replayInit přehraje trvalé toky z init.flows', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.replayInit([makeAction({ count: null, flow_id: 'bb' })]);
    expect(fc.activeCount()).toBe(1);
  });

  it('replayInit nahradí předchozí trvalé toky (reconnect)', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.replayInit([makeAction({ count: null, flow_id: 'bb' })]);
    fc.replayInit([makeAction({ count: null, flow_id: 'cc' })]);
    expect(fc.activeCount()).toBe(1);   // jen 'cc'
  });
});
```

- [ ] **Step 2: Ověř selhání**

Run: `cd frontend && npx vitest run tests/flow.test.js`
Expected: FAIL — modul `../src/render/flow.js` neexistuje.

- [ ] **Step 3: Implementuj `render/flow.js` (controller + čisté funkce + kostra FlowLayer)**

Vytvoř `frontend/src/render/flow.js`:

```js
import * as THREE from 'three';

const PARTICLE_SEGMENTS = 8;        // detail koule glow částice (lacině)
const PARTICLE_BASE_RADIUS = 1;     // geometrie má r=1, velikost řídí scale

/** Lineárně interpoluj bod na cestě (≥2 uzly) v parametru t∈[0,1] podle
 *  KUMULATIVNÍ délky segmentů (delší hrana = pomalejší průchod v t).
 *  `display` je Map id → {x,y,z} (živé pozice z rendereru). Vrátí
 *  {x,y,z} nebo null, když nějaký koncový uzel ještě nemá pozici. */
export function interpolateAlongPath(path, t, display) {
  const pts = [];
  for (const id of path) {
    const p = display.get(id);
    if (!p) return null;
    pts.push(p);
  }
  const lengths = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const dz = pts[i + 1].z - pts[i].z;
    const len = Math.hypot(dx, dy, dz);
    lengths.push(len);
    total += len;
  }
  if (total === 0) return { x: pts[0].x, y: pts[0].y, z: pts[0].z };
  const clamped = Math.max(0, Math.min(1, t));
  let dist = clamped * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (dist <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] === 0 ? 0 : dist / lengths[i];
      const a = pts[i];
      const b = pts[i + 1];
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        z: a.z + (b.z - a.z) * f,
      };
    }
    dist -= lengths[i];
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, z: last.z };
}

/** Celková délka cesty ve světových jednotkách (0 když chybí pozice).
 *  Slouží k přepočtu rychlosti (jednotky/s) na rychlost v parametru t. */
export function pathLength(path, display) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = display.get(path[i]);
    const b = display.get(path[i + 1]);
    if (!a || !b) return 0;
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return total;
}

/** Výsledná barva toku (hex). Priorita: explicitní per-flow > barva typu >
 *  kategorická paleta podle indexu typu > default tématu. */
export function resolveFlowColor(flow, flowTypeStyle, theme) {
  if (flow.color) return flow.color;
  if (flowTypeStyle && flowTypeStyle.color) return flowTypeStyle.color;
  const palette = theme.palette ?? [];
  if (flow.type_index != null && palette.length > 0) {
    return palette[flow.type_index % palette.length];
  }
  return theme.flow.color;
}

/** Jeden aktivní tok: drží svůj parametr emise a žijící částice.
 *  Čistá logika nad časem (now v sekundách) – render řeší FlowLayer. */
class Flow {
  constructor(action, now) {
    this.path = action.path;
    this.flowType = action.flow_type ?? null;
    this.typeIndex = action.type_index ?? null;
    this.color = action.color ?? null;
    this.size = action.size ?? null;
    this.count = action.count;               // int | null (trvalý)
    this.interval = Math.max(0.001, action.interval ?? 0.2);
    this.speed = action.speed ?? 1.0;
    this.flowId = action.flow_id ?? null;
    this.emitted = 0;                         // počet vyemitovaných částic
    this.nextEmit = now;                      // čas příští emise
    this.particles = [];                      // [{ born }]
    this.done = false;                        // true = vše doletělo, lze uklidit
  }

  /** Vyemituj částice splatné do času `now`, zestárni a uklid doletělé.
   *  travelTime = délka cesty / (theme.flow.baseSpeed * speed). */
  step(now, travelTime) {
    while (this.nextEmit <= now
        && (this.count === null || this.emitted < this.count)) {
      this.particles.push({ born: this.nextEmit });
      this.emitted += 1;
      this.nextEmit += this.interval;
    }
    if (travelTime > 0) {
      this.particles = this.particles.filter((p) => now - p.born < travelTime);
    }
    if (this.count !== null && this.emitted >= this.count
        && this.particles.length === 0) {
      this.done = true;
    }
  }
}

/** Spravuje aktivní toky: aplikuje akce, přehrává init.flows, eviduje čas.
 *  `now` je injektovatelný (testy); ve hře renderer předává akumulovaný čas. */
export class FlowController {
  constructor(store, { now = () => performance.now() / 1000 } = {}) {
    this.store = store;
    this.now = now;
    this.flows = [];               // jednorázové + trvalé dohromady
    this.persistent = new Map();   // flow_id -> Flow (pro stopFlow / replay)
  }

  applyFlow(action) {
    const flow = new Flow(action, this.now());
    this.flows.push(flow);
    if (flow.flowId !== null) this.persistent.set(flow.flowId, flow);
  }

  stopFlow(flowId) {
    const flow = this.persistent.get(flowId);
    if (!flow) return;
    this.persistent.delete(flowId);
    this.flows = this.flows.filter((f) => f !== flow);
  }

  replayInit(flowsArray) {
    // reconnect: zahoď staré trvalé toky, nahraď je tím, co nese init
    this.flows = this.flows.filter((f) => f.flowId === null);
    this.persistent.clear();
    for (const action of flowsArray) this.applyFlow(action);
  }

  activeCount() {
    return this.flows.length;
  }

  /** Posuň simulaci o dt, splatné částice vyemituj, doletělé jednorázové
   *  toky uklid. `theme` může být null (testy bez doletu) – pak travelTime=0
   *  a částice nestárnou (drží se kvůli kontrole emise). */
  update(dt, theme) {
    const now = this.now();
    const baseSpeed = theme?.flow?.baseSpeed ?? 0;
    const display = this._display;
    for (const flow of this.flows) {
      let travelTime = 0;
      if (baseSpeed > 0 && display) {
        const len = pathLength(flow.path, display);
        const v = baseSpeed * flow.speed;
        travelTime = (len > 0 && v > 0) ? len / v : 0;
      }
      flow.step(now, travelTime);
    }
    this.flows = this.flows.filter((f) => !(f.flowId === null && f.done));
  }

  /** Nastav živou mapu pozic (renderer ji předá před update). */
  setDisplay(display) {
    this._display = display;
  }

  /** Body všech žijících částic + jejich barvy (pro FlowLayer / E2E). */
  particles() {
    const display = this._display;
    const theme = this._theme;
    const out = [];
    if (!display || !theme) {
      // čistě logický režim (testy bez tématu): vrať jen počet jako placeholdery
      for (const flow of this.flows) {
        for (const p of flow.particles) out.push({ x: 0, y: 0, z: 0, color: '#ffffff' });
      }
      return out;
    }
    const now = this.now();
    for (const flow of this.flows) {
      const len = pathLength(flow.path, display);
      const v = (theme.flow.baseSpeed ?? 0) * flow.speed;
      const travelTime = (len > 0 && v > 0) ? len / v : 0;
      const style = this.store.flowTypes?.[flow.flowType] ?? null;
      const color = resolveFlowColor(flow, style, theme);
      const size = flow.size ?? style?.size ?? theme.flow.size;
      for (const p of flow.particles) {
        const t = travelTime > 0 ? (now - p.born) / travelTime : 0;
        const pos = interpolateAlongPath(flow.path, t, display);
        if (pos) out.push({ x: pos.x, y: pos.y, z: pos.z, color, size });
      }
    }
    return out;
  }

  /** Renderer před particles() předá živé pozice i téma. */
  prepare(display, theme) {
    this._display = display;
    this._theme = theme;
  }
}

/** Vykreslovací vrstva: InstancedMesh glow částic s aditivním blendingem.
 *  Per-frame přepočte pozice z FlowController.particles() a barvy per-instance. */
export class FlowLayer {
  constructor(scene, store, controller) {
    this.scene = scene;
    this.store = store;
    this.controller = controller;
    this.theme = null;
    this.capacity = 0;
    this.mesh = null;
    this._matrix = new THREE.Matrix4();
    this._color = new THREE.Color();
    this._ensureCapacity(1024);
  }

  _ensureCapacity(count) {
    if (this.mesh && count <= this.capacity) return;
    const capacity = Math.max(1024, 2 ** Math.ceil(Math.log2(Math.max(1, count))));
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh.dispose();
    }
    const geometry = new THREE.SphereGeometry(
      PARTICLE_BASE_RADIUS, PARTICLE_SEGMENTS, PARTICLE_SEGMENTS);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.theme?.flow.opacity ?? 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.capacity = capacity;
  }

  applyTheme(theme) {
    this.theme = theme;
    if (this.mesh) this.mesh.material.opacity = theme.flow.opacity;
  }

  /** Per-frame: posuň controller a vykresli částice na živé pozice. */
  update(dt, theme, display) {
    this.theme = theme;
    this.controller.prepare(display, theme);
    this.controller.update(dt, theme);
    const parts = this.controller.particles();
    this._ensureCapacity(parts.length);
    const mesh = this.mesh;
    for (let i = 0; i < parts.length; i += 1) {
      const p = parts[i];
      const s = p.size ?? theme.flow.size;
      this._matrix.makeScale(s, s, s);
      this._matrix.setPosition(p.x, p.y, p.z);
      mesh.setMatrixAt(i, this._matrix);
      this._color.set(p.color);
      mesh.setColorAt(i, this._color);
    }
    mesh.count = parts.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /** Počet vykreslených částic (E2E / kontrola). */
  particleCount() {
    return this.mesh ? this.mesh.count : 0;
  }

  dispose() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
    this.mesh = null;
  }
}
```

- [ ] **Step 4: Ověř, že testy projdou**

Run: `cd frontend && npx vitest run tests/flow.test.js`
Expected: PASS — všechny describe bloky zelené.

Pozn. k testu „jednorázový tok se po doletu uklidí": v něm `particles()` voláme s tématem `null` jen u jiných testů; tento konkrétní test předává téma do `update`, ale `particles()` v něm nevoláme s pozicemi — `activeCount()` čte `this.flows`, který `update` pročistí. `update` počítá `travelTime` jen když je `this._display` nastaven; v testu display není, takže `travelTime=0` → částice nestárnou. **Oprava testu:** uprav v `flow.test.js` test „jednorázový tok se po doletu" tak, aby controlleru nastavil display:

```js
  it('jednorázový tok se po doletu částic uklidí (activeCount → 0)', () => {
    t = 0;
    const fc = new FlowController(store, { now });
    fc.setDisplay(displayMap([['a', [0, 0, 0]], ['b', [10, 0, 0]]]));
    fc.applyFlow(makeAction({ count: 1, interval: 0.2, speed: 1.0 }));
    const theme = { flow: { baseSpeed: 1000 }, palette: [] };
    fc.update(0, theme);
    t = 5; fc.update(5, theme);          // 10 jednotek / 1000 = 0.01 s dolet
    expect(fc.activeCount()).toBe(0);
  });
```

Po úpravě znovu:

Run: `cd frontend && npx vitest run tests/flow.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/render/flow.js frontend/tests/flow.test.js
git commit -m "feat: FlowController + FlowLayer + čistá logika částic toků (vitest)"
```

---

### Task 3 (T3): Renderer integrace + theme.flow + drátování klienta

**Files:**
- Modify: `frontend/src/themes/themes.js`
- Modify: `frontend/src/render/renderer.js`
- Modify: `frontend/src/main.js`
- Modify: `frontend/src/core/store.js`

Cíl: blok `theme.flow` v obou tématech; renderer staví `FlowLayer`+`FlowController`, propaguje téma, updatuje vrstvu v `_frame` s `dt` a živou mapou; `main.js` routuje akce `flow`/`stop_flow` a přehrává `init.flows`; store drží `flowTypes`/`flows` z initu; částice se renderují přes bloom na cyber.

- [ ] **Step 1: Přidej `flow` blok do témat**

V `frontend/src/themes/themes.js`, do objektu `modern` (za řádek `bloom: {...},`) přidej:

```js
  flow: { size: 2.4, baseSpeed: 220, color: '#2f7fe8', opacity: 0.85 },
```

Do objektu `cyber` (za jeho `bloom: {...},`) přidej:

```js
  flow: { size: 3.0, baseSpeed: 260, color: '#28d7fe', opacity: 1.0 },
```

(cyber má větší a jasnější částice — projdou silněji bloomem.)

- [ ] **Step 2: Rozšiř store o flowTypes a flows z initu**

V `frontend/src/core/store.js`, v konstruktoru (za `this.nodeTypes = {};`) přidej:

```js
    this.flowTypes = {};
    this.flows = [];
```

V `applyInit(msg)` (za `this.nodeTypes = msg.node_types;`) přidej:

```js
    this.flowTypes = msg.flow_types ?? {};
    this.flows = msg.flows ?? [];
```

- [ ] **Step 3: Renderer staví a updatuje FlowLayer**

V `frontend/src/render/renderer.js` přidej import (za `import { LabelLayer } from './labels.js';`):

```js
import { FlowController, FlowLayer } from './flow.js';
```

V konstruktoru, hned za `this.labels = new LabelLayer(this.scene, store, engine);` (před `this.applyTheme(this.theme);`) přidej:

```js
    this.flowController = new FlowController(store, {});
    this.flows = new FlowLayer(this.scene, store, this.flowController);
```

V metodě `applyTheme(theme)`, za řádek `this.labels.applyTheme(theme);` přidej:

```js
    this.flows.applyTheme(theme);
```

V metodě `_frame()`, za řádek `this.labels.update(dt, this.camera, this.highlightSet, this.display);` přidej:

```js
    this.flows.update(dt, this.theme, this.display);
```

- [ ] **Step 4: main.js — routování akcí a přehrání init.flows**

V `frontend/src/main.js`, do objektu `actions` (za řádek `highlight: (msg) => ...`) přidej:

```js
    flow: (msg) => renderer.flowController.applyFlow(msg),
    stop_flow: (msg) => renderer.flowController.stopFlow(msg.flow_id),
```

Do subscriberu `store.subscribe((event) => { if (event.kind !== 'init') ...})` (ten, co volá `applyTheme(store.config.theme)`), na začátek těla (hned za `if (event.kind !== 'init') return;`) přidej:

```js
    renderer.flowController.replayInit(store.flows ?? []);
```

A do `window.__viewbase` (poslední řádek `bootstrap`) přidej `flowController` a `flowLayer`:

```js
  window.__viewbase = {
    store, engine, renderer, connection, watchdog,
    flowController: renderer.flowController, flowLayer: renderer.flows,
  };
```

- [ ] **Step 5: Ověř, že existující vitest a build prochází (NUL-check vrstvy)**

Run: `cd frontend && npx vitest run`
Expected: PASS — všech 12 testovacích souborů (11 původních + `flow.test.js`), žádný fail.

Run: `cd frontend && npm run build`
Expected: build projde bez chyb (Vite vypíše velikost bundlu).

- [ ] **Step 6: Manuální vizuální kontrola (checklist)**

Tento krok je manuální (rendering se jednotkově netestuje). Vytvoř dočasný server (smaž po kontrole) `/tmp/flow_demo.py`:

```python
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="Flow demo", theme="cyber")
canvas.define_flow_type("dns", color="#ffd166", speed=1.2)
canvas.define_flow_type("http")          # bez barvy → paleta (index 1)
canvas.add_node("client")
canvas.add_node("srv")
canvas.add_node("db")
canvas.add_edge("client", "srv")
canvas.add_edge("srv", "db")

# trvalý tok na pozadí
canvas.flow("client", "srv", type="http", count=None, interval=0.4)


def burst():
    while True:
        time.sleep(2.0)
        canvas.flow(path=["client", "srv", "db"], type="dns", count=4, interval=0.15)


threading.Thread(target=burst, daemon=True).start()
vb.serve(canvas, port=8090, open_browser=True)
```

Spusť: `python /tmp/flow_demo.py` a v prohlížeči ověř checklist:
- [ ] Po `client–srv` neustále plynou žluté/paletové glow částice (trvalý http tok).
- [ ] Každé ~2 s vyletí dávka 4 žlutých částic po cestě `client → srv → db` (multi-hop, plynule přes prostřední uzel).
- [ ] Částice mají aditivní glow a na tmavém pozadí svítí přes bloom.
- [ ] Když chytneš uzel myší a táhneš (uzel se hýbe), částice ho „následují" (jedou po hraně mezi aktuálními pozicemi).
- [ ] Po obnovení stránky (F5 = reconnect) se trvalý tok znovu objeví (z `init.flows`).

Po kontrole: `rm /tmp/flow_demo.py`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/themes/themes.js frontend/src/render/renderer.js frontend/src/main.js frontend/src/core/store.js
git commit -m "feat: renderer integruje FlowLayer, theme.flow, akce flow/stop_flow"
```

---

### Task 4 (T4): Showcase tok (klik → tok, trvalý tok na pozadí)

**Files:**
- Modify: `examples/showcase.py`

Cíl: rozšíř stávající showcase o `define_flow_type`, trvalý tok na pozadí a fire-and-forget tok při kliku na uzel (`on_click` vyšle tok po hraně k DB). Boot-check, že nastartuje.

Rozhodnutí: **rozšiřujeme `examples/showcase.py`** (ne nový soubor) — showcase už má graf server–db–client s hranami, je to nejmenší DRY krok a ukáže toky v kontextu existující estetiky.

- [ ] **Step 1: Rozšiř `examples/showcase.py`**

Otevři `examples/showcase.py` a uprav ho na:

```python
"""Showcase estetiky a toků: téma cyber, typy uzlů s tvary a barvami,
živé update_node color, highlight_neighbors=2, typy toků a:
 - trvalý tok na pozadí (klient → server),
 - fire-and-forget tok při kliku na uzel (uzel → DB)."""
import random
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="Showcase", theme="cyber", highlight_neighbors=2)
canvas.define_type("server", shape="box", color="#28d7fe", size=1.4)
canvas.define_type("db", shape="octahedron", color="#ff2a6d", size=1.6)
canvas.define_type("client", shape="sphere", color="#05ffa1", size=0.9)

canvas.define_flow_type("query", color="#ffd166", speed=1.3)   # klik → DB
canvas.define_flow_type("heartbeat")                            # bez barvy → paleta

with canvas.batch():
    for i in range(3):
        canvas.add_node(f"srv-{i}", type="server", label="{name}",
                        name=f"Server {i}", os="Debian")
    canvas.add_node("db-0", type="db", label="{name}", name="Hlavní DB")
    for i in range(12):
        canvas.add_node(f"cl-{i}", type="client", label="{name}",
                        name=f"Klient {i}", status="idle")
        canvas.add_edge(f"cl-{i}", f"srv-{i % 3}")
    for i in range(3):
        canvas.add_edge(f"srv-{i}", "db-0")

# trvalé toky na pozadí: každý server tepe heartbeaty do DB
for i in range(3):
    canvas.flow(f"srv-{i}", "db-0", type="heartbeat", count=None, interval=0.8)


@canvas.on_click
def on_click(event):
    """Klik na klienta → tok dotazu přes jeho server do DB (multi-hop)."""
    node_id = event.node_id
    if node_id.startswith("cl-"):
        idx = int(node_id.split("-")[1])
        canvas.flow(path=[node_id, f"srv-{idx % 3}", "db-0"],
                    type="query", count=4, interval=0.15)


def provoz():
    """Náhodný klient se rozsvítí dožluta a zase zhasne – živá data."""
    while True:
        time.sleep(2.0)
        cl = f"cl-{random.randrange(12)}"
        canvas.update_node(cl, color="#ffd166", status="busy")
        time.sleep(1.0)
        canvas.update_node(cl, color="#05ffa1", status="idle")


threading.Thread(target=provoz, daemon=True).start()
vb.serve(canvas, port=8080, open_browser=True)
```

- [ ] **Step 2: Boot-check (nastartuje a nespadne)**

Run:

```bash
timeout 4 python examples/showcase.py || true
```

Expected: server nastartuje (uvicorn warning log o naslouchání na `127.0.0.1:8080`), žádný traceback z importu/definice toků; po 4 s `timeout` proces ukončí (návratový kód 124 nebo 0 — `|| true` to spolkne). Pokud se objeví traceback z `flow(...)` (např. neexistující hrana), oprav.

- [ ] **Step 3: Manuální kontrola (volitelná, doporučená)**

Spusť `python examples/showcase.py`, v prohlížeči: serverové uzly tepou částice do DB (heartbeat), klik na klienta vyšle dávku žlutých částic po cestě klient → server → DB. Ukonči Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add examples/showcase.py
git commit -m "feat: showcase toků (klik → tok do DB, trvalé heartbeaty)"
```

---

### Task 5 (T5): Wireshark příklad (FLAGSHIP) + README

**Files:**
- Create: `examples/wireshark/pcap_replay.py`
- Create: `examples/wireshark/live_capture.py`
- Create: `examples/wireshark/make_sample_pcap.py`
- Create: `examples/wireshark/README.md`

Cíl: vlajková ukázka — pcap (scapy) → graf (uzly = IP, hrany = komunikující páry, toky = pakety podle protokolu); README how-to s generátorem vzorového pcapu, aby šlo spustit bez externí captury. `live_capture.py` totéž nad živým rozhraním (vyžaduje oprávnění). Junior-readable Python.

- [ ] **Step 1: Vytvoř generátor vzorového pcapu**

Vytvoř `examples/wireshark/make_sample_pcap.py`:

```python
"""Vygeneruje malý vzorový pcap (pár TCP/UDP/DNS/ICMP paketů), aby šel
pcap_replay.py spustit bez externí captury. Vyžaduje scapy.

Spuštění:
    pip install scapy
    python examples/wireshark/make_sample_pcap.py sample.pcap
"""
import sys

from scapy.all import DNS, DNSQR, ICMP, IP, TCP, UDP, wrpcap

CLIENT = "10.0.0.10"
SERVER = "10.0.0.20"
DNS_SRV = "10.0.0.53"


def build_packets():
    packets = []
    # HTTP přes TCP (port 80) – klient ↔ server, pár výměn
    for _ in range(6):
        packets.append(IP(src=CLIENT, dst=SERVER) / TCP(sport=44000, dport=80))
        packets.append(IP(src=SERVER, dst=CLIENT) / TCP(sport=80, dport=44000))
    # DNS dotazy (UDP port 53)
    for _ in range(3):
        packets.append(
            IP(src=CLIENT, dst=DNS_SRV)
            / UDP(sport=33000, dport=53)
            / DNS(rd=1, qd=DNSQR(qname="example.com")))
    # obyčejné UDP
    for _ in range(2):
        packets.append(IP(src=CLIENT, dst=SERVER) / UDP(sport=40000, dport=9999))
    # ICMP ping
    for _ in range(2):
        packets.append(IP(src=CLIENT, dst=SERVER) / ICMP())
    return packets


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "sample.pcap"
    wrpcap(out, build_packets())
    print(f"Zapsáno {out}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Vytvoř pcap_replay.py**

Vytvoř `examples/wireshark/pcap_replay.py`:

```python
"""Přehraj pcap jako živý graf toků.

Uzly = IP adresy, hrany = komunikující páry, toky = pakety obarvené podle
protokolu (typy toků). Přehrávání jde v časové ose paketu s volitelným
zrychlením.

Spuštění:
    pip install scapy
    python examples/wireshark/make_sample_pcap.py sample.pcap   # vzorek
    python examples/wireshark/pcap_replay.py sample.pcap --speed 4
"""
import argparse
import threading
import time

from scapy.all import DNS, ICMP, IP, TCP, UDP, rdpcap

import viewbase as vb

# Barvy protokolů = typy toků. Bez barvy by tok vzal kategorickou paletu;
# tady barvy volíme explicitně, ať je legenda čitelná.
PROTO_COLORS = {
    "tcp": "#28d7fe",
    "http": "#05ffa1",
    "udp": "#b967ff",
    "dns": "#ffd166",
    "icmp": "#ff2a6d",
    "other": "#5b6472",
}


def classify(pkt) -> str:
    """Zařaď paket do typu toku podle protokolu (junior-readable)."""
    if not pkt.haslayer(IP):
        return "other"
    if pkt.haslayer(DNS):
        return "dns"
    if pkt.haslayer(TCP):
        tcp = pkt[TCP]
        if tcp.dport == 80 or tcp.sport == 80:
            return "http"
        return "tcp"
    if pkt.haslayer(UDP):
        return "udp"
    if pkt.haslayer(ICMP):
        return "icmp"
    return "other"


def build_canvas() -> vb.Canvas:
    canvas = vb.Canvas(title="Wireshark replay", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    return canvas


def replay(canvas: vb.Canvas, packets, speed: float) -> None:
    """Postupně přidává uzly/hrany a vysílá tok za každý IP paket.
    Čeká podle časových razítek paketů, vydělených `speed`."""
    nodes: set[str] = set()
    edges: set[tuple[str, str]] = set()
    prev_ts = None
    for pkt in packets:
        if not pkt.haslayer(IP):
            continue
        src = pkt[IP].src
        dst = pkt[IP].dst
        if src == dst:
            continue

        # časování: rozestup mezi pakety podle pcap razítek / speed
        ts = float(pkt.time)
        if prev_ts is not None:
            delay = max(0.0, (ts - prev_ts) / speed)
            time.sleep(min(delay, 2.0))   # strop, ať dlouhé pauzy nezamrznou
        prev_ts = ts

        with canvas.batch():
            for node_id in (src, dst):
                if node_id not in nodes:
                    nodes.add(node_id)
                    canvas.add_node(node_id, label="{ip}", ip=node_id)
            edge = (src, dst) if src <= dst else (dst, src)
            if edge not in edges:
                edges.add(edge)
                canvas.add_edge(src, dst)

        # tok = jeden paket obarvený podle protokolu (fire-and-forget)
        canvas.flow(src, dst, type=classify(pkt), count=1, interval=0.05)


def main() -> None:
    parser = argparse.ArgumentParser(description="Přehrání pcap jako graf toků")
    parser.add_argument("pcap", help="cesta k .pcap souboru")
    parser.add_argument("--speed", type=float, default=1.0,
                        help="násobek rychlosti přehrávání (default 1.0)")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    packets = rdpcap(args.pcap)
    canvas = build_canvas()

    threading.Thread(
        target=replay, args=(canvas, packets, args.speed), daemon=True).start()
    vb.serve(canvas, port=args.port, open_browser=True)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Vytvoř live_capture.py**

Vytvoř `examples/wireshark/live_capture.py`:

```python
"""Živé zachytávání paketů jako rostoucí graf toků.

Uzly = IP adresy, hrany = komunikující páry, tok = každý paket obarvený podle
protokolu. Vyžaduje oprávnění k rozhraní (typicky root / sudo).

Spuštění (Linux/macOS):
    pip install scapy
    sudo python examples/wireshark/live_capture.py --iface en0

Pozn.: sniff() volá callback v jiném vlákně než serveru – Canvas je
thread-safe, takže to je v pořádku.
"""
import argparse
import threading

from scapy.all import IP, sniff

import viewbase as vb

# Re-use klasifikace z pcap_replay (DRY): stejné typy toků i barvy.
from pcap_replay import PROTO_COLORS, classify


def build_canvas() -> vb.Canvas:
    canvas = vb.Canvas(title="Wireshark live", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    return canvas


def make_handler(canvas: vb.Canvas):
    nodes: set[str] = set()
    edges: set[tuple[str, str]] = set()

    def on_packet(pkt) -> None:
        if not pkt.haslayer(IP):
            return
        src = pkt[IP].src
        dst = pkt[IP].dst
        if src == dst:
            return
        with canvas.batch():
            for node_id in (src, dst):
                if node_id not in nodes:
                    nodes.add(node_id)
                    canvas.add_node(node_id, label="{ip}", ip=node_id)
            edge = (src, dst) if src <= dst else (dst, src)
            if edge not in edges:
                edges.add(edge)
                canvas.add_edge(src, dst)
        canvas.flow(src, dst, type=classify(pkt), count=1, interval=0.05)

    return on_packet


def main() -> None:
    parser = argparse.ArgumentParser(description="Živé zachytávání → graf toků")
    parser.add_argument("--iface", default=None,
                        help="síťové rozhraní (např. en0, eth0); default = výchozí")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    canvas = build_canvas()
    handler = make_handler(canvas)
    threading.Thread(
        target=lambda: sniff(iface=args.iface, prn=handler, store=False),
        daemon=True).start()
    vb.serve(canvas, port=args.port, open_browser=True)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Vytvoř README how-to**

Vytvoř `examples/wireshark/README.md`:

```markdown
# Wireshark ukázka — vizualizace síťového provozu

Vlajková ukázka viewbase: síťový provoz jako živý 3D graf. Uzly jsou IP
adresy, hrany komunikující páry a **toky** jsou jednotlivé pakety obarvené
podle protokolu (TCP, HTTP, UDP, DNS, ICMP).

## Instalace

```bash
pip install -e "python[dev]"   # viewbase (z kořene repa)
pip install scapy              # parsování paketů
```

## Rychlý start bez vlastní captury

Vygeneruj malý vzorový pcap (pár TCP/HTTP/UDP/DNS/ICMP paketů) a přehraj ho:

```bash
python examples/wireshark/make_sample_pcap.py sample.pcap
python examples/wireshark/pcap_replay.py sample.pcap --speed 4
```

Otevře se prohlížeč. Uvidíš, jak postupně přibývají uzly (IP adresy) a hrany
a jak po hranách letí barevné glow částice — každá je jeden paket. Barva =
protokol (žlutá DNS, zelená HTTP, modrá TCP, fialová UDP, červená ICMP).

`--speed N` zrychlí přehrávání N×; `--port` změní port (default 8080).

## Vlastní pcap

Máš-li vlastní záznam (z Wiresharku „Save as… → .pcap", nebo
`tcpdump -w moje.pcap`), přehraj ho stejně:

```bash
python examples/wireshark/pcap_replay.py moje.pcap --speed 8
```

## Živé zachytávání

Sleduj provoz v reálném čase (graf roste, jak data tečou). Vyžaduje
oprávnění k rozhraní — typicky `sudo`:

```bash
sudo python examples/wireshark/live_capture.py --iface en0
```

`--iface` vyber podle systému (`en0` na macOS, `eth0`/`wlan0` na Linuxu;
bez `--iface` se použije výchozí rozhraní scapy). Ctrl-C ukončí.

## Co se děje uvnitř

- `make_sample_pcap.py` — `scapy.wrpcap` zapíše pár ručně sestavených paketů.
- `pcap_replay.py` — `rdpcap` načte pakety, `classify()` určí protokol →
  typ toku, `canvas.flow(src, dst, type=…, count=1)` vyšle jednu částici za
  paket; časování drží rozestupy podle pcap razítek (dělené `--speed`).
- `live_capture.py` — `scapy.sniff(prn=…)` volá handler za každý paket;
  uzly/hrany se přidávají líně, tok se vyšle hned.

Pakety bez IP vrstvy (ARP apod.) se přeskakují.
```

- [ ] **Step 5: Boot-check pcap_replay proti vygenerovanému vzorku (pokud je scapy)**

Run:

```bash
python -c "import scapy" 2>/dev/null && {
  python examples/wireshark/make_sample_pcap.py /tmp/vb-sample.pcap
  timeout 4 python examples/wireshark/pcap_replay.py /tmp/vb-sample.pcap --speed 50 || true
} || echo "scapy není nainstalovaná – přeskočeno (viz README pro ruční postup)"
```

Expected (pokud je scapy):
- `make_sample_pcap.py` vypíše `Zapsáno /tmp/vb-sample.pcap`;
- `pcap_replay.py` nastartuje server (uvicorn naslouchá na 8080), žádný traceback z `rdpcap`/`classify`/`flow`; po 4 s `timeout` proces ukončí.

Expected (bez scapy): vypíše hlášku o přeskočení. V tom případě nainstaluj scapy (`pip install scapy`) a spusť ručně dle README — boot-check je podmínkou dokončení tasku.

- [ ] **Step 6: Ověř re-use importu v live_capture (statická kontrola)**

Run:

```bash
python -c "import scapy" 2>/dev/null && python -c "import sys; sys.path.insert(0, 'examples/wireshark'); import live_capture; print('live_capture OK', sorted(live_capture.PROTO_COLORS))" || echo "scapy není – přeskočeno"
```

Expected (se scapy): `live_capture OK ['dns', 'http', 'icmp', 'other', 'tcp', 'udp']` (potvrzuje, že `from pcap_replay import ...` funguje při běhu ze složky příkladu).

- [ ] **Step 7: Commit**

```bash
git add examples/wireshark/
git commit -m "feat: wireshark ukázka (pcap_replay, live_capture, sample generátor, README)"
```

---

### Task 6 (T6): E2E ověření toků (Playwright)

**Files:**
- Create: `/tmp/vb-3-verify/flows.mjs` (driver, mimo repo — necommituje se)
- Create: `/tmp/vb-3-verify/flow_server.py` (testovací server, mimo repo)

Cíl: headless ověření, že částice vznikají, pohybují se mezi snímky, trvalý tok přežije reconnect (je v `init`), `stop_flow` je odebere a fire-and-forget tok doletí a zmizí; screenshot částic na cyber (bloom). Reuse infrastruktury z `/tmp/vb-2b-verify` (TCP probe přes `node:net`, `.venv/bin/python`, `window.__viewbase`).

- [ ] **Step 1: Připrav adresář a symlink node_modules**

Run:

```bash
mkdir -p /tmp/vb-3-verify /tmp/vb-verify-3
ln -sfn /tmp/vb-verify/node_modules /tmp/vb-3-verify/node_modules
```

Expected: bez výpisu (adresáře a symlink vzniknou). `/tmp/vb-verify/node_modules` obsahuje Playwright (jako u 2b).

- [ ] **Step 2: Vytvoř testovací server**

Vytvoř `/tmp/vb-3-verify/flow_server.py`:

```python
"""E2E server pro toky: jeden trvalý tok (přežije reconnect) + endpointy
ovládané z testu přes thread, který reaguje na soubory-příznaky."""
import os
import threading
import time

import viewbase as vb

FLAG_DIR = "/tmp/vb-3-verify"
canvas = vb.Canvas(title="Flow E2E", theme="cyber", highlight_neighbors=1)
canvas.define_flow_type("a", color="#ffd166", speed=0.4)
canvas.define_flow_type("b")            # bez barvy → paleta

with canvas.batch():
    canvas.add_node("n1")
    canvas.add_node("n2")
    canvas.add_node("n3")
    canvas.add_edge("n1", "n2")
    canvas.add_edge("n2", "n3")

# trvalý tok na pozadí (musí být v init → přežít reconnect)
persistent_id = canvas.flow("n1", "n2", type="a", count=None, interval=0.3)
with open(os.path.join(FLAG_DIR, "persistent_id.txt"), "w") as fh:
    fh.write(persistent_id)


def control():
    """Reaguje na soubory-příznaky z testu: 'fire' → jednorázový tok,
    'stop' → zastav trvalý tok."""
    fired = stopped = False
    while True:
        time.sleep(0.1)
        fire = os.path.join(FLAG_DIR, "fire.flag")
        stop = os.path.join(FLAG_DIR, "stop.flag")
        if not fired and os.path.exists(fire):
            fired = True
            canvas.flow(path=["n1", "n2", "n3"], type="a", count=3, interval=0.1)
        if not stopped and os.path.exists(stop):
            stopped = True
            canvas.stop_flow(persistent_id)


threading.Thread(target=control, daemon=True).start()
vb.serve(canvas, port=8080, open_browser=False)
```

- [ ] **Step 3: Vytvoř Playwright driver**

Vytvoř `/tmp/vb-3-verify/flows.mjs`:

```js
// E2E ověření toků (Plán 3): částice vznikají a pohybují se, trvalý tok
// přežije reconnect (init.flows), stop_flow je odebere, fire-and-forget
// doletí a zmizí; screenshot částic na cyber (bloom).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const REPO = process.env.VB_REPO ?? '/Users/j/Projects/viewBase';
const PY = `${REPO}/.venv/bin/python`;
const OUT = '/tmp/vb-3-verify';
const SHOTS = '/tmp/vb-verify-3';
const HOST = '127.0.0.1';
const PORT = 8080;
const URL = `http://${HOST}:${PORT}/`;

fs.mkdirSync(SHOTS, { recursive: true });
for (const f of ['fire.flag', 'stop.flag', 'server.log']) {
  try { fs.rmSync(`${OUT}/${f}`); } catch { /* nevadí */ }
}
fs.writeFileSync(`${OUT}/server.log`, '');

const summary = { pageErrors: [], consoleErrors: [], checks: {} };

function startServer(script) {
  const proc = spawn(PY, ['-u', script],
    { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (d) => fs.appendFileSync(`${OUT}/server.log`, d));
  proc.stderr.on('data', (d) => fs.appendFileSync(`${OUT}/server.log`, d));
  return proc;
}

// TCP probe přes node:net – fetch/undici na node 25 hází uncaught EINVAL.
function probe() {
  return new Promise((resolve) => {
    const sock = net.connect({ port: PORT, host: HOST });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
  });
}

async function waitForServer(tries = 50) {
  for (let i = 0; i < tries; i += 1) {
    if (await probe()) return true;
    await sleep(200);
  }
  return false;
}

const server = startServer(`${OUT}/flow_server.py`);
if (!(await waitForServer())) {
  console.log('FATAL: server nenastartoval, viz /tmp/vb-3-verify/server.log');
  process.exit(1);
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist',
    '--enable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => summary.pageErrors.push(String(e).slice(0, 300)));
page.on('console', (m) => {
  if (m.type() === 'error') summary.consoleErrors.push(m.text().slice(0, 300));
});

await page.goto(URL);
await sleep(4000);   // init + usazení fyziky + náběh trvalého toku

// --- 1. trvalý tok běží: FlowController aktivní, částice se vykreslují ---
summary.checks.running = await page.evaluate(() => {
  const { flowController, flowLayer } = window.__viewbase;
  return {
    activeCount: flowController.activeCount(),
    particleCount: flowLayer.particleCount(),
  };
});

// --- 2. částice se hýbou mezi snímky (vzorek pozice 1. částice 2×) ---
async function firstParticlePos() {
  return page.evaluate(() => {
    const { flowController } = window.__viewbase;
    const parts = flowController.particles();
    return parts.length > 0 ? { x: parts[0].x, y: parts[0].y, z: parts[0].z } : null;
  });
}
const posA = await firstParticlePos();
await sleep(250);
const posB = await firstParticlePos();
summary.checks.moves = (posA && posB)
  ? (Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y)
     + Math.abs(posA.z - posB.z)) > 0.001
  : false;

// --- 3. screenshot částic na cyber (bloom) ---
await page.screenshot({ path: `${SHOTS}/1-flowing-cyber.png` });

// --- 4. trvalý tok přežije reconnect: znovu načti stránku → init.flows ---
await page.reload();
await sleep(3000);
summary.checks.survivesReconnect = await page.evaluate(() => {
  const { flowController, store } = window.__viewbase;
  return {
    inInit: (store.flows ?? []).length,
    active: flowController.activeCount(),
  };
});

// --- 5. fire-and-forget tok: vyšli, ověř nárůst částic, pak úklid ---
fs.writeFileSync(`${OUT}/fire.flag`, '1');
await sleep(500);
const duringBurst = await page.evaluate(
  () => window.__viewbase.flowLayer.particleCount());
await sleep(4000);   // částice doletí (speed 0.4, ale jen 3 ks krátce po sobě)
const afterBurst = await page.evaluate(() => {
  const { flowController } = window.__viewbase;
  // aktivní toky = trvalý (1); jednorázový má být uklizený
  return flowController.activeCount();
});
summary.checks.fireAndForget = { duringBurst, afterActive: afterBurst };

// --- 6. stop_flow odebere trvalý tok ---
fs.writeFileSync(`${OUT}/stop.flag`, '1');
await sleep(1500);
summary.checks.afterStop = await page.evaluate(() => {
  const { flowController } = window.__viewbase;
  return { active: flowController.activeCount() };
});

await browser.close();
server.kill('SIGTERM');

console.log(JSON.stringify(summary, null, 2));
```

- [ ] **Step 4: Spusť driver**

Run:

```bash
cd /tmp/vb-3-verify && VB_REPO="$(git -C /Users/j/Projects/viewBase rev-parse --show-toplevel)" node flows.mjs
```

(Pokud pracuješ ve worktree, VB_REPO ukáže na jeho kořen — `.venv` a `static` musí být v tomto kořeni.)

Expected (JSON summary):
- `pageErrors: []`, `consoleErrors: []`;
- `running`: `activeCount >= 1`, `particleCount > 0` (trvalý tok generuje částice);
- `moves: true` (částice se mezi vzorky posunula);
- `survivesReconnect`: `inInit === 1`, `active >= 1` (trvalý tok je v `init.flows` a přehrál se);
- `fireAndForget`: `duringBurst > 0` (jednorázová dávka přidala částice), `afterActive === 1` (jednorázový uklizen, zbyl jen trvalý);
- `afterStop`: `active === 0` (stop_flow odebral trvalý tok).

Pokud něco nesedí, koukni do `/tmp/vb-3-verify/server.log` a `summary.pageErrors`.

- [ ] **Step 5: Vizuální kontrola screenshotu**

Prohlédni `/tmp/vb-verify-3/1-flowing-cyber.png`: na tmavém pozadí musí být vidět svítící glow částice na hraně `n1–n2` (aditivní blending + bloom). Pokud částice nejsou vidět, oprav (typicky `theme.flow.size`/`opacity` nebo aditivní blending) před commitem.

- [ ] **Step 6: Celá testovací sada zelená (finální regrese)**

Run:

```bash
cd frontend && npx vitest run && cd .. && python -m pytest python/tests -q
```

Expected: PASS — celý vitest (12 souborů) i celý pytest, žádný skip/fail.

- [ ] **Step 7: Finální commit**

```bash
git add -A
git commit -m "test: E2E ověření toků (částice, pohyb, reconnect, stop_flow, screenshot)"
```

Pozn.: driver a server v `/tmp/vb-3-verify` jsou mimo repo a do commitu se nedostanou — `git add -A` z kořene repa zahrne jen případné poslední úpravy ve `frontend/`/`examples/`/`python/`. Pokud `git status` ukazuje čistý strom (vše už commitnuto v T1–T5), tento commit se vynechá.

---

## Coverage: spec ↔ plán

| Spec | Požadavek | Pokrytí |
|---|---|---|
| §5 | `define_flow_type(name, color, size, speed)` | T1 |
| §5 | `flow(source, target, ...)` jednorázový/trvalý, multi-hop `path` | T1 (API), T2/T3 (render) |
| §5 | `count=N` fire-and-forget; `count=None` vrací `flow_id`, je v `init`, přežije reconnect | T1 (snapshot `flows`), T3 (replayInit), T6 (ověření) |
| §5 | `stop_flow(id)` zastaví trvalý tok | T1 (API + akce), T3 (routing), T6 (ověření) |
| §5 | Směr = pořadí source → target; `interval` v sekundách; `speed` násobek tématu | T1 (payload), T2 (`Flow.step`/`baseSpeed`) |
| §5 | Tok bez explicitní barvy → kategorická paleta tématu (klient řeší podle indexu) | Konvence §5, T1 (`type_index`), T2 (`resolveFlowColor`) |
| §5 | Vzhled částic (glow, velikost) z tématu, přepsatelné per-flow | T3 (`theme.flow`), T2 (`size` priorita meta>typ>téma) |
| §5 | Validace: `flow` bez existující hrany / na neexistující uzel → `ValueError` | T1 (`_resolve_flow_path` + testy) |
| §6 | `init` nese typy toků i aktivní trvalé toky | T1 (`init_message`, snapshot), T3 (store) |
| §6 | `action`: `flow` / `stop_flow` | Konvence §2–3, T1 (payloady), T3 (routing) |
| §7 | Toky = instancované glow částice interpolované po hraně mezi aktuálními pozicemi uzlů (jedou i při pohybu uzlů) | T2 (`interpolateAlongPath` + živý `display`), T3 (per-frame `update`) |
| §8 | Vzhled částic toků v tématu | T3 (`theme.flow` v modern+cyber) |
| §8 | Kategorická paleta pro typy toků | Konvence §5, T2 (`resolveFlowColor`) — paleta už definovaná v Plánu 2b |
| §8 | Částice procházejí post-processingem (bloom) na cyber | T3 (částice ve scéně před composerem), T6 (screenshot) |
| §11 | `examples/wireshark/pcap_replay.py` (scapy, IP uzly, páry hrany, toky podle protokolu, časová osa + zrychlení) | T5 |
| §11 | `examples/wireshark/live_capture.py` (živé zachytávání, graf roste) | T5 |
| §11 | Wireshark README how-to + runnable bez externí captury | T5 (`README.md` + `make_sample_pcap.py`) |
| §10 | Python testy (model, protokol, WS round-trip) | T1 (`test_flows.py` vč. WS) |
| §10 | Frontend vitest (čistá logika) | T2 (`flow.test.js`: interpolace, barva, controller) |
| §10 | E2E Playwright smoke | T6 |
| §12 | Toky + typy toků uvnitř v1 | T1–T6 (kompletně) |

## Co zbývá do budoucna (NENÍ v Plánu 3)

Tyto položky spec zmiňuje, ale Plán 3 je vědomě vynechává:

- **GLB modely typů uzlů** (`define_type(model=...)`) — klíč `model` se zatím ignoruje (tvar spadne na default).
- **Wheel se zabalenými assety + CI** (pytest+vitest+build+examples „nastartuje a nespadne") a **chunking bundlu**.
- **Mlha (fog) a edge-glow shader** v tématech — čistě výtvarné rozšíření theme objektu.
- **`config.label_budget`** (zatím jen `theme.label.budget`).
- **Binární protokol** (verzování od začátku připraveno, implementace později).
- **Jupyter, mount do existující FastAPI aplikace** (mimo v1).
- **Témata `art-deco`, `steampunk`** (výtvarná práce, systém hotový).
