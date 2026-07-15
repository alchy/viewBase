"""Quickstart: živý graf, do kterého každé 2 s přibude uzel."""
import random

import viewbase as vb

canvas = vb.Canvas(title="Quickstart", dimensions=3)

with canvas.batch():
    for i in range(30):
        canvas.add_node(f"n{i}", value=i)
    for i in range(1, 30):
        canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")


@canvas.every(2.0)
def zivy_graf() -> None:
    i = len(canvas.nodes)
    with canvas.batch():
        canvas.add_node(f"n{i}", value=i)
        canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")


vb.serve(canvas, port=8080, open_browser=True)
