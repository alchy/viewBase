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
    c.close()


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
