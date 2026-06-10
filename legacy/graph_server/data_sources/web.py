"""
Web-based graph data source.

This module provides a data source that scrapes text from a web page,
creates a graph based on word co-occurrences, and initializes random positions.
"""

import random
import requests
from bs4 import BeautifulSoup
import re
from collections import Counter
from typing import Dict, List, Tuple
from .base import DataSource


class WebDataSource(DataSource):
    """Data source for generating a graph from web page text."""

    def load(self, config: Dict) -> Tuple[Dict[str, List[str]], Dict[str, List[float]], Dict[str, List[float]]]:
        """Load text from a web page and create a graph from word co-occurrences."""
        web_url = config["web_url"]
        print(f"Loading text from web: {web_url}")
        try:
            response = requests.get(web_url, timeout=10)
            response.raise_for_status()

            # Parse HTML and extract text
            soup = BeautifulSoup(response.text, "html.parser")
            for script in soup(["script", "style"]):
                script.decompose()
            text = soup.get_text()

            # Extract words
            words = re.findall(r"\b\w+\b", text.lower())
            if not words:
                raise ValueError("No words found on the web page!")

            # Get most common words
            word_freq = Counter(words)
            print("Top 10 most frequent words:")
            for word, freq in word_freq.most_common(10):
                print(f"  {word}: {freq} occurrences")

            most_common_words = [
                word
                for word, _ in word_freq.most_common(
                    config["max_unique_words"]
                )
            ]
            valid_words = set(most_common_words)

            # Initialize graph
            graph = {}
            positions = {}
            velocities = {}
            for word in most_common_words:
                graph[word] = []
                positions[word] = [
                    random.uniform(
                        -config["max_position"], config["max_position"]
                    ),
                    random.uniform(
                        -config["max_position"], config["max_position"]
                    ),
                    random.uniform(
                        -config["max_position"], config["max_position"]
                    ),
                ]
                velocities[word] = [0.0, 0.0, 0.0]

            # Create edges based on word co-occurrences
            for i in range(len(words)):
                current_word = words[i]
                if current_word not in valid_words:
                    continue
                if i > 0:
                    prev_word = words[i - 1]
                    if (
                        prev_word in valid_words
                        and prev_word not in graph[current_word]
                    ):
                        graph[current_word].append(prev_word)
                        graph[prev_word].append(current_word)
                if i < len(words) - 1:
                    next_word = words[i + 1]
                    if (
                        next_word in valid_words
                        and next_word not in graph[current_word]
                    ):
                        graph[current_word].append(next_word)
                        graph[next_word].append(current_word)

            # Log node degrees
            print("Top 5 nodes by degree:")
            degrees = sorted(
                [(node, len(edges)) for node, edges in graph.items()],
                key=lambda x: x[1],
                reverse=True,
            )
            for node, degree in degrees[:5]:
                print(f"  {node}: {degree} edges")

            print(
                f"Web data loaded: {len(graph)} unique words, "
                f"{sum(len(edges) for edges in graph.values()) // 2} edges."
            )
            return graph, positions, velocities

        except requests.RequestException as e:
            print(f"Error fetching web page: {e}")
            raise
        except ValueError as e:
            print(f"Error processing text: {e}")
            raise