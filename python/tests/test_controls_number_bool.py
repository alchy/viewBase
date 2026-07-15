"""number/boolean pole a live režim control oken."""
import pytest

from viewbase import Canvas, ControlWindow
from viewbase.controls import validate_values


def test_number_field_spec_and_validation():
    w = ControlWindow("w", title="T")
    w.number("ratio", "Poměr", min=0.0, max=1.0, value=0.3)
    (field,) = w.spec()["fields"]
    assert field == {"key": "ratio", "label": "Poměr", "type": "number",
                     "value": 0.3, "min": 0.0, "max": 1.0}
    assert validate_values([field], {"ratio": 0.7}) == {"ratio": 0.7}
    assert validate_values([field], {"ratio": "0.9"}) == {"ratio": 0.9}
    assert validate_values([field], {"ratio": 5}) == {"ratio": 1.0}   # clamp
    assert validate_values([field], {"ratio": "x"}) == {}             # drop
    assert validate_values([field], {"ratio": float("nan")}) == {}    # drop


def test_number_field_step_and_minmax_check():
    w = ControlWindow("w")
    w.number("a", "A", min=0, max=10, value=5, step=0.5)
    (field,) = w.spec()["fields"]
    assert field["step"] == 0.5
    with pytest.raises(ValueError):
        w.number("b", "B", min=2, max=1, value=1)


def test_boolean_field_spec_and_validation():
    w = ControlWindow("w")
    w.boolean("on", "Zapnuto", value=True)
    (field,) = w.spec()["fields"]
    assert field == {"key": "on", "label": "Zapnuto", "type": "bool",
                     "value": True}
    assert validate_values([field], {"on": False}) == {"on": False}
    assert validate_values([field], {"on": 1}) == {}                  # jen bool
    with pytest.raises(ValueError):
        w.boolean("x", "X", value="ano")


def test_open_window_live_flag_in_action_and_snapshot():
    c = Canvas()
    w = ControlWindow("render", title="R")
    w.boolean("on", "Zapnuto")
    c.open_window(w, live=True)
    (action,) = c.drain_actions()
    assert action["action"] == "open_window"
    assert action["live"] is True
    (spec,) = c.snapshot()["windows"]
    assert spec["live"] is True
    c.close_window("render")
    assert c.snapshot()["windows"] == []


def test_open_window_default_is_not_live():
    c = Canvas()
    c.open_window(ControlWindow("w"))
    (action,) = c.drain_actions()
    assert action["live"] is False
    (spec,) = c.snapshot()["windows"]
    assert spec["live"] is False
