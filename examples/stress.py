"""Zátěžový test: syntetický graf o tisících uzlech.

Ověřuje, že knihovna zvládá velké grafy. Generuje graf modelem
preferential attachment (Barabási–Albert) – každý nový uzel se připojí
k několika existujícím s pravděpodobností úměrnou jejich stupni, takže
vznikají přirozené huby jako v reálných sítích.

Velikost a barva uzlu = stupeň (počet spojení): huby jsou velké a teplé.

Použití:
    python examples/stress.py            # 3000 uzlů
    python examples/stress.py 10000      # 10k uzlů
"""
import math
import random
import sys
from collections import Counter

import viewbase as vb

N = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
M = 2                       # kolik spojení přidá každý nový uzel
random.seed(42)             # deterministické pro opakovatelný test

# --- Preferential attachment ---
edges = set()
pool = []                   # uzly opakované podle stupně (tah úměrný stupni)
seed = M + 1
for i in range(seed):       # počáteční malá klika
    for j in range(i + 1, seed):
        edges.add((i, j))
        pool += [i, j]
for new in range(seed, N):
    chosen = set()
    while len(chosen) < M:
        chosen.add(random.choice(pool))
    for t in chosen:
        edges.add((min(new, t), max(new, t)))
        pool += [new, t]

degree = Counter()
for a, b in edges:
    degree[a] += 1
    degree[b] += 1
max_deg = max(degree.values())
print(f"Generuji {N} uzlů, {len(edges)} hran (max stupeň {max_deg}).")


def styl(deg: int):
    norm = math.sqrt(deg / max_deg)           # odmocnina kvůli širokému rozsahu
    size = round(0.5 + 2.8 * norm, 2)
    color = "#{:02x}{:02x}{:02x}".format(
        round(0x3a + (0xff - 0x3a) * norm),
        round(0x7b + (0x52 - 0x7b) * norm),
        round(0xd6 + (0x3a - 0xd6) * norm))
    return size, color


canvas = vb.Canvas(title=f"Stress test ({N} uzlů)", theme="modern", quality="auto")

with canvas.batch():
    for i in range(N):
        size, color = styl(degree[i])
        canvas.add_node(f"n{i}", degree=degree[i], size=size, color=color)
    for a, b in edges:
        canvas.add_edge(f"n{a}", f"n{b}")

print("Graf nahrán, spouštím server.")
vb.serve(canvas, port=8080, open_browser=True)
