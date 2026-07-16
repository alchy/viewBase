import threading

import pytest
from fastapi.testclient import TestClient

from viewbase import Canvas, TerminalWindow, create_app, protocol


def test_spec_has_terminal_kind_prompt_width():
    spec = TerminalWindow("konzole", title="Dotaz", prompt="❓ ", width=600).spec()
    assert spec["window_id"] == "konzole"
    assert spec["kind"] == "terminal"
    assert spec["prompt"] == "❓ "
    assert spec["width"] == 600
    assert "fields" not in spec           # terminál není formulář


def test_open_terminal_queues_action_and_snapshot():
    c = Canvas()
    c.open_terminal(TerminalWindow("konzole", title="Dotaz"))
    (a,) = c.drain_actions()
    assert a["action"] == "open_window"   # sdílí render cestu s ControlWindow
    assert a["kind"] == "terminal"
    assert a["window_id"] == "konzole"
    windows = c.snapshot()["windows"]
    assert [(w["window_id"], w["kind"]) for w in windows] == [("konzole", "terminal")]


def test_terminal_write_queues_append_action():
    c = Canvas()
    c.open_terminal(TerminalWindow("konzole"))
    c.drain_actions()                     # zahoď open akci
    c.terminal_write("konzole", "💬 Božena Němcová")
    (a,) = c.drain_actions()
    assert a == {"action": "terminal_append", "window_id": "konzole",
                 "text": "💬 Božena Němcová"}


def test_terminal_write_unknown_raises():
    with pytest.raises(ValueError):
        Canvas().terminal_write("ghost", "x")


def test_terminal_input_event_calls_callback_with_line():
    c = Canvas()
    done = threading.Event()
    got = {}

    def on_input(event):
        got["line"] = event.line
        got["window_id"] = event.window_id
        done.set()

    c.open_terminal(TerminalWindow("konzole"), on_input=on_input)
    c.dispatch_event("terminal_input",
                     {"window_id": "konzole", "line": "kdo napsal Babičku?",
                      "client_id": "x"})
    assert done.wait(2.0)
    assert got == {"line": "kdo napsal Babičku?", "window_id": "konzole"}
    c.close()


def test_terminal_input_non_string_line_ignored():
    c = Canvas()
    fired = threading.Event()
    c.open_terminal(TerminalWindow("konzole"), on_input=lambda e: fired.set())
    c.dispatch_event("terminal_input",
                     {"window_id": "konzole", "line": 42, "client_id": "x"})
    assert not fired.wait(0.3)
    c.close()


def test_init_carries_terminal_window():
    c = Canvas()
    c.open_terminal(TerminalWindow("konzole", title="Dotaz"))
    with TestClient(create_app(c)) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(protocol.encode(
                {"type": "hello", "protocol": protocol.PROTOCOL_VERSION}))
            init = protocol.decode(ws.receive_text())
    kinds = {w["window_id"]: w.get("kind") for w in init["windows"]}
    assert kinds == {"konzole": "terminal"}
