"""
Main Flask application for the graph server.

This module sets up the Flask app, defines API endpoints, and starts the
force-directed graph simulation. It integrates the simulation and data source
modules to serve graph data to clients.
"""

from flask import Flask, request, jsonify, send_from_directory
import os, sys
from simulation.graph import Graph
from simulation.simulation import Simulation
from data_sources import load_data_source
from config import CONFIG

app = Flask(__name__)

# Initialize graph and simulation
graph = Graph()
simulation = Simulation(graph, CONFIG)


@app.route('/')
def index():
    """Root endpoint indicating the server is running."""
    return "Graph Server is running. Use /api/v1.0/get-graph-data for graph data."


@app.route('/<path:filename>')
def serve_file(filename):
    """Serve static files from the current directory."""
    print(f"Serving file: {filename}")
    return send_from_directory(os.getcwd(), filename)


@app.route('/api/v1.0/get-graph-data')
def get_graph_data():
    """API endpoint to retrieve current graph data as JSON."""
    print("Processing API request for graph data...")
    nodes = [
        {"id": node, "x": pos[0], "y": pos[1], "z": pos[2]}
        for node, pos in graph.positions.items()
    ]
    edges = [
        {"source": source, "target": target}
        for source in graph.graph
        for target in graph.graph[source]
        if source < target  # Avoid duplicate edges
    ]
    response = {"nodes": nodes, "edges": edges}
    print("API request processed successfully.")
    return jsonify(response)


@app.route('/api/v1.0/post-label-click', methods=['POST'])
def handle_label_click():
    """
    API endpoint to receive node click information from the frontend.
    Expects a JSON body like: {"nodeId": "some_node_id", "timestamp": "iso_timestamp"}
    """
    print("Received request on /api/v1.0/post-label-click")
    
    # Získání JSON dat z těla požadavku
    data = request.get_json()

    # Kontrola, zda byla data přijata a jsou ve formátu JSON
    if not data:
        print("Error: No JSON data received or Content-Type incorrect.", file=sys.stderr)
        return jsonify({"status": "error", "message": "Invalid request. Expected JSON data."}), 400 # Bad Request

    # Extrahování 'nodeId' z JSON dat
    node_id = data.get('nodeId')
    timestamp = data.get('timestamp') # Můžeme získat i timestamp pro případné logování

    # Kontrola, zda 'nodeId' existuje v datech
    if node_id is None:
        print("Error: 'nodeId' missing in received JSON data.", file=sys.stderr)
        # Odpověď klientovi, že data jsou neúplná
        return jsonify({"status": "error", "message": "'nodeId' is required in JSON body."}), 400 # Bad Request

    # *** Požadovaná akce: Vytisknutí přijatého nodeId na konzoli serveru ***
    print(f"--- Label Click Received ---")
    print(f"  Node ID: {node_id}")
    if timestamp:
        print(f"  Timestamp: {timestamp}")
    print(f"--------------------------")
    sys.stdout.flush() # Zajistí okamžitý výpis na konzoli

    # Zde můžete v budoucnu přidat další logiku, např.:
    # - Uložit kliknutí do databáze
    # - Spustit nějakou akci v simulaci na základě kliknutého uzlu
    # - Poslat informaci dalším připojeným klientům (přes WebSockets atd.)

    # Odeslání úspěšné odpovědi zpět klientovi (JavaScriptu)
    return jsonify({
        "status": "success",
        "message": f"Click event for node '{node_id}' received successfully."
    }), 200 # HTTP status code 200 OK


def main():
    """Initialize and run the graph server."""
    print("Starting Graph Server...")
    try:
        # Load initial graph data from the configured data source
        data_source = load_data_source(CONFIG["data_source"])
        graph_data = data_source.load(CONFIG)
        graph.load_from_data(graph_data)
        # Start the simulation
        simulation.start()
        # Run Flask app
        app.run(host='0.0.0.0', port=8080, debug=True, use_reloader=False)
    except Exception as e:
        print(f"Error starting server: {e}")


if __name__ == "__main__":
    main()