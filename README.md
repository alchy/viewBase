# viewbase

**Živá 2D/3D force-graph vizualizace ovládaná z Pythonu.**

Knihovna, kterou i junior vývojář v Pythonu postaví interaktivní vizualizaci
vztahů (graf) v ploše nebo prostoru — bez psaní JavaScriptu, bez npm, bez
znalosti Three.js. Python je zdroj pravdy pro *data, vzhled a chování*;
prohlížeč počítá *rozmístění* (fyzika běží lokálně) a vykresluje. Díky tomu
je obraz plynulý a knihovna zvládá tisíce až desítky tisíc uzlů.

```python
import viewbase as vb

canvas = vb.Canvas(title="Ahoj graf", dimensions=3)
canvas.add_node("a", name="Alfa")
canvas.add_node("b", name="Beta")
canvas.add_edge("a", "b")

vb.serve(canvas, open_browser=True)   # otevře prohlížeč, graf se sám usadí
```

---

## Proč to takhle

Klasická úskalí force-graph vizualizací (škubání, strop pár stovek uzlů) plynou
z toho, že fyzika běží na serveru a klient dostává snapshoty po síti. viewbase to
obrací:

- **Fyzika běží v prohlížeči** ve Web Workeru (d3-force-3d, Barnes-Hut
  *O(n log n)*) — obraz je plynulý na 60 fps, pozice uzlů po síti vůbec
  necestují.
- **Instancovaný rendering** (Three.js `InstancedMesh`) — počet draw callů
  nezávisí na počtu uzlů; popisky jsou SDF text ve WebGL s LOD rozpočtem,
  ne tisíce DOM elementů.
- **Server posílá jen delty** (přidej/změň/odeber uzel·hranu, akce) přes
  WebSocket; graf se může za běhu průběžně přestavovat.

Naměřeno (Apple M4 Pro, headless Chromium): **3 000 uzlů ~120 fps**,
**10 000 uzlů ~86 fps**.

---

## Instalace a spuštění

Knihovna zatím není na PyPI — instaluje se ze zdrojů (frontend se sestaví do
balíčku, koncový uživatel npm nepotřebuje):

```bash
git clone <repo> && cd viewBase
python -m venv .venv && source .venv/bin/activate
pip install -e "python[dev]"

# jednorázové sestavení frontendu do python/viewbase/static
(cd frontend && npm install && npm run build)

python examples/quickstart.py     # otevře http://127.0.0.1:8080
```

**Požadavky:** Python ≥ 3.10, Node.js ≥ 20 (jen pro build frontendu).

---

## Základní API

Vše se točí kolem objektu `Canvas`. Po nastavení grafu zavoláš `vb.serve(canvas)`,
což spustí server a zablokuje; mutace canvasu pak dělej z jiných vláken (Canvas
je thread-safe).

### Canvas

```python
canvas = vb.Canvas(
    title="Infrastruktura",
    dimensions=3,            # 2 (ortho, pan/zoom) nebo 3 (orbit)
    theme="cyber",           # "modern" | "cyber" | vlastní dict
    highlight_neighbors=1,   # klik zvýrazní sousedy do N úrovní (0 = vypnuto)
    quality="auto",          # "low" | "high" | "auto" (fps watchdog)
)
```

### Uzly a hrany

```python
# Uzel = id + libovolná metadata (kwargs)
canvas.add_node("srv-1", name="Web 01", ip="10.0.0.5", os="Debian")
canvas.add_edge("srv-1", "db-1", weight=2)   # hrany nesou metadata také

# Živé změny kdykoli za běhu (režim "průběžně živý graf")
canvas.update_node("srv-1", status="down")   # mění metadata; popisek se přepočítá
canvas.remove_node("srv-9")                   # kaskádově odebere i hrany uzlu
canvas.remove_edge("srv-1", "db-1")

# Hromadné nahrání: delty odejdou jako jedna zpráva
with canvas.batch():
    for n in velky_dataset:
        canvas.add_node(n.id, **n.meta)
```

### Popisek uzlu

Popisek (text nad uzlem) se sestavuje **na serveru z metadat** podle šablony
`{klíč}`. Buď ho deklaruješ jednou pro celý canvas, nebo per-uzel:

```python
canvas.node_label("{name} ({ip})")                    # celocanvasová šablona
canvas.add_node("srv-1", name="Web", ip="10.0.0.5")   # → "Web (10.0.0.5)"

canvas.add_node("x", label="{name}", name="X")        # per-uzel přebije šablonu
```

Priorita: per-uzel `label=` > `node_label` > id uzlu. Popisek se **automaticky
přepočítá** při `update_node` — stačí poslat nové metadatum.

### Typy uzlů a témata

```python
# Typ uzlu = vzhled (tvar / barva / velikost). Per-uzel meta color/size přebije.
canvas.define_type("server", shape="box", color="#28d7fe", size=1.4)
canvas.define_type("db", shape="octahedron", color="#ff2a6d", size=1.6)
canvas.add_node("srv-1", type="server", name="Web 01")
```

Tvary: `sphere` (výchozí), `box`, `octahedron`, `tetrahedron`. Vestavěná témata
`modern` (světlé, čisté) a `cyber` (tmavé, neon + bloom). Vlastní téma se předá
jako dict, který se sloučí přes vestavěný základ.

---

## Interakce

### Eventy (prohlížeč → Python)

```python
@canvas.on_click
def po_kliku(event):              # event.node_id, event.client_id
    canvas.show_detail(event.node_id)
    for soused in muj_zdroj(event.node_id):     # = interaktivní rozbalování
        canvas.add_node(soused.id, **soused.meta)
        canvas.add_edge(event.node_id, soused.id)

@canvas.on_hover
def po_najeti(event): ...          # event.node_id (None při odjetí)

@canvas.on_background_click
def do_prazdna(event): ...

@canvas.on_view_change             # throttle 10 Hz
def pohled(event): ...             # event.position, event.target, event.zoom
```

Handlery běží v thread-poolu; výjimka v handleru se zaloguje a server běží dál.

### Akce (Python → prohlížeč)

```python
canvas.focus("srv-1")             # kamera plynule doletí k uzlu
canvas.highlight("srv-1", depth=2)
canvas.show_detail("srv-1")       # otevře detailní okno
canvas.set_theme("cyber")         # přepne téma za běhu (včetně bloomu)
```

### Detailní okno (styl Amiga Workbench)

Klik na uzel otevře tažitelné okno s metadaty uzlu. Okno lze minimalizovat
(sedne do doku vlevo dole), obnovit a zavřít; klik na hodnotu ji zkopíruje do
schránky. Více oken naráz, se z-orderem.

```python
canvas.detail_window(
    rows=[("FQDN", "fqdn"), ("IP", "ip")],   # (popisek, meta_klíč); None = vše
    width_chars=42,                           # šířka těla v monospace znacích
    open_on_click=True,                       # klik na uzel otevře okno
)
```

### Toky (vizualizace pohybu dat po hranách)

Světelné body putující po hraně definovanou rychlostí — např. pakety, zprávy,
provoz.

```python
canvas.define_flow_type("http", color="#28d7fe")
canvas.define_flow_type("dns",  color="#ffd166", speed=1.5)

canvas.flow("srv-1", "db-1", type="http", count=5, interval=0.2)   # jednorázové
tok = canvas.flow("srv-1", "db-1", count=None, interval=0.5)       # trvalé
canvas.stop_flow(tok)
canvas.flow(path=["client", "fw-1", "srv-1", "db-1"], count=3)     # multi-hop
```

`count=N` je fire-and-forget; `count=None` vrací `flow_id` a tok běží dál
(přežije reconnect klienta), dokud ho `stop_flow` nezastaví. Toky jezdí jen po
existujících hranách (jinak `ValueError`).

### Ovládání pohledu (v prohlížeči)

| Vstup | Akce |
|---|---|
| Levé tlačítko + táhnout | orbit (3D) / posun (2D) |
| Kolečko | zoom |
| W / S / A / D | náklon a otáčení (3D) / posun (2D) |
| Q / E | přiblížit / oddálit |
| R nebo mezerník | reset pohledu |
| Klik na uzel | zvýraznění sousedů + detailní okno |

---

## Příklady

| Soubor | Co ukazuje |
|---|---|
| `examples/quickstart.py` | minimální živý graf (3D) |
| `examples/quickstart2d.py` | 2D ortografický režim |
| `examples/interactive.py` | klik → rozbalení sousedů (eventy/akce) |
| `examples/showcase.py` | téma cyber, typy uzlů, živé barvy, toky |
| `examples/words.py` | mapa slov z Wikipedie (crawl odkazů do hloubky) |
| `examples/stress.py` | zátěžový test (tisíce uzlů, preferential attachment) |
| `examples/wireshark/` | **síťové toky**: přehrání pcap i živý odposlech |

Wireshark příklad (uzly = IP/FQDN, hrany = komunikační páry, toky = pakety
podle protokolu) má vlastní [how-to](examples/wireshark/README.md). Živý
odposlech vyžaduje root:

```bash
python examples/wireshark/make_sample_pcap.py sample.pcap   # vzorek
python examples/wireshark/pcap_replay.py sample.pcap --speed 4
sudo python examples/wireshark/live_capture.py --iface en0  # živě (jen IPv4)
```

---

## Architektura

```
Python skript (Canvas API)
        │  data + metadata + vzhled + chování
viewbase (pip balíček: GraphModel, FastAPI + WebSocket, zabalený frontend)
        │  ↓ delty + akce          ↑ eventy (klik, hover, kamera)
Browser (viewbase.js)
        ├─ GraphStore  – jediné zrcadlo stavu
        ├─ PhysicsWorker – d3-force-3d (Barnes-Hut, 2D/3D)
        └─ Renderer – Three.js instancing, témata, SDF labely, toky, okna
```

Detailní návrhové dokumenty jsou v `docs/superpowers/specs/` (architektura,
interakce, estetika, toky, detailní okno) a implementační plány v
`docs/superpowers/plans/`.

### Struktura repozitáře

```
python/viewbase/      pip balíček (canvas, server, protocol, zabalený static/)
frontend/             zdrojáky JS (Vite) – vyvíjí se s npm, build → static/
examples/             spustitelné ukázky = živá dokumentace
docs/superpowers/     návrhové specifikace a plány
legacy/               původní prototyp (referenční)
```

---

## Vývoj

```bash
pip install -e "python[dev]"
cd python && python -m pytest -q          # backend testy
cd frontend && npm install && npm test    # frontend testy (vitest)
cd frontend && npm run build              # sestaví static/ pro balíček
```

Frontend se vyvíjí s Vite/npm, ale výstup buildu se zabalí do Python balíčku —
koncový uživatel npm nepotřebuje.

---

## Stav

Funkční jádro v1: živý 2D/3D graf, typy uzlů, témata (modern/cyber), SDF
popisky, bloom, quality=auto, eventy/akce, zvýraznění sousedů, detailní okno,
toky a typy toků, wireshark příklady. Plánováno dále: GLB modely uzlů,
distribuce přes wheel + CI, IPv6 v živém odposlechu.
