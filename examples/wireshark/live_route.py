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
