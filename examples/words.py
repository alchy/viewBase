"""Mapa slov z Wikipedie (s procházením odkazů do hloubky).

Vezme článek a propojí slova, která ve větě stojí hned vedle sebe –
např. "pes vyběhl na louku" → pes–vyběhl, vyběhl–na, na–louku. U Wikipedie
projde přes odkazy na další články do zadané hloubky a posbírá tak mnohem
víc textu (čte přes MediaWiki API, takže dostane čistý text i seznam odkazů).

Uzel = slovo (popisek je slovo samotné), velikost uzlu = četnost slova,
barva = od chladné (vzácné) po teplou (časté). Klik zvýrazní sousední slova.

Použití:
    python examples/words.py                                   # Praha, hloubka 1
    python examples/words.py "https://cs.wikipedia.org/wiki/Pes domácí" 2
    python examples/words.py https://en.wikipedia.org/wiki/Dog 1
    python examples/words.py https://www.example.com 0          # ne-wiki: 1 stránka

Argumenty: [URL] [hloubka]. Hloubka 0 = jen zadaná stránka; 1+ = procházet
odkazy na další wiki články. Pro ne-wiki URL se stáhne jen ta jedna stránka.
"""
import html as html_module
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, deque

import viewbase as vb

URL = sys.argv[1] if len(sys.argv) > 1 else "https://cs.wikipedia.org/wiki/Praha"
DEPTH = int(sys.argv[2]) if len(sys.argv) > 2 else 1
MAX_PAGES = 25           # strop počtu stažených článků (slušnost k API)
LINKS_PER_PAGE = 15      # kolik odkazů z jedné stránky následovat
MAX_WORDS = 300          # kolik nejčastějších slov vzít jako uzly
MIN_LEN = 3              # ignoruj slova kratší než tohle
UA = {"User-Agent": "viewbase-demo/1.0 (graph visualization example)"}


def wiki_cil(url: str):
    """Pokud je to wiki článek, vrať (host, název); jinak None."""
    p = urllib.parse.urlsplit(url)
    if "wikipedia.org" not in p.netloc:
        return None
    m = re.match(r"/wiki/(.+)", p.path)
    if not m:
        return None
    return p.netloc, urllib.parse.unquote(m.group(1)).replace("_", " ")


def api_get(url: str):
    """GET s opakováním při HTTP 429 (rate limit) – backoff 1, 2, 4 s."""
    for pokus in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and pokus < 3:
                time.sleep(2 ** pokus)
                continue
            raise


def wiki_stranka(host: str, title: str):
    """Přes MediaWiki API vrátí (čistý text článku, seznam odkazovaných článků)."""
    params = urllib.parse.urlencode({
        "action": "query", "prop": "extracts|links", "explaintext": 1,
        "redirects": 1, "plnamespace": 0, "pllimit": "max",
        "titles": title, "format": "json",
    })
    data = api_get(f"https://{host}/w/api.php?{params}")
    page = next(iter(data["query"]["pages"].values()))
    links = [l["title"] for l in page.get("links", [])]
    # Vyber pestrou sadu odkazů napříč abecedou (ne jen "1. ...", "10. století")
    links = [t for t in links if not re.match(r"^\d", t) and not t.startswith("Seznam")]
    step = max(1, len(links) // LINKS_PER_PAGE) if links else 1
    return page.get("extract", ""), links[::step][:LINKS_PER_PAGE]


def scrape_text(url: str) -> str:
    """Fallback pro ne-wiki stránky: stáhni HTML a vytáhni z něj text."""
    p = urllib.parse.urlsplit(url)
    url = urllib.parse.urlunsplit((p.scheme, p.netloc,
        urllib.parse.quote(p.path, safe="/%"),
        urllib.parse.quote(p.query, safe="=&%"), ""))
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15) as r:
        raw = r.read().decode("utf-8", errors="ignore")
    raw = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw, flags=re.I | re.S)
    return html_module.unescape(re.sub(r"<[^>]+>", " ", raw))


# --- Posbírej text: BFS přes wiki odkazy do hloubky DEPTH ---
cil = wiki_cil(URL)
texty = []
if cil:
    host, title0 = cil
    fronta = deque([(title0, 0)])
    navštíveno = set()
    while fronta and len(navštíveno) < MAX_PAGES:
        title, d = fronta.popleft()
        if title in navštíveno:
            continue
        navštíveno.add(title)
        try:
            text, odkazy = wiki_stranka(host, title)
        except Exception as e:
            print(f"  přeskakuji {title}: {e}")
            continue
        texty.append(text)
        print(f"  [{len(navštíveno)}/{MAX_PAGES}] hloubka {d}: {title} ({len(text)} znaků)")
        if d < DEPTH:
            for o in odkazy:
                if o not in navštíveno:
                    fronta.append((o, d + 1))
        time.sleep(0.4)   # slušné tempo k API (vyhne se HTTP 429)
else:
    print(f"Ne-wiki URL – stahuji jen {URL}")
    texty.append(scrape_text(URL))

text = " ".join(texty)
words = re.findall(r"[^\W\d_]{%d,}" % MIN_LEN, text.lower())
if not words:
    print("Nenašla se žádná slova – zkus jinou URL.")
    sys.exit(1)

freq = Counter(words)
top = dict(freq.most_common(MAX_WORDS))
valid = set(top)
nej = max(top.values())
print(f"Staženo {len(texty)} stránek, {len(words)} slov "
      f"({len(set(words))} unikátních), beru {len(top)} nejčastějších.")

canvas = vb.Canvas(title=f"Slova: {URL} (hloubka {DEPTH})",
                   theme="modern", highlight_neighbors=1)

with canvas.batch():
    for slovo, pocet in top.items():
        norm = pocet / nej
        canvas.add_node(
            slovo,
            count=pocet,
            size=round(0.6 + 2.2 * norm, 2),
            color="#{:02x}{:02x}{:02x}".format(
                round(0x4f + (0xff - 0x4f) * norm),
                round(0x86 + (0x5b - 0x86) * norm),
                round(0xc6 + (0x5b - 0xc6) * norm)),
        )

    seen = set()
    for a, b in zip(words, words[1:]):
        if a in valid and b in valid and a != b:
            key = tuple(sorted((a, b)))
            if key not in seen:
                seen.add(key)
                canvas.add_edge(a, b)

print(f"Uzlů: {len(top)}, hran (sousedství slov): {len(seen)}")
vb.serve(canvas, port=8080, open_browser=True)
