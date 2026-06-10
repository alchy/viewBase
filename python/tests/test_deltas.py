from viewbase import Canvas


def drain_deltas(c):
    drained = c.drain()
    assert drained is not None
    return drained[1]


def test_drain_empty_returns_none():
    assert Canvas().drain() is None


def test_seq_increments_per_drain():
    c = Canvas()
    c.add_node("a")
    seq1, _ = c.drain()
    c.add_node("b")
    seq2, _ = c.drain()
    assert (seq1, seq2) == (1, 2)
    assert c.snapshot()["seq"] == 2


def test_drain_has_all_five_keys():
    c = Canvas()
    c.add_node("a")
    deltas = drain_deltas(c)
    assert set(deltas) == {"add_nodes", "update_nodes", "remove_nodes",
                           "add_edges", "remove_edges"}


def test_add_then_remove_in_one_window_cancels_out():
    c = Canvas()
    c.add_node("a")
    c.remove_node("a")
    assert c.drain() is None


def test_remove_then_add_keeps_both():
    c = Canvas()
    c.add_node("a")
    c.drain()                      # klienti už uzel znají
    c.remove_node("a")
    c.add_node("a", fresh=True)
    deltas = drain_deltas(c)
    assert deltas["remove_nodes"] == ["a"]
    assert [n["id"] for n in deltas["add_nodes"]] == ["a"]


def test_update_folds_into_pending_add():
    c = Canvas()
    c.add_node("a")
    c.update_node("a", x=1)
    deltas = drain_deltas(c)
    assert deltas["update_nodes"] == []
    assert deltas["add_nodes"][0]["meta"] == {"x": 1}


def test_remove_node_emits_edge_removals():
    c = Canvas()
    c.add_node("a")
    c.add_node("b")
    c.add_edge("a", "b")
    c.drain()
    c.remove_node("a")
    deltas = drain_deltas(c)
    assert deltas["remove_edges"] == [["a", "b"]]
    assert deltas["remove_nodes"] == ["a"]


def test_batch_holds_deltas_until_exit():
    c = Canvas()
    with c.batch():
        c.add_node("a")
        c.add_node("b")
        assert c.drain() is None
    deltas = drain_deltas(c)
    assert len(deltas["add_nodes"]) == 2
