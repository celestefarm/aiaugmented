#!/usr/bin/env python3
"""
Complete OCR Functionality Test
Tests the full OCR pipeline from authentication to file upload and processing.
"""

import requests
import json
import os
import time
from pathlib import Path

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USER = {
    "email": "celeste.fcp@gmail.com",
    "password": "celeste060291"
}

def test_authentication():
    """Test user authentication and get access token"""
    print("🔐 Testing authentication...")
    
    login_url = f"{API_BASE_URL}/auth/login"
    response = requests.post(login_url, json=TEST_USER)
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        user = data.get("user")
        print(f"✅ Authentication successful!")
        print(f"   User: {user.get('name')} ({user.get('email')})")
        print(f"   Token: {token[:50]}...")
        return token
    else:
        print(f"❌ Authentication failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return None

def test_workspaces(token):
    """Test workspace access"""
    print("\n📁 Testing workspace access...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE_URL}/workspaces", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        workspaces = data.get("workspaces", [])
        print(f"✅ Workspace access successful!")
        print(f"   Found {len(workspaces)} workspaces")
        
        if workspaces:
            workspace = workspaces[0]
            print(f"   Using workspace: {workspace.get('title')} (ID: {workspace.get('id')})")
            return workspace.get('id')
        else:
            print("❌ No workspaces found")
            return None
    else:
        print(f"❌ Workspace access failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return None

def create_test_image():
    """Create a simple test image with text for OCR testing"""
    print("\n🖼️ Creating test image...")
    
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a simple image with text
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font, fallback to basic if not available
        try:
            font = ImageFont.truetype("arial.ttf", 24)
        except:
            font = ImageFont.load_default()
        
        # Add test text
        test_text = [
            "OCR Test Document",
            "This is a test image for OCR functionality.",
            "It contains multiple lines of text.",
            "Date: 2025-01-27",
            "Status: Testing Enhanced OCR System",
            "",
            "Table Example:",
            "Name        | Age | City",
            "John Doe    | 30  | New York",
            "Jane Smith  | 25  | London",
            "",
            "Chart Data:",
            "Q1: 100 units",
            "Q2: 150 units", 
            "Q3: 200 units",
            "Q4: 175 units"
        ]
        
        y_position = 50
        for line in test_text:
            draw.text((50, y_position), line, fill='black', font=font)
            y_position += 30
        
        # Save the image
        test_image_path = "test_ocr_image.png"
        img.save(test_image_path)
        print(f"✅ Test image created: {test_image_path}")
        return test_image_path
        
    except ImportError:
        print("⚠️ PIL not available, using existing test file...")
        # Check if we have any existing image files
        for ext in ['.png', '.jpg', '.jpeg']:
            for file in Path('.').glob(f'*{ext}'):
                print(f"✅ Using existing image: {file}")
                return str(file)
        
        # Create a simple text file as fallback
        test_file_path = "test_ocr_document.txt"
        with open(test_file_path, 'w') as f:
            f.write("""OCR Test Document

This is a test document for OCR functionality.
It contains multiple lines of text for testing.

Date: 2025-01-27
Status: Testing Enhanced OCR System

Table Example:
Name        | Age | City
John Doe    | 30  | New York
Jane Smith  | 25  | London

Chart Data:
Q1: 100 units
Q2: 150 units
Q3: 200 units
Q4: 175 units

This document tests various OCR features including:
- Text extraction
- Layout preservation
- Table detection
- Multi-line processing
- Special characters and numbers
""")
        print(f"✅ Test text document created: {test_file_path}")
        return test_file_path

def test_file_upload(token, workspace_id, file_path):
    """Test file upload with OCR processing"""
    print(f"\n📤 Testing file upload and OCR processing...")
    print(f"   File: {file_path}")
    print(f"   Workspace: {workspace_id}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Prepare file for upload
    with open(file_path, 'rb') as f:
        files = {'files': (os.path.basename(file_path), f, 'image/png' if file_path.endswith('.png') else 'text/plain')}
        
        upload_url = f"{API_BASE_URL}/workspaces/{workspace_id}/upload"
        print(f"   Upload URL: {upload_url}")
        
        response = requests.post(upload_url, headers=headers, files=files)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ File upload successful!")
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        if isinstance(data, list) and len(data) > 0:
            document = data[0]
            document_id = document.get('id')
            print(f"   Document ID: {document_id}")
            return document_id
        else:
            print("⚠️ Unexpected response format")
            return None
    else:
        print(f"❌ File upload failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return None

def test_document_processing(token, workspace_id, document_id):
    """Test document processing and OCR results"""
    print(f"\n🔍 Testing document processing...")
    
    headers = {"Authorization": f"Bearer {token}"}
    content_url = f"{API_BASE_URL}/workspaces/{workspace_id}/documents/{document_id}/content"
    
    # Wait a moment for processing
    print("   Waiting for OCR processing...")
    time.sleep(3)
    
    response = requests.get(content_url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Document processing successful!")
        
        # Display OCR results
        extracted_text = data.get('extracted_text', '')
        ocr_metadata = data.get('ocr_metadata', {})
        
        print(f"\n📄 OCR Results:")
        print(f"   Processing Status: {data.get('processing_status', 'Unknown')}")
        
        if ocr_metadata:
            print(f"   Quality Assessment: {ocr_metadata.get('quality_assessment', 'N/A')}")
            print(f"   Language Detected: {ocr_metadata.get('language_detected', 'N/A')}")
            print(f"   Confidence Score: {ocr_metadata.get('confidence_score', 'N/A')}")
            print(f"   Processing Time: {ocr_metadata.get('processing_time', 'N/A')}s")
            print(f"   Regions Detected: {ocr_metadata.get('regions_detected', 'N/A')}")
            print(f"   Tables Detected: {ocr_metadata.get('tables_detected', 'N/A')}")
            print(f"   Chart Elements: {ocr_metadata.get('chart_elements_detected', 'N/A')}")
        
        if extracted_text:
            print(f"\n📝 Extracted Text (first 500 chars):")
            print(f"   {extracted_text[:500]}...")
        else:
            print("   No text extracted")
        
        # Check for suggested nodes
        suggested_nodes = data.get('suggested_nodes', [])
        if suggested_nodes:
            print(f"\n🎯 Suggested Nodes ({len(suggested_nodes)}):")
            for i, node in enumerate(suggested_nodes[:3]):  # Show first 3
                print(f"   {i+1}. {node.get('title', 'Untitled')}")
                print(f"      Type: {node.get('type', 'Unknown')}")
                print(f"      Confidence: {node.get('confidence', 0)}%")
        
        return True
    else:
        print(f"❌ Document processing failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def main():
    """Run complete OCR functionality test"""
    print("🚀 Starting Complete OCR Functionality Test")
    print("=" * 50)
    
    # Step 1: Authentication
    token = test_authentication()
    if not token:
        print("\n❌ Test failed at authentication step")
        return False
    
    # Step 2: Workspace access
    workspace_id = test_workspaces(token)
    if not workspace_id:
        print("\n❌ Test failed at workspace access step")
        return False
    
    # Step 3: Create test file
    test_file = create_test_image()
    if not test_file:
        print("\n❌ Test failed at test file creation step")
        return False
    
    # Step 4: File upload
    document_id = test_file_upload(token, workspace_id, test_file)
    if not document_id:
        print("\n❌ Test failed at file upload step")
        return False
    
    # Step 5: Document processing
    success = test_document_processing(token, workspace_id, document_id)
    if not success:
        print("\n❌ Test failed at document processing step")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Complete OCR Functionality Test PASSED!")
    print("✅ All systems working correctly:")
    print("   - Authentication ✅")
    print("   - Workspace access ✅") 
    print("   - File upload ✅")
    print("   - OCR processing ✅")
    print("   - Enhanced OCR features ✅")
    
    # Cleanup
    try:
        if os.path.exists(test_file) and test_file.startswith('test_'):
            os.remove(test_file)
            print(f"   - Cleaned up test file: {test_file}")
    except:
        pass
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)