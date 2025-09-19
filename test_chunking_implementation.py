"""
Test script for the text chunking implementation.

This script tests:
1. Token estimation accuracy
2. Chunking logic with various data sizes
3. Result consolidation
4. Error handling for context length exceeded scenarios
"""

import sys
import os
import asyncio
import logging
from typing import List, Dict

# Add backend to path
sys.path.append('./backend')

from utils.text_chunking import (
    TextChunker, 
    TokenEstimator, 
    ResultConsolidator, 
    ChunkingConfig,
    chunk_large_analysis
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_test_nodes(count: int, base_description_length: int = 500) -> List[Dict]:
    """Create test nodes with varying content sizes"""
    nodes = []
    
    for i in range(count):
        # Create progressively longer descriptions to simulate real data
        description_multiplier = (i % 5) + 1  # 1x to 5x base length
        description = f"Strategic analysis node {i+1}. " * (base_description_length * description_multiplier // 30)
        
        node = {
            'id': f'node_{i+1}',
            'title': f'Strategic Node {i+1}: Market Analysis and Implementation Planning',
            'description': description,
            'type': 'strategic_analysis',
            'source_agent': 'strategist' if i % 3 == 0 else None,
            'x': i * 100,
            'y': i * 50
        }
        nodes.append(node)
    
    return nodes

def test_token_estimation():
    """Test token estimation accuracy"""
    logger.info("=== Testing Token Estimation ===")
    
    estimator = TokenEstimator()
    
    test_cases = [
        ("Short text", 50),
        ("This is a medium length text that should have a reasonable token count estimate", 200),
        ("This is a very long text " * 100, 2000),  # Very long text
        ("", 0),  # Empty text
        ("Single", 10),  # Single word
    ]
    
    for text, expected_range in test_cases:
        estimated = estimator.estimate_tokens(text)
        logger.info(f"Text length: {len(text)}, Estimated tokens: {estimated}, Expected range: ~{expected_range}")
        
        # Basic sanity checks
        if len(text) == 0:
            assert estimated == 0, "Empty text should have 0 tokens"
        else:
            assert estimated > 0, "Non-empty text should have > 0 tokens"
            # Very rough check - should be in reasonable range
            assert estimated < len(text), "Token count should be less than character count"
    
    logger.info("✅ Token estimation tests passed")

def test_chunking_logic():
    """Test the chunking logic with various data sizes"""
    logger.info("=== Testing Chunking Logic ===")
    
    # Test with small dataset (should not need chunking)
    small_nodes = create_test_nodes(5, 100)
    system_prompt = "You are an AI assistant analyzing strategic nodes."
    
    needs_chunking, chunks = chunk_large_analysis(small_nodes, system_prompt)
    logger.info(f"Small dataset: {len(small_nodes)} nodes, needs_chunking: {needs_chunking}, chunks: {len(chunks)}")
    assert not needs_chunking, "Small dataset should not need chunking"
    assert len(chunks) == 1, "Small dataset should have 1 chunk"
    assert len(chunks[0]) == len(small_nodes), "Single chunk should contain all nodes"
    
    # Test with medium dataset
    medium_nodes = create_test_nodes(50, 200)
    needs_chunking, chunks = chunk_large_analysis(medium_nodes, system_prompt)
    logger.info(f"Medium dataset: {len(medium_nodes)} nodes, needs_chunking: {needs_chunking}, chunks: {len(chunks)}")
    
    # Test with large dataset (should definitely need chunking)
    large_nodes = create_test_nodes(200, 500)
    needs_chunking, chunks = chunk_large_analysis(large_nodes, system_prompt)
    logger.info(f"Large dataset: {len(large_nodes)} nodes, needs_chunking: {needs_chunking}, chunks: {len(chunks)}")
    assert needs_chunking, "Large dataset should need chunking"
    assert len(chunks) > 1, "Large dataset should have multiple chunks"
    
    # Verify all nodes are included across chunks
    total_nodes_in_chunks = sum(len(chunk) for chunk in chunks)
    assert total_nodes_in_chunks == len(large_nodes), "All nodes should be included in chunks"
    
    # Verify no duplicate nodes across chunks
    all_node_ids = set()
    for chunk in chunks:
        chunk_ids = {node['id'] for node in chunk}
        assert len(chunk_ids.intersection(all_node_ids)) == 0, "No duplicate nodes across chunks"
        all_node_ids.update(chunk_ids)
    
    logger.info("✅ Chunking logic tests passed")

def test_result_consolidation():
    """Test result consolidation logic"""
    logger.info("=== Testing Result Consolidation ===")
    
    consolidator = ResultConsolidator()
    
    # Create test relationship suggestions with some duplicates
    chunk1_results = [
        {
            'from_node_id': 'node_1',
            'to_node_id': 'node_2',
            'relationship_type': 'support',
            'strength': 0.8,
            'reasoning': 'These nodes support each other',
            'keywords': ['support', 'synergy']
        },
        {
            'from_node_id': 'node_2',
            'to_node_id': 'node_3',
            'relationship_type': 'dependency',
            'strength': 0.7,
            'reasoning': 'Node 2 depends on Node 3',
            'keywords': ['dependency', 'requirement']
        }
    ]
    
    chunk2_results = [
        {
            'from_node_id': 'node_2',
            'to_node_id': 'node_1',  # Reverse of first relationship
            'relationship_type': 'support',
            'strength': 0.9,
            'reasoning': 'Duplicate relationship (reverse)',
            'keywords': ['support', 'mutual']
        },
        {
            'from_node_id': 'node_3',
            'to_node_id': 'node_4',
            'relationship_type': 'contradiction',
            'strength': 0.6,
            'reasoning': 'These nodes contradict each other',
            'keywords': ['conflict', 'tension']
        }
    ]
    
    consolidated = consolidator.consolidate_relationship_suggestions([chunk1_results, chunk2_results])
    
    logger.info(f"Chunk 1: {len(chunk1_results)} suggestions")
    logger.info(f"Chunk 2: {len(chunk2_results)} suggestions")
    logger.info(f"Consolidated: {len(consolidated)} unique suggestions")
    
    # Should have 3 unique relationships (duplicate removed)
    assert len(consolidated) == 3, f"Expected 3 unique relationships, got {len(consolidated)}"
    
    # Verify sorting by strength (highest first)
    strengths = [rel['strength'] for rel in consolidated]
    assert strengths == sorted(strengths, reverse=True), "Results should be sorted by strength descending"
    
    logger.info("✅ Result consolidation tests passed")

def test_chunking_config():
    """Test different chunking configurations"""
    logger.info("=== Testing Chunking Configuration ===")
    
    # Test with very small chunk size (should create many chunks)
    small_config = ChunkingConfig(
        max_tokens_per_chunk=5000,  # Very small
        max_response_tokens=1000,
        overlap_tokens=100
    )
    
    chunker = TextChunker(small_config)
    test_nodes = create_test_nodes(20, 300)
    system_prompt = "Test prompt"
    
    chunks = chunker.chunk_nodes_for_analysis(test_nodes, system_prompt)
    logger.info(f"Small config: {len(chunks)} chunks for {len(test_nodes)} nodes")
    assert len(chunks) > 1, "Small config should create multiple chunks"
    
    # Test with large chunk size (should create fewer chunks)
    large_config = ChunkingConfig(
        max_tokens_per_chunk=200000,  # Very large
        max_response_tokens=2000,
        overlap_tokens=500
    )
    
    chunker = TextChunker(large_config)
    chunks = chunker.chunk_nodes_for_analysis(test_nodes, system_prompt)
    logger.info(f"Large config: {len(chunks)} chunks for {len(test_nodes)} nodes")
    
    logger.info("✅ Chunking configuration tests passed")

def test_error_scenarios():
    """Test error handling scenarios"""
    logger.info("=== Testing Error Scenarios ===")
    
    chunker = TextChunker()
    
    # Test with empty nodes
    empty_chunks = chunker.chunk_nodes_for_analysis([], "system prompt")
    assert len(empty_chunks) == 0, "Empty nodes should return empty chunks"
    
    # Test with nodes containing very long descriptions
    extreme_nodes = create_test_nodes(5, 10000)  # Very long descriptions
    system_prompt = "System prompt"
    
    chunks = chunker.chunk_nodes_for_analysis(extreme_nodes, system_prompt)
    logger.info(f"Extreme nodes: {len(chunks)} chunks for {len(extreme_nodes)} nodes")
    
    # Verify all nodes are still included
    total_nodes = sum(len(chunk) for chunk in chunks)
    assert total_nodes == len(extreme_nodes), "All extreme nodes should be included"
    
    logger.info("✅ Error scenario tests passed")

async def main():
    """Run all tests"""
    logger.info("🚀 Starting Chunking Implementation Tests")
    
    try:
        test_token_estimation()
        test_chunking_logic()
        test_result_consolidation()
        test_chunking_config()
        test_error_scenarios()
        
        logger.info("🎉 All tests passed successfully!")
        logger.info("✅ Chunking implementation is working correctly")
        
        # Demonstrate the chunking with a realistic scenario
        logger.info("\n=== Realistic Scenario Demonstration ===")
        realistic_nodes = create_test_nodes(100, 400)  # 100 nodes with substantial content
        system_prompt = """You are a cognitive analysis AI that specializes in identifying relationships between ideas, concepts, and strategic elements. Your task is to analyze nodes in a strategic thinking map and suggest meaningful connections."""
        
        needs_chunking, chunks = chunk_large_analysis(realistic_nodes, system_prompt)
        
        logger.info(f"Realistic scenario:")
        logger.info(f"  - Total nodes: {len(realistic_nodes)}")
        logger.info(f"  - Needs chunking: {needs_chunking}")
        logger.info(f"  - Number of chunks: {len(chunks)}")
        
        if needs_chunking:
            for i, chunk in enumerate(chunks):
                logger.info(f"  - Chunk {i+1}: {len(chunk)} nodes")
        
        logger.info("This demonstrates how the system would handle a large workspace with many nodes.")
        
    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())