"""
Random graph data source.

This module provides a data source that generates a random graph with the
specified number of nodes and edges, initializing random positions and zero
velocities.
"""

import random
from typing import Dict, List, Tuple
from .base import DataSource


class RandomDataSource(DataSource):
    """Data source for generating random graph data."""

    def load(
        self, config: Dict
    ) -> Tuple[Dict[str, List[str]], Dict[str, List[float]], Dict[str, List[float]]]:
        """Generate a random graph with specified node and edge counts."""
        print("Generating random graph data...")
        graph = {}
        positions = {}
        velocities = {}

        # Create nodes
        for i in range(config["node_count"]):
            node_id = f"node_{i}"
            graph[node_id] = []
            positions[node_id] = [
                random.uniform(-config["max_position"], config["max_position"]),
                random.uniform(-config["max_position"], config["max_position"]),
                random.uniform(-config["max_position"], config["max_position"]),
            ]
            velocities[node_id] = [0.0, 0.0, 0.0]

        # Add random edges
        edges_added = 0
        nodes = list(graph.keys())
        max_edges = (config["node_count"] * (config["node_count"] - 1)) // 2
        while (
            edges_added < config["edge_count"] and edges_added < max_edges
        ):
            source = random.choice(nodes)
            target = random.choice(nodes)
            if source != target and target not in graph[source]:
                graph[source].append(target)
                graph[target].append(source)
                edges_added += 1

        print(
            f"Random graph generated: {len(graph)} nodes, {edges_added} edges."
        )
        return graph, positions, velocities