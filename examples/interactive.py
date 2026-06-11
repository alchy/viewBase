"""Interaktivní demo: klik na uzel zobrazí detail a přidá mu 3 sousedy."""
import itertools
import random

import viewbase as vb

canvas = vb.Canvas(title="Interaktivní graf", dimensions=3,
                   highlight_neighbors=1)

with canvas.batch():
    for i in range(12):
        canvas.add_node(f"n{i}", value=i)
    for i in range(1, 12):
        canvas.add_edge(f"n{i}", f"n{random.randrange(i)}")

_counter = itertools.count()


@canvas.on_click
def expand(event):                       # event.node_id, .client_id
    canvas.show_detail(event.node_id)    # akce na uzel, který klient už zná
    with canvas.batch():
        for _ in range(3):
            new_id = f"x{next(_counter)}"
            canvas.add_node(new_id, parent=event.node_id)
            canvas.add_edge(event.node_id, new_id)


@canvas.on_hover
def hover(event):
    print(f"hover: {event.node_id} (klient {event.client_id})")


@canvas.on_view_change
def view(event):
    print(f"view_change: zoom={event.zoom}")


vb.serve(canvas, port=8080, open_browser=True)
