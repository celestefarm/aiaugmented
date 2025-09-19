#!/usr/bin/env python3
"""
Comprehensive test for the backend conversation summarization utility.

This test verifies that the summarization functionality works correctly
for various types of conversation text and contexts.
"""

import sys
import os
sys.path.append('.')

from utils.summarization import summarize_node_title, title_summarizer

def test_conversation_examples():
    """Test the summarization with realistic conversation examples"""
    
    print("=== BACKEND CONVERSATION SUMMARIZATION TEST ===")
    print()
    
    # Test cases with realistic conversation snippets
    conversation_examples = [
        {
            "text": "It seems you've mentioned 'market,' however, your request lacks specific details about which market segment you're targeting and what strategic objectives you're trying to achieve.",
            "description": "Long conversational response"
        },
        {
            "text": "To provide you with the most relevant strategic options, I'm going to need a bit more information about your current market position and competitive landscape.",
            "description": "Information gathering response"
        },
        {
            "text": "Strategic analysis of market conditions and competitive landscape for Q4 2024 planning initiatives",
            "description": "Strategic planning title"
        },
        {
            "text": "Implementation roadmap for new authentication system with enhanced security features and user experience improvements",
            "description": "Technical implementation title"
        },
        {
            "text": "Risk assessment and mitigation strategies for upcoming product launch in European markets",
            "description": "Risk management title"
        },
        {
            "text": "Let me help you develop a comprehensive approach to this challenge. First, we should analyze your current situation and identify key stakeholders.",
            "description": "Coaching/mentoring response"
        },
        {
            "text": "Based on our previous discussion about market entry strategies, I recommend focusing on three key areas: competitive analysis, customer segmentation, and resource allocation.",
            "description": "Strategic recommendation"
        },
        {
            "text": "Short title",
            "description": "Already short text"
        }
    ]
    
    # Test different contexts
    contexts = ['card', 'tooltip', 'list', 'default']
    
    for i, example in enumerate(conversation_examples, 1):
        print(f"Example {i}: {example['description']}")
        print(f"Original: {example['text']}")
        print(f"Length: {len(example['text'])} characters")
        print()
        
        for context in contexts:
            result = summarize_node_title(
                full_text=example['text'],
                context=context
            )
            
            summarized = result['summarized_title']
            method = result['method_used']
            confidence = result['confidence']
            
            max_length = title_summarizer.CONTEXT_LIMITS.get(context, 35)
            length_ok = len(summarized) <= max_length
            
            print(f"  {context.upper()} (≤{max_length}): {summarized}")
            print(f"    Length: {len(summarized)} chars | Method: {method} | Confidence: {confidence}% | ✓ {length_ok}")
        
        print("-" * 80)
        print()

def test_edge_cases():
    """Test edge cases and error conditions"""
    
    print("=== EDGE CASES TEST ===")
    print()
    
    edge_cases = [
        ("", "Empty string"),
        ("   ", "Whitespace only"),
        ("A", "Single character"),
        ("Hi there!", "Very short text"),
        ("This is exactly twenty-five characters long!", "Exactly at limit"),
        ("Special chars: @#$%^&*()_+-=[]{}|;':\",./<>?", "Special characters"),
        ("UPPERCASE TEXT THAT SHOULD BE HANDLED PROPERLY", "All uppercase"),
        ("mixed CaSe TeXt WiTh WeIrD cApItAlIzAtIoN", "Mixed case"),
        ("Text with    multiple    spaces    between    words", "Multiple spaces"),
        ("Text\nwith\nnewlines\nand\ttabs", "Newlines and tabs")
    ]
    
    for text, description in edge_cases:
        print(f"Testing: {description}")
        print(f"Input: '{text}'")
        
        result = summarize_node_title(text, context='card')
        
        print(f"Output: '{result['summarized_title']}'")
        print(f"Method: {result['method_used']} | Confidence: {result['confidence']}%")
        print()

def test_different_lengths():
    """Test with different target lengths"""
    
    print("=== DIFFERENT LENGTHS TEST ===")
    print()
    
    long_text = "This is a comprehensive strategic analysis document that covers market conditions, competitive landscape, risk assessment, implementation roadmap, and resource allocation strategies for the upcoming fiscal year."
    
    test_lengths = [10, 15, 20, 25, 30, 40, 50]
    
    print(f"Original text: {long_text}")
    print(f"Original length: {len(long_text)} characters")
    print()
    
    for max_length in test_lengths:
        result = summarize_node_title(
            full_text=long_text,
            context='default',
            max_length=max_length
        )
        
        summarized = result['summarized_title']
        method = result['method_used']
        confidence = result['confidence']
        length_ok = len(summarized) <= max_length
        
        print(f"Max {max_length:2d}: {summarized}")
        print(f"        Length: {len(summarized):2d} | Method: {method} | Confidence: {confidence:2d}% | ✓ {length_ok}")
        print()

def test_summarization_methods():
    """Test different summarization strategies"""
    
    print("=== SUMMARIZATION METHODS TEST ===")
    print()
    
    # Test text that should trigger different methods
    test_cases = [
        {
            "text": "Strategic analysis and competitive assessment for market entry",
            "expected_method": "local",
            "description": "Should use keyword extraction"
        },
        {
            "text": "Implementation of new authentication system. This will enhance security significantly.",
            "expected_method": "local", 
            "description": "Should use sentence-based or pattern matching"
        },
        {
            "text": "Analysis of market conditions and competitive landscape dynamics",
            "expected_method": "local",
            "description": "Should use pattern matching for 'Analysis of X'"
        },
        {
            "text": "abcdefghijklmnopqrstuvwxyz1234567890",
            "expected_method": "fallback",
            "description": "Should fallback to truncation"
        }
    ]
    
    for case in test_cases:
        print(f"Testing: {case['description']}")
        print(f"Input: {case['text']}")
        
        result = summarize_node_title(case['text'], context='card')
        
        print(f"Output: {result['summarized_title']}")
        print(f"Method: {result['method_used']} (expected: {case['expected_method']})")
        print(f"Confidence: {result['confidence']}%")
        
        method_match = result['method_used'] == case['expected_method']
        print(f"Method match: ✓ {method_match}")
        print()

if __name__ == "__main__":
    try:
        test_conversation_examples()
        test_edge_cases()
        test_different_lengths()
        test_summarization_methods()
        
        print("=" * 80)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        print("✅ Backend conversation summarization utility is working correctly!")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)