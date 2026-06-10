"""FastAPI server: statické assety + WebSocket protokol + runner."""
from __future__ import annotations

import asyncio
import logging
import threading
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


async def _broadcast_loop(canvas: Canvas, clients: set[WebSocket]) -> None:
    while True:
        await asyncio.sleep(PATCH_INTERVAL)
        try:
            drained = canvas.drain()
            if drained is None or not clients:
                continue
            seq, deltas = drained
            raw = protocol.encode(protocol.patch_message(seq, deltas))
            for ws in list(clients):
                try:
                    await ws.send_text(raw)
                except Exception:
                    clients.discard(ws)
        except Exception:
            logger.exception("Chyba ve vysílací smyčce")


def create_app(canvas: Canvas) -> FastAPI:
    clients: set[WebSocket] = set()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        task = asyncio.create_task(_broadcast_loop(canvas, clients))
        yield
        task.cancel()

    app = FastAPI(lifespan=lifespan)

    @app.websocket("/ws")
    async def ws_endpoint(ws: WebSocket) -> None:
        await ws.accept()
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
            await ws.send_text(protocol.encode(
                protocol.init_message(**canvas.snapshot())))
        except WebSocketDisconnect:
            return
        clients.add(ws)
        try:
            while True:
                raw = await ws.receive_text()
                try:
                    protocol.decode(raw)   # eventy zpracuje Plán 2
                except ValueError:
                    logger.warning("Vadná zpráva od klienta: %r", raw[:200])
        except WebSocketDisconnect:
            pass
        finally:
            clients.discard(ws)

    if STATIC_DIR.is_dir():
        app.mount("/", StaticFiles(directory=STATIC_DIR, html=True),
                  name="static")
    return app


def serve(canvas: Canvas, *, host: str = "127.0.0.1", port: int = 8080,
          open_browser: bool = False) -> None:
    """Spustí server a blokuje. Mutace canvasu dělej z jiných vláken."""
    app = create_app(canvas)
    if open_browser:
        threading.Timer(
            0.7, webbrowser.open, args=(f"http://{host}:{port}/",)).start()
    uvicorn.run(app, host=host, port=port, log_level="warning")
