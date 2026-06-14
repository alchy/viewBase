# viewbase — návrh knihovny pro 2D/3D force-graph vizualizaci

Datum: 2026-06-10
Stav: schváleno v brainstormingu, čeká na implementační plán

## 1. Cíl

Přestavět projekt viewBase z aplikace na **knihovnu**: pip balíček `viewbase`,
pomocí kterého i junior vývojář v Pythonu postaví živou, esteticky vydařenou
2D/3D vizualizaci grafu (force-directed) — bez npm, bez buildů, bez znalosti
Three.js. Knihovna obsluhuje obousměrnou komunikaci backend ↔ browser
(data a akce dolů, eventy nahoru) a škáluje na tisíce až desítky tisíc uzlů
při plynulém obrazu (60 fps).

## 2. Výchozí stav a motivace

Dnešní repo je funkční prototyp: Flask backend počítá force-directed fyziku
(O(n²) odpuzování přes `multiprocessing.Pool`), frontend (Three.js) polluje
celý snapshot grafu každých 5 s a interpoluje pozice ve workeru. Uzly jsou
CSS2D HTML divy.

Příčiny škubání (strukturální, neladitelné konstantami):

1. Fyzika na serveru, klient ji vidí 0,2× za sekundu — mezi snapshoty klient
   lerpuje ke stárnoucím cílům a pak skáče.
2. `pool.map` v každém kroku pickluje celé pozice do procesů; pro malé grafy
   převáží režie, pro velké je čistý Python O(n²) pomalý. Po stabilizaci se
   simulační smyčka ukončí a klik (přecentrování) už nic nepřepočítá.
3. Každý uzel je DOM element — CSS2D renderer nestíhá nad stovky uzlů.

Z toho plyne hlavní architektonické rozhodnutí v1: **fyzika se stěhuje do
browseru** (Web Worker, Barnes-Hut), backend zůstává zdrojem pravdy pro data,
vzhled a chování. Pozice uzlů po síti necestují.

## 3. Požadavky (z brainstormingu)

| Otázka | Rozhodnutí |
|---|---|
| Škála | tisíce až desítky tisíc uzlů, plynulý obraz |
| Dynamika | průběžně živý graf (delty za běhu); interaktivní rozbalování jako vlastnost |
| Dimenze | 2D i 3D od začátku, společné API (`dimensions=2\|3`) |
| Konzumace | samostatná aplikace: `pip install viewbase`, vestavěný server, assety ve wheelu |
| Cílový uživatel | junior Python vývojář; funkční vizualizace do ~15 řádků |
| Estetika | systém témat; v1 vyladěná témata `modern` a `cyber` |
| Mimo rozsah v1 | Jupyter, mount do cizí aplikace, art-deco/steampunk, WASM fyzika, binární protokol, serverový layout |

### Zvažované přístupy

- **A — obalit 3d-force-graph:** nejrychlejší, ale objekt na uzel nestačí na
  cílovou škálu a estetika se ohýbá proti cizímu API. Zamítnuto.
- **B — vlastní renderer (instancing) + hotová fyzika (d3-force-3d) ve
  workeru + FastAPI/WS delty. SCHVÁLENO.**
- **C — fyzika v Pythonu, binární streaming pozic:** na cílové škále
  neprůchodné (šířka pásma, CPU serveru na klienta). Zamítnuto.

## 4. Architektura

```
┌────────────────────────────────────────┐
│  Aplikace vývojáře (Python skript)     │
│  canvas = vb.Canvas(dimensions=3, …)   │
│  canvas.add_node(…); @canvas.on_click  │
│  vb.serve(canvas)                      │
├────────────────────────────────────────┤
│  viewbase  (pip balíček)               │
│  • GraphModel – zdroj pravdy:          │
│    data + metadata + vzhled + chování  │
│  • FastAPI server + WebSocket          │
│  • static/ – zabalený frontend (JS)    │
└───────────────┬────────────────────────┘
                │  WebSocket
                │  ↓ delty (add/update/remove uzlů a hran), akce
                │  ↑ eventy (klik, hover, kamera, ready)
┌───────────────▼────────────────────────┐
│  Browser  –  viewbase.js               │
│  Connection → GraphStore (zrcadlo)     │
│       ├→ PhysicsWorker (d3-force-3d)   │
│       └→ Renderer (Three.js,           │
│           instancing, témata, labely)  │
│  Interaction (picking, kamera, detail) │
└────────────────────────────────────────┘
```

Principy:

1. **Dělba rolí:** Python určuje *co* a *jak vypadá/chová se*; browser určuje
   *kde* (fyzika lokálně) a vykresluje.
2. **Jeden kanál:** po načtení stránky vše přes WebSocket; HTTP jen pro
   stránku a assety.
3. **GraphStore je jediné zrcadlo stavu na klientovi** — aplikuje patche,
   notifikuje fyziku i renderer.

### Struktura repa

```
viewBase/
├── python/viewbase/        # pip balíček
│   ├── canvas.py           # Canvas / Node / Edge API
│   ├── server.py           # FastAPI + WS endpoint + runner (vb.serve)
│   ├── protocol.py         # definice zpráv, (de)serializace
│   └── static/             # zkompilovaný frontend (generuje build, balí se do wheelu)
├── frontend/               # zdrojáky JS – Vite/npm, jen pro vývoj knihovny
│   └── src/{core,physics,render,interact,themes}/
├── examples/               # spustitelné ukázky = živá dokumentace
└── legacy/                 # dnešní kód repa (reference; postupně zmizí)
```

Koncový uživatel npm nikdy nepotřebuje — výstup Vite buildu se commituje /
generuje v CI do `python/viewbase/static/` a jede ve wheelu.

## 5. Python API

```python
import viewbase as vb

canvas = vb.Canvas(
    title="Infrastruktura",
    dimensions=3,              # 2 nebo 3
    theme="cyber",             # vestavěné téma nebo dict (merge přes základ)
    highlight_neighbors=1,     # klik zvýrazní sousedy do N úrovní (0 = vypnuto)
)

# Typy uzlů → vzhled (tvar/barva/velikost, nebo GLB model)
canvas.define_type("server", shape="box", color="#28d7fe", size=1.4)
canvas.define_type("db", model="assets/database.glb")

# Uzel = id + libovolná metadata (kwargs); popisek = šablona nad metadaty
canvas.add_node("srv-1", type="server",
                label="{name} ({ip})",        # výchozí popisek = id
                name="Web 01", ip="10.0.0.5", os="Debian")
canvas.add_edge("srv-1", "db-1", weight=2)   # hrany nesou metadata stejně jako uzly;
                                             # weight je v1 jen metadata (fyzika ji nečte)

# Živé změny kdykoli za běhu
canvas.update_node("srv-1", status="down", color="#ff3344")
canvas.remove_node("srv-9")                   # kaskádově odstraní i hrany uzlu

# Hromadné nahrání: delty odejdou jako jedna zpráva
with canvas.batch():
    for n in velky_dataset:
        canvas.add_node(n.id, **n.meta)

@canvas.on_click
def po_kliku(event):                          # event.node_id, .client_id
    canvas.show_detail(event.node_id)         # info box z metadat
    for soused in muj_zdroj(event.node_id):   # = interaktivní rozbalování
        canvas.add_node(soused.id, **soused.meta)
        canvas.add_edge(event.node_id, soused.id)

@canvas.on_view_change                        # kamera, throttle 10 Hz
def pohled(event): ...                        # event.position, .target, .zoom

vb.serve(canvas, port=8080, open_browser=True)
```

Úplný výčet event dekorátorů: `on_click`, `on_hover`, `on_background_click`,
`on_view_change` (zrcadlí eventy protokolu v §6).

### Toky (flow) — vizualizace pohybu dat po hranách

```python
canvas.define_flow_type("http", color="#28d7fe", size=1.0)
canvas.define_flow_type("dns",  color="#ffd166", size=0.7, speed=1.5)

canvas.flow("srv-1", "db-1", type="dns", count=5, interval=0.2)   # jednorázové
tok = canvas.flow("srv-1", "db-1", count=None, interval=0.5)      # trvalé
canvas.stop_flow(tok)
canvas.flow(path=["client", "fw-1", "srv-1", "db-1"], count=3)    # multi-hop
```

- Směr = pořadí source → target (hrany jsou jinak neorientované).
- `interval` je v sekundách (rozestup mezi částicemi).
- `speed` = násobek výchozí rychlosti tématu (světové jednotky/s) — delší
  hrana znamená delší let částice.
- `count=N` je fire-and-forget; `count=None` vrací `flow_id`, tok je součástí
  stavu canvasu (přežije reconnect, je v `init`), zastavuje `stop_flow(id)`.
- Typ toku bez explicitní barvy dostane automaticky barvu z kategorické
  palety aktivního tématu.
- Vzhled částic (glow, velikost) definuje téma, přepsatelné per-flow.

### Akce server → klient

`show_detail(id)`, `focus(id)` (plynulý dolet kamery), `highlight(id, depth)`,
`set_theme(...)`, `flow(...)`, `stop_flow(id)`.

### Sémantika a vlákna

- Všechny metody Canvasu jsou thread-safe; mutace se řadí do fronty delt,
  server je vysílá dávkově (max ~30 patchů/s).
- Uživatelské handlery běží v thread-poolu — smí psát blokující kód;
  výjimka v handleru se zaloguje s tracebackem, server běží dál.
- Validace okamžitě a hlasitě (`ValueError` v místě volání): duplicitní id
  uzlu, hrana/`flow` na neexistující uzel, `flow` bez existující hrany,
  `update_node`/`remove_node` na neexistující id, duplicitní hrana.
- Chybějící klíč v label šabloně → prázdný řetězec + warning v logu při
  `add_node`/`update_node`.
- Více připojených prohlížečů = sdílený pohled na stejná data;
  `event.client_id` rozlišuje původce.

## 6. Protokol (WebSocket, JSON)

| Směr | Zpráva | Obsah |
|---|---|---|
| ↑ | `hello` | verze protokolu |
| ↓ | `init` | config, téma, typy uzlů i toků, kompletní uzly+hrany, aktivní trvalé toky, seq |
| ↓ | `patch` | seq, add/update/remove uzlů a hran (dávka) |
| ↓ | `action` | focus / show_detail / highlight / set_theme / flow / stop_flow |
| ↑ | `event` | node_click, node_hover, view_change, background_click |

- Pořadí hlídají sekvenční čísla; mezera v seq → klient si vyžádá čerstvý `init`.
- Reconnect s exponenciálním backoffem; po připojení vždy čerstvý `init`.
- `view_change` throttle 10 Hz na klientovi; patche max ~30 Hz na serveru.
- JSON + permessage-deflate. Pozice po síti necestují. Binární formát je
  budoucí optimalizace, protokol mu nesmí bránit (verzování od začátku).
- Zprávy nesou `canvas_id` — v1 obsluhuje jeden server jeden canvas, ale
  protokol je připraven na víc.

## 7. Frontend engine

Moduly `frontend/src/`:

```
core/      Connection (WS, reconnect, fronta), GraphStore (zrcadlo stavu,
           aplikace patchů, BFS pro zvýraznění, notifikace odběratelů)
physics/   PhysicsEngine (rozhraní) + D3ForceEngine (d3-force-3d ve Web
           Workeru, Barnes-Hut, numDimensions=2|3, transferable Float32Array)
render/    Renderer + vrstvy: uzly, hrany, labely, toky, efekty
interact/  kamera (orbit 3D / pan-zoom 2D), picking, detail box
themes/    definice témat + theme engine
```

### Vykreslování — počet draw callů nezávislý na počtu uzlů

- **Uzly:** `InstancedMesh` na typ uzlu (tvar z tématu nebo GLB model);
  barva/velikost per-instance atributem.
- **Hrany:** jeden společný `LineSegments` buffer; efektní témata mohou mít
  shader s glow.
- **Labely:** SDF text ve WebGL (troika-three-text), žádný DOM. LOD: popisek
  má vybraný uzel, zvýraznění sousedé a nejbližší uzly ke kameře do rozpočtu
  (default 200), plynulý fade.
- **Toky:** instancované glow částice; pozice se interpoluje po hraně mezi
  aktuálními pozicemi koncových uzlů (tok „jede“ i při pohybu uzlů).
- **Detail box:** jediný HTML overlay s tabulkou metadat, CSS z tématu.

### Fyzika a plynulost

- d3-force-3d (Barnes-Hut O(n log n)) ve Web Workeru; pozice se předávají
  jako transferable Float32Array (double-buffer).
- Render smyčka (60 fps) interpoluje mezi fyzikálními ticky — fyzika smí
  tikat pomaleji (u 50 k uzlů jednotky až nižší desítky ticků/s), obraz je
  plynulý.
- Alpha decay: simulace po usazení zhasne (CPU ~0); delta graf jen lokálně
  ohřeje. Nové uzly se rodí poblíž svých sousedů, ne náhodně v prostoru.
- `PhysicsEngine` je úzké rozhraní (delty struktury dovnitř, Float32Array
  ven) — budoucí WASM implementace nemění zbytek systému.

### Interakce

- Hover/klik raycastem proti instancím (`instanceId` → node id).
- Klik: event na server + okamžitá lokální odezva — zvýraznění sousedů do N
  úrovní (BFS ve store, ztlumení ostatních per-instance barvou) a plynulý
  dolet kamery (centrování dělá kamera klienta, ne backend fyzikou).
- Klávesnice (převzato z prototypu): W/S = posun pohledu nahoru/dolů,
  A/D = doleva/doprava, Q/E = zoom in/out, mezerník = reset pohledu.
  Funguje v 3D (orbit) i 2D (pan).
- 2D režim: stejná scéna a vrstvy, ortografická kamera, pan/zoom, fyzika ve
  2 dimenzích.

## 8. Témata

Téma = deklarativní objekt: paleta (vč. kategorické palety pro typy toků),
pozadí/mlha, materiály a geometrie podle typu uzlu, styl hran, font a vzhled
labelů, světla, post-processing (bloom), vzhled částic toků, CSS detail boxu.

- v1: `modern` (světlé, čisté, výchozí) a `cyber` (tmavé, neon, bloom).
- Vlastní téma z Pythonu = dict mergovaný přes vestavěný základ.
- `art-deco`, `steampunk` později — čistě výtvarná práce, systém je hotový.
- `quality="low" | "high" | "auto"`; `auto` při poklesu fps vypne bloom a
  sníží pixel ratio.

## 9. Zacházení s chybami

- Python: okamžitá hlasitá validace (viz §5); výjimky handlerů logovat,
  neshodit server.
- Server: vadná příchozí zpráva → log + ignorovat; nesouhlas verze
  protokolu → klient zobrazí výzvu k obnovení stránky.
- Klient: indikátor výpadku + reconnect s backoffem; chybějící WebGL →
  srozumitelná hláška; překročení doporučených počtů uzlů → warning v konzoli.

## 10. Testování

- **Python (pytest):** model a delty, serializace protokolu, WS round-trip
  přes FastAPI TestClient (init → patch → event → handler), `batch`,
  thread-safety.
- **Frontend (vitest):** GraphStore (patche, BFS), kodek protokolu, kontrakt
  fyzikálního workeru. Rendering bez jednotkových testů.
- **E2E (Playwright, smoke):** spustit ukázkový server, headless prohlížeč,
  ověřit vykreslení a round-trip kliknutí do Python handleru.
- **CI:** pytest + vitest + build frontendu + examples v režimu „nastartuje
  a nespadne“.

## 11. Příklady (živá dokumentace)

- `examples/quickstart.py` — minimální graf do 15 řádků.
- `examples/wireshark/` — vlajková ukázka, README how-to:
  - `pcap_replay.py`: parsování pcap (scapy), uzly = IP, hrany = komunikační
    páry, toky = pakety podle protokolu (typy toků = barvy), přehrávání
    v časové ose s volitelným zrychlením;
  - `live_capture.py`: totéž nad živým zachytáváním (vyžaduje oprávnění
    k rozhraní), graf roste za běhu.

## 12. Rozsah v1

**Uvnitř:** Canvas API (uzly/hrany/typy/metadata/labely), živé delty + batch,
témata `modern` + `cyber`, 2D i 3D, eventy klik/hover/kamera, detail box,
zvýraznění sousedů, focus kamery, toky + typy toků, příklady (quickstart +
wireshark), wheel se zabalenými assety, 1 server = 1 canvas.

**Venku (v2+):** Jupyter, mount do existující aplikace (FastAPI router),
více canvasů na server, art-deco/steampunk, WASM fyzika, binární protokol,
serverový předvýpočet layoutu pro statické grafy.
