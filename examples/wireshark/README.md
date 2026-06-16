# Wireshark ukázka — vizualizace síťového provozu

Vlajková ukázka viewbase: síťový provoz jako živý 3D graf. Uzly jsou IP
adresy, hrany komunikující páry a **toky** jsou jednotlivé pakety obarvené
podle protokolu (TCP, HTTP, UDP, DNS, ICMP).

## Instalace

```bash
pip install -e "python[dev]"   # viewbase (z kořene repa)
pip install scapy              # parsování paketů
```

## Rychlý start bez vlastní captury

Vygeneruj malý vzorový pcap (pár TCP/HTTP/UDP/DNS/ICMP paketů) a přehraj ho:

```bash
python examples/wireshark/make_sample_pcap.py sample.pcap
python examples/wireshark/pcap_replay.py sample.pcap --speed 4
```

Otevře se prohlížeč. Uvidíš, jak postupně přibývají uzly (IP adresy) a hrany
a jak po hranách letí barevné glow částice — každá je jeden paket. Barva =
protokol (žlutá DNS, zelená HTTP, modrá TCP, fialová UDP, červená ICMP).

`--speed N` zrychlí přehrávání N×; `--port` změní port (default 8080).

## Vlastní pcap

Máš-li vlastní záznam (z Wiresharku „Save as… → .pcap", nebo
`tcpdump -w moje.pcap`), přehraj ho stejně:

```bash
python examples/wireshark/pcap_replay.py moje.pcap --speed 8
```

## Živé zachytávání

Sleduj provoz v reálném čase (graf roste, jak data tečou). Vyžaduje
oprávnění k rozhraní — typicky `sudo`:

```bash
sudo python examples/wireshark/live_capture.py --iface en0
```

`--iface` vyber podle systému (`en0` na macOS, `eth0`/`wlan0` na Linuxu;
bez `--iface` se použije výchozí rozhraní scapy). Ctrl-C ukončí.

> **`sudo: python: command not found`?** Pokud je `python` jen shell alias
> (např. na `python3.11`) nebo běží z venv, `sudo` ho nevidí — aliasy ani
> aktivovaný venv se do roota nedědí. Spusť přímo interpreter z venv:
>
> ```bash
> sudo .venv/bin/python examples/wireshark/live_capture.py --iface en0
> ```

## Cesta paketu (traceroute)

Místo dvou koncových uzlů ukáže i **routery po cestě**: pro každý nový
globální cíl se na pozadí spustí traceroute, jeho hopy přibudou jako uzly
(routery jako zelené krychle, neodpovídající „tiché" hopy jako šedé
placeholdery `*`) a pakety pak putují jako tok přes celou cestu
`ty → router → … → cíl`. Cesty se cachují a počítají paralelně.

```bash
sudo .venv/bin/python examples/wireshark/live_route.py --iface en0
```

Přepínače: `--max-hops` (default 30), `--timeout` (s na hop, default 1.0),
`--workers` (paralelní traceroute, default 8), `--port`, `--iface`. Vyžaduje
root (sniff i traceroute proby používají raw sockety) — viz poznámka výše o
`.venv/bin/python`.

Než traceroute (sekundy) doběhne, vede k cíli dočasná přímá hrana; po zjištění
cesty se nahradí routery. LAN cíle (privátní adresy) zůstávají přímou hranou.

## Co se děje uvnitř

- `make_sample_pcap.py` — `scapy.wrpcap` zapíše pár ručně sestavených paketů.
- `pcap_replay.py` — `rdpcap` načte pakety, `classify()` určí protokol →
  typ toku, `canvas.flow(src, dst, type=…, count=1)` vyšle jednu částici za
  paket; časování drží rozestupy podle pcap razítek (dělené `--speed`).
- `live_capture.py` — `scapy.sniff(prn=…)` volá handler za každý paket;
  uzly/hrany se přidávají líně, tok se vyšle hned.
- `live_route.py` — jako `live_capture.py`, navíc na pozadí spustí
  `traceroute` (scapy `sr1` s rostoucím TTL), routery po cestě přidá jako
  uzly a paket vyšle jako multi-hop tok `canvas.flow(path=[…])`. Cesty drží
  `RouteTable` (cache + paralelní výpočet).

Pakety bez IP vrstvy (ARP apod.) se přeskakují.
