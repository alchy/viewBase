"""
File-based graph data source.

This module provides a data source that loads graph data from a JSON file,
parsing nodes and edges into the required format.
"""

import json
from typing import Dict, List, Tuple
from .base import DataSource


class FileDataSource(DataSource):
    """Data source for loading graph data from a JSON file."""

    def load(
        self, config: Dict
    ) -> Tuple[Dict[str, List[str]], Dict[str, List[float]], Dict[str, List[float]]]:
        """Load graph data from a JSON file specified in the config."""
        file_path = config["file_path"]
        print(f"Loading graph data from file: {file_path}")
        try:
            with open(file_path, "r") as f:
                data = json.load(f)

            graph = {}
            positions = {}
            velocities = {}

            # Load nodes
            for node in data.get("nodes", []):
                node_id = node["id"]
                graph[node_id] = []
                positions[node_id] = [
                    node.get("x", 0.0),
                    node.get("y", 0.0),
                    node.get("z", 0.0),
                ]
                velocities[node_id] = [0.0, 0.0, 0.0]

            # Load edges
            for edge in data.get("edges", []):
                source = edge["source"]
                target = edge["target"]
                if source in graph and target in graph:
                    if target not in graph[source]:
                        graph[source].append(target)
                        graph[target].append(source)

            print(
                f"File data loaded: {len(graph)} nodes, "
                f"{sum(len(edges) for edges in graph.values()) // 2} edges."
            )
            return graph, positions, velocities

        except FileNotFoundError:
            print(f"File not found: {file_path}")
            raise
        except json.JSONDecodeError:
            print(f"Error decoding JSON from file: {file_path}")
            raise
        except KeyError as e:
            print(f"Missing key in JSON data: {e}")
            raise