import pytest

from viewbase.controls import ControlWindow, validate_values


def _fields():
    w = ControlWindow("w", title="T")
    w.integer("n", "N", min=0, max=100, value=30)
    w.string("s", "S", maxlength=4, value="ab")
    w.enum("e", "E", options=[("line", "Čáry"), ("spline", "Splajny")],
           value="line")
    return w.spec()["fields"]


def test_spec_shape():
    w = ControlWindow("render", title="Vykreslování")
    w.integer("n", "N", min=0, max=10, value=5, step=2)
    spec = w.spec()
    assert spec["window_id"] == "render"
    assert spec["title"] == "Vykreslování"
    assert spec["fields"] == [
        {"key": "n", "label": "N", "type": "int",
         "value": 5, "min": 0, "max": 10, "step": 2}]


def test_enum_normalizes_options_and_bare_values():
    w = ControlWindow("w")
    w.enum("e", "E", options=["a", ("b", "Bé")], value="a")
    field = w.spec()["fields"][0]
    assert field["options"] == [
        {"value": "a", "label": "a"}, {"value": "b", "label": "Bé"}]


def test_integer_min_gt_max_raises():
    with pytest.raises(ValueError):
        ControlWindow("w").integer("n", "N", min=5, max=1, value=2)


def test_string_maxlength_nonpositive_raises():
    with pytest.raises(ValueError):
        ControlWindow("w").string("s", "S", maxlength=0)


def test_enum_empty_options_raises():
    with pytest.raises(ValueError):
        ControlWindow("w").enum("e", "E", options=[], value=None)


def test_enum_value_not_in_options_raises():
    with pytest.raises(ValueError):
        ControlWindow("w").enum("e", "E", options=["a", "b"], value="c")


def test_validate_clamps_int():
    f = _fields()
    assert validate_values(f, {"n": 250}) == {"n": 100}
    assert validate_values(f, {"n": -5}) == {"n": 0}
    assert validate_values(f, {"n": 42}) == {"n": 42}


def test_validate_int_coerces_float():
    assert validate_values(_fields(), {"n": 3.9}) == {"n": 3}


def test_validate_string_non_str_dropped():
    assert validate_values(_fields(), {"s": 42}) == {}


def test_validate_int_non_numeric_dropped():
    assert validate_values(_fields(), {"n": "x"}) == {}


def test_validate_truncates_string():
    assert validate_values(_fields(), {"s": "abcdefg"}) == {"s": "abcd"}


def test_validate_enum_rejects_unknown():
    f = _fields()
    assert validate_values(f, {"e": "ghost"}) == {}
    assert validate_values(f, {"e": "spline"}) == {"e": "spline"}


def test_validate_drops_unknown_keys():
    assert validate_values(_fields(), {"zzz": 1}) == {}


def test_apply_updates_values():
    w = ControlWindow("w")
    w.integer("n", "N", min=0, max=10, value=1)
    w.apply({"n": 7})
    assert w.spec()["fields"][0]["value"] == 7
