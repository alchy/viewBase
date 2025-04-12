"""
Configuration settings for the graph server.

This module defines all configurable parameters used across the application,
such as graph properties, simulation physics, and data source settings.
"""

CONFIG = {
    "max_position": 1024,                    # Maximum coordinate value for node positions
    "repulsion_strength": 1000.0,            # Strength of repulsive force between nodes
    "attraction_strength": 0.01,             # Strength of attractive force along edges
    "step_size": 0.05,                       # Time step for simulation updates
    "damping": 0.9,                          # Velocity damping factor to stabilize simulation
    "max_velocity": 8.0,                     # Maximum velocity for nodes
    "node_count": 10,                        # Number of nodes for random graph
    "edge_count": 20,                        # Number of edges for random graph
    "min_distance": 200.0,                   # Minimum distance for repulsive force calculation
    "num_processes": 4,                      # Number of processes for parallel computation
    "data_source": "web",                    # Data source: 'random', 'file', or 'web'
    "file_path": "nodes_test.json",          # Path to JSON file for file-based data
    "web_url": "https://www.novinky.cz",     # URL for web-based data
    "max_unique_words": 250,                 # Maximum unique words for web data
    "degree_factor": 64.0                    # Factor to scale repulsion by node degree
}