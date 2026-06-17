# Control okna (backendem řízené parametrické GUI) — Design

> Backendem definované parametrické okno: backend pošle požadavek na vykreslení
> okna s typovanými poli, uživatel hodnoty změní a tlačítkem **Použít** je POSTem
> pošle zpět; backend je zvaliduje a podle nich řídí graf (akcí protokolu).
> Vlajkový konzument: přepínání hran mezi **čarami** a **splajny** (křivkami) a
> nastavení jejich **elasticity**.

## Cíl

1. **Generický, DRY mechanismus** pro výměnu parametrů mezi backendem a
   frontendem: jedna sdílená struktura („field descriptor") pro libovolné
   hodnoty a dialogy. Zatím tři typy polí: **int** (rozmezí min–max), **string**
   (délka řetězce) a **enum** (výběr z možností).
2. **Konkrétní konzument** dokazující smysl: control okno s enum `style`
   (`line`/`spline`) a int `elasticity`, napojené na novou akci grafu
   `set_edge_style`, kterou renderer kreslí hrany jako rovné čáry nebo křivky.

## Rozsah (potvrzeno)

- **A + B naráz:** generický mechanismus oken (A) i reálné křivkové vykreslení
  hran s elasticitou (B), drátované end-to-end v příkladu.
- Splajn = **křivkové hrany** (kvadratický bezier), elasticita = míra prohnutí.
- Doručení změn: **až na tlačítko Použít** (okno nasbírá hodnoty, pošle jedním
  eventem).
- Control okna **přežijí reconnect**: ukládají se do stavu a posílají v `init`
  (jako trvalé toky); po F5 se obnoví včetně posledních hodnot.

## Nezavádíme nový transport

Obousměrný kanál už existuje a je generický:

- **backend → frontend:** akce (`{"type":"action", ...}` přes
  `Canvas.drain_actions` → `server._broadcast_step`).
- **frontend → backend:** eventy (`connection.send({"type":"event", event,
  payload})` → `server` → `Canvas.dispatch_event(name, payload)` → handlery v
  thread-poolu).

Přidáváme jen nové **názvy akcí** (`open_window`, `close_window`,
`set_edge_style`) a jeden nový **event** (`window_submit`). `server.py` se nemění.

## DRY jádro — field descriptor

Jediná sdílená struktura pro oba směry i pro validaci na obou stranách.

### Pole (field)

```jsonc
// int
{ "key": "elasticity", "label": "Elasticita", "type": "int",
  "value": 30, "min": 0, "max": 100, "step": 1 }
// string
{ "key": "label", "label": "Popisek", "type": "string",
  "value": "", "maxlength": 32 }
// enum
{ "key": "style", "label": "Hrany", "type": "enum", "value": "line",
  "options": [ {"value": "line", "label": "Čáry"},
               {"value": "spline", "label": "Splajny"} ] }
```

### Okno (window spec)

```jsonc
{ "window_id": "render", "title": "Vykreslování", "fields": [ <field>, ... ] }
```

### Submit (frontend → backend)

```jsonc
{ "type": "event", "event": "window_submit",
  "payload": { "window_id": "render",
               "values": { "style": "spline", "elasticity": 60 } } }
```

Backend staví spec typovanými metodami, frontend z něj staví widgety, a **týž
field list řídí clamp na obou stranách**. Nový typ pole = přidat builder +
widget + clamp pravidlo (po jednom místě každé). To je DRY/rozšiřitelnost.

## Backend

### `python/viewbase/controls.py` (nový)

`ControlWindow` — drží `window_id`, `title` a uspořádaný seznam polí:

```python
win = ControlWindow("render", title="Vykreslování")
win.enum("style", "Hrany",
         options=[("line", "Čáry"), ("spline", "Splajny")], value="line")
win.integer("elasticity", "Elasticita", min=0, max=100, value=30)
win.string("label", "Popisek", maxlength=32, value="")
```

- `integer(key, label, *, min, max, value, step=1)`
- `string(key, label, *, maxlength, value="")`
- `enum(key, label, *, options, value)` — `options` je seznam `(value, label)`
  dvojic nebo holých hodnot (ty se zlabelují samy sebou).
- `.spec() -> dict` — `{window_id, title, fields:[...]}` pro akci/`init`.
- `.apply(values: dict) -> None` — přepíše `value` u polí podle (už zvalidovaných)
  hodnot (kvůli replay v `init`).

Čistá funkce (testovatelná bez canvasu):

```python
def validate_values(fields: list[dict], raw: dict) -> dict:
    """Vrať jen platné, oříznuté hodnoty podle field descriptorů:
    int → clamp do [min, max] (a na int); string → ořež na maxlength;
    enum → musí být z options, jinak se klíč vynechá; neznámé klíče se zahodí."""
```

### `python/viewbase/canvas.py`

- Stav: `self._windows: dict[str, ControlWindow]`, `self._window_callbacks:
  dict[str, Callable]`. Do `config` přibude
  `"edge_style": {"style": "line", "elasticity": 0.0}` (default rovné čáry).
- `open_window(window: ControlWindow, *, on_submit: Callable | None = None) ->
  str` — uloží okno do `_windows`, callback do `_window_callbacks`, zařadí akci
  `{"action": "open_window", **window.spec()}`; vrátí `window_id`. Opakované
  `open_window` se stejným `window_id` okno nahradí (a pošle novou akci).
- `close_window(window_id) -> None` — odebere ze stavu, zařadí akci
  `{"action": "close_window", "window_id": ...}`.
- `set_edge_style(style: str, elasticity: float = 0.0) -> None` — `style` musí
  být `"line"` nebo `"spline"`; `elasticity` se clampne do `[0.0, 1.0]`. Uloží do
  `config["edge_style"]` a zařadí akci `{"action": "set_edge_style", "style":
  ..., "elasticity": ...}`.
- Interní handler eventu `window_submit` (zaregistrovaný stejným mechanismem
  jako `on_click` v `__init__`, metoda `_on_window_submit`): najde okno podle
  `window_id` (neznámé → no-op), zvaliduje `values` přes `validate_values`,
  zavolá `window.apply(clean)` (uloží hodnoty pro `init`) a pokud existuje
  callback, zavolá `callback(event)` s `event.values = clean`,
  `event.window_id`, `event.client_id`. Výjimka v callbacku se zaloguje (stejně
  jako u ostatních handlerů).
- `snapshot()` + klíč `"windows": [w.spec() for w in self._windows.values()]`
  (a `config` už nese `edge_style`).

### `python/viewbase/protocol.py`

`init_message(... , windows: list)` — přidá klíč `"windows"`. (Server volá
`init_message(**snap)`, takže stačí, že `snapshot()` `windows` nese.)

### `python/viewbase/__init__.py`

Export `ControlWindow`.

### Validace na backendu (bezpečnost)

`_on_window_submit` **vždy** clampuje/validuje příchozí `values` proti field
specům — klient může poslat cokoli. Callback dostane jen čisté hodnoty.

## Frontend

### `frontend/src/render/windows.js` — extrakce `BaseWindow` (DRY)

Chrome dnešního `DetailWindow` (titlebar s gadgety zavřít/minimalizovat/obnovit,
tažení za záhlaví, dok vlevo dole, z-order, `clampToCanvas`/`_place`) se vytáhne
do třídy **`BaseWindow`**. `DetailWindow extends BaseWindow` a dodá jen tělo
(řádky klíč/hodnota). Existující čisté funkce a `windows.test.js` zůstanou beze
změny chování.

### `frontend/src/render/control_window.js` (nový)

`ControlWindow extends BaseWindow` — tělo = formulář a tlačítko **Použít**.

- Widgety per typ: **int** → `<input type=range min max step>` + zrcadlící
  číselné `<input type=number>`; **string** → `<input type=text maxlength>`;
  **enum** → `<select>` s `<option>` z `options`.
- Tlačítko **Použít** přečte hodnoty všech polí, lokálně je clampne a zavolá
  `onSubmit({window_id, values})`.
- Čisté helpery (vitest): `buildFieldSpec(field)` (popis widgetu), `readValues(
  fields, rootEl)`, `clampValue(field, raw)` (zrcadlo backendu).

### `frontend/src/render/windows.js` — `WindowManager` zobecnění

Mapa oken po generickém `id` (nodeId pro detail, window_id pro control). Metody:
`openDetail(nodeId)` (dnešní `openFor`), `openControl(spec, onSubmit)`,
`closeControl(window_id)`. Dok i z-order sdílené přes `BaseWindow`. `onPatch`
refreshuje **jen detailní** okna (control okna patch ignorují).

### `frontend/src/render/renderer.js` — křivkové hrany

- Stav `this.edgeStyle = "line"`, `this.edgeElasticity = 0`.
- `setEdgeStyle({style, elasticity})` — uloží; bez rebuildu geometrie (přepočet
  je per-frame ve `_syncEdges`).
- Čistá funkce `bezierEdgePoints(a, b, elasticity, segments)` — kvadratický
  bezier: řídicí bod = střed úsečky + kolmice·(elasticity·délka·`MAX_BOW`).
  Kolmice v 3D = `normalize(dir × ref)` (ref = osa Y, fallback osa X při
  rovnoběžnosti). Vrátí `segments+1` bodů; při `elasticity=0` rovná čára.
- `_syncEdges` větví: `line` = dnešní 2 vrcholy/hrana; `spline` = každou hranu
  tesseluje na `SEGMENTS` segmentů (= `SEGMENTS×2` vrcholů do `LineSegments`).
- `_ensureEdgeCapacity` počítá s `edges × SEGMENTS` ve spline režimu.
  `SEGMENTS = 12`, `MAX_BOW = 0.5` (konstanty).

### `frontend/src/main.js` + `core/store.js`

- Akce: `open_window: (msg) => windowManager.openControl(msg, submit)`,
  `close_window: (msg) => windowManager.closeControl(msg.window_id)`,
  `set_edge_style: (msg) => renderer.setEdgeStyle(msg)`.
- `submit` = `(payload) => connection.send(buildEvent("window_submit", payload))`.
- Na `init`: `store.windows` se přehrají přes `windowManager.openControl` (jako
  `flows`); `renderer.setEdgeStyle(store.config.edge_style)`.
- `store.js`: v `applyInit` ulož `this.windows = msg.windows ?? []`; `config`
  nese `edge_style`.

## Příklad

Rozšíření `examples/showcase.py` (snadno spustitelný bez rootu, už má hrany i
toky) — control okno napojené na styl hran:

```python
win = vb.ControlWindow("render", title="Vykreslování")
win.enum("style", "Hrany",
         options=[("line", "Čáry"), ("spline", "Splajny")], value="line")
win.integer("elasticity", "Elasticita", min=0, max=100, value=30)

def apply_render(event):
    v = event.values
    canvas.set_edge_style(v["style"], elasticity=v["elasticity"] / 100)

canvas.open_window(win, on_submit=apply_render)
```

Elasticita v okně **0–100** → renderer **0–1** (děleno 100 v callbacku).

## Tok události (end-to-end)

```
open_window(win, on_submit=apply_render)
  → akce open_window {window_id, title, fields}  → frontend postaví formulář
uživatel: style=spline, elasticity=60, [Použít]
  → event window_submit {window_id, values:{style:"spline", elasticity:60}}
_on_window_submit → validate_values → win.apply(clean) → apply_render(event)
  → canvas.set_edge_style("spline", 0.6)
  → akce set_edge_style → renderer.setEdgeStyle → křivkové hrany
F5: init nese windows (poslední hodnoty) + config.edge_style → okno i křivky obnoveny
```

## Testy

### Backend (pytest, `python/tests/`)

- `controls.py`: builders `integer/string/enum` produkují správný spec; `.apply`
  přepíše hodnoty; `validate_values` — clamp int do rozmezí (a na int), ořez
  stringu na maxlength, enum mimo options se vynechá, neznámé klíče zahozeny.
- `canvas.py`: `open_window` zařadí akci a je v `snapshot()["windows"]`;
  opakované `open_window` se stejným id okno nahradí; `close_window` odebere +
  akce; `set_edge_style` uloží do `config["edge_style"]` + akce, nevalidní
  `style`/elasticita mimo rozsah ošetřeny; `window_submit` event → `validate_
  values` + `win.apply` + callback dostane čisté hodnoty; neznámý `window_id`
  je no-op; `init` nese `windows` i `edge_style`.
- `protocol.py`: `init_message` nese `windows`.

### Frontend (vitest, `frontend/tests/`)

- `control_window`: `buildFieldSpec`/`readValues`/`clampValue` (int/string/enum,
  zrcadlí backend).
- `renderer`/čistá `bezierEdgePoints`: počet bodů `segments+1`, koncové body =
  `a`/`b`, prohnutí ve středu roste s elasticitou, `elasticity=0` → kolineární.
- `BaseWindow` extrakce: stávající `windows.test.js` zůstává zelený.

### Manuální / E2E

Otevři control okno, přepni `spline`, posuň elasticitu, **Použít** → hrany se
prohnou; F5 → okno i styl hran přežijí (z `init`).

## Mimo rozsah

- Živé doručování změn (bez tlačítka Použít) — zvoleno „až na Použít".
- Další typy polí (float, bool, barva) — schéma je rozšiřitelné, ale teď jen
  int/string/enum.
- Programová změna hodnot v už otevřeném okně z backendu za běhu (mimo
  `open_window` replace) — neřešíme; backend okno přepíše novým `open_window`.
- Křivkové dráhy toků — splajn se týká jen hran (toky zůstávají jak jsou).
