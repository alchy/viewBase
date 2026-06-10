# Graph Server

Tento projekt implementuje server pro simulaci grafů s využitím force-directed algoritmu. Grafová data mohou pocházet z různých zdrojů (např. náhodná data, soubor JSON, webová stránka) a systém je navržen tak, aby bylo snadné přidávat nové datové zdroje jako pluginy.

```
pip install -r requirements.txt
```

```
python app.py
```

## Struktura projektu

    app.py: Hlavní Flask aplikace a API endpointy.
    config.py: Konfigurace parametrů (počet uzlů, fyzikální vlastnosti simulace, zdroj dat).
    simulation/: Moduly pro správu grafu a simulaci (graf, fyzika, simulace).
    data_sources/: Pluginy pro načítání dat (náhodná data, soubor, web).
    static/ a templates/: Pro statické soubory a šablony (pokud jsou potřeba).
    requirements.txt: Seznam závislostí.

## Vytvoření nového datového zdroje

Systém umožňuje snadné přidání nového datového zdroje (např. načítání grafu z databáze, API nebo jiného formátu). Níže je popsán postup, jak vytvořit nový datový zdroj, a příklad implementace.

1. V adresáři data_sources/ vytvořte nový soubor, např. database.py.
2. Definujte novou třídu, která dědí z DataSource a implementuje metodu load. Třída musí vracet tuple obsahující graf (slovník sousednosti), pozice uzlů a jejich rychlosti.

Příklad: Datový zdroj pro načítání grafu z databáze
```
"""
Datový zdroj pro načítání grafu z databáze.
"""

from typing import Dict, List, Tuple
import random
from .base import DataSource


class DatabaseDataSource(DataSource):
    """Načítá grafová data z databáze."""

    def load(
        self, config: Dict
    ) -> Tuple[Dict[str, List[str]], Dict[str, List[float]], Dict[str, List[float]]]:
        """
        Načte graf z databáze podle konfigurace.

        Args:
            config: Konfigurační slovník obsahující např. připojovací údaje.

        Returns:
            Tuple obsahující:
            - graf: Slovník {uzel: [sousedé]}
            - pozice: Slovník {uzel: [x, y, z]}
            - rychlosti: Slovník {uzel: [vx, vy, vz]}
        """
        print("Načítám data z databáze...")
        graph = {}
        positions = {}
        velocities = {}

        # Příklad: Simulace načtení 5 uzlů z databáze
        for i in range(5):  # Nahraďte skutečným dotazem do databáze
            node_id = f"db_node_{i}"
            graph[node_id] = []
            positions[node_id] = [
                random.uniform(-config["max_position"], config["max_position"]),
                random.uniform(-config["max_position"], config["max_position"]),
                random.uniform(-config["max_position"], config["max_position"]),
            ]
            velocities[node_id] = [0.0, 0.0, 0.0]

        # Příklad: Přidání hran mezi uzly
        nodes = list(graph.keys())
        if len(nodes) > 1:
            graph[nodes[0]].append(nodes[1])
            graph[nodes[1]].append(nodes[0])

        print(f"Data načtena z databáze: {len(graph)} uzlů, {sum(len(edges) for edges in graph.values()) // 2} hran.")
        return graph, positions, velocities
```

Vysvětlení příkladu:

- Třída DatabaseDataSource simuluje načtení dat z databáze (v reálné implementaci byste použili např. psycopg2 pro PostgreSQL nebo pymysql pro MySQL).
- Vrací graf s pěti uzly a jednou hranou jako ukázku.
- Pozice uzlů jsou inicializovány náhodně podle konfigurace max_position, rychlosti jsou nulové.

## Krok 2: Registrace nového zdroje

1. Otevřete soubor data_sources/__init__.py.
2. Přidejte import nového modulu a zaregistrujte třídu v slovníku sources.

Upravený data_sources/__init__.py:
```
"""
Data sources package for loading graph data.
"""

from .base import DataSource
from .random import RandomDataSource
from .file import FileDataSource
from .web import WebDataSource
from .database import DatabaseDataSource  # Nový import


def load_data_source(source_type: str) -> DataSource:
    """Vytvoří instanci datového zdroje podle typu."""
    sources = {
        "random": RandomDataSource,
        "file": FileDataSource,
        "web": WebDataSource,
        "database": DatabaseDataSource,  # Nový zdroj
    }
    if source_type not in sources:
        raise ValueError(
            f"Neznámý zdroj dat: {source_type}. Použij 'random', 'file', 'web' nebo 'database'."
        )
    return sources[source_type]()
```

Vysvětlení:

- Přidáním DatabaseDataSource do slovníku sources umožníte programu rozpoznat nový zdroj dat při zadání typu "database".

# Krok 3: Konfigurace programu

1. Otevřete soubor config.py.
2. Upravte klíč "data_source" na "database" a přidejte případné další konfigurační parametry potřebné pro váš zdroj (např. připojovací údaje k databázi).

Upravený config.py (ukázka):

```
CONFIG = {
    "max_position": 1024,
    "repulsion_strength": 1000.0,
    "attraction_strength": 0.01,
    "step_size": 0.05,
    "damping": 0.9,
    "max_velocity": 8.0,
    "node_count": 10,
    "edge_count": 20,
    "min_distance": 200.0,
    "num_processes": 4,
    "data_source": "database",  # Změna na nový zdroj
    "file_path": "nodes_test.json",
    "web_url": "https://www.novinky.cz",
    "max_unique_words": 250,
    "degree_factor": 64.0,
    # Příklad: Dodatečné parametry pro databázi
    "db_connection": {
        "host": "localhost",
        "port": 5432,
        "database": "graph_db",
        "user": "admin",
        "password": "secret"
    }
}
```

Vysvětlení:

- Změna "data_source" na "database" říká programu, aby použil nový zdroj.
- Přidání db_connection je ukázka, jak lze rozšířit konfiguraci o parametry specifické pro váš zdroj. Tyto parametry můžete v DatabaseDataSource.load použít pro připojení k databázi.

