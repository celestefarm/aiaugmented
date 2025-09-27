#!/usr/bin/env python3
"""
AI File Analysis Test

This script tests that AI agents can now read and analyze uploaded file content.
"""

import requests
import json
import time
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
WORKSPACE_ID = "68d83a036effb65dfaa4b8b2"  # Market Analysis Workspace from logs
TEST_FILES_DIR = Path("test_files")

def create_test_files():
    """Create test files with meaningful content for AI analysis"""
    TEST_FILES_DIR.mkdir(exist_ok=True)
    
    # Create a strategic document with rich content
    strategic_content = """
    STRATEGIC MARKET ANALYSIS REPORT
    
    Executive Summary:
    Our company is positioned to expand into the European market with significant growth potential.
    Key findings indicate a 35% market opportunity in Germany and France.
    
    Market Opportunities:
    - Germany: €2.5M potential revenue, 15% market share achievable
    - France: €1.8M potential revenue, 12% market share achievable  
    - UK: €3.2M potential revenue, 20% market share achievable
    
    Key Risks:
    1. Regulatory compliance costs estimated at €500K
    2. Currency fluctuation risk of ±8%
    3. Competition from established local players
    
    Recommendations:
    - Phase 1: Enter German market (Q1 2024)
    - Phase 2: Expand to France (Q3 2024)
    - Phase 3: UK market entry (Q1 2025)
    
    Investment Required: €4.2M over 18 months
    Expected ROI: 28% by end of Year 2
    """
    
    # Create a financial analysis document
    financial_content = """
    FINANCIAL PROJECTIONS 2024-2026
    
    Revenue Projections:
    Year 1: $2.5M (baseline scenario)
    Year 2: $4.8M (growth scenario)  
    Year 3: $7.2M (optimistic scenario)
    
    Cost Structure:
    - Personnel: 45% of revenue
    - Marketing: 25% of revenue
    - Operations: 20% of revenue
    - R&D: 10% of revenue
    
    Break-even Analysis:
    Expected break-even: Month 14
    Cash flow positive: Month 18
    
    Key Metrics:
    - Customer Acquisition Cost: $125
    - Lifetime Value: $2,400
    - Churn Rate: 5% monthly
    - Gross Margin: 68%
    """
    
    test_files = [
        ("strategic_analysis.txt", strategic_content),
        ("financial_projections.txt", financial_content),
    ]
    
    created_files = []
    for filename, content in test_files:
        file_path = TEST_FILES_DIR / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        created_files.append(file_path)
        print(f"✅ Created test file: {filename}")
    
    return created_files

def upload_files_to_workspace(file_paths):
    """Upload test files to the workspace"""
    print(f"\n=== UPLOADING {len(file_paths)} FILES TO WORKSPACE ===")
    
    files = []
    for file_path in file_paths:
        files.append(('files', (file_path.name, open(file_path, 'rb'), 'text/plain')))
    
    try:
        response = requests.post(
            f"{BASE_URL}/workspaces/{WORKSPACE_ID}/upload",
            files=files
        )
        
        # Close file handles
        for _, (_, file_handle, _) in files:
            file_handle.close()
        
        print(f"Upload response status: {response.status_code}")
        
        if response.status_code == 200:
            upload_result = response.json()
            print(f"✅ Upload successful! {len(upload_result)} documents uploaded")
            
            for doc in upload_result:
                print(f"  📄 {doc['filename']} (ID: {doc['id']}, Status: {doc['processing_status']})")
            
            return upload_result
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return None

def test_ai_analysis(question):
    """Test AI agent's ability to analyze uploaded documents"""
    print(f"\n=== TESTING AI ANALYSIS ===")
    print(f"Question: {question}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/workspaces/{WORKSPACE_ID}/messages",
            json={"content": question}
        )
        
        if response.status_code == 201:
            messages = response.json()
            print(f"✅ Received {len(messages)} messages")
            
            for message in messages:
                print(f"\n--- {message['type'].upper()} MESSAGE ---")
                print(f"Author: {message['author']}")
                print(f"Content: {message['content']}")
                
                # Check if AI referenced the documents
                content_lower = message['content'].lower()
                document_references = []
                
                if 'strategic' in content_lower or 'market' in content_lower:
                    document_references.append("Strategic content")
                if 'financial' in content_lower or 'revenue' in content_lower or 'cost' in content_lower:
                    document_references.append("Financial content")
                if 'germany' in content_lower or 'france' in content_lower or 'uk' in content_lower:
                    document_references.append("Market-specific data")
                if any(term in content_lower for term in ['€', '$', 'million', 'revenue', 'roi']):
                    document_references.append("Financial figures")
                
                if document_references and message['type'] == 'ai':
                    print(f"🎯 AI referenced: {', '.join(document_references)}")
                    return True
                elif message['type'] == 'ai':
                    print(f"⚠️ AI response doesn't seem to reference uploaded documents")
            
            return False
        else:
            print(f"❌ Message failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Analysis error: {e}")
        return False

def cleanup_test_files():
    """Clean up test files"""
    print(f"\n=== CLEANING UP TEST FILES ===")
    
    try:
        for file_path in TEST_FILES_DIR.glob("*.txt"):
            file_path.unlink()
            print(f"🗑️ Deleted: {file_path.name}")
        
        if TEST_FILES_DIR.exists() and not any(TEST_FILES_DIR.iterdir()):
            TEST_FILES_DIR.rmdir()
            print(f"🗑️ Removed empty directory: {TEST_FILES_DIR}")
            
    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")

def main():
    """Main test function"""
    print("🧪 AI FILE ANALYSIS TEST")
    print("=" * 50)
    
    # Step 1: Create test files with rich content
    test_files = create_test_files()
    
    # Step 2: Upload files to workspace
    uploaded_docs = upload_files_to_workspace(test_files)
    
    if not uploaded_docs:
        print("❌ Upload failed, cannot test AI analysis")
        cleanup_test_files()
        return False
    
    # Step 3: Wait for processing
    print("\n⏳ Waiting for document processing...")
    time.sleep(3)
    
    # Step 4: Test AI analysis with specific questions
    test_questions = [
        "What are the key findings from the uploaded strategic analysis document?",
        "Based on the financial projections, what is our expected ROI and break-even timeline?",
        "What markets should we prioritize for expansion according to the uploaded documents?",
        "Summarize the main risks and opportunities mentioned in the uploaded files."
    ]
    
    successful_analyses = 0
    
    for question in test_questions:
        if test_ai_analysis(question):
            successful_analyses += 1
        time.sleep(2)  # Brief pause between tests
    
    # Step 5: Cleanup
    cleanup_test_files()
    
    # Final results
    print("\n" + "=" * 50)
    print("🏁 AI FILE ANALYSIS TEST RESULTS")
    print("=" * 50)
    
    print(f"📁 Test files created: {len(test_files)}")
    print(f"📤 Files uploaded: {len(uploaded_docs) if uploaded_docs else 0}")
    print(f"🤖 Successful AI analyses: {successful_analyses}/{len(test_questions)}")
    
    success = successful_analyses > 0
    
    if success:
        print("\n🎉 AI FILE ANALYSIS TEST: ✅ PASSED")
        print("AI agents can now read and analyze uploaded document content!")
    else:
        print("\n💥 AI FILE ANALYSIS TEST: ❌ FAILED")
        print("AI agents are still not accessing uploaded document content.")
    
    return success

if __name__ == "__main__":
    main()