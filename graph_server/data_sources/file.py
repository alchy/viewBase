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

    def load(self, config: Dict) -> Tuple[Dict[str, List[str]], Dict[str, List[float]], Dict[str, List[float]]]:
        """
        Load graph data from a JSON file specified in the config.

        Args:
            config: Configuration dictionary containing the file path under 'file_path'.

        Returns:
            Tuple containing:
            - graph: Dictionary mapping node IDs to lists of neighboring node IDs.
            - positions: Dictionary mapping node IDs to [x, y, z] coordinates.
            - velocities: Dictionary mapping node IDs to [vx, vy, vz] velocities.

        Raises:
            FileNotFoundError: If the specified JSON file does not exist.
            json.JSONDecodeError: If the JSON file is malformed.
            KeyError: If required keys (e.g., 'id', 'source', 'target') are missing.
        """
        # Extract the file path from the configuration
        file_path = config["file_path"]
        # Log the file being loaded for debugging
        print(f"Loading graph data from file: {file_path}")
        
        try:
            # Open and read the JSON file
            with open(file_path, "r") as f:
                data = json.load(f)

            # Initialize empty dictionaries for graph structure, positions, and velocities
            graph = {}  # {node_id: [neighbor_ids]}
            positions = {}  # {node_id: [x, y, z]}
            velocities = {}  # {node_id: [vx, vy, vz]}

            # Load nodes from the JSON data
            # Iterate over the 'nodes' list in the JSON, defaulting to empty list if missing
            for node in data.get("nodes", []):
                # Extract the node ID from the node dictionary
                node_id = node["id"]
                # Initialize an empty list of neighbors for this node
                graph[node_id] = []
                # Set the node's position, defaulting to [0.0, 0.0, 0.0] if coordinates are missing
                positions[node_id] = [
                    node.get("x", 0.0),
                    node.get("y", 0.0),
                    node.get("z", 0.0),
                ]
                # Initialize velocity to zero for all axes
                velocities[node_id] = [0.0, 0.0, 0.0]

            # Load edges from the JSON data
            # Iterate over the 'edges' list in the JSON, defaulting to empty list if missing
            for edge in data.get("edges", []):
                # Extract source and target node IDs from the edge dictionary
                source = edge["source"]
                target = edge["target"]
                # Ensure both source and target nodes exist in the graph
                if source in graph and target in graph:
                    # Prevent adding duplicate edges
                    if target not in graph[source]:
                        # Add target to source's neighbor list (directed edge: source -> target)
                        graph[source].append(target)
                        # Add source to target's neighbor list (directed edge: target -> source)
                        # This ensures the graph is undirected
                        graph[target].append(source)

            # Log the number of nodes and edges loaded for verification
            # Edges are counted by summing the length of neighbor lists and dividing by 2
            # (since each edge is represented twice in an undirected graph)
            print(
                f"File data loaded: {len(graph)} nodes, "
                f"{sum(len(edges) for edges in graph.values()) // 2} edges."
            )
            # Return the graph structure, positions, and velocities as a tuple
            return graph, positions, velocities

        except FileNotFoundError:
            # Handle case where the JSON file does not exist
            print(f"File not found: {file_path}")
            raise
        except json.JSONDecodeError:
            # Handle case where the JSON file is malformed or invalid
            print(f"Error decoding JSON from file: {file_path}")
            raise
        except KeyError as e:
            # Handle case where required keys (e.g., 'id', 'source', 'target') are missing
            print(f"Missing key in JSON data: {e}")
            raise