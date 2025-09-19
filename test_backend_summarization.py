#!/usr/bin/env python3
"""
Test script to verify backend summarization functionality
"""
import sys
import os
sys.path.append('backend')

from utils.summarization import summarize_node_title

def test_summarization():
    print('=== BACKEND SUMMARIZATION TEST ===')
    
    # Test cases
    test_cases = [
        {
            'title': 'This is a very long strategic analysis title that would overflow the node display area and needs intelligent summarization',
            'context': 'card',
            'max_length': 25
        },
        {
            'title': 'Strategic market analysis and competitive landscape assessment for Q4 2024',
            'context': 'card', 
            'max_length': 25
        },
        {
            'title': 'Short title',
            'context': 'card',
            'max_length': 25
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f'\n--- Test Case {i} ---')
        print(f'Original: {test_case["title"]}')
        print(f'Length: {len(test_case["title"])} chars')
        
        try:
            result = summarize_node_title(
                test_case['title'], 
                test_case['context'], 
                test_case['max_length']
            )
            
            print(f'Result: {result}')
            print(f'Summarized: "{result.get("summarized_title", "ERROR")}"')
            print(f'Method: {result.get("method_used", "ERROR")}')
            print(f'Confidence: {result.get("confidence", "ERROR")}')
            print(f'Summary Length: {len(result.get("summarized_title", ""))} chars')
            print(f'✓ Length OK: {len(result.get("summarized_title", "")) <= test_case["max_length"]}')
            
        except Exception as e:
            print(f'ERROR: {e}')
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_summarization()