"""
Force-directed graph simulation.

This module defines the Simulation class, which runs the force-directed
algorithm in a separate thread, updating node positions based on computed forces.
"""

import threading
import time
import sys
from multiprocessing import Pool
from typing import Dict, List, Optional
from simulation.physics import compute_forces_subset
from simulation.graph import Graph
from config import CONFIG


class Simulation:
    """Manages the force-directed simulation of a graph."""

    def __init__(self, graph: Graph, config: Dict):
        """Initialize the simulation with a graph and configuration."""
        self.graph = graph
        self.config = config
        self.is_running = False
        self.simulation_thread = None
        self.target_center_node_id: Optional[str] = None # ID uzlu, na který se má centrovat (None = výchozí centrování)
        self.center_lock = threading.Lock() # Zámek pro bezpečný přístup k target_center_node_id


    def set_center_target(self, node_id: Optional[str]):
        """Safely sets the target node for centering."""
        with self.center_lock:
            # Ověření, zda uzel vůbec existuje v grafu, než ho nastavíme
            # Přistupujeme k self.graph.positions, což by mělo být bezpečné,
            # pokud je slovník modifikován hlavně tímto vláknem nebo chráněn jinde.
            # Pokud ne, vyžadovalo by to další zámek kolem přístupu k positions.
            if node_id is None:
                 self.target_center_node_id = None
                 print(f"[Simulation] Center target reset to default (geometric center).")
            elif node_id in self.graph.positions:
                self.target_center_node_id = node_id
                print(f"[Simulation] Center target set to node: {node_id}")
            else:
                # Uzel nebyl nalezen, logujeme varování, ale neměníme cíl
                print(f"[Simulation] Warning: Node '{node_id}' not found. Center target remains unchanged ({self.target_center_node_id}).", file=sys.stderr)
    
    def update_positions(self):
        """Run the simulation loop, updating node positions until stabilized."""
        print("[Simulation Update Loop] Starting...")
        
        # Získání dat - předpokládáme, že get_data vrací slovníky, které lze modifikovat
        # a že tyto modifikace jsou viditelné i pro Flask endpoint (např. přes self.graph.positions)
        # Pokud get_data vrací kopie, museli bychom data aktualizovat zpět do self.graph
        graph_adj, positions, velocities = self.graph.get_data()

        if not positions:
            print("[Simulation Update Loop] No nodes to simulate. Stopping.", file=sys.stderr)
            self.is_running = False
            return

        # Použití multiprocessing Pool pro paralelní výpočty
        try:
            # Použití 'spawn' může být stabilnější na některých platformách (Windows)
            # import multiprocessing
            # ctx = multiprocessing.get_context('spawn')
            # with ctx.Pool(processes=self.config["num_processes"]) as pool:
            with Pool(processes=self.config["num_processes"]) as pool:
                while self.is_running:
                    start_time = time.time()
                    movement = 0.0
                    nodes = list(positions.keys()) # Aktuální seznam uzlů pro tuto iteraci

                    if not nodes: # Kontrola pro případ, že by se uzly odstranily během běhu
                         print("[Simulation Update Loop] No nodes left in this iteration.")
                         break

                    chunk_size = max(1, len(nodes) // self.config["num_processes"])
                    node_chunks = [
                        nodes[i : i + chunk_size]
                        for i in range(0, len(nodes), chunk_size)
                    ]

                    # 1. Výpočet sil (paralelně)
                    map_args = [
                        (chunk, positions, graph_adj, self.config)
                        for chunk in node_chunks
                    ]
                    force_results = pool.map(compute_forces_subset, map_args)
                    forces = {}
                    for result in force_results:
                        forces.update(result)

                    # Zajištění, že síla existuje pro každý uzel (pro případ chyby ve výpočtu)
                    for node in nodes:
                        if node not in forces:
                            forces[node] = [0.0, 0.0, 0.0]
                            # print(f"[Simulation] Warning: Force calculation missing for node {node}. Setting to zero.", file=sys.stderr)


                    # 2. Aktualizace rychlostí a pozic (sekvenčně)
                    for node in nodes:
                        if node not in positions or node not in velocities:
                             # print(f"[Simulation] Warning: Node {node} disappeared during velocity/position update.", file=sys.stderr)
                             continue # Přeskočíme uzel, který mezitím zmizel

                        # Aktualizace rychlosti (s tlumením)
                        velocities[node][0] = (velocities[node][0] + forces[node][0]) * self.config["damping"]
                        velocities[node][1] = (velocities[node][1] + forces[node][1]) * self.config["damping"]
                        velocities[node][2] = (velocities[node][2] + forces[node][2]) * self.config["damping"]

                        # Omezení rychlosti
                        speed_sq = sum(v**2 for v in velocities[node])
                        max_vel_sq = self.config["max_velocity"] ** 2
                        if speed_sq > max_vel_sq and speed_sq > 1e-9: # Přidána ochrana proti dělení nulou
                            scale = (max_vel_sq / speed_sq) ** 0.5
                            velocities[node] = [v * scale for v in velocities[node]]

                        # Aktualizace pozice
                        positions[node][0] += velocities[node][0]
                        positions[node][1] += velocities[node][1]
                        positions[node][2] += velocities[node][2]
                        
                        # Celkový pohyb v tomto kroku
                        movement += sum(abs(v) for v in velocities[node])


                    # 3. Centrování grafu (MODIFIKOVANÁ ČÁST)
                    
                    # Přečtení cílového uzlu bezpečně (pod zámkem)
                    current_target_node_id = None
                    with self.center_lock:
                        current_target_node_id = self.target_center_node_id

                    # Výpočet středu ('center')
                    center = [0.0, 0.0, 0.0] # Výchozí bod, pokud nelze určit jinak
                    if current_target_node_id and current_target_node_id in positions:
                        # Pokud máme platný cíl, jeho pozice je nový střed
                        center = positions[current_target_node_id][:] # Důležité: Vytvořit kopii pozice!
                        # print(f"[Simulation Centering] Using target node {current_target_node_id} at {center} as center.")
                    elif positions:
                        # Pokud není cíl nebo je neplatný, použijeme geometrický střed
                        num_pos = len(positions)
                        center = [
                            sum(pos[i] for pos in positions.values()) / num_pos
                            for i in range(3)
                        ]
                        # print(f"[Simulation Centering] Using geometric center: {center}")

                    # Aplikace centrování a omezení pozic
                    for node in nodes:
                         if node not in positions: continue # Uzel mezitím zmizel

                         for i in range(3):
                             # Posuneme pozici tak, aby vypočtený 'center' byl v [0,0,0]
                             shifted_pos = positions[node][i] - center[i]
                             
                             # Aplikujeme omezení maximální pozice relativně k [0,0,0]
                             positions[node][i] = max(
                                 -self.config["max_position"],
                                 min(self.config["max_position"], shifted_pos),
                             )

                    # 4. Kontrola stability a zpoždění
                    iteration_time = time.time() - start_time
                    print(f"[Simulation Update Loop] Step finished. Movement: {movement:.4f}, Time: {iteration_time:.4f}s")
                    sys.stdout.flush()

                    # Podmínka ukončení simulace (pokud se uzly téměř nepohybují)
                    # Zvýšíme threshold pro menší citlivost
                    if movement < self.config.get("stability_threshold", 0.01): # Použijeme hodnotu z configu nebo default 0.01
                        print(f"[Simulation Update Loop] Stabilized (Movement {movement:.4f} < {self.config.get('stability_threshold', 0.01)}). Stopping simulation loop.")
                        self.is_running = False # Ukončí while cyklus

                    # Zpoždění mezi kroky simulace
                    sleep_duration = max(0, self.config["step_size"] - iteration_time)
                    if sleep_duration > 0:
                         time.sleep(sleep_duration)

        except Exception as e:
             print(f"[Simulation Update Loop] Error occurred: {e}", file=sys.stderr)
             import traceback
             traceback.print_exc()
        finally:
             print("[Simulation Update Loop] Exiting.")
             self.is_running = False # Zajistí, že se flag nastaví i při chybě

    def start(self):
        """Start the simulation in a separate thread."""
        if self.is_running:
             print("[Simulation Start] Simulation is already running.")
             return
             
        # Před startem resetujeme cíl centrování na výchozí
        self.set_center_target(None) 
        
        self.is_running = True
        # Předáme self.update_positions jako cíl vlákna
        self.simulation_thread = threading.Thread(target=self.update_positions, name="SimulationThread")
        self.simulation_thread.daemon = True # Vlákno se ukončí, když skončí hlavní program
        self.simulation_thread.start()
        print("[Simulation Start] Simulation started in a separate thread.")

    def stop(self):
        """Stop the simulation."""
        if not self.is_running and not (self.simulation_thread and self.simulation_thread.is_alive()):
            print("[Simulation Stop] Simulation is not running.")
            return

        print("[Simulation Stop] Stopping simulation...")
        self.is_running = False # Nastaví flag pro ukončení while cyklu v update_positions
        
        if self.simulation_thread and self.simulation_thread.is_alive():
            # Počkáme, dokud se vlákno simulace samo neukončí (max. timeout)
            # Zvýšíme timeout pro případ delšího výpočtu/čekání
            join_timeout = self.config.get("stop_timeout", 5.0) # Default 5 sekund
            self.simulation_thread.join(timeout=join_timeout)
            if self.simulation_thread.is_alive():
                 print(f"[Simulation Stop] Warning: Simulation thread did not stop within {join_timeout} seconds.", file=sys.stderr)
            else:
                 print("[Simulation Stop] Simulation thread stopped.")
        else:
             print("[Simulation Stop] Simulation thread was not running or already finished.")
        self.simulation_thread = None # Uvolníme referenci na vlákno