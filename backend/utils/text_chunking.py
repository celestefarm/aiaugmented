"""
Text chunking utility for handling large inputs that exceed model context limits.

This module provides functionality to:
1. Estimate token counts for text
2. Split large text into manageable chunks
3. Consolidate results from multiple chunked requests
"""

import re
import json
import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class ChunkingConfig:
    """Configuration for text chunking"""
    max_tokens_per_chunk: int = 100000  # Conservative limit for GPT-4 (128k context)
    max_response_tokens: int = 2000     # Reserve tokens for response
    overlap_tokens: int = 500           # Overlap between chunks for context
    min_chunk_size: int = 1000          # Minimum viable chunk size

class TokenEstimator:
    """Estimates token count for text using simple heuristics"""
    
    @staticmethod
    def estimate_tokens(text: str) -> int:
        """
        Estimate token count using character-based heuristic.
        
        GPT models typically use ~4 characters per token on average.
        This is a conservative estimate that errs on the side of caution.
        
        Args:
            text: Input text to estimate
            
        Returns:
            Estimated token count
        """
        if not text:
            return 0
        
        # Remove extra whitespace and normalize
        normalized_text = re.sub(r'\s+', ' ', text.strip())
        
        # Estimate: ~4 characters per token (conservative)
        char_count = len(normalized_text)
        estimated_tokens = max(1, char_count // 3)  # More conservative: 3 chars per token
        
        logger.debug(f"Estimated {estimated_tokens} tokens for {char_count} characters")
        return estimated_tokens
    
    @staticmethod
    def estimate_json_tokens(data: Any) -> int:
        """Estimate tokens for JSON data"""
        json_str = json.dumps(data, separators=(',', ':'))
        return TokenEstimator.estimate_tokens(json_str)

class TextChunker:
    """Handles chunking of large text inputs"""
    
    def __init__(self, config: ChunkingConfig = None):
        self.config = config or ChunkingConfig()
        self.token_estimator = TokenEstimator()
    
    def needs_chunking(self, text: str, system_prompt: str = "", max_response_tokens: int = None) -> bool:
        """
        Determine if text needs to be chunked based on token limits.
        
        Args:
            text: Input text to check
            system_prompt: System prompt that will be included
            max_response_tokens: Expected response token count
            
        Returns:
            True if chunking is needed
        """
        if max_response_tokens is None:
            max_response_tokens = self.config.max_response_tokens
        
        total_input_tokens = (
            self.token_estimator.estimate_tokens(text) +
            self.token_estimator.estimate_tokens(system_prompt)
        )
        
        total_required = total_input_tokens + max_response_tokens
        needs_chunking = total_required > self.config.max_tokens_per_chunk
        
        logger.info(f"Token analysis: input={total_input_tokens}, response={max_response_tokens}, "
                   f"total={total_required}, limit={self.config.max_tokens_per_chunk}, "
                   f"needs_chunking={needs_chunking}")
        
        return needs_chunking
    
    def chunk_nodes_for_analysis(self, nodes: List[Dict], system_prompt: str) -> List[List[Dict]]:
        """
        Chunk nodes for cognitive analysis while preserving relationships.
        
        Args:
            nodes: List of node dictionaries
            system_prompt: System prompt for the analysis
            
        Returns:
            List of node chunks, each small enough to process
        """
        if not nodes:
            return []
        
        # Calculate available space for nodes
        system_tokens = self.token_estimator.estimate_tokens(system_prompt)
        available_tokens = (
            self.config.max_tokens_per_chunk - 
            system_tokens - 
            self.config.max_response_tokens - 
            1000  # Safety buffer
        )
        
        logger.info(f"Available tokens for nodes: {available_tokens}")
        
        chunks = []
        current_chunk = []
        current_chunk_tokens = 0
        
        for node in nodes:
            # Estimate tokens for this node
            node_text = self._format_node_for_analysis(node)
            node_tokens = self.token_estimator.estimate_tokens(node_text)
            
            # Check if adding this node would exceed the limit
            if current_chunk and (current_chunk_tokens + node_tokens > available_tokens):
                # Start a new chunk
                chunks.append(current_chunk)
                current_chunk = [node]
                current_chunk_tokens = node_tokens
                logger.debug(f"Started new chunk with {len(current_chunk)} nodes, {current_chunk_tokens} tokens")
            else:
                # Add to current chunk
                current_chunk.append(node)
                current_chunk_tokens += node_tokens
        
        # Add the last chunk if it has nodes
        if current_chunk:
            chunks.append(current_chunk)
        
        logger.info(f"Created {len(chunks)} chunks from {len(nodes)} nodes")
        for i, chunk in enumerate(chunks):
            chunk_tokens = sum(
                self.token_estimator.estimate_tokens(self._format_node_for_analysis(node))
                for node in chunk
            )
            logger.debug(f"Chunk {i+1}: {len(chunk)} nodes, ~{chunk_tokens} tokens")
        
        return chunks
    
    def _format_node_for_analysis(self, node: Dict) -> str:
        """Format a single node for analysis"""
        formatted = f"Node ID: {node['id']}\n"
        formatted += f"Title: {node['title']}\n"
        formatted += f"Description: {node['description']}\n"
        formatted += f"Type: {node['type']}\n"
        if node.get('source_agent'):
            formatted += f"Source Agent: {node['source_agent']}\n"
        formatted += "\n"
        return formatted

class ResultConsolidator:
    """Consolidates results from multiple chunked requests"""
    
    @staticmethod
    def consolidate_relationship_suggestions(chunk_results: List[List[Dict]]) -> List[Dict]:
        """
        Consolidate relationship suggestions from multiple chunks.
        
        Args:
            chunk_results: List of relationship suggestion lists from each chunk
            
        Returns:
            Consolidated list of unique relationship suggestions
        """
        if not chunk_results:
            return []
        
        all_suggestions = []
        seen_relationships = set()
        
        for chunk_suggestions in chunk_results:
            for suggestion in chunk_suggestions:
                # Create a unique key for this relationship
                from_id = suggestion.get('from_node_id')
                to_id = suggestion.get('to_node_id')
                
                if not from_id or not to_id:
                    continue
                
                # Create bidirectional key to avoid duplicates
                relationship_key = tuple(sorted([from_id, to_id]))
                
                if relationship_key not in seen_relationships:
                    seen_relationships.add(relationship_key)
                    all_suggestions.append(suggestion)
        
        # Sort by strength (confidence) descending
        all_suggestions.sort(key=lambda x: x.get('strength', 0), reverse=True)
        
        logger.info(f"Consolidated {len(all_suggestions)} unique relationships from {len(chunk_results)} chunks")
        return all_suggestions
    
    @staticmethod
    def merge_analysis_insights(chunk_results: List[Dict]) -> Dict:
        """
        Merge insights from multiple chunk analyses.
        
        Args:
            chunk_results: List of analysis result dictionaries
            
        Returns:
            Merged analysis results
        """
        if not chunk_results:
            return {
                'suggestions': [],
                'clusters': [],
                'insights': ['No analysis results to consolidate']
            }
        
        # Consolidate suggestions
        all_suggestions = []
        all_clusters = []
        all_insights = []
        
        for result in chunk_results:
            if isinstance(result.get('suggestions'), list):
                all_suggestions.extend(result['suggestions'])
            if isinstance(result.get('clusters'), list):
                all_clusters.extend(result['clusters'])
            if isinstance(result.get('insights'), list):
                all_insights.extend(result['insights'])
        
        # Remove duplicate suggestions
        consolidated_suggestions = ResultConsolidator.consolidate_relationship_suggestions([all_suggestions])
        
        # Add consolidation insights
        consolidation_insights = [
            f"Analyzed data in {len(chunk_results)} chunks due to size",
            f"Found {len(consolidated_suggestions)} total relationship suggestions",
            f"Identified {len(all_clusters)} conceptual clusters"
        ]
        
        return {
            'suggestions': consolidated_suggestions,
            'clusters': all_clusters,
            'insights': consolidation_insights + all_insights
        }

# Global instances for easy access
default_chunker = TextChunker()
result_consolidator = ResultConsolidator()

def chunk_large_analysis(nodes: List[Dict], system_prompt: str) -> Tuple[bool, List[List[Dict]]]:
    """
    Convenience function to check if chunking is needed and perform it.
    
    Args:
        nodes: List of nodes to analyze
        system_prompt: System prompt for analysis
        
    Returns:
        Tuple of (needs_chunking, chunks)
    """
    # Estimate total size
    nodes_text = "\n".join(default_chunker._format_node_for_analysis(node) for node in nodes)
    
    if default_chunker.needs_chunking(nodes_text, system_prompt):
        chunks = default_chunker.chunk_nodes_for_analysis(nodes, system_prompt)
        return True, chunks
    else:
        return False, [nodes]  # Return single chunk with all nodes