"""Živé zachytávání paketů jako rostoucí graf toků.

Uzly = adresy (veřejné cíle se reverzním DNS doplní na popisek "FQDN [ip]"),
hrany = komunikující páry, tok = každý paket obarvený podle protokolu.
Vyžaduje oprávnění k rozhraní (typicky root / sudo).

Spuštění (Linux/macOS):
    pip install scapy
    sudo python examples/wireshark/live_capture.py --iface en0

Pozn.: sniff() volá callback v jiném vlákně než serveru – Canvas je
thread-safe, takže to je v pořádku.
"""
import argparse
import threading

from scapy.all import IP, sniff

import viewbase as vb

# Re-use z pcap_replay (DRY): klasifikace, barvy i FQDN resolver.
from pcap_replay import PROTO_COLORS, classify, make_resolver


def build_canvas() -> vb.Canvas:
    canvas = vb.Canvas(title="Wireshark live", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    canvas.detail_window(rows=[("FQDN", "fqdn"), ("IP", "ip")], width_chars=128)
    return canvas


def make_handler(canvas: vb.Canvas):
    nodes: set[str] = set()
    edges: set[tuple[str, str]] = set()
    resolve = make_resolver(canvas)

    def on_packet(pkt) -> None:
        if not pkt.haslayer(IP):
            return
        src = pkt[IP].src
        dst = pkt[IP].dst
        if src == dst:
            return
        with canvas.batch():
            for node_id in (src, dst):
                if node_id not in nodes:
                    nodes.add(node_id)
                    canvas.add_node(node_id, type="host", label="{name}",
                                    name=node_id, ip=node_id, fqdn="")
            edge = (src, dst) if src <= dst else (dst, src)
            if edge not in edges:
                edges.add(edge)
                canvas.add_edge(src, dst)
        for node_id in (src, dst):
            resolve(node_id)             # FQDN doplní popisek na pozadí
        canvas.flow(src, dst, type=classify(pkt), count=1, interval=0.05)

    return on_packet


def main() -> None:
    parser = argparse.ArgumentParser(description="Živé zachytávání → graf toků")
    parser.add_argument("--iface", default=None,
                        help="síťové rozhraní (např. en0, eth0); default = výchozí")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    canvas = build_canvas()
    handler = make_handler(canvas)
    threading.Thread(
        target=lambda: sniff(iface=args.iface, prn=handler, store=False),
        daemon=True).start()
    vb.serve(canvas, port=args.port, open_browser=True)


if __name__ == "__main__":
    main()
