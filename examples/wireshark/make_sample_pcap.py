"""Vygeneruje malý vzorový pcap (pár TCP/UDP/DNS/ICMP paketů), aby šel
pcap_replay.py spustit bez externí captury. Vyžaduje scapy.

Spuštění:
    pip install scapy
    python examples/wireshark/make_sample_pcap.py sample.pcap
"""
import sys

from scapy.all import DNS, DNSQR, ICMP, IP, TCP, UDP, wrpcap

CLIENT = "10.0.0.10"
SERVER = "10.0.0.20"
DNS_SRV = "10.0.0.53"


def build_packets():
    packets = []
    # HTTP přes TCP (port 80) – klient ↔ server, pár výměn
    for _ in range(6):
        packets.append(IP(src=CLIENT, dst=SERVER) / TCP(sport=44000, dport=80))
        packets.append(IP(src=SERVER, dst=CLIENT) / TCP(sport=80, dport=44000))
    # DNS dotazy (UDP port 53)
    for _ in range(3):
        packets.append(
            IP(src=CLIENT, dst=DNS_SRV)
            / UDP(sport=33000, dport=53)
            / DNS(rd=1, qd=DNSQR(qname="example.com")))
    # obyčejné UDP
    for _ in range(2):
        packets.append(IP(src=CLIENT, dst=SERVER) / UDP(sport=40000, dport=9999))
    # ICMP ping
    for _ in range(2):
        packets.append(IP(src=CLIENT, dst=SERVER) / ICMP())
    return packets


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "sample.pcap"
    wrpcap(out, build_packets())
    print(f"Zapsáno {out}")


if __name__ == "__main__":
    main()
