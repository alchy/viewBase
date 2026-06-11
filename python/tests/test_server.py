import threading

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


def test_event_reaches_handler_with_client_id():
    canvas = Canvas()
    canvas.add_node("a")
    seen = {}
    done = threading.Event()

    @canvas.on_click
    def handler(event):
        seen["node_id"] = event.node_id
        seen["client_id"] = event.client_id
        done.set()

    with make_client(canvas) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(hello())
            assert protocol.decode(ws.receive_text())["type"] == "init"
            ws.send_text(protocol.encode(
                {"type": "event", "event": "node_click",
                 "payload": {"node_id": "a"}}))
            assert done.wait(timeout=2)
    assert seen["node_id"] == "a"
    assert isinstance(seen["client_id"], str)
    assert len(seen["client_id"]) == 8


def test_invalid_message_keeps_connection_alive():
    canvas = Canvas()
    done = threading.Event()

    @canvas.on_background_click
    def handler(event):
        done.set()

    with make_client(canvas) as client:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(hello())
            assert protocol.decode(ws.receive_text())["type"] == "init"
            ws.send_text("tohle není JSON")          # log + ignorovat
            ws.send_text(protocol.encode(
                {"type": "event", "event": "background_click"}))
            assert done.wait(timeout=2)
