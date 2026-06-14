"""Mapa slov z webové stránky.

Stáhne stránku, vytáhne slova a propojí ta, která ve větě stojí hned
vedle sebe – např. "pes vyběhl na louku" → pes–vyběhl, vyběhl–na, na–louku.
Z hromady textu tak vznikne síť vztahů mezi slovy.

Uzel = slovo (popisek je slovo samotné), velikost uzlu = četnost slova,
barva = od chladné (vzácné) po teplou (časté). Klik zvýrazní sousední slova.

Použití:
    python examples/words.py                                  # výchozí článek
    python examples/words.py "https://cs.wikipedia.org/wiki/Praha"
    python examples/words.py https://www.seznam.cz            # pozor: homepage
        bývá hlavně JS/CSS, ne věty – mapa pak nedává smysl. Volte stránku
        s běžným textem (článek, encyklopedie).
"""
import html as html_module
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter

import viewbase as vb

# Výchozí stránka: článek bohatý na text (a tematicky ke psovi z příkladu)
URL = sys.argv[1] if len(sys.argv) > 1 else "https://cs.wikipedia.org/wiki/Pes domácí"
MAX_WORDS = 150          # kolik nejčastějších slov vzít jako uzly
MIN_LEN = 3              # ignoruj slova kratší než tohle


def stahni_text(url: str) -> str:
    """Stáhne HTML a vrátí čistý text (bez skriptů, stylů a značek)."""
    # Percent-enkóduj cestu/dotaz, aby diakritika v URL nerozbila urllib
    parts = urllib.parse.urlsplit(url)
    url = urllib.parse.urlunsplit((
        parts.scheme, parts.netloc,
        urllib.parse.quote(parts.path),
        urllib.parse.quote(parts.query, safe="=&"),
        "",
    ))
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 viewbase"})
    with urllib.request.urlopen(request, timeout=15) as response:
        raw = response.read().decode("utf-8", errors="ignore")
    # Vyhoď obsah <script> a <style>, pak všechny zbývající značky
    raw = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw, flags=re.I | re.S)
    raw = re.sub(r"<[^>]+>", " ", raw)
    return html_module.unescape(raw)


def lerp_barva(a: str, b: str, t: float) -> str:
    """Lineární přechod mezi dvěma hex barvami (#rrggbb) podle t∈[0,1]."""
    ca = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    cb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    mix = [round(x + (y - x) * t) for x, y in zip(ca, cb)]
    return "#{:02x}{:02x}{:02x}".format(*mix)


print(f"Stahuji {URL} ...")
text = stahni_text(URL)
# Jen slova z písmen (vč. české diakritiky), žádné číslice ani tokeny z kódu
words = re.findall(r"[^\W\d_]{%d,}" % MIN_LEN, text.lower())
if not words:
    print("Na stránce se nenašla žádná slova – zkus jinou URL.")
    sys.exit(1)

freq = Counter(words)
top = dict(freq.most_common(MAX_WORDS))   # {slovo: četnost}
valid = set(top)
nej = max(top.values())
print(f"Nalezeno {len(words)} slov, beru {len(top)} nejčastějších.")

canvas = vb.Canvas(title=f"Slova: {URL}", theme="modern", highlight_neighbors=1)

with canvas.batch():
    for slovo, pocet in top.items():
        norm = pocet / nej                       # 0..1 podle četnosti
        canvas.add_node(
            slovo,
            count=pocet,
            size=round(0.6 + 2.2 * norm, 2),     # časté slovo = větší uzel
            color=lerp_barva("#4f86c6", "#ff5b5b", norm),  # modrá → červená
        )

    seen = set()
    for a, b in zip(words, words[1:]):           # dvojice sousedních slov
        if a in valid and b in valid and a != b:
            key = tuple(sorted((a, b)))
            if key not in seen:
                seen.add(key)
                canvas.add_edge(a, b)

print(f"Hran (sousedství slov): {len(seen)}")
vb.serve(canvas, port=8080, open_browser=True)
