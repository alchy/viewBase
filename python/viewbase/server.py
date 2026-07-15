"""FastAPI server: statické assety + WebSocket protokol + runner."""
from __future__ import annotations

import asyncio
import logging
import threading
import time
import uuid
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


async def _broadcast_step(canvas: Canvas, clients: set[WebSocket]) -> None:
    """Jeden krok vysílání: nejdřív patch (data), pak akce (odkazují na data).

    Akce se drainují PŘED deltami: _require_node zaručuje, že uzel akce byl
    přidán dřív, takže jeho delta je v tomto (nebo dřívějším) patchi."""
    actions = canvas.drain_actions()
    drained = canvas.drain()
    messages = []
    if drained is not None:
        seq, deltas = drained
        messages.append(protocol.encode(protocol.patch_message(seq, deltas)))
    messages.extend(
        protocol.encode({"type": "action", **action}) for action in actions)
    if not messages or not clients:
        return
    for ws in list(clients):
        try:
            for raw in messages:
                await ws.send_text(raw)
        except Exception:
            clients.discard(ws)


async def _broadcast_loop(canvas: Canvas, clients: set[WebSocket],
                          state_lock: asyncio.Lock) -> None:
    while True:
        await asyncio.sleep(PATCH_INTERVAL)
        try:
            async with state_lock:
                await _broadcast_step(canvas, clients)
        except Exception:
            logger.exception("Chyba ve vysílací smyčce")


def create_app(canvas: Canvas) -> FastAPI:
    clients: set[WebSocket] = set()
    state_lock = asyncio.Lock()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        task = asyncio.create_task(_broadcast_loop(canvas, clients, state_lock))
        stop_tasks = canvas.start_periodic_tasks()   # every() úlohy
        yield
        stop_tasks.set()
        task.cancel()

    app = FastAPI(lifespan=lifespan)

    @app.websocket("/ws")
    async def ws_endpoint(ws: WebSocket) -> None:
        await ws.accept()
        client_id = uuid.uuid4().hex[:8]
        try:
            hello = protocol.decode(await ws.receive_text())
        except WebSocketDisconnect:
            return
        except ValueError:
            await ws.close()
            return
        try:
            if (hello.get("type") != "hello"
                    or hello.get("protocol") != protocol.PROTOCOL_VERSION):
                await ws.send_text(protocol.encode(
                    {"type": "error", "error": "protocol_mismatch"}))
                await ws.close()
                return
            # Sdílený zámek: snapshot + zařazení mezi klienty je atomické vůči
            # broadcast kroku. Pending delty se NEzahazují – příští broadcast
            # je pošle všem (novému klientovi jako idempotentní upsert), takže
            # seq navazuje pro staré i nové klienty.
            async with state_lock:
                snap = canvas.snapshot()
                await ws.send_text(protocol.encode(
                    protocol.init_message(**snap)))
                clients.add(ws)
        except WebSocketDisconnect:
            return
        try:
            while True:
                raw = await ws.receive_text()
                try:
                    msg = protocol.decode(raw)
                except ValueError:
                    logger.warning("Vadná zpráva od klienta %s: %r",
                                   client_id, raw[:200])
                    continue
                if msg.get("type") == "event" and isinstance(msg.get("event"), str):
                    payload = msg.get("payload")
                    if not isinstance(payload, dict):
                        payload = {}
                    canvas.dispatch_event(
                        msg["event"], {**payload, "client_id": client_id})
                else:
                    logger.warning("Nečekaná zpráva od klienta %s: %r",
                                   client_id, raw[:200])
        except WebSocketDisconnect:
            pass
        finally:
            clients.discard(ws)

    if STATIC_DIR.is_dir():
        app.mount("/", StaticFiles(directory=STATIC_DIR, html=True),
                  name="static")
    return app


class ServerHandle:
    """Server běžící na pozadí (serve(block=False)) – pro REPL a Jupyter.
    Kontext manager: `with vb.serve(c, block=False) as s:` ho po bloku
    zastaví."""

    def __init__(self, server: uvicorn.Server, thread: threading.Thread,
                 canvas: Canvas):
        self._server = server
        self._thread = thread
        self._canvas = canvas

    @property
    def port(self) -> int:
        """Skutečný port (i pro port=0, kde OS přidělí efemérní)."""
        return self._server.servers[0].sockets[0].getsockname()[1]

    def stop(self, timeout: float = 5.0) -> None:
        """Zastav server (graceful), počkej na doběh vlákna, zavři canvas."""
        self._server.should_exit = True
        self._thread.join(timeout)
        self._canvas.close()

    def __enter__(self) -> "ServerHandle":
        return self

    def __exit__(self, *exc) -> None:
        self.stop()


def _make_server(canvas: Canvas, host: str, port: int) -> uvicorn.Server:
    # ws_ping_interval=None vypíná serverový keepalive ping knihovny
    # websockets: jeho samostatná úloha jinak souběžně "draina" stejné
    # spojení jako náš broadcast a při velkém provozu spadne na interním
    # assertu. Mrtvá spojení odhalí selhání dalšího patche (klient se
    # reconnectne), keepalive proto nepotřebujeme.
    config = uvicorn.Config(create_app(canvas), host=host, port=port,
                            log_level="warning",
                            ws_ping_interval=None, ws_ping_timeout=None)
    return uvicorn.Server(config)


def serve(canvas: Canvas, *, host: str = "127.0.0.1", port: int = 8080,
          open_browser: bool = False, block: bool = True) -> ServerHandle | None:
    """Spustí server. `block=True` (default) blokuje do Ctrl-C; mutace
    canvasu pak dělej z every() úloh nebo event handlerů. `block=False`
    server spustí v daemon vlákně a vrátí ServerHandle (REPL/Jupyter):
    prompt zůstane volný, `handle.stop()` server ukončí."""
    server = _make_server(canvas, host, port)
    if open_browser:
        threading.Timer(
            0.7, webbrowser.open, args=(f"http://{host}:{port}/",)).start()
    if block:
        try:
            server.run()
        finally:
            canvas.close()   # i po KeyboardInterrupt – nenechat viset vlákna
        return None
    thread = threading.Thread(target=server.run, name="viewbase-server",
                              daemon=True)
    thread.start()
    deadline = time.monotonic() + 5.0
    while not server.started:          # čekej na bind (nebo pád)
        if not thread.is_alive():
            canvas.close()
            raise RuntimeError(
                "viewbase server se nepodařilo spustit – viz log výše"
                f" (host={host}, port={port})")
        if time.monotonic() > deadline:
            server.should_exit = True
            canvas.close()
            raise TimeoutError("viewbase server nenastartoval do 5 s")
        time.sleep(0.01)
    return ServerHandle(server, thread, canvas)
