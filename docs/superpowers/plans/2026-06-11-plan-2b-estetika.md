# Plán 2b: Estetika — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vizuální vrstva viewbase: theme engine s tématy `modern` a `cyber` (runtime přepínání včetně bloomu), typy uzlů s tvary a per-instance barvou/velikostí, SDF labely s LOD rozpočtem, `quality="auto"` degradace, úklid (Canvas.close, živý detail box, spec-sync) a showcase příklad + E2E.

**Architecture:** Téma je deklarativní objekt deep-mergovaný přes základ `modern` (`themes/manager.js`); Renderer přestane mít jeden globální `nodeMesh` a drží `Map` typ→`InstancedMesh` se stateless per-frame rebuildem instancí (mapování slot→id v `mesh.userData.ids`). Labely jsou pool troika `Text` objektů řízený čistou výběrovou funkcí (zvýrazněné + nejbližší ke kameře do rozpočtu). Bloom je `EffectComposer`, který se vytváří/ruší podle aktivního tématu; kvalita degraduje jednosměrně přes `FpsWatchdog` (vypnout bloom → pixelRatio 1). Python Canvas validuje `theme` a `quality` hlasitě v místě volání.

**Tech Stack:** Python 3.10+ (FastAPI, uvicorn, pytest), JS (Vite, vitest, three r165 + three/addons, d3-force-3d, troika-three-text), Playwright pro E2E.

**Předpoklady:** Plán 2a je kompletně v `main`. Příkazy se spouštějí z kořene repa; aktivní venv (`source .venv/bin/activate`, balíček nainstalovaný `pip install -e "python[dev]"`); ve `frontend/` proběhlo `npm install`; Node.js ≥ 20.

**Konvence — tvar tématu (závazný pro všechny tasky):**

```js
{
  background: '#rrggbb',
  palette: [/* kategorická paleta, ≥8 barev (typy toků ji použijí v Plánu 3) */],
  node:  { color, size, shape, emissive, emissiveIntensity },
  edge:  { color, opacity },
  lights: { ambient: { color, intensity }, directional: { color, intensity } },
  label: { color, size, halo, budget },
  detailBox: { '--vb-*': '...' },   // CSS custom properties pro HTML overlaye
  bloom: { enabled, strength, radius, threshold },
}
```

API napříč tasky: `resolveTheme(nameOrDict)` + `applyCssVars(theme)` (T1, `themes/manager.js`), `renderer.applyTheme(theme)` (T1, rozšířeno v T2/T3/T4), `nodeStyle(node, types, theme)` (T2, `render/style.js`), `LabelLayer` + `selectLabelIds(...)` (T3, `render/labels.js`), `renderer._syncBloom()` / `renderer.composer` (T4), `FpsWatchdog` + `renderer.disableBloom()` / `renderer.setPixelRatio(r)` (T5), `Canvas.close()` + `detailPatchAction(patch, shownId)` (T6).

---

### Task 1: Theme engine + téma `modern`

**Files:**
- Create: `frontend/src/themes/themes.js`
- Create: `frontend/src/themes/manager.js`
- Create: `frontend/tests/themes.test.js`
- Create: `python/tests/test_theme.py`
- Modify: `frontend/src/render/renderer.js`, `frontend/src/main.js`, `frontend/src/interact/detail.js`, `frontend/src/core/status.js`, `python/viewbase/canvas.py`

Cíl: konstanty `NODE_COLOR`/`EDGE_COLOR`/`BACKGROUND` zmizí, vše čte aktivní téma; `applyTheme` mění vzhled za běhu; HTML overlaye se stylují přes CSS proměnné `--vb-*`; Python validuje název tématu.

- [ ] **Step 1: Failing vitest pro resolveTheme**

Vytvoř `frontend/tests/themes.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { deepMerge, resolveTheme } from '../src/themes/manager.js';
import { THEMES } from '../src/themes/themes.js';

describe('resolveTheme', () => {
  it('vrátí vestavěné téma podle jména', () => {
    expect(resolveTheme('modern')).toBe(THEMES.modern);
  });

  it('neznámé jméno → console.error + fallback na modern', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(resolveTheme('vaporwave')).toBe(THEMES.modern);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('dict se deep-merguje přes modern', () => {
    const theme = resolveTheme({ background: '#000000', node: { size: 2 } });
    expect(theme.background).toBe('#000000');
    expect(theme.node.size).toBe(2);
    expect(theme.node.color).toBe(THEMES.modern.node.color);  // ze základu
    expect(theme.edge).toEqual(THEMES.modern.edge);
  });

  it('merge nemutuje vestavěný základ', () => {
    resolveTheme({ node: { size: 9 } });
    expect(THEMES.modern.node.size).toBe(1.0);
  });

  it('pole (paleta) se přepisuje celé, nemerguje po prvcích', () => {
    const theme = deepMerge(THEMES.modern, { palette: ['#111111'] });
    expect(theme.palette).toEqual(['#111111']);
  });
});
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/themes.test.js`
Expected: FAIL — modul `../src/themes/manager.js` neexistuje.

- [ ] **Step 3: Implementace themes.js + manager.js**

Vytvoř `frontend/src/themes/themes.js`:

```js
/** Vestavěná témata. Téma je čistě deklarativní objekt – žádná logika.
 *  Klíče v `detailBox` jsou CSS custom properties pro HTML overlaye
 *  (detail box + status overlay), zapisuje je applyCssVars na :root. */
export const modern = {
  background: '#f4f5f7',
  palette: ['#2f7fe8', '#e8553a', '#2fa84f', '#8a4fe8', '#e8a02f',
    '#1fb3c4', '#d44f9e', '#5b6472'],
  node: {
    color: '#2f7fe8', size: 1.0, shape: 'sphere',
    emissive: '#000000', emissiveIntensity: 0,
  },
  edge: { color: '#9aa3af', opacity: 0.5 },
  lights: {
    ambient: { color: '#ffffff', intensity: 0.7 },
    directional: { color: '#ffffff', intensity: 1.2 },
  },
  label: { color: '#1f2430', size: 6, halo: '#f4f5f7', budget: 200 },
  detailBox: {
    '--vb-detail-bg': 'rgba(255,255,255,0.95)',
    '--vb-detail-fg': '#1f2430',
    '--vb-detail-key': '#667788',
    '--vb-detail-shadow': '0 4px 16px rgba(0,0,0,0.18)',
    '--vb-status-bg': 'rgba(20,23,28,0.85)',
    '--vb-status-fg': '#ffffff',
  },
  bloom: { enabled: false, strength: 0.8, radius: 0.6, threshold: 0.15 },
};

export const THEMES = { modern };   // 'cyber' přibude v Tasku 4
```

Vytvoř `frontend/src/themes/manager.js`:

```js
import { THEMES } from './themes.js';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Rekurzivní merge: objekty se slévají, pole a skaláry přepisují celé. */
export function deepMerge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = (isPlainObject(out[key]) && isPlainObject(value))
      ? deepMerge(out[key], value)
      : value;
  }
  return out;
}

/** Název vestavěného tématu, nebo dict (deep merge přes `modern`).
 *  Neznámé jméno → console.error + fallback na modern (klient nesmí
 *  spadnout; Python validuje vestavěná jména už v Canvasu). */
export function resolveTheme(nameOrDict) {
  if (typeof nameOrDict === 'string') {
    if (THEMES[nameOrDict]) return THEMES[nameOrDict];
    console.error(`viewbase: neznámé téma '${nameOrDict}' – používám 'modern'`);
    return THEMES.modern;
  }
  if (isPlainObject(nameOrDict)) return deepMerge(THEMES.modern, nameOrDict);
  if (nameOrDict != null) {
    console.error('viewbase: theme musí být string nebo objekt – používám modern');
  }
  return THEMES.modern;
}

/** Zapíše CSS custom properties tématu (--vb-*) na :root. */
export function applyCssVars(theme, root = document.documentElement) {
  for (const [name, value] of Object.entries(theme.detailBox)) {
    root.style.setProperty(name, value);
  }
}
```

- [ ] **Step 4: Ověřit zelené**

Run: `cd frontend && npx vitest run tests/themes.test.js`
Expected: PASS — 5 testů.

- [ ] **Step 5: Failing pytest na validaci tématu v Canvasu**

Vytvoř `python/tests/test_theme.py`:

```python
"""Validace parametru theme: vestavěná jména vs. dict."""
import pytest

import viewbase as vb


def test_neznamy_nazev_tematu_pada():
    with pytest.raises(ValueError):
        vb.Canvas(theme="vaporwave")


def test_vestavena_jmena_prochazi():
    assert vb.Canvas(theme="modern").config["theme"] == "modern"
    assert vb.Canvas(theme="cyber").config["theme"] == "cyber"


def test_dict_tema_prochazi_beze_zmeny():
    theme = {"background": "#000000", "node": {"size": 2}}
    assert vb.Canvas(theme=theme).config["theme"] == theme


def test_theme_spatneho_typu_pada():
    with pytest.raises(ValueError):
        vb.Canvas(theme=42)


def test_set_theme_validuje_a_radi_akci():
    canvas = vb.Canvas()
    with pytest.raises(ValueError):
        canvas.set_theme("vaporwave")
    canvas.set_theme("cyber")
    assert canvas.config["theme"] == "cyber"
    assert canvas.drain_actions() == [{"action": "set_theme", "theme": "cyber"}]
```

- [ ] **Step 6: Ověřit selhání**

Run: `python -m pytest python/tests/test_theme.py -q`
Expected: FAIL — `test_neznamy_nazev_tematu_pada` a `test_set_theme_validuje_a_radi_akci` padají (validace neexistuje), ostatní projdou.

- [ ] **Step 7: Validace v canvas.py**

V `python/viewbase/canvas.py` přidej pod řádek `_LABEL_KEY = re.compile(...)`:

```python
BUILTIN_THEMES = ("modern", "cyber")


def _validated_theme(theme: Any) -> Any:
    """Název vestavěného tématu, nebo dict (klient ho merguje přes modern)."""
    if isinstance(theme, str):
        if theme not in BUILTIN_THEMES:
            raise ValueError(
                f"Neznámé téma '{theme}' – vestavěná: {', '.join(BUILTIN_THEMES)};"
                " vlastní téma předej jako dict")
        return theme
    if isinstance(theme, dict):
        return theme
    raise ValueError("theme musí být název vestavěného tématu nebo dict")
```

V `__init__` nahraď řádek `"theme": theme,` za:

```python
            "theme": _validated_theme(theme),
```

a změň anotaci parametru `theme: str = "modern"` na `theme: Any = "modern"`.

V `set_theme` nahraď tělo:

```python
    def set_theme(self, theme: Any) -> None:
        """Přepne téma za běhu (vestavěné jméno nebo dict) a pošle akci."""
        theme = _validated_theme(theme)
        with self._lock:
            self.config["theme"] = theme
            self._actions.append({"action": "set_theme", "theme": theme})
```

- [ ] **Step 8: Ověřit zelené**

Run: `python -m pytest python/tests/test_theme.py -q`
Expected: PASS — 5 testů.

- [ ] **Step 9: Renderer čte téma místo konstant**

V `frontend/src/render/renderer.js`:

1. Nahraď blok konstant na začátku souboru (řádky s `NODE_COLOR`, `EDGE_COLOR`, `BACKGROUND` zmizí):

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resolveTheme } from '../themes/manager.js';

const SMOOTHING = 8;            // 1/s – rychlost dobíhání zobrazené pozice k fyzice
const DIM_TOWARD_BG = 0.75;     // ztlumené uzly: 75 % cesty k barvě pozadí
const FOCUS_DURATION = 0.6;     // s – dolet kamery na uzel
const ORTHO_HALF_HEIGHT = 600;  // světové jednotky – polovina výšky 2D pohledu
```

2. V konstruktoru nahraď blok od `this.scene = new THREE.Scene();` až po `this._ensureEdgeCapacity(4096);` tímto (světla jsou nově pojmenované fieldy, barvy nastavuje až `applyTheme`):

```js
    this.theme = resolveTheme('modern');   // než dorazí init, jede základ

    this.scene = new THREE.Scene();
    this.camera = null;         // vznikne v _initCamera po initu
    this.controls = null;

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setSize(container.clientWidth, container.clientHeight);
    this.webgl.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.webgl.domElement);

    this.ambient = new THREE.AmbientLight();
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight();
    this.sun.position.set(1, 2, 3);
    this.scene.add(this.sun);

    this.nodeCapacity = 0;
    this.nodeMesh = null;
    this._ensureNodeCapacity(1024);

    this.edgeCapacity = 0;
    this.edgeLines = null;
    this._ensureEdgeCapacity(4096);
```

3. V konstruktoru nahraď řádky s `this._fullColor = ...` a `this._dimColor = ...` za:

```js
    this._fullColor = new THREE.Color();
    this._dimColor = new THREE.Color();
    this.applyTheme(this.theme);          // pozadí, světla, materiály, barvy
```

(`this.applyTheme` musí přijít až po vytvoření `nodeMesh`/`edgeLines`, tj. nech ho na místě původních `_fullColor`/`_dimColor` řádků.)

4. Přidej novou metodu hned za konstruktor:

```js
  /** Přepne aktivní téma za běhu: pozadí, světla, hrany, materiály uzlů. */
  applyTheme(theme) {
    this.theme = theme;
    this.scene.background = new THREE.Color(theme.background);
    this.ambient.color.set(theme.lights.ambient.color);
    this.ambient.intensity = theme.lights.ambient.intensity;
    this.sun.color.set(theme.lights.directional.color);
    this.sun.intensity = theme.lights.directional.intensity;
    this.edgeLines.material.color.set(theme.edge.color);
    this.edgeLines.material.opacity = theme.edge.opacity;
    this.nodeMesh.material.emissive.set(theme.node.emissive);
    this.nodeMesh.material.emissiveIntensity = theme.node.emissiveIntensity;
    this._fullColor.set(theme.node.color);
    this._dimColor.copy(this._fullColor)
      .lerp(new THREE.Color(theme.background), DIM_TOWARD_BG);
  }
```

5. V `_ensureNodeCapacity` nahraď vytvoření materiálu:

```js
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      emissive: new THREE.Color(this.theme.node.emissive),
      emissiveIntensity: this.theme.node.emissiveIntensity,
    });
```

6. V `_ensureEdgeCapacity` nahraď vytvoření `LineSegments`:

```js
    this.edgeLines = new THREE.LineSegments(geometry,
      new THREE.LineBasicMaterial({
        color: this.theme.edge.color,
        transparent: true,
        opacity: this.theme.edge.opacity,
      }));
```

- [ ] **Step 10: CSS proměnné v DetailBox a StatusOverlay**

V `frontend/src/interact/detail.js` nahraď `cssText` v konstruktoru:

```js
    this.el.style.cssText = [
      'position:fixed', 'top:16px', 'right:16px', 'min-width:220px',
      'max-width:320px', 'padding:12px 14px', 'border-radius:8px',
      'background:var(--vb-detail-bg, rgba(255,255,255,0.95))',
      'color:var(--vb-detail-fg, #1f2430)',
      'font:13px/1.5 system-ui,sans-serif',
      'box-shadow:var(--vb-detail-shadow, 0 4px 16px rgba(0,0,0,0.18))',
      'z-index:900', 'display:none',
    ].join(';');
```

Tamtéž v `show()` nahraď styl zavíracího křížku a klíčové buňky:

```js
    close.style.cssText = 'position:absolute;top:6px;right:8px;border:0;'
      + 'background:none;font-size:16px;cursor:pointer;'
      + 'color:var(--vb-detail-key, #666)';
```

```js
      keyCell.style.cssText = 'padding:2px 10px 2px 0;vertical-align:top;'
        + 'color:var(--vb-detail-key, #667788)';
```

V `frontend/src/core/status.js` nahraď v `cssText` řádek s pozadím a barvou:

```js
      'background:var(--vb-status-bg, rgba(20,23,28,0.85))',
      'color:var(--vb-status-fg, #ffffff)',
```

(místo původních `'background:rgba(20,23,28,0.85)'`, `'color:#fff'`.)

- [ ] **Step 11: Aplikace tématu v main.js (init + set_theme)**

V `frontend/src/main.js`:

1. Přidej import:

```js
import { applyCssVars, resolveTheme } from './themes/manager.js';
```

2. Do `bootstrap()` přidej hned za vytvoření `renderer` (za uzavírací `});` konstruktoru Rendereru):

```js
  function applyTheme(nameOrDict) {
    const theme = resolveTheme(nameOrDict);
    renderer.applyTheme(theme);
    applyCssVars(theme);
  }
```

3. Nahraď stávající `store.subscribe(...)` blok:

```js
  store.subscribe((event) => {
    if (event.kind !== 'init') return;
    applyTheme(store.config.theme);
    if (store.config.title) {
      document.title = `${store.config.title} – viewbase`;
    }
  });
```

4. V mapě `actions` nahraď `set_theme`:

```js
    set_theme: (msg) => {
      store.config.theme = msg.theme;     // reconnect → init už ponese nové téma
      applyTheme(msg.theme);
    },
```

- [ ] **Step 12: Všechny testy zelené**

Run: `cd frontend && npx vitest run && cd .. && python -m pytest python/tests -q`
Expected: PASS — všech 7 vitest souborů (6 stávajících + themes) i celý pytest bez failů.

- [ ] **Step 13: Manuální ověření vzhledu**

```bash
cd frontend && npm run build && cd ..
python examples/quickstart.py
```

Checklist v prohlížeči (http://127.0.0.1:8080):
- vzhled identický s Plánem 2a (modern = původní konstanty: světlé pozadí, modré uzly, šedé hrany);
- v konzoli `window.__viewbase.renderer.theme.background` → `'#f4f5f7'`.

Pak dict téma — vytvoř `/tmp/vb-2b-dict.py`:

```python
import viewbase as vb

canvas = vb.Canvas(title="dict-tema",
                   theme={"background": "#1d2230", "node": {"color": "#ffd166"}})
canvas.add_node("a")
canvas.add_node("b")
canvas.add_edge("a", "b")
vb.serve(canvas, port=8080, open_browser=True)
```

Run: `python /tmp/vb-2b-dict.py` → tmavé pozadí, žluté uzly, hrany pořád z modern základu (merge funguje).

- [ ] **Step 14: Commit**

```bash
git add frontend/src/themes frontend/tests/themes.test.js \
  frontend/src/render/renderer.js frontend/src/main.js \
  frontend/src/interact/detail.js frontend/src/core/status.js \
  python/viewbase/canvas.py python/tests/test_theme.py
git commit -m "feat: theme engine a vestavěné téma modern"
```

---

### Task 2: Typy uzlů + per-instance styl

**Files:**
- Create: `frontend/src/render/style.js`
- Create: `frontend/tests/style.test.js`
- Modify: `frontend/src/render/renderer.js` (kompletní přepis souboru níže)

Renderer drží `Map` typ→`InstancedMesh` (geometrie podle `shape` typu; default z tématu). Instance se každý snímek přerozdělují stateless rebuildem (jako dnes, jen napříč meshi). `meta.color`/`meta.size` přebíjí typ, typ přebíjí téma. GLB modely se v tomto plánu NEdělají (klíč `model` v typu se ignoruje, tvar spadne na default) — odloženo do Plánu 3.

- [ ] **Step 1: Failing vitest pro nodeStyle**

Vytvoř `frontend/tests/style.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { nodeStyle } from '../src/render/style.js';

const theme = { node: { color: '#111111', size: 1, shape: 'sphere' } };
const types = { server: { shape: 'box', color: '#222222', size: 1.4 } };

describe('nodeStyle', () => {
  it('bez typu a meta bere vše z tématu', () => {
    expect(nodeStyle({ id: 'a', type: null, meta: {} }, types, theme))
      .toEqual({ shape: 'sphere', color: '#111111', size: 1 });
  });

  it('typ přebíjí téma', () => {
    expect(nodeStyle({ id: 'a', type: 'server', meta: {} }, types, theme))
      .toEqual({ shape: 'box', color: '#222222', size: 1.4 });
  });

  it('meta.color a meta.size přebíjí typ', () => {
    expect(nodeStyle(
      { id: 'a', type: 'server', meta: { color: '#ff0000', size: 3 } },
      types, theme))
      .toEqual({ shape: 'box', color: '#ff0000', size: 3 });
  });

  it('typ bez tvaru/velikosti doplní téma', () => {
    const partial = { db: { color: '#333333' } };
    expect(nodeStyle({ id: 'a', type: 'db', meta: {} }, partial, theme))
      .toEqual({ shape: 'sphere', color: '#333333', size: 1 });
  });

  it('neznámý typ spadne celý na téma (store může být o patch pozadu)', () => {
    expect(nodeStyle({ id: 'a', type: 'ghost', meta: {} }, types, theme))
      .toEqual({ shape: 'sphere', color: '#111111', size: 1 });
  });
});
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/style.test.js`
Expected: FAIL — `../src/render/style.js` neexistuje.

- [ ] **Step 3: Implementace style.js**

Vytvoř `frontend/src/render/style.js`:

```js
/** Výsledný styl uzlu – čistá funkce, priorita: meta > typ > téma.
 *  `types` je store.nodeTypes (dict z define_type), `theme` aktivní téma.
 *  Klíč `model` (GLB) se v Plánu 2b ignoruje – tvar spadne na default. */
export function nodeStyle(node, types, theme) {
  const type = (node.type != null && types[node.type]) || {};
  return {
    shape: type.shape ?? theme.node.shape,
    color: node.meta.color ?? type.color ?? theme.node.color,
    size: node.meta.size ?? type.size ?? theme.node.size,
  };
}
```

- [ ] **Step 4: Ověřit zelené**

Run: `cd frontend && npx vitest run tests/style.test.js`
Expected: PASS — 5 testů.

- [ ] **Step 5: Přepis rendereru na Map typ→InstancedMesh**

Nahraď celý obsah `frontend/src/render/renderer.js`:

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resolveTheme } from '../themes/manager.js';
import { nodeStyle } from './style.js';

const SMOOTHING = 8;            // 1/s – rychlost dobíhání zobrazené pozice k fyzice
const DIM_TOWARD_BG = 0.75;     // ztlumené uzly: 75 % cesty k barvě pozadí
const FOCUS_DURATION = 0.6;     // s – dolet kamery na uzel
const ORTHO_HALF_HEIGHT = 600;  // světové jednotky – polovina výšky 2D pohledu
const DEFAULT_TYPE = '__default';  // klíč meshe pro uzly bez typu

// Geometrie tvarů – rozměry voleny na zhruba stejný vizuální objem.
const GEOMETRIES = {
  sphere: () => new THREE.SphereGeometry(3, 12, 8),
  box: () => new THREE.BoxGeometry(4.8, 4.8, 4.8),
  octahedron: () => new THREE.OctahedronGeometry(3.6),
  tetrahedron: () => new THREE.TetrahedronGeometry(4.2),
};

/** Instancovaný renderer: InstancedMesh per typ uzlu (tvar z typu/tématu),
 *  jeden LineSegments pro hrany. Instance se každý snímek přerozdělují
 *  stateless rebuildem; mapování slot → id žije v mesh.userData.ids.
 *  Kamera a controls vznikají lazy při prvním 'init' eventu ze store
 *  (config.dimensions: 3 = perspektivní orbit, 2 = ortografický pan/zoom);
 *  do té doby se nerendruje (guard v _frame). */
export class Renderer {
  constructor(container, store, engine, { onCameraReady = () => {} } = {}) {
    this.container = container;
    this.store = store;
    this.engine = engine;
    this.onCameraReady = onCameraReady;
    this.display = new Map();   // id -> THREE.Vector3 (vyhlazená pozice)
    this.theme = resolveTheme('modern');   // než dorazí init, jede základ

    this.scene = new THREE.Scene();
    this.camera = null;         // vznikne v _initCamera po initu
    this.controls = null;

    this.webgl = new THREE.WebGLRenderer({ antialias: true });
    this.webgl.setSize(container.clientWidth, container.clientHeight);
    this.webgl.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.webgl.domElement);

    this.ambient = new THREE.AmbientLight();
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight();
    this.sun.position.set(1, 2, 3);
    this.scene.add(this.sun);

    this.meshes = new Map();    // klíč (DEFAULT_TYPE | název typu) -> InstancedMesh
    this._counts = new Map();   // pracovní mapa snímku: klíč -> počet instancí

    this.edgeCapacity = 0;
    this.edgeLines = null;
    this._ensureEdgeCapacity(4096);

    this.clock = new THREE.Clock();
    this._matrix = new THREE.Matrix4();
    this.raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._tmpColor = new THREE.Color();
    this._bgColor = new THREE.Color();
    this.frameIndex = 0;        // memoizace computeBoundingSphere v pick()
    this._boundsStamp = -1;

    this.highlightSet = null;   // Set id | null = bez zvýraznění
    this.focusId = null;        // id uzlu, ke kterému letí kamera
    this.focusElapsed = 0;
    this._focusFrom = new THREE.Vector3();

    this.applyTheme(this.theme);

    store.subscribe((event) => {
      if (event.kind === 'init' && !this.camera) {
        this._initCamera(store.config.dimensions);
      }
    });

    window.addEventListener('resize', () => this._onResize());
  }

  /** Přepne aktivní téma za běhu: pozadí, světla, hrany, materiály uzlů.
   *  Změnu výchozího tvaru (theme.node.shape) dořeší _ensureMesh při
   *  příštím snímku (mesh s jiným tvarem se vymění). */
  applyTheme(theme) {
    this.theme = theme;
    this._bgColor.set(theme.background);
    this.scene.background = new THREE.Color(theme.background);
    this.ambient.color.set(theme.lights.ambient.color);
    this.ambient.intensity = theme.lights.ambient.intensity;
    this.sun.color.set(theme.lights.directional.color);
    this.sun.intensity = theme.lights.directional.intensity;
    this.edgeLines.material.color.set(theme.edge.color);
    this.edgeLines.material.opacity = theme.edge.opacity;
    for (const mesh of this.meshes.values()) {
      mesh.material.emissive.set(theme.node.emissive);
      mesh.material.emissiveIntensity = theme.node.emissiveIntensity;
    }
  }

  /** Kamera + controls podle config.dimensions. Volá se jen jednou – změna
   *  dimenzí za běhu serveru vyžaduje obnovení stránky. */
  _initCamera(dimensions) {
    if (this.camera) return;   // idempotence – reconnect nesmí duplikovat controls/listenery
    const aspect = this.container.clientWidth / this.container.clientHeight;
    if (dimensions === 2) {
      this.camera = new THREE.OrthographicCamera(
        -ORTHO_HALF_HEIGHT * aspect, ORTHO_HALF_HEIGHT * aspect,
        ORTHO_HALF_HEIGHT, -ORTHO_HALF_HEIGHT, -10000, 10000);
      this.camera.position.set(0, 0, 1000);
      this.controls = new OrbitControls(this.camera, this.webgl.domElement);
      this.controls.enableDamping = true;
      this.controls.enableRotate = false;
      this.controls.screenSpacePanning = true;
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN,
      };
      this.controls.touches = {
        ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN,
      };
    } else {
      this.camera = new THREE.PerspectiveCamera(60, aspect, 1, 50000);
      this.camera.position.set(0, 0, 900);
      this.controls = new OrbitControls(this.camera, this.webgl.domElement);
      this.controls.enableDamping = true;
      this.controls.minDistance = 20;
      this.controls.maxDistance = 20000;   // bezpečně před far plane (50000)
    }
    this.onCameraReady();
  }

  _onResize() {
    this.webgl.setSize(this.container.clientWidth, this.container.clientHeight);
    if (!this.camera) return;
    const aspect = this.container.clientWidth / this.container.clientHeight;
    if (this.camera.isOrthographicCamera) {
      this.camera.left = -ORTHO_HALF_HEIGHT * aspect;
      this.camera.right = ORTHO_HALF_HEIGHT * aspect;
    } else {
      this.camera.aspect = aspect;
    }
    this.camera.updateProjectionMatrix();
  }

  /** InstancedMesh pro klíč typu: vytvoří nový, zvětší (kapacitní regrow
   *  per mesh, mocniny dvou) nebo vymění při změně tvaru.
   *  mesh.userData: { shape, capacity, ids, cursor }. */
  _ensureMesh(key, shape, count) {
    let mesh = this.meshes.get(key);
    if (mesh && mesh.userData.shape === shape
        && count <= mesh.userData.capacity) {
      return mesh;
    }
    const capacity = Math.max(256,
      2 ** Math.ceil(Math.log2(Math.max(1, count))));
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.dispose();
    }
    const geometry = (GEOMETRIES[shape] ?? GEOMETRIES.sphere)();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,            // shader násobí material.color * instanceColor
      roughness: 0.4,
      emissive: new THREE.Color(this.theme.node.emissive),
      emissiveIntensity: this.theme.node.emissiveIntensity,
    });
    mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.count = 0;
    mesh.userData = { shape, capacity, ids: [], cursor: 0 };
    this.scene.add(mesh);
    this.meshes.set(key, mesh);
    return mesh;
  }

  _ensureEdgeCapacity(count) {
    if (count <= this.edgeCapacity) return;
    const capacity = Math.max(4096, 2 ** Math.ceil(Math.log2(count)));
    if (this.edgeLines) {
      this.scene.remove(this.edgeLines);
      this.edgeLines.geometry.dispose();
      this.edgeLines.material.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array(capacity * 6), 3));
    geometry.setDrawRange(0, 0);
    this.edgeLines = new THREE.LineSegments(geometry,
      new THREE.LineBasicMaterial({
        color: this.theme.edge.color,
        transparent: true,
        opacity: this.theme.edge.opacity,
      }));
    this.edgeLines.frustumCulled = false;
    this.scene.add(this.edgeLines);
    this.edgeCapacity = capacity;
  }

  start() {
    this.webgl.setAnimationLoop(() => this._frame());
  }

  _frame() {
    const dt = this.clock.getDelta();
    if (!this.camera) return;       // čekáme na init (config.dimensions)
    this.frameIndex += 1;           // invalidace memoizace bounding sphere
    this._syncNodes(dt);
    this._syncEdges();
    this._stepFocus(dt);
    this.controls.update();
    this.webgl.render(this.scene, this.camera);
  }

  /** Klíč meshe pro uzel: název typu, pokud ho store zná, jinak default. */
  _meshKey(node) {
    return (node && node.type != null && this.store.nodeTypes[node.type])
      ? node.type : DEFAULT_TYPE;
  }

  _syncNodes(dt) {
    const { ids, positions } = this.engine;
    const count = Math.min(ids.length, positions.length / 3);
    const k = Math.min(1, dt * SMOOTHING);
    const seen = new Set();

    // 1. vyhlazení zobrazených pozic (exponenciální dobíhání k fyzice)
    for (let i = 0; i < count; i += 1) {
      const id = ids[i];
      seen.add(id);
      const tx = positions[i * 3];
      const ty = positions[i * 3 + 1];
      const tz = positions[i * 3 + 2];
      let pos = this.display.get(id);
      if (!pos) {
        pos = new THREE.Vector3(tx, ty, tz);
        this.display.set(id, pos);
      }
      pos.x += (tx - pos.x) * k;
      pos.y += (ty - pos.y) * k;
      pos.z += (tz - pos.z) * k;
    }
    for (const id of this.display.keys()) {
      if (!seen.has(id)) this.display.delete(id);
    }

    // 2. rozpočítej uzly podle typů a zajisti kapacity PŘED plněním
    //    (regrow likviduje starý mesh – nesmí přijít uprostřed zápisu)
    this._counts.clear();
    for (let i = 0; i < count; i += 1) {
      const key = this._meshKey(this.store.nodes.get(ids[i]));
      this._counts.set(key, (this._counts.get(key) ?? 0) + 1);
    }
    for (const [key, needed] of this._counts) {
      const shape = key === DEFAULT_TYPE
        ? this.theme.node.shape
        : (this.store.nodeTypes[key].shape ?? this.theme.node.shape);
      const mesh = this._ensureMesh(key, shape, needed);
      mesh.userData.cursor = 0;
      mesh.userData.ids.length = needed;
    }
    for (const [key, mesh] of this.meshes) {
      if (!this._counts.has(key)) {       // typ z grafu zmizel
        mesh.count = 0;
        mesh.userData.ids.length = 0;
      }
    }

    // 3. stateless rebuild instancí (index mapy per mesh per frame)
    for (let i = 0; i < count; i += 1) {
      const id = ids[i];
      const node = this.store.nodes.get(id) ?? { id, type: null, meta: {} };
      const mesh = this.meshes.get(this._meshKey(node));
      const slot = mesh.userData.cursor;
      mesh.userData.cursor += 1;
      mesh.userData.ids[slot] = id;

      const style = nodeStyle(node, this.store.nodeTypes, this.theme);
      const pos = this.display.get(id);
      this._matrix.makeScale(style.size, style.size, style.size);
      this._matrix.setPosition(pos.x, pos.y, pos.z);
      mesh.setMatrixAt(slot, this._matrix);

      this._tmpColor.set(style.color);
      if (this.highlightSet !== null && !this.highlightSet.has(id)) {
        this._tmpColor.lerp(this._bgColor, DIM_TOWARD_BG);   // ztlumení
      }
      mesh.setColorAt(slot, this._tmpColor);
    }
    for (const [key, mesh] of this.meshes) {
      if (!this._counts.has(key)) continue;
      mesh.count = mesh.userData.cursor;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  _syncEdges() {
    const { edges } = this.store;
    this._ensureEdgeCapacity(edges.size);
    const attr = this.edgeLines.geometry.getAttribute('position');
    let i = 0;
    for (const edge of edges.values()) {
      const a = this.display.get(edge.source);
      const b = this.display.get(edge.target);
      if (!a || !b) continue;
      attr.setXYZ(i * 2, a.x, a.y, a.z);
      attr.setXYZ(i * 2 + 1, b.x, b.y, b.z);
      i += 1;
    }
    this.edgeLines.geometry.setDrawRange(0, i * 2);
    attr.needsUpdate = true;
  }

  /** Počet vykreslených instancí napříč všemi typy (testy, E2E). */
  nodeCount() {
    let total = 0;
    for (const mesh of this.meshes.values()) total += mesh.count;
    return total;
  }

  /** Vrátí id uzlu pod souřadnicemi obrazovky, nebo null. Raycast jde přes
   *  pole všech meshů; zpět na id se mapuje přes mesh.userData.ids. */
  pick(clientX, clientY) {
    if (!this.camera || this.meshes.size === 0) return null;
    const rect = this.webgl.domElement.getBoundingClientRect();
    this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    // Bounding sphere se po pohybu instancí sama neinvaliduje – bez přepočtu
    // by uzly mimo původní kouli byly nepickovatelné. Přepočet je memoizovaný
    // per frame (hover i klik ve stejném snímku ho sdílí).
    if (this._boundsStamp !== this.frameIndex) {
      for (const mesh of this.meshes.values()) {
        if (mesh.count > 0) mesh.computeBoundingSphere();
      }
      this._boundsStamp = this.frameIndex;
    }
    this.raycaster.setFromCamera(this._pointer, this.camera);
    const targets = [...this.meshes.values()].filter((m) => m.count > 0);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit || hit.instanceId === undefined) return null;
    return hit.object.userData.ids[hit.instanceId] ?? null;
  }

  /** Stav pohledu pro view_change event; null dokud kamera neexistuje. */
  viewState() {
    if (!this.camera || !this.controls) return null;
    const p = this.camera.position;
    const t = this.controls.target;
    return {
      position: { x: p.x, y: p.y, z: p.z },
      target: { x: t.x, y: t.y, z: t.z },
      zoom: this.camera.zoom,
    };
  }

  /** Zvýrazni množinu uzlů (Set id); ostatní se ztlumí. null = reset. */
  setHighlight(ids) {
    this.highlightSet = ids;
  }

  /** Plynulý dolet kamery: tween controls.target k display pozici uzlu. */
  focusOn(nodeId) {
    if (!this.controls) return;
    this.focusId = nodeId;
    this.focusElapsed = 0;
    this._focusFrom.copy(this.controls.target);
  }

  _stepFocus(dt) {
    if (this.focusId === null) return;
    if (!this.store.nodes.has(this.focusId)) {   // uzel mezitím zmizel
      this.focusId = null;
      return;
    }
    const pos = this.display.get(this.focusId);
    if (!pos) return;                            // čeká na první pozici z fyziky
    this.focusElapsed = Math.min(this.focusElapsed + dt, FOCUS_DURATION);
    const t = this.focusElapsed / FOCUS_DURATION;
    const eased = 1 - (1 - t) ** 3;              // easeOutCubic
    this.controls.target.lerpVectors(this._focusFrom, pos, eased);
    if (t >= 1) this.focusId = null;
  }
}
```

- [ ] **Step 6: Všechny vitest zelené**

Run: `cd frontend && npx vitest run`
Expected: PASS — 8 souborů (žádný stávající test nepoužívá `renderer.nodeMesh`, takže nic nepadá).

- [ ] **Step 7: Manuální ověření tvarů a per-instance stylu**

Vytvoř `/tmp/vb-2b-shapes.py`:

```python
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="tvary", highlight_neighbors=1)
canvas.define_type("server", shape="box", color="#28d7fe", size=1.4)
canvas.define_type("db", shape="octahedron", color="#ff2a6d", size=1.8)
canvas.define_type("tetra", shape="tetrahedron", color="#2fa84f")
canvas.add_node("a", type="server")
canvas.add_node("b", type="db")
canvas.add_node("c", type="tetra")
canvas.add_node("d")                      # bez typu: koule + barva z tématu
canvas.add_node("e", color="#ffd166")     # meta.color přebíjí téma
canvas.add_edge("a", "b")
canvas.add_edge("b", "c")
canvas.add_edge("c", "d")
canvas.add_edge("d", "e")


def zmena():
    time.sleep(5)
    canvas.update_node("a", color="#ff0000", size=2.5)


threading.Thread(target=zmena, daemon=True).start()
vb.serve(canvas, port=8080, open_browser=True)
```

```bash
cd frontend && npm run build && cd ..
python /tmp/vb-2b-shapes.py
```

Checklist:
- vidím krychli, oktaedr, čtyřstěn a dvě koule v barvách podle definice; `e` je žlutá;
- po 5 s uzel `a` zčervená a zvětší se (per-instance update za běhu);
- klik na libovolný tvar funguje (highlight sousedů + dolet kamery), hover taky — raycast napříč meshi;
- klik do prázdna zruší zvýraznění;
- v konzoli `window.__viewbase.renderer.nodeCount()` → `5` a `[...window.__viewbase.renderer.meshes.keys()]` → typy + `__default`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/render/style.js frontend/tests/style.test.js \
  frontend/src/render/renderer.js
git commit -m "feat: typy uzlů – InstancedMesh per typ a per-instance styl"
```

---

### Task 3: Labely (troika-three-text, LOD)

**Files:**
- Create: `frontend/src/render/labels.js`
- Create: `frontend/tests/labels.test.js`
- Modify: `frontend/package.json` (npm install), `frontend/src/render/renderer.js`

Pool troika `Text` objektů; viditelné jsou zvýrazněné uzly + nejbližší ke kameře do rozpočtu (default 200, zatím z `theme.label.budget` — `config.label_budget` přijde později); fade přes opacity lerp; `text.sync()` jen při změně textu/stylu; pozice nad uzlem podle size; funguje v 2D i 3D (billboard ke kameře).

- [ ] **Step 1: Instalace závislosti**

Run: `cd frontend && npm install troika-three-text`
Expected: v `package.json` přibude `"troika-three-text": "^0.5x.x"` do `dependencies`; `npm install` skončí bez chyb (three je peer, už ho máme).

- [ ] **Step 2: Failing vitest pro selectLabelIds**

Vytvoř `frontend/tests/labels.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { selectLabelIds } from '../src/render/labels.js';

const cam = { x: 0, y: 0, z: 0 };

/** Uzly na ose x ve vzdálenostech 1, 2, 3, … od kamery. */
function line(ids) {
  const positions = new Float32Array(ids.length * 3);
  ids.forEach((id, i) => { positions[i * 3] = i + 1; });
  return positions;
}

describe('selectLabelIds', () => {
  it('bez zvýraznění vybere nejbližší ke kameře do rozpočtu', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const set = selectLabelIds(ids, line(ids), cam, null, 2);
    expect([...set].sort()).toEqual(['a', 'b']);
  });

  it('zvýrazněné mají přednost před bližšími', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const set = selectLabelIds(ids, line(ids), cam, new Set(['d']), 2);
    expect(set.has('d')).toBe(true);    // zvýrazněný, i když nejdál
    expect(set.has('a')).toBe(true);    // zbytek rozpočtu doplní nejbližší
    expect(set.size).toBe(2);
  });

  it('rozpočet je tvrdý strop i pro zvýrazněné', () => {
    const ids = ['a', 'b', 'c'];
    const set = selectLabelIds(ids, line(ids), cam, new Set(ids), 2);
    expect(set.size).toBe(2);
  });

  it('budget 0 → prázdná množina', () => {
    expect(selectLabelIds(['a'], line(['a']), cam, null, 0).size).toBe(0);
  });

  it('graf menší než rozpočet → labely všech uzlů', () => {
    const ids = ['a', 'b'];
    expect(selectLabelIds(ids, line(ids), cam, null, 200).size).toBe(2);
  });
});
```

- [ ] **Step 3: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/labels.test.js`
Expected: FAIL — `../src/render/labels.js` neexistuje.

- [ ] **Step 4: Implementace labels.js**

Vytvoř `frontend/src/render/labels.js`:

```js
import { Text } from 'troika-three-text';
import { nodeStyle } from './style.js';

const FADE_SPEED = 6;     // 1/s – rychlost náběhu/zhasnutí opacity
const BASE_OFFSET = 5;    // světové jednotky nad uzlem při size = 1

/** Čistá funkce výběru labelů: všechny zvýrazněné (do rozpočtu),
 *  zbytek rozpočtu doplní uzly nejblíž kameře. ids+positions jsou
 *  z PhysicsEngine (stejné indexování), cameraPos je {x,y,z}. */
export function selectLabelIds(ids, positions, cameraPos, highlightSet, budget) {
  const selected = new Set();
  const candidates = [];
  const count = Math.min(ids.length, positions.length / 3);
  for (let i = 0; i < count; i += 1) {
    const id = ids[i];
    if (highlightSet !== null && highlightSet.has(id)) {
      if (selected.size < budget) selected.add(id);
      continue;
    }
    const dx = positions[i * 3] - cameraPos.x;
    const dy = positions[i * 3 + 1] - cameraPos.y;
    const dz = positions[i * 3 + 2] - cameraPos.z;
    candidates.push({ id, d2: dx * dx + dy * dy + dz * dz });
  }
  candidates.sort((a, b) => a.d2 - b.d2);
  for (const candidate of candidates) {
    if (selected.size >= budget) break;
    selected.add(candidate.id);
  }
  return selected;
}

/** Pool troika Textů: aktivní labely plynule fadují, text.sync() se volá
 *  jen při změně textu/stylu (layout je drahý). Billboard ke kameře
 *  funguje shodně v 2D (ortho) i 3D. */
export class LabelLayer {
  constructor(scene, store, engine) {
    this.scene = scene;
    this.store = store;
    this.engine = engine;
    this.active = new Map();   // id -> Text
    this.pool = [];            // volné Texty k recyklaci
    this.theme = null;         // nastaví applyTheme (volá Renderer)
    this.styleStamp = 0;       // verze stylu – změna tématu přestyluje aktivní
  }

  applyTheme(theme) {
    this.theme = theme;
    this.styleStamp += 1;
  }

  _styleText(text) {
    const { label } = this.theme;
    text.fontSize = label.size;
    text.color = label.color;
    text.outlineColor = label.halo;
    text.outlineWidth = label.size * 0.12;   // halo pro čitelnost nad hranami
    text.anchorX = 'center';
    text.anchorY = 'bottom';
    text.userData.styleStamp = this.styleStamp;
  }

  _acquire(id) {
    const text = this.pool.pop() ?? new Text();
    if (!text.parent) this.scene.add(text);
    text.visible = true;
    text.userData.opacity = 0;
    text.userData.text = null;     // vynutí sync při prvním přiřazení textu
    this.active.set(id, text);
    return text;
  }

  _release(id, text) {
    text.visible = false;
    this.active.delete(id);
    this.pool.push(text);
  }

  /** Volá Renderer každý snímek po _syncNodes.
   *  display = Map id -> THREE.Vector3 vyhlazených pozic. */
  update(dt, camera, highlightSet, display) {
    if (!this.theme) return;
    const budget = this.theme.label.budget ?? 200;
    const wanted = selectLabelIds(this.engine.ids, this.engine.positions,
      camera.position, highlightSet, budget);

    for (const id of wanted) {
      if (!this.active.has(id) && this.store.nodes.has(id)) this._acquire(id);
    }

    const fade = Math.min(1, dt * FADE_SPEED);
    for (const [id, text] of this.active) {
      const node = this.store.nodes.get(id);
      const pos = display.get(id);
      if (!node || !pos) {           // uzel zmizel – okamžitě uvolnit
        this._release(id, text);
        continue;
      }
      const target = wanted.has(id) ? 1 : 0;
      text.userData.opacity += (target - text.userData.opacity) * fade;
      if (target === 0 && text.userData.opacity < 0.02) {
        this._release(id, text);
        continue;
      }
      text.fillOpacity = text.userData.opacity;
      text.outlineOpacity = text.userData.opacity;

      const style = nodeStyle(node, this.store.nodeTypes, this.theme);
      text.position.set(pos.x, pos.y + BASE_OFFSET * style.size, pos.z);
      text.quaternion.copy(camera.quaternion);   // billboard – 2D i 3D

      const styleChanged = text.userData.styleStamp !== this.styleStamp;
      if (text.userData.text !== node.label || styleChanged) {
        if (styleChanged) this._styleText(text);
        text.text = node.label;
        text.userData.text = node.label;
        text.sync();                 // jen při změně textu/stylu
      }
    }
  }
}
```

- [ ] **Step 5: Ověřit zelené**

Run: `cd frontend && npx vitest run tests/labels.test.js`
Expected: PASS — 5 testů.

- [ ] **Step 6: Integrace do rendereru**

V `frontend/src/render/renderer.js`:

1. Přidej import:

```js
import { LabelLayer } from './labels.js';
```

2. V konstruktoru přidej těsně PŘED řádek `this.applyTheme(this.theme);`:

```js
    this.labels = new LabelLayer(this.scene, store, engine);
```

3. V `applyTheme` přidej na konec metody:

```js
    this.labels.applyTheme(theme);
```

4. V `_frame` přidej za `this._syncEdges();`:

```js
    this.labels.update(dt, this.camera, this.highlightSet, this.display);
```

- [ ] **Step 7: Všechny vitest zelené**

Run: `cd frontend && npx vitest run`
Expected: PASS — 9 souborů.

- [ ] **Step 8: Manuální ověření labelů**

```bash
cd frontend && npm run build && cd ..
python /tmp/vb-2b-shapes.py
```

Checklist:
- nad každým uzlem je popisek (graf je menší než rozpočet 200) s halo obrysem, drží se nad uzlem při pohybu fyziky i orbitu kamery;
- popisek většího uzlu (`b`, size 1.8) sedí výš nad tvarem než u koule;
- klik na uzel → labely zůstávají, zvýraznění funguje; klik do prázdna → fade je plynulý (žádné skokové zmizení při pohybu kamery);
- `python examples/quickstart2d.py` → labely fungují i v 2D (ortho), text směřuje na kameru.

- [ ] **Step 9: Commit**

```bash
git add frontend/package.json frontend/package-lock.json \
  frontend/src/render/labels.js frontend/tests/labels.test.js \
  frontend/src/render/renderer.js
git commit -m "feat: labely přes troika-three-text s LOD rozpočtem"
```

---

### Task 4: Téma `cyber` + bloom

**Files:**
- Modify: `frontend/src/themes/themes.js`, `frontend/tests/themes.test.js`, `frontend/src/render/renderer.js`

`cyber` = tmavé pozadí `#0a0e1a`, neonová paleta, emissive materiály uzlů, bloom přes `EffectComposer` + `RenderPass` + `UnrealBloomPass` z `three/addons` (žádná nová dependency). Composer se vytváří/ruší při `set_theme` za běhu a respektuje resize i pixelRatio. Když je bloom aktivní, render smyčka volá `composer.render()` místo `webgl.render()`.

- [ ] **Step 1: Failing test na téma cyber**

Do `frontend/tests/themes.test.js` přidej na konec `describe('resolveTheme', ...)` bloku:

```js
  it('cyber je vestavěné: tmavé pozadí a zapnutý bloom', () => {
    const theme = resolveTheme('cyber');
    expect(theme.background).toBe('#0a0e1a');
    expect(theme.bloom.enabled).toBe(true);
    expect(theme.palette.length).toBeGreaterThanOrEqual(8);
  });
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/themes.test.js`
Expected: FAIL — `resolveTheme('cyber')` loguje error a vrací modern (`background` je `#f4f5f7`).

- [ ] **Step 3: Definice cyber v themes.js**

V `frontend/src/themes/themes.js` přidej za definici `modern`:

```js
export const cyber = {
  background: '#0a0e1a',
  palette: ['#28d7fe', '#ff2a6d', '#05ffa1', '#b967ff', '#ffd166',
    '#01c8ee', '#ff6e27', '#e8f8ff'],
  node: {
    color: '#28d7fe', size: 1.0, shape: 'sphere',
    emissive: '#1b3a5c', emissiveIntensity: 1.2,   // jádro glow pro bloom
  },
  edge: { color: '#1f4f6e', opacity: 0.65 },
  lights: {
    ambient: { color: '#314466', intensity: 0.9 },
    directional: { color: '#9fd8ff', intensity: 1.4 },
  },
  label: { color: '#d7f4ff', size: 6, halo: '#0a0e1a', budget: 200 },
  detailBox: {
    '--vb-detail-bg': 'rgba(10,16,28,0.92)',
    '--vb-detail-fg': '#d7f4ff',
    '--vb-detail-key': '#5a7d9e',
    '--vb-detail-shadow': '0 0 18px rgba(40,215,254,0.35)',
    '--vb-status-bg': 'rgba(40,215,254,0.15)',
    '--vb-status-fg': '#d7f4ff',
  },
  bloom: { enabled: true, strength: 0.9, radius: 0.7, threshold: 0.15 },
};
```

a nahraď poslední řádek:

```js
export const THEMES = { modern, cyber };
```

- [ ] **Step 4: Ověřit zelené**

Run: `cd frontend && npx vitest run tests/themes.test.js`
Expected: PASS — 6 testů.

- [ ] **Step 5: Bloom v rendereru**

V `frontend/src/render/renderer.js`:

1. Přidej importy (pod stávající importy three):

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
```

2. V konstruktoru přidej hned za blok `this.meshes = new Map(); this._counts = new Map();`:

```js
    this.composer = null;       // EffectComposer, jen když je bloom aktivní
    this.bloomPass = null;
    this.bloomDisabled = false; // jednosměrná quality degradace (Task 5)
```

3. Na konec metody `applyTheme` přidej:

```js
    this._syncBloom();
```

4. Přidej novou metodu za `applyTheme`:

```js
  /** Vytvoří/zruší EffectComposer podle theme.bloom (a quality degradace).
   *  Volá se z applyTheme a každý snímek z _frame – kamera vzniká lazy
   *  až po init, composer na ni proto může čekat. */
  _syncBloom() {
    const want = Boolean(
      this.theme.bloom.enabled && !this.bloomDisabled && this.camera);
    if (want && !this.composer) {
      const size = new THREE.Vector2();
      this.webgl.getSize(size);
      this.composer = new EffectComposer(this.webgl);
      this.composer.setPixelRatio(this.webgl.getPixelRatio());
      this.composer.setSize(size.x, size.y);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(size.clone(),
        this.theme.bloom.strength, this.theme.bloom.radius,
        this.theme.bloom.threshold);
      this.composer.addPass(this.bloomPass);
    } else if (!want && this.composer) {
      this.bloomPass.dispose();
      this.composer.dispose();
      this.composer = null;
      this.bloomPass = null;
    } else if (this.composer) {
      this.bloomPass.strength = this.theme.bloom.strength;
      this.bloomPass.radius = this.theme.bloom.radius;
      this.bloomPass.threshold = this.theme.bloom.threshold;
    }
  }
```

5. V `_frame` nahraď řádek `this.webgl.render(this.scene, this.camera);`:

```js
    this._syncBloom();
    if (this.composer) this.composer.render();
    else this.webgl.render(this.scene, this.camera);
```

6. V `_onResize` přidej na konec metody (composer musí znát novou velikost):

```js
    this.composer?.setSize(
      this.container.clientWidth, this.container.clientHeight);
    this.bloomPass?.setSize(
      this.container.clientWidth, this.container.clientHeight);
```

- [ ] **Step 6: Všechny vitest zelené**

Run: `cd frontend && npx vitest run`
Expected: PASS — 9 souborů.

- [ ] **Step 7: Manuální ověření cyber + runtime přepnutí**

Vytvoř `/tmp/vb-2b-cyber.py`:

```python
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="cyber", theme="cyber")
canvas.define_type("server", shape="box", color="#28d7fe", size=1.4)
for i in range(8):
    canvas.add_node(f"n{i}", type="server" if i % 2 else None)
for i in range(7):
    canvas.add_edge(f"n{i}", f"n{i + 1}")


def prepinac():
    nazvy = ["modern", "cyber"]
    k = 0
    while True:
        time.sleep(6)
        k += 1
        canvas.set_theme(nazvy[k % 2])


threading.Thread(target=prepinac, daemon=True).start()
vb.serve(canvas, port=8080, open_browser=True)
```

```bash
cd frontend && npm run build && cd ..
python /tmp/vb-2b-cyber.py
```

Checklist:
- start: tmavé pozadí, neonové uzly se znatelným glow (bloom);
- po 6 s přepne na modern: světlé, ostré, bez bloomu — v konzoli `window.__viewbase.renderer.composer` → `null`;
- po dalších 6 s zpět cyber: bloom se znovu vytvoří (`composer` není null);
- změna velikosti okna v cyber režimu: obraz zůstává ostrý, glow se nedeformuje;
- `getComputedStyle(document.documentElement).getPropertyValue('--vb-detail-bg')` se mezi tématy mění.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/themes/themes.js frontend/tests/themes.test.js \
  frontend/src/render/renderer.js
git commit -m "feat: téma cyber s UnrealBloom post-processingem"
```

---

### Task 5: quality="auto"

**Files:**
- Create: `frontend/src/render/quality.js`
- Create: `frontend/tests/quality.test.js`
- Create: `python/tests/test_quality.py`
- Modify: `python/viewbase/canvas.py`, `frontend/src/render/renderer.js`, `frontend/src/main.js`

`Canvas(quality="low" | "high" | "auto")` → config (validace hodnot). Klient: `FpsWatchdog` (čistá třída s injektovaným časem) hlídá klouzavý průměr fps; pod 30 fps souvisle 3 s → degrade krok. Degradace jen jedním směrem: krok 1 vypne bloom, krok 2 sníží pixelRatio na 1. `"low"` = degradace hned při startu, `"high"` = nikdy.

- [ ] **Step 1: Failing vitest pro FpsWatchdog**

Vytvoř `frontend/tests/quality.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { FpsWatchdog } from '../src/render/quality.js';

/** Simuluj `seconds` sekund snímků s konstantním dt (injektovaný čas). */
function run(watchdog, dt, seconds) {
  for (let t = 0; t < seconds; t += dt) watchdog.frame(dt);
}

describe('FpsWatchdog', () => {
  it('60 fps nikdy nedegraduje', () => {
    const steps = [];
    const dog = new FpsWatchdog((s) => steps.push(s));
    run(dog, 1 / 60, 10);
    expect(steps).toEqual([]);
  });

  it('20 fps: degrade po 3 s, druhý krok po dalších 3 s, víc kroků není', () => {
    const steps = [];
    const dog = new FpsWatchdog((s) => steps.push(s));
    run(dog, 1 / 20, 2.5);
    expect(steps).toEqual([]);          // ještě neuběhly 3 s pod prahem
    run(dog, 1 / 20, 1);
    expect(steps).toEqual([1]);
    run(dog, 1 / 20, 3.5);
    expect(steps).toEqual([1, 2]);
    run(dog, 1 / 20, 10);
    expect(steps).toEqual([1, 2]);      // max 2 kroky, jen jedním směrem
  });

  it('krátké propady proložené zotavením nedegradují', () => {
    const steps = [];
    const dog = new FpsWatchdog((s) => steps.push(s));
    run(dog, 1 / 20, 2);    // 2 s pod prahem
    run(dog, 1 / 60, 5);    // zotavení – průměr i čítač se resetují
    run(dog, 1 / 20, 2);    // další 2 s – souvisle to nikdy nebyly 3 s
    expect(steps).toEqual([]);
  });

  it('dt <= 0 je no-op (první snímek po pauze)', () => {
    const steps = [];
    const dog = new FpsWatchdog((s) => steps.push(s));
    dog.frame(0);
    expect(steps).toEqual([]);
  });
});
```

- [ ] **Step 2: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/quality.test.js`
Expected: FAIL — `../src/render/quality.js` neexistuje.

- [ ] **Step 3: Implementace quality.js**

Vytvoř `frontend/src/render/quality.js`:

```js
const MAX_STEPS = 2;   // krok 1 = vypnout bloom, krok 2 = pixelRatio 1

/** Hlídač fps s injektovaným časem (čistě testovatelný – žádný
 *  performance.now). Drží klouzavý průměr fps; když je souvisle
 *  `holdSeconds` pod `threshold`, zavolá onDegrade(step).
 *  Degradace je jednosměrná a maximálně MAX_STEPS kroků. */
export class FpsWatchdog {
  constructor(onDegrade, { threshold = 30, holdSeconds = 3, smoothing = 2 } = {}) {
    this.onDegrade = onDegrade;
    this.threshold = threshold;
    this.holdSeconds = holdSeconds;
    this.smoothing = smoothing;   // 1/s – váha exponenciálního průměru
    this.avgFps = null;
    this.below = 0;               // souvislý čas pod prahem (s)
    this.steps = 0;               // počet provedených degradací
  }

  /** dt = délka snímku v sekundách. Volá render smyčka. */
  frame(dt) {
    if (dt <= 0 || this.steps >= MAX_STEPS) return;
    const fps = 1 / dt;
    this.avgFps = this.avgFps === null
      ? fps
      : this.avgFps + (fps - this.avgFps) * Math.min(1, dt * this.smoothing);
    if (this.avgFps < this.threshold) {
      this.below += dt;
      if (this.below >= this.holdSeconds) {
        this.below = 0;
        this.steps += 1;
        this.onDegrade(this.steps);
      }
    } else {
      this.below = 0;
    }
  }
}
```

- [ ] **Step 4: Ověřit zelené**

Run: `cd frontend && npx vitest run tests/quality.test.js`
Expected: PASS — 4 testy.

- [ ] **Step 5: Failing pytest pro parametr quality**

Vytvoř `python/tests/test_quality.py`:

```python
"""Validace parametru quality."""
import pytest

import viewbase as vb


def test_quality_default_auto():
    assert vb.Canvas().config["quality"] == "auto"


def test_quality_validni_hodnoty():
    for value in ("low", "high", "auto"):
        assert vb.Canvas(quality=value).config["quality"] == value


def test_quality_nevalidni_pada():
    with pytest.raises(ValueError):
        vb.Canvas(quality="ultra")
```

- [ ] **Step 6: Ověřit selhání**

Run: `python -m pytest python/tests/test_quality.py -q`
Expected: FAIL — `Canvas.__init__` parametr `quality` nezná (`TypeError`), resp. `config["quality"]` neexistuje (`KeyError`).

- [ ] **Step 7: Parametr quality v canvas.py**

V `python/viewbase/canvas.py` přidej pod `BUILTIN_THEMES`:

```python
QUALITIES = ("low", "high", "auto")
```

V `__init__` nahraď signaturu a config:

```python
    def __init__(self, *, title: str = "viewbase", dimensions: int = 3,
                 theme: Any = "modern", highlight_neighbors: int = 1,
                 quality: str = "auto"):
        if dimensions not in (2, 3):
            raise ValueError("dimensions musí být 2 nebo 3")
        if quality not in QUALITIES:
            raise ValueError(f"quality musí být jedno z {QUALITIES}")
        self.config = {
            "title": title,
            "dimensions": dimensions,
            "theme": _validated_theme(theme),
            "highlight_neighbors": highlight_neighbors,
            "quality": quality,
        }
```

- [ ] **Step 8: Ověřit zelené**

Run: `python -m pytest python/tests/test_quality.py -q`
Expected: PASS — 3 testy.

- [ ] **Step 9: Napojení v rendereru a main.js**

V `frontend/src/render/renderer.js`:

1. V konstruktoru přidej za řádek `this.bloomDisabled = false; ...`:

```js
    this.onFrame = null;        // hook pro FpsWatchdog (main.js, quality=auto)
```

2. V `_frame` přidej hned za `this.frameIndex += 1;`:

```js
    if (this.onFrame) this.onFrame(dt);
```

3. Přidej dvě metody za `_syncBloom`:

```js
  /** Quality degradace krok 1: jednosměrné vypnutí bloomu (set_theme
   *  na bloom téma už ho znovu nezapne). */
  disableBloom() {
    this.bloomDisabled = true;
    this._syncBloom();
  }

  /** Quality degradace krok 2: snížení pixel ratio (webgl i composer). */
  setPixelRatio(ratio) {
    this.webgl.setPixelRatio(ratio);
    this.composer?.setPixelRatio(ratio);
  }
```

V `frontend/src/main.js`:

4. Přidej import:

```js
import { FpsWatchdog } from './render/quality.js';
```

5. Do `bootstrap()` přidej za definici funkce `applyTheme(...)` (z Tasku 1):

```js
  const degrade = (step) => {
    if (step === 1) renderer.disableBloom();
    if (step === 2) renderer.setPixelRatio(1);
  };
  const watchdog = new FpsWatchdog(degrade);
```

6. Nahraď `store.subscribe(...)` blok (rozšíření verze z Tasku 1):

```js
  store.subscribe((event) => {
    if (event.kind !== 'init') return;
    applyTheme(store.config.theme);
    if (store.config.title) {
      document.title = `${store.config.title} – viewbase`;
    }
    const quality = store.config.quality ?? 'auto';
    if (quality === 'low') {
      degrade(1);                                  // hned a natrvalo
      degrade(2);
    } else if (quality === 'auto') {
      renderer.onFrame = (dt) => watchdog.frame(dt);
    }
    // 'high': žádný watchdog, nikdy nedegradovat
  });
```

7. Nahraď řádek `window.__viewbase = { store, engine, renderer, connection };`:

```js
  window.__viewbase = { store, engine, renderer, connection, watchdog };
```

- [ ] **Step 10: Všechny testy zelené**

Run: `cd frontend && npx vitest run && cd .. && python -m pytest python/tests -q`
Expected: PASS — 10 vitest souborů + celý pytest.

- [ ] **Step 11: Manuální ověření quality="low"**

V `/tmp/vb-2b-cyber.py` změň první řádek Canvasu na `canvas = vb.Canvas(title="cyber", theme="cyber", quality="low")`, pak:

```bash
cd frontend && npm run build && cd ..
python /tmp/vb-2b-cyber.py
```

Checklist: cyber téma BEZ bloomu (`window.__viewbase.renderer.composer` → `null` i v cyber), `window.__viewbase.renderer.webgl.getPixelRatio()` → `1`. Vrať pak skript na `quality` default.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/render/quality.js frontend/tests/quality.test.js \
  frontend/src/render/renderer.js frontend/src/main.js \
  python/viewbase/canvas.py python/tests/test_quality.py
git commit -m "feat: quality low/high/auto s fps watchdogem"
```

---

### Task 6: Úklid + spec-sync

**Files:**
- Create: `python/tests/test_close.py`
- Create: `frontend/tests/detail.test.js`
- Modify: `python/viewbase/canvas.py`, `python/viewbase/server.py`, `frontend/src/interact/detail.js`, `frontend/src/main.js`, `docs/superpowers/specs/2026-06-10-viewbase-library-design.md`

Tři nezávislé opravy: (a) `Canvas.close()` ukončí thread-pool (idempotentní) a `serve()` ho volá ve `finally` i po KeyboardInterrupt; (b) detail box se obnoví při `update_node` zobrazeného uzlu a schová při `remove_node`; (c) spec dokument se sladí s implementací eventů.

- [ ] **Step 1: Failing pytest na close**

Vytvoř `python/tests/test_close.py`:

```python
"""Úklid: Canvas.close a serve() finally."""
import pytest
import uvicorn

import viewbase as vb
from viewbase import server


def test_close_je_idempotentni_a_dispatch_je_pak_noop():
    canvas = vb.Canvas()
    calls = []
    canvas.on_click(lambda event: calls.append(event))
    canvas.close()
    canvas.close()                       # druhé volání nesmí spadnout
    canvas.dispatch_event("node_click", {"node_id": "a", "client_id": "c"})
    assert calls == []                   # po close je dispatch no-op


def test_serve_zavre_canvas_po_keyboard_interrupt(monkeypatch):
    canvas = vb.Canvas()

    def fake_run(*args, **kwargs):
        raise KeyboardInterrupt

    monkeypatch.setattr(uvicorn, "run", fake_run)
    with pytest.raises(KeyboardInterrupt):
        server.serve(canvas)
    assert canvas._closed is True        # close() proběhl ve finally
    canvas.close()                       # a zůstává idempotentní
```

- [ ] **Step 2: Ověřit selhání**

Run: `python -m pytest python/tests/test_close.py -q`
Expected: FAIL — `Canvas` nemá `close` (`AttributeError`).

- [ ] **Step 3: Implementace close + finally**

V `python/viewbase/canvas.py`:

1. V `__init__` přidej za řádek `self._actions: list[dict[str, Any]] = []`:

```python
        self._closed = False
```

2. V `dispatch_event` nahraď blok čtení handlerů:

```python
        with self._lock:
            if self._closed:
                return
            handlers = list(self._handlers.get(name, ()))
```

3. Přidej metodu za `dispatch_event`/`_run_handler` (sekce eventy):

```python
    def close(self) -> None:
        """Ukonči thread-pool handlerů. Idempotentní; další dispatch_event
        je no-op. Nečeká na běžící handlery (wait=False) a zruší zařazené
        čekající úlohy (cancel_futures=True)."""
        with self._lock:
            if self._closed:
                return
            self._closed = True
        self._executor.shutdown(wait=False, cancel_futures=True)
```

V `python/viewbase/server.py` nahraď v `serve()` poslední řádek `uvicorn.run(...)`:

```python
    try:
        uvicorn.run(app, host=host, port=port, log_level="warning")
    finally:
        canvas.close()   # i po KeyboardInterrupt – nenechat viset worker vlákna
```

- [ ] **Step 4: Ověřit zelené**

Run: `python -m pytest python/tests/test_close.py -q`
Expected: PASS — 2 testy. Pak `python -m pytest python/tests -q` → celý pytest zelený.

- [ ] **Step 5: Failing vitest na detailPatchAction**

Vytvoř `frontend/tests/detail.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { detailPatchAction } from '../src/interact/detail.js';

const patch = (over = {}) => ({
  add_nodes: [], update_nodes: [], remove_nodes: [],
  add_edges: [], remove_edges: [], ...over,
});

describe('detailPatchAction', () => {
  it('nic není zobrazeno → null', () => {
    expect(detailPatchAction(patch({ remove_nodes: ['a'] }), null)).toBe(null);
  });

  it('update zobrazeného uzlu → refresh', () => {
    expect(detailPatchAction(patch({ update_nodes: [{ id: 'a' }] }), 'a'))
      .toBe('refresh');
  });

  it('remove zobrazeného uzlu → hide (má přednost před update)', () => {
    expect(detailPatchAction(
      patch({ update_nodes: [{ id: 'a' }], remove_nodes: ['a'] }), 'a'))
      .toBe('hide');
  });

  it('patch jiných uzlů → null', () => {
    expect(detailPatchAction(
      patch({ update_nodes: [{ id: 'b' }], remove_nodes: ['c'] }), 'a'))
      .toBe(null);
  });
});
```

- [ ] **Step 6: Ověřit selhání**

Run: `cd frontend && npx vitest run tests/detail.test.js`
Expected: FAIL — `detailPatchAction` není exportovaná.

- [ ] **Step 7: Implementace v detail.js**

V `frontend/src/interact/detail.js`:

1. Přidej na začátek souboru (před třídu):

```js
/** Čistá logika: co má detail box udělat po patchi ze store.
 *  shownId = id právě zobrazeného uzlu (null = box je schovaný).
 *  Vrací 'hide' | 'refresh' | null. */
export function detailPatchAction(patch, shownId) {
  if (shownId == null) return null;
  if ((patch.remove_nodes ?? []).includes(shownId)) return 'hide';
  if ((patch.update_nodes ?? []).some((n) => n.id === shownId)) return 'refresh';
  return null;
}
```

2. Nahraď signaturu konstruktoru a přidej callback (zavření křížkem musí
main.js říct, že už nic nezobrazujeme):

```js
  constructor(container = document.body, { onHide = () => {} } = {}) {
    this.onHide = onHide;
```

(zbytek konstruktoru beze změny) a nahraď `hide()`:

```js
  hide() {
    this.el.style.display = 'none';
    this.onHide();
  }
```

- [ ] **Step 8: Ověřit zelené**

Run: `cd frontend && npx vitest run tests/detail.test.js`
Expected: PASS — 4 testy.

- [ ] **Step 9: Napojení v main.js**

V `frontend/src/main.js`:

1. Rozšiř import z detail.js:

```js
import { DetailBox, detailPatchAction } from './interact/detail.js';
```

2. Nahraď `const detail = new DetailBox();` a funkci `showDetail`:

```js
  let detailNodeId = null;   // id uzlu zobrazeného v detail boxu
  const detail = new DetailBox(document.body,
    { onHide: () => { detailNodeId = null; } });

  function showDetail(nodeId) {
    const node = store.nodes.get(nodeId);
    if (!node) return;
    detailNodeId = nodeId;
    detail.show({ label: node.label, meta: node.meta });
  }
```

3. Přidej nový subscribe (vedle stávajícího init subscribe):

```js
  store.subscribe((event) => {
    if (event.kind !== 'patch') return;
    const action = detailPatchAction(event.patch, detailNodeId);
    if (action === 'hide') detail.hide();
    else if (action === 'refresh') showDetail(detailNodeId);
  });
```

- [ ] **Step 10: Všechny testy zelené + commit**

Run: `cd frontend && npx vitest run && cd .. && python -m pytest python/tests -q`
Expected: PASS — 11 vitest souborů + celý pytest.

```bash
git add python/viewbase/canvas.py python/viewbase/server.py \
  python/tests/test_close.py frontend/src/interact/detail.js \
  frontend/tests/detail.test.js frontend/src/main.js
git commit -m "fix: Canvas.close ve finally serve a živý detail box"
```

- [ ] **Step 11: Spec-sync — oprava §5/§6**

V `docs/superpowers/specs/2026-06-10-viewbase-library-design.md` udělej dvě náhrady (event nemá `timestamp`, `client_id` ano; view_change nese `{position, target, zoom}`, ne `.rotation`):

Nahraď řádek:

```
def po_kliku(event):                          # event.node_id, .client_id, .timestamp
```

za:

```
def po_kliku(event):                          # event.node_id, .client_id
```

Nahraď řádek:

```
def pohled(event): ...                        # event.position, .rotation, .zoom
```

za:

```
def pohled(event): ...                        # event.position, .target, .zoom
```

Ověření: `grep -n "timestamp\|rotation" docs/superpowers/specs/2026-06-10-viewbase-library-design.md`
Expected: žádný výskyt.

- [ ] **Step 12: Commit spec**

```bash
git add docs/superpowers/specs/2026-06-10-viewbase-library-design.md
git commit -m "spec: sladění eventů s implementací"
```

---

### Task 7: Examples + E2E

**Files:**
- Create: `examples/showcase.py`
- Create (necommitované, mimo repo): `/tmp/vb-2b-verify/showcase_noopen.py`, `/tmp/vb-2b-verify/esthetics.mjs`
- `examples/quickstart.py` zůstává beze změny.

E2E driver podle vzoru `/tmp/vb-2a-verify/interact.mjs`. Klíčové know-how: TCP probe přes `node:net`, NIKOLI fetch (node 25 hází uncaught EINVAL); server se spouští přes `.venv/bin/python` daného checkoutu (worktree → nastav `VB_REPO`); introspekce přes `window.__viewbase`; screenshoty jako artefakty.

- [ ] **Step 1: examples/showcase.py**

Vytvoř `examples/showcase.py`:

```python
"""Showcase estetiky: téma cyber, typy uzlů s tvary a barvami,
živé update_node color, highlight_neighbors=2."""
import random
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="Showcase", theme="cyber", highlight_neighbors=2)
canvas.define_type("server", shape="box", color="#28d7fe", size=1.4)
canvas.define_type("db", shape="octahedron", color="#ff2a6d", size=1.6)
canvas.define_type("client", shape="sphere", color="#05ffa1", size=0.9)

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
```

Rychlá kontrola: `python -c "import ast; ast.parse(open('examples/showcase.py').read())"` → bez výstupu.

- [ ] **Step 2: Build frontendu do static**

Run: `cd frontend && npm run build && cd ..`
Expected: Vite build OK, výstup v `python/viewbase/static/` (outDir z vite.config.js).

- [ ] **Step 3: E2E pracovní adresář + Playwright**

```bash
mkdir -p /tmp/vb-2b-verify
cd /tmp/vb-2b-verify
npm init -y >/dev/null && npm install playwright
npx playwright install chromium
```

Expected: bez chyb (pokud existuje `/tmp/vb-2a-verify/node_modules`, lze místo instalace zkopírovat: `cp -R /tmp/vb-2a-verify/node_modules /tmp/vb-2b-verify/`).

- [ ] **Step 4: E2E server skript**

Vytvoř `/tmp/vb-2b-verify/showcase_noopen.py`:

```python
"""E2E server pro Plán 2b: start v modern, v t=8 s update_node color
na cl-0 a set_theme('cyber')."""
import threading
import time

import viewbase as vb

canvas = vb.Canvas(title="2b-verify", highlight_neighbors=2)   # quality default auto
canvas.define_type("server", shape="box", color="#28d7fe", size=1.4)
canvas.define_type("db", shape="octahedron", color="#ff2a6d", size=1.6)
canvas.define_type("client", shape="sphere", color="#05ffa1", size=0.9)

with canvas.batch():
    for i in range(3):
        canvas.add_node(f"srv-{i}", type="server", label="{name}",
                        name=f"Server {i}")
    canvas.add_node("db-0", type="db", label="{name}", name="Hlavni DB")
    for i in range(12):
        canvas.add_node(f"cl-{i}", type="client", label="{name}",
                        name=f"Klient {i}")
        canvas.add_edge(f"cl-{i}", f"srv-{i % 3}")
    for i in range(3):
        canvas.add_edge(f"srv-{i}", "db-0")


def scenar():
    time.sleep(8.0)
    canvas.update_node("cl-0", color="#ffd166")
    canvas.set_theme("cyber")


threading.Thread(target=scenar, daemon=True).start()
vb.serve(canvas, port=8080)
```

- [ ] **Step 5: E2E driver**

Vytvoř `/tmp/vb-2b-verify/esthetics.mjs`:

```js
// E2E ověření estetiky (Plán 2b): modern výchozí vzhled, tvary/barvy typů,
// labely zvýrazněných po kliku, runtime set_theme → cyber (bloom),
// quality="auto" na malém grafu nedegraduje.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

const REPO = process.env.VB_REPO ?? '/Users/j/Projects/viewBase';
const PY = `${REPO}/.venv/bin/python`;
const OUT = '/tmp/vb-2b-verify';
const SHOTS = '/tmp/vb-verify-2b';
const HOST = '127.0.0.1';
const PORT = 8080;
const URL = `http://${HOST}:${PORT}/`;

fs.mkdirSync(SHOTS, { recursive: true });
fs.writeFileSync(`${OUT}/server.log`, '');

const summary = { pageErrors: [], consoleErrors: [], checks: {} };

function startServer(script) {
  const proc = spawn(PY, ['-u', script],
    { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (d) => fs.appendFileSync(`${OUT}/server.log`, d));
  proc.stderr.on('data', (d) => fs.appendFileSync(`${OUT}/server.log`, d));
  return proc;
}

// TCP probe přes node:net – fetch/undici na node 25 hází uncaught EINVAL.
function probe() {
  return new Promise((resolve) => {
    const sock = net.connect({ port: PORT, host: HOST });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
  });
}

async function waitForServer(tries = 50) {
  for (let i = 0; i < tries; i += 1) {
    if (await probe()) return true;
    await sleep(200);
  }
  return false;
}

/** Promítne display pozici uzlu (index v engine.ids, nebo id) na obrazovku. */
async function nodeScreenPos(page, indexOrId) {
  return page.evaluate((key) => {
    const { renderer } = window.__viewbase;
    const id = typeof key === 'number' ? renderer.engine.ids[key] : key;
    if (!id) return null;
    const pos = renderer.display.get(id);
    if (!pos) return null;
    const projected = pos.clone().project(renderer.camera);
    const rect = renderer.webgl.domElement.getBoundingClientRect();
    return {
      id,
      x: rect.left + ((projected.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - projected.y) / 2) * rect.height,
    };
  }, indexOrId);
}

const server = startServer(`${OUT}/showcase_noopen.py`);
if (!(await waitForServer())) {
  console.log('FATAL: server nenastartoval, viz /tmp/vb-2b-verify/server.log');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => summary.pageErrors.push(String(e).slice(0, 300)));
page.on('console', (m) => {
  if (m.type() === 'error') summary.consoleErrors.push(m.text().slice(0, 300));
});

await page.goto(URL);
await sleep(5000);                       // init + usazení (scénář přepíná v t=8 s)

// --- 1. výchozí téma modern, bloom vypnutý ---
summary.checks.modern = await page.evaluate(() => {
  const { renderer } = window.__viewbase;
  return {
    background: renderer.scene.background.getHexString(),  // 'f4f5f7'
    bloomOff: renderer.composer === null,
    nodeCount: renderer.nodeCount(),                       // 16
  };
});

// --- 2. tvary a barvy typů (InstancedMesh per typ) ---
summary.checks.meshes = await page.evaluate(() => {
  const { renderer } = window.__viewbase;
  return [...renderer.meshes.entries()]
    .map(([key, m]) => [key, m.geometry.type, m.count]).sort();
});
// instanceColor je v lineárním prostoru: #ff2a6d → r≈1, g≈0.02, b≈0.15
summary.checks.dbColor = await page.evaluate(() => {
  const c = window.__viewbase.renderer.meshes.get('db').instanceColor.array;
  return { r: c[0], g: c[1], b: c[2] };
});
await page.screenshot({ path: `${SHOTS}/1-modern-tvary.png` });

// --- 3. klik na uzel → highlight (depth 2) → labely zvýrazněných ---
const highlightActive = () => page.evaluate(() => {
  const set = window.__viewbase.renderer.highlightSet;
  return set instanceof Set && set.size > 0;
});
for (let i = 0; i < 16 && !(await highlightActive()); i += 1) {
  const pt = await nodeScreenPos(page, i);
  if (!pt || pt.x < 5 || pt.y < 5 || pt.x > 1275 || pt.y > 795) continue;
  await page.mouse.click(pt.x, pt.y);
  await sleep(300);
}
await sleep(1200);                       // fade labelů + dolet kamery
summary.checks.labels = await page.evaluate(() => {
  const { renderer } = window.__viewbase;
  const { active } = renderer.labels;
  const set = renderer.highlightSet;
  const opacities = [...active.values()].map((t) => t.fillOpacity);
  return {
    highlighted: set ? set.size : 0,
    activeLabels: active.size,
    highlightedLabeled: set ? [...set].filter((id) => active.has(id)).length : 0,
    maxOpacity: Math.max(0, ...opacities),
  };
});
await page.screenshot({ path: `${SHOTS}/2-highlight-labely.png` });

// reset zvýraznění (klik do prázdného rohu), ať barvy nejsou ztlumené
await page.mouse.click(20, 780);
await sleep(300);

// --- 4. runtime set_theme → cyber (scénář serveru v t=8 s) ---
await sleep(6000);                       // celkem ~12.5 s od startu
summary.checks.cyber = await page.evaluate(() => {
  const { renderer } = window.__viewbase;
  return {
    background: renderer.scene.background.getHexString(),  // '0a0e1a'
    bloomOn: Boolean(renderer.composer),
    detailVar: getComputedStyle(document.documentElement)
      .getPropertyValue('--vb-detail-bg').trim(),
  };
});
// cl-0 dostal update_node color="#ffd166" → lineárně r≈1, g≈0.63, b≈0.13
summary.checks.updatedNodeColor = await page.evaluate(() => {
  const mesh = window.__viewbase.renderer.meshes.get('client');
  const slot = mesh.userData.ids.indexOf('cl-0');
  if (slot < 0) return null;
  const c = mesh.instanceColor.array;
  return { slot, r: c[slot * 3], g: c[slot * 3 + 1], b: c[slot * 3 + 2] };
});
await page.screenshot({ path: `${SHOTS}/3-cyber-bloom.png` });

// --- 5. quality="auto" na malém grafu nedegradovalo ---
summary.checks.quality = await page.evaluate(() => {
  const { watchdog, renderer, store } = window.__viewbase;
  return {
    quality: store.config.quality,        // 'auto'
    steps: watchdog.steps,                // 0
    bloomStillOn: Boolean(renderer.composer),
  };
});

await browser.close();
server.kill('SIGKILL');
console.log(JSON.stringify(summary, null, 1));
```

- [ ] **Step 6: Spuštění E2E**

```bash
cd /tmp/vb-2b-verify
VB_REPO=<kořen aktuálního checkoutu/worktree> node esthetics.mjs
```

Expected (JSON summary):
- `pageErrors: []`, `consoleErrors: []`;
- `modern.background: 'f4f5f7'`, `modern.bloomOff: true`, `modern.nodeCount: 16`;
- `meshes`: `[['client','SphereGeometry',12],['db','OctahedronGeometry',1],['server','BoxGeometry',3]]`;
- `dbColor`: `r > 0.9`, `g < 0.1`, `b < 0.3`;
- `labels`: `highlighted > 0`, `highlightedLabeled === highlighted`, `activeLabels === 16` (graf < rozpočet 200), `maxOpacity > 0.5`;
- `cyber.background: '0a0e1a'`, `cyber.bloomOn: true`, `cyber.detailVar: 'rgba(10,16,28,0.92)'`;
- `updatedNodeColor`: `r > 0.9`, `g > 0.4`, `b < 0.3`;
- `quality`: `{ quality: 'auto', steps: 0, bloomStillOn: true }`.

- [ ] **Step 7: Vizuální kontrola screenshotů**

Prohlédni `/tmp/vb-verify-2b/1-modern-tvary.png` (světlé, tvary, barvy typů, labely), `2-highlight-labely.png` (ztlumené ne-sousedy, labely zvýrazněných), `3-cyber-bloom.png` (tmavé pozadí, neonový glow). Pokud něco nesedí, oprav před commitem.

- [ ] **Step 8: Kompletní testy zelené**

Run: `cd frontend && npx vitest run && cd .. && python -m pytest python/tests -q`
Expected: PASS — 11 vitest souborů, celý pytest, žádný skip/fail.

- [ ] **Step 9: Závěrečný commit**

```bash
git add examples/showcase.py
git commit -m "feat: showcase příklad estetiky (cyber, typy, živé barvy)"
```

---

## Coverage: spec ↔ plán

| Spec | Požadavek | Pokrytí |
|---|---|---|
| §5 | `Canvas(theme=...)` — vestavěné jméno nebo dict, validace `ValueError` | T1 |
| §5 | `define_type(shape/color/size)` → vzhled uzlu | T2 |
| §5 | `define_type(model=...)` — GLB modely | **Plán 3** (klíč se zatím ignoruje, tvar spadne na default) |
| §5 | `update_node(color=...)` mění vzhled za běhu | T2 + T7 (showcase) |
| §5 | Toky: `define_flow_type`, `flow`, `stop_flow`, multi-hop | **Plán 3** |
| §5 | Kategorická paleta pro typy toků | T1 definuje `palette` (≥8 barev), použití u toků v **Plánu 3** |
| §5/§6 | Eventy bez `timestamp`, view_change `{position,target,zoom}` | T6 (spec-sync) |
| §7 | InstancedMesh per typ uzlu, barva/velikost per-instance | T2 |
| §7 | Labely: troika SDF, LOD (zvýrazněné + nejbližší, rozpočet 200, fade) | T3 (`config.label_budget` později — zatím `theme.label.budget`) |
| §7 | Toky — instancované částice | **Plán 3** |
| §7 | Detail box: CSS z tématu | T1; živý refresh/hide T6 |
| §8 | Témata `modern` + `cyber`, dict merge přes základ | T1 + T4 |
| §8 | Post-processing (bloom) řízený tématem | T4 |
| §8 | Pozadí/mlha — mlha (fog) | **Plán 3** (čistě výtvarné rozšíření theme objektu) |
| §8 | Hrany: shader s glow pro efektní témata | **Plán 3** (v1 stačí barva+opacity z tématu) |
| §8 | `quality="low"/"high"/"auto"` (auto: vypnout bloom, snížit pixel ratio) | T5 |
| §9 | Výjimky handlerů logovat, server běží dál | hotovo (Plán 2a); close úklid T6 |
| §11 | `examples/quickstart.py` | beze změny |
| §11 | `examples/wireshark/` (pcap_replay, live_capture) | **Plán 3** (potřebuje toky) |
| §12 | Wheel se zabalenými assety, CI | **Plán 3** |
| §12 (mimo v1) | Binární protokol, WASM fyzika, Jupyter, art-deco/steampunk | v2+ (mimo plány) |

**Co zbývá do Plánu 3:** toky/flow + typy toků (Python API, protokol, instancované glow částice interpolované po hranách, trvalé toky v initu), wireshark příklady (pcap_replay + live_capture + README), GLB modely typů uzlů, mlha a edge-glow v tématech, `config.label_budget`, wheel se zabalenými assety + CI, případná příprava binárního protokolu.
