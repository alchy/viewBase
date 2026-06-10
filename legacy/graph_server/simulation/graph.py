"""
Graph data structure for the force-directed simulation.

This module defines the Graph class, which encapsulates the graph's nodes,
edges, positions, and velocities, providing methods to manipulate them.
"""

from typing import Dict, List, Tuple
import random
from config import CONFIG


class Graph:
    """Represents a graph with nodes, edges, positions, and velocities."""

    def __init__(self):
        """Initialize an empty graph."""
        self.graph: Dict[str, List[str]] = {}  # Adjacency list: {node: [neighbors]}
        self.positions: Dict[str, List[float]] = {}  # {node: [x, y, z]}
        self.velocities: Dict[str, List[float]] = {}  # {node: [vx, vy, vz]}

    def load_from_data(self, data: Tuple[Dict, Dict, Dict]):
        """Load graph data from a tuple of graph, positions, and velocities."""
        self.graph, self.positions, self.velocities = data
        print(
            f"Graph loaded: {len(self.graph)} nodes, "
            f"{sum(len(edges) for edges in self.graph.values()) // 2} edges"
        )

    def add_node(self, node_id: str):
        """Add a node with random initial position and zero velocity."""
        if node_id not in self.graph:
            self.graph[node_id] = []
            self.positions[node_id] = [
                random.uniform(-CONFIG["max_position"], CONFIG["max_position"]),
                random.uniform(-CONFIG["max_position"], CONFIG["max_position"]),
                random.uniform(-CONFIG["max_position"], CONFIG["max_position"]),
            ]
            self.velocities[node_id] = [0.0, 0.0, 0.0]

    def add_edge(self, source: str, target: str):
        """Add an undirected edge between source and target."""
        if source in self.graph and target in self.graph and source != target:
            if target not in self.graph[source]:
                self.graph[source].append(target)
                self.graph[target].append(source)

    def get_data(self) -> Tuple[Dict, Dict, Dict]:
        """Return graph, positions, and velocities as a tuple."""
        return self.graph, self.positions, self.velocities