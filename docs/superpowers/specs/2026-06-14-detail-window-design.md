# viewbase — detailní okno (Amiga Workbench styl)

Datum: 2026-06-14
Stav: schváleno v brainstormingu, čeká na implementační plán

## 1. Cíl

Povýšit dnešní jednoduchý `DetailBox` na plnohodnotný **window manager** ve
stylu Amiga Workbench: po kliknutí na uzel se otevře tažitelné okno
s identifikací uzlu a vybranými klíči/hodnotami. Okno lze zavřít,
minimalizovat (sedne do doku vlevo dole) a obnovit na původní pozici
a rozměr. Klik na hodnotu uvnitř okna ji zkopíruje do schránky.

Vše je rozděleno na **knihovní prostředek** (generický window manager + Python
konfigurační API) a **konkrétní vizualizaci** (wireshark příklad zobrazující
klíče FQDN a IP). Forma knihovny zůstává zachována — manager neví nic
o paketech ani FQDN.

## 2. Výchozí stav

`frontend/src/interact/detail.js` obsahuje `DetailBox`: fixní overlay vpravo
nahoře s titulkem (`label`) a tabulkou metadat, zavíracím křížkem, čtením CSS
proměnných z tématu (`--vb-detail-*`) a čistou funkcí `detailPatchAction`
(`hide` | `refresh` | null) pro živé aktualizace jednoho zobrazeného uzlu.
Serverová akce `show_detail(node_id)` (z Plánu 2a) box otevírá; klik na uzel
v `main.js` dnes volá lokální highlight + focus + `show_detail`.

Tento návrh `DetailBox` **nahrazuje** novým `WindowManager`.

## 3. Rozhodnutí (z brainstormingu)

| Otázka | Rozhodnutí |
|---|---|
| Počet oken | Více oken (Workbench); každý uzel má vlastní okno, minimalizovaná do doku |
| Základ | Vlastní `WindowManager` modul, žádná nová runtime závislost |
| Klik na uzel | Jen otevře okno (žádné kopírování) |
| Kopírování | Klik na **hodnotovou buňku** uvnitř okna zkopíruje **hodnotu** do schránky |
| Konfigurace klíčů | Vývojář deklaruje řádky `(popisek, meta_klíč)`; bez konfigurace = všechna meta |

## 4. Architektura — tři vrstvy

### 4.1 Knihovní prostředek — frontend

Nový `frontend/src/render/windows.js`:

- **`WindowManager`** spravuje kolekci `DetailWindow` instancí nad canvasem
  (jeden HTML overlay kontejner). Generický: zná jen `klíč → hodnota` řádky,
  titulek, gadgety, dok, z-order, clipboard a CSS proměnné tématu. **Neví nic**
  o doméně (FQDN/IP/pakety).
- **`DetailWindow`** = jedno okno: záhlaví s gadgety + tělo s řádky.

Manager nahrazuje `DetailBox`; soubor `frontend/src/interact/detail.js` se
odstraní (jeho čistá funkce `detailPatchAction` se zobecní a přesune do
`windows.js`).

### 4.2 Knihovní prostředek — Python API

`Canvas` dostane metodu:

```python
canvas.detail_window(
    rows=[("FQDN", "fqdn"), ("IP", "ip")],   # (popisek, meta_klíč); None = všechna meta
    width_chars=128,                          # šířka v znacích (default okna)
    open_on_click=True,                       # klik na uzel otevře okno
)
```

- Konfigurace se uloží do `config` a tím odejde v `init` zprávě klientovi.
- `rows=None` → okno zobrazí všechna meta uzlu (zero-config).
- `width_chars` určuje výchozí šířku těla (monospace, počet znaků).
- `open_on_click=False` vypne automatické otevření při kliknutí (okno pak jen
  přes serverovou akci `show_detail`).

Validace: `width_chars` kladné celé číslo; `rows` buď None nebo seznam dvojic
řetězců — jinak `ValueError`.

### 4.3 Konkrétní vizualizace — wireshark příklad

- `make_resolver` v `pcap_replay.py` bude kromě popisku `name = "FQDN [ip]"`
  ukládat i samostatná meta `fqdn` a `ip` (přes `update_node(name=..., fqdn=...)`).
  Pro nerozlišené (privátní) uzly zůstane `fqdn` prázdné a `ip` = adresa.
- `build_canvas` v `pcap_replay.py` i `live_capture.py` zavolá
  `canvas.detail_window(rows=[("FQDN", "fqdn"), ("IP", "ip")], width_chars=128)`.
- Klik na host uzel → okno s titulkem `dns.google [8.8.8.8]`, řádky
  `FQDN: dns.google` a `IP: 8.8.8.8`; klik na hodnotu ji zkopíruje.

## 5. Chování okna (Amiga Workbench)

### 5.1 Záhlaví a gadgety

- **Běžné okno:** vlevo gadget **zavřít** `[X]`, vpravo **minimalizovat** `[_]`.
- **Minimalizovaný proužek:** vlevo **zavřít** `[X]`, vpravo **obnovit** `[▢]`
  (viz §5.4).
- Uprostřed záhlaví text titulku = popisek uzlu (`label`, např. `FQDN [ip]`).

### 5.2 Táhnutí

- Uchopení záhlaví (pointer events) přesouvá okno; pozice je clampnutá tak, aby
  záhlaví zůstalo uvnitř canvasu.

### 5.3 Tělo

- Monospace font; šířka dimenzovaná na `width_chars` znaků (default 128).
- Řádky `KLÍČ:  hodnota` podle šablony `rows` (nebo všechna meta).
- **Hodnotová buňka je klikatelná** → `navigator.clipboard.writeText(value)`
  + krátký vizuální blik/toast „zkopírováno". Popisek klíče klikatelný není.

### 5.4 Minimalizace, dok, obnova

- Minimalizace smrskne okno na proužek jen se záhlavím a posadí ho do **doku
  na levé dolní hraně canvasu**; minimalizovaná okna se řadí zleva doprava
  v pořadí minimalizace.
- Na minimalizovaném proužku jsou gadgety **zavřít** `[X]` a **obnovit** `[▢]`.
- Obnova vrátí okno na **původní pozici a rozměr** (uložené při minimalizaci).

### 5.5 Více oken a z-order

- Každý kliknutý uzel dostane vlastní okno. Pokud okno pro daný uzel už
  existuje, jen se zvedne navrch (a případně obnoví z minimalizace).
- Klik kamkoli do okna ho dá do popředí (zvýší z-index nad ostatní).

## 6. Datový tok

- **Klik na uzel** (`open_on_click=True`) → `windowManager.openFor(nodeId)`
  lokálně a okamžitě (bez serveru). Highlight a focus z 2a zůstávají.
- **Serverová akce `show_detail(node_id)`** → totéž `openFor(nodeId)`
  (symetrie ↑ event / ↓ akce zachována).
- **Živé `update_node`**: `windowManager.onPatch(patch)` projde otevřená okna
  (klíčovaná podle id uzlu) a ta dotčená `update_nodes` překreslí, ta dotčená
  `remove_nodes` zavře. Když resolver doplní `fqdn`, otevřené okno se
  aktualizuje a titulek se přepíše na nový popisek.
- Klik na hodnotu → zápis do schránky (`navigator.clipboard`).

## 7. Frontend struktura a téma

- **`frontend/src/render/windows.js`**: `WindowManager` + `DetailWindow` +
  čisté funkce: `buildRows(node, rowsTemplate)` (meta + šablona → pole
  `{label, value}`), `dockLayout(index, …)` (pozice minimalizovaného okna),
  `clampToCanvas(x, y, w, h, bounds)`, `windowsToRefresh(patch, openIds)`
  (zobecnění `detailPatchAction` na více oken).
- **`main.js`**: node-click → `windowManager.openFor`; `show_detail` akce →
  totéž; patch subscribe → `windowManager.onPatch`. Odstranění `DetailBox`.
- **Téma**: chrome okna čte `--vb-*` proměnné; do `themes.js` (modern + cyber)
  přidat blok `window` (barvy záhlaví, gadgetů, těla, doku; modern decentní,
  cyber neon/retro tak, aby ladil s bloomem). Reset `quality`/bloom okno
  neovlivňuje (okno je HTML overlay, ne WebGL).

## 8. Zacházení s chybami

- Python: validace `detail_window` argumentů (viz §4.2) → `ValueError`.
- Klient: chybějící meta klíč v šabloně → řádek s prázdnou hodnotou (žádný pád).
- `navigator.clipboard` nedostupná (nezabezpečený kontext) → tichý fallback
  (`document.execCommand('copy')` nebo jen blik bez kopie) + varování v konzoli.
- Okno pro neexistující uzel (`openFor` na neznámé id) → no-op.

## 9. Testování

- **vitest** (čistá logika): `buildRows` (šablona, prázdná hodnota, all-meta),
  `dockLayout` (pozice pro index 0..n), `clampToCanvas` (uvnitř/u hrany),
  `windowsToRefresh` (update/remove napříč více otevřenými okny).
- **Python (pytest)**: `detail_window` ukládá config; validace argumentů;
  config je v `snapshot()`/`init`.
- **E2E (Playwright)**: klik na uzel otevře okno; táhnutí přesune; minimalizace
  → dok vlevo dole; obnova vrátí pozici/rozměr; klik na hodnotu → ověření
  `navigator.clipboard.readText()`; dvě okna naráz + z-order.

## 10. Rozsah

**Uvnitř:** WindowManager + DetailWindow, Python `detail_window` API,
gadgety (zavřít/minimalizovat/zoom-obnovit), táhnutí, dok vlevo dole, obnova,
128znaková default šířka, klik-na-hodnotu → clipboard, živé aktualizace oken,
téma `window` v modern + cyber, wireshark příklad s FQDN/IP řádky, vitest +
pytest + E2E.

**Venku (možná později):** změna velikosti okna tažením za roh, runtime
přidávání/odebírání klíčů přímo v UI okna, ukotvení/snap oken, perzistence
rozložení oken, klávesové zkratky pro okna.
