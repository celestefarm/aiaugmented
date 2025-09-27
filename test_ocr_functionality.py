#!/usr/bin/env python3
"""
Test script to verify OCR functionality is working properly
"""

import asyncio
import sys
import os
sys.path.append('backend')

from utils.enhanced_ocr_service import EnhancedOCRService
from utils.easyocr_service import easyocr_service

async def test_ocr_services():
    """Test both OCR services"""
    print("🔍 Testing OCR Services...")
    
    # Test EasyOCR service
    print("\n1. Testing EasyOCR Service:")
    print(f"   - Available: {easyocr_service.is_available()}")
    print(f"   - Status: {easyocr_service.get_status()}")
    
    # Test Enhanced OCR service
    print("\n2. Testing Enhanced OCR Service:")
    enhanced_ocr = EnhancedOCRService()
    print(f"   - Tesseract available: {enhanced_ocr.tesseract_available}")
    print(f"   - OpenCV available: {enhanced_ocr.opencv_available}")
    print(f"   - EasyOCR fallback available: {enhanced_ocr._check_easyocr_availability()}")
    
    # Create a simple test image (white background with black text)
    try:
        from PIL import Image, ImageDraw, ImageFont
        import io
        
        # Create a simple test image
        img = Image.new('RGB', (400, 100), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font, fallback to basic if not available
        try:
            font = ImageFont.truetype("arial.ttf", 24)
        except:
            font = ImageFont.load_default()
        
        draw.text((10, 30), "Hello World! OCR Test 123", fill='black', font=font)
        
        # Convert to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes = img_bytes.getvalue()
        
        print(f"\n3. Testing with sample image ({len(img_bytes)} bytes):")
        
        # Test with Enhanced OCR service
        if enhanced_ocr._check_easyocr_availability():
            print("   - Testing Enhanced OCR with EasyOCR fallback...")
            result = await enhanced_ocr.process_image(img_bytes, "test_image.png")
            print(f"   - Extracted text: '{result.original_text.strip()}'")
            print(f"   - Confidence: {result.confidence_score:.2f}")
            print(f"   - Processing time: {result.processing_time:.2f}s")
            print(f"   - Quality: {result.quality_assessment.value}")
            print(f"   - Regions found: {len(result.regions)}")
            
            if result.error_message:
                print(f"   - Error: {result.error_message}")
        else:
            print("   - Enhanced OCR not available (no fallback engines)")
            
    except ImportError as e:
        print(f"   - Cannot create test image: {e}")
        print("   - PIL not available for image generation")
    except Exception as e:
        print(f"   - Error during OCR test: {e}")
    
    print("\n✅ OCR Service Test Complete!")

if __name__ == "__main__":
    asyncio.run(test_ocr_services())