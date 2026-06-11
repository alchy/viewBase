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
