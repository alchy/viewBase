"""
Data sources package for loading graph data.

This module provides a factory function to instantiate data source plugins
based on the configuration.
"""

from .base import DataSource
from .random import RandomDataSource
from .file import FileDataSource
from .web import WebDataSource


def load_data_source(source_type: str) -> DataSource:
    """Create a data source instance based on the source type."""
    sources = {
        "random": RandomDataSource,
        "file": FileDataSource,
        "web": WebDataSource,
    }
    if source_type not in sources:
        raise ValueError(
            f"Unknown data source: {source_type}. Use 'random', 'file', or 'web'."
        )
    return sources[source_type]()