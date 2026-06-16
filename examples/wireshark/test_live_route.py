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
