"""Flagy oken: closable (bez [x] u neobnovitelných) a input (panel bez promptu)."""
from viewbase.controls import ControlWindow, TerminalWindow


def test_windows_carry_closable_flag():
    assert ControlWindow("w").spec()["closable"] is True
    assert ControlWindow("w", closable=False).spec()["closable"] is False
    term = TerminalWindow("t", closable=False, input=False).spec()
    assert term["closable"] is False and term["input"] is False


def test_terminal_defaults_keep_input_and_close():
    spec = TerminalWindow("t").spec()
    assert spec["input"] is True and spec["closable"] is True
