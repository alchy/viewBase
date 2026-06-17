import pytest

from viewbase import protocol


def test_init_roundtrip():
    msg = protocol.init_message(
        seq=3, config={"dimensions": 3}, node_types={},
        nodes=[{"id": "a"}], edges=[],
        flow_types={}, flows=[], windows=[],
    )
    decoded = protocol.decode(protocol.encode(msg))
    assert decoded == msg
    assert decoded["type"] == "init"
    assert decoded["protocol"] == protocol.PROTOCOL_VERSION


def test_patch_message_carries_deltas():
    msg = protocol.patch_message(7, {"add_nodes": [{"id": "x"}], "remove_nodes": []})
    assert msg["type"] == "patch"
    assert msg["seq"] == 7
    assert msg["add_nodes"] == [{"id": "x"}]


def test_decode_rejects_non_message():
    with pytest.raises(ValueError):
        protocol.decode('"jen text"')
    with pytest.raises(ValueError):
        protocol.decode('{"missing": "type"}')
