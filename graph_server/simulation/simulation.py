"""
Force-directed graph simulation.

This module defines the Simulation class, which runs the force-directed
algorithm in a separate thread, updating node positions based on computed forces.
"""

import threading
import time
from multiprocessing import Pool
from typing import Dict, List
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

    def update_positions(self):
        """Run the simulation loop, updating node positions until stabilized."""
        print("Starting simulation...")
        graph, positions, velocities = self.graph.get_data()

        with Pool(processes=self.config["num_processes"]) as pool:
            while self.is_running:
                movement = 0.0
                nodes = list(positions.keys())
                chunk_size = max(1, len(nodes) // self.config["num_processes"])
                node_chunks = [
                    nodes[i : i + chunk_size]
                    for i in range(0, len(nodes), chunk_size)
                ]

                # Compute forces in parallel
                force_results = pool.map(
                    compute_forces_subset,
                    [
                        (chunk, positions, graph, self.config)
                        for chunk in node_chunks
                    ],
                )
                forces = {}
                for result in force_results:
                    forces.update(result)

                # Update velocities and positions
                for node in positions:
                    velocities[node][0] = (
                        velocities[node][0] + forces[node][0]
                    ) * self.config["damping"]
                    velocities[node][1] = (
                        velocities[node][1] + forces[node][1]
                    ) * self.config["damping"]
                    velocities[node][2] = (
                        velocities[node][2] + forces[node][2]
                    ) * self.config["damping"]

                    # Cap velocity
                    speed = sum(v**2 for v in velocities[node]) ** 0.5
                    if speed > self.config["max_velocity"]:
                        scale = self.config["max_velocity"] / speed
                        velocities[node] = [v * scale for v in velocities[node]]

                    # Update position
                    positions[node][0] += velocities[node][0]
                    positions[node][1] += velocities[node][1]
                    positions[node][2] += velocities[node][2]
                    movement += sum(abs(v) for v in velocities[node])

                # Center the graph
                center = [
                    sum(pos[i] for pos in positions.values()) / len(positions)
                    for i in range(3)
                ]
                for node in positions:
                    for i in range(3):
                        positions[node][i] = max(
                            -self.config["max_position"],
                            min(
                                self.config["max_position"],
                                positions[node][i] - center[i],
                            ),
                        )

                print(f"Simulation step, movement: {movement:.2f}")
                if movement < 1.0:
                    print("Simulation stabilized.")
                    self.is_running = False

                time.sleep(self.config["step_size"])

    def start(self):
        """Start the simulation in a separate thread."""
        if not self.is_running:
            self.is_running = True
            self.simulation_thread = threading.Thread(target=self.update_positions)
            self.simulation_thread.daemon = True
            self.simulation_thread.start()
            print("Simulation started in a separate thread.")

    def stop(self):
        """Stop the simulation."""
        self.is_running = False
        if self.simulation_thread:
            self.simulation_thread.join()
        print("Simulation stopped.")