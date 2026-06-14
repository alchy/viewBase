"""Úklid: Canvas.close a serve() finally."""
import pytest
import uvicorn

import viewbase as vb
from viewbase import server


def test_close_je_idempotentni_a_dispatch_je_pak_noop():
    canvas = vb.Canvas()
    calls = []
    canvas.on_click(lambda event: calls.append(event))
    canvas.close()
    canvas.close()                       # druhé volání nesmí spadnout
    canvas.dispatch_event("node_click", {"node_id": "a", "client_id": "c"})
    assert calls == []                   # po close je dispatch no-op


def test_serve_zavre_canvas_po_keyboard_interrupt(monkeypatch):
    canvas = vb.Canvas()

    def fake_run(*args, **kwargs):
        raise KeyboardInterrupt

    monkeypatch.setattr(uvicorn, "run", fake_run)
    with pytest.raises(KeyboardInterrupt):
        server.serve(canvas)
    assert canvas._closed is True        # close() proběhl ve finally
    canvas.close()                       # a zůstává idempotentní
