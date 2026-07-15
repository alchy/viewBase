"""add_graph / from_networkx / add_edges – import hotových grafů."""
from viewbase import Canvas


class FakeGraph:
    """Duck-typed networkx-like graf – testy bez závislosti na networkx."""

    def __init__(self, nodes, edges):
        self._nodes = nodes      # [(id, {attrs})]
        self._edges = edges      # [(a, b, {attrs})]

    def nodes(self, data=False):
        return list(self._nodes)

    def edges(self, data=False):
        return list(self._edges)


def test_add_graph_imports_nodes_edges_meta_and_label():
    g = FakeGraph(
        [("a", {"name": "Alfa"}), (2, {"name": "Dva"})],
        [("a", 2, {"w": 1.5})])
    c = Canvas()
    c.add_graph(g, label="{name}")
    assert c.node("a")["meta"] == {"name": "Alfa"}
    assert c.node("a")["label"] == "Alfa"
    assert c.has_node("2")                      # id převedeno na str
    assert c.edge("a", "2")["meta"] == {"w": 1.5}


def test_add_graph_type_attr_autoregisters_types():
    g = FakeGraph([("a", {"kind": "server"}), ("b", {"kind": "db"})],
                  [("a", "b", {})])
    c = Canvas()
    c.add_graph(g, type_attr="kind")
    assert c.node("a")["type"] == "server"
    assert c.node("a")["meta"] == {}            # kind spotřebován jako typ
    assert "db" in c.snapshot()["node_types"]


def test_add_graph_skips_self_loops():
    g = FakeGraph([("a", {})], [("a", "a", {})])
    c = Canvas()
    c.add_graph(g)
    assert c.edges == []


def test_add_graph_is_idempotent():
    g = FakeGraph([("a", {}), ("b", {})], [("a", "b", {})])
    c = Canvas()
    c.add_graph(g)
    c.add_graph(g)                              # multigraf / reimport nevadí
    assert len(c.nodes) == 2
    assert len(c.edges) == 1


def test_add_graph_type_and_label_attrs_stay_meta():
    # bez type_attr jsou atributy 'type'/'label' obyčejná meta (žádná
    # kolize s kwargs add_node)
    g = FakeGraph([("a", {"type": "x", "label": "y"})], [])
    c = Canvas()
    c.add_graph(g)
    assert c.node("a")["type"] is None
    assert c.node("a")["meta"] == {"type": "x", "label": "y"}


def test_from_networkx_builds_canvas():
    g = FakeGraph([("a", {}), ("b", {})], [("a", "b", {})])
    c = Canvas.from_networkx(g, title="Import", dimensions=2)
    assert c.config["title"] == "Import"
    assert c.config["dimensions"] == 2
    assert len(c.nodes) == 2


def test_add_edges_bulk():
    c = Canvas()
    for nid in "abc":
        c.add_node(nid)
    c.add_edges([("a", "b"), ("b", "c")])
    assert len(c.edges) == 2
