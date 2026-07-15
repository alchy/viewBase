# viewbase

**Živá 2D/3D force-graph vizualizace ovládaná z Pythonu.** Fyzika běží
v prohlížeči (Web Worker, d3-force-3d), rendering je instancovaný (Three.js),
server posílá jen delty přes WebSocket — plynulé i pro tisíce uzlů, bez psaní
JavaScriptu.

```python
import viewbase as vb

canvas = vb.Canvas(title="Ahoj graf")
canvas.add_node("a", name="Alfa")
canvas.add_node("b", name="Beta")
canvas.add_edge("a", "b")

vb.serve(canvas, open_browser=True)
```

Živá data bez threadingu, REPL/Jupyter režim, toky částic po hranách,
control okna řízená z backendu, import networkx grafů:

```python
@canvas.every(2.0)                 # periodická úloha spravovaná knihovnou
def tick():
    canvas.ensure_node("x", status="ok")

server = vb.serve(canvas, block=False)   # neblokující (REPL/Jupyter)
```

Dokumentace, ukázky a zdrojové kódy: <https://github.com/alchy/viewBase>.
