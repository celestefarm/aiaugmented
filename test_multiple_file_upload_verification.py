#!/usr/bin/env python3
"""
Multiple File Upload Verification Test

This script tests the multiple file upload functionality by:
1. Creating test files
2. Uploading them via the API
3. Verifying they are all processed and stored
4. Checking that all files appear in the document list
"""

import requests
import json
import time
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
WORKSPACE_ID = "68d829e4d1a205f3b9d78853"  # From the backend logs
TEST_FILES_DIR = Path("test_files")

def create_test_files():
    """Create test files for upload"""
    TEST_FILES_DIR.mkdir(exist_ok=True)
    
    # Create different types of test files
    test_files = [
        ("test_document_1.txt", "This is the first test document for multiple file upload testing."),
        ("test_document_2.txt", "This is the second test document with different content."),
        ("test_document_3.txt", "This is the third test document to verify all files are processed."),
    ]
    
    created_files = []
    for filename, content in test_files:
        file_path = TEST_FILES_DIR / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        created_files.append(file_path)
        print(f"✅ Created test file: {filename}")
    
    return created_files

def upload_multiple_files(file_paths):
    """Upload multiple files in a single request"""
    print(f"\n=== UPLOADING {len(file_paths)} FILES ===")
    
    # Prepare files for upload
    files = []
    for file_path in file_paths:
        files.append(('files', (file_path.name, open(file_path, 'rb'), 'text/plain')))
    
    try:
        # Upload all files in a single request
        response = requests.post(
            f"{BASE_URL}/workspaces/{WORKSPACE_ID}/upload",
            files=files
        )
        
        # Close file handles
        for _, (_, file_handle, _) in files:
            file_handle.close()
        
        print(f"Upload response status: {response.status_code}")
        print(f"Upload response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            upload_result = response.json()
            print(f"✅ Upload successful!")
            print(f"Number of documents uploaded: {len(upload_result)}")
            
            for i, doc in enumerate(upload_result, 1):
                print(f"  Document {i}:")
                print(f"    ID: {doc['id']}")
                print(f"    Filename: {doc['filename']}")
                print(f"    Status: {doc['processing_status']}")
                print(f"    Size: {doc['file_size']} bytes")
            
            return upload_result
        else:
            print(f"❌ Upload failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return None

def verify_documents_in_workspace():
    """Verify all uploaded documents appear in the workspace"""
    print(f"\n=== VERIFYING DOCUMENTS IN WORKSPACE ===")
    
    try:
        response = requests.get(f"{BASE_URL}/workspaces/{WORKSPACE_ID}/documents")
        
        if response.status_code == 200:
            documents = response.json()
            print(f"✅ Found {len(documents)} documents in workspace")
            
            # Filter for our test documents
            test_docs = [doc for doc in documents if doc['filename'].startswith('test_document_')]
            print(f"✅ Found {len(test_docs)} test documents")
            
            for doc in test_docs:
                print(f"  📄 {doc['filename']} (ID: {doc['id']}, Status: {doc['processing_status']})")
            
            return test_docs
        else:
            print(f"❌ Failed to get documents: {response.status_code}")
            print(f"Response: {response.text}")
            return []
            
    except Exception as e:
        print(f"❌ Error getting documents: {e}")
        return []

def test_document_content_access(documents):
    """Test that all uploaded documents can be accessed"""
    print(f"\n=== TESTING DOCUMENT CONTENT ACCESS ===")
    
    accessible_docs = 0
    for doc in documents:
        try:
            response = requests.get(f"{BASE_URL}/workspaces/{WORKSPACE_ID}/documents/{doc['id']}/content")
            
            if response.status_code == 200:
                content_info = response.json()
                print(f"✅ {doc['filename']}: Content accessible")
                print(f"   Processing status: {content_info['processing_status']}")
                if content_info.get('content'):
                    print(f"   Content preview: {content_info['content'][:50]}...")
                accessible_docs += 1
            else:
                print(f"❌ {doc['filename']}: Content not accessible (status: {response.status_code})")
                
        except Exception as e:
            print(f"❌ {doc['filename']}: Error accessing content: {e}")
    
    print(f"\n📊 Summary: {accessible_docs}/{len(documents)} documents accessible to AI agents")
    return accessible_docs == len(documents)

def cleanup_test_files():
    """Clean up test files"""
    print(f"\n=== CLEANING UP TEST FILES ===")
    
    try:
        for file_path in TEST_FILES_DIR.glob("test_document_*.txt"):
            file_path.unlink()
            print(f"🗑️ Deleted: {file_path.name}")
        
        if TEST_FILES_DIR.exists() and not any(TEST_FILES_DIR.iterdir()):
            TEST_FILES_DIR.rmdir()
            print(f"🗑️ Removed empty directory: {TEST_FILES_DIR}")
            
    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")

def main():
    """Main test function"""
    print("🧪 MULTIPLE FILE UPLOAD VERIFICATION TEST")
    print("=" * 50)
    
    # Step 1: Create test files
    test_files = create_test_files()
    
    # Step 2: Upload multiple files
    uploaded_docs = upload_multiple_files(test_files)
    
    if not uploaded_docs:
        print("❌ Upload failed, cannot continue with verification")
        cleanup_test_files()
        return False
    
    # Step 3: Wait a moment for processing
    print("\n⏳ Waiting for document processing...")
    time.sleep(2)
    
    # Step 4: Verify documents in workspace
    workspace_docs = verify_documents_in_workspace()
    
    # Step 5: Test AI agent access
    ai_access_success = test_document_content_access(workspace_docs)
    
    # Step 6: Cleanup
    cleanup_test_files()
    
    # Final results
    print("\n" + "=" * 50)
    print("🏁 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    expected_files = len(test_files)
    uploaded_files = len(uploaded_docs) if uploaded_docs else 0
    workspace_files = len(workspace_docs)
    
    print(f"📁 Test files created: {expected_files}")
    print(f"📤 Files uploaded: {uploaded_files}")
    print(f"📋 Files in workspace: {workspace_files}")
    print(f"🤖 AI agent access: {'✅ Success' if ai_access_success else '❌ Failed'}")
    
    # Overall success criteria
    success = (
        uploaded_files == expected_files and
        workspace_files >= expected_files and
        ai_access_success
    )
    
    if success:
        print("\n🎉 MULTIPLE FILE UPLOAD TEST: ✅ PASSED")
        print("All files were uploaded, displayed, and are accessible to AI agents!")
    else:
        print("\n💥 MULTIPLE FILE UPLOAD TEST: ❌ FAILED")
        print("Some files were not properly uploaded or are not accessible.")
    
    return success

if __name__ == "__main__":
    main()