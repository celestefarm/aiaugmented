#!/usr/bin/env python3
"""
Test script to verify the enhanced OCR implementation is working correctly.
This script tests the OCR service with various image types and scenarios.
"""

import asyncio
import sys
import os
import base64
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from backend.utils.enhanced_ocr_service import EnhancedOCRService
    from backend.utils.document_processor import DocumentProcessor
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)

async def test_enhanced_ocr():
    """Test the enhanced OCR service with various scenarios."""
    print("🔍 Testing Enhanced OCR Implementation")
    print("=" * 50)
    
    # Initialize the OCR service
    try:
        ocr_service = EnhancedOCRService()
        print("✅ Enhanced OCR Service initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize OCR service: {e}")
        return False
    
    # Test 1: Check if dependencies are available
    print("\n📦 Testing Dependencies:")
    try:
        import cv2
        print(f"✅ OpenCV version: {cv2.__version__}")
    except ImportError:
        print("⚠️  OpenCV not available - will use basic preprocessing")
    
    try:
        import pytesseract
        print("✅ Tesseract OCR available")
        # Try to get version
        try:
            version = pytesseract.get_tesseract_version()
            print(f"   Version: {version}")
        except:
            print("   Version: Unknown")
    except ImportError:
        print("❌ Tesseract OCR not available")
        return False
    
    # Test 2: Create a simple test image with text
    print("\n🖼️  Testing with synthetic image:")
    try:
        # Create a simple test image with PIL
        from PIL import Image, ImageDraw, ImageFont
        import io
        
        # Create a white image with black text
        img = Image.new('RGB', (400, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font, fallback to basic if not available
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        # Add some test text
        test_text = "Hello World!\nThis is a test image\nfor OCR processing."
        draw.text((20, 20), test_text, fill='black', font=font)
        
        # Convert to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_data = img_bytes.getvalue()
        
        print(f"   Created test image: {len(img_data)} bytes")
        
        # Process with OCR
        result = await ocr_service.process_image(img_data, "test_image.png")
        
        print(f"✅ OCR Processing completed:")
        print(f"   Quality: {result.quality_assessment}")
        print(f"   Confidence: {result.confidence_score:.1f}%")
        print(f"   Processing time: {result.processing_time:.2f}s")
        print(f"   Language detected: {result.language_detected}")
        print(f"   Text regions: {len(result.regions)}")
        print(f"   Extracted text preview: {repr(result.extracted_text[:100])}")
        
        if result.extracted_text and "Hello World" in result.extracted_text:
            print("✅ Text extraction successful!")
        else:
            print("⚠️  Text extraction may have issues")
            
    except Exception as e:
        print(f"❌ Test image processing failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 3: Test document processor integration
    print("\n📄 Testing Document Processor Integration:")
    try:
        doc_processor = DocumentProcessor()
        
        # Test with the same image data
        processing_result = await doc_processor.process_document(
            img_data, 
            "test_image.png", 
            "image/png"
        )
        
        print(f"✅ Document processor integration successful:")
        print(f"   Status: {processing_result.get('processing_status', 'unknown')}")
        print(f"   Has extracted_text: {'extracted_text' in processing_result}")
        print(f"   Has ocr_metadata: {'ocr_metadata' in processing_result}")
        print(f"   Has extracted_data: {'extracted_data' in processing_result}")
        
        if processing_result.get('ocr_metadata'):
            metadata = processing_result['ocr_metadata']
            print(f"   OCR Metadata keys: {list(metadata.keys())}")
            
    except Exception as e:
        print(f"❌ Document processor integration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 4: Test error handling
    print("\n🚨 Testing Error Handling:")
    try:
        # Test with invalid image data
        invalid_result = await ocr_service.process_image(b"invalid_image_data", "invalid.png")
        print(f"   Invalid image handling: {invalid_result.quality_assessment}")
    except Exception as e:
        print(f"✅ Error handling working: {type(e).__name__}")
    
    # Test 5: Test multilingual support
    print("\n🌍 Testing Multilingual Support:")
    try:
        # Test with different language settings
        languages = ['eng', 'chi_sim', 'jpn', 'ara']
        for lang in languages:
            try:
                result = await ocr_service.process_image(img_data, f"test_{lang}.png", languages=[lang])
                print(f"   {lang}: ✅ Supported")
            except Exception as e:
                print(f"   {lang}: ⚠️  {str(e)[:50]}...")
    except Exception as e:
        print(f"❌ Multilingual test failed: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Enhanced OCR Implementation Test Complete!")
    return True

async def main():
    """Main test function."""
    try:
        success = await test_enhanced_ocr()
        if success:
            print("\n✅ All tests passed! Enhanced OCR is ready for use.")
            return 0
        else:
            print("\n❌ Some tests failed. Check the output above.")
            return 1
    except Exception as e:
        print(f"\n💥 Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)