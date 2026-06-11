"""Quickstart 2D: stejný živý graf v rovině (ortografická kamera, pan/zoom)."""
import random
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="Quickstart 2D", dimensions=2)

with canvas.batch():
    for i in range(30):
        canvas.add_node(f"n{i}", value=i)
    for i in range(1, 30):
        canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")


def zivy_graf() -> None:
    i = 30
    while True:
        time.sleep(2.0)
        with canvas.batch():
            canvas.add_node(f"n{i}", value=i)
            canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")
        i += 1


threading.Thread(target=zivy_graf, daemon=True).start()
vb.serve(canvas, port=8080, open_browser=True)
