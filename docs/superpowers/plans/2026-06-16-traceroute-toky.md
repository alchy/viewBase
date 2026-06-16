# Traceroute toky — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nová wireshark ukázka `examples/wireshark/live_route.py`, která pro každý nový globální cíl spustí na pozadí traceroute, přidá routery po cestě jako uzly a posílá pakety jako multi-hop toky přes celou cestu.

**Architecture:** Vše v jednom příkladu, bez zásahu do `viewbase` jádra (využívá existující `canvas.flow(path=…)`, líné `add_node/add_edge`, typy uzlů). Jádrem je `RouteTable` (thread-safe cache cest + materializace do canvasu), `trace()` (ICMP traceroute) a čistá `build_path()`. Cesty se zjišťují paralelně ve `ThreadPoolExecutor`, cachují per vzdálený endpoint; do doběhu traceroute se kreslí dočasná přímá hrana, tiché hopy jsou placeholder uzly.

**Tech Stack:** Python 3.10+, scapy (sniff, sr1, ICMP/IP), `viewbase` (Canvas), pytest. Spec: `docs/superpowers/specs/2026-06-16-traceroute-toky-design.md`.

---

## File Structure

- **Create:** `examples/wireshark/live_route.py` — celá ukázka (helpery, `trace`, `build_path`, `RouteTable`, `build_canvas`, `make_handler`, `main`).
- **Create:** `examples/wireshark/test_live_route.py` — unit testy bez sítě (real `Canvas`, injektovaný `trace`, mock `sr1`).
- **Modify:** `examples/wireshark/README.md` — sekce „Cesta paketu (traceroute)".

Testy se kolokují v `examples/wireshark/`, aby `import live_route` i `from pcap_replay import …` fungovaly přes pytest prepend-import (adresář bez `__init__.py` se vloží na `sys.path`). Příkazy se spouští z **kořene repa** v aktivním `.venv` (scapy + viewbase nainstalované — ověřeno: scapy 2.7.0).

---

### Task 1: Helpery + `trace` + `build_path` (čistá/parsovací logika, TDD)

**Files:**
- Create: `examples/wireshark/live_route.py`
- Test: `examples/wireshark/test_live_route.py`

- [ ] **Step 1: Napiš failing testy pro čisté helpery**

Vytvoř `examples/wireshark/test_live_route.py`:

```python
"""Unit testy ukázky live_route — bez sítě (mock sr1, injektovaný tracer)."""
import live_route as lr


# ---- orient / is_global -------------------------------------------------

def test_orient_picks_local_and_remote():
    locals_set = {"192.168.1.5"}
    assert lr.orient("192.168.1.5", "8.8.8.8", locals_set) == ("192.168.1.5", "8.8.8.8")
    assert lr.orient("8.8.8.8", "192.168.1.5", locals_set) == ("192.168.1.5", "8.8.8.8")


def test_orient_none_when_both_remote_or_both_local():
    locals_set = {"192.168.1.5"}
    assert lr.orient("8.8.8.8", "1.1.1.1", locals_set) == (None, None)
    assert lr.orient("192.168.1.5", "192.168.1.5", locals_set) == (None, None)


def test_is_global():
    assert lr.is_global("8.8.8.8")
    assert not lr.is_global("192.168.1.5")
    assert not lr.is_global("not-an-ip")


# ---- build_path ---------------------------------------------------------

def test_build_path_real_hops():
    hops = [(1, "10.0.0.1"), (2, "203.0.113.1"), (3, "8.8.8.8")]
    assert lr.build_path("192.168.1.5", hops, "8.8.8.8") == \
        ["192.168.1.5", "10.0.0.1", "203.0.113.1", "8.8.8.8"]


def test_build_path_silent_hop_becomes_placeholder():
    hops = [(1, "10.0.0.1"), (2, None), (3, "8.8.8.8")]
    assert lr.build_path("192.168.1.5", hops, "8.8.8.8") == \
        ["192.168.1.5", "10.0.0.1", lr.placeholder_id("8.8.8.8", 2), "8.8.8.8"]


def test_build_path_unreached_dst_is_appended():
    hops = [(1, "10.0.0.1"), (2, None)]
    path = lr.build_path("192.168.1.5", hops, "8.8.8.8")
    assert path[0] == "192.168.1.5"
    assert path[-1] == "8.8.8.8"
    assert path[2] == lr.placeholder_id("8.8.8.8", 2)


def test_build_path_empty_degrades_to_direct():
    assert lr.build_path("a", [], "z") == ["a", "z"]


def test_build_path_no_double_remote_when_reached():
    assert lr.build_path("a", [(1, "z")], "z") == ["a", "z"]


# ---- trace (mock sr1) ---------------------------------------------------

class _Reply:
    """Minimální náhrada scapy reply (haslayer/__getitem__/type/src)."""
    def __init__(self, src, icmp_type):
        self.src = src
        self._t = icmp_type

    def haslayer(self, _layer):
        return True

    def __getitem__(self, _layer):
        return self

    @property
    def type(self):
        return self._t


def test_trace_parses_router_silent_and_destination(monkeypatch):
    replies = iter([_Reply("10.0.0.1", 11), None, _Reply("8.8.8.8", 0)])
    monkeypatch.setattr(lr, "sr1", lambda *a, **k: next(replies))
    hops = lr.trace("8.8.8.8", max_hops=10, timeout=0.1)
    assert hops == [(1, "10.0.0.1"), (2, None), (3, "8.8.8.8")]


def test_trace_stops_when_src_equals_dst(monkeypatch):
    replies = iter([_Reply("8.8.8.8", 11)])   # time-exceeded, ale src == dst
    monkeypatch.setattr(lr, "sr1", lambda *a, **k: next(replies))
    assert lr.trace("8.8.8.8", max_hops=10, timeout=0.1) == [(1, "8.8.8.8")]
```

- [ ] **Step 2: Ověř selhání**

Run: `python -m pytest examples/wireshark/test_live_route.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'live_route'` (modul ještě neexistuje).

- [ ] **Step 3: Vytvoř `live_route.py` s importy a čistými helpery**

Vytvoř `examples/wireshark/live_route.py`:

```python
"""Živé zachytávání s cestou paketu (traceroute) jako rostoucí graf.

Uzly = adresy a routery po cestě, hrany = sousední skoky, tok = každý paket
obarvený podle protokolu, putující multi-hop přes všechny uzly po cestě.

Pro každý nový globální cíl se na pozadí spustí traceroute, hopy se přidají
líně a další pakety k cíli už tečou po celé cestě. Cesty se cachují a běží
paralelně. Vyžaduje root (sniff i traceroute proby používají raw sockety).

Spuštění (Linux/macOS):
    pip install scapy
    sudo .venv/bin/python examples/wireshark/live_route.py --iface en0
"""
import argparse
import ipaddress
import logging
import socket
import threading
from concurrent.futures import ThreadPoolExecutor

from scapy.all import ICMP, IP, get_if_addr, sniff, sr1

import viewbase as vb

# Reuse z pcap_replay (DRY): klasifikace protokolu, barvy, FQDN resolver.
from pcap_replay import PROTO_COLORS, classify, make_resolver

logger = logging.getLogger("live_route")

PENDING = "pending"
READY = "ready"


def is_global(ip: str) -> bool:
    """True pro veřejnou (internetovou) IPv4 adresu; jinak (privátní, lokální,
    neplatná) False."""
    try:
        return ipaddress.ip_address(ip).is_global
    except ValueError:
        return False


def orient(src: str, dst: str, locals_set: set) -> tuple:
    """Vrať (local, remote): který konec paketu je náš a který vzdálený.
    Když je lokální/vzdálený nejednoznačný (oba naše nebo oba cizí), vrať
    (None, None) — takový paket route logika přeskočí."""
    if src in locals_set and dst not in locals_set:
        return src, dst
    if dst in locals_set and src not in locals_set:
        return dst, src
    return None, None


def local_addrs(iface: str | None = None) -> set:
    """Naše IP adresy (k rozlišení lokálního a vzdáleného konce). Zdrojovou IP
    výchozí trasy zjistí UDP socketem (nic neposílá), přidá loopback a (je-li
    zadáno) adresu rozhraní."""
    addrs = {"127.0.0.1"}
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))      # vybere zdrojovou IP, nic neodešle
        addrs.add(sock.getsockname()[0])
        sock.close()
    except OSError:
        pass
    if iface:
        try:
            addrs.add(get_if_addr(iface))
        except Exception:
            pass
    return {a for a in addrs if a and a != "0.0.0.0"}


def placeholder_id(remote: str, ttl: str) -> str:
    """ID placeholder uzlu pro tichý hop — unikátní per (cíl, TTL)."""
    return f"*{remote}#{ttl}"


def trace(dst: str, *, max_hops: int = 30, timeout: float = 1.0) -> list:
    """Malý ICMP traceroute. Vrať uspořádaný seznam (ttl, ip|None): None je
    tichý hop (router neodpověděl). Skončí na dosažení cíle (echo-reply nebo
    reply.src == dst)."""
    hops = []
    for ttl in range(1, max_hops + 1):
        reply = sr1(IP(dst=dst, ttl=ttl) / ICMP(), timeout=timeout, verbose=0)
        if reply is None:
            hops.append((ttl, None))
            continue
        hops.append((ttl, reply.src))
        icmp_type = reply[ICMP].type if reply.haslayer(ICMP) else None
        if icmp_type == 0 or reply.src == dst:   # echo-reply nebo dosažen cíl
            break
    return hops


def build_path(local: str, hops: list, remote: str) -> list:
    """Z výstupu trace() sestav ID uzlů cesty [local, …, remote]. Tiché hopy
    (ip=None) → placeholder ID. Pokud poslední hop není cíl (cíl neodpověděl),
    připoj remote na konec, aby graf zůstal souvislý."""
    path = [local]
    for ttl, ip in hops:
        path.append(ip if ip is not None else placeholder_id(remote, ttl))
    if path[-1] != remote:
        path.append(remote)
    return path
```

- [ ] **Step 4: Ověř, že testy Task 1 projdou**

Run: `python -m pytest examples/wireshark/test_live_route.py -q`
Expected: PASS — 9 testů zelených (orient ×2, is_global, build_path ×5, trace ×2 → 10 funkcí; přesný počet hlásí pytest, žádný FAIL).

- [ ] **Step 5: Commit**

```bash
git add examples/wireshark/live_route.py examples/wireshark/test_live_route.py
git commit -m "$(printf 'feat: live_route helpery + ICMP trace + build_path (TDD)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 2: `RouteTable` (cache + materializace do canvasu)

**Files:**
- Modify: `examples/wireshark/live_route.py`
- Test: `examples/wireshark/test_live_route.py`

`RouteTable` potřebuje pro testy `build_canvas` (definuje typy uzlů). Aby byl Task 2 samostatný, definuj `build_canvas` už tady (rozšíří se nepoužije v Task 3 — je to finální podoba).

- [ ] **Step 1: Napiš failing testy pro `RouteTable` a `build_canvas`**

Přidej na konec `examples/wireshark/test_live_route.py`:

```python
import viewbase as vb


class InlinePool:
    """Fake pool: úlohu spustí hned (deterministické testy materializace)."""
    def submit(self, fn, *args, **kwargs):
        fn(*args, **kwargs)


class DeferPool:
    """Fake pool: úlohy odloží, dokud nezavoláš run_all() (test PENDING okna)."""
    def __init__(self):
        self.jobs = []

    def submit(self, fn, *args, **kwargs):
        self.jobs.append((fn, args, kwargs))

    def run_all(self):
        jobs, self.jobs = self.jobs, []
        for fn, args, kwargs in jobs:
            fn(*args, **kwargs)


def _edge_key(a, b):
    return (a, b) if a <= b else (b, a)


def _edge_keys(canvas):
    return {(e["source"], e["target"]) for e in canvas.snapshot()["edges"]}


def _node_ids(canvas):
    return {n["id"] for n in canvas.snapshot()["nodes"]}


def test_build_canvas_defines_node_and_flow_types():
    c = lr.build_canvas()
    snap = c.snapshot()
    assert set(snap["node_types"]) == {"host", "router", "unknown"}
    assert set(snap["flow_types"]) == set(lr.PROTO_COLORS)


def test_get_or_start_dedup_runs_traceroute_once():
    calls = []

    def tracer(remote):
        calls.append(remote)
        return [(1, "10.0.0.1"), (2, "8.8.8.8")]

    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=tracer, pool=InlinePool())
    r1 = table.get_or_start("192.168.1.5", "8.8.8.8")
    r2 = table.get_or_start("192.168.1.5", "8.8.8.8")
    assert r1 is r2
    assert calls == ["8.8.8.8"]
    assert r1.state == lr.READY
    assert r1.path == ["192.168.1.5", "10.0.0.1", "8.8.8.8"]


def test_materialize_adds_path_and_removes_temp_edge():
    def tracer(remote):
        return [(1, "10.0.0.1"), (2, "203.0.113.7"), (3, "8.8.8.8")]

    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=tracer, pool=InlinePool())
    table.get_or_start("192.168.1.5", "8.8.8.8")
    assert _node_ids(c) == {"192.168.1.5", "10.0.0.1", "203.0.113.7", "8.8.8.8"}
    edges = _edge_keys(c)
    assert _edge_key("192.168.1.5", "8.8.8.8") not in edges       # dočasná odebrána
    assert _edge_key("192.168.1.5", "10.0.0.1") in edges
    assert _edge_key("10.0.0.1", "203.0.113.7") in edges
    assert _edge_key("203.0.113.7", "8.8.8.8") in edges


def test_materialize_silent_hop_is_unknown_placeholder():
    def tracer(remote):
        return [(1, "10.0.0.1"), (2, None), (3, "8.8.8.8")]

    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=tracer, pool=InlinePool())
    table.get_or_start("192.168.1.5", "8.8.8.8")
    ph = lr.placeholder_id("8.8.8.8", 2)
    nodes = {n["id"]: n for n in c.snapshot()["nodes"]}
    assert ph in nodes
    assert nodes[ph]["type"] == "unknown"
    assert nodes[ph]["label"] == "*"


def test_failed_traceroute_keeps_direct_edge():
    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=lambda remote: [], pool=InlinePool())
    route = table.get_or_start("192.168.1.5", "8.8.8.8")
    assert route.path == ["192.168.1.5", "8.8.8.8"]
    assert _edge_key("192.168.1.5", "8.8.8.8") in _edge_keys(c)


def test_path_for_orients_by_src():
    def tracer(remote):
        return [(1, "10.0.0.1"), (2, "8.8.8.8")]

    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=tracer, pool=InlinePool())
    route = table.get_or_start("192.168.1.5", "8.8.8.8")
    assert table.path_for(route, "192.168.1.5")[0] == "192.168.1.5"
    rev = table.path_for(route, "8.8.8.8")
    assert rev[0] == "8.8.8.8"
    assert rev[-1] == "192.168.1.5"


def test_real_hops_are_known_endpoints_and_placeholders_are_not():
    def tracer(remote):
        return [(1, "10.0.0.1"), (2, None), (3, "8.8.8.8")]

    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=tracer, pool=InlinePool())
    table.get_or_start("192.168.1.5", "8.8.8.8")
    assert table.is_known_hop("10.0.0.1")                       # reálný router
    assert not table.is_known_hop("8.8.8.8")                     # endpoint (cíl)
    assert not table.is_known_hop(lr.placeholder_id("8.8.8.8", 2))


def test_pending_keeps_temp_edge_until_traceroute_runs():
    def tracer(remote):
        return [(1, "10.0.0.1"), (2, "8.8.8.8")]

    c = lr.build_canvas()
    pool = DeferPool()
    table = lr.RouteTable(c, tracer=tracer, pool=pool)
    route = table.get_or_start("192.168.1.5", "8.8.8.8")
    assert route.state == lr.PENDING
    assert _edge_key("192.168.1.5", "8.8.8.8") in _edge_keys(c)  # dočasná hrana
    pool.run_all()
    assert route.state == lr.READY
    assert _edge_key("192.168.1.5", "8.8.8.8") not in _edge_keys(c)
```

- [ ] **Step 2: Ověř selhání**

Run: `python -m pytest examples/wireshark/test_live_route.py -q`
Expected: FAIL — `AttributeError: module 'live_route' has no attribute 'RouteTable'` (a `build_canvas`).

- [ ] **Step 3: Implementuj `Route`, `RouteTable` a `build_canvas`**

V `examples/wireshark/live_route.py`, za funkci `build_path` (před koncem souboru), přidej:

```python
class Route:
    """Jedna cesta k cíli: stav a (po doběhu) seznam uzlů [local, …, remote]."""
    def __init__(self):
        self.state = PENDING
        self.path = None


class RouteTable:
    """Cache cest k cílům a jejich materializace do canvasu. Thread-safe.

    `tracer(remote)` vrací výstup ve tvaru trace() (seznam (ttl, ip|None));
    injektovatelný kvůli testům. `pool` musí mít metodu submit(fn, *args);
    default je ThreadPoolExecutor (paralelní traceroute na pozadí)."""

    def __init__(self, canvas, *, tracer, resolver=None, workers=8, pool=None):
        self._canvas = canvas
        self._tracer = tracer
        self._resolve = resolver or (lambda ip: None)
        self._pool = pool or ThreadPoolExecutor(
            max_workers=workers, thread_name_prefix="traceroute")
        self._lock = threading.RLock()
        self._routes = {}        # remote -> Route
        self._nodes = set()      # ID uzlů, které jsme přidali
        self._edges = set()      # kanonické klíče hran, které jsme přidali
        self._hops = set()       # známé router IP (anti-rekurze na vlastní proby)

    # -- veřejné API --

    def is_known_hop(self, ip: str) -> bool:
        with self._lock:
            return ip in self._hops

    def ensure_direct(self, local: str, remote: str) -> None:
        """Přímá hrana local–remote (LAN / fallback) bez traceroute."""
        with self._lock:
            self._ensure_node(local, role="host")
            self._ensure_node(remote, role="host")
            self._ensure_edge(local, remote)

    def get_or_start(self, local: str, remote: str) -> Route:
        """Vrať cestu k cíli; novou založí: PENDING + dočasná přímá hrana +
        traceroute na pozadí. Dedup — jeden traceroute na cíl."""
        with self._lock:
            route = self._routes.get(remote)
            if route is not None:
                return route
            route = Route()
            self._routes[remote] = route
            self._ensure_node(local, role="host")
            self._ensure_node(remote, role="host")
            self._ensure_edge(local, remote)         # dočasná přímá hrana
        self._pool.submit(self._run, local, remote)
        return route

    def path_for(self, route: Route, src: str) -> list:
        """Cesta orientovaná tak, aby path[0] == src (hrany neorientované)."""
        path = route.path
        return path if path[0] == src else list(reversed(path))

    # -- interní --

    def _run(self, local: str, remote: str) -> None:
        try:
            hops = self._tracer(remote)
        except Exception:
            logger.exception("traceroute na %s selhal", remote)
            hops = []
        self._materialize(local, remote, build_path(local, hops, remote))

    def _materialize(self, local: str, remote: str, path: list) -> None:
        with self._lock:
            with self._canvas.batch():
                for i, node_id in enumerate(path):
                    self._ensure_node(
                        node_id, role=self._role_for(node_id, i, len(path)))
                for a, b in zip(path, path[1:]):
                    self._ensure_edge(a, b)
                if len(path) > 2:
                    self._remove_edge(local, remote)   # zruš dočasnou přímou
            self._routes[remote].path = path
            self._routes[remote].state = READY
            for node_id in path[1:-1]:
                if not _is_placeholder(node_id):
                    self._hops.add(node_id)
        for node_id in path:                           # DNS na pozadí
            if not _is_placeholder(node_id):
                self._resolve(node_id)

    @staticmethod
    def _role_for(node_id: str, index: int, length: int) -> str:
        if index == 0 or index == length - 1:
            return "host"
        return "unknown" if _is_placeholder(node_id) else "router"

    def _ensure_node(self, node_id: str, *, role: str) -> None:
        if node_id in self._nodes:
            return
        self._nodes.add(node_id)
        if role == "unknown":
            self._canvas.add_node(node_id, type="unknown", label="*",
                                  role="hop", ip="", fqdn="")
        else:
            self._canvas.add_node(node_id, type=role, role=role,
                                  ip=node_id, fqdn="")

    def _ensure_edge(self, a: str, b: str) -> None:
        if a == b:
            return
        key = (a, b) if a <= b else (b, a)
        if key in self._edges:
            return
        self._edges.add(key)
        self._canvas.add_edge(a, b)

    def _remove_edge(self, a: str, b: str) -> None:
        key = (a, b) if a <= b else (b, a)
        if key in self._edges:
            self._edges.discard(key)
            self._canvas.remove_edge(a, b)


def _is_placeholder(node_id: str) -> bool:
    return node_id.startswith("*")


def build_canvas() -> vb.Canvas:
    """Canvas pro traceroute ukázku: typy host/router/unknown, flow typy podle
    protokolu, popisek z meta, detailní okno."""
    canvas = vb.Canvas(title="Wireshark trasa", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    canvas.define_type("router", shape="box", color="#05ffa1", size=1.1)
    canvas.define_type("unknown", shape="tetrahedron", color="#5b6472", size=0.6)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    canvas.node_label("{fqdn} [{ip}]")
    canvas.detail_window(
        rows=[("FQDN", "fqdn"), ("IP", "ip"), ("role", "role")], width_chars=42)
    return canvas
```

- [ ] **Step 4: Ověř, že testy Task 2 projdou**

Run: `python -m pytest examples/wireshark/test_live_route.py -q`
Expected: PASS — všechny testy (Task 1 + Task 2) zelené.

- [ ] **Step 5: Commit**

```bash
git add examples/wireshark/live_route.py examples/wireshark/test_live_route.py
git commit -m "$(printf 'feat: RouteTable (cache cest, materializace, dočasná hrana) + build_canvas\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 3: Handler + `main` (drátování celé ukázky)

**Files:**
- Modify: `examples/wireshark/live_route.py`
- Test: `examples/wireshark/test_live_route.py`

- [ ] **Step 1: Napiš failing testy pro `make_handler`**

Přidej na konec `examples/wireshark/test_live_route.py`:

```python
from scapy.all import IP as _IP, TCP as _TCP, UDP as _UDP


def _flow_actions(canvas):
    return [a for a in canvas.drain_actions() if a["action"] == "flow"]


def test_handler_flows_along_path_when_ready():
    def tracer(remote):
        return [(1, "10.0.0.1"), (2, "8.8.8.8")]

    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=tracer, pool=InlinePool())   # READY hned
    handler = lr.make_handler(c, table, {"192.168.1.5"})
    handler(_IP(src="192.168.1.5", dst="8.8.8.8") / _TCP(sport=4444, dport=80))
    flows = _flow_actions(c)
    assert flows[-1]["path"] == ["192.168.1.5", "10.0.0.1", "8.8.8.8"]
    assert flows[-1]["flow_type"] == "http"


def test_handler_direct_while_pending_then_multihop():
    def tracer(remote):
        return [(1, "10.0.0.1"), (2, "8.8.8.8")]

    c = lr.build_canvas()
    pool = DeferPool()
    table = lr.RouteTable(c, tracer=tracer, pool=pool)
    handler = lr.make_handler(c, table, {"192.168.1.5"})
    pkt = _IP(src="192.168.1.5", dst="8.8.8.8") / _UDP(sport=4000, dport=9999)
    handler(pkt)                                    # PENDING → přímý tok
    assert _flow_actions(c)[-1]["path"] == ["192.168.1.5", "8.8.8.8"]
    pool.run_all()                                  # traceroute doběhne
    handler(pkt)                                    # READY → multi-hop tok
    assert _flow_actions(c)[-1]["path"] == ["192.168.1.5", "10.0.0.1", "8.8.8.8"]


def test_handler_lan_uses_direct_edge_without_traceroute():
    calls = []

    def tracer(remote):
        calls.append(remote)
        return []

    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=tracer, pool=InlinePool())
    handler = lr.make_handler(c, table, {"192.168.1.5"})
    handler(_IP(src="192.168.1.5", dst="192.168.1.20") / _UDP(sport=1, dport=2))
    assert calls == []                              # LAN → žádný traceroute
    assert _flow_actions(c)[-1]["path"] == ["192.168.1.5", "192.168.1.20"]


def test_handler_ignores_known_hop_and_non_ip():
    def tracer(remote):
        return [(1, "10.0.0.1"), (2, "8.8.8.8")]

    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=tracer, pool=InlinePool())
    handler = lr.make_handler(c, table, {"192.168.1.5"})
    handler(_IP(src="192.168.1.5", dst="8.8.8.8") / _TCP(sport=1, dport=80))
    c.drain_actions()                               # spotřebuj dosavadní akce
    # paket od objeveného routeru (naše traceroute proba) → ignoruj
    handler(_IP(src="10.0.0.1", dst="192.168.1.5") / _IP())  # type-exceeded-like
    assert _flow_actions(c) == []
```

- [ ] **Step 2: Ověř selhání**

Run: `python -m pytest examples/wireshark/test_live_route.py -q`
Expected: FAIL — `AttributeError: module 'live_route' has no attribute 'make_handler'`.

- [ ] **Step 3: Implementuj `make_handler` a `main`**

V `examples/wireshark/live_route.py`, za `build_canvas`, přidej:

```python
def make_handler(canvas: vb.Canvas, table: RouteTable, locals_set: set):
    """Vrať on_packet: pro globální cíl pošle tok po cestě (po doběhu
    traceroute), do té doby po dočasné přímé hraně; LAN po přímé hraně."""
    def on_packet(pkt) -> None:
        if not pkt.haslayer(IP):
            return
        src = pkt[IP].src
        dst = pkt[IP].dst
        if src == dst:
            return
        local, remote = orient(src, dst, locals_set)
        if remote is None or table.is_known_hop(remote):
            return                                  # nejednoznačné / naše proby
        proto = classify(pkt)
        if not is_global(remote):
            table.ensure_direct(local, remote)      # LAN: přímá hrana
            canvas.flow(src, dst, type=proto, count=1, interval=0.05)
            return
        route = table.get_or_start(local, remote)
        if route.state == READY:
            canvas.flow(path=table.path_for(route, src), type=proto,
                        count=1, interval=0.05)
        else:
            canvas.flow(src, dst, type=proto, count=1, interval=0.05)
    return on_packet


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Živý odposlech s cestou paketu (traceroute) → graf toků")
    parser.add_argument("--iface", default=None,
                        help="síťové rozhraní (např. en0, eth0); default = výchozí")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--max-hops", type=int, default=30,
                        help="maximální TTL traceroute (default 30)")
    parser.add_argument("--timeout", type=float, default=1.0,
                        help="timeout odpovědi na hop v sekundách (default 1.0)")
    parser.add_argument("--workers", type=int, default=8,
                        help="počet paralelních traceroute (default 8)")
    args = parser.parse_args()

    canvas = build_canvas()
    resolve = make_resolver(canvas)
    locals_set = local_addrs(args.iface)

    def tracer(remote):
        return trace(remote, max_hops=args.max_hops, timeout=args.timeout)

    table = RouteTable(canvas, tracer=tracer, resolver=resolve,
                       workers=args.workers)
    handler = make_handler(canvas, table, locals_set)
    threading.Thread(
        target=lambda: sniff(iface=args.iface, prn=handler, store=False),
        daemon=True).start()
    vb.serve(canvas, port=args.port, open_browser=True)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Ověř, že všechny testy projdou**

Run: `python -m pytest examples/wireshark/test_live_route.py -q`
Expected: PASS — všechny testy (Task 1–3) zelené, žádný FAIL/ERROR.

- [ ] **Step 5: Boot-check (modul se naimportuje a canvas postaví)**

Run: `python -c "import sys; sys.path.insert(0, 'examples/wireshark'); import live_route; live_route.build_canvas(); print('OK live_route')"`
Expected: vypíše `OK live_route`, žádný traceback. (Nepouští sniff — ten vyžaduje root.)

- [ ] **Step 6: Commit**

```bash
git add examples/wireshark/live_route.py examples/wireshark/test_live_route.py
git commit -m "$(printf 'feat: live_route handler + main (multi-hop tok po traceroute cestě)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 4: README — sekce „Cesta paketu (traceroute)"

**Files:**
- Modify: `examples/wireshark/README.md`

- [ ] **Step 1: Přidej sekci za „Živé zachytávání"**

V `examples/wireshark/README.md`, za blok „Živé zachytávání" (za poznámkový blok o `sudo: python: command not found`, před „## Co se děje uvnitř"), vlož:

```markdown
## Cesta paketu (traceroute)

Místo dvou koncových uzlů ukáže i **routery po cestě**: pro každý nový
globální cíl se na pozadí spustí traceroute, jeho hopy přibudou jako uzly
(routery jako zelené krychle, neodpovídající „tiché" hopy jako šedé
placeholdery `*`) a pakety pak putují jako tok přes celou cestu
`ty → router → … → cíl`. Cesty se cachují a počítají paralelně.

```bash
sudo .venv/bin/python examples/wireshark/live_route.py --iface en0
```

Přepínače: `--max-hops` (default 30), `--timeout` (s na hop, default 1.0),
`--workers` (paralelní traceroute, default 8), `--port`, `--iface`. Vyžaduje
root (sniff i traceroute proby používají raw sockety) — viz poznámka výše o
`.venv/bin/python`.

Než traceroute (sekundy) doběhne, vede k cíli dočasná přímá hrana; po zjištění
cesty se nahradí routery. LAN cíle (privátní adresy) zůstávají přímou hranou.
```

- [ ] **Step 2: Doplň `live_route.py` do tabulky „Co se děje uvnitř"**

V `examples/wireshark/README.md`, do seznamu v sekci „Co se děje uvnitř" (za odrážku `live_capture.py`), přidej:

```markdown
- `live_route.py` — jako `live_capture.py`, navíc na pozadí spustí
  `traceroute` (scapy `sr1` s rostoucím TTL), routery po cestě přidá jako
  uzly a paket vyšle jako multi-hop tok `canvas.flow(path=[…])`. Cesty drží
  `RouteTable` (cache + paralelní výpočet).
```

- [ ] **Step 3: Commit**

```bash
git add examples/wireshark/README.md
git commit -m "$(printf 'docs: README sekce Cesta paketu (traceroute) pro live_route\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 5: Závěrečná regrese

**Files:** žádné (jen ověření)

- [ ] **Step 1: Celá sada testů ukázky projde**

Run: `python -m pytest examples/wireshark/test_live_route.py -q`
Expected: PASS — žádný FAIL/ERROR.

- [ ] **Step 2: Jádro nezasaženo (regrese knihovny)**

Run: `python -m pytest python/tests -q`
Expected: PASS — beze změny (do `python/viewbase` ani `python/tests` jsme nesáhli).

- [ ] **Step 3: Boot-check ještě jednou (čerstvý proces)**

Run: `python -c "import sys; sys.path.insert(0, 'examples/wireshark'); import live_route; live_route.build_canvas(); print('OK')"`
Expected: `OK`.

---

## Self-Review (proběhlo při psaní)

**Spec coverage:** placeholder tiché hopy → `build_path` + `_role_for`/`_ensure_node` (Task 1/2); nový soubor `live_route.py` → Task 1–3; dočasná přímá hrana → `get_or_start` + `_remove_edge` (Task 2), test PENDING→READY (Task 2/3); cache/dedup/paralelně → `RouteTable._routes` + `pool` (Task 2); anti-rekurze prób → `is_known_hop`/`_hops` (Task 2/3); směr toku → `path_for` (Task 2); degradace failu → `test_failed_traceroute_keeps_direct_edge` (Task 2); bez změny jádra → ověřeno regresí (Task 5); README → Task 4. Vše pokryto.

**Type/název consistency:** `RouteTable(canvas, *, tracer, resolver, workers, pool)`, `get_or_start`, `path_for`, `is_known_hop`, `ensure_direct`, `build_path`, `placeholder_id`, `trace`, `orient`, `is_global`, `build_canvas`, `make_handler`, konstanty `PENDING`/`READY`, `_is_placeholder` — konzistentní napříč tasky i testy.

**Placeholder scan:** žádné TBD/TODO; všechny kroky obsahují konkrétní kód a příkazy s očekávaným výstupem.
