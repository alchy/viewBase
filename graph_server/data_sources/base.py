"""
Abstract base class for data sources.

This module defines the DataSource interface that all data source plugins must
implement, ensuring consistency across different data loading methods.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Tuple


class DataSource(ABC):
    """Abstract base class for graph data sources."""

    @abstractmethod
    def load(self, config: Dict) -> Tuple[Dict[str, List[str]], Dict[str, List[float]], Dict[str, List[float]]]:
        """
        Load graph data and return graph, positions, and velocities.

        Returns:
            Tuple containing:
            - graph: Dict[str, List[str]] - Adjacency list of the graph
            - positions: Dict[str, List[float]] - Node positions [x, y, z]
            - velocities: Dict[str, List[float]] - Node velocities [vx, vy, vz]
        """
        pass
        