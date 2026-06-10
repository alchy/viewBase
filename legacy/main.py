"""
Main entry point for the viewBase application.

This script starts the Flask server from the project root directory,
ensuring proper paths for serving static files and running the graph simulation.
"""

import sys
import os

# Add graph_server to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'graph_server'))

# Import and run the Flask app
from graph_server.app import app, main

if __name__ == "__main__":
    # Change to project root to ensure correct file paths
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main()
