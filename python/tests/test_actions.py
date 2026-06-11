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
            # Před akcí může přijít patch (pending delta add_node "a") – přeskočit
            msg = None
            for _ in range(5):
                msg = protocol.decode(ws.receive_text())
                if msg["type"] == "action":
                    break
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
