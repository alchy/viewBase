# DX zjednodušení knihovny viewbase

Stav: schváleno uživatelem 2026-07-15 (všech 7 návrhů + opravy z review jako krok 0)

Cíl: odstranit tři "zdi" pro cílového uživatele z README ("i junior v Pythonu"):
Node.js při instalaci, `threading` v uživatelském kódu a stínový stav vedle
canvasu. Verze 0.1.0 → breaking changes povoleny, žádné deprecation vrstvy.

## Krok 0 — opravy chyb z code review (před nadstavbou)

1. **Duplicitní pružiny** (`frontend/src/physics/core.js`): `applyPatch`
   nededupuje `addLinks` (uzly ano). Po connectu s pending deltami init už
   hranu obsahuje a následný patch ji přidá podruhé → dvojitá síla v d3-force.
   Fix: dedup přes `linkKey` proti existujícím linkům.
2. **Duplicitní trvalý tok** (`frontend/src/render/flow.js`): interleaving
   `flow()` → connect → broadcast tick doručí tok v initu i akci; `applyFlow`
   není idempotentní → dvojitý proud částic, po `stop_flow` osiřelá kopie
   navždy. Fix: `applyFlow` při existujícím `flowId` starý tok nahradí.
3. **Ignorovaný `speed` typu toku**: rychlost počítá jen `flow.speed`;
   `define_flow_type(speed=…)` nemá účinek. Fix: efektivní rychlost
   `baseSpeed * flow.speed * (style.speed ?? 1)` v `update()` i `particles()`.
4. **Toky přes odstraněné uzly**: server `_flows` nečistí při
   `remove_node`/`remove_edge` (stale toky v initu navždy); klient s
   `travelTime=0` částice nikdy nekulluje → neomezený růst pole. Fix: server
   invaliduje toky, jejichž path obsahuje odstraněný uzel/hranu, a zařadí
   `stop_flow`; klient v `update()` zahodí tok, jehož path uzel zmizel ze
   store (kontrola proti store, ne display — display může chybět dočasně).

## 1. `pip install viewbase` — wheel s buildnutým frontendem

- `python/pyproject.toml`: `static/**` jako package data (ověřit/doplnit).
- GitHub Actions: job build frontendu (`npm ci && npm run build`) → wheel
  (`python -m build`) → na git tag `v*` publish na PyPI (`PYPI_API_TOKEN`
  secret; publikaci spouští uživatel tagem, knihovna jen připraví pipeline).
- README: primární cesta `pip install viewbase`; Node jen pro vývoj knihovny.

## 2. `@canvas.every(seconds)` — periodické úlohy

```python
@canvas.every(2.0)
def tick(): ...
```

- Registrace do `canvas._tasks` (před `serve`; pozdější registrace se
  zaloguje jako warning a ignoruje — v1 bez hot-startu).
- `serve()` v lifespan spustí per-úlohu daemon vlákno:
  `while not stop.wait(interval): func()`; výjimka se zaloguje, smyčka běží
  dál (vzor `_run_handler`). Shutdown nastaví stop event.
- První tick až po uplynutí intervalu (ne hned) — předvídatelné.

## 3. `serve(block=False)` → `ServerHandle`

```python
server = vb.serve(canvas, block=False)   # vrátí handle, prompt volný
server.port                              # skutečný port (i pro port=0)
server.stop()                            # nebo: with vb.serve(...) as s:
```

- `uvicorn.Server` v daemon vlákně (v ne-main vlákně uvicorn signal handlery
  neinstaluje), čekání na `server.started` s timeoutem.
- `stop()`: `should_exit = True`, join s timeoutem, `canvas.close()`.
- `block=True` (default) zachová dnešní chování beze změny.

## 4. `ensure_node` / `ensure_edge` — idempotentní zápis (varianta A)

- `ensure_node(id, *, type=None, label=None, **meta)`: neexistuje → add;
  existuje → merge meta (emituje update jen při reálné změně). Odlišný
  `type`/`label` od uloženého → `ValueError` (shodné hodnoty OK — idempotence);
  změna typu za běhu patří do Plánu 2b.
- `ensure_edge(a, b, **meta)`: neexistuje → add; existuje → merge meta
  (klientský store adds upsertuje, protokol se nemění); beze změny → no-op.
- Striktní `add_*` zůstávají (duplicita = bug u statických grafů).

## 5. Čtecí API canvasu

- `has_node(id)`, `has_edge(a, b)` → bool.
- `node(id)` → `{"id", "type", "label", "meta"}` (kopie, vyrenderovaný label),
  `None` když neexistuje; `edge(a, b)` analogicky.
- `nodes`, `edges` (property) → seznamy kopií jako v `snapshot()`.
- Vše pod zámkem, vrací kopie — mutace návratu neovlivní stav.

## 6. Import grafů — `add_graph()` / `from_networkx()` / `add_edges()`

- `add_graph(g, *, type_attr=None, label=None)`: duck-typing přes
  `g.nodes(data=True)` a `g.edges(data=True)` (bez závislosti na networkx);
  id → `str()`; atributy → meta; `type_attr` vybere meta klíč jako typ uzlu,
  neznámé typy se auto-registrují prázdným stylem; self-loops se přeskočí
  s warningem; celé v `batch()`, přes `ensure_*` (multigraf nevadí).
- `from_networkx(g, ..., **canvas_kwargs)` = classmethod: `Canvas()` +
  `add_graph`.
- `add_edges(pairs)`: bulk `add_edge` pro dvojice (bez networkx).

## 7. Control okna — `number`, `boolean`, `live`

- `controls.py`: `number(key, label, *, min, max, value, step=None)` (float,
  clamp), `boolean(key, label, *, value=False)` (strict bool ve validaci).
- Frontend: number → slider (`input type=range`) s číselným displayem,
  boolean → checkbox.
- `open_window(win, on_submit=…, live=True)`: spec nese `live`; frontend
  posílá `window_submit` při změně (throttle ~150 ms) a skryje tlačítko
  Použít. Default `live=False` beze změny.

## Dopady na příklady a dokumentaci

- `quickstart.py`: bez `threading` (krok 2).
- `showcase.py`: `number` pole pro elasticitu, `every()` pro provoz,
  čtecí API v `on_click`.
- `wireshark/live_route.py`: `ensure_node`/`ensure_edge` místo stínových
  setů `_nodes`/`_edges` v `RouteTable`.
- README: instalace přes pip, nové koncepty (every, block=False, ensure,
  čtení, import grafů).

## Testování

Pytest: každá nová metoda canvasu (včetně chybových cest), invalidace toků,
ServerHandle start/stop, every() spuštění/stop/výjimka, add_graph s fake
graph objektem, validace number/boolean. Vitest: dedup linků, idempotentní
applyFlow, type speed, kulling toků po remove_node, render nových polí,
live submit. Pořadí realizace: 0 → 4+5 → 2 → 3 → 6 → 7 → 1 → příklady.
