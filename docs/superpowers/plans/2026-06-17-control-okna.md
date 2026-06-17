# Control okna (parametrické GUI) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backendem řízené parametrické okno (int/string/enum pole) jehož hodnoty se tlačítkem Použít posílají zpět na backend; vlajkový konzument je přepínání hran čára/splajn + elasticita.

**Architecture:** DRY field descriptor sdílený oběma směry a validací na obou stranách. Backend: nový `controls.py` (`ControlWindow` + čistá `validate_values`), v `canvas.py` registr oken + akce `open_window`/`close_window`/`set_edge_style` + interní handler eventu `window_submit`. Frontend: chrome okna se vytáhne do `base_window.js` (DRY), `control_window.js` přidá formulářové okno, renderer kreslí hrany jako kvadratický bezier. Jede po stávajícím kanálu akcí/eventů — `server.py` se nemění.

**Tech Stack:** Python 3.10+ (FastAPI, pytest), JS (Vite, vitest, three r165). Spec: `docs/superpowers/specs/2026-06-17-control-okna-design.md`.

---

## File Structure

- **Create** `python/viewbase/controls.py` — `ControlWindow` + čistá `validate_values`/`_normalize_options`/`_clamp_field`.
- **Modify** `python/viewbase/canvas.py` — registr oken, `open_window`/`close_window`/`set_edge_style`, interní `_on_window_submit`, `config["edge_style"]`, `snapshot()["windows"]`.
- **Modify** `python/viewbase/protocol.py` — `init_message` + `windows`.
- **Modify** `python/viewbase/__init__.py` — export `ControlWindow`.
- **Create** `python/tests/test_controls.py`, `python/tests/test_control_windows.py`.
- **Create** `frontend/src/render/edges.js` — čistá `bezierEdgePoints`.
- **Modify** `frontend/src/render/renderer.js` — `setEdgeStyle` + spline větev v `_syncEdges` + kapacita ve vrcholech.
- **Create** `frontend/src/render/base_window.js` — `BaseWindow` chrome + `clampToCanvas`/`dockLayout`.
- **Modify** `frontend/src/render/windows.js` — `DetailWindow extends BaseWindow`, zobecněný `WindowManager`, re-export čistých fcí.
- **Create** `frontend/src/render/control_window.js` — `ControlWindow extends BaseWindow` + čisté `clampValue`/`readValues`.
- **Modify** `frontend/src/core/store.js`, `frontend/src/main.js` — `windows`/`edge_style` z initu, routování akcí, submit event.
- **Create** `frontend/tests/edges.test.js`, `frontend/tests/control_window.test.js`.
- **Modify** `examples/showcase.py` — control okno napojené na `set_edge_style`.

Příkazy z kořene repa; venv `.venv/bin/python`; frontend `cd frontend && npx vitest run` / `npm run build` (Bash bez `cd` do podadresáře — pro frontend příkazy je `cd frontend && …` v jednom příkazu OK).

---

### Task 1: Backend — `controls.py` (ControlWindow + validace)

**Files:**
- Create: `python/viewbase/controls.py`
- Test: `python/tests/test_controls.py`

- [ ] **Step 1: Failing testy**

Vytvoř `python/tests/test_controls.py`:

```python
import pytest

from viewbase.controls import ControlWindow, validate_values


def _fields():
    w = ControlWindow("w", title="T")
    w.integer("n", "N", min=0, max=100, value=30)
    w.string("s", "S", maxlength=4, value="ab")
    w.enum("e", "E", options=[("line", "Čáry"), ("spline", "Splajny")],
           value="line")
    return w.spec()["fields"]


def test_spec_shape():
    w = ControlWindow("render", title="Vykreslování")
    w.integer("n", "N", min=0, max=10, value=5, step=2)
    spec = w.spec()
    assert spec["window_id"] == "render"
    assert spec["title"] == "Vykreslování"
    assert spec["fields"] == [
        {"key": "n", "label": "N", "type": "int",
         "value": 5, "min": 0, "max": 10, "step": 2}]


def test_enum_normalizes_options_and_bare_values():
    w = ControlWindow("w")
    w.enum("e", "E", options=["a", ("b", "Bé")], value="a")
    field = w.spec()["fields"][0]
    assert field["options"] == [
        {"value": "a", "label": "a"}, {"value": "b", "label": "Bé"}]


def test_integer_min_gt_max_raises():
    with pytest.raises(ValueError):
        ControlWindow("w").integer("n", "N", min=5, max=1, value=2)


def test_string_maxlength_nonpositive_raises():
    with pytest.raises(ValueError):
        ControlWindow("w").string("s", "S", maxlength=0)


def test_enum_empty_options_raises():
    with pytest.raises(ValueError):
        ControlWindow("w").enum("e", "E", options=[], value=None)


def test_validate_clamps_int():
    f = _fields()
    assert validate_values(f, {"n": 250}) == {"n": 100}
    assert validate_values(f, {"n": -5}) == {"n": 0}
    assert validate_values(f, {"n": 42}) == {"n": 42}


def test_validate_int_non_numeric_dropped():
    assert validate_values(_fields(), {"n": "x"}) == {}


def test_validate_truncates_string():
    assert validate_values(_fields(), {"s": "abcdefg"}) == {"s": "abcd"}


def test_validate_enum_rejects_unknown():
    f = _fields()
    assert validate_values(f, {"e": "ghost"}) == {}
    assert validate_values(f, {"e": "spline"}) == {"e": "spline"}


def test_validate_drops_unknown_keys():
    assert validate_values(_fields(), {"zzz": 1}) == {}


def test_apply_updates_values():
    w = ControlWindow("w")
    w.integer("n", "N", min=0, max=10, value=1)
    w.apply({"n": 7})
    assert w.spec()["fields"][0]["value"] == 7
```

- [ ] **Step 2: Ověř selhání**

Run: `.venv/bin/python -m pytest python/tests/test_controls.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'viewbase.controls'`.

- [ ] **Step 3: Implementuj `controls.py`**

Vytvoř `python/viewbase/controls.py`:

```python
"""Control okno: backendem definovaný parametrický dialog.

ControlWindow drží typovaná pole (int/string/enum). Spec jde na frontend (akce
open_window i init), frontend z něj postaví formulář a hodnoty pošle zpět
eventem window_submit. validate_values je čistá – clampuje příchozí hodnoty
podle field descriptorů (bezpečnost: klient může poslat cokoli)."""
from __future__ import annotations

from typing import Any


def _normalize_options(options: list) -> list[dict]:
    """Seznam (value, label) dvojic nebo holých hodnot → [{value, label}]."""
    normalized = []
    for opt in options:
        if isinstance(opt, (list, tuple)) and len(opt) == 2:
            value, label = opt
        else:
            value, label = opt, str(opt)
        normalized.append({"value": value, "label": str(label)})
    return normalized


class ControlWindow:
    """Parametrické okno: uspořádaný seznam typovaných polí."""

    def __init__(self, window_id: str, *, title: str = "") -> None:
        self.window_id = window_id
        self.title = title
        self._fields: list[dict[str, Any]] = []

    def integer(self, key: str, label: str, *, min: int, max: int,
                value: int, step: int = 1) -> "ControlWindow":
        if min > max:
            raise ValueError("integer: min nesmí být větší než max")
        self._fields.append({
            "key": key, "label": label, "type": "int",
            "value": int(value), "min": int(min), "max": int(max),
            "step": int(step),
        })
        return self

    def string(self, key: str, label: str, *, maxlength: int,
               value: str = "") -> "ControlWindow":
        if maxlength <= 0:
            raise ValueError("string: maxlength musí být kladné")
        self._fields.append({
            "key": key, "label": label, "type": "string",
            "value": str(value), "maxlength": int(maxlength),
        })
        return self

    def enum(self, key: str, label: str, *, options: list,
             value: Any) -> "ControlWindow":
        norm = _normalize_options(options)
        if not norm:
            raise ValueError("enum: options nesmí být prázdné")
        self._fields.append({
            "key": key, "label": label, "type": "enum",
            "value": value, "options": norm,
        })
        return self

    def spec(self) -> dict[str, Any]:
        return {
            "window_id": self.window_id,
            "title": self.title,
            "fields": [dict(f) for f in self._fields],
        }

    def apply(self, values: dict[str, Any]) -> None:
        """Přepiš value u polí podle (už zvalidovaných) hodnot."""
        for field in self._fields:
            if field["key"] in values:
                field["value"] = values[field["key"]]


def _clamp_field(field: dict, raw: Any) -> Any:
    """Zvaliduj jednu hodnotu podle field descriptoru. Vrátí _DROP, když je
    hodnota nepoužitelná (volající ji vynechá)."""
    kind = field["type"]
    if kind == "int":
        try:
            value = int(raw)
        except (TypeError, ValueError):
            return _DROP
        return max(field["min"], min(field["max"], value))
    if kind == "string":
        if not isinstance(raw, str):
            return _DROP
        return raw[:field["maxlength"]]
    if kind == "enum":
        allowed = {opt["value"] for opt in field["options"]}
        return raw if raw in allowed else _DROP
    return _DROP


_DROP = object()   # sentinel: hodnotu zahodit (None je validní string/enum)


def validate_values(fields: list[dict], raw: dict) -> dict:
    """Čistá validace: vrať jen platné, oříznuté hodnoty podle field
    descriptorů. Neznámé klíče a nevalidní hodnoty se zahodí."""
    clean = {}
    for field in fields:
        key = field["key"]
        if key not in raw:
            continue
        value = _clamp_field(field, raw[key])
        if value is not _DROP:
            clean[key] = value
    return clean
```

- [ ] **Step 4: Ověř, že testy projdou**

Run: `.venv/bin/python -m pytest python/tests/test_controls.py -q`
Expected: PASS — všechny testy zelené.

- [ ] **Step 5: Commit**

```bash
git add python/viewbase/controls.py python/tests/test_controls.py
git commit -m "$(printf 'feat: controls.py – ControlWindow + validate_values (TDD)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 2: Backend — Canvas integrace + protokol + export

**Files:**
- Modify: `python/viewbase/canvas.py`
- Modify: `python/viewbase/protocol.py`
- Modify: `python/viewbase/__init__.py`
- Test: `python/tests/test_control_windows.py`

- [ ] **Step 1: Failing testy**

Vytvoř `python/tests/test_control_windows.py`:

```python
import threading

import pytest
from fastapi.testclient import TestClient

from viewbase import Canvas, ControlWindow, create_app, protocol


def _win():
    w = ControlWindow("render", title="Vykreslování")
    w.enum("style", "Hrany",
           options=[("line", "Čáry"), ("spline", "Splajny")], value="line")
    w.integer("elasticity", "Elasticita", min=0, max=100, value=30)
    return w


def test_open_window_queues_action_and_snapshot():
    c = Canvas()
    c.open_window(_win())
    (a,) = c.drain_actions()
    assert a["action"] == "open_window"
    assert a["window_id"] == "render"
    assert [f["key"] for f in a["fields"]] == ["style", "elasticity"]
    assert [w["window_id"] for w in c.snapshot()["windows"]] == ["render"]


def test_open_window_replace_same_id():
    c = Canvas()
    c.open_window(_win())
    c.open_window(_win())
    assert len(c.snapshot()["windows"]) == 1


def test_close_window_removes_and_queues():
    c = Canvas()
    c.open_window(_win())
    c.drain_actions()
    c.close_window("render")
    (a,) = c.drain_actions()
    assert a == {"action": "close_window", "window_id": "render"}
    assert c.snapshot()["windows"] == []


def test_close_unknown_raises():
    with pytest.raises(ValueError):
        Canvas().close_window("ghost")


def test_default_edge_style_is_line():
    assert Canvas().config["edge_style"] == {"style": "line", "elasticity": 0.0}


def test_set_edge_style_updates_config_and_action():
    c = Canvas()
    c.set_edge_style("spline", elasticity=0.6)
    assert c.config["edge_style"] == {"style": "spline", "elasticity": 0.6}
    (a,) = c.drain_actions()
    assert a == {"action": "set_edge_style", "style": "spline",
                 "elasticity": 0.6}


def test_set_edge_style_clamps_elasticity():
    c = Canvas()
    c.set_edge_style("spline", elasticity=5.0)
    assert c.config["edge_style"]["elasticity"] == 1.0


def test_set_edge_style_invalid_raises():
    with pytest.raises(ValueError):
        Canvas().set_edge_style("zigzag")


def test_window_submit_validates_and_calls_callback():
    c = Canvas()
    done = threading.Event()
    got = {}

    def cb(event):
        got["values"] = event.values
        got["window_id"] = event.window_id
        done.set()

    c.open_window(_win(), on_submit=cb)
    c.dispatch_event("window_submit", {
        "window_id": "render",
        "values": {"style": "spline", "elasticity": 250, "ghost": 1},
        "client_id": "x"})
    assert done.wait(2.0)
    assert got["values"] == {"style": "spline", "elasticity": 100}
    assert got["window_id"] == "render"
    fields = {f["key"]: f["value"]
              for f in c.snapshot()["windows"][0]["fields"]}
    assert fields["style"] == "spline"
    assert fields["elasticity"] == 100
    c.close()


def test_window_submit_unknown_window_does_not_raise():
    c = Canvas()
    c.dispatch_event("window_submit",
                     {"window_id": "ghost", "values": {}, "client_id": "x"})
    c.close()   # pool se ukončí; žádná výjimka nepropadne (handler loguje)


def test_init_message_includes_windows_key():
    msg = protocol.init_message(
        seq=0, config={}, node_types={}, nodes=[], edges=[],
        flow_types={}, flows=[], windows=[{"window_id": "w"}])
    assert msg["windows"] == [{"window_id": "w"}]


def test_init_carries_windows_and_edge_style():
    c = Canvas()
    c.open_window(_win())
    c.set_edge_style("spline", 0.5)
    with TestClient(create_app(c)) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(protocol.encode(
                {"type": "hello", "protocol": protocol.PROTOCOL_VERSION}))
            init = protocol.decode(ws.receive_text())
    assert init["type"] == "init"
    assert [w["window_id"] for w in init["windows"]] == ["render"]
    assert init["config"]["edge_style"] == {"style": "spline",
                                            "elasticity": 0.5}
```

- [ ] **Step 2: Ověř selhání**

Run: `.venv/bin/python -m pytest python/tests/test_control_windows.py -q`
Expected: FAIL — `ImportError: cannot import name 'ControlWindow' from 'viewbase'`.

- [ ] **Step 3: Export `ControlWindow`**

V `python/viewbase/__init__.py` nahraď obsah:

```python
"""viewbase – živá 2D/3D force-graph vizualizace ovládaná z Pythonu."""
from . import protocol
from .canvas import Canvas
from .controls import ControlWindow
from .server import create_app, serve

__all__ = ["Canvas", "ControlWindow", "create_app", "serve", "protocol"]
__version__ = "0.1.0"
```

- [ ] **Step 4: Rozšiř `protocol.init_message` o `windows`**

V `python/viewbase/protocol.py` nahraď funkci `init_message`:

```python
def init_message(*, seq: int, config: dict, node_types: dict,
                 nodes: list, edges: list,
                 flow_types: dict, flows: list,
                 windows: list) -> dict[str, Any]:
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
        "windows": windows,
    }
```

- [ ] **Step 5: Canvas – import + stav + default edge_style**

V `python/viewbase/canvas.py` přidej k importům (za `import uuid`):

```python
from .controls import ControlWindow, validate_values
```

V `Canvas.__init__`, v dictu `self.config` (za řádek `"detail_window": {...},`) přidej:

```python
            "edge_style": {"style": "line", "elasticity": 0.0},
```

V `Canvas.__init__` za `self._flows: dict[...] = {}` přidej:

```python
        self._windows: dict[str, ControlWindow] = {}
        self._window_callbacks: dict[str, Any] = {}
```

V `Canvas.__init__` na konec (za `self._node_label_template = None`) přidej registraci interního handleru:

```python
        self._register("window_submit", self._on_window_submit)
```

- [ ] **Step 6: Canvas – metody oken a stylu hran**

V `python/viewbase/canvas.py` přidej za metodu `stop_flow` (před `# ---- uzly ----`):

```python
    # ---- control okna -------------------------------------------------

    def open_window(self, window: ControlWindow, *, on_submit=None) -> str:
        """Otevři/nahraď parametrické okno: ulož do stavu (pro init replay) a
        zařaď akci open_window. on_submit dostane event s validovanými values."""
        with self._lock:
            self._windows[window.window_id] = window
            if on_submit is not None:
                self._window_callbacks[window.window_id] = on_submit
            else:
                self._window_callbacks.pop(window.window_id, None)
            self._actions.append({"action": "open_window", **window.spec()})
        return window.window_id

    def close_window(self, window_id: str) -> None:
        """Zavři okno: odeber ze stavu a zařaď akci close_window."""
        with self._lock:
            if self._windows.pop(window_id, None) is None:
                raise ValueError(f"Okno '{window_id}' neexistuje")
            self._window_callbacks.pop(window_id, None)
            self._actions.append(
                {"action": "close_window", "window_id": window_id})

    def set_edge_style(self, style: str, elasticity: float = 0.0) -> None:
        """Nastav vykreslení hran: 'line' nebo 'spline', elasticity 0..1.
        Uloží do config (pro init) a zařadí akci set_edge_style."""
        if style not in ("line", "spline"):
            raise ValueError("style musí být 'line' nebo 'spline'")
        elasticity = max(0.0, min(1.0, float(elasticity)))
        with self._lock:
            self.config["edge_style"] = {"style": style,
                                         "elasticity": elasticity}
            self._actions.append({"action": "set_edge_style", "style": style,
                                  "elasticity": elasticity})

    def _on_window_submit(self, event) -> None:
        """Interní handler eventu window_submit: validuj values proti specu
        okna, ulož je (pro init replay) a zavolej callback okna."""
        window_id = getattr(event, "window_id", None)
        raw = getattr(event, "values", None)
        if not isinstance(raw, dict):
            return
        with self._lock:
            window = self._windows.get(window_id)
            if window is None:
                return
            clean = validate_values(window.spec()["fields"], raw)
            window.apply(clean)
            callback = self._window_callbacks.get(window_id)
        if callback is not None:
            event.values = clean
            callback(event)
```

- [ ] **Step 7: Canvas – snapshot nese windows**

V `python/viewbase/canvas.py`, v metodě `snapshot()` do vraceného dictu (za řádek `"flows": [...]`) přidej:

```python
                "windows": [w.spec() for w in self._windows.values()],
```

- [ ] **Step 8: Ověř, že testy projdou**

Run: `.venv/bin/python -m pytest python/tests/test_control_windows.py -q`
Expected: PASS — všechny testy zelené.

- [ ] **Step 9: Regrese jádra (init nově nese windows)**

Run: `.venv/bin/python -m pytest python/tests -q`
Expected: PASS — žádný fail (existující init/snapshot testy musí projít s novým klíčem `windows` a `config.edge_style`).

- [ ] **Step 10: Commit**

```bash
git add python/viewbase/canvas.py python/viewbase/protocol.py python/viewbase/__init__.py python/tests/test_control_windows.py
git commit -m "$(printf 'feat: Canvas open_window/close_window/set_edge_style + window_submit handler\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 3: Frontend — křivkové hrany (`edges.js` + renderer)

**Files:**
- Create: `frontend/src/render/edges.js`
- Modify: `frontend/src/render/renderer.js`
- Test: `frontend/tests/edges.test.js`

- [ ] **Step 1: Failing testy pro `bezierEdgePoints`**

Vytvoř `frontend/tests/edges.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { bezierEdgePoints, EDGE_SEGMENTS } from '../src/render/edges.js';

const a = { x: 0, y: 0, z: 0 };
const b = { x: 10, y: 0, z: 0 };

describe('bezierEdgePoints', () => {
  it('vrátí segments+1 bodů', () => {
    expect(bezierEdgePoints(a, b, 0.5, 8).length).toBe(9);
    expect(bezierEdgePoints(a, b, 0.5).length).toBe(EDGE_SEGMENTS + 1);
  });

  it('koncové body jsou a a b', () => {
    const p = bezierEdgePoints(a, b, 0.5, 8);
    expect(p[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(p[8].x).toBeCloseTo(10);
    expect(p[8].y).toBeCloseTo(0);
    expect(p[8].z).toBeCloseTo(0);
  });

  it('elasticita 0 → kolineární (střed na úsečce)', () => {
    const p = bezierEdgePoints(a, b, 0, 8);
    expect(p[4].x).toBeCloseTo(5);
    expect(p[4].y).toBeCloseTo(0);
    expect(p[4].z).toBeCloseTo(0);
  });

  it('elasticita > 0 → prohnutí ve středu roste s elasticitou', () => {
    const mid1 = bezierEdgePoints(a, b, 0.3, 8)[4];
    const mid2 = bezierEdgePoints(a, b, 0.8, 8)[4];
    const bow1 = Math.hypot(mid1.y, mid1.z);
    const bow2 = Math.hypot(mid2.y, mid2.z);
    expect(bow1).toBeGreaterThan(0);
    expect(bow2).toBeGreaterThan(bow1);
  });

  it('hrana rovnoběžná s osou Y má platnou kolmici (prohnutí v X/Z)', () => {
    const p = bezierEdgePoints({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 },
      0.5, 8)[4];
    expect(Math.hypot(p.x, p.z)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Ověř selhání**

Run: `cd frontend && npx vitest run tests/edges.test.js`
Expected: FAIL — modul `../src/render/edges.js` neexistuje.

- [ ] **Step 3: Implementuj `edges.js`**

Vytvoř `frontend/src/render/edges.js`:

```js
/** Křivková hrana: body kvadratického bezieru a→b s prohnutím (elasticita).
 *  Vrací segments+1 bodů {x,y,z}. elasticity 0 → kolineární (rovná čára, bezier
 *  s řídicím bodem ve středu degeneruje na úsečku). Řídicí bod = střed +
 *  kolmice·(elasticity·délka·MAX_BOW); kolmice v 3D = dir × osa Y (fallback
 *  osa X při rovnoběžnosti). */
export const EDGE_SEGMENTS = 12;
export const EDGE_MAX_BOW = 0.5;

export function bezierEdgePoints(a, b, elasticity, segments = EDGE_SEGMENTS) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const mz = (a.z + b.z) / 2;
  let cx = mx;
  let cy = my;
  let cz = mz;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz);
  if (elasticity > 0 && len > 0) {
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;
    let px = -uz;            // dir × (0,1,0) = (-uz, 0, ux)
    let py = 0;
    let pz = ux;
    if (Math.hypot(px, py, pz) < 1e-6) {   // dir ‖ osa Y → fallback ref X
      px = 0; py = uz; pz = -uy;           // dir × (1,0,0) = (0, uz, -uy)
    }
    const pl = Math.hypot(px, py, pz) || 1;
    const offset = elasticity * len * EDGE_MAX_BOW;
    cx = mx + (px / pl) * offset;
    cy = my + (py / pl) * offset;
    cz = mz + (pz / pl) * offset;
  }
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const it = 1 - t;
    const w0 = it * it;
    const w1 = 2 * it * t;
    const w2 = t * t;
    points.push({
      x: w0 * a.x + w1 * cx + w2 * b.x,
      y: w0 * a.y + w1 * cy + w2 * b.y,
      z: w0 * a.z + w1 * cz + w2 * b.z,
    });
  }
  return points;
}
```

- [ ] **Step 4: Ověř, že testy projdou**

Run: `cd frontend && npx vitest run tests/edges.test.js`
Expected: PASS.

- [ ] **Step 5: Renderer – import + stav + setEdgeStyle**

V `frontend/src/render/renderer.js` přidej import (za `import { FlowController, FlowLayer } from './flow.js';`):

```js
import { bezierEdgePoints, EDGE_SEGMENTS } from './edges.js';
```

V konstruktoru `Renderer`, za řádek `this.edgeLines = null;` přidej:

```js
    this.edgeStyle = 'line';        // 'line' | 'spline'
    this.edgeElasticity = 0;        // 0..1
```

Přidej metodu (např. hned za `applyTheme(theme)`):

```js
  /** Styl hran z akce/initu: 'line' nebo 'spline' + elasticita 0..1.
   *  Bez rebuildu – přepočet je per-frame v _syncEdges. */
  setEdgeStyle({ style, elasticity } = {}) {
    this.edgeStyle = style === 'spline' ? 'spline' : 'line';
    this.edgeElasticity = Math.max(0, Math.min(1, elasticity ?? 0));
  }
```

- [ ] **Step 6: Renderer – kapacita ve vrcholech + spline větev**

V `frontend/src/render/renderer.js` nahraď metodu `_ensureEdgeCapacity` (kapacita teď počítá VRCHOLY, ne hrany):

```js
  _ensureEdgeCapacity(vertexCount) {
    if (vertexCount <= this.edgeCapacity) return;
    const capacity = Math.max(8192, 2 ** Math.ceil(Math.log2(vertexCount)));
    if (this.edgeLines) {
      this.scene.remove(this.edgeLines);
      this.edgeLines.geometry.dispose();
      this.edgeLines.material.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
    geometry.setDrawRange(0, 0);
    this.edgeLines = new THREE.LineSegments(geometry,
      new THREE.LineBasicMaterial({
        color: this.theme.edge.color,
        transparent: true,
        opacity: this.theme.edge.opacity,
      }));
    this.edgeLines.frustumCulled = false;
    this.scene.add(this.edgeLines);
    this.edgeCapacity = capacity;   // ve VRCHOLECH
  }
```

A nahraď metodu `_syncEdges`:

```js
  _syncEdges() {
    const { edges } = this.store;
    const spline = this.edgeStyle === 'spline' && this.edgeElasticity > 0;
    const perEdge = spline ? EDGE_SEGMENTS * 2 : 2;   // vrcholů na hranu
    this._ensureEdgeCapacity(edges.size * perEdge);
    const attr = this.edgeLines.geometry.getAttribute('position');
    let v = 0;                                        // index vrcholu
    for (const edge of edges.values()) {
      const a = this.display.get(edge.source);
      const b = this.display.get(edge.target);
      if (!a || !b) continue;
      if (spline) {
        const pts = bezierEdgePoints(a, b, this.edgeElasticity, EDGE_SEGMENTS);
        for (let i = 0; i < pts.length - 1; i += 1) {
          attr.setXYZ(v, pts[i].x, pts[i].y, pts[i].z); v += 1;
          attr.setXYZ(v, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z); v += 1;
        }
      } else {
        attr.setXYZ(v, a.x, a.y, a.z); v += 1;
        attr.setXYZ(v, b.x, b.y, b.z); v += 1;
      }
    }
    this.edgeLines.geometry.setDrawRange(0, v);
    attr.needsUpdate = true;
  }
```

A v konstruktoru uprav počáteční volání (kapacita je teď ve vrcholech):
najdi `this._ensureEdgeCapacity(4096);` a nech beze změny (4096 vrcholů je dost pro start; regrow doroste).

- [ ] **Step 7: Ověř vitest + build**

Run: `cd frontend && npx vitest run`
Expected: PASS — všechny testovací soubory (včetně `edges.test.js`), žádný fail.

Run: `cd frontend && npm run build`
Expected: build projde bez chyb.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/render/edges.js frontend/src/render/renderer.js frontend/tests/edges.test.js
git commit -m "$(printf 'feat: křivkové hrany (bezierEdgePoints) + renderer setEdgeStyle/spline\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 4: Frontend — `BaseWindow` extrakce + `ControlWindow`

**Files:**
- Create: `frontend/src/render/base_window.js`
- Modify: `frontend/src/render/windows.js`
- Create: `frontend/src/render/control_window.js`
- Test: `frontend/tests/control_window.test.js`

Pozn.: DOM třídy oken se (jako dnes) jednotkově netestují — ověřují se buildem a manuálně. Jednotkově se testují jen čisté funkce. Cyklickému importu se vyhneme tím, že `BaseWindow` žije v `base_window.js` (bez závislosti na `windows.js`), a `windows.js` re-exportuje `clampToCanvas`/`dockLayout`, aby stávající `windows.test.js` zůstal beze změny.

- [ ] **Step 1: Failing testy pro čisté helpery control okna**

Vytvoř `frontend/tests/control_window.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { clampValue, readValues } from '../src/render/control_window.js';

const intField = { key: 'n', type: 'int', value: 30, min: 0, max: 100, step: 1 };
const strField = { key: 's', type: 'string', value: 'ab', maxlength: 4 };
const enumField = {
  key: 'e', type: 'enum', value: 'line',
  options: [{ value: 'line', label: 'Čáry' }, { value: 'spline', label: 'Splajny' }],
};

describe('clampValue', () => {
  it('int clamp do rozmezí a na celé číslo', () => {
    expect(clampValue(intField, '250')).toBe(100);
    expect(clampValue(intField, -5)).toBe(0);
    expect(clampValue(intField, '42')).toBe(42);
    expect(clampValue(intField, 7.8)).toBe(8);
  });

  it('int nečíselný → ponech stávající value', () => {
    expect(clampValue(intField, 'x')).toBe(30);
  });

  it('string ořez na maxlength', () => {
    expect(clampValue(strField, 'abcdefg')).toBe('abcd');
  });

  it('enum platná hodnota projde, neplatná → stávající value', () => {
    expect(clampValue(enumField, 'spline')).toBe('spline');
    expect(clampValue(enumField, 'ghost')).toBe('line');
  });
});

describe('readValues', () => {
  it('z rawMap udělá čisté hodnoty jen pro známé klíče', () => {
    const fields = [intField, enumField];
    const out = readValues(fields, { n: '250', e: 'spline', zzz: 1 });
    expect(out).toEqual({ n: 100, e: 'spline' });
  });
});
```

- [ ] **Step 2: Ověř selhání**

Run: `cd frontend && npx vitest run tests/control_window.test.js`
Expected: FAIL — modul `../src/render/control_window.js` neexistuje.

- [ ] **Step 3: Vytvoř `base_window.js` (chrome ze stávajícího DetailWindow)**

Vytvoř `frontend/src/render/base_window.js`:

```js
/** Sdílené chrome okno (Amiga Workbench): záhlaví s gadgety zavřít/
 *  minimalizovat/obnovit, tažení za záhlaví, dok vlevo dole, z-order.
 *  Tělo dodává podtřída: nastaví this.body v _buildBody() a (volitelně)
 *  překresluje v _renderBody(). Podtřída v konstruktoru po super() nastaví
 *  svá pole, pak zavolá this._buildBody() a this._mount(). Čisté funkce
 *  clampToCanvas/dockLayout jsou tu; windows.js je re-exportuje. */

export function clampToCanvas(x, y, w, h, bounds) {
  const maxX = Math.max(0, bounds.width - w);
  const maxY = Math.max(0, bounds.height - h);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}

export function dockLayout(index, slotWidth, gap, canvasHeight, slotHeight) {
  return { x: index * (slotWidth + gap), y: canvasHeight - slotHeight };
}

const DOCK_SLOT_WIDTH = 160;
const DOCK_GAP = 8;
const DOCK_SLOT_HEIGHT = 28;

export class BaseWindow {
  constructor({ id, title, widthChars, container, manager, kind }) {
    this.id = id;
    this.title = title;
    this.widthChars = widthChars;
    this.container = container;
    this.manager = manager;
    this.kind = kind;            // 'detail' | 'control'
    this.isMinimized = false;
    this.saved = null;
    this.dragOffset = null;
    this.body = null;            // nastaví _buildBody podtřídy

    this.el = document.createElement('div');
    this.el.dataset.role = 'vb-window';
    this.el.dataset.windowId = String(id);
    this.el.style.cssText = [
      'position:absolute', 'left:0', 'top:0', 'box-sizing:border-box',
      'background:var(--vb-window-body-bg, rgba(255,255,255,0.97))',
      'color:var(--vb-window-body-fg, #1f2430)',
      'box-shadow:var(--vb-window-shadow, 0 6px 20px rgba(0,0,0,0.22))',
      'border-radius:6px', 'overflow:hidden', 'user-select:none',
      'font:13px/1.5 system-ui,sans-serif', 'z-index:900',
    ].join(';');
    this._buildHeader();
  }

  // -- hooky podtřídy --
  _buildBody() { /* podtřída: vytvoř this.body a připoj do this.el */ }
  _renderBody() { /* podtřída: refresh při tématu / obnově */ }

  // -- po nastavení polí podtřídy --
  _mount() {
    this.container.appendChild(this.el);
    const bounds = this._bounds();
    const offset = (this.manager.windows.size % 8) * 24;
    const start = clampToCanvas(40 + offset, 40 + offset,
      this._width(), 200, bounds);
    this._place(start.x, start.y);
    this.el.addEventListener('pointerdown', () => this.bringToFront());
  }

  _width() { return this.widthChars * 8 + 24; }

  _bounds() {
    return {
      width: this.container.clientWidth || 800,
      height: this.container.clientHeight || 600,
    };
  }

  _buildHeader() {
    const bar = document.createElement('div');
    bar.dataset.role = 'vb-titlebar';
    bar.style.cssText = [
      'display:flex', 'align-items:center', 'gap:6px',
      'padding:4px 6px', 'cursor:move',
      'background:var(--vb-window-header-bg, #d8dde6)',
      'color:var(--vb-window-header-fg, #1f2430)',
    ].join(';');

    this.closeGadget = this._gadget('close', '×');
    this.closeGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    this.titleEl = document.createElement('div');
    this.titleEl.textContent = this.title;
    this.titleEl.style.cssText = [
      'flex:1', 'text-align:center', 'font-weight:600',
      'white-space:nowrap', 'overflow:hidden', 'text-overflow:ellipsis',
    ].join(';');

    this.minGadget = this._gadget('minimize', '–');
    this.minGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimize();
    });

    this.restoreGadget = this._gadget('restore', '▢');
    this.restoreGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.restore();
    });
    this.restoreGadget.style.display = 'none';

    bar.append(this.closeGadget, this.titleEl,
      this.minGadget, this.restoreGadget);
    this._dragFromHeader(bar);
    this.bar = bar;
    this.el.appendChild(bar);
  }

  _gadget(name, glyph) {
    const g = document.createElement('button');
    g.dataset.gadget = name;
    g.textContent = glyph;
    g.style.cssText = [
      'flex:0 0 auto', 'width:18px', 'height:18px', 'line-height:16px',
      'padding:0', 'border:1px solid var(--vb-window-gadget, #8a93a3)',
      'border-radius:3px', 'background:transparent', 'cursor:pointer',
      'color:var(--vb-window-gadget, #5a6573)', 'font-size:13px',
    ].join(';');
    return g;
  }

  _dragFromHeader(bar) {
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.dataset.gadget) return;
      this.bringToFront();
      const rect = this.el.getBoundingClientRect();
      const cont = this.container.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left, y: e.clientY - rect.top,
        contLeft: cont.left, contTop: cont.top,
      };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!this.dragOffset || this.isMinimized) return;
      const x = e.clientX - this.dragOffset.contLeft - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.contTop - this.dragOffset.y;
      const pos = clampToCanvas(x, y, this._width(), this._headerH(),
        this._bounds());
      this._place(pos.x, pos.y);
    });
    const end = (e) => {
      if (this.dragOffset) {
        this.dragOffset = null;
        try { bar.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      }
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  _headerH() { return this.bar.offsetHeight || DOCK_SLOT_HEIGHT; }

  _place(x, y) {
    this.x = x;
    this.y = y;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  minimize() {
    if (this.isMinimized) return;
    this.isMinimized = true;
    this.saved = { x: this.x, y: this.y };
    this.body.style.display = 'none';
    this.minGadget.style.display = 'none';
    this.restoreGadget.style.display = '';
    this.el.dataset.role = 'vb-dock-strip';
    this.el.style.background = 'var(--vb-window-dock-bg, #c2c9d4)';
    this.el.style.width = `${DOCK_SLOT_WIDTH}px`;
    this.titleEl.style.fontSize = '11px';
    const slot = this.manager._assignDockSlot(this);
    const bounds = this._bounds();
    const pos = dockLayout(slot, DOCK_SLOT_WIDTH, DOCK_GAP,
      bounds.height, DOCK_SLOT_HEIGHT);
    this._place(pos.x, pos.y);
  }

  restore() {
    if (!this.isMinimized) return;
    this.isMinimized = false;
    this.manager._releaseDockSlot(this);
    this.el.dataset.role = 'vb-window';
    this.el.style.background = 'var(--vb-window-body-bg, rgba(255,255,255,0.97))';
    this.el.style.width = '';
    this.titleEl.style.fontSize = '';
    this.body.style.display = '';
    this.minGadget.style.display = '';
    this.restoreGadget.style.display = 'none';
    this._renderBody();
    const pos = this.saved ?? { x: 40, y: 40 };
    this._place(pos.x, pos.y);
    this.bringToFront();
  }

  bringToFront() { this.setZ(this.manager._nextZ()); }

  setZ(z) { this.el.style.zIndex = String(z); }

  applyTheme() {
    if (!this.isMinimized) this._renderBody();
  }

  close() {
    if (this.isMinimized) this.manager._releaseDockSlot(this);
    this.el.remove();
    this.manager._forget(this.id);
  }
}
```

- [ ] **Step 4: Přepiš `windows.js` (DetailWindow extends BaseWindow + zobecněný WindowManager)**

Nahraď celý obsah `frontend/src/render/windows.js`:

```js
/** Detailní okno (řádky klíč/hodnota nad uzlem) a správce oken. Chrome je v
 *  base_window.js; tady je tělo detailu + WindowManager (detail i control).
 *  Čisté funkce buildRows/windowsToRefresh jsou tu, clampToCanvas/dockLayout
 *  se re-exportují z base_window.js (zpětná kompatibilita testů). */
import { BaseWindow, clampToCanvas, dockLayout } from './base_window.js';
import { ControlWindow } from './control_window.js';

export { clampToCanvas, dockLayout };

const CONTROL_WIDTH_CHARS = 30;

/** node + šablona řádků → pole {label, value}.
 *  rowsTemplate = pole dvojic [label, metaKey]; null = jeden řádek na meta. */
export function buildRows(node, rowsTemplate) {
  const meta = node?.meta ?? {};
  if (rowsTemplate == null) {
    return Object.entries(meta).map(([key, value]) => ({
      label: key, value: String(value ?? ''),
    }));
  }
  return rowsTemplate.map(([label, key]) => ({
    label, value: String(meta[key] ?? ''),
  }));
}

/** Z patche a množiny otevřených (detailních) oken urči, co překreslit a co
 *  zavřít. remove má přednost před update (uzel v obou → jen close). */
export function windowsToRefresh(patch, openIds) {
  const open = openIds instanceof Set ? openIds : new Set(openIds);
  const close = (patch.remove_nodes ?? []).filter((id) => open.has(id));
  const closing = new Set(close);
  const refresh = (patch.update_nodes ?? [])
    .map((n) => n.id)
    .filter((id) => open.has(id) && !closing.has(id));
  return { refresh, close };
}

/** Detailní okno: tělo = tabulka řádků klíč/hodnota; klik na hodnotu kopíruje. */
export class DetailWindow extends BaseWindow {
  constructor({ nodeId, title, rows, widthChars, container, manager }) {
    super({ id: nodeId, title, widthChars, container, manager, kind: 'detail' });
    this.nodeId = nodeId;
    this.rows = rows;
    this._buildBody();
    this._mount();
  }

  _buildBody() {
    const body = document.createElement('div');
    body.dataset.role = 'detail-body';
    body.style.cssText = [
      'padding:6px 10px', `width:${this.widthChars}ch`, 'max-width:90vw',
      'font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace',
      'overflow:auto',
    ].join(';');
    this.body = body;
    this._renderBody();
    this.el.appendChild(body);
  }

  _renderBody() {
    this.body.replaceChildren();
    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;width:100%';
    for (const { label, value } of this.rows) {
      const tr = table.insertRow();
      const keyCell = tr.insertCell();
      keyCell.textContent = label;
      keyCell.style.cssText = [
        'padding:1px 12px 1px 0', 'vertical-align:top', 'white-space:nowrap',
        'color:var(--vb-window-key, #667788)',
      ].join(';');
      const valCell = tr.insertCell();
      valCell.dataset.role = 'detail-value';
      valCell.textContent = value;
      valCell.style.cssText = [
        'padding:1px 0', 'word-break:break-all', 'cursor:copy',
      ].join(';');
      valCell.addEventListener('click', (e) => {
        e.stopPropagation();
        this._copy(value, valCell);
      });
    }
    this.body.appendChild(table);
  }

  _copy(value, cell) {
    const flash = () => {
      cell.style.transition = 'background 0.15s';
      const prev = cell.style.background;
      cell.style.background = 'var(--vb-window-gadget, #8a93a3)';
      setTimeout(() => { cell.style.background = prev; }, 180);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(flash).catch(() => {
        this._execCopy(value); flash();
      });
    } else {
      this._execCopy(value); flash();
    }
  }

  _execCopy(value) {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      console.warn('viewbase: kopírování do schránky selhalo');
    }
  }

  update({ title, rows }) {
    if (title != null) {
      this.title = title;
      this.titleEl.textContent = title;
    }
    if (rows != null) {
      this.rows = rows;
      if (!this.isMinimized) this._renderBody();
    }
  }
}

/** Spravuje detailní i control okna nad app kontejnerem: otevírání, z-order,
 *  dok, živé patche (jen detailní okna). */
export class WindowManager {
  constructor(container, store, getTheme = () => null) {
    this.container = container;
    this.store = store;
    this.getTheme = getTheme;
    this.windows = new Map();        // id -> BaseWindow (nodeId | window_id)
    this.z = 900;
    this.dockSlots = [];
  }

  _config() {
    const dw = this.store.config?.detail_window;
    return dw ?? { rows: null, width_chars: 128, open_on_click: true };
  }

  openFor(nodeId) {
    const existing = this.windows.get(nodeId);
    if (existing) {
      if (existing.isMinimized) existing.restore();
      else existing.bringToFront();
      return existing;
    }
    const node = this.store.nodes.get(nodeId);
    if (!node) return null;
    const cfg = this._config();
    const win = new DetailWindow({
      nodeId,
      title: node.label,
      rows: buildRows(node, cfg.rows),
      widthChars: cfg.width_chars,
      container: this.container,
      manager: this,
    });
    this.windows.set(nodeId, win);
    win.bringToFront();
    return win;
  }

  openControl(spec, onSubmit) {
    const existing = this.windows.get(spec.window_id);
    if (existing) existing.close();          // nahrazení stejného window_id
    const win = new ControlWindow({
      id: spec.window_id,
      title: spec.title,
      fields: spec.fields,
      widthChars: CONTROL_WIDTH_CHARS,
      onSubmit,
      container: this.container,
      manager: this,
    });
    this.windows.set(spec.window_id, win);
    win.bringToFront();
    return win;
  }

  closeControl(windowId) {
    this.windows.get(windowId)?.close();
  }

  onPatch(patch) {
    const detailIds = new Set();
    for (const [id, win] of this.windows) {
      if (win.kind === 'detail') detailIds.add(id);
    }
    if (detailIds.size === 0) return;
    const { refresh, close } = windowsToRefresh(patch, detailIds);
    for (const id of close) this.windows.get(id)?.close();
    const cfg = this._config();
    for (const id of refresh) {
      const win = this.windows.get(id);
      const node = this.store.nodes.get(id);
      if (win && node) {
        win.update({ title: node.label, rows: buildRows(node, cfg.rows) });
      }
    }
  }

  applyTheme() {
    for (const win of this.windows.values()) win.applyTheme();
  }

  close(nodeId) {
    this.windows.get(nodeId)?.close();
  }

  _nextZ() {
    this.z += 1;
    return this.z;
  }

  _assignDockSlot(win) {
    let i = this.dockSlots.indexOf(null);
    if (i === -1) { i = this.dockSlots.length; this.dockSlots.push(win); }
    else this.dockSlots[i] = win;
    win._dockSlot = i;
    return i;
  }

  _releaseDockSlot(win) {
    const i = win._dockSlot;
    if (i != null && this.dockSlots[i] === win) this.dockSlots[i] = null;
    win._dockSlot = null;
  }

  _forget(id) {
    this.windows.delete(id);
  }
}
```

- [ ] **Step 5: Vytvoř `control_window.js`**

Vytvoř `frontend/src/render/control_window.js`:

```js
/** Control okno: formulářové tělo (int slider+číslo, string text, enum select)
 *  + tlačítko Použít, které pošle všechny hodnoty zpět. Chrome dědí z
 *  BaseWindow. Čisté helpery clampValue/readValues zrcadlí backend validaci. */
import { BaseWindow } from './base_window.js';

/** Zvaliduj jednu hodnotu podle field descriptoru (zrcadlo backendu).
 *  Při nepoužitelné hodnotě ponech field.value. */
export function clampValue(field, raw) {
  if (field.type === 'int') {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return field.value;
    return Math.max(field.min, Math.min(field.max, n));
  }
  if (field.type === 'string') {
    return String(raw ?? '').slice(0, field.maxlength);
  }
  if (field.type === 'enum') {
    return field.options.some((o) => o.value === raw) ? raw : field.value;
  }
  return field.value;
}

/** rawMap {key: hodnota z widgetu} → {key: clampValue(...)} jen pro známé klíče. */
export function readValues(fields, rawMap) {
  const out = {};
  for (const field of fields) {
    if (field.key in rawMap) out[field.key] = clampValue(field, rawMap[field.key]);
  }
  return out;
}

export class ControlWindow extends BaseWindow {
  constructor({ id, title, fields, widthChars, onSubmit, container, manager }) {
    super({ id, title, widthChars, container, manager, kind: 'control' });
    this.fields = fields;
    this.onSubmit = onSubmit;
    this.inputs = new Map();        // key -> () => rawValue
    this._buildBody();
    this._mount();
  }

  _buildBody() {
    const body = document.createElement('div');
    body.dataset.role = 'control-body';
    body.style.cssText = [
      'padding:8px 10px', `width:${this.widthChars}ch`, 'max-width:90vw',
      'font:13px/1.5 system-ui,sans-serif',
    ].join(';');
    this.body = body;

    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;width:100%';
    for (const field of this.fields) {
      const tr = table.insertRow();
      const keyCell = tr.insertCell();
      keyCell.textContent = field.label;
      keyCell.style.cssText = [
        'padding:3px 10px 3px 0', 'white-space:nowrap',
        'color:var(--vb-window-key, #667788)',
      ].join(';');
      const valCell = tr.insertCell();
      valCell.style.cssText = 'padding:3px 0';
      this.inputs.set(field.key, this._buildWidget(field, valCell));
    }
    body.appendChild(table);

    const apply = document.createElement('button');
    apply.dataset.role = 'control-apply';
    apply.textContent = 'Použít';
    apply.style.cssText = [
      'margin-top:8px', 'padding:3px 12px', 'cursor:pointer',
      'border:1px solid var(--vb-window-gadget, #8a93a3)', 'border-radius:4px',
      'background:transparent', 'color:inherit',
    ].join(';');
    apply.addEventListener('click', (e) => {
      e.stopPropagation();
      this._submit();
    });
    body.appendChild(apply);
    this.el.appendChild(body);
  }

  _buildWidget(field, cell) {
    if (field.type === 'enum') {
      const sel = document.createElement('select');
      for (const opt of field.options) {
        const o = document.createElement('option');
        o.value = String(opt.value);
        o.textContent = opt.label;
        if (opt.value === field.value) o.selected = true;
        sel.appendChild(o);
      }
      cell.appendChild(sel);
      return () => sel.value;
    }
    if (field.type === 'int') {
      const range = document.createElement('input');
      range.type = 'range';
      range.min = field.min; range.max = field.max;
      range.step = field.step ?? 1; range.value = field.value;
      const num = document.createElement('input');
      num.type = 'number';
      num.min = field.min; num.max = field.max;
      num.step = field.step ?? 1; num.value = field.value;
      num.style.cssText = 'width:5em;margin-left:6px';
      range.addEventListener('input', () => { num.value = range.value; });
      num.addEventListener('input', () => { range.value = num.value; });
      cell.append(range, num);
      return () => num.value;
    }
    // string
    const text = document.createElement('input');
    text.type = 'text';
    text.maxLength = field.maxlength;
    text.value = field.value;
    cell.appendChild(text);
    return () => text.value;
  }

  _submit() {
    const rawMap = {};
    for (const [key, get] of this.inputs) rawMap[key] = get();
    const values = readValues(this.fields, rawMap);
    if (this.onSubmit) this.onSubmit({ window_id: this.id, values });
  }

  _renderBody() {
    // formulář persistuje v DOM; téma ani obnova nevyžadují rebuild
  }
}
```

- [ ] **Step 6: Ověř vitest (čisté helpery) + že stávající okna testy drží**

Run: `cd frontend && npx vitest run tests/control_window.test.js tests/windows.test.js`
Expected: PASS — control_window helpery zelené, `windows.test.js` (buildRows/clampToCanvas/dockLayout/windowsToRefresh) beze změny zelené.

- [ ] **Step 7: Build**

Run: `cd frontend && npm run build`
Expected: build projde bez chyb (žádný cyklický import ani chybějící export).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/render/base_window.js frontend/src/render/windows.js frontend/src/render/control_window.js frontend/tests/control_window.test.js
git commit -m "$(printf 'feat: BaseWindow extrakce + ControlWindow (formulář, Použít)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 5: Frontend — drátování (store + main)

**Files:**
- Modify: `frontend/src/core/store.js`
- Modify: `frontend/src/main.js`

- [ ] **Step 1: Store nese windows z initu**

V `frontend/src/core/store.js`, v konstruktoru za `this.flows = [];` přidej:

```js
    this.windows = [];
```

V `applyInit(msg)` za `this.flows = msg.flows ?? [];` přidej:

```js
    this.windows = msg.windows ?? [];
```

- [ ] **Step 2: main.js – submit, routování akcí, init replay**

V `frontend/src/main.js`, do objektu `actions` (za řádek `set_theme: (msg) => {...},` — tj. za celou jeho closure) přidej tři akce a nad `actions` přidej `submit`:

Nejprve hned za `const status = new StatusOverlay();` (nahoře) NIC neměň. V `bootstrap()`, těsně před `const actions = {` vlož:

```js
  const submitWindow = (payload) => connection.send(
    buildEvent('window_submit', payload));
```

Pozn.: `connection` je deklarováno níž jako `const`; `submitWindow` ho čte až při kliku na Použít (po inicializaci), takže closure je v pořádku.

Do objektu `actions` přidej (za `set_theme` blok):

```js
    open_window: (msg) => windowManager.openControl(msg, submitWindow),
    close_window: (msg) => windowManager.closeControl(msg.window_id),
    set_edge_style: (msg) => renderer.setEdgeStyle(msg),
```

V init subscriberu (`store.subscribe((event) => { if (event.kind !== 'init') return; ...})`), za řádek `renderer.flowController.replayInit(store.flows ?? []);` přidej:

```js
    renderer.setEdgeStyle(store.config.edge_style ?? { style: 'line', elasticity: 0 });
    for (const spec of store.windows ?? []) {
      windowManager.openControl(spec, submitWindow);
    }
```

- [ ] **Step 3: Ověř vitest + build**

Run: `cd frontend && npx vitest run`
Expected: PASS — všechny testovací soubory.

Run: `cd frontend && npm run build`
Expected: build projde bez chyb.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/core/store.js frontend/src/main.js
git commit -m "$(printf 'feat: drátování control oken + edge_style (store, main akce, init replay)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 6: Příklad + sestavení staticu + regrese

**Files:**
- Modify: `examples/showcase.py`

- [ ] **Step 1: Přidej control okno do `examples/showcase.py`**

Otevři `examples/showcase.py`. Najdi řádek `vb.serve(canvas, port=8080, open_browser=True)` (poslední řádek) a TĚSNĚ PŘED něj (a před `threading.Thread(target=provoz, ...).start()`, pokud je tam — stačí kdekoli po definici `canvas` a jeho hran) vlož:

```python
# control okno: přepínání stylu hran (čára/splajn) + elasticita
_render_win = vb.ControlWindow("render", title="Vykreslování")
_render_win.enum("style", "Hrany",
                 options=[("line", "Čáry"), ("spline", "Splajny")],
                 value="line")
_render_win.integer("elasticity", "Elasticita", min=0, max=100, value=30)


def _apply_render(event):
    canvas.set_edge_style(event.values["style"],
                          elasticity=event.values["elasticity"] / 100)


canvas.open_window(_render_win, on_submit=_apply_render)
```

(Umísti tento blok za vytvoření uzlů/hran a za případné `@canvas.on_click`, ale před `vb.serve(...)`.)

- [ ] **Step 2: Boot-check příkladu (nastartuje, nespadne)**

Run: `timeout 4 .venv/bin/python examples/showcase.py || true`
Expected: server nastartuje (uvicorn log o naslouchání na `127.0.0.1:8080`), žádný traceback z `open_window`/`ControlWindow`; po 4 s se proces ukončí.

- [ ] **Step 3: Sestav frontend do balíčku (static/)**

Run: `cd frontend && npm run build`
Expected: build projde; `python/viewbase/static/` je aktualizovaný (Vite vypíše velikosti).

- [ ] **Step 4: Celá regrese – backend + frontend**

Run: `.venv/bin/python -m pytest python/tests -q`
Expected: PASS — vše zelené (jádro + nové testy oken).

Run: `cd frontend && npx vitest run`
Expected: PASS — všech (původních + `edges.test.js` + `control_window.test.js`) souborů.

- [ ] **Step 5: Manuální vizuální kontrola (checklist)**

Spusť `.venv/bin/python examples/showcase.py`, v prohlížeči ověř:
- [ ] Vlevo nahoře (kaskáda) se otevře okno „Vykreslování" s `select` (Čáry/Splajny), `range`+číslo (Elasticita) a tlačítkem Použít.
- [ ] Přepni na „Splajny", elasticitu ~60, klikni Použít → hrany se prohnou do křivek.
- [ ] Zpět „Čáry" + Použít → hrany jsou zase rovné.
- [ ] Okno jde táhnout za záhlaví, minimalizovat do doku vlevo dole a obnovit; detailní okno uzlu (klik na uzel) funguje jako dřív.
- [ ] F5 (reconnect) → okno „Vykreslování" se znovu objeví; pokud byly hrany splajny, zůstanou splajny (z `init`).

Po kontrole Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add examples/showcase.py python/viewbase/static
git commit -m "$(printf 'feat: showcase – control okno přepíná hrany čára/splajn + elasticita\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Self-Review (proběhlo při psaní)

**Spec coverage:** field descriptor (int/string/enum) → controls.py (T1); `ControlWindow` builders + `validate_values` → T1; `open_window`/`close_window`/`set_edge_style`/`_on_window_submit` + snapshot windows + config.edge_style → T2; protocol windows → T2; export → T2; křivkové hrany + `bezierEdgePoints` + renderer → T3; `BaseWindow` extrakce + `ControlWindow` + zobecněný `WindowManager` → T4; čisté `clampValue`/`readValues` → T4; store/main drátování + init replay → T5; příklad showcase + Použít flow + reconnect → T6. Vše pokryto.

**Type/název consistency:** field tvar `{key,label,type,value,+constraints}` shodný backend (`controls.py`) i frontend (`clampValue`); akce `open_window`/`close_window`/`set_edge_style`, event `window_submit`, payload `{window_id, values}` shodné napříč Canvas/protokol/main/control_window; `bezierEdgePoints(a,b,elasticity,segments)`, `EDGE_SEGMENTS` shodné edges.js↔renderer; `WindowManager.openFor/openControl/closeControl`, `BaseWindow.kind`, `_mount/_buildBody/_renderBody` konzistentní.

**Placeholder scan:** žádné TBD/TODO; každý krok nese konkrétní kód a příkaz s očekávaným výstupem.
