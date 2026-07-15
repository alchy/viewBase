"""serve(block=False) – neblokující server pro REPL/Jupyter."""
import urllib.error
import urllib.request

from viewbase import Canvas, serve


def _http_status(port: int) -> int:
    try:
        return urllib.request.urlopen(
            f"http://127.0.0.1:{port}/", timeout=5).status
    except urllib.error.HTTPError as e:
        return e.code            # i 404 znamená, že server žije


def test_serve_nonblocking_start_and_stop():
    c = Canvas()
    c.add_node("a")
    handle = serve(c, port=0, block=False)     # port=0 = efemérní
    try:
        assert isinstance(handle.port, int) and handle.port > 0
        assert _http_status(handle.port) in (200, 404)
    finally:
        handle.stop()
    assert not handle._thread.is_alive()


def test_serve_nonblocking_context_manager():
    c = Canvas()
    with serve(c, port=0, block=False) as handle:
        assert handle.port > 0
        assert _http_status(handle.port) in (200, 404)
