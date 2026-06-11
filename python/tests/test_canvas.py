import pytest

from viewbase import Canvas


def test_add_node_and_edge_snapshot():
    c = Canvas()
    c.add_node("a", name="Alfa")
    c.add_node("b")
    c.add_edge("a", "b", weight=2)
    snap = c.snapshot()
    assert [n["id"] for n in snap["nodes"]] == ["a", "b"]
    assert snap["edges"] == [{"source": "a", "target": "b", "meta": {"weight": 2}}]


def test_config_in_snapshot():
    c = Canvas(title="T", dimensions=2, theme="cyber", highlight_neighbors=2)
    cfg = c.snapshot()["config"]
    assert cfg == {"title": "T", "dimensions": 2, "theme": "cyber",
                   "highlight_neighbors": 2}


def test_invalid_dimensions_raises():
    with pytest.raises(ValueError):
        Canvas(dimensions=4)


def test_duplicate_node_raises():
    c = Canvas()
    c.add_node("a")
    with pytest.raises(ValueError):
        c.add_node("a")


def test_edge_requires_existing_nodes_and_no_duplicates():
    c = Canvas()
    c.add_node("a")
    with pytest.raises(ValueError):
        c.add_edge("a", "missing")
    c.add_node("b")
    c.add_edge("a", "b")
    with pytest.raises(ValueError):
        c.add_edge("b", "a")  # neorientovaná hrana už existuje
    with pytest.raises(ValueError):
        c.add_edge("a", "a")  # smyčka


def test_unknown_node_type_raises():
    c = Canvas()
    with pytest.raises(ValueError):
        c.add_node("a", type="server")
    c.define_type("server", shape="box")
    c.add_node("a", type="server")
    assert c.snapshot()["node_types"] == {"server": {"shape": "box"}}


def test_remove_node_cascades_edges():
    c = Canvas()
    c.add_node("a")
    c.add_node("b")
    c.add_edge("a", "b")
    c.remove_node("a")
    snap = c.snapshot()
    assert snap["edges"] == []
    assert [n["id"] for n in snap["nodes"]] == ["b"]


def test_update_and_remove_missing_raises():
    c = Canvas()
    with pytest.raises(ValueError):
        c.update_node("ghost", x=1)
    with pytest.raises(ValueError):
        c.remove_node("ghost")
    c.add_node("a")
    with pytest.raises(ValueError):
        c.remove_edge("a", "ghost")


def test_label_template_and_missing_key(caplog):
    c = Canvas()
    with caplog.at_level("WARNING", logger="viewbase"):
        c.add_node("a", label="{name} ({ip})", name="Web")
    node = c.snapshot()["nodes"][0]
    assert node["label"] == "Web ()"
    assert "ip" in caplog.text


def test_label_defaults_to_id():
    c = Canvas()
    c.add_node("a")
    assert c.snapshot()["nodes"][0]["label"] == "a"


def test_snapshot_is_isolated_from_internal_state():
    c = Canvas()
    c.add_node("a", tags={"env": "prod"})
    c.add_node("b")
    c.add_edge("a", "b", weight=1)
    snap = c.snapshot()
    snap["edges"][0]["meta"]["weight"] = 999
    snap["config"]["title"] = "hacked"
    assert c.snapshot()["edges"][0]["meta"]["weight"] == 1
    assert c.snapshot()["config"]["title"] == "viewbase"


def test_update_node_rejects_label_and_type_keys():
    c = Canvas()
    c.add_node("a")
    with pytest.raises(ValueError, match="label"):
        c.update_node("a", label="X")
    with pytest.raises(ValueError, match="type"):
        c.update_node("a", type="server")
