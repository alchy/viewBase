"""Živé zachytávání s cestou paketu (traceroute) jako rostoucí graf.

Uzly = adresy a routery po cestě, hrany = sousední skoky, tok = každý paket
obarvený podle protokolu, putující multi-hop přes všechny uzly po cestě.

Pro každý nový globální cíl se na pozadí spustí traceroute, hopy se přidají
líně a další pakety k cíli už tečou po celé cestě. Cesty se cachují a běží
paralelně. Vyžaduje root (sniff i traceroute proby používají raw sockety).

Spuštění (Linux/macOS):
    pip install scapy
    sudo .venv/bin/python examples/wireshark/live_route.py --iface en0
"""
import argparse
import ipaddress
import logging
import socket
import threading
from concurrent.futures import ThreadPoolExecutor

from scapy.all import ICMP, IP, get_if_addr, sniff, sr1

import viewbase as vb

# Reuse z pcap_replay (DRY): klasifikace protokolu, barvy, FQDN resolver.
from pcap_replay import PROTO_COLORS, classify, make_resolver

logger = logging.getLogger("live_route")

PENDING = "pending"
READY = "ready"


def is_global(ip: str) -> bool:
    """True pro veřejnou (internetovou) IPv4 adresu; jinak (privátní, lokální,
    neplatná) False."""
    try:
        return ipaddress.ip_address(ip).is_global
    except ValueError:
        return False


def orient(src: str, dst: str, locals_set: set) -> tuple:
    """Vrať (local, remote): který konec paketu je náš a který vzdálený.
    Když je lokální/vzdálený nejednoznačný (oba naše nebo oba cizí), vrať
    (None, None) — takový paket route logika přeskočí."""
    if src in locals_set and dst not in locals_set:
        return src, dst
    if dst in locals_set and src not in locals_set:
        return dst, src
    return None, None


def local_addrs(iface: str | None = None) -> set:
    """Naše IP adresy (k rozlišení lokálního a vzdáleného konce). Zdrojovou IP
    výchozí trasy zjistí UDP socketem (nic neposílá), přidá loopback a (je-li
    zadáno) adresu rozhraní."""
    addrs = {"127.0.0.1"}
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))      # vybere zdrojovou IP, nic neodešle
        addrs.add(sock.getsockname()[0])
        sock.close()
    except OSError:
        pass
    if iface:
        try:
            addrs.add(get_if_addr(iface))
        except Exception:
            pass
    return {a for a in addrs if a and a != "0.0.0.0"}


def placeholder_id(remote: str, ttl: int) -> str:
    """ID placeholder uzlu pro tichý hop — unikátní per (cíl, TTL)."""
    return f"*{remote}#{ttl}"


def trace(dst: str, *, max_hops: int = 30, timeout: float = 1.0) -> list:
    """Malý ICMP traceroute. Vrať uspořádaný seznam (ttl, ip|None): None je
    tichý hop (router neodpověděl). Skončí na dosažení cíle (echo-reply nebo
    reply.src == dst)."""
    hops = []
    for ttl in range(1, max_hops + 1):
        reply = sr1(IP(dst=dst, ttl=ttl) / ICMP(), timeout=timeout, verbose=0)
        if reply is None:
            hops.append((ttl, None))
            continue
        hops.append((ttl, reply.src))
        icmp_type = reply[ICMP].type if reply.haslayer(ICMP) else None
        if icmp_type == 0 or reply.src == dst:   # echo-reply nebo dosažen cíl
            break
    return hops


def build_path(local: str, hops: list, remote: str) -> list:
    """Z výstupu trace() sestav ID uzlů cesty [local, …, remote]. Tiché hopy
    (ip=None) → placeholder ID. Pokud poslední hop není cíl (cíl neodpověděl),
    připoj remote na konec, aby graf zůstal souvislý."""
    path = [local]
    for ttl, ip in hops:
        path.append(ip if ip is not None else placeholder_id(remote, ttl))
    if path[-1] != remote:
        path.append(remote)
    return path


class Route:
    """Jedna cesta k cíli: stav a (po doběhu) seznam uzlů [local, …, remote]."""
    def __init__(self):
        self.state = PENDING
        self.path = None


class RouteTable:
    """Cache cest k cílům a jejich materializace do canvasu. Thread-safe.
    Uzly a hrany se dedupují proti canvasu samotnému (has_node/ensure_edge),
    žádný stínový stav.

    `tracer(remote)` vrací výstup ve tvaru trace() (seznam (ttl, ip|None));
    injektovatelný kvůli testům. `pool` musí mít metodu submit(fn, *args);
    default je ThreadPoolExecutor (paralelní traceroute na pozadí)."""

    def __init__(self, canvas, *, tracer, resolver=None, workers=8, pool=None):
        self._canvas = canvas
        self._tracer = tracer
        self._resolve = resolver or (lambda ip: None)
        self._pool = pool or ThreadPoolExecutor(
            max_workers=workers, thread_name_prefix="traceroute")
        self._lock = threading.RLock()
        self._routes = {}        # remote -> Route
        self._hops = set()       # známé router IP (anti-rekurze na vlastní proby)

    # -- veřejné API --

    def is_known_hop(self, ip: str) -> bool:
        with self._lock:
            return ip in self._hops

    def ensure_direct(self, local: str, remote: str) -> None:
        """Přímá hrana local–remote (LAN / fallback) bez traceroute."""
        with self._lock:
            self._ensure_node(local, role="host")
            self._ensure_node(remote, role="host")
            self._ensure_edge(local, remote)

    def get_or_start(self, local: str, remote: str) -> Route:
        """Vrať cestu k cíli; novou založí: PENDING + dočasná přímá hrana +
        traceroute na pozadí. Dedup — jeden traceroute na cíl."""
        with self._lock:
            route = self._routes.get(remote)
            if route is not None:
                return route
            route = Route()
            self._routes[remote] = route
            self._ensure_node(local, role="host")
            self._ensure_node(remote, role="host")
            self._ensure_edge(local, remote)         # dočasná přímá hrana
        self._pool.submit(self._run, local, remote)
        return route

    def path_for(self, route: Route, src: str) -> list:
        """Cesta orientovaná tak, aby path[0] == src (hrany neorientované).
        Precondition: volat jen na READY cestě (jinak route.path je None)."""
        path = route.path
        return path if path[0] == src else list(reversed(path))

    # -- interní --

    def _run(self, local: str, remote: str) -> None:
        try:
            hops = self._tracer(remote)
        except Exception:
            logger.exception("traceroute na %s selhal", remote)
            hops = []
        self._materialize(local, remote, build_path(local, hops, remote))

    def _materialize(self, local: str, remote: str, path: list) -> None:
        with self._lock:
            with self._canvas.batch():
                for i, node_id in enumerate(path):
                    self._ensure_node(
                        node_id, role=self._role_for(node_id, i, len(path)))
                for a, b in zip(path, path[1:]):
                    self._ensure_edge(a, b)
                if len(path) > 2:
                    self._remove_edge(local, remote)   # zruš dočasnou přímou
            # path zapiš dřív než state — handler čte state/path bez zámku,
            # takže jakmile vidí READY, path už musí být nastavená.
            self._routes[remote].path = path
            self._routes[remote].state = READY
            for node_id in path[1:-1]:
                if not _is_placeholder(node_id):
                    self._hops.add(node_id)
        for node_id in path:                           # DNS na pozadí
            if not _is_placeholder(node_id):
                self._resolve(node_id)

    @staticmethod
    def _role_for(node_id: str, index: int, length: int) -> str:
        if index == 0 or index == length - 1:
            return "host"
        return "unknown" if _is_placeholder(node_id) else "router"

    def _ensure_node(self, node_id: str, *, role: str) -> None:
        # canvas je zdroj pravdy (žádný stínový set); první role vítězí –
        # uzel viděný jako host zůstane hostem, i když se objeví jako hop
        if self._canvas.has_node(node_id):
            return
        if role == "unknown":
            self._canvas.add_node(node_id, type="unknown", label="*",
                                  role="hop", ip="", fqdn="")
        else:
            self._canvas.add_node(node_id, type=role, role=role,
                                  ip=node_id, fqdn="")

    def _ensure_edge(self, a: str, b: str) -> None:
        if a != b:
            self._canvas.ensure_edge(a, b)

    def _remove_edge(self, a: str, b: str) -> None:
        if self._canvas.has_edge(a, b):
            self._canvas.remove_edge(a, b)


def _is_placeholder(node_id: str) -> bool:
    return node_id.startswith("*")


def build_canvas() -> vb.Canvas:
    """Canvas pro traceroute ukázku: typy host/router/unknown, flow typy podle
    protokolu, popisek z meta, detailní okno."""
    canvas = vb.Canvas(title="Wireshark trasa", theme="cyber",
                       highlight_neighbors=1)
    canvas.define_type("host", shape="sphere", color="#28d7fe", size=1.0)
    canvas.define_type("router", shape="box", color="#05ffa1", size=1.1)
    canvas.define_type("unknown", shape="tetrahedron", color="#5b6472", size=0.6)
    for name, color in PROTO_COLORS.items():
        canvas.define_flow_type(name, color=color, speed=1.0)
    canvas.node_label("{fqdn} [{ip}]")
    canvas.detail_window(
        rows=[("FQDN", "fqdn"), ("IP", "ip"), ("role", "role")], width_chars=42)
    return canvas


def make_handler(canvas: vb.Canvas, table: RouteTable, locals_set: set):
    """Vrať on_packet: pro globální cíl pošle tok po cestě (po doběhu
    traceroute), do té doby po dočasné přímé hraně; LAN po přímé hraně."""
    def on_packet(pkt) -> None:
        # Sniff callback nesmí nikdy spadnout – výjimka by zabila odposlech.
        # Tok běží bez zámku, takže může vzácně narazit na cestu právě
        # přestavovanou jiným vláknem (dočasná hrana zmizí) → ValueError;
        # i scapy umí na divném paketu hodit. Paket pak jen zahodíme.
        try:
            if not pkt.haslayer(IP):
                return
            src = pkt[IP].src
            dst = pkt[IP].dst
            if src == dst:
                return
            local, remote = orient(src, dst, locals_set)
            if remote is None or table.is_known_hop(remote):
                return                              # nejednoznačné / naše proby
            proto = classify(pkt)
            # flow bere src,dst (ne local,remote) → částice letí ve směru
            # paketu; hrana je neorientovaná, pořadí pro validaci nehraje roli.
            if not is_global(remote):
                table.ensure_direct(local, remote)  # LAN: přímá hrana
                canvas.flow(src, dst, type=proto, count=1, interval=0.05)
                return
            route = table.get_or_start(local, remote)
            if route.state == READY:
                canvas.flow(path=table.path_for(route, src), type=proto,
                            count=1, interval=0.05)  # path_for orientuje dle src
            else:
                canvas.flow(src, dst, type=proto, count=1, interval=0.05)
        except Exception:
            logger.debug("paket přeskočen kvůli výjimce v handleru",
                         exc_info=True)
    return on_packet


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Živý odposlech s cestou paketu (traceroute) → graf toků")
    parser.add_argument("--iface", default=None,
                        help="síťové rozhraní (např. en0, eth0); default = výchozí")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--max-hops", type=int, default=30,
                        help="maximální TTL traceroute (default 30)")
    parser.add_argument("--timeout", type=float, default=1.0,
                        help="timeout odpovědi na hop v sekundách (default 1.0)")
    parser.add_argument("--workers", type=int, default=8,
                        help="počet paralelních traceroute (default 8)")
    args = parser.parse_args()

    canvas = build_canvas()
    resolve = make_resolver(canvas)
    locals_set = local_addrs(args.iface)

    def tracer(remote):
        return trace(remote, max_hops=args.max_hops, timeout=args.timeout)

    table = RouteTable(canvas, tracer=tracer, resolver=resolve,
                       workers=args.workers)
    handler = make_handler(canvas, table, locals_set)
    threading.Thread(
        target=lambda: sniff(iface=args.iface, prn=handler, store=False),
        daemon=True).start()
    vb.serve(canvas, port=args.port, open_browser=True)


if __name__ == "__main__":
    main()
