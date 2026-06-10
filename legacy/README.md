# viewBase

**3D grafová vizualizační aplikace s force-directed simulací**

## Popis projektu

viewBase je hybridní aplikace kombinující Python backend (Flask + force-directed simulace) s JavaScript frontendem (Three.js 3D vizualizace). Umožňuje vytváření, simulaci a interaktivní vizualizaci grafů v 3D prostoru.

### Hlavní funkce:
- 🎯 Force-directed algoritmus pro automatické rozmístění uzlů
- 🌐 3 zdroje dat: náhodný graf, JSON soubor, web scraping
- 🖱️ Interaktivní ovládání (myš, klávesnice)
- ⚡ Paralelní výpočty pomocí multiprocessing
- 📊 Real-time vizualizace v Three.js

## Instalace a spuštění

### 1. Vytvoření virtuálního prostředí a instalace závislostí

```bash
# Vytvořit virtuální prostředí
python -m venv .venv

# Aktivovat (Windows)
.venv\Scripts\activate

# Aktivovat (Linux/Mac)
source .venv/bin/activate

# Nainstalovat závislosti
pip install -r requirements.txt
```

### 2. Spuštění serveru

```bash
python main.py
```

Server poběží na **http://localhost:8080**

### 3. Otevření v prohlížeči

Otevřete prohlížeč a přejděte na:
```
http://localhost:8080
```

**DŮLEŽITÉ:** Nepoužívejte `file://` protokol! Aplikace musí běžet přes HTTP server.

## Ovládání vizualizace

### Myš:
- **Levé tlačítko + táhnout** - rotace kamery
- **Kolečko** - zoom

### Klávesnice:
- **W/S** - náklon kamery
- **A/D** - otáčení kamery
- **Q/E** - zoom
- **Mezerník** - reset pohledu

## Struktura projektu

```
viewBase/
├── main.py                      # Hlavní vstupní bod aplikace
├── requirements.txt             # Python závislosti
├── index.html                   # Hlavní HTML stránka
├── scene.js                     # Three.js vizualizace
├── *_controller.js              # UI kontrollery
├── graph_server/                # Python backend
│   ├── app.py                   # Flask API server
│   ├── config.py                # Konfigurace simulace
│   ├── simulation/              # Force-directed algoritmus
│   │   ├── graph.py
│   │   ├── physics.py
│   │   └── simulation.py
│   └── data_sources/            # Pluginy pro data
│       ├── random.py
│       ├── file.py
│       └── web.py
└── .venv/                       # Virtuální prostředí (gitignore)
```

## API Endpointy

- `GET /` - Vrací index.html
- `GET /api/v1.0/get-graph-data` - Vrací aktuální data grafu (JSON)
- `POST /api/v1.0/post-label-click` - Příjímá kliknutí na uzel

## Konfigurace

Upravte `graph_server/config.py` pro změnu:
- Zdroje dat (`random`, `file`, `web`)
- Fyzikálních parametrů simulace
- Počtu uzlů a hran
- URL pro web scraping

## Technologie

**Backend:**
- Python 3.12
- Flask 3.1
- Multiprocessing pro paralelní výpočty

**Frontend:**
- Three.js 0.134
- JavaScript ES6 Modules
- CSS2DRenderer pro labely

## Řešení problémů

### Port 8080 je obsazený
```bash
# Windows
netstat -ano | findstr :8080
taskkill //F //PID <PID>

# Linux/Mac
lsof -i :8080
kill -9 <PID>
```

### API vrací 404
Ujistěte se, že spouštíte server přes `python main.py` z hlavního adresáře projektu.

### CORS chyby v browseru
Neotevírejte HTML soubor přímo (`file://`). Vždy používejte `http://localhost:8080`.