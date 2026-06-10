# Plán 1: Chodící kostra viewbase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Funkční páteř knihovny viewbase: Python Canvas API → FastAPI/WebSocket delty → frontend (GraphStore, fyzika d3-force-3d ve Web Workeru, instancovaný Three.js renderer) — `python examples/quickstart.py` zobrazí v prohlížeči živý, plynule se usazující graf.

**Architecture:** Backend je zdroj pravdy (data/metadata), posílá delty přes WebSocket (JSON, seq čísla). Klient zrcadlí stav v GraphStore, fyziku počítá d3-force-3d ve workeru (Barnes-Hut, transferable Float32Array), renderer interpoluje a kreslí instancovaně. Pozice po síti necestují. Viz spec `docs/superpowers/specs/2026-06-10-viewbase-library-design.md`.

**Tech Stack:** Python 3.10+ (FastAPI, uvicorn, pytest, httpx), JS (Vite, vitest, three, d3-force-3d).

**Předpoklady:** příkazy se spouštějí z kořene repa; aktivní venv (`source .venv/bin/activate`); Node.js ≥ 20.

**Konvence protokolu (závazné pro všechny tasky):**
- Zprávy: `hello` ↑, `init` ↓, `patch` ↓, `error` ↓. Patch nese klíče `add_nodes`, `update_nodes`, `remove_nodes` (id), `add_edges`, `remove_edges` (páry `[a, b]`).
- Klient aplikuje patch v pořadí: remove_edges → remove_nodes → add_nodes → update_nodes → add_edges. Adds/updates jsou **upserty**, remove neexistujícího je no-op (idempotence — init může předběhnout patch o tatáž data).
- Hrana je neorientovaná, kanonický klíč = lexikograficky seřazená dvojice.
- Mezera v `seq` na klientovi ⇒ zavřít spojení, reconnect přinese čerstvý `init`.

---

### Task 1: Přesun prototypu do legacy/

**Files:**
- Move: `index.html`, `scene.js`, `label_controller.js`, `edges_controller.js`, `global_controller.js`, `fetchWorker.js`, `computeWorker.js`, `style.css`, `main.py`, `nodes_test.json`, `requirements.txt`, `README.md`, `graph_server/` → `legacy/`
- Create: `README.md` (nový stub)
- Modify: `.gitignore`

- [ ] **Step 1: Přesun souborů**

```bash
mkdir legacy
git mv index.html scene.js label_controller.js edges_controller.js global_controller.js \
       fetchWorker.js computeWorker.js style.css main.py nodes_test.json requirements.txt \
       README.md graph_server legacy/
```

- [ ] **Step 2: Nový README stub**

Vytvoř `README.md`:

```markdown
# viewbase

Živá 2D/3D force-graph vizualizace ovládaná z Pythonu.

- Návrh: `docs/superpowers/specs/2026-06-10-viewbase-library-design.md`
- Plány: `docs/superpowers/plans/`
- Původní prototyp: `legacy/` (referenční, postupně zmizí)

## Vývoj

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e "python[dev]"
(cd frontend && npm install && npm run build)
python examples/quickstart.py
```
```

- [ ] **Step 3: Doplnit .gitignore**

Přidej do `.gitignore` řádky:

```
node_modules/
python/viewbase/static/
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: přesun prototypu do legacy/, příprava na strukturu knihovny"
```

---

### Task 2: Skeleton Python balíčku

**Files:**
- Create: `python/pyproject.toml`, `python/viewbase/__init__.py`, `python/tests/test_smoke.py`

- [ ] **Step 1: pyproject.toml**

Vytvoř `python/pyproject.toml`:

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "viewbase"
version = "0.1.0"
description = "Živá 2D/3D force-graph vizualizace ovládaná z Pythonu"
requires-python = ">=3.10"
dependencies = [
    "fastapi>=0.110",
    "uvicorn[standard]>=0.29",
]

[project.optional-dependencies]
dev = [
    "pytest>=8",
    "httpx>=0.27",
]

[tool.hatch.build.targets.wheel]
packages = ["viewbase"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

- [ ] **Step 2: Prázdný balíček a smoke test**

Vytvoř `python/viewbase/__init__.py`:

```python
"""viewbase – živá 2D/3D force-graph vizualizace ovládaná z Pythonu."""

__version__ = "0.1.0"
```

Vytvoř `python/tests/test_smoke.py`:

```python
import viewbase


def test_package_imports():
    assert viewbase.__version__ == "0.1.0"
```

- [ ] **Step 3: Instalace a ověření**

```bash
pip install -e "python[dev]"
cd python && python -m pytest -v && cd ..
```

Očekávané: `1 passed`.

- [ ] **Step 4: Commit**

```bash
git add python
git commit -m "feat: skeleton pip balíčku viewbase"
```

---

### Task 3: protocol.py — zprávy protokolu

**Files:**
- Create: `python/viewbase/protocol.py`
- Test: `python/tests/test_protocol.py`

- [ ] **Step 1: Failing testy**

Vytvoř `python/tests/test_protocol.py`:

```python
import pytest

from viewbase import protocol


def test_init_roundtrip():
    msg = protocol.init_message(
        seq=3, config={"dimensions": 3}, node_types={},
        nodes=[{"id": "a"}], edges=[],
    )
    decoded = protocol.decode(protocol.encode(msg))
    assert decoded == msg
    assert decoded["type"] == "init"
    assert decoded["protocol"] == protocol.PROTOCOL_VERSION


def test_patch_message_carries_deltas():
    msg = protocol.patch_message(7, {"add_nodes": [{"id": "x"}], "remove_nodes": []})
    assert msg["type"] == "patch"
    assert msg["seq"] == 7
    assert msg["add_nodes"] == [{"id": "x"}]


def test_decode_rejects_non_message():
    with pytest.raises(ValueError):
        protocol.decode('"jen text"')
    with pytest.raises(ValueError):
        protocol.decode('{"missing": "type"}')
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd python && python -m pytest tests/test_protocol.py -v`
Expected: FAIL — `ImportError: cannot import name 'protocol'`.

- [ ] **Step 3: Implementace**

Vytvoř `python/viewbase/protocol.py`:

```python
"""Zprávy protokolu viewbase (server <-> klient), verze 1."""
from __future__ import annotations

import json
from typing import Any

PROTOCOL_VERSION = 1


def init_message(*, seq: int, config: dict, node_types: dict,
                 nodes: list, edges: list) -> dict[str, Any]:
    return {
        "type": "init",
        "protocol": PROTOCOL_VERSION,
        "seq": seq,
        "config": config,
        "node_types": node_types,
        "nodes": nodes,
        "edges": edges,
    }


def patch_message(seq: int, deltas: dict[str, list]) -> dict[str, Any]:
    message: dict[str, Any] = {"type": "patch", "seq": seq}
    message.update(deltas)
    return message


def encode(message: dict) -> str:
    return json.dumps(message, separators=(",", ":"))


def decode(raw: str) -> dict[str, Any]:
    message = json.loads(raw)
    if not isinstance(message, dict) or "type" not in message:
        raise ValueError("Zpráva musí být JSON objekt s polem 'type'")
    return message
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd python && python -m pytest tests/test_protocol.py -v`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add python/viewbase/protocol.py python/tests/test_protocol.py
git commit -m "feat: zprávy protokolu v1 (init, patch, encode/decode)"
```

---

### Task 4: Canvas — uzly, hrany, validace, labely

**Files:**
- Create: `python/viewbase/canvas.py`
- Modify: `python/viewbase/__init__.py`
- Test: `python/tests/test_canvas.py`

- [ ] **Step 1: Failing testy**

Vytvoř `python/tests/test_canvas.py`:

```python
import pytest

from viewbase import Canvas


def test_add_node_and_edge_snapshot():
    c = Canvas()
    c.add_node("a", name="Alfa")
    c.add_node("b")
    c.add_edge("a", "b", weight=2)
    snap = c.snapshot()
    assert [n["id"] for n in snap["nodes"]] == ["a", "b"]
    assert snap["edges"] == [{"source": "a", "target": "b", "meta": {"weight": 2}}]


def test_config_in_snapshot():
    c = Canvas(title="T", dimensions=2, theme="cyber", highlight_neighbors=2)
    cfg = c.snapshot()["config"]
    assert cfg == {"title": "T", "dimensions": 2, "theme": "cyber",
                   "highlight_neighbors": 2}


def test_invalid_dimensions_raises():
    with pytest.raises(ValueError):
        Canvas(dimensions=4)


def test_duplicate_node_raises():
    c = Canvas()
    c.add_node("a")
    with pytest.raises(ValueError):
        c.add_node("a")


def test_edge_requires_existing_nodes_and_no_duplicates():
    c = Canvas()
    c.add_node("a")
    with pytest.raises(ValueError):
        c.add_edge("a", "missing")
    c.add_node("b")
    c.add_edge("a", "b")
    with pytest.raises(ValueError):
        c.add_edge("b", "a")  # neorientovaná hrana už existuje
    with pytest.raises(ValueError):
        c.add_edge("a", "a")  # smyčka


def test_unknown_node_type_raises():
    c = Canvas()
    with pytest.raises(ValueError):
        c.add_node("a", type="server")
    c.define_type("server", shape="box")
    c.add_node("a", type="server")
    assert c.snapshot()["node_types"] == {"server": {"shape": "box"}}


def test_remove_node_cascades_edges():
    c = Canvas()
    c.add_node("a")
    c.add_node("b")
    c.add_edge("a", "b")
    c.remove_node("a")
    snap = c.snapshot()
    assert snap["edges"] == []
    assert [n["id"] for n in snap["nodes"]] == ["b"]


def test_update_and_remove_missing_raises():
    c = Canvas()
    with pytest.raises(ValueError):
        c.update_node("ghost", x=1)
    with pytest.raises(ValueError):
        c.remove_node("ghost")
    c.add_node("a")
    with pytest.raises(ValueError):
        c.remove_edge("a", "ghost")


def test_label_template_and_missing_key(caplog):
    c = Canvas()
    with caplog.at_level("WARNING", logger="viewbase"):
        c.add_node("a", label="{name} ({ip})", name="Web")
    node = c.snapshot()["nodes"][0]
    assert node["label"] == "Web ()"
    assert "ip" in caplog.text


def test_label_defaults_to_id():
    c = Canvas()
    c.add_node("a")
    assert c.snapshot()["nodes"][0]["label"] == "a"
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd python && python -m pytest tests/test_canvas.py -v`
Expected: FAIL — `ImportError: cannot import name 'Canvas'`.

- [ ] **Step 3: Implementace**

Vytvoř `python/viewbase/canvas.py` (delty a `drain`/`batch` přijdou v Tasku 5 — tady je celá třída včetně přípravy `_pending`, aby se v Tasku 5 jen doplňovalo):

```python
"""Canvas – zdroj pravdy grafu a veřejné API knihovny."""
from __future__ import annotations

import logging
import re
import threading
from contextlib import contextmanager
from typing import Any, Iterator

logger = logging.getLogger("viewbase")

_LABEL_KEY = re.compile(r"\{([^{}]+)\}")


def _edge_key(source: str, target: str) -> tuple[str, str]:
    """Neorientovaná hrana má kanonický klíč: lexikograficky seřazenou dvojici."""
    return (source, target) if source <= target else (target, source)


class Canvas:
    """Thread-safe model grafu. Mutace se hromadí jako delty pro server."""

    def __init__(self, *, title: str = "viewbase", dimensions: int = 3,
                 theme: str = "modern", highlight_neighbors: int = 1):
        if dimensions not in (2, 3):
            raise ValueError("dimensions musí být 2 nebo 3")
        self.config = {
            "title": title,
            "dimensions": dimensions,
            "theme": theme,
            "highlight_neighbors": highlight_neighbors,
        }
        self._lock = threading.RLock()
        self._nodes: dict[str, dict[str, Any]] = {}
        self._edges: dict[tuple[str, str], dict[str, Any]] = {}
        self._node_types: dict[str, dict[str, Any]] = {}
        self._seq = 0
        self._batch_depth = 0
        self._pending = self._empty_pending()

    @staticmethod
    def _empty_pending() -> dict[str, dict]:
        return {
            "add_nodes": {},      # id -> payload
            "update_nodes": {},   # id -> payload
            "remove_nodes": {},   # id -> True
            "add_edges": {},      # key -> payload
            "remove_edges": {},   # key -> True
        }

    # ---- typy ----------------------------------------------------------

    def define_type(self, name: str, **style: Any) -> None:
        """Definuj typ uzlu. V Plánu 1 se propaguje jen přes init (volat před serve)."""
        with self._lock:
            self._node_types[name] = dict(style)

    # ---- uzly ----------------------------------------------------------

    def add_node(self, node_id: str, *, type: str | None = None,
                 label: str | None = None, **meta: Any) -> None:
        with self._lock:
            if node_id in self._nodes:
                raise ValueError(f"Uzel '{node_id}' už existuje")
            if type is not None and type not in self._node_types:
                raise ValueError(
                    f"Neznámý typ uzlu '{type}' – nejdřív zavolej define_type")
            node = {"id": node_id, "type": type,
                    "label_template": label, "meta": dict(meta)}
            self._nodes[node_id] = node
            self._pending["add_nodes"][node_id] = self._public_node(node)

    def update_node(self, node_id: str, **meta: Any) -> None:
        with self._lock:
            if node_id not in self._nodes:
                raise ValueError(f"Uzel '{node_id}' neexistuje")
            node = self._nodes[node_id]
            node["meta"].update(meta)
            payload = self._public_node(node)
            if node_id in self._pending["add_nodes"]:
                self._pending["add_nodes"][node_id] = payload
            else:
                self._pending["update_nodes"][node_id] = payload

    def remove_node(self, node_id: str) -> None:
        with self._lock:
            if node_id not in self._nodes:
                raise ValueError(f"Uzel '{node_id}' neexistuje")
            for key in [k for k in self._edges if node_id in k]:
                self._remove_edge_locked(key)
            del self._nodes[node_id]
            self._pending["update_nodes"].pop(node_id, None)
            if self._pending["add_nodes"].pop(node_id, None) is None:
                self._pending["remove_nodes"][node_id] = True

    # ---- hrany ---------------------------------------------------------

    def add_edge(self, source: str, target: str, **meta: Any) -> None:
        with self._lock:
            if source not in self._nodes or target not in self._nodes:
                raise ValueError(
                    f"Hrana {source}–{target}: oba uzly musí existovat")
            if source == target:
                raise ValueError("Hrana nesmí vést z uzlu do něj samého")
            key = _edge_key(source, target)
            if key in self._edges:
                raise ValueError(f"Hrana {key[0]}–{key[1]} už existuje")
            edge = {"source": key[0], "target": key[1], "meta": dict(meta)}
            self._edges[key] = edge
            self._pending["add_edges"][key] = dict(edge)

    def remove_edge(self, source: str, target: str) -> None:
        with self._lock:
            key = _edge_key(source, target)
            if key not in self._edges:
                raise ValueError(f"Hrana {source}–{target} neexistuje")
            self._remove_edge_locked(key)

    def _remove_edge_locked(self, key: tuple[str, str]) -> None:
        del self._edges[key]
        if self._pending["add_edges"].pop(key, None) is None:
            self._pending["remove_edges"][key] = True

    # ---- labely --------------------------------------------------------

    def _render_label(self, node: dict[str, Any]) -> str:
        template = node["label_template"]
        if template is None:
            return node["id"]

        def substitute(match: re.Match[str]) -> str:
            key = match.group(1)
            if key in node["meta"]:
                return str(node["meta"][key])
            logger.warning(
                "Uzel '%s': klíč '%s' z label šablony chybí v metadatech",
                node["id"], key)
            return ""

        return _LABEL_KEY.sub(substitute, template)

    def _public_node(self, node: dict[str, Any]) -> dict[str, Any]:
        return {"id": node["id"], "type": node["type"],
                "label": self._render_label(node), "meta": dict(node["meta"])}

    # ---- snapshot ------------------------------------------------------

    def snapshot(self) -> dict[str, Any]:
        """Úplný stav pro init zprávu. Pozn.: pending delty jsou už součástí
        stavu – klient proto aplikuje adds jako upserty (idempotence)."""
        with self._lock:
            return {
                "seq": self._seq,
                "config": dict(self.config),
                "node_types": {n: dict(s) for n, s in self._node_types.items()},
                "nodes": [self._public_node(n) for n in self._nodes.values()],
                "edges": [dict(e) for e in self._edges.values()],
            }
```

Uprav `python/viewbase/__init__.py`:

```python
"""viewbase – živá 2D/3D force-graph vizualizace ovládaná z Pythonu."""
from .canvas import Canvas

__all__ = ["Canvas"]
__version__ = "0.1.0"
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd python && python -m pytest tests/test_canvas.py -v`
Expected: `10 passed`.

- [ ] **Step 5: Commit**

```bash
git add python/viewbase/canvas.py python/viewbase/__init__.py python/tests/test_canvas.py
git commit -m "feat: Canvas – uzly, hrany, validace, label šablony"
```

---

### Task 5: Canvas — delty, drain s kompakcí, batch

**Files:**
- Modify: `python/viewbase/canvas.py`
- Test: `python/tests/test_deltas.py`

- [ ] **Step 1: Failing testy**

Vytvoř `python/tests/test_deltas.py`:

```python
from viewbase import Canvas


def drain_deltas(c):
    drained = c.drain()
    assert drained is not None
    return drained[1]


def test_drain_empty_returns_none():
    assert Canvas().drain() is None


def test_seq_increments_per_drain():
    c = Canvas()
    c.add_node("a")
    seq1, _ = c.drain()
    c.add_node("b")
    seq2, _ = c.drain()
    assert (seq1, seq2) == (1, 2)
    assert c.snapshot()["seq"] == 2


def test_drain_has_all_five_keys():
    c = Canvas()
    c.add_node("a")
    deltas = drain_deltas(c)
    assert set(deltas) == {"add_nodes", "update_nodes", "remove_nodes",
                           "add_edges", "remove_edges"}


def test_add_then_remove_in_one_window_cancels_out():
    c = Canvas()
    c.add_node("a")
    c.remove_node("a")
    assert c.drain() is None


def test_remove_then_add_keeps_both():
    c = Canvas()
    c.add_node("a")
    c.drain()                      # klienti už uzel znají
    c.remove_node("a")
    c.add_node("a", fresh=True)
    deltas = drain_deltas(c)
    assert deltas["remove_nodes"] == ["a"]
    assert [n["id"] for n in deltas["add_nodes"]] == ["a"]


def test_update_folds_into_pending_add():
    c = Canvas()
    c.add_node("a")
    c.update_node("a", x=1)
    deltas = drain_deltas(c)
    assert deltas["update_nodes"] == []
    assert deltas["add_nodes"][0]["meta"] == {"x": 1}


def test_remove_node_emits_edge_removals():
    c = Canvas()
    c.add_node("a")
    c.add_node("b")
    c.add_edge("a", "b")
    c.drain()
    c.remove_node("a")
    deltas = drain_deltas(c)
    assert deltas["remove_edges"] == [["a", "b"]]
    assert deltas["remove_nodes"] == ["a"]


def test_batch_holds_deltas_until_exit():
    c = Canvas()
    with c.batch():
        c.add_node("a")
        c.add_node("b")
        assert c.drain() is None
    deltas = drain_deltas(c)
    assert len(deltas["add_nodes"]) == 2
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd python && python -m pytest tests/test_deltas.py -v`
Expected: FAIL — `AttributeError: 'Canvas' object has no attribute 'drain'`.

- [ ] **Step 3: Implementace**

Do `python/viewbase/canvas.py` přidej na konec třídy `Canvas` (za `snapshot`):

```python
    # ---- delty ---------------------------------------------------------

    @contextmanager
    def batch(self) -> Iterator[None]:
        """Podrž delty pohromadě – odejdou jako jeden patch po opuštění bloku."""
        with self._lock:
            self._batch_depth += 1
        try:
            yield
        finally:
            with self._lock:
                self._batch_depth -= 1

    def drain(self) -> tuple[int, dict[str, list]] | None:
        """Vrátí (seq, delty) k odeslání, nebo None když není co poslat."""
        with self._lock:
            if self._batch_depth > 0:
                return None
            if not any(self._pending.values()):
                return None
            deltas = {
                "remove_edges": [list(k) for k in self._pending["remove_edges"]],
                "remove_nodes": list(self._pending["remove_nodes"]),
                "add_nodes": list(self._pending["add_nodes"].values()),
                "update_nodes": list(self._pending["update_nodes"].values()),
                "add_edges": list(self._pending["add_edges"].values()),
            }
            self._pending = self._empty_pending()
            self._seq += 1
            return self._seq, deltas
```

- [ ] **Step 4: Ověřit průchod (všechny testy)**

Run: `cd python && python -m pytest -v`
Expected: všechny testy PASS (smoke + protocol + canvas + deltas).

- [ ] **Step 5: Commit**

```bash
git add python/viewbase/canvas.py python/tests/test_deltas.py
git commit -m "feat: delty s kompakcí, drain a batch na Canvasu"
```

---

### Task 6: server.py — FastAPI, WS handshake a broadcast patchů

**Files:**
- Create: `python/viewbase/server.py`
- Modify: `python/viewbase/__init__.py`
- Test: `python/tests/test_server.py`

- [ ] **Step 1: Failing testy**

Vytvoř `python/tests/test_server.py`:

```python
from fastapi.testclient import TestClient

from viewbase import Canvas, create_app, protocol


def make_client(canvas: Canvas) -> TestClient:
    return TestClient(create_app(canvas))


def hello() -> str:
    return protocol.encode({"type": "hello", "protocol": protocol.PROTOCOL_VERSION})


def test_hello_gets_init():
    canvas = Canvas(title="T")
    canvas.add_node("a")
    with make_client(canvas) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(hello())
            msg = protocol.decode(ws.receive_text())
            assert msg["type"] == "init"
            assert msg["config"]["title"] == "T"
            assert [n["id"] for n in msg["nodes"]] == ["a"]


def test_protocol_mismatch_gets_error():
    with make_client(Canvas()) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(protocol.encode({"type": "hello", "protocol": 999}))
            msg = protocol.decode(ws.receive_text())
            assert msg == {"type": "error", "error": "protocol_mismatch"}


def test_mutation_streams_patch():
    canvas = Canvas()
    with make_client(canvas) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(hello())
            init = protocol.decode(ws.receive_text())
            assert init["type"] == "init"
            canvas.add_node("novy")
            msg = protocol.decode(ws.receive_text())   # broadcast smyčka ~30 Hz
            assert msg["type"] == "patch"
            assert msg["seq"] == init["seq"] + 1
            assert [n["id"] for n in msg["add_nodes"]] == ["novy"]
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd python && python -m pytest tests/test_server.py -v`
Expected: FAIL — `ImportError: cannot import name 'create_app'`.

- [ ] **Step 3: Implementace**

Vytvoř `python/viewbase/server.py`:

```python
"""FastAPI server: statické assety + WebSocket protokol + runner."""
from __future__ import annotations

import asyncio
import logging
import threading
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


async def _broadcast_loop(canvas: Canvas, clients: set[WebSocket]) -> None:
    while True:
        await asyncio.sleep(PATCH_INTERVAL)
        drained = canvas.drain()
        if drained is None or not clients:
            continue
        seq, deltas = drained
        raw = protocol.encode(protocol.patch_message(seq, deltas))
        for ws in list(clients):
            try:
                await ws.send_text(raw)
            except Exception:
                clients.discard(ws)


def create_app(canvas: Canvas) -> FastAPI:
    clients: set[WebSocket] = set()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        task = asyncio.create_task(_broadcast_loop(canvas, clients))
        yield
        task.cancel()

    app = FastAPI(lifespan=lifespan)

    @app.websocket("/ws")
    async def ws_endpoint(ws: WebSocket) -> None:
        await ws.accept()
        try:
            hello = protocol.decode(await ws.receive_text())
        except ValueError:
            await ws.close()
            return
        if (hello.get("type") != "hello"
                or hello.get("protocol") != protocol.PROTOCOL_VERSION):
            await ws.send_text(protocol.encode(
                {"type": "error", "error": "protocol_mismatch"}))
            await ws.close()
            return
        await ws.send_text(protocol.encode(
            protocol.init_message(**canvas.snapshot())))
        clients.add(ws)
        try:
            while True:
                raw = await ws.receive_text()
                try:
                    protocol.decode(raw)   # eventy zpracuje Plán 2
                except ValueError:
                    logger.warning("Vadná zpráva od klienta: %r", raw[:200])
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

Uprav `python/viewbase/__init__.py`:

```python
"""viewbase – živá 2D/3D force-graph vizualizace ovládaná z Pythonu."""
from . import protocol
from .canvas import Canvas
from .server import create_app, serve

__all__ = ["Canvas", "create_app", "serve", "protocol"]
__version__ = "0.1.0"
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd python && python -m pytest -v`
Expected: všechny testy PASS. (`test_mutation_streams_patch` do ~33 ms dostane patch — `receive_text` blokuje, broadcast smyčka běží v lifespan tasku TestClienta.)

- [ ] **Step 5: Commit**

```bash
git add python/viewbase/server.py python/viewbase/__init__.py python/tests/test_server.py
git commit -m "feat: FastAPI server – WS handshake, init a broadcast patchů"
```

---

### Task 7: Quickstart příklad

**Files:**
- Create: `examples/quickstart.py`

- [ ] **Step 1: Příklad**

Vytvoř `examples/quickstart.py`:

```python
"""Quickstart: živý graf, do kterého každé 2 s přibude uzel."""
import random
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="Quickstart", dimensions=3)

with canvas.batch():
    for i in range(30):
        canvas.add_node(f"n{i}", value=i)
    for i in range(1, 30):
        canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")


def zivy_graf() -> None:
    i = 30
    while True:
        time.sleep(2.0)
        canvas.add_node(f"n{i}", value=i)
        canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")
        i += 1


threading.Thread(target=zivy_graf, daemon=True).start()
vb.serve(canvas, port=8080, open_browser=True)
```

- [ ] **Step 2: Ověřit, že server naběhne (frontend ještě není)**

```bash
python examples/quickstart.py & SERVER_PID=$!
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/ || true
kill $SERVER_PID
```

Očekávané: server běží bez výjimky (HTTP kód na /ws bude 4xx — WebSocket endpoint přes curl, to je v pořádku; důležité je, že proces nespadl).

- [ ] **Step 3: Commit**

```bash
git add examples/quickstart.py
git commit -m "docs: quickstart příklad živého grafu"
```

---

### Task 8: Frontend scaffolding (Vite + vitest)

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, `frontend/src/main.js` (dočasný stub)

- [ ] **Step 1: package.json**

Vytvoř `frontend/package.json`:

```json
{
  "name": "viewbase-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "three": "^0.165.0",
    "d3-force-3d": "^3.0.5"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: vite.config.js — build do python balíčku**

Vytvoř `frontend/vite.config.js`:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../python/viewbase/static',
    emptyOutDir: true,
  },
});
```

- [ ] **Step 3: index.html a stub main.js**

Vytvoř `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>viewbase</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #f4f5f7; }
    #app { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

Vytvoř `frontend/src/main.js` (stub, nahradí Task 12):

```js
console.log('viewbase frontend – kostra (Task 12 doplní bootstrap)');
```

- [ ] **Step 4: Instalace a ověření buildu**

```bash
cd frontend && npm install && npm run build && cd ..
ls python/viewbase/static/index.html
```

Očekávané: build projde, `python/viewbase/static/index.html` existuje.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: frontend scaffolding (Vite, build do viewbase/static)"
```

---

### Task 9: core/protocol.js a core/store.js (GraphStore)

**Files:**
- Create: `frontend/src/core/protocol.js`, `frontend/src/core/store.js`
- Test: `frontend/tests/store.test.js`

- [ ] **Step 1: Failing testy**

Vytvoř `frontend/tests/store.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { GraphStore } from '../src/core/store.js';

const initMsg = (over = {}) => ({
  type: 'init', protocol: 1, seq: 0,
  config: { dimensions: 3 }, node_types: {},
  nodes: [{ id: 'a', label: 'a', meta: {} }, { id: 'b', label: 'b', meta: {} }],
  edges: [{ source: 'a', target: 'b', meta: {} }],
  ...over,
});

const patchMsg = (seq, over = {}) => ({
  type: 'patch', seq,
  add_nodes: [], update_nodes: [], remove_nodes: [],
  add_edges: [], remove_edges: [],
  ...over,
});

describe('GraphStore', () => {
  it('applyInit naplní stav a nastaví seq', () => {
    const store = new GraphStore();
    store.applyInit(initMsg());
    expect(store.nodes.size).toBe(2);
    expect(store.edges.size).toBe(1);
    expect(store.seq).toBe(0);
    expect(store.config.dimensions).toBe(3);
  });

  it('patch přidá uzel s hranou a odebere uzel kaskádově', () => {
    const store = new GraphStore();
    store.applyInit(initMsg());
    const ok = store.applyPatch(patchMsg(1, {
      add_nodes: [{ id: 'c', label: 'c', meta: {} }],
      add_edges: [{ source: 'b', target: 'c', meta: {} }],
      remove_nodes: ['a'],
    }));
    expect(ok).toBe(true);
    expect(store.nodes.has('a')).toBe(false);
    expect(store.edges.has(GraphStore.edgeKey('a', 'b'))).toBe(false); // kaskáda
    expect(store.edges.has(GraphStore.edgeKey('b', 'c'))).toBe(true);
    expect(store.seq).toBe(1);
  });

  it('mezera v seq vrátí false a nic nezmění', () => {
    const store = new GraphStore();
    store.applyInit(initMsg());
    const ok = store.applyPatch(patchMsg(5, { remove_nodes: ['a'] }));
    expect(ok).toBe(false);
    expect(store.nodes.has('a')).toBe(true);
    expect(store.seq).toBe(0);
  });

  it('add existujícího uzlu je upsert, remove neznámého je no-op', () => {
    const store = new GraphStore();
    store.applyInit(initMsg());
    const ok = store.applyPatch(patchMsg(1, {
      add_nodes: [{ id: 'a', label: 'Nové A', meta: { x: 1 } }],
      remove_nodes: ['ghost'],
    }));
    expect(ok).toBe(true);
    expect(store.nodes.get('a').label).toBe('Nové A');
  });

  it('notifikuje odběratele o init i patchi', () => {
    const store = new GraphStore();
    const events = [];
    store.subscribe((e) => events.push(e.kind));
    store.applyInit(initMsg());
    store.applyPatch(patchMsg(1));
    expect(events).toEqual(['init', 'patch']);
  });
});
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run`
Expected: FAIL — nelze resolvnout `../src/core/store.js`.

- [ ] **Step 3: Implementace**

Vytvoř `frontend/src/core/protocol.js`:

```js
export const PROTOCOL_VERSION = 1;

export function hello() {
  return { type: 'hello', protocol: PROTOCOL_VERSION };
}

export function encode(message) {
  return JSON.stringify(message);
}

export function decode(raw) {
  const message = JSON.parse(raw);
  if (!message || typeof message !== 'object' || !message.type) {
    throw new Error('Neplatná zpráva protokolu');
  }
  return message;
}
```

Vytvoř `frontend/src/core/store.js`:

```js
/** Jediné zrcadlo stavu grafu na klientovi. */
export class GraphStore {
  constructor() {
    this.config = {};
    this.nodeTypes = {};
    this.nodes = new Map();   // id -> {id, type, label, meta}
    this.edges = new Map();   // edgeKey -> {source, target, meta}
    this.seq = -1;
    this.listeners = new Set();
  }

  static edgeKey(source, target) {
    return source <= target
      ? `${source}\u0000${target}`
      : `${target}\u0000${source}`;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(event) {
    for (const listener of this.listeners) listener(event);
  }

  applyInit(msg) {
    this.config = msg.config;
    this.nodeTypes = msg.node_types;
    this.nodes.clear();
    this.edges.clear();
    for (const node of msg.nodes) this.nodes.set(node.id, node);
    for (const edge of msg.edges) {
      this.edges.set(GraphStore.edgeKey(edge.source, edge.target), edge);
    }
    this.seq = msg.seq;
    this._emit({ kind: 'init' });
  }

  /** Aplikuje patch; false = mezera v seq (volající si vyžádá čerstvý init).
   *  Pevné pořadí: remove_edges, remove_nodes, add_nodes, update_nodes,
   *  add_edges. Adds/updates jsou upserty, remove neznámého je no-op. */
  applyPatch(msg) {
    if (msg.seq !== this.seq + 1) return false;
    for (const [source, target] of msg.remove_edges) {
      this.edges.delete(GraphStore.edgeKey(source, target));
    }
    for (const id of msg.remove_nodes) {
      this.nodes.delete(id);
      for (const [key, edge] of this.edges) {
        if (edge.source === id || edge.target === id) this.edges.delete(key);
      }
    }
    for (const node of msg.add_nodes) this.nodes.set(node.id, node);
    for (const node of msg.update_nodes) this.nodes.set(node.id, node);
    for (const edge of msg.add_edges) {
      if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) continue;
      this.edges.set(GraphStore.edgeKey(edge.source, edge.target), edge);
    }
    this.seq = msg.seq;
    this._emit({ kind: 'patch', patch: msg });
    return true;
  }
}
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd frontend && npx vitest run`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core frontend/tests/store.test.js
git commit -m "feat: klientský protokol a GraphStore s idempotentními patchi"
```

---

### Task 10: core/connection.js — WS klient s reconnectem

**Files:**
- Create: `frontend/src/core/connection.js`
- Test: `frontend/tests/connection.test.js`

- [ ] **Step 1: Failing testy**

Vytvoř `frontend/tests/connection.test.js`:

```js
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
});
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/connection.test.js`
Expected: FAIL — nelze resolvnout `../src/core/connection.js`.

- [ ] **Step 3: Implementace**

Vytvoř `frontend/src/core/connection.js`:

```js
import { decode, encode, hello } from './protocol.js';

/** WebSocket klient: handshake, routing zpráv do store, reconnect s backoffem. */
export class Connection {
  constructor(url, store, {
    WebSocketImpl = globalThis.WebSocket,
    schedule = (fn, delay) => setTimeout(fn, delay),
    minBackoff = 500,
    maxBackoff = 10000,
  } = {}) {
    this.url = url;
    this.store = store;
    this.WebSocketImpl = WebSocketImpl;
    this.schedule = schedule;
    this.minBackoff = minBackoff;
    this.maxBackoff = maxBackoff;
    this.backoff = minBackoff;
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
    } else if (msg.type === 'patch') {
      if (!this.store.applyPatch(msg)) this.ws.close();  // mezera v seq
    } else if (msg.type === 'error') {
      console.error('viewbase server:', msg.error);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(encode(message));
  }
}
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd frontend && npx vitest run`
Expected: všechny testy PASS (store + connection).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/connection.js frontend/tests/connection.test.js
git commit -m "feat: WS Connection s hello, seq kontrolou a reconnect backoffem"
```

---

### Task 11: Fyzika — physics/core.js, worker.js, engine.js

**Files:**
- Create: `frontend/src/physics/core.js`, `frontend/src/physics/worker.js`, `frontend/src/physics/engine.js`
- Test: `frontend/tests/physics.test.js`

- [ ] **Step 1: Failing testy**

Vytvoř `frontend/tests/physics.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { PhysicsCore } from '../src/physics/core.js';

describe('PhysicsCore', () => {
  it('init rozmístí uzly a tick vrací Float32Array pozic', () => {
    const core = new PhysicsCore({ dimensions: 3 });
    core.applyInit({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [{ source: 'a', target: 'b' }],
    });
    const buf = core.tick();
    expect(core.ids()).toEqual(['a', 'b']);
    expect(buf).toBeInstanceOf(Float32Array);
    expect(buf).toHaveLength(6);
  });

  it('patch přidá uzel u souseda a odebere uzel i s hranami', () => {
    const core = new PhysicsCore({ dimensions: 3 });
    core.applyInit({ nodes: [{ id: 'a' }, { id: 'b' }], links: [] });
    const a = core.nodes.find((n) => n.id === 'a');
    core.applyPatch({
      addNodes: [{ id: 'c' }],
      addLinks: [{ source: 'c', target: 'a' }],
    });
    const c = core.nodes.find((n) => n.id === 'c');
    const dist = Math.hypot(c.x - a.x, c.y - a.y, c.z - a.z);
    expect(dist).toBeLessThan(30);          // zrodil se poblíž souseda

    core.applyPatch({ removeNodes: ['a'] });
    expect(core.ids()).toEqual(['b', 'c']);
    expect(core.links).toHaveLength(0);     // kaskáda hran
  });

  it('simulace po vychladnutí přestane tikat a patch ji ohřeje', () => {
    const core = new PhysicsCore({ dimensions: 3 });
    core.applyInit({ nodes: [{ id: 'a' }], links: [] });
    let last = null;
    for (let i = 0; i < 2000 && (last = core.tick()) !== null; i += 1);
    expect(last).toBeNull();                // vychladla
    core.applyPatch({ addNodes: [{ id: 'b' }] });
    expect(core.tick()).not.toBeNull();     // ohřátá
  });

  it('ve 2D drží z = 0', () => {
    const core = new PhysicsCore({ dimensions: 2 });
    core.applyInit({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [{ source: 'a', target: 'b' }],
    });
    const buf = core.tick();
    expect(buf[2]).toBe(0);
    expect(buf[5]).toBe(0);
  });
});
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/physics.test.js`
Expected: FAIL — nelze resolvnout `../src/physics/core.js`.

- [ ] **Step 3: Implementace PhysicsCore**

Vytvoř `frontend/src/physics/core.js`:

```js
import {
  forceCenter, forceLink, forceManyBody, forceSimulation,
} from 'd3-force-3d';

const SPAWN_JITTER = 10;

function endId(end) {
  return typeof end === 'object' && end !== null ? end.id : end;
}

function linkKey(s, t) {
  return s <= t ? `${s}\u0000${t}` : `${t}\u0000${s}`;
}

/** Fyzikální jádro – čistá logika bez Workeru (testovatelné ve vitestu). */
export class PhysicsCore {
  constructor({ dimensions = 3 } = {}) {
    this.dimensions = dimensions;
    this.nodes = [];
    this.links = [];
    this.byId = new Map();
    this.sim = forceSimulation([], dimensions)
      .force('link', forceLink([]).id((d) => d.id).distance(60))
      .force('charge', forceManyBody().strength(-120).theta(0.9))
      .force('center', forceCenter())
      .stop();
  }

  applyInit({ nodes, links }) {
    this.nodes = nodes.map((n) => ({ id: n.id }));
    this.byId = new Map(this.nodes.map((n) => [n.id, n]));
    this.links = links.map((l) => ({ source: l.source, target: l.target }));
    this._rebuild();
    this.sim.alpha(1);
  }

  applyPatch({ addNodes = [], removeNodes = [], addLinks = [], removeLinks = [] }) {
    const removed = new Set(removeNodes);
    if (removed.size) {
      this.nodes = this.nodes.filter((n) => !removed.has(n.id));
      this.links = this.links.filter(
        (l) => !removed.has(endId(l.source)) && !removed.has(endId(l.target)));
      for (const id of removed) this.byId.delete(id);
    }
    const removedLinks = new Set(removeLinks.map(([s, t]) => linkKey(s, t)));
    if (removedLinks.size) {
      this.links = this.links.filter(
        (l) => !removedLinks.has(linkKey(endId(l.source), endId(l.target))));
    }
    const neighborOf = new Map();
    for (const { source, target } of addLinks) {
      neighborOf.set(source, target);
      neighborOf.set(target, source);
    }
    for (const { id } of addNodes) {
      if (this.byId.has(id)) continue;                      // idempotence
      const node = { id, ...this._spawnPosition(neighborOf.get(id)) };
      this.nodes.push(node);
      this.byId.set(id, node);
    }
    for (const { source, target } of addLinks) {
      if (this.byId.has(source) && this.byId.has(target)) {
        this.links.push({ source, target });
      }
    }
    this._rebuild();
    this.sim.alpha(Math.max(this.sim.alpha(), 0.5));        // lokální ohřátí
  }

  /** Nový uzel se rodí poblíž prvního existujícího souseda, ne náhodně. */
  _spawnPosition(neighborId) {
    const near = neighborId ? this.byId.get(neighborId) : null;
    if (!near || near.x === undefined) return {};           // d3 rozmístí samo
    const jitter = () => (Math.random() - 0.5) * 2 * SPAWN_JITTER;
    return {
      x: near.x + jitter(),
      y: near.y + jitter(),
      z: this.dimensions === 3 ? near.z + jitter() : 0,
    };
  }

  _rebuild() {
    this.sim.nodes(this.nodes);
    this.sim.force('link').links(this.links);
  }

  /** Jeden krok simulace; null = vychladlá (není co počítat). */
  tick() {
    if (this.sim.alpha() < this.sim.alphaMin()) return null;
    this.sim.tick();
    return this.positions();
  }

  positions() {
    const buf = new Float32Array(this.nodes.length * 3);
    this.nodes.forEach((n, i) => {
      buf[i * 3] = n.x;
      buf[i * 3 + 1] = n.y;
      buf[i * 3 + 2] = this.dimensions === 3 ? n.z : 0;
    });
    return buf;
  }

  ids() {
    return this.nodes.map((n) => n.id);
  }
}
```

- [ ] **Step 4: Ověřit průchod**

Run: `cd frontend && npx vitest run`
Expected: všechny testy PASS.

- [ ] **Step 5: Worker a main-thread engine (bez unit testů — tenké obálky)**

Vytvoř `frontend/src/physics/worker.js`:

```js
import { PhysicsCore } from './core.js';

const TICK_MS = 16;
let core = null;

setInterval(() => {
  if (!core) return;
  const positions = core.tick();
  if (positions) self.postMessage({ type: 'tick', positions }, [positions.buffer]);
}, TICK_MS);

self.onmessage = ({ data }) => {
  if (data.type === 'init') {
    core = new PhysicsCore({ dimensions: data.dimensions });
    core.applyInit(data);
  } else if (data.type === 'patch') {
    core.applyPatch(data);
  } else {
    return;
  }
  self.postMessage({ type: 'index', ids: core.ids() });
  const positions = core.positions();
  self.postMessage({ type: 'tick', positions }, [positions.buffer]);
};
```

Vytvoř `frontend/src/physics/engine.js`:

```js
/** Most mezi GraphStore a fyzikálním workerem. Drží poslední ids + pozice
 *  pro renderer (ids a buffer se mohou krátce lišit délkou – renderer bere
 *  min(ids.length, positions.length / 3)). */
export class PhysicsEngine {
  constructor(store) {
    this.ids = [];
    this.positions = new Float32Array(0);
    this.worker = new Worker(new URL('./worker.js', import.meta.url),
      { type: 'module' });
    this.worker.onmessage = ({ data }) => {
      if (data.type === 'index') this.ids = data.ids;
      else if (data.type === 'tick') this.positions = data.positions;
    };
    store.subscribe((event) => this._onStoreEvent(store, event));
  }

  _onStoreEvent(store, event) {
    if (event.kind === 'init') {
      this.worker.postMessage({
        type: 'init',
        dimensions: store.config.dimensions,
        nodes: [...store.nodes.values()].map((n) => ({ id: n.id })),
        links: [...store.edges.values()]
          .map((e) => ({ source: e.source, target: e.target })),
      });
    } else if (event.kind === 'patch') {
      const p = event.patch;
      this.worker.postMessage({
        type: 'patch',
        addNodes: p.add_nodes.map((n) => ({ id: n.id })),
        removeNodes: p.remove_nodes,
        addLinks: p.add_edges.map((e) => ({ source: e.source, target: e.target })),
        removeLinks: p.remove_edges,
      });
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/physics frontend/tests/physics.test.js
git commit -m "feat: fyzika d3-force-3d – core, worker, engine most"
```

---

### Task 12: Renderer a bootstrap (main.js)

**Files:**
- Create: `frontend/src/render/renderer.js`
- Modify: `frontend/src/main.js` (nahradit stub)

Rendering se jednotkově netestuje (viz spec §10) — ověření je ruční v Tasku 13.

- [ ] **Step 1: Renderer**

Vytvoř `frontend/src/render/renderer.js`:

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const NODE_COLOR = 0x2f7fe8;
const EDGE_COLOR = 0x9aa3af;
const BACKGROUND = 0xf4f5f7;
const SMOOTHING = 8;   // 1/s – rychlost dobíhání zobrazené pozice k fyzice

/** Instancovaný renderer: jeden InstancedMesh pro uzly, jeden LineSegments
 *  pro hrany. Zobrazené pozice se vyhlazují exponenciálně mezi fyz. ticky. */
export class Renderer {
  constructor(container, store, engine) {
    this.store = store;
    this.engine = engine;
    this.display = new Map();   // id -> THREE.Vector3 (vyhlazená pozice)

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND);
    this.camera = new THREE.PerspectiveCamera(
      60, container.clientWidth / container.clientHeight, 1, 50000);
    this.camera.position.set(0, 0, 900);

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setSize(container.clientWidth, container.clientHeight);
    this.webgl.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.webgl.domElement);

    this.controls = new OrbitControls(this.camera, this.webgl.domElement);
    this.controls.enableDamping = true;

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

    window.addEventListener('resize', () => {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.webgl.setSize(container.clientWidth, container.clientHeight);
    });
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
    const material = new THREE.MeshStandardMaterial(
      { color: NODE_COLOR, roughness: 0.4 });
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
    this._syncNodes(dt);
    this._syncEdges();
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
    }
    for (const id of this.display.keys()) {
      if (!seen.has(id)) this.display.delete(id);
    }
    this.nodeMesh.count = count;
    this.nodeMesh.instanceMatrix.needsUpdate = true;
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
}
```

- [ ] **Step 2: Bootstrap**

Nahraď obsah `frontend/src/main.js`:

```js
import { Connection } from './core/connection.js';
import { GraphStore } from './core/store.js';
import { PhysicsEngine } from './physics/engine.js';
import { Renderer } from './render/renderer.js';

const store = new GraphStore();
const engine = new PhysicsEngine(store);
const renderer = new Renderer(document.getElementById('app'), store, engine);

store.subscribe((event) => {
  if (event.kind === 'init' && store.config.title) {
    document.title = `${store.config.title} – viewbase`;
  }
});

new Connection(`ws://${location.host}/ws`, store).connect();
renderer.start();
```

- [ ] **Step 3: Build a testy**

```bash
cd frontend && npx vitest run && npm run build && cd ..
```

Expected: testy PASS, build bez chyb, `python/viewbase/static/` obsahuje index.html + assets (worker jako samostatný chunk).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/render frontend/src/main.js
git commit -m "feat: instancovaný renderer s interpolací a bootstrap aplikace"
```

---

### Task 13: End-to-end ověření chodící kostry

**Files:** žádné nové — ruční verifikace + případné opravy.

- [ ] **Step 1: Kompletní testy**

```bash
cd python && python -m pytest -v && cd ..
cd frontend && npx vitest run && cd ..
```

Expected: vše PASS.

- [ ] **Step 2: Ruční ověření v prohlížeči**

```bash
cd frontend && npm run build && cd ..
python examples/quickstart.py
```

Ověř (otevře se http://127.0.0.1:8080):

1. Zobrazí se ~30 modrých koulí s hranami; graf se během pár sekund plynule usadí (žádné skoky/škubání).
2. Každé ~2 s přibude uzel — **vyklouzne z blízkosti svého souseda**, simulace se lokálně ohřeje a zase usadí.
3. Orbit kamery myší (tažení) a zoom kolečkem fungují plynule i během usazování.
4. V konzoli prohlížeče nejsou chyby.
5. Reconnect: zabij server (Ctrl+C), pozoruj klid, spusť znovu — stránka se do pár sekund sama obnoví čerstvým initem (graf se znovu objeví bez reloadu stránky).

Pokud něco neodpovídá, oprav a přidej commit s popisem opravy.

- [ ] **Step 3: Závěrečný commit**

```bash
git add -A
git commit -m "feat: chodící kostra viewbase – živý graf end-to-end" --allow-empty
```

---

## Pokrytí spec ↔ plán (pro orientaci)

| Spec | Tady | Spec | Tady |
|---|---|---|---|
| Canvas API (uzly/hrany/typy/labely) | T4 | GraphStore | T9 |
| Delty, batch, thread-safety | T5 | Connection/reconnect/seq | T10 |
| Protokol init/patch/hello | T3, T6 | Fyzika worker + spawn u souseda | T11 |
| FastAPI + WS + serve | T6, T7 | Instancing + interpolace | T12 |
| Struktura repa, legacy | T1, T2, T8 | E2E ověření | T13 |

Eventy, akce, témata, labely v WebGL, picking, 2D kamera, toky → Plán 2 a 3 (dle spec §12).
