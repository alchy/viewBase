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
