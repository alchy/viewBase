# Plán: Detailní okno (Amiga Workbench) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Povýšit jednoduchý `DetailBox` na plnohodnotný window manager ve stylu Amiga Workbench: po kliknutí na uzel se otevře tažitelné okno s vybranými řádky `klíč: hodnota`, které lze zavřít, minimalizovat do doku vlevo dole a obnovit; klik na hodnotu ji zkopíruje do schránky.

**Architecture:** Tři vrstvy. **Python** (`canvas.py`) dostane metodu `detail_window(...)`, která uloží konfigurační dict `detail_window` do `self.config` — tím odejde beze změny protokolu v `init` (config flows out přes `snapshot()`). **Klient** dostane nový modul `frontend/src/render/windows.js` se čtyřmi čistými funkcemi (`buildRows`, `clampToCanvas`, `dockLayout`, `windowsToRefresh`) a dvěma DOM třídami (`DetailWindow` = jedno okno, `WindowManager` = kolekce oken nad app kontejnerem, z-order, dok). `WindowManager` nahrazuje `DetailBox`; `frontend/src/interact/detail.js` se smaže (jeho `detailPatchAction` se zobecní na `windowsToRefresh`). **Téma** dostane blok `window` (modern + cyber) a `applyCssVars` emituje `--vb-window-*` proměnné. **Wireshark příklad** ukládá `fqdn`/`ip` meta a volá `detail_window(rows=[("FQDN","fqdn"),("IP","ip")])`.

**Tech Stack:** Python 3.10+ (FastAPI, uvicorn, pytest), JS (Vite, vitest, three r165, troika-three-text), čisté DOM API (pointer events, `navigator.clipboard`), Playwright pro E2E.

**Předpoklady:** Plán 3 (toky/wireshark) je kompletně v `main`. Příkazy se spouštějí z kořene repa, není-li uvedeno jinak; aktivní venv (`source .venv/bin/activate`, balíček nainstalovaný `pip install -e "python[dev]"`); ve `frontend/` proběhlo `npm install`; Node.js ≥ 20. Pro T5 (wireshark) navíc `pip install scapy`. Pro T6 (E2E) je Playwright dostupný v `node_modules` (symlink jako v `/tmp/vb-2b-verify`).

---

## Konvence — závazné tvary pro všechny tasky

Tyto tvary definuje T1 (Python) a T2/T3 (klient) a **musí** je dodržet i T4/T5/T6. Žádná pozdější úprava je nesmí rozejít.

### 1. Tvar `config["detail_window"]` (T1)

Vždy přítomný v `config` (i bez volání `detail_window()` díky defaultu):

```python
config["detail_window"] = {
    "rows": [["FQDN", "fqdn"], ["IP", "ip"]],  # list dvojic [label, meta_key], NEBO None = všechna meta
    "width_chars": 128,                         # kladný int, šířka těla v monospace znacích
    "open_on_click": True,                      # bool, klik na uzel otevře okno
}
```

Default (bez volání `detail_window()`): `{"rows": None, "width_chars": 128, "open_on_click": True}`. JSON serializace mění Python tuple na list, proto je v JSON/JS každý řádek `["FQDN","fqdn"]` (pole 2 prvků), ne tuple.

### 2. Čisté funkce v `windows.js` (T2 — pinned signatury)

- `buildRows(node, rowsTemplate)` → `Array<{label: string, value: string}>`.
  - `rowsTemplate` je pole dvojic `[label, metaKey]`: pro každý řádek `{label, value: String(node.meta?.[metaKey] ?? '')}`.
  - `rowsTemplate == null` → jeden řádek na každý záznam `node.meta`, `label = key`, `value = String(meta[key])`.
- `clampToCanvas(x, y, w, h, bounds)` → `{x, y}`. `bounds = {width, height}`. Clampne `x` do `[0, max(0, width - w)]`, `y` do `[0, max(0, height - h)]` (titulek/záhlaví zůstane uvnitř canvasu; minimum vždy 0).
- `dockLayout(index, slotWidth, gap, canvasHeight, slotHeight)` → `{x, y}`. Pozice minimalizovaného proužku v doku vlevo dole: `x = index * (slotWidth + gap)`, `y = canvasHeight - slotHeight`.
- `windowsToRefresh(patch, openIds)` → `{refresh: string[], close: string[]}`. `openIds` je `Set` nebo pole id otevřených oken. `refresh` = id v `patch.update_nodes` (prvky mají `.id`) ∩ open; `close` = id v `patch.remove_nodes` (prvky jsou id) ∩ open.

### 3. DOM třídy v `windows.js` (T3 — pinned public API)

- `new DetailWindow(spec)` kde `spec = { nodeId, title, rows, widthChars, container, manager }`.
  - `rows` = `Array<{label, value}>` (už hotové z `buildRows`).
  - `manager` = zpětný odkaz na `WindowManager` (pro bring-to-front, dok slot assignment).
  - Veřejné: `el` (kořenový element), `update({title, rows})`, `minimize()`, `restore()`, `bringToFront()`, `close()`, `setZ(z)`, `applyTheme()`, `nodeId`, `isMinimized`.
- `new WindowManager(container, store, getTheme)`:
  - `container` = `document.getElementById('app')`.
  - `store` = `GraphStore` (čte `store.nodes`, `store.config`).
  - `getTheme` = funkce `() => themeObject` (vrací aktivní rozpuštěné téma).
  - Veřejné metody: `openFor(nodeId)`, `onPatch(patch)`, `applyTheme()`, `close(nodeId)`, `windows` (Map nodeId→DetailWindow).

### 4. CSS proměnné `--vb-window-*` (T4)

Emitované přes `applyCssVars` z `theme.window`:

```
--vb-window-header-bg
--vb-window-header-fg
--vb-window-gadget
--vb-window-body-bg
--vb-window-body-fg
--vb-window-key
--vb-window-dock-bg
--vb-window-shadow
```

### 5. DOM hooky pro E2E (T3/T6)

- Kořen okna: `[data-role="detail-window"]` (na elementu i atribut `data-node-id`).
- Minimalizovaný proužek (kořen okna v minimalizovaném stavu má navíc): `[data-role="detail-dock-strip"]`.
- Záhlaví (tahací plocha): `[data-role="detail-titlebar"]`.
- Hodnotová buňka (klik → clipboard): `[data-role="detail-value"]`.
- Gadgety: `[data-gadget="close"]`, `[data-gadget="minimize"]`, `[data-gadget="restore"]`.

### 6. Globální expozice (T4)

`window.__viewbase.windowManager` = instance `WindowManager` (pro E2E).

---

### Task 1 (T1): Python `detail_window` API

**Files:**
- Modify: `python/viewbase/canvas.py` (konstruktor `__init__` + nová metoda `detail_window`)
- Test: `python/tests/test_canvas.py` (přidat testy na konec)

- [ ] **Step 1: Napiš failing testy**

Přidej na konec `python/tests/test_canvas.py`:

```python
def test_detail_window_default_present_in_snapshot():
    canvas = vb.Canvas()
    dw = canvas.snapshot()["config"]["detail_window"]
    assert dw == {"rows": None, "width_chars": 128, "open_on_click": True}


def test_detail_window_sets_config():
    canvas = vb.Canvas()
    canvas.detail_window(rows=[("FQDN", "fqdn"), ("IP", "ip")], width_chars=64,
                         open_on_click=False)
    dw = canvas.config["detail_window"]
    assert dw == {
        "rows": [["FQDN", "fqdn"], ["IP", "ip"]],
        "width_chars": 64,
        "open_on_click": False,
    }


def test_detail_window_rows_none_keeps_none():
    canvas = vb.Canvas()
    canvas.detail_window(rows=None, width_chars=128)
    assert canvas.config["detail_window"]["rows"] is None


def test_detail_window_rejects_nonpositive_width():
    canvas = vb.Canvas()
    with pytest.raises(ValueError, match="width_chars"):
        canvas.detail_window(width_chars=0)
    with pytest.raises(ValueError, match="width_chars"):
        canvas.detail_window(width_chars=-5)
    with pytest.raises(ValueError, match="width_chars"):
        canvas.detail_window(width_chars=1.5)


def test_detail_window_rejects_bad_rows_shape():
    canvas = vb.Canvas()
    with pytest.raises(ValueError, match="rows"):
        canvas.detail_window(rows=["FQDN", "fqdn"])          # ne seznam dvojic
    with pytest.raises(ValueError, match="rows"):
        canvas.detail_window(rows=[("FQDN",)])               # dvojice s 1 prvkem
    with pytest.raises(ValueError, match="rows"):
        canvas.detail_window(rows=[("FQDN", 123)])           # nestringová hodnota


def test_detail_window_rejects_nonbool_open_on_click():
    canvas = vb.Canvas()
    with pytest.raises(ValueError, match="open_on_click"):
        canvas.detail_window(open_on_click="yes")
```

Pozn.: `import viewbase as vb` a `import pytest` už v souboru jsou (ostatní testy je používají).

- [ ] **Step 2: Spusť testy, ať selžou**

Run (z `python/`):
```bash
cd python && python -m pytest tests/test_canvas.py -k detail_window -v
```
Expected: 6 testů FAIL — `AttributeError: 'Canvas' object has no attribute 'detail_window'` a u prvního `KeyError: 'detail_window'`.

- [ ] **Step 3: Přidej default do konstruktoru**

V `python/viewbase/canvas.py`, v `__init__` v dictu `self.config = {...}` přidej za řádek `"quality": quality,` nový klíč:

```python
        self.config = {
            "title": title,
            "dimensions": dimensions,
            "theme": _validated_theme(theme),
            "highlight_neighbors": highlight_neighbors,
            "quality": quality,
            "detail_window": {
                "rows": None, "width_chars": 128, "open_on_click": True},
        }
```

- [ ] **Step 4: Přidej metodu `detail_window`**

V `python/viewbase/canvas.py` přidej metodu hned za `__init__` (před komentář `# ---- typy ----`):

```python
    def detail_window(self, rows: list[tuple[str, str]] | None = None,
                      width_chars: int = 128, open_on_click: bool = True) -> None:
        """Nakonfiguruj detailní okno (Amiga Workbench). Uloží se do config a
        odejde klientovi v init. `rows` je seznam dvojic (popisek, meta_klíč),
        nebo None = okno zobrazí všechna meta. `width_chars` je šířka těla
        v monospace znacích. `open_on_click` zapíná otevření okna při kliknutí."""
        if not isinstance(width_chars, int) or isinstance(width_chars, bool) \
                or width_chars <= 0:
            raise ValueError("width_chars musí být kladné celé číslo")
        if not isinstance(open_on_click, bool):
            raise ValueError("open_on_click musí být bool")
        normalized: list[list[str]] | None
        if rows is None:
            normalized = None
        else:
            if not isinstance(rows, (list, tuple)):
                raise ValueError("rows musí být None nebo seznam dvojic (str, str)")
            normalized = []
            for pair in rows:
                if not isinstance(pair, (list, tuple)) or len(pair) != 2 \
                        or not all(isinstance(x, str) for x in pair):
                    raise ValueError(
                        "rows musí být None nebo seznam dvojic (str, str)")
                normalized.append([pair[0], pair[1]])
        with self._lock:
            self.config["detail_window"] = {
                "rows": normalized,
                "width_chars": width_chars,
                "open_on_click": open_on_click,
            }
```

- [ ] **Step 5: Spusť testy, ať projdou**

Run (z `python/`):
```bash
cd python && python -m pytest tests/test_canvas.py -k detail_window -v
```
Expected: 6 PASSED.

- [ ] **Step 6: Spusť celou Python sadu (regrese)**

Run (z `python/`):
```bash
cd python && python -m pytest -q
```
Expected: vše PASSED (žádná regrese; `snapshot()` nese nový klíč, ostatní testy se ho nedotýkají).

- [ ] **Step 7: Commit**

```bash
git add python/viewbase/canvas.py python/tests/test_canvas.py
git commit -m "feat: Canvas.detail_window API s defaultem v config"
```

---

### Task 2 (T2): `windows.js` — čisté funkce (TDD vitest)

V tomto tasku vytvoříme **jen čisté funkce** (žádný DOM). Třídy `DetailWindow`/`WindowManager` přijdou v T3 a připíšou se do téhož souboru.

**Files:**
- Create: `frontend/src/render/windows.js`
- Create: `frontend/tests/windows.test.js`

- [ ] **Step 1: Napiš failing testy**

Vytvoř `frontend/tests/windows.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  buildRows, clampToCanvas, dockLayout, windowsToRefresh,
} from '../src/render/windows.js';

const patch = (over = {}) => ({
  add_nodes: [], update_nodes: [], remove_nodes: [],
  add_edges: [], remove_edges: [], ...over,
});

describe('buildRows', () => {
  it('šablona → řádky podle dvojic, chybějící klíč = prázdná hodnota', () => {
    const node = { meta: { fqdn: 'dns.google', ip: '8.8.8.8' } };
    expect(buildRows(node, [['FQDN', 'fqdn'], ['IP', 'ip'], ['MAC', 'mac']]))
      .toEqual([
        { label: 'FQDN', value: 'dns.google' },
        { label: 'IP', value: '8.8.8.8' },
        { label: 'MAC', value: '' },
      ]);
  });

  it('hodnota se stringuje (číslo → string)', () => {
    const node = { meta: { port: 443 } };
    expect(buildRows(node, [['Port', 'port']]))
      .toEqual([{ label: 'Port', value: '443' }]);
  });

  it('null šablona → jeden řádek na každý meta záznam, label = klíč', () => {
    const node = { meta: { fqdn: 'dns.google', ip: '8.8.8.8' } };
    expect(buildRows(node, null)).toEqual([
      { label: 'fqdn', value: 'dns.google' },
      { label: 'ip', value: '8.8.8.8' },
    ]);
  });

  it('prázdná meta + null šablona → prázdné pole', () => {
    expect(buildRows({ meta: {} }, null)).toEqual([]);
  });
});

describe('clampToCanvas', () => {
  it('okno uvnitř canvasu → beze změny', () => {
    expect(clampToCanvas(50, 60, 100, 40, { width: 800, height: 600 }))
      .toEqual({ x: 50, y: 60 });
  });

  it('záporné souřadnice → clamp na 0', () => {
    expect(clampToCanvas(-20, -5, 100, 40, { width: 800, height: 600 }))
      .toEqual({ x: 0, y: 0 });
  });

  it('za pravým/dolním okrajem → clamp tak, aby okno zůstalo uvnitř', () => {
    expect(clampToCanvas(900, 700, 100, 40, { width: 800, height: 600 }))
      .toEqual({ x: 700, y: 560 });
  });

  it('okno širší než canvas → x clamp na 0 (nikdy záporné)', () => {
    expect(clampToCanvas(50, 50, 1000, 40, { width: 800, height: 600 }))
      .toEqual({ x: 0, y: 50 });
  });
});

describe('dockLayout', () => {
  it('index 0 → vlevo dole', () => {
    expect(dockLayout(0, 160, 8, 600, 28)).toEqual({ x: 0, y: 572 });
  });

  it('index 2 → posun doprava o 2 sloty s mezerou', () => {
    expect(dockLayout(2, 160, 8, 600, 28)).toEqual({ x: 336, y: 572 });
  });
});

describe('windowsToRefresh', () => {
  it('update otevřeného uzlu → refresh; remove otevřeného → close', () => {
    const open = new Set(['a', 'b']);
    const p = patch({
      update_nodes: [{ id: 'a' }, { id: 'x' }],
      remove_nodes: ['b', 'y'],
    });
    expect(windowsToRefresh(p, open)).toEqual({ refresh: ['a'], close: ['b'] });
  });

  it('openIds jako pole funguje stejně', () => {
    const p = patch({ update_nodes: [{ id: 'a' }], remove_nodes: ['c'] });
    expect(windowsToRefresh(p, ['a', 'c'])).toEqual({
      refresh: ['a'], close: ['c'],
    });
  });

  it('nic otevřeného → prázdné seznamy', () => {
    const p = patch({ update_nodes: [{ id: 'a' }], remove_nodes: ['b'] });
    expect(windowsToRefresh(p, [])).toEqual({ refresh: [], close: [] });
  });

  it('remove má přednost: uzel v update i remove → jen close', () => {
    const p = patch({ update_nodes: [{ id: 'a' }], remove_nodes: ['a'] });
    expect(windowsToRefresh(p, ['a'])).toEqual({ refresh: [], close: ['a'] });
  });
});
```

- [ ] **Step 2: Spusť testy, ať selžou**

Run (z `frontend/`):
```bash
cd frontend && npx vitest run tests/windows.test.js
```
Expected: FAIL — `Failed to resolve import "../src/render/windows.js"` (soubor neexistuje).

- [ ] **Step 3: Vytvoř `windows.js` jen s čistými funkcemi**

Vytvoř `frontend/src/render/windows.js`:

```js
/** Window manager ve stylu Amiga Workbench: tažitelná okna s řádky
 *  klíč/hodnota nad canvasem. Tento soubor obsahuje čisté funkce (testované
 *  vitestem) a DOM třídy DetailWindow + WindowManager (manuální/E2E ověření). */

/** node + šablona řádků → pole {label, value}.
 *  rowsTemplate = pole dvojic [label, metaKey]; null = jeden řádek na meta. */
export function buildRows(node, rowsTemplate) {
  const meta = node?.meta ?? {};
  if (rowsTemplate == null) {
    return Object.entries(meta).map(([key, value]) => ({
      label: key, value: String(value ?? ''),
    }));
  }
  return rowsTemplate.map(([label, key]) => ({
    label, value: String(meta[key] ?? ''),
  }));
}

/** Clampne pozici okna tak, aby zůstalo uvnitř [0, bounds].
 *  Titulek/záhlaví zůstane viditelné; minimum je vždy 0. */
export function clampToCanvas(x, y, w, h, bounds) {
  const maxX = Math.max(0, bounds.width - w);
  const maxY = Math.max(0, bounds.height - h);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}

/** Pozice minimalizovaného proužku v doku vlevo dole pro daný index. */
export function dockLayout(index, slotWidth, gap, canvasHeight, slotHeight) {
  return {
    x: index * (slotWidth + gap),
    y: canvasHeight - slotHeight,
  };
}

/** Z patche a množiny otevřených oken urči, co překreslit a co zavřít.
 *  remove má přednost před update (uzel v obou → jen close). */
export function windowsToRefresh(patch, openIds) {
  const open = openIds instanceof Set ? openIds : new Set(openIds);
  const close = (patch.remove_nodes ?? []).filter((id) => open.has(id));
  const closing = new Set(close);
  const refresh = (patch.update_nodes ?? [])
    .map((n) => n.id)
    .filter((id) => open.has(id) && !closing.has(id));
  return { refresh, close };
}
```

- [ ] **Step 4: Spusť testy, ať projdou**

Run (z `frontend/`):
```bash
cd frontend && npx vitest run tests/windows.test.js
```
Expected: PASS — 14 testů (4 buildRows + 4 clampToCanvas + 2 dockLayout + 4 windowsToRefresh).

- [ ] **Step 5: Ověř, že v souboru není literální NUL**

Run (z `frontend/`):
```bash
cd frontend && python3 -c "print(open('src/render/windows.js','rb').read().count(b'\x00'))"
```
Expected: `0`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/render/windows.js frontend/tests/windows.test.js
git commit -m "feat: windows.js čisté funkce buildRows/clampToCanvas/dockLayout/windowsToRefresh"
```

---

### Task 3 (T3): `DetailWindow` + `WindowManager` (DOM)

DOM třídy se **nepokrývají** unit testy (manuální + E2E ověření v T6). Připisují se do `windows.js` pod čisté funkce z T2.

**Files:**
- Modify: `frontend/src/render/windows.js` (append tříd `DetailWindow` + `WindowManager`)

- [ ] **Step 1: Připiš třídy `DetailWindow` + `WindowManager`**

Přidej na konec `frontend/src/render/windows.js` (za `windowsToRefresh`):

```js
const DOCK_SLOT_WIDTH = 160;
const DOCK_GAP = 8;
const DOCK_SLOT_HEIGHT = 28;

/** Jedno okno: záhlaví (zavřít vlevo, titulek uprostřed, minimalizovat vpravo)
 *  + tělo s řádky klíč/hodnota. Minimalizace ho smrskne do proužku v doku. */
export class DetailWindow {
  constructor({ nodeId, title, rows, widthChars, container, manager }) {
    this.nodeId = nodeId;
    this.title = title;
    this.rows = rows;
    this.widthChars = widthChars;
    this.container = container;
    this.manager = manager;
    this.isMinimized = false;
    this.saved = null;          // {x, y} před minimalizací
    this.dragOffset = null;

    this.el = document.createElement('div');
    this.el.dataset.role = 'detail-window';
    this.el.dataset.nodeId = nodeId;
    this.el.style.cssText = [
      'position:absolute', 'left:0', 'top:0', 'box-sizing:border-box',
      'background:var(--vb-window-body-bg, rgba(255,255,255,0.97))',
      'color:var(--vb-window-body-fg, #1f2430)',
      'box-shadow:var(--vb-window-shadow, 0 6px 20px rgba(0,0,0,0.22))',
      'border-radius:6px', 'overflow:hidden', 'user-select:none',
      'font:13px/1.5 system-ui,sans-serif', 'z-index:900',
    ].join(';');

    this._buildHeader();
    this._buildBody();
    container.appendChild(this.el);

    // počáteční pozice: lehce odsazená kaskáda podle počtu oken
    const bounds = this._bounds();
    const offset = (manager.windows.size % 8) * 24;
    const start = clampToCanvas(40 + offset, 40 + offset,
      this._width(), 200, bounds);
    this._place(start.x, start.y);

    this.el.addEventListener('pointerdown', () => this.bringToFront());
  }

  _width() {
    // šířka těla v ch + padding/border; ch ~ 8px monospace
    return this.widthChars * 8 + 24;
  }

  _bounds() {
    return {
      width: this.container.clientWidth || 800,
      height: this.container.clientHeight || 600,
    };
  }

  _buildHeader() {
    const bar = document.createElement('div');
    bar.dataset.role = 'detail-titlebar';
    bar.style.cssText = [
      'display:flex', 'align-items:center', 'gap:6px',
      'padding:4px 6px', 'cursor:move',
      'background:var(--vb-window-header-bg, #d8dde6)',
      'color:var(--vb-window-header-fg, #1f2430)',
    ].join(';');

    this.closeGadget = this._gadget('close', '×');   // ×
    this.closeGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    this.titleEl = document.createElement('div');
    this.titleEl.textContent = this.title;
    this.titleEl.style.cssText = [
      'flex:1', 'text-align:center', 'font-weight:600',
      'white-space:nowrap', 'overflow:hidden', 'text-overflow:ellipsis',
    ].join(';');

    this.minGadget = this._gadget('minimize', '–');   // –
    this.minGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimize();
    });

    this.restoreGadget = this._gadget('restore', '▢'); // ▢
    this.restoreGadget.addEventListener('click', (e) => {
      e.stopPropagation();
      this.restore();
    });
    this.restoreGadget.style.display = 'none';

    bar.append(this.closeGadget, this.titleEl,
      this.minGadget, this.restoreGadget);
    this._dragFromHeader(bar);
    this.bar = bar;
    this.el.appendChild(bar);
  }

  _gadget(name, glyph) {
    const g = document.createElement('button');
    g.dataset.gadget = name;
    g.textContent = glyph;
    g.style.cssText = [
      'flex:0 0 auto', 'width:18px', 'height:18px', 'line-height:16px',
      'padding:0', 'border:1px solid var(--vb-window-gadget, #8a93a3)',
      'border-radius:3px', 'background:transparent', 'cursor:pointer',
      'color:var(--vb-window-gadget, #5a6573)', 'font-size:13px',
    ].join(';');
    return g;
  }

  _buildBody() {
    const body = document.createElement('div');
    body.dataset.role = 'detail-body';
    body.style.cssText = [
      'padding:6px 10px',
      `width:${this.widthChars}ch`,
      'max-width:90vw',
      'font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace',
      'overflow:auto',
    ].join(';');
    this.body = body;
    this._renderRows();
    this.el.appendChild(body);
  }

  _renderRows() {
    this.body.replaceChildren();
    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;width:100%';
    for (const { label, value } of this.rows) {
      const tr = table.insertRow();
      const keyCell = tr.insertCell();
      keyCell.textContent = label;
      keyCell.style.cssText = [
        'padding:1px 12px 1px 0', 'vertical-align:top', 'white-space:nowrap',
        'color:var(--vb-window-key, #667788)',
      ].join(';');
      const valCell = tr.insertCell();
      valCell.dataset.role = 'detail-value';
      valCell.textContent = value;
      valCell.style.cssText = [
        'padding:1px 0', 'word-break:break-all', 'cursor:copy',
      ].join(';');
      valCell.addEventListener('click', (e) => {
        e.stopPropagation();
        this._copy(value, valCell);
      });
    }
    this.body.appendChild(table);
  }

  _copy(value, cell) {
    const flash = () => {
      cell.style.transition = 'background 0.15s';
      const prev = cell.style.background;
      cell.style.background = 'var(--vb-window-gadget, #8a93a3)';
      setTimeout(() => { cell.style.background = prev; }, 180);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(flash).catch(() => {
        this._execCopy(value); flash();
      });
    } else {
      this._execCopy(value); flash();
    }
  }

  _execCopy(value) {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      console.warn('viewbase: kopírování do schránky selhalo');
    }
  }

  _dragFromHeader(bar) {
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.dataset.gadget) return;   // klik na gadget netáhne
      this.bringToFront();
      const rect = this.el.getBoundingClientRect();
      const cont = this.container.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left, y: e.clientY - rect.top,
        contLeft: cont.left, contTop: cont.top,
      };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!this.dragOffset || this.isMinimized) return;
      const x = e.clientX - this.dragOffset.contLeft - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.contTop - this.dragOffset.y;
      const pos = clampToCanvas(x, y, this._width(), this._headerH(),
        this._bounds());
      this._place(pos.x, pos.y);
    });
    const end = (e) => {
      if (this.dragOffset) {
        this.dragOffset = null;
        try { bar.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      }
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  _headerH() {
    return this.bar.offsetHeight || DOCK_SLOT_HEIGHT;
  }

  _place(x, y) {
    this.x = x;
    this.y = y;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  update({ title, rows }) {
    if (title != null) {
      this.title = title;
      this.titleEl.textContent = title;
    }
    if (rows != null) {
      this.rows = rows;
      if (!this.isMinimized) this._renderRows();
    }
  }

  minimize() {
    if (this.isMinimized) return;
    this.isMinimized = true;
    this.saved = { x: this.x, y: this.y };
    this.body.style.display = 'none';
    this.minGadget.style.display = 'none';
    this.restoreGadget.style.display = '';
    this.el.dataset.role = 'detail-dock-strip';
    this.el.style.background = 'var(--vb-window-dock-bg, #c2c9d4)';
    this.el.style.width = `${DOCK_SLOT_WIDTH}px`;
    this.titleEl.style.fontSize = '11px';
    const slot = this.manager._assignDockSlot(this);
    const bounds = this._bounds();
    const pos = dockLayout(slot, DOCK_SLOT_WIDTH, DOCK_GAP,
      bounds.height, DOCK_SLOT_HEIGHT);
    this._place(pos.x, pos.y);
  }

  restore() {
    if (!this.isMinimized) return;
    this.isMinimized = false;
    this.manager._releaseDockSlot(this);
    this.el.dataset.role = 'detail-window';
    this.el.style.background = 'var(--vb-window-body-bg, rgba(255,255,255,0.97))';
    this.el.style.width = '';
    this.titleEl.style.fontSize = '';
    this.body.style.display = '';
    this.minGadget.style.display = '';
    this.restoreGadget.style.display = 'none';
    this._renderRows();
    const pos = this.saved ?? { x: 40, y: 40 };
    this._place(pos.x, pos.y);
    this.bringToFront();
  }

  bringToFront() {
    this.setZ(this.manager._nextZ());
  }

  setZ(z) {
    this.el.style.zIndex = String(z);
  }

  applyTheme() {
    // chrome čte živé CSS proměnné z :root – stačí překreslit řádky kvůli
    // inline pozadí value buněk, zbytek se přepočte sám.
    if (!this.isMinimized) this._renderRows();
  }

  close() {
    if (this.isMinimized) this.manager._releaseDockSlot(this);
    this.el.remove();
    this.manager._forget(this.nodeId);
  }
}

/** Spravuje kolekci DetailWindow nad app kontejnerem: otevírání podle uzlu,
 *  z-order, dok slots, živé patche, téma. Generický – nezná doménu. */
export class WindowManager {
  constructor(container, store, getTheme = () => null) {
    this.container = container;
    this.store = store;
    this.getTheme = getTheme;
    this.windows = new Map();        // nodeId -> DetailWindow
    this.z = 900;
    this.dockSlots = [];             // index -> DetailWindow | null
  }

  _config() {
    const dw = this.store.config?.detail_window;
    return dw ?? { rows: null, width_chars: 128, open_on_click: true };
  }

  openFor(nodeId) {
    const existing = this.windows.get(nodeId);
    if (existing) {
      if (existing.isMinimized) existing.restore();
      else existing.bringToFront();
      return existing;
    }
    const node = this.store.nodes.get(nodeId);
    if (!node) return null;          // neexistující uzel → no-op
    const cfg = this._config();
    const win = new DetailWindow({
      nodeId,
      title: node.label,
      rows: buildRows(node, cfg.rows),
      widthChars: cfg.width_chars,
      container: this.container,
      manager: this,
    });
    this.windows.set(nodeId, win);
    win.bringToFront();
    return win;
  }

  onPatch(patch) {
    if (this.windows.size === 0) return;
    const { refresh, close } = windowsToRefresh(patch, this.windows);
    for (const id of close) this.windows.get(id)?.close();
    const cfg = this._config();
    for (const id of refresh) {
      const win = this.windows.get(id);
      const node = this.store.nodes.get(id);
      if (win && node) {
        win.update({ title: node.label, rows: buildRows(node, cfg.rows) });
      }
    }
  }

  applyTheme() {
    for (const win of this.windows.values()) win.applyTheme();
  }

  close(nodeId) {
    this.windows.get(nodeId)?.close();
  }

  _nextZ() {
    this.z += 1;
    return this.z;
  }

  _assignDockSlot(win) {
    let i = this.dockSlots.indexOf(null);
    if (i === -1) { i = this.dockSlots.length; this.dockSlots.push(win); }
    else this.dockSlots[i] = win;
    win._dockSlot = i;
    return i;
  }

  _releaseDockSlot(win) {
    const i = win._dockSlot;
    if (i != null && this.dockSlots[i] === win) this.dockSlots[i] = null;
    win._dockSlot = null;
  }

  _forget(nodeId) {
    this.windows.delete(nodeId);
  }
}
```

Pozn.: `windowsToRefresh(patch, this.windows)` dostane `Map` jako `openIds` — `new Set(map)` by iteroval páry, proto v `WindowManager.onPatch` předáme klíče: oprav volání na `windowsToRefresh(patch, new Set(this.windows.keys()))`.

- [ ] **Step 2: Oprav předání openIds (Map → Set klíčů)**

V metodě `onPatch` nahraď řádek:

```js
    const { refresh, close } = windowsToRefresh(patch, this.windows);
```

za:

```js
    const { refresh, close } = windowsToRefresh(
      patch, new Set(this.windows.keys()));
```

- [ ] **Step 3: Ověř, že čisté funkce T2 stále procházejí**

Run (z `frontend/`):
```bash
cd frontend && npx vitest run tests/windows.test.js
```
Expected: 14 PASSED (append tříd nesmí rozbít čisté funkce).

- [ ] **Step 4: Build clean**

Run (z `frontend/`):
```bash
cd frontend && npm run build
```
Expected: build proběhne bez chyb (`vite build` skončí `✓ built in ...`). `windows.js` se zatím nikam neimportuje (zapojí se v T4), build jen ověří syntaxi.

- [ ] **Step 5: Ověř, že v souboru není literální NUL**

Run (z `frontend/`):
```bash
cd frontend && python3 -c "print(open('src/render/windows.js','rb').read().count(b'\x00'))"
```
Expected: `0`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/render/windows.js
git commit -m "feat: DetailWindow + WindowManager (DOM, dok, drag, clipboard)"
```

**Manuální ověření (provede se reálně až po T4, kdy je manager zapojen):** klik na uzel otevře okno, tah za záhlaví ho posune, [_] minimalizuje do levého dolního rohu, [▢] obnoví pozici, klik na hodnotu blikne a zkopíruje.

---

### Task 4 (T4): Téma `window` + wiring + odstranění `DetailBox`

**Files:**
- Modify: `frontend/src/themes/themes.js` (blok `window` do `modern` + `cyber`)
- Modify: `frontend/src/themes/manager.js` (`applyCssVars` emituje `--vb-window-*`)
- Modify: `frontend/src/main.js` (nahradit `DetailBox` za `WindowManager`)
- Delete: `frontend/src/interact/detail.js`
- Delete: `frontend/tests/detail.test.js`
- Test: `frontend/tests/themes.test.js` (případně upravit, pokud testuje tvar tématu)

- [ ] **Step 1: Přidej blok `window` do tématu `modern`**

V `frontend/src/themes/themes.js`, v objektu `modern`, přidej za řádek `bloom: {...},` (před `flow:`):

```js
  window: {
    headerBg: '#d8dde6', headerFg: '#1f2430', gadget: '#5a6573',
    bodyBg: 'rgba(255,255,255,0.97)', bodyFg: '#1f2430', key: '#667788',
    dockBg: '#c2c9d4', shadow: '0 6px 20px rgba(0,0,0,0.22)',
  },
```

- [ ] **Step 2: Přidej blok `window` do tématu `cyber`**

V `frontend/src/themes/themes.js`, v objektu `cyber`, přidej za řádek `bloom: {...},` (před `flow:`):

```js
  window: {
    headerBg: 'rgba(40,215,254,0.18)', headerFg: '#d7f4ff', gadget: '#28d7fe',
    bodyBg: 'rgba(10,16,28,0.94)', bodyFg: '#d7f4ff', key: '#5a7d9e',
    dockBg: 'rgba(40,215,254,0.12)', shadow: '0 0 22px rgba(40,215,254,0.45)',
  },
```

- [ ] **Step 3: Emituj `--vb-window-*` proměnné v `applyCssVars`**

V `frontend/src/themes/manager.js` nahraď celou funkci `applyCssVars`:

```js
/** Zapíše CSS custom properties tématu (--vb-*) na :root. */
export function applyCssVars(theme, root = document.documentElement) {
  for (const [name, value] of Object.entries(theme.detailBox)) {
    root.style.setProperty(name, value);
  }
  const w = theme.window;
  if (w) {
    const map = {
      '--vb-window-header-bg': w.headerBg,
      '--vb-window-header-fg': w.headerFg,
      '--vb-window-gadget': w.gadget,
      '--vb-window-body-bg': w.bodyBg,
      '--vb-window-body-fg': w.bodyFg,
      '--vb-window-key': w.key,
      '--vb-window-dock-bg': w.dockBg,
      '--vb-window-shadow': w.shadow,
    };
    for (const [name, value] of Object.entries(map)) {
      if (value != null) root.style.setProperty(name, value);
    }
  }
}
```

- [ ] **Step 4: Přepiš import a wiring v `main.js`**

V `frontend/src/main.js` nahraď import (řádek 4):

```js
import { DetailBox, detailPatchAction } from './interact/detail.js';
```

za:

```js
import { WindowManager } from './render/windows.js';
```

- [ ] **Step 5: Nahraď `DetailBox` instanci za `WindowManager` a zruš `detailNodeId`/`showDetail`**

V `frontend/src/main.js`, ve funkci `bootstrap()`, nahraď blok:

```js
  const store = new GraphStore();
  const engine = new PhysicsEngine(store);
  let detailNodeId = null;   // id uzlu zobrazeného v detail boxu
  const detail = new DetailBox(document.body,
    { onHide: () => { detailNodeId = null; } });

  function applyHighlight(nodeId, depth) {
    const levels = depth ?? store.config.highlight_neighbors ?? 1;
    const ids = neighborhood(store, nodeId, levels);
    // Neznámý uzel = prázdná množina: radši nic nezvýraznit než ztlumit vše
    renderer.setHighlight(ids.size > 0 ? ids : null);
  }

  function showDetail(nodeId) {
    const node = store.nodes.get(nodeId);
    if (!node) return;
    detailNodeId = nodeId;
    detail.show({ label: node.label, meta: node.meta });
  }
```

za:

```js
  const store = new GraphStore();
  const engine = new PhysicsEngine(store);
  let activeTheme = null;            // poslední rozpuštěné téma (pro WindowManager)
  const windowManager = new WindowManager(
    document.getElementById('app'), store, () => activeTheme);

  function applyHighlight(nodeId, depth) {
    const levels = depth ?? store.config.highlight_neighbors ?? 1;
    const ids = neighborhood(store, nodeId, levels);
    // Neznámý uzel = prázdná množina: radši nic nezvýraznit než ztlumit vše
    renderer.setHighlight(ids.size > 0 ? ids : null);
  }
```

- [ ] **Step 6: Napoj klik na uzel na `openFor` (respektuj `open_on_click`)**

V `frontend/src/main.js`, v `Picker` callbackách, nahraď blok `onNodeClick`/`onBackgroundClick`:

```js
          onNodeClick: (id) => {              // okamžitá lokální odezva
            const levels = store.config.highlight_neighbors ?? 1;
            if (levels > 0) applyHighlight(id, levels);
            renderer.focusOn(id);
          },
          onBackgroundClick: () => {
            renderer.setHighlight(null);
            detail.hide();
          },
```

za:

```js
          onNodeClick: (id) => {              // okamžitá lokální odezva
            const levels = store.config.highlight_neighbors ?? 1;
            if (levels > 0) applyHighlight(id, levels);
            renderer.focusOn(id);
            if (store.config.detail_window?.open_on_click) {
              windowManager.openFor(id);
            }
          },
          onBackgroundClick: () => {
            renderer.setHighlight(null);
          },
```

- [ ] **Step 7: Ulož aktivní téma a zapoj `applyTheme` do `WindowManageru`**

V `frontend/src/main.js` nahraď funkci `applyTheme`:

```js
  function applyTheme(nameOrDict) {
    const theme = resolveTheme(nameOrDict);
    renderer.applyTheme(theme);
    applyCssVars(theme);
  }
```

za:

```js
  function applyTheme(nameOrDict) {
    const theme = resolveTheme(nameOrDict);
    activeTheme = theme;
    renderer.applyTheme(theme);
    applyCssVars(theme);
    windowManager.applyTheme();
  }
```

- [ ] **Step 8: Přepoj patch subscriber na `windowManager.onPatch`**

V `frontend/src/main.js` nahraď patch subscriber:

```js
  store.subscribe((event) => {
    if (event.kind !== 'patch') return;
    const action = detailPatchAction(event.patch, detailNodeId);
    if (action === 'hide') detail.hide();
    else if (action === 'refresh') showDetail(detailNodeId);
  });
```

za:

```js
  store.subscribe((event) => {
    if (event.kind !== 'patch') return;
    windowManager.onPatch(event.patch);
  });
```

- [ ] **Step 9: Přepoj akci `show_detail` na `openFor`**

V `frontend/src/main.js`, v objektu `actions`, nahraď řádek:

```js
    show_detail: (msg) => showDetail(msg.node_id),
```

za:

```js
    show_detail: (msg) => windowManager.openFor(msg.node_id),
```

- [ ] **Step 10: Vystav `windowManager` na `window.__viewbase`**

V `frontend/src/main.js` nahraď blok `window.__viewbase = {...}`:

```js
  window.__viewbase = {
    store, engine, renderer, connection, watchdog,
    flowController: renderer.flowController, flowLayer: renderer.flows,
  };
```

za:

```js
  window.__viewbase = {
    store, engine, renderer, connection, watchdog, windowManager,
    flowController: renderer.flowController, flowLayer: renderer.flows,
  };
```

- [ ] **Step 11: Smaž `detail.js` a `detail.test.js`**

`detailPatchAction` je nahrazena `windowsToRefresh` (T2), takže `detail.test.js` se ruší (ne přesouvá).

```bash
git rm frontend/src/interact/detail.js frontend/tests/detail.test.js
```

- [ ] **Step 12: Zkontroluj, že téma testy nečekají chybějící blok**

Run (z `frontend/`):
```bash
cd frontend && npx vitest run tests/themes.test.js
```
Expected: PASS. Pokud `themes.test.js` enumeruje povinné klíče tématu a teď padá kvůli `window`, přidej `'window'` do očekávaného seznamu klíčů u modern i cyber; jinak nic neměň.

- [ ] **Step 13: Spusť celou vitest sadu (ověř počty)**

Run (z `frontend/`):
```bash
cd frontend && npm test
```
Expected: vše PASSED. Test soubor `detail.test.js` (4 testy) zmizel, přibyl `windows.test.js` (14 testů z T2). Žádný zbývající soubor nesmí importovat `./interact/detail.js`.

- [ ] **Step 14: Ověř, že nikde nezůstal odkaz na smazaný modul**

Run (z `frontend/`):
```bash
cd frontend && grep -rn "interact/detail\|DetailBox\|detailPatchAction\|detailNodeId" src tests
```
Expected: žádný výstup (prázdné).

- [ ] **Step 15: Build clean**

Run (z `frontend/`):
```bash
cd frontend && npm run build
```
Expected: `✓ built in ...` bez chyb.

- [ ] **Step 16: Commit**

```bash
git add frontend/src/themes/themes.js frontend/src/themes/manager.js frontend/src/main.js frontend/tests/themes.test.js
git commit -m "feat: zapojení WindowManageru, téma window, odstranění DetailBox"
```

---

### Task 5 (T5): Wireshark FQDN/IP usage

**Files:**
- Modify: `examples/wireshark/pcap_replay.py` (`make_resolver`, node creation, `build_canvas`)
- Modify: `examples/wireshark/live_capture.py` (node creation, `build_canvas`)

- [ ] **Step 1: V resolveru ukládej i `fqdn` + `ip` meta**

V `examples/wireshark/pcap_replay.py`, ve funkci `make_resolver`, nahraď tělo `_resolve`:

```python
    def _resolve(ip: str) -> None:
        try:
            fqdn = socket.gethostbyaddr(ip)[0]
        except OSError:
            return                       # bez PTR záznamu necháme jen IP
        canvas.update_node(ip, name=f"{fqdn} [{ip}]")
```

za:

```python
    def _resolve(ip: str) -> None:
        try:
            fqdn = socket.gethostbyaddr(ip)[0]
        except OSError:
            return                       # bez PTR záznamu necháme jen IP
        canvas.update_node(ip, name=f"{fqdn} [{ip}]", fqdn=fqdn, ip=ip)
```

- [ ] **Step 2: Při vzniku uzlu nastav prázdné `fqdn` meta (pcap_replay)**

V `examples/wireshark/pcap_replay.py`, ve funkci `replay`, nahraď řádek vytvoření uzlu:

```python
                    canvas.add_node(node_id, type="host", label="{name}",
                                    name=node_id, ip=node_id)
```

za:

```python
                    canvas.add_node(node_id, type="host", label="{name}",
                                    name=node_id, ip=node_id, fqdn="")
```

- [ ] **Step 3: Zavolej `detail_window` v `build_canvas` (pcap_replay)**

V `examples/wireshark/pcap_replay.py`, ve funkci `build_canvas`, nahraď tělo:

```python
def build_canvas() -> vb.Canvas:
    canvas = vb.Canvas(title="Wireshark replay", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    return canvas
```

za:

```python
def build_canvas() -> vb.Canvas:
    canvas = vb.Canvas(title="Wireshark replay", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    canvas.detail_window(rows=[("FQDN", "fqdn"), ("IP", "ip")], width_chars=128)
    return canvas
```

- [ ] **Step 4: Při vzniku uzlu nastav prázdné `fqdn` meta (live_capture)**

V `examples/wireshark/live_capture.py`, ve funkci `make_handler`, nahraď řádek vytvoření uzlu:

```python
                    canvas.add_node(node_id, type="host", label="{name}",
                                    name=node_id, ip=node_id)
```

za:

```python
                    canvas.add_node(node_id, type="host", label="{name}",
                                    name=node_id, ip=node_id, fqdn="")
```

- [ ] **Step 5: Zavolej `detail_window` v `build_canvas` (live_capture)**

V `examples/wireshark/live_capture.py`, ve funkci `build_canvas`, nahraď tělo:

```python
def build_canvas() -> vb.Canvas:
    canvas = vb.Canvas(title="Wireshark live", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    return canvas
```

za:

```python
def build_canvas() -> vb.Canvas:
    canvas = vb.Canvas(title="Wireshark live", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    canvas.detail_window(rows=[("FQDN", "fqdn"), ("IP", "ip")], width_chars=128)
    return canvas
```

- [ ] **Step 6: Boot check — pcap_replay proti vzorku, ověř init config přes WS klienta**

Spusť (z kořene repa; vyžaduje `pip install scapy` a aktivní venv):

```bash
source .venv/bin/activate
python examples/wireshark/make_sample_pcap.py /tmp/vb-detail-sample.pcap
python examples/wireshark/pcap_replay.py /tmp/vb-detail-sample.pcap --speed 8 --port 8137 &
sleep 3
```

Pak malým Node WS klientem ověř, že `init.config.detail_window` nese ty řádky. Vytvoř dočasně `/tmp/vb-ws-check.mjs`:

```js
import WebSocket from '/tmp/vb-2b-verify/node_modules/ws/index.js';
const ws = new WebSocket('ws://127.0.0.1:8137/ws');
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === 'init') {
    const dw = m.config.detail_window;
    const ok = dw && JSON.stringify(dw.rows) === JSON.stringify(
      [['FQDN', 'fqdn'], ['IP', 'ip']]) && dw.width_chars === 128;
    console.log('detail_window:', JSON.stringify(dw));
    console.log(ok ? 'OK' : 'FAIL');
    process.exit(ok ? 0 : 1);
  }
});
ws.on('error', (e) => { console.error('WS error', e.message); process.exit(2); });
```

Run:
```bash
node /tmp/vb-ws-check.mjs
```
Expected stdout obsahuje `detail_window: {"rows":[["FQDN","fqdn"],["IP","ip"]],"width_chars":128,"open_on_click":true}` a poslední řádek `OK`. Ukliď: `kill %1`.

(HTTP 200 sanity: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8137/` → `200` ještě před `kill`.)

- [ ] **Step 7: Commit**

```bash
git add examples/wireshark/pcap_replay.py examples/wireshark/live_capture.py
git commit -m "feat: wireshark ukládá fqdn/ip meta a konfiguruje detail_window"
```

---

### Task 6 (T6): E2E ověření (Playwright)

Znovupoužij infrastrukturu z `/tmp/vb-2b-verify` (Playwright v `node_modules`, `.venv` python, GPU flagy). Screenshoty do `/tmp/vb-detail-verify`.

**Files:**
- Create: `/tmp/vb-detail-verify/detail-e2e.mjs` (skript mimo repo)
- Create: `/tmp/vb-detail-verify/demo_detail.py` (tiny inline graf s `detail_window`, mimo repo)

- [ ] **Step 1: Připrav adresář a demo s nakonfigurovaným detail_window**

```bash
mkdir -p /tmp/vb-detail-verify
ln -sfn /tmp/vb-2b-verify/node_modules /tmp/vb-detail-verify/node_modules
```

Vytvoř `/tmp/vb-detail-verify/demo_detail.py`:

```python
"""Malý statický graf pro E2E detailního okna: dva host uzly s fqdn/ip meta."""
import threading
import viewbase as vb

canvas = vb.Canvas(title="Detail E2E", theme="modern", highlight_neighbors=1)
canvas.define_type("host", shape="sphere", color="#2f7fe8", size=1.0)
canvas.detail_window(rows=[("FQDN", "fqdn"), ("IP", "ip")], width_chars=64)

canvas.add_node("8.8.8.8", type="host", label="{name}",
                name="dns.google [8.8.8.8]", fqdn="dns.google", ip="8.8.8.8")
canvas.add_node("1.1.1.1", type="host", label="{name}",
                name="one.one.one.one [1.1.1.1]", fqdn="one.one.one.one",
                ip="1.1.1.1")
canvas.add_edge("8.8.8.8", "1.1.1.1")

vb.serve(canvas, port=8138, open_browser=False)
```

- [ ] **Step 2: Napiš E2E skript**

Vytvoř `/tmp/vb-detail-verify/detail-e2e.mjs`:

```js
import { chromium } from '/tmp/vb-2b-verify/node_modules/playwright/index.js';
import net from 'node:net';

const URL = 'http://127.0.0.1:8138/';
const SHOTS = '/tmp/vb-detail-verify';

function waitPort(host, port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const s = net.connect(port, host);
      s.on('connect', () => { s.destroy(); resolve(); });
      s.on('error', () => {
        s.destroy();
        if (Date.now() > deadline) reject(new Error('port timeout'));
        else setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}

const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };

(async () => {
  await waitPort('127.0.0.1', 8138);
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=metal'],
  });
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__viewbase
    && window.__viewbase.windowManager
    && window.__viewbase.store.nodes.size >= 2, null, { timeout: 15000 });

  // 1) Otevři okno přes manager (deterministicky, bez trefování 3D pozice)
  await page.evaluate(() => window.__viewbase.windowManager.openFor('8.8.8.8'));
  const win = page.locator('[data-role="detail-window"][data-node-id="8.8.8.8"]');
  await win.waitFor({ state: 'visible', timeout: 5000 });
  const title = await win.locator('[data-role="detail-titlebar"]').innerText();
  if (!title.includes('dns.google')) fail(`titulek nečekaný: ${title}`);
  await page.screenshot({ path: `${SHOTS}/01-open.png` });

  // 2) Drag za záhlaví → okno se posune
  const bar = win.locator('[data-role="detail-titlebar"]');
  const b0 = await win.boundingBox();
  await bar.hover();
  await page.mouse.down();
  await page.mouse.move(b0.x + 140, b0.y + 90, { steps: 8 });
  await page.mouse.up();
  const b1 = await win.boundingBox();
  if (Math.abs(b1.x - b0.x) < 30 && Math.abs(b1.y - b0.y) < 30) {
    fail('okno se po tahu neposunulo');
  }
  await page.screenshot({ path: `${SHOTS}/02-drag.png` });
  const movedX = b1.x; const movedY = b1.y;

  // 3) Minimalizace → dok vlevo dole
  await win.locator('[data-gadget="minimize"]').click();
  const strip = page.locator(
    '[data-role="detail-dock-strip"][data-node-id="8.8.8.8"]');
  await strip.waitFor({ state: 'visible', timeout: 3000 });
  const app = await page.locator('#app').boundingBox();
  const sb = await strip.boundingBox();
  if (sb.x > app.x + 40) fail(`proužek není vlevo: x=${sb.x}`);
  if (sb.y + sb.height < app.y + app.height - 60) {
    fail(`proužek není dole: y=${sb.y}`);
  }
  await page.screenshot({ path: `${SHOTS}/03-dock.png` });

  // 4) Obnova → zpět na předchozí pozici
  await strip.locator('[data-gadget="restore"]').click();
  await win.waitFor({ state: 'visible', timeout: 3000 });
  const b2 = await win.boundingBox();
  if (Math.abs(b2.x - movedX) > 6 || Math.abs(b2.y - movedY) > 6) {
    fail(`obnova nevrátila pozici: ${b2.x},${b2.y} vs ${movedX},${movedY}`);
  }
  await page.screenshot({ path: `${SHOTS}/04-restore.png` });

  // 5) Klik na hodnotu → clipboard
  const ipCell = win.locator('[data-role="detail-value"]', { hasText: '8.8.8.8' });
  await ipCell.click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  if (clip !== '8.8.8.8') fail(`clipboard != hodnota: '${clip}'`);

  // 6) Dvě okna + z-order: otevři druhé, pak klikem na první ho zvedni
  await page.evaluate(() => window.__viewbase.windowManager.openFor('1.1.1.1'));
  const win2 = page.locator('[data-role="detail-window"][data-node-id="1.1.1.1"]');
  await win2.waitFor({ state: 'visible', timeout: 3000 });
  await win.locator('[data-role="detail-titlebar"]').click();
  const z1 = await win.evaluate((e) => Number(e.style.zIndex));
  const z2 = await win2.evaluate((e) => Number(e.style.zIndex));
  if (!(z1 > z2)) fail(`z-order: klik nezvedl první okno (z1=${z1}, z2=${z2})`);
  await page.screenshot({ path: `${SHOTS}/05-two-windows.png` });

  await browser.close();
  if (process.exitCode) console.error('E2E: NĚKTERÉ KONTROLY SELHALY');
  else console.log('E2E: OK');
})();
```

- [ ] **Step 3: Spusť server demo a E2E**

Run (z kořene repa; venv aktivní):
```bash
source .venv/bin/activate
( cd frontend && npm run build )
python /tmp/vb-detail-verify/demo_detail.py >/tmp/vb-detail-verify/server.log 2>&1 &
SRV=$!
node /tmp/vb-detail-verify/detail-e2e.mjs
kill $SRV
```
Expected: poslední řádek `E2E: OK`; v `/tmp/vb-detail-verify/` vznikne 5 screenshotů (`01-open.png` .. `05-two-windows.png`).

Pozn.: `vb.serve` servíruje sestavené assety z `python/viewbase/static` (Vite `build.outDir`), proto je `npm run build` (ve `frontend/`) před spuštěním serveru nutný — jinak demo ukáže starý frontend bez WindowManageru.

- [ ] **Step 4: Vizuální kontrola screenshotů**

Otevři `/tmp/vb-detail-verify/01-open.png` až `05-two-windows.png` a zkontroluj: okno s titulkem a řádky FQDN/IP; posunuté okno; proužek vlevo dole; obnovené okno; dvě okna naráz.

- [ ] **Step 5: Final commit (jen zdroj, ne dočasné soubory v /tmp)**

Skripty žijí v `/tmp` (mimo repo), takže tento task nepřidává soubory do gitu. Pokud T6 odhalí nutnou opravu zdroje, oprav ji v příslušném souboru a commitni:

```bash
git add -A
git commit -m "fix: doladění detailního okna podle E2E (pokud bylo třeba)"
```

Pokud žádná oprava nebyla nutná, žádný commit v T6 nevzniká.

---

## Pokrytí spec ↔ plán

| Požadavek ve specu | Task |
|---|---|
| §4.2 Python `detail_window(rows, width_chars, open_on_click)` + uložení do config | T1 |
| §4.2 default detail_window vždy v config/snapshot | T1 |
| §4.2 validace (width kladný int, rows None/dvojice, ValueError) | T1 |
| §7 čistá fn `buildRows` (šablona / all-meta / prázdná hodnota) | T2 |
| §7 čistá fn `clampToCanvas` (uvnitř/u hrany) | T2 |
| §7 čistá fn `dockLayout` (index 0..n) | T2 |
| §7 `windowsToRefresh` (zobecnění `detailPatchAction` na více oken) | T2 |
| §4.1, §5.1–5.3 `DetailWindow` (záhlaví, gadgety, tělo monospace, drag, clipboard) | T3 |
| §5.4 minimalizace → dok vlevo dole, obnova pozice/rozměr | T3 |
| §5.5 více oken + z-order (bring-to-front) | T3 |
| §4.1 `WindowManager` (openFor, onPatch, applyTheme, z-order, dok slots) | T3 |
| §8 fallback clipboard (execCommand), chybějící klíč = prázdná hodnota, openFor neznámého = no-op | T2/T3 |
| §7 téma blok `window` v modern + cyber, `--vb-window-*` proměnné | T4 |
| §6 klik na uzel → `openFor` (respekt `open_on_click`); `show_detail` → `openFor`; patch → `onPatch` | T4 |
| §2/§4.1 odstranění `DetailBox` (`detail.js` + test smazán) | T4 |
| §4.3 wireshark: `fqdn`/`ip` meta + `detail_window(rows=[FQDN,IP])` | T5 |
| §9 vitest (čistá logika) | T2 |
| §9 pytest (config, validace, snapshot) | T1 |
| §9 E2E Playwright (klik/drag/minimize/restore/clipboard/z-order) | T6 |

## Venku (možná později)

- Změna velikosti okna tažením za roh (resize-by-corner).
- Runtime přidávání/odebírání zobrazených klíčů přímo v UI okna.
- Ukotvení/snap oken k hranám či mřížce.
- Perzistence rozložení oken (uložení pozic/minimalizace mezi reloady).
- Klávesové zkratky pro okna (zavřít/cyklit/minimalizovat vše).
