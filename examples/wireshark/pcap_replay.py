"""Přehraj pcap jako živý graf toků.

Uzly = adresy (veřejné cíle se reverzním DNS doplní na popisek "FQDN [ip]"),
hrany = komunikující páry, toky = pakety obarvené podle protokolu (typy toků).
Přehrávání jde v časové ose paketu s volitelným zrychlením.

Spuštění:
    pip install scapy
    python examples/wireshark/make_sample_pcap.py sample.pcap   # vzorek
    python examples/wireshark/pcap_replay.py sample.pcap --speed 4
"""
import argparse
import ipaddress
import os
import socket
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from scapy.all import DNS, ICMP, IP, TCP, UDP, rdpcap

import viewbase as vb

# Barvy protokolů = typy toků. Bez barvy by tok vzal kategorickou paletu;
# tady barvy volíme explicitně, ať je legenda čitelná.
PROTO_COLORS = {
    "tcp": "#28d7fe",
    "http": "#05ffa1",
    "udp": "#b967ff",
    "dns": "#ffd166",
    "icmp": "#ff2a6d",
    "other": "#5b6472",
}


def classify(pkt) -> str:
    """Zařaď paket do typu toku podle protokolu (junior-readable)."""
    if not pkt.haslayer(IP):
        return "other"
    if pkt.haslayer(DNS):
        return "dns"
    if pkt.haslayer(TCP):
        tcp = pkt[TCP]
        if tcp.dport == 80 or tcp.sport == 80:
            return "http"
        return "tcp"
    if pkt.haslayer(UDP):
        return "udp"
    if pkt.haslayer(ICMP):
        return "icmp"
    return "other"


def make_resolver(canvas: vb.Canvas):
    """Vrátí funkci resolve(ip), která asynchronně doplní popisek uzlu na
    'FQDN [ip]'. Reverzní DNS je pomalé, běží proto na pozadí v thread-poolu;
    do té doby je popisek jen IP. Řeší jen veřejné (internetové) cíle –
    privátní/lokální adresy zůstanou jako IP."""
    pool = ThreadPoolExecutor(max_workers=8)
    hotovo: set[str] = set()

    def _resolve(ip: str) -> None:
        try:
            fqdn = socket.gethostbyaddr(ip)[0]
        except OSError:
            return                       # bez PTR záznamu necháme jen IP
        canvas.update_node(ip, name=f"{fqdn} [{ip}]", fqdn=fqdn, ip=ip)

    def resolve(ip: str) -> None:
        if ip in hotovo:
            return
        hotovo.add(ip)
        try:
            if ipaddress.ip_address(ip).is_global:
                pool.submit(_resolve, ip)
        except ValueError:
            pass

    return resolve


def build_canvas() -> vb.Canvas:
    canvas = vb.Canvas(title="Wireshark replay", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    canvas.detail_window(rows=[("FQDN", "fqdn"), ("IP", "ip")], width_chars=128)
    return canvas


def replay(canvas: vb.Canvas, packets, speed: float) -> None:
    """Postupně přidává uzly/hrany a vysílá tok za každý IP paket.
    Čeká podle časových razítek paketů, vydělených `speed`."""
    nodes: set[str] = set()
    edges: set[tuple[str, str]] = set()
    resolve = make_resolver(canvas)
    prev_ts = None
    for pkt in packets:
        if not pkt.haslayer(IP):
            continue
        src = pkt[IP].src
        dst = pkt[IP].dst
        if src == dst:
            continue

        # časování: rozestup mezi pakety podle pcap razítek / speed
        ts = float(pkt.time)
        if prev_ts is not None:
            delay = max(0.0, (ts - prev_ts) / speed)
            time.sleep(min(delay, 2.0))   # strop, ať dlouhé pauzy nezamrznou
        prev_ts = ts

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

        # tok = jeden paket obarvený podle protokolu (fire-and-forget)
        canvas.flow(src, dst, type=classify(pkt), count=1, interval=0.05)


def main() -> None:
    parser = argparse.ArgumentParser(description="Přehrání pcap jako graf toků")
    parser.add_argument("pcap", help="cesta k .pcap souboru")
    parser.add_argument("--speed", type=float, default=1.0,
                        help="násobek rychlosti přehrávání (default 1.0)")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    if not os.path.isfile(args.pcap):
        sys.exit(f"Soubor '{args.pcap}' neexistuje. Vyrob ukázkový: "
                 f"python examples/wireshark/make_sample_pcap.py sample.pcap")
    packets = rdpcap(args.pcap)
    if not packets:
        sys.exit(f"'{args.pcap}' neobsahuje žádné pakety.")
    canvas = build_canvas()

    threading.Thread(
        target=replay, args=(canvas, packets, args.speed), daemon=True).start()
    vb.serve(canvas, port=args.port, open_browser=True)


if __name__ == "__main__":
    main()
