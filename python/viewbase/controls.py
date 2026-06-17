"""Control okno: backendem definovaný parametrický dialog.

ControlWindow drží typovaná pole (int/string/enum). Spec jde na frontend (akce
open_window i init), frontend z něj postaví formulář a hodnoty pošle zpět
eventem window_submit. validate_values je čistá – clampuje příchozí hodnoty
podle field descriptorů (bezpečnost: klient může poslat cokoli)."""
from __future__ import annotations

from typing import Any


def _normalize_options(options: list) -> list[dict]:
    """Seznam (value, label) dvojic nebo holých hodnot → [{value, label}]."""
    normalized = []
    for opt in options:
        if isinstance(opt, (list, tuple)) and len(opt) == 2:
            value, label = opt
        else:
            value, label = opt, str(opt)
        normalized.append({"value": value, "label": str(label)})
    return normalized


class ControlWindow:
    """Parametrické okno: uspořádaný seznam typovaných polí."""

    def __init__(self, window_id: str, *, title: str = "") -> None:
        self.window_id = window_id
        self.title = title
        self._fields: list[dict[str, Any]] = []

    def integer(self, key: str, label: str, *, min: int, max: int,
                value: int, step: int = 1) -> "ControlWindow":
        if min > max:
            raise ValueError("integer: min nesmí být větší než max")
        self._fields.append({
            "key": key, "label": label, "type": "int",
            "value": int(value), "min": int(min), "max": int(max),
            "step": int(step),
        })
        return self

    def string(self, key: str, label: str, *, maxlength: int,
               value: str = "") -> "ControlWindow":
        if maxlength <= 0:
            raise ValueError("string: maxlength musí být kladné")
        self._fields.append({
            "key": key, "label": label, "type": "string",
            "value": str(value), "maxlength": int(maxlength),
        })
        return self

    def enum(self, key: str, label: str, *, options: list,
             value: Any) -> "ControlWindow":
        norm = _normalize_options(options)
        if not norm:
            raise ValueError("enum: options nesmí být prázdné")
        if value not in {opt["value"] for opt in norm}:
            raise ValueError("enum: value musí být jedna z options")
        self._fields.append({
            "key": key, "label": label, "type": "enum",
            "value": value, "options": norm,
        })
        return self

    def spec(self) -> dict[str, Any]:
        return {
            "window_id": self.window_id,
            "title": self.title,
            "fields": [self._copy_field(f) for f in self._fields],
        }

    @staticmethod
    def _copy_field(field: dict) -> dict:
        """Nezávislá kopie pole (i vnořený seznam options u enum)."""
        copied = dict(field)
        if "options" in copied:
            copied["options"] = [dict(o) for o in copied["options"]]
        return copied

    def apply(self, values: dict[str, Any]) -> None:
        """Přepiš value u polí podle (už zvalidovaných) hodnot."""
        for field in self._fields:
            if field["key"] in values:
                field["value"] = values[field["key"]]


_DROP = object()   # sentinel: hodnotu zahodit (None je validní string/enum)


def _clamp_field(field: dict, raw: Any) -> Any:
    """Zvaliduj jednu hodnotu podle field descriptoru. Vrátí _DROP, když je
    hodnota nepoužitelná (volající ji vynechá)."""
    kind = field["type"]
    if kind == "int":
        try:
            value = int(raw)
        except (TypeError, ValueError):
            return _DROP
        return max(field["min"], min(field["max"], value))
    if kind == "string":
        if not isinstance(raw, str):
            return _DROP
        return raw[:field["maxlength"]]
    if kind == "enum":
        allowed = {opt["value"] for opt in field["options"]}
        return raw if raw in allowed else _DROP
    return _DROP


def validate_values(fields: list[dict], raw: dict) -> dict:
    """Čistá validace: vrať jen platné, oříznuté hodnoty podle field
    descriptorů. Neznámé klíče a nevalidní hodnoty se zahodí."""
    clean = {}
    for field in fields:
        key = field["key"]
        if key not in raw:
            continue
        value = _clamp_field(field, raw[key])
        if value is not _DROP:
            clean[key] = value
    return clean
