import logging
import threading
import time

from viewbase import Canvas


def test_on_click_registers_and_returns_function():
    c = Canvas()

    @c.on_click
    def handler(event):
        pass

    assert callable(handler)
    assert handler.__name__ == "handler"


def test_dispatch_runs_handler_with_namespace_event():
    c = Canvas()
    done = threading.Event()
    seen = {}

    @c.on_click
    def handler(event):
        seen["node_id"] = event.node_id
        seen["client_id"] = event.client_id
        done.set()

    c.dispatch_event("node_click", {"node_id": "a", "client_id": "c1"})
    assert done.wait(timeout=2)
    assert seen == {"node_id": "a", "client_id": "c1"}


def test_all_decorators_map_to_protocol_events():
    c = Canvas()
    fired = {"node_click": threading.Event(), "node_hover": threading.Event(),
             "background_click": threading.Event(),
             "view_change": threading.Event()}

    def make(name):
        def handler(event):
            fired[name].set()
        return handler

    c.on_click(make("node_click"))
    c.on_hover(make("node_hover"))
    c.on_background_click(make("background_click"))
    c.on_view_change(make("view_change"))
    for name, event in fired.items():
        c.dispatch_event(name, {})
        assert event.wait(timeout=2), name


def test_handler_exception_logged_server_survives(caplog):
    c = Canvas()
    ok = threading.Event()

    @c.on_click
    def boom(event):
        raise RuntimeError("bum")

    with caplog.at_level(logging.ERROR, logger="viewbase"):
        c.dispatch_event("node_click", {"node_id": "a"})
        deadline = time.monotonic() + 2
        while "bum" not in caplog.text and time.monotonic() < deadline:
            time.sleep(0.01)
    assert "bum" in caplog.text
    assert "Traceback" in caplog.text       # zalogováno s tracebackem

    @c.on_hover
    def fine(event):
        ok.set()

    c.dispatch_event("node_hover", {})      # canvas dál funguje
    assert ok.wait(timeout=2)


def test_unknown_event_is_noop():
    Canvas().dispatch_event("ghost_event", {"x": 1})   # nesmí spadnout


def test_two_handlers_for_same_event_both_run():
    c = Canvas()
    first, second = threading.Event(), threading.Event()
    c.on_click(lambda e: first.set())
    c.on_click(lambda e: second.set())
    c.dispatch_event("node_click", {})
    assert first.wait(timeout=2) and second.wait(timeout=2)
