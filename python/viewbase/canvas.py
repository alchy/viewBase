"""Canvas – zdroj pravdy grafu a veřejné API knihovny."""
from __future__ import annotations

import logging
import re
import threading
import types
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from typing import Any, Callable, Iterator

logger = logging.getLogger("viewbase")

_LABEL_KEY = re.compile(r"\{([^{}]+)\}")

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


def _edge_key(source: str, target: str) -> tuple[str, str]:
    """Neorientovaná hrana má kanonický klíč: lexikograficky seřazenou dvojici."""
    return (source, target) if source <= target else (target, source)


class Canvas:
    """Thread-safe model grafu. Mutace se hromadí jako delty pro server."""

    def __init__(self, *, title: str = "viewbase", dimensions: int = 3,
                 theme: Any = "modern", highlight_neighbors: int = 1):
        if dimensions not in (2, 3):
            raise ValueError("dimensions musí být 2 nebo 3")
        self.config = {
            "title": title,
            "dimensions": dimensions,
            "theme": _validated_theme(theme),
            "highlight_neighbors": highlight_neighbors,
        }
        self._lock = threading.RLock()
        self._nodes: dict[str, dict[str, Any]] = {}
        self._edges: dict[tuple[str, str], dict[str, Any]] = {}
        self._node_types: dict[str, dict[str, Any]] = {}
        self._seq = 0
        self._batch_depth = 0
        self._pending = self._empty_pending()
        self._handlers: dict[str, list[Callable[[Any], None]]] = {}
        self._executor = ThreadPoolExecutor(
            max_workers=4, thread_name_prefix="viewbase-handler")
        self._actions: list[dict[str, Any]] = []

    @staticmethod
    def _empty_pending() -> dict[str, dict]:
        return {
            "add_nodes": {},      # id -> payload
            "update_nodes": {},   # id -> payload
            "remove_nodes": {},   # id -> True
            "add_edges": {},      # key -> payload
            "remove_edges": {},   # key -> True
        }

    # ---- typy ----------------------------------------------------------

    def define_type(self, name: str, **style: Any) -> None:
        """Definuj typ uzlu. V Plánu 1 se propaguje jen přes init (volat před serve)."""
        with self._lock:
            self._node_types[name] = dict(style)

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

    # ---- labely --------------------------------------------------------

    def _render_label(self, node: dict[str, Any]) -> str:
        template = node["label_template"]
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
