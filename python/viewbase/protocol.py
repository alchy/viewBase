"""Zprávy protokolu viewbase (server <-> klient), verze 1."""
from __future__ import annotations

import json
from typing import Any

PROTOCOL_VERSION = 1


def init_message(*, seq: int, config: dict, node_types: dict,
                 nodes: list, edges: list) -> dict[str, Any]:
    return {
        "type": "init",
        "protocol": PROTOCOL_VERSION,
        "seq": seq,
        "config": config,
        "node_types": node_types,
        "nodes": nodes,
        "edges": edges,
    }


def patch_message(seq: int, deltas: dict[str, list]) -> dict[str, Any]:
    message: dict[str, Any] = {"type": "patch", "seq": seq}
    message.update(deltas)
    return message


def encode(message: dict) -> str:
    return json.dumps(message, separators=(",", ":"))


def decode(raw: str) -> dict[str, Any]:
    message = json.loads(raw)
    if not isinstance(message, dict) or "type" not in message:
        raise ValueError("Zpráva musí být JSON objekt s polem 'type'")
    return message
