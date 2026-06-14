"""Showcase estetiky a toků: téma cyber, typy uzlů s tvary a barvami,
živé update_node color, highlight_neighbors=2, typy toků a:
 - trvalý tok na pozadí (klient → server),
 - fire-and-forget tok při kliku na uzel (uzel → DB)."""
import random
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="Showcase", theme="cyber", highlight_neighbors=2)
canvas.define_type("server", shape="box", color="#28d7fe", size=1.4)
canvas.define_type("db", shape="octahedron", color="#ff2a6d", size=1.6)
canvas.define_type("client", shape="sphere", color="#05ffa1", size=0.9)

canvas.define_flow_type("query", color="#ffd166", speed=1.3)   # klik → DB
canvas.define_flow_type("heartbeat")                            # bez barvy → paleta

with canvas.batch():
    for i in range(3):
        canvas.add_node(f"srv-{i}", type="server", label="{name}",
                        name=f"Server {i}", os="Debian")
    canvas.add_node("db-0", type="db", label="{name}", name="Hlavní DB")
    for i in range(12):
        canvas.add_node(f"cl-{i}", type="client", label="{name}",
                        name=f"Klient {i}", status="idle")
        canvas.add_edge(f"cl-{i}", f"srv-{i % 3}")
    for i in range(3):
        canvas.add_edge(f"srv-{i}", "db-0")

# trvalé toky na pozadí: každý server tepe heartbeaty do DB
for i in range(3):
    canvas.flow(f"srv-{i}", "db-0", type="heartbeat", count=None, interval=0.8)


@canvas.on_click
def on_click(event):
    """Klik na klienta → tok dotazu přes jeho server do DB (multi-hop)."""
    node_id = event.node_id
    if node_id.startswith("cl-"):
        idx = int(node_id.split("-")[1])
        canvas.flow(path=[node_id, f"srv-{idx % 3}", "db-0"],
                    type="query", count=4, interval=0.15)


def provoz():
    """Náhodný klient se rozsvítí dožluta a zase zhasne – živá data."""
    while True:
        time.sleep(2.0)
        cl = f"cl-{random.randrange(12)}"
        canvas.update_node(cl, color="#ffd166", status="busy")
        time.sleep(1.0)
        canvas.update_node(cl, color="#05ffa1", status="idle")


threading.Thread(target=provoz, daemon=True).start()
vb.serve(canvas, port=8080, open_browser=True)
