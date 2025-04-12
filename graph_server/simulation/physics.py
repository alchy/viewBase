"""
Physics calculations for the force-directed simulation.

This module provides functions to compute repulsive and attractive forces
between nodes, taking into account node degrees for repulsion scaling.
"""

from typing import Dict, List
import math


def compute_forces_subset(
    args: tuple,
) -> Dict[str, List[float]]:
    """Compute forces for a subset of nodes."""
    node_subset, positions, graph, config = args
    forces = {node: [0.0, 0.0, 0.0] for node in node_subset}

    # Repulsive forces
    for node1 in node_subset:
        degree1 = len(graph[node1])
        repulsion_scale = 1.0 + config["degree_factor"] * degree1

        for node2 in positions:
            if node1 == node2:
                continue
            dx = positions[node2][0] - positions[node1][0]
            dy = positions[node2][1] - positions[node1][1]
            dz = positions[node2][2] - positions[node1][2]
            distance = math.sqrt(dx**2 + dy**2 + dz**2) + 0.01

            if distance < config["min_distance"]:
                force = repulsion_scale * config["repulsion_strength"] * (
                    config["min_distance"] - distance
                ) / distance
            else:
                force = repulsion_scale * config["repulsion_strength"] / (distance**2)

            forces[node1][0] -= force * dx / distance
            forces[node1][1] -= force * dy / distance
            forces[node1][2] -= force * dz / distance

    # Attractive forces
    for node in node_subset:
        for target in graph[node]:
            dx = positions[target][0] - positions[node][0]
            dy = positions[target][1] - positions[node][1]
            dz = positions[target][2] - positions[node][2]
            distance = math.sqrt(dx**2 + dy**2 + dz**2) + 0.01
            force = config["attraction_strength"] * distance
            forces[node][0] += force * dx / distance
            forces[node][1] += force * dy / distance
            forces[node][2] += force * dz / distance

    return forces