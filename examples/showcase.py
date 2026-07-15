"""Showcase estetiky a toků: téma cyber, typy uzlů s tvary a barvami,
živé update_node color, highlight_neighbors=2, typy toků a:
 - trvalý tok na pozadí (klient → server),
 - fire-and-forget tok při kliku na uzel (uzel → DB, cíl z meta uzlu),
 - live control okno (hrany čára/splajn + elasticita bez tlačítka Použít).
Žádný threading – periodický provoz řeší @canvas.every()."""
import random

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
                        name=f"Klient {i}", status="idle",
                        server=f"srv-{i % 3}")
        canvas.add_edge(f"cl-{i}", f"srv-{i % 3}")
    for i in range(3):
        canvas.add_edge(f"srv-{i}", "db-0")

# trvalé toky na pozadí: každý server tepe heartbeaty do DB
for i in range(3):
    canvas.flow(f"srv-{i}", "db-0", type="heartbeat", count=None, interval=0.8)


@canvas.on_click
def on_click(event):
    """Klik na klienta → tok dotazu přes jeho server do DB (multi-hop).
    Cíl se čte z metadat uzlu (čtecí API), žádné parsování id."""
    node = canvas.node(event.node_id)
    if node and node["type"] == "client":
        canvas.flow(path=[node["id"], node["meta"]["server"], "db-0"],
                    type="query", count=4, interval=0.15)


_busy: list[str] = []


@canvas.every(1.5)
def provoz() -> None:
    """Náhodný klient se rozsvítí dožluta, další tik ho zhasne – živá data."""
    while _busy:
        canvas.update_node(_busy.pop(), color="#05ffa1", status="idle")
    cl = f"cl-{random.randrange(12)}"
    canvas.update_node(cl, color="#ffd166", status="busy")
    _busy.append(cl)


# control okno: styl hran (čára/splajn) + elasticita; live = změny se
# aplikují rovnou při tažení slideru, bez tlačítka Použít
_render_win = vb.ControlWindow("render", title="Vykreslování")
_render_win.enum("style", "Hrany",
                 options=[("line", "Čáry"), ("spline", "Splajny")],
                 value="line")
_render_win.number("elasticity", "Elasticita", min=0.0, max=1.0,
                   value=0.3, step=0.05)


def _apply_render(event):
    canvas.set_edge_style(event.values["style"],
                          elasticity=event.values["elasticity"])


canvas.open_window(_render_win, on_submit=_apply_render, live=True)

vb.serve(canvas, port=8080, open_browser=True)
