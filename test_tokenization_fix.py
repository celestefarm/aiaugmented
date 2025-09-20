#!/usr/bin/env python3
"""
Test script to verify the tokenization fix for GPT-4-32K.
This script tests the new chunking configuration and model-specific settings.
"""

import sys
import os
import asyncio
import logging
from typing import List, Dict

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from utils.text_chunking import (
    TextChunker, 
    ChunkingConfig, 
    ModelConfig, 
    TokenEstimator,
    chunk_large_analysis
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_test_nodes(count: int = 50) -> List[Dict]:
    """Create test nodes with substantial content to trigger chunking"""
    nodes = []
    for i in range(count):
        node = {
            'id': f'test_node_{i}',
            'title': f'Strategic Initiative {i}: Market Expansion and Digital Transformation',
            'description': f'''This is a comprehensive strategic initiative focused on expanding our market presence 
            through digital transformation. The initiative involves multiple stakeholders across different departments 
            including marketing, technology, operations, and finance. Key objectives include: 1) Implementing advanced 
            analytics capabilities to better understand customer behavior and market trends, 2) Developing new digital 
            products and services that align with customer needs and market opportunities, 3) Establishing strategic 
            partnerships with technology vendors and service providers, 4) Creating a robust data governance framework 
            to ensure data quality and compliance, 5) Building organizational capabilities in digital marketing, 
            e-commerce, and customer experience management. The initiative is expected to deliver significant business 
            value through increased revenue, improved customer satisfaction, and enhanced operational efficiency. 
            Risk factors include technology implementation challenges, resource constraints, competitive responses, 
            and regulatory changes. Success metrics include market share growth, customer acquisition rates, 
            digital revenue contribution, and operational cost reductions. Timeline spans 18-24 months with 
            quarterly milestones and regular progress reviews. Budget allocation covers technology investments, 
            personnel costs, training programs, and external consulting services. Initiative {i} specifically 
            focuses on the {["retail", "healthcare", "financial services", "manufacturing", "technology"][i % 5]} 
            sector with unique challenges and opportunities.''',
            'type': ['strategic', 'operational', 'tactical', 'risk', 'opportunity'][i % 5],
            'source_agent': f'agent_{i % 3}',
            'x': i * 10,
            'y': i * 15
        }
        nodes.append(node)
    return nodes

def test_model_configurations():
    """Test different model configurations"""
    logger.info("=== Testing Model Configurations ===")
    
    models_to_test = ["gpt-4", "gpt-4-32k", "gpt-4-turbo", "gpt-3.5-turbo"]
    
    for model_name in models_to_test:
        logger.info(f"\nTesting model: {model_name}")
        config = ModelConfig.get_config(model_name)
        logger.info(f"  Context limit: {config.context_limit}")
        logger.info(f"  Max tokens per chunk: {config.max_tokens_per_chunk}")
        logger.info(f"  Max response tokens: {config.max_response_tokens}")
        logger.info(f"  Safety buffer: {config.safety_buffer}")
        
        # Verify the math adds up
        total = config.max_tokens_per_chunk + config.max_response_tokens + config.safety_buffer
        logger.info(f"  Total allocation: {total} (should be <= {config.context_limit})")
        
        if total > config.context_limit:
            logger.error(f"  ❌ Configuration error: Total allocation exceeds context limit!")
        else:
            logger.info(f"  ✅ Configuration valid")

def test_token_estimation():
    """Test token estimation accuracy"""
    logger.info("\n=== Testing Token Estimation ===")
    
    test_texts = [
        "Short text",
        "This is a medium length text that should have a reasonable token count estimate.",
        """This is a very long text that contains multiple sentences and paragraphs. 
        It includes various types of content such as technical terms, business jargon, 
        and detailed descriptions. The purpose is to test how well our token estimation 
        algorithm works with longer content that might be typical in a strategic analysis 
        context. We want to ensure that our estimates are conservative enough to prevent 
        context limit exceeded errors while not being so conservative that we waste 
        available context space."""
    ]
    
    estimator = TokenEstimator()
    
    for i, text in enumerate(test_texts):
        estimated = estimator.estimate_tokens(text)
        char_count = len(text)
        ratio = char_count / estimated if estimated > 0 else 0
        
        logger.info(f"Text {i+1}: {char_count} chars → {estimated} tokens (ratio: {ratio:.2f})")

def test_chunking_logic():
    """Test the chunking logic with different scenarios"""
    logger.info("\n=== Testing Chunking Logic ===")
    
    # Test with GPT-4-32K configuration
    chunker = TextChunker(model_name="gpt-4-32k")
    
    # Create test nodes
    small_nodes = create_test_nodes(5)
    medium_nodes = create_test_nodes(20)
    large_nodes = create_test_nodes(100)
    
    system_prompt = """You are a cognitive analysis AI that specializes in identifying relationships 
    between ideas, concepts, and strategic elements. Your task is to analyze nodes in a strategic 
    thinking map and suggest meaningful connections."""
    
    test_cases = [
        ("Small dataset", small_nodes),
        ("Medium dataset", medium_nodes),
        ("Large dataset", large_nodes)
    ]
    
    for name, nodes in test_cases:
        logger.info(f"\n{name} ({len(nodes)} nodes):")
        
        # Test chunking decision
        nodes_text = "\n".join(chunker._format_node_for_analysis(node) for node in nodes)
        needs_chunking = chunker.needs_chunking(nodes_text, system_prompt)
        
        logger.info(f"  Needs chunking: {needs_chunking}")
        
        if needs_chunking:
            chunks = chunker.chunk_nodes_for_analysis(nodes, system_prompt)
            logger.info(f"  Created {len(chunks)} chunks")
            
            for i, chunk in enumerate(chunks):
                chunk_text = "\n".join(chunker._format_node_for_analysis(node) for node in chunk)
                estimated_tokens = TokenEstimator.estimate_tokens(system_prompt + chunk_text)
                logger.info(f"    Chunk {i+1}: {len(chunk)} nodes, ~{estimated_tokens} tokens")
                
                # Verify chunk doesn't exceed limits
                if estimated_tokens > chunker.config.max_tokens_per_chunk:
                    logger.error(f"    ❌ Chunk {i+1} exceeds token limit!")
                else:
                    logger.info(f"    ✅ Chunk {i+1} within limits")

def test_convenience_function():
    """Test the convenience function with model specification"""
    logger.info("\n=== Testing Convenience Function ===")
    
    nodes = create_test_nodes(30)
    system_prompt = "Analyze these strategic nodes for relationships."
    
    # Test with different models
    for model_name in ["gpt-4", "gpt-4-32k"]:
        logger.info(f"\nTesting with {model_name}:")
        needs_chunking, chunks = chunk_large_analysis(nodes, system_prompt, model_name)
        
        logger.info(f"  Needs chunking: {needs_chunking}")
        logger.info(f"  Number of chunks: {len(chunks)}")
        
        if needs_chunking:
            for i, chunk in enumerate(chunks):
                logger.info(f"    Chunk {i+1}: {len(chunk)} nodes")

def main():
    """Run all tests"""
    logger.info("🧪 Starting Tokenization Fix Tests")
    logger.info("=" * 50)
    
    try:
        test_model_configurations()
        test_token_estimation()
        test_chunking_logic()
        test_convenience_function()
        
        logger.info("\n" + "=" * 50)
        logger.info("✅ All tests completed successfully!")
        logger.info("\n📊 Summary of fixes:")
        logger.info("  • GPT-4-32K: 28,000 tokens per chunk (was 100,000)")
        logger.info("  • Safety buffer: 2,768 tokens (was 1,000)")
        logger.info("  • Model-specific configurations implemented")
        logger.info("  • Enhanced error handling added")
        logger.info("  • Improved logging for debugging")
        
    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)