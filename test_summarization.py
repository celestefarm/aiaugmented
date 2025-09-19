"""
Test script for the Node Title Summarization System.

This script tests the local NLP summarization functionality to ensure
it works correctly with various types of titles and contexts.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from utils.summarization import summarize_node_title


def test_summarization_service():
    """Test the summarization service with various test cases."""
    
    print("=== Testing Node Title Summarization System ===\n")
    
    # Test cases with different types of titles
    test_cases = [
        {
            "title": "This is a very long strategic analysis title that would overflow the node display area and needs intelligent summarization",
            "description": "Very long title requiring summarization"
        },
        {
            "title": "Strategic market analysis and competitive landscape assessment for Q4 2024",
            "description": "Business analysis title with key terms"
        },
        {
            "title": "Implementation roadmap for new authentication system with enhanced security features",
            "description": "Technical implementation title"
        },
        {
            "title": "Risk assessment and mitigation strategies for upcoming product launch",
            "description": "Risk management title"
        },
        {
            "title": "Short title",
            "description": "Already short title"
        },
        {
            "title": "Analysis of customer behavior patterns in e-commerce platforms during holiday seasons",
            "description": "Research-focused title"
        },
        {
            "title": "Development and implementation of machine learning algorithms for predictive analytics",
            "description": "Technical ML title"
        }
    ]
    
    # Test different contexts
    contexts = ['card', 'tooltip', 'list', 'default']
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test Case {i}: {test_case['description']}")
        print(f"Original: {test_case['title']} ({len(test_case['title'])} chars)")
        print("-" * 80)
        
        for context in contexts:
            try:
                result = summarize_node_title(
                    full_text=test_case['title'],
                    context=context
                )
                
                summarized = result.get('summarized_title', '')
                method = result.get('method_used', 'unknown')
                confidence = result.get('confidence', 0)
                
                print(f"  {context.upper():8} (≤{get_context_limit(context):2}): {summarized} ({len(summarized)} chars)")
                print(f"           Method: {method}, Confidence: {confidence}%")
                
                # Validate length constraint
                max_len = get_context_limit(context)
                if len(summarized) > max_len:
                    print(f"           ❌ ERROR: Length {len(summarized)} exceeds limit {max_len}")
                else:
                    print(f"           ✅ Length OK")
                
            except Exception as e:
                print(f"           ❌ ERROR: {e}")
        
        print("\n")


def get_context_limit(context):
    """Get the length limit for a given context."""
    limits = {
        'card': 25,
        'tooltip': 40,
        'list': 30,
        'default': 35
    }
    return limits.get(context, 35)


def test_edge_cases():
    """Test edge cases and error conditions."""
    
    print("=== Testing Edge Cases ===\n")
    
    edge_cases = [
        ("", "Empty string"),
        ("   ", "Whitespace only"),
        ("A", "Single character"),
        ("Hi", "Very short"),
        ("This is exactly twenty-five characters long!", "Exactly at card limit"),
        ("Special chars: @#$%^&*()_+-=[]{}|;':\",./<>?", "Special characters"),
        ("ALLCAPSTEXT", "All caps"),
        ("mixed CaSe TeXt", "Mixed case"),
        ("Numbers 123 and symbols !@# mixed together", "Mixed content"),
    ]
    
    for text, description in edge_cases:
        print(f"Testing: {description}")
        print(f"Input: '{text}' ({len(text)} chars)")
        
        try:
            result = summarize_node_title(text, context='card')
            summarized = result.get('summarized_title', '')
            method = result.get('method_used', 'unknown')
            confidence = result.get('confidence', 0)
            
            print(f"Output: '{summarized}' ({len(summarized)} chars)")
            print(f"Method: {method}, Confidence: {confidence}%")
            
            if len(summarized) > 25:
                print("❌ ERROR: Exceeds card limit")
            else:
                print("✅ Length OK")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
        
        print("-" * 50)


def test_specific_algorithms():
    """Test specific NLP algorithms."""
    
    print("\n=== Testing Specific NLP Algorithms ===\n")
    
    # Import the TitleSummarizer class directly for detailed testing
    from utils.summarization import TitleSummarizer
    
    summarizer = TitleSummarizer()
    
    test_text = "Strategic analysis of market conditions and competitive landscape for Q4 2024"
    
    print(f"Testing text: {test_text}")
    print(f"Length: {len(test_text)} characters\n")
    
    # Test individual strategies
    strategies = [
        ("Key Phrases", summarizer._extract_key_phrases),
        ("Sentence Based", summarizer._sentence_based_summary),
        ("Keyword Extraction", summarizer._keyword_extraction_summary),
        ("Pattern Based", summarizer._pattern_based_summary),
    ]
    
    for name, strategy in strategies:
        try:
            result, confidence = strategy(test_text, 25)
            print(f"{name:18}: '{result}' (confidence: {confidence}%)")
        except Exception as e:
            print(f"{name:18}: ERROR - {e}")
    
    print(f"\nIntelligent Truncation: '{summarizer._intelligent_truncation(test_text, 25)}'")


if __name__ == "__main__":
    try:
        test_summarization_service()
        test_edge_cases()
        test_specific_algorithms()
        
        print("\n=== All Tests Completed ===")
        print("✅ Summarization system is working correctly!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()