from flask import Flask, jsonify, send_from_directory
import random
import threading
import time
import os
import math
import json
import requests
from bs4 import BeautifulSoup
import re
from collections import Counter
from multiprocessing import Pool, cpu_count
from functools import partial

app = Flask(__name__)

# Konfigurace parametrů grafu
GRAPH_CONFIG = {
    "max_position": 1024,
    "repulsion_strength": 1000.0,
    "attraction_strength": 0.01,
    "step_size": 0.05,
    "damping": 0.9,
    "max_velocity": 8.0,
    "node_count": 10,
    "edge_count": 20,
    "min_distance": 200.0,
    "num_processes": cpu_count(),
    "data_source": "web",
    "file_path": "nodes_test.json",
    "web_url": "https://www.novinky.cz",
    "max_unique_words": 250,
    "degree_factor": 64.0  # Faktor pro zesílení odpudivé síly podle stupně uzlu
}

graph = None
positions = {}  # Formát: {"node_0": [x, y, z], ...}
velocities = {}  # Formát: {"node_0": [vx, vy, vz], ...}
is_simulation_running = False

def generate_random_graph_data(node_count, edge_count):
    """Generuje náhodná data pro graf."""
    print("Generování náhodných dat pro graf...")
    graph = {}
    positions = {}
    velocities = {}
    
    for i in range(node_count):
        node_id = f"node_{i}"
        graph[node_id] = []
        positions[node_id] = [
            random.uniform(-GRAPH_CONFIG["max_position"], GRAPH_CONFIG["max_position"]),
            random.uniform(-GRAPH_CONFIG["max_position"], GRAPH_CONFIG["max_position"]),
            random.uniform(-GRAPH_CONFIG["max_position"], GRAPH_CONFIG["max_position"])
        ]
        velocities[node_id] = [0.0, 0.0, 0.0]
    
    edges_added = 0
    nodes = list(graph.keys())
    while edges_added < edge_count and edges_added < (node_count * (node_count - 1)) // 2:
        source = random.choice(nodes)
        target = random.choice(nodes)
        if source != target and target not in graph[source]:
            graph[source].append(target)
            graph[target].append(source)
            edges_added += 1
    
    print(f"Náhodná data vygenerována: {node_count} nodů, {edges_added} hran.")
    return graph, positions, velocities

def load_graph_from_file(file_path):
    """Načte data grafu z JSON souboru."""
    print(f"Načítám data z souboru: {file_path}")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        graph = {}
        positions = {}
        velocities = {}
        
        for node in data.get("nodes", []):
            node_id = node["id"]
            graph[node_id] = []
            positions[node_id] = [
                node.get("x", 0.0),
                node.get("y", 0.0),
                node.get("z", 0.0)
            ]
            velocities[node_id] = [0.0, 0.0, 0.0]
        
        for edge in data.get("edges", []):
            source = edge["source"]
            target = edge["target"]
            if source in graph and target in graph:
                if target not in graph[source]:
                    graph[source].append(target)
                if source not in graph[target]:
                    graph[target].append(source)
        
        print(f"Data načtena: {len(graph)} nodů, {sum(len(edges) for edges in graph.values()) // 2} hran.")
        return graph, positions, velocities
    
    except FileNotFoundError:
        print(f"Soubor {file_path} nenalezen!")
        raise
    except json.JSONDecodeError:
        print(f"Chyba při dekódování JSON ze souboru {file_path}!")
        raise
    except KeyError as e:
        print(f"Chybějící klíč v JSON datech: {e}")
        raise

def load_graph_from_web(web_url):
    """Načte text z webové stránky a vytvoří graf z nejčastějších slov."""
    print(f"Načítám text z webu: {web_url}")
    try:
        response = requests.get(web_url, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        for script in soup(["script", "style"]):
            script.decompose()
        text = soup.get_text()
        
        words = re.findall(r'\b\w+\b', text.lower())
        if not words:
            raise ValueError("Žádná slova nenalezena na webové stránce!")
        
        word_freq = Counter(words)
        
        print("10 nejčastějších slov:")
        for word, freq in word_freq.most_common(10):
            print(f"  {word}: {freq} výskytů")
        
        most_common_words = [word for word, _ in word_freq.most_common(GRAPH_CONFIG["max_unique_words"])]
        valid_words = set(most_common_words)
        
        graph = {}
        positions = {}
        velocities = {}
        
        for i, word in enumerate(most_common_words):
            graph[word] = []
            positions[word] = [
                random.uniform(-GRAPH_CONFIG["max_position"], GRAPH_CONFIG["max_position"]),
                random.uniform(-GRAPH_CONFIG["max_position"], GRAPH_CONFIG["max_position"]),
                random.uniform(-GRAPH_CONFIG["max_position"], GRAPH_CONFIG["max_position"])
            ]
            velocities[word] = [0.0, 0.0, 0.0]
        
        for i in range(len(words)):
            current_word = words[i]
            if current_word not in valid_words:
                continue
            if i > 0:
                prev_word = words[i - 1]
                if prev_word in valid_words and prev_word not in graph[current_word]:
                    graph[current_word].append(prev_word)
                    graph[prev_word].append(current_word)
            if i < len(words) - 1:
                next_word = words[i + 1]
                if next_word in valid_words and next_word not in graph[current_word]:
                    graph[current_word].append(next_word)
                    graph[next_word].append(current_word)
        
        # Diagnostika stupňů uzlů
        print("5 uzlů s nejvyšším stupněm:")
        degrees = sorted([(node, len(edges)) for node, edges in graph.items()], key=lambda x: x[1], reverse=True)
        for node, degree in degrees[:5]:
            print(f"  {node}: {degree} vazeb")
        
        print(f"Data z webu načtena: {len(graph)} unikátních slov, {sum(len(edges) for edges in graph.values()) // 2} hran.")
        return graph, positions, velocities
    
    except requests.RequestException as e:
        print(f"Chyba při stahování webu: {e}")
        raise
    except ValueError as e:
        print(f"Chyba při zpracování textu: {e}")
        raise

def generate_initial_graph():
    """Obecná funkce pro generování počátečního grafu."""
    global graph, positions, velocities
    data_source = GRAPH_CONFIG["data_source"]
    
    if data_source == "random":
        graph, positions, velocities = generate_random_graph_data(
            GRAPH_CONFIG["node_count"], GRAPH_CONFIG["edge_count"]
        )
    elif data_source == "file":
        graph, positions, velocities = load_graph_from_file(GRAPH_CONFIG["file_path"])
    elif data_source == "web":
        graph, positions, velocities = load_graph_from_web(GRAPH_CONFIG["web_url"])
    else:
        raise ValueError(f"Neznámý zdroj dat: {data_source}. Použij 'random', 'file' nebo 'web'.")

def compute_forces_subset(node_subset, positions, graph):
    """Výpočet sil pro podmnožinu nodů s ohledem na stupeň uzlu."""
    forces = {node: [0.0, 0.0, 0.0] for node in node_subset}
    all_nodes = list(positions.keys())
    
    for node1 in node_subset:
        degree1 = len(graph[node1])  # Stupeň uzlu (počet vazeb)
        repulsion_scale = 1.0 + GRAPH_CONFIG["degree_factor"] * degree1  # Zesílení odpudivé síly
        
        for node2 in all_nodes:
            if node1 == node2:
                continue
            dx = positions[node2][0] - positions[node1][0]
            dy = positions[node2][1] - positions[node1][1]
            dz = positions[node2][2] - positions[node1][2]
            distance = math.sqrt(dx**2 + dy**2 + dz**2) + 0.01
            if distance < GRAPH_CONFIG["min_distance"]:
                force = repulsion_scale * GRAPH_CONFIG["repulsion_strength"] * (GRAPH_CONFIG["min_distance"] - distance) / distance
            else:
                force = repulsion_scale * GRAPH_CONFIG["repulsion_strength"] / (distance**2)
            fx = force * dx / distance
            fy = force * dy / distance
            fz = force * dz / distance
            forces[node1][0] -= fx
            forces[node1][1] -= fy
            forces[node1][2] -= fz
    
    for node in node_subset:
        for target in graph[node]:
            dx = positions[target][0] - positions[node][0]
            dy = positions[target][1] - positions[node][1]
            dz = positions[target][2] - positions[node][2]
            distance = math.sqrt(dx**2 + dy**2 + dz**2) + 0.01
            force = GRAPH_CONFIG["attraction_strength"] * distance
            fx = force * dx / distance
            fy = force * dy / distance
            fz = force * dz / distance
            forces[node][0] += fx
            forces[node][1] += fy
            forces[node][2] += fz
    
    return forces

def update_positions():
    """Vlastní force-directed algoritmus s paralelním výpočtem."""
    global positions, velocities, is_simulation_running
    print("Spouštím simulaci pozic nodů...")
    
    with Pool(processes=GRAPH_CONFIG["num_processes"]) as pool:
        while is_simulation_running:
            movement = 0.0
            nodes = list(positions.keys())
            
            chunk_size = max(1, len(nodes) // GRAPH_CONFIG["num_processes"])
            node_chunks = [nodes[i:i + chunk_size] for i in range(0, len(nodes), chunk_size)]
            
            force_results = pool.map(partial(compute_forces_subset, positions=positions, graph=graph), node_chunks)
            forces = {}
            for result in force_results:
                forces.update(result)
            
            for node in positions:
                velocities[node][0] = (velocities[node][0] + forces[node][0]) * GRAPH_CONFIG["damping"]
                velocities[node][1] = (velocities[node][1] + forces[node][1]) * GRAPH_CONFIG["damping"]
                velocities[node][2] = (velocities[node][2] + forces[node][2]) * GRAPH_CONFIG["damping"]
                
                speed = math.sqrt(sum(v**2 for v in velocities[node]))
                if speed > GRAPH_CONFIG["max_velocity"]:
                    scale = GRAPH_CONFIG["max_velocity"] / speed
                    velocities[node] = [v * scale for v in velocities[node]]
                
                positions[node][0] += velocities[node][0]
                positions[node][1] += velocities[node][1]
                positions[node][2] += velocities[node][2]
                
                movement += sum(abs(v) for v in velocities[node])
            
            center_x = sum(pos[0] for pos in positions.values()) / len(positions)
            center_y = sum(pos[1] for pos in positions.values()) / len(positions)
            center_z = sum(pos[2] for pos in positions.values()) / len(positions)
            for node in positions:
                positions[node][0] -= center_x
                positions[node][1] -= center_y
                positions[node][2] -= center_z
                positions[node] = [
                    max(-GRAPH_CONFIG["max_position"], min(GRAPH_CONFIG["max_position"], positions[node][0])),
                    max(-GRAPH_CONFIG["max_position"], min(GRAPH_CONFIG["max_position"], positions[node][1])),
                    max(-GRAPH_CONFIG["max_position"], min(GRAPH_CONFIG["max_position"], positions[node][2]))
                ]
            
            print(f"Krok simulace, pohyb: {movement:.2f}")
            for node in positions:
                print(f"  {node}: {positions[node]}")
            
            if movement < 1.0:
                print("Simulace stabilizována, pozice nodů se již nemění.")
                is_simulation_running = False
            
            time.sleep(GRAPH_CONFIG["step_size"])

def start_simulation():
    """Spustí simulaci grafu v samostatném vlákně."""
    global is_simulation_running
    if not is_simulation_running:
        is_simulation_running = True
        simulation_thread = threading.Thread(target=update_positions)
        simulation_thread.daemon = True
        simulation_thread.start()
        print("Simulace spuštěna v samostatném vlákně.")

@app.route('/')
def index():
    return "Graph Server je spuštěn. Použij /api/v1.0/get-graph-data pro data grafu."

@app.route('/<path:filename>')
def serve_file(filename):
    print(f"Požadavek na soubor: {filename}")
    return send_from_directory(os.getcwd(), filename)

@app.route('/api/v1.0/get-graph-data')
def get_graph_data():
    """API endpoint pro získání dat grafu ve formátu JSON."""
    print("Zpracovávám API požadavek na data grafu...")
    
    nodes = [{"id": node, "x": positions[node][0], "y": positions[node][1], "z": positions[node][2]} 
             for node in graph]
    edges = [{"source": source, "target": target} 
             for source in graph for target in graph[source] if source < target]
    
    response = {"nodes": nodes, "edges": edges}
    print("API požadavek úspěšně zpracován.")
    return jsonify(response)

def main():
    print("Spouštím Graph Server...")
    try:
        generate_initial_graph()
        start_simulation()
        app.run(host='0.0.0.0', port=8080, debug=True, use_reloader=False)
    except Exception as e:
        print(f"Chyba při spuštění: {e}")

if __name__ == "__main__":
    main()