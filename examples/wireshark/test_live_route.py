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


# ---- RouteTable / build_canvas ------------------------------------------

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


def test_traceroute_exception_degrades_to_direct():
    def tracer(remote):
        raise OSError("traceroute selhal")

    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=tracer, pool=InlinePool())
    route = table.get_or_start("192.168.1.5", "8.8.8.8")
    assert route.state == lr.READY                  # výjimka → prázdné hopy
    assert route.path == ["192.168.1.5", "8.8.8.8"]
    assert _edge_key("192.168.1.5", "8.8.8.8") in _edge_keys(c)


def test_ensure_direct_adds_nodes_and_edge_idempotently():
    c = lr.build_canvas()
    table = lr.RouteTable(c, tracer=lambda remote: [], pool=InlinePool())
    table.ensure_direct("192.168.1.5", "192.168.1.20")
    table.ensure_direct("192.168.1.5", "192.168.1.20")   # podruhé nesmí spadnout
    assert _node_ids(c) == {"192.168.1.5", "192.168.1.20"}
    assert _edge_key("192.168.1.5", "192.168.1.20") in _edge_keys(c)


def test_build_canvas_sets_node_label_template():
    c = lr.build_canvas()
    c.add_node("8.8.8.8", type="host", ip="8.8.8.8", fqdn="dns.google")
    node = c.snapshot()["nodes"][0]
    assert node["label"] == "dns.google [8.8.8.8]"   # šablona {fqdn} [{ip}]


# ---- make_handler -------------------------------------------------------

from scapy.all import Ether as _Ether, IP as _IP, TCP as _TCP, UDP as _UDP


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
    # paket bez IP vrstvy (ARP apod.) → handler ho přeskočí, nespadne
    handler(_Ether())
    assert _flow_actions(c) == []
