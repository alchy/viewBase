# Traceroute toky — Design

> Spec pro rozšíření wireshark ukázky o zobrazení cesty paketu (traceroute):
> každý router po cestě je uzel, pakety putují multi-hop přes všechny uzly
> včetně routerů. Cesty se zjišťují na pozadí, cachují a paralelně.

## Cíl

Dnešní `examples/wireshark/live_capture.py` kreslí jen dva koncové uzly
(src, dst) a tok mezi nimi. Tento návrh přidává **mezilehlé routery**: pro nový
vzdálený cíl se spustí traceroute, hopy se přidají jako uzly + hrany a paket se
vizualizuje jako tok po celé cestě `src → hop1 → … → dst`.

Funkce žije v **novém souboru** `examples/wireshark/live_route.py`;
`live_capture.py` zůstává jednoduchá (dva endpointy) jako pedagogicky čistší
základ.

## Nemění se vizualizace ani jádro

Klíčové zjištění: `canvas.flow(path=[...])` už multi-hop umí — klient
interpoluje částici po posloupnosti uzlů spojených hranami (validace v
`Canvas._resolve_flow_path`, `python/viewbase/canvas.py`). Líné `add_node` /
`add_edge` i typy uzlů (`define_type`) a per-node `label=` rovněž existují.

Proto **nesaháme do `canvas.py` ani do frontendu**. Router jako jiný tvar/barva
je jen `define_type(...)`. Zvážená jádrová alternativa (tok po „ghost" cestě bez
nutnosti existujících hran, který by odstranil krátkou přestavbu při dočasné
přímé hraně) byla zamítnuta — přínos je marginální proti existujícímu
multi-hop toku a zvolenému chování dočasné přímé hrany.

## Rozhodnutí (potvrzená)

1. **Tiché hopy** (router neodpoví na TTL → `*`): za každý neodpovídající TTL
   vznikne **placeholder uzel** (typ `unknown`, `label="*"`). Zachová přesný
   počet skoků i souvislost cesty.
2. **Umístění**: nový soubor `examples/wireshark/live_route.py`.
3. **Okno než traceroute doběhne**: **dočasná přímá hrana** `local–remote`; po
   doběhu traceroute se (je-li cesta delší než 2 uzly) odebere a nahradí cestou.

## Datový model

Capture běží na jednom hostu. Každý IP paket má **lokální** konec (naše IP) a
**vzdálený** konec. Traceroute jde z našeho hostu na vzdálený cíl, proto se
cesty **klíčují podle vzdáleného endpointu**.

- Reálné routery = uzly klíčované **IP adresou** → sdílí se napříč cestami
  (společný backbone se sám zviditelní; sdílené hrany taky).
- Tiché hopy = placeholder uzly klíčované **per (cíl, TTL)** (`*` na TTL 7 cesty
  A není totéž co `*` na TTL 7 cesty B), aby zůstaly unikátní.

### Stav cesty (`Route`)

- `PENDING` — traceroute běží; je nakreslená dočasná přímá hrana, pakety tečou
  po ní.
- `READY` — cesta `path = [local, …, remote]` známá; pakety tečou po ní.
- `FAILED` → degraduje na `READY` s `path = [local, remote]` (trvalá přímá
  hrana), když traceroute nedal žádnou použitelnou informaci.

## Komponenty (vše v `live_route.py`)

Tenké, jednoúčelové jednotky:

- **`local_addrs(iface) -> set[str]`** — naše IP adresy na rozhraní (rozliší
  lokální vs. vzdálený konec paketu). Doplněno o loopback.
- **`trace(dst, *, max_hops, timeout) -> list[tuple[int, str | None]]`** — malý
  ICMP traceroute: pro `ttl` v `1..max_hops` pošle `IP(dst=dst, ttl=ttl)/ICMP()`
  přes `sr1(timeout=…, verbose=0)`. Reply `None` → `(ttl, None)` (tichý hop);
  ICMP echo-reply (`type==0`) → `(ttl, reply.src)` a konec (dosažen cíl);
  jinak time-exceeded → `(ttl, reply.src)`, konec když `reply.src == dst`.
  Junior-readable; síťově se netestuje (v testech se mockne).
- **`build_path(local, hops, remote) -> list[str]`** — z výstupu `trace` sestaví
  ID uzlů cesty: `local`, pak za každý hop buď IP (reálný), nebo placeholder ID
  pro `None`; nakonec `remote`, pokud už není posledním reálným hopem (cíl
  neodpověděl → připojí se za poslední (i placeholder) hop, aby graf zůstal
  souvislý). Čistá funkce — testovatelná bez sítě i canvasu.
- **`RouteTable`** — *jádro*: cache cest + materializace do canvasu. Drží
  `_routes: dict[str, Route]`, `_inflight: set[str]`, `_hops: set[str]` (známé
  router IP), `_nodes: set[str]`, `_edges: set[tuple]`, `_lock: RLock`,
  `_pool: ThreadPoolExecutor`. Metody:
  - `get_or_start(local, remote) -> Route` — pod zámkem: pokud cesta není,
    založí `PENDING`, přidá uzly, **dočasnou přímou hranu**, a `pool.submit`
    traceroute (dedup: jeden traceroute na cíl).
  - `_materialize(local, remote, hops)` — worker callback: pod `canvas.batch()`
    přidá hop uzly (reálné dedup přes `_nodes`/`_hops`, placeholdery
    per-route), hrany mezi sousedy (dedup přes `_edges`), a je-li `len(path)>2`
    **odebere dočasnou přímou hranu**; pak `route.path/state` a DNS resolve.
  - `path_for(route, src) -> list[str]` — vrátí cestu orientovanou tak, aby
    `path[0] == src` (hrany jsou neorientované, takže reverz je platný).
- **`make_handler(canvas, table) -> Callable`** — tenký `on_packet`.
- **`build_canvas() -> Canvas`** — typy uzlů `host` / `router` / `unknown`, flow
  typy podle protokolu (reuse `PROTO_COLORS`), `node_label("{fqdn} [{ip}]")`,
  `detail_window` (řádky FQDN / IP / role).
- **`main()`** — argumenty `--iface --port --max-hops --timeout --workers`;
  sniff vlákno + `vb.serve`.

Reuse z `pcap_replay.py`: `PROTO_COLORS`, `classify`, `make_resolver` (reverzní
DNS se použije i na routery).

## Tok řízení (životní cyklus paketu)

```
on_packet(pkt):
    není IP / src==dst           -> ignoruj
    urči (local, remote) podle local_addrs
    remote je známý hop          -> ignoruj                                      # naše proby / provoz routeru
    remote není globální (LAN)   -> ensure přímá hrana; flow(src, dst); konec
    route = table.get_or_start(local, remote)
    READY   -> flow(path = table.path_for(route, src), type=classify(pkt))
    PENDING -> flow(src, dst, type=classify(pkt))                                # dočasná hrana
```

Materializace (worker, po doběhu traceroute):

```
hops = trace(remote, ...)
path = build_path(local, hops, remote)
with canvas.batch():
    pro id v path: ensure uzel (host/router/unknown podle role)
    pro (a,b) sousední v path: ensure hrana
    if len(path) > 2: remove_edge(local, remote)   # zruš dočasnou přímou
route.path = path; route.state = READY
resolve(ip) pro reálné router IP        # DNS na pozadí, doplní popisek
```

## Paralelismus

- Traceroute běží v `ThreadPoolExecutor(max_workers=--workers)`; každá cesta je
  nezávislá → paralelně.
- Cache (`_routes` + `_inflight`) zaručí jeden traceroute na cíl.
- Sniff handler **nikdy neblokuje** na traceroute (fire-and-submit).
- Mutace canvasu jsou thread-safe (Canvas má vlastní zámek); `RouteTable._lock`
  chrání jen vlastní cache/sety.

## Ošetřené pasti

- **Zpětná vazba prób:** naše traceroute proby (echo k cíli, time-exceeded od
  routerů) sniff také zachytí. `_inflight` brání druhému traceroute na týž cíl;
  `_hops` brání tracerouting na vlastní objevené routery (paket od/na známý hop
  se ignoruje, žádná nová cesta). Tím se odřízne rekurze.
- **Směr toku:** cesta se ukládá `[local … remote]`; pro konkrétní paket se
  otočí podle `src`, takže částice letí ve správném směru i pro příchozí pakety.
- **Cíl neodpověděl:** `remote` se připojí za poslední (i placeholder) hop —
  graf zůstane souvislý, dočasná přímá hrana se odebere (`len(path)>2`).
- **1-hop nebo úplný fail traceroute:** přímá hrana zůstane (degradace na dnešní
  chování `live_capture.py`); zaloguje se varování při úplném failu.
- **Částice v letu po odebrané dočasné hraně:** doletí — fire-and-forget toky
  jsou klientské a interpolují podle živých pozic uzlů, ne podle existence hrany.
- **Reálný router IP už existuje jako host** (objevil se i jako endpoint): uzel
  se znovu nepřidává (guard přes `_nodes`); typ zůstane podle prvního přidání.

## Vzhled

- `define_type("host", shape="sphere", color="#28d7fe")` (jako dnes).
- `define_type("router", shape="box", color="#05ffa1")` — odliší routery.
- `define_type("unknown", shape="tetrahedron", color="#5b6472", size=0.6)` —
  tiché hopy, decentní.
- Placeholder uzly: `add_node(id, type="unknown", label="*", role="hop")`.
- Reálné uzly nesou meta `ip`, `fqdn=""`, `role` (`host`/`router`); popisek z
  celocanvasové šablony `"{fqdn} [{ip}]"`.
- `detail_window(rows=[("FQDN","fqdn"), ("IP","ip"), ("role","role")])`.

## Testy

Jádra `viewbase` se netýká — žádné nové testy v `python/tests/`.

Pro ukázku (testovatelné bez sítě, s fake canvasem a injektovaným `trace`):

- `build_path`: reálné hopy, tiché → placeholdery, cíl dosažen vs. neodpověděl,
  prázdný traceroute.
- `RouteTable`: dedup (jeden traceroute na cíl; opakovaný `get_or_start` ho
  nezaloží znovu), materializace přidá správné uzly/hrany, odebrání dočasné
  hrany při `len(path)>2` a její ponechání při `len(path)==2`, orientace cesty
  (`path_for` dá `path[0]==src` pro oba směry), degradace při failu.
- `trace`: síťově se netestuje (mock `sr1`); jen ověření parsování reply →
  `(ttl, ip|None)` a ukončení na echo-reply / dosažení cíle.

Volba test runneru a fake/mock helperů se doladí v implementačním plánu;
struktura má jen umožnit unit testy nad `RouteTable`/`build_path` bez sítě.

## CLI a dokumentace

- `live_route.py` argumenty: `--iface`, `--port` (8080), `--max-hops` (30),
  `--timeout` (1.0 s), `--workers` (8).
- Vyžaduje root (sniff i traceroute proby používají raw sockety) — stejně jako
  `live_capture.py`.
- `examples/wireshark/README.md` dostane sekci „Cesta paketu (traceroute)" se
  spuštěním a poznámkou o root + `.venv/bin/python` (viz stávající blok o
  `sudo: python: command not found`).

## Mimo rozsah

- pcap offline replay traceroute (záznam cestu neobsahuje) — neřešíme.
- IPv6 traceroute — sleduje stav `live_capture.py` (jen IPv4).
- Persistence/expirace cache mezi běhy — cache je jen v paměti procesu.
