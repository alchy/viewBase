"""Canvas – zdroj pravdy grafu a veřejné API knihovny."""
from __future__ import annotations

import logging
import re
import threading
import types
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from typing import Any, Callable, Iterator

from .controls import ControlWindow, validate_values

logger = logging.getLogger("viewbase")

_LABEL_KEY = re.compile(r"\{([^{}]+)\}")

BUILTIN_THEMES = ("modern", "cyber")
QUALITIES = ("low", "high", "auto")


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


def _edge_key(source: str, target: str) -> tuple[str, str]:
    """Neorientovaná hrana má kanonický klíč: lexikograficky seřazenou dvojici."""
    return (source, target) if source <= target else (target, source)


class Canvas:
    """Thread-safe model grafu. Mutace se hromadí jako delty pro server."""

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
            "detail_window": {
                "rows": None, "width_chars": 42, "open_on_click": True},
            "edge_style": {"style": "line", "elasticity": 0.0},
        }
        self._lock = threading.RLock()
        self._nodes: dict[str, dict[str, Any]] = {}
        self._edges: dict[tuple[str, str], dict[str, Any]] = {}
        self._node_types: dict[str, dict[str, Any]] = {}
        self._flow_types: dict[str, dict[str, Any]] = {}
        self._flows: dict[str, dict[str, Any]] = {}   # flow_id -> trvalý tok (do init)
        self._windows: dict[str, ControlWindow] = {}
        self._window_callbacks: dict[str, Any] = {}
        self._seq = 0
        self._batch_depth = 0
        self._pending = self._empty_pending()
        self._handlers: dict[str, list[Callable[[Any], None]]] = {}
        self._executor = ThreadPoolExecutor(
            max_workers=4, thread_name_prefix="viewbase-handler")
        self._actions: list[dict[str, Any]] = []
        self._closed = False
        self._node_label_template: str | None = None
        self._tasks: list[dict[str, Any]] = []      # every() úlohy
        self._tasks_stop: threading.Event | None = None   # None = neběží
        self._register("window_submit", self._on_window_submit)

    @staticmethod
    def _empty_pending() -> dict[str, dict]:
        return {
            "add_nodes": {},      # id -> payload
            "update_nodes": {},   # id -> payload
            "remove_nodes": {},   # id -> True
            "add_edges": {},      # key -> payload
            "remove_edges": {},   # key -> True
        }

    def detail_window(self, rows: list[tuple[str, str]] | None = None,
                      width_chars: int = 42, open_on_click: bool = True) -> None:
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

    # ---- typy ----------------------------------------------------------

    def node_label(self, template: str | None) -> None:
        """Nastav celocanvasovou šablonu popisku uzlu, sestavenou z meta klíčů –
        např. ``"{fqdn} [{ip}]"``. Použije se u uzlů bez explicitního ``label=``
        v ``add_node``; přepočítá se při každé změně metadat (``update_node``).
        Pořadí priorit popisku: per-node ``label`` > ``node_label`` > id uzlu.
        ``None`` vrátí výchozí chování (popisek = id)."""
        if template is not None and not isinstance(template, str):
            raise ValueError("node_label musí být řetězec nebo None")
        with self._lock:
            self._node_label_template = template

    def define_type(self, name: str, **style: Any) -> None:
        """Definuj typ uzlu. V Plánu 1 se propaguje jen přes init (volat před serve)."""
        with self._lock:
            self._node_types[name] = dict(style)

    def define_flow_type(self, name: str, *, color: str | None = None,
                         size: float = 1.0, speed: float = 1.0) -> None:
        """Definuj typ toku (jako typ uzlu). Bez `color` dostane tok barvu
        z kategorické palety aktivního tématu (řeší klient podle indexu typu)."""
        with self._lock:
            self._flow_types[name] = {
                "color": color, "size": float(size), "speed": float(speed)}

    def _flow_type_index(self, name: str | None) -> int | None:
        """Index typu v pořadí registrace (pro výběr barvy z palety na klientu)."""
        if name is None:
            return None
        return list(self._flow_types).index(name)

    def _resolve_flow_path(self, source: str | None, target: str | None,
                           path: list[str] | None) -> list[str]:
        """Sestav a zvaliduj cestu toku: každá sousední dvojice musí být
        existující hrana, každý uzel musí existovat. Vrátí cestu (>=2 uzly)."""
        if path is not None:
            resolved = list(path)
        elif source is not None and target is not None:
            resolved = [source, target]
        else:
            raise ValueError(
                "flow vyzaduje bud (source, target), nebo path=[...]")
        if len(resolved) < 2:
            raise ValueError("flow path musi mit aspon 2 uzly")
        for node_id in resolved:
            if node_id not in self._nodes:
                raise ValueError(f"flow: uzel '{node_id}' neexistuje")
        for a, b in zip(resolved, resolved[1:]):
            if _edge_key(a, b) not in self._edges:
                raise ValueError(
                    f"flow: hrana {a}-{b} neexistuje - tok jede jen po hranach")
        return resolved

    def flow(self, source: str | None = None, target: str | None = None, *,
             path: list[str] | None = None, type: str | None = None,
             count: int | None = 1, interval: float = 0.2, speed: float = 1.0,
             color: str | None = None, size: float | None = None) -> str | None:
        """Vysli tok castic po hrane/ceste (source -> target nebo path=[...]).

        `count=N` je jednorazovy (fire-and-forget; server tok neudrzi, vraci
        None). `count=None` je trvaly: vraci `flow_id`, tok je v `init` a prezije
        reconnect; zastaves ho `stop_flow(flow_id)`. `interval` je rozestup castic
        v sekundach, `speed` nasobek vychozi rychlosti tematu."""
        with self._lock:
            if type is not None and type not in self._flow_types:
                raise ValueError(
                    f"Neznam typ toku '{type}' - nejdriv define_flow_type")
            resolved = self._resolve_flow_path(source, target, path)
            payload = {
                "action": "flow",
                "path": resolved,
                "flow_type": type,
                "type_index": self._flow_type_index(type),
                "count": count,
                "interval": float(interval),
                "speed": float(speed),
                "color": color,
                "size": size,
            }
            if count is None:
                flow_id = uuid.uuid4().hex[:8]
                payload["flow_id"] = flow_id
                self._flows[flow_id] = {k: v for k, v in payload.items()
                                        if k != "action"}
                self._actions.append(payload)
                return flow_id
            self._actions.append(payload)
            return None

    def stop_flow(self, flow_id: str) -> None:
        """Zastav trvaly tok: odeber ho ze stavu a zarad akci stop_flow."""
        with self._lock:
            if flow_id not in self._flows:
                raise ValueError(f"Trvaly tok '{flow_id}' neexistuje")
            del self._flows[flow_id]
            self._actions.append({"action": "stop_flow", "flow_id": flow_id})

    # ---- control okna -------------------------------------------------

    def open_window(self, window: ControlWindow, *, on_submit=None) -> str:
        """Otevři/nahraď parametrické okno: ulož do stavu (pro init replay) a
        zařaď akci open_window. on_submit dostane event s validovanými values.
        Pozor: při nahrazení okna stejného window_id bez on_submit se předchozí
        callback zruší – chceš-li ho zachovat, předej on_submit znovu."""
        with self._lock:
            self._windows[window.window_id] = window
            if on_submit is not None:
                self._window_callbacks[window.window_id] = on_submit
            else:
                self._window_callbacks.pop(window.window_id, None)
            self._actions.append({**window.spec(), "action": "open_window"})
        return window.window_id

    def close_window(self, window_id: str) -> None:
        """Zavři okno: odeber ze stavu a zařaď akci close_window."""
        with self._lock:
            if self._windows.pop(window_id, None) is None:
                raise ValueError(f"Okno '{window_id}' neexistuje")
            self._window_callbacks.pop(window_id, None)
            self._actions.append(
                {"action": "close_window", "window_id": window_id})

    def set_edge_style(self, style: str, elasticity: float = 0.0) -> None:
        """Nastav vykreslení hran: 'line' nebo 'spline', elasticity 0..1.
        Uloží do config (pro init) a zařadí akci set_edge_style."""
        if style not in ("line", "spline"):
            raise ValueError("style musí být 'line' nebo 'spline'")
        elasticity = max(0.0, min(1.0, float(elasticity)))
        with self._lock:
            self.config["edge_style"] = {"style": style,
                                         "elasticity": elasticity}
            self._actions.append({"action": "set_edge_style", "style": style,
                                  "elasticity": elasticity})

    def _on_window_submit(self, event) -> None:
        """Interní handler eventu window_submit: validuj values proti specu
        okna, ulož je (pro init replay) a zavolej callback okna."""
        window_id = getattr(event, "window_id", None)
        raw = getattr(event, "values", None)
        if not isinstance(raw, dict):
            return
        with self._lock:
            window = self._windows.get(window_id)
            if window is None:
                return
            clean = validate_values(window.spec()["fields"], raw)
            window.apply(clean)
            callback = self._window_callbacks.get(window_id)
        if callback is not None:
            event.values = clean
            callback(event)

    # ---- uzly ----------------------------------------------------------

    def add_node(self, node_id: str, *, type: str | None = None,
                 label: str | None = None, **meta: Any) -> None:
        with self._lock:
            if node_id in self._nodes:
                raise ValueError(f"Uzel '{node_id}' už existuje")
            if type is not None and type not in self._node_types:
                raise ValueError(
                    f"Neznámý typ uzlu '{type}' – nejdřív zavolej define_type")
            node = {"id": node_id, "type": type,
                    "label_template": label, "meta": dict(meta)}
            self._nodes[node_id] = node
            self._pending["add_nodes"][node_id] = self._public_node(node)

    def ensure_node(self, node_id: str, *, type: str | None = None,
                    label: str | None = None, **meta: Any) -> None:
        """Idempotentní add_node: neexistující uzel založí, existujícímu
        sloučí meta (patch odejde jen při reálné změně). type/label
        existujícího uzlu měnit neumí (viz update_node / Plán 2b) –
        odlišná hodnota je chyba, shodná nebo nezadaná je no-op."""
        with self._lock:
            node = self._nodes.get(node_id)
            if node is None:
                self.add_node(node_id, type=type, label=label, **meta)
                return
            if type is not None and type != node["type"]:
                raise ValueError(
                    f"ensure_node: uzel '{node_id}' má typ {node['type']!r},"
                    f" změna na {type!r} přijde až v Plánu 2b")
            if label is not None and label != node["label_template"]:
                raise ValueError(
                    f"ensure_node: uzel '{node_id}' má jinou label šablonu –"
                    " změna přijde až v Plánu 2b")
            merged = {**node["meta"], **meta}
            if merged == node["meta"]:
                return
            node["meta"] = merged
            payload = self._public_node(node)
            if node_id in self._pending["add_nodes"]:
                self._pending["add_nodes"][node_id] = payload
            else:
                self._pending["update_nodes"][node_id] = payload

    def update_node(self, node_id: str, **meta: Any) -> None:
        with self._lock:
            if node_id not in self._nodes:
                raise ValueError(f"Uzel '{node_id}' neexistuje")
            for reserved in ("label", "type"):
                if reserved in meta:
                    raise ValueError(
                        f"update_node neumí měnit '{reserved}' – label šablona"
                        " a typ se zadávají v add_node (změna za běhu přijde"
                        " v Plánu 2b)")
            node = self._nodes[node_id]
            node["meta"].update(meta)
            payload = self._public_node(node)
            if node_id in self._pending["add_nodes"]:
                self._pending["add_nodes"][node_id] = payload
            else:
                self._pending["update_nodes"][node_id] = payload

    def remove_node(self, node_id: str) -> None:
        with self._lock:
            if node_id not in self._nodes:
                raise ValueError(f"Uzel '{node_id}' neexistuje")
            for key in [k for k in self._edges if node_id in k]:
                self._remove_edge_locked(key)
            del self._nodes[node_id]
            self._pending["update_nodes"].pop(node_id, None)
            if self._pending["add_nodes"].pop(node_id, None) is None:
                self._pending["remove_nodes"][node_id] = True

    # ---- hrany ---------------------------------------------------------

    def add_edge(self, source: str, target: str, **meta: Any) -> None:
        with self._lock:
            if source not in self._nodes or target not in self._nodes:
                raise ValueError(
                    f"Hrana {source}–{target}: oba uzly musí existovat")
            if source == target:
                raise ValueError("Hrana nesmí vést z uzlu do něj samého")
            key = _edge_key(source, target)
            if key in self._edges:
                raise ValueError(f"Hrana {key[0]}–{key[1]} už existuje")
            edge = {"source": key[0], "target": key[1], "meta": dict(meta)}
            self._edges[key] = edge
            self._pending["add_edges"][key] = self._public_edge(edge)

    def ensure_edge(self, source: str, target: str, **meta: Any) -> None:
        """Idempotentní add_edge: neexistující hranu založí, existující
        sloučí meta (patch jen při reálné změně; klient add_edges
        upsertuje)."""
        with self._lock:
            edge = self._edges.get(_edge_key(source, target))
            if edge is None:
                self.add_edge(source, target, **meta)
                return
            merged = {**edge["meta"], **meta}
            if merged == edge["meta"]:
                return
            edge["meta"] = merged
            key = _edge_key(source, target)
            self._pending["add_edges"][key] = self._public_edge(edge)

    def remove_edge(self, source: str, target: str) -> None:
        with self._lock:
            key = _edge_key(source, target)
            if key not in self._edges:
                raise ValueError(f"Hrana {source}–{target} neexistuje")
            self._remove_edge_locked(key)

    def _remove_edge_locked(self, key: tuple[str, str]) -> None:
        del self._edges[key]
        if self._pending["add_edges"].pop(key, None) is None:
            self._pending["remove_edges"][key] = True
        self._invalidate_flows_locked(key)

    def _invalidate_flows_locked(self, edge_key: tuple[str, str]) -> None:
        """Zruš trvalé toky, jejichž cesta vede přes odstraněnou hranu.
        Pokrývá i remove_node – kaskáda maže všechny hrany uzlu a každá
        cesta přes uzel některou z nich používá. Bez invalidace by stale
        tok zůstal v initu navždy a klient by mu hromadil částice."""
        doomed = [fid for fid, f in self._flows.items()
                  if any(_edge_key(a, b) == edge_key
                         for a, b in zip(f["path"], f["path"][1:]))]
        for fid in doomed:
            del self._flows[fid]
            self._actions.append({"action": "stop_flow", "flow_id": fid})

    # ---- čtení ---------------------------------------------------------

    def has_node(self, node_id: str) -> bool:
        with self._lock:
            return node_id in self._nodes

    def has_edge(self, source: str, target: str) -> bool:
        with self._lock:
            return _edge_key(source, target) in self._edges

    def node(self, node_id: str) -> dict[str, Any] | None:
        """Veřejná kopie uzlu {'id','type','label','meta'} s vyrenderovaným
        popiskem; None když neexistuje. Mutace návratu stav neovlivní."""
        with self._lock:
            node = self._nodes.get(node_id)
            return self._public_node(node) if node else None

    def edge(self, source: str, target: str) -> dict[str, Any] | None:
        """Veřejná kopie hrany {'source','target','meta'} (neorientovaně);
        None když neexistuje."""
        with self._lock:
            edge = self._edges.get(_edge_key(source, target))
            return self._public_edge(edge) if edge else None

    @property
    def nodes(self) -> list[dict[str, Any]]:
        """Kopie všech uzlů (jako v snapshot); pořadí = pořadí přidání."""
        with self._lock:
            return [self._public_node(n) for n in self._nodes.values()]

    @property
    def edges(self) -> list[dict[str, Any]]:
        """Kopie všech hran (jako v snapshot); pořadí = pořadí přidání."""
        with self._lock:
            return [self._public_edge(e) for e in self._edges.values()]

    # ---- labely --------------------------------------------------------

    def _render_label(self, node: dict[str, Any]) -> str:
        template = node["label_template"]
        if template is None:                       # bez per-node šablony
            template = self._node_label_template   # zkus celocanvasovou
        if template is None:
            return node["id"]

        def substitute(match: re.Match[str]) -> str:
            key = match.group(1)
            if key in node["meta"]:
                return str(node["meta"][key])
            logger.warning(
                "Uzel '%s': klíč '%s' z label šablony chybí v metadatech",
                node["id"], key)
            return ""

        return _LABEL_KEY.sub(substitute, template)

    def _public_node(self, node: dict[str, Any]) -> dict[str, Any]:
        return {"id": node["id"], "type": node["type"],
                "label": self._render_label(node), "meta": dict(node["meta"])}

    @staticmethod
    def _public_edge(edge: dict[str, Any]) -> dict[str, Any]:
        return {"source": edge["source"], "target": edge["target"],
                "meta": dict(edge["meta"])}

    # ---- snapshot ------------------------------------------------------

    def snapshot(self) -> dict[str, Any]:
        """Úplný stav pro init zprávu. Pozn.: pending delty jsou už součástí
        stavu – klient proto aplikuje adds jako upserty (idempotence)."""
        with self._lock:
            return {
                "seq": self._seq,
                "config": dict(self.config),
                "node_types": {n: dict(s) for n, s in self._node_types.items()},
                "nodes": [self._public_node(n) for n in self._nodes.values()],
                "edges": [self._public_edge(e) for e in self._edges.values()],
                "flow_types": {n: dict(s) for n, s in self._flow_types.items()},
                "flows": [dict(f) for f in self._flows.values()],
                "windows": [w.spec() for w in self._windows.values()],
            }

    # ---- delty ---------------------------------------------------------

    @contextmanager
    def batch(self) -> Iterator[None]:
        """Podrž delty pohromadě – odejdou jako jeden patch po opuštění bloku."""
        with self._lock:
            self._batch_depth += 1
        try:
            yield
        finally:
            with self._lock:
                self._batch_depth -= 1

    def drain(self) -> tuple[int, dict[str, list]] | None:
        """Vrátí (seq, delty) k odeslání, nebo None když není co poslat."""
        with self._lock:
            if self._batch_depth > 0:
                return None
            if not any(self._pending.values()):
                return None
            deltas = {
                "remove_edges": [list(k) for k in self._pending["remove_edges"]],
                "remove_nodes": list(self._pending["remove_nodes"]),
                "add_nodes": list(self._pending["add_nodes"].values()),
                "update_nodes": list(self._pending["update_nodes"].values()),
                "add_edges": list(self._pending["add_edges"].values()),
            }
            self._pending = self._empty_pending()
            self._seq += 1
            return self._seq, deltas

    # ---- periodické úlohy ----------------------------------------------

    def every(self, seconds: float, *,
              name: str | None = None) -> Callable[[Callable], Callable]:
        """Dekorátor: registruj periodickou úlohu – knihovna ji po startu
        serveru spouští v daemon vlákně, žádný threading v uživatelském
        kódu. První tik po uplynutí intervalu. Výjimka se zaloguje a smyčka
        běží dál. Registruj před vb.serve(); pozdější registrace se jen
        zaloguje a ignoruje."""
        interval = float(seconds)
        if interval <= 0:
            raise ValueError("every: interval musí být kladný počet sekund")

        def register(func: Callable[[], None]) -> Callable[[], None]:
            task_name = name or getattr(func, "__name__", "úloha")
            with self._lock:
                if self._tasks_stop is not None:
                    logger.warning(
                        "every(): úloha '%s' registrována po startu serveru"
                        " – ignoruje se", task_name)
                    return func
                self._tasks.append(
                    {"interval": interval, "name": task_name, "func": func})
            return func
        return register

    def start_periodic_tasks(self) -> threading.Event:
        """Spusť every() úlohy (volá server v lifespanu). Vrátí stop event;
        idempotentní – opakované volání vrátí týž event."""
        with self._lock:
            if self._tasks_stop is not None:
                return self._tasks_stop
            stop = threading.Event()
            self._tasks_stop = stop
            tasks = list(self._tasks)
        for task in tasks:
            threading.Thread(
                target=self._run_periodic, args=(task, stop),
                name=f"viewbase-every-{task['name']}", daemon=True).start()
        return stop

    @staticmethod
    def _run_periodic(task: dict[str, Any], stop: threading.Event) -> None:
        while not stop.wait(task["interval"]):
            try:
                task["func"]()
            except Exception:
                logger.exception("Výjimka v every() úloze '%s'", task["name"])

    # ---- eventy ----------------------------------------------------------

    def on_click(self, func: Callable[[Any], None]) -> Callable[[Any], None]:
        return self._register("node_click", func)

    def on_hover(self, func: Callable[[Any], None]) -> Callable[[Any], None]:
        return self._register("node_hover", func)

    def on_background_click(
            self, func: Callable[[Any], None]) -> Callable[[Any], None]:
        return self._register("background_click", func)

    def on_view_change(
            self, func: Callable[[Any], None]) -> Callable[[Any], None]:
        return self._register("view_change", func)

    def _register(self, event: str,
                  func: Callable[[Any], None]) -> Callable[[Any], None]:
        with self._lock:
            self._handlers.setdefault(event, []).append(func)
        return func

    def dispatch_event(self, name: str, payload: dict[str, Any]) -> None:
        """Spustí handlery eventu ve sdíleném thread-poolu (smí blokovat).
        Neznámý event je no-op; výjimka handleru se zaloguje, server běží dál."""
        with self._lock:
            if self._closed:
                return
            handlers = list(self._handlers.get(name, ()))
        if not handlers:
            return
        event = types.SimpleNamespace(**payload)
        for handler in handlers:
            self._executor.submit(self._run_handler, handler, name, event)

    @staticmethod
    def _run_handler(handler: Callable[[Any], None], name: str,
                     event: types.SimpleNamespace) -> None:
        try:
            handler(event)
        except Exception:
            logger.exception("Výjimka v handleru eventu '%s'", name)

    def close(self) -> None:
        """Ukonči thread-pool handlerů i every() úlohy. Idempotentní; další
        dispatch_event je no-op. Nečeká na běžící handlery (wait=False)
        a zruší zařazené čekající úlohy (cancel_futures=True)."""
        with self._lock:
            if self._closed:
                return
            self._closed = True
            if self._tasks_stop is not None:
                self._tasks_stop.set()
        self._executor.shutdown(wait=False, cancel_futures=True)

    # ---- akce server -> klient -------------------------------------------

    def show_detail(self, node_id: str) -> None:
        """Zobrazí na klientech detail box s metadaty uzlu."""
        self._queue_node_action("show_detail", node_id)

    def focus(self, node_id: str) -> None:
        """Plynulý dolet kamery na uzel."""
        self._queue_node_action("focus", node_id)

    def highlight(self, node_id: str, depth: int | None = None) -> None:
        """Zvýrazní uzel a sousedy do hloubky depth (None = config klienta)."""
        with self._lock:
            self._require_node(node_id)
            self._actions.append(
                {"action": "highlight", "node_id": node_id, "depth": depth})

    def set_theme(self, theme: Any) -> None:
        """Přepne téma za běhu (vestavěné jméno nebo dict) a pošle akci."""
        theme = _validated_theme(theme)
        with self._lock:
            self.config["theme"] = theme
            self._actions.append({"action": "set_theme", "theme": theme})

    def _queue_node_action(self, action: str, node_id: str) -> None:
        with self._lock:
            self._require_node(node_id)
            self._actions.append({"action": action, "node_id": node_id})

    def _require_node(self, node_id: str) -> None:
        if node_id not in self._nodes:
            raise ValueError(f"Uzel '{node_id}' neexistuje")

    def drain_actions(self) -> list[dict[str, Any]]:
        """Vrátí akce k odeslání (v pořadí volání) a frontu vyprázdní."""
        with self._lock:
            actions, self._actions = self._actions, []
            return actions
