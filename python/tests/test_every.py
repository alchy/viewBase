"""@canvas.every() – periodické úlohy spravované knihovnou."""
import threading
import time

import pytest
from fastapi.testclient import TestClient

from viewbase import Canvas, create_app


def test_every_requires_positive_interval():
    c = Canvas()
    with pytest.raises(ValueError):
        c.every(0)


def test_every_runs_after_start_and_stops():
    c = Canvas()
    ran = threading.Event()

    @c.every(0.01)
    def tick():
        ran.set()

    stop = c.start_periodic_tasks()
    assert ran.wait(2.0)
    stop.set()


def test_every_survives_handler_exception():
    c = Canvas()
    calls = []
    done = threading.Event()

    @c.every(0.01)
    def tick():
        calls.append(1)
        if len(calls) == 1:
            raise RuntimeError("bum")
        done.set()

    stop = c.start_periodic_tasks()
    assert done.wait(2.0)              # smyčka přežila výjimku prvního tiku
    stop.set()


def test_every_registered_after_start_is_ignored():
    c = Canvas()
    stop = c.start_periodic_tasks()
    ran = threading.Event()

    @c.every(0.01)
    def late():
        ran.set()

    assert not ran.wait(0.1)           # pozdní registrace se nespustí
    stop.set()


def test_close_stops_tasks():
    c = Canvas()
    counter = []

    @c.every(0.01)
    def tick():
        counter.append(1)

    c.start_periodic_tasks()
    time.sleep(0.05)
    c.close()
    n = len(counter)
    time.sleep(0.05)
    assert len(counter) <= n + 1       # tolerance na tik rozběhnutý při close


def test_serve_lifespan_starts_every_tasks():
    c = Canvas()
    ran = threading.Event()

    @c.every(0.01)
    def tick():
        ran.set()

    with TestClient(create_app(c)):
        assert ran.wait(2.0)
