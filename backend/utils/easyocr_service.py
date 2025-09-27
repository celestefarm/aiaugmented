"""
EasyOCR Service - Alternative OCR implementation using EasyOCR
Provides OCR functionality without requiring system-level Tesseract installation
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from PIL import Image
import io
import time
from dataclasses import dataclass

# EasyOCR will be imported dynamically to handle missing dependency gracefully
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    easyocr = None

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    cv2 = None

logger = logging.getLogger(__name__)

@dataclass
class EasyOCRResult:
    """Result from EasyOCR processing"""
    text: str
    confidence: float
    bbox: List[List[int]]  # Bounding box coordinates
    regions: List[Dict[str, Any]]
    processing_time: float
    quality_score: str
    language_detected: str
    total_words: int
    avg_confidence: float

class EasyOCRService:
    """
    EasyOCR-based OCR service providing comprehensive text extraction
    """
    
    def __init__(self):
        self.reader = None
        self.supported_languages = [
            'en', 'ch_sim', 'ch_tra', 'ja', 'ko', 'th', 'vi', 'ar', 'hi', 'ru', 'de', 'fr', 'es'
        ]
        self._initialize_reader()
    
    def _initialize_reader(self):
        """Initialize EasyOCR reader with supported languages"""
        if not EASYOCR_AVAILABLE:
            logger.warning("EasyOCR not available - OCR functionality will be limited")
            return
        
        try:
            # Initialize with English and Chinese (most common)
            self.reader = easyocr.Reader(['en', 'ch_sim'], gpu=False)
            logger.info("EasyOCR reader initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR reader: {e}")
            self.reader = None
    
    def is_available(self) -> bool:
        """Check if EasyOCR is available and initialized"""
        return EASYOCR_AVAILABLE and self.reader is not None
    
    async def process_image(self, image_data: bytes, filename: str = "image", 
                          languages: List[str] = None, timeout: int = 30) -> EasyOCRResult:
        """
        Process image using EasyOCR
        
        Args:
            image_data: Raw image bytes
            filename: Name of the image file
            languages: List of language codes to use for OCR
            timeout: Processing timeout in seconds
            
        Returns:
            EasyOCRResult with extracted text and metadata
        """
        if not self.is_available():
            raise RuntimeError("EasyOCR is not available. Please install with: pip install easyocr")
        
        start_time = time.time()
        
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array for EasyOCR
            image_array = np.array(image)
            
            # Assess image quality
            quality_score = self._assess_image_quality(image_array)
            
            # Preprocess image if needed
            if quality_score in ['Low', 'Medium']:
                image_array = self._preprocess_image(image_array)
            
            # Run OCR with timeout
            result = await asyncio.wait_for(
                self._run_ocr_async(image_array, languages),
                timeout=timeout
            )
            
            # Process results
            extracted_text, regions, stats = self._process_ocr_results(result)
            
            processing_time = time.time() - start_time
            
            return EasyOCRResult(
                text=extracted_text,
                confidence=stats['avg_confidence'],
                bbox=stats['overall_bbox'],
                regions=regions,
                processing_time=processing_time,
                quality_score=quality_score,
                language_detected=stats['primary_language'],
                total_words=stats['word_count'],
                avg_confidence=stats['avg_confidence']
            )
            
        except asyncio.TimeoutError:
            raise RuntimeError(f"OCR processing timed out after {timeout} seconds")
        except Exception as e:
            logger.error(f"Error processing image with EasyOCR: {e}")
            raise RuntimeError(f"OCR processing failed: {str(e)}")
    
    async def _run_ocr_async(self, image_array: np.ndarray, languages: List[str] = None) -> List:
        """Run OCR in async context"""
        def run_ocr():
            # Use specified languages or default
            if languages:
                # Filter to supported languages
                valid_langs = [lang for lang in languages if lang in self.supported_languages]
                if valid_langs:
                    # Create new reader with specified languages if different
                    reader = easyocr.Reader(valid_langs, gpu=False)
                    return reader.readtext(image_array)
            
            # Use default reader
            return self.reader.readtext(image_array)
        
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, run_ocr)
    
    def _assess_image_quality(self, image_array: np.ndarray) -> str:
        """Assess image quality for OCR"""
        if not OPENCV_AVAILABLE:
            return "Medium"  # Default when OpenCV not available
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            
            # Calculate sharpness using Laplacian variance
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Calculate contrast
            contrast = gray.std()
            
            # Determine quality based on metrics
            if laplacian_var > 500 and contrast > 50:
                return "Excellent"
            elif laplacian_var > 200 and contrast > 30:
                return "High"
            elif laplacian_var > 50 and contrast > 15:
                return "Medium"
            else:
                return "Low"
                
        except Exception as e:
            logger.warning(f"Quality assessment failed: {e}")
            return "Medium"
    
    def _preprocess_image(self, image_array: np.ndarray) -> np.ndarray:
        """Preprocess image to improve OCR accuracy"""
        if not OPENCV_AVAILABLE:
            return image_array
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            
            # Apply adaptive thresholding
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Apply morphological operations to clean up
            kernel = np.ones((2, 2), np.uint8)
            cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            # Convert back to RGB
            return cv2.cvtColor(cleaned, cv2.COLOR_GRAY2RGB)
            
        except Exception as e:
            logger.warning(f"Image preprocessing failed: {e}")
            return image_array
    
    def _process_ocr_results(self, ocr_results: List) -> Tuple[str, List[Dict], Dict]:
        """Process EasyOCR results into structured format"""
        if not ocr_results:
            return "", [], {
                'avg_confidence': 0.0,
                'overall_bbox': [],
                'primary_language': 'unknown',
                'word_count': 0
            }
        
        # Extract text and create regions
        text_parts = []
        regions = []
        confidences = []
        all_coords = []
        
        for i, (bbox, text, confidence) in enumerate(ocr_results):
            if text.strip():  # Only include non-empty text
                text_parts.append(text.strip())
                confidences.append(confidence)
                
                # Convert bbox to flat coordinates
                coords = [int(coord) for point in bbox for coord in point]
                all_coords.extend(coords)
                
                # Create region info
                region = {
                    'id': i,
                    'text': text.strip(),
                    'confidence': float(confidence),
                    'bbox': bbox,
                    'coordinates': {
                        'x': int(min(point[0] for point in bbox)),
                        'y': int(min(point[1] for point in bbox)),
                        'width': int(max(point[0] for point in bbox) - min(point[0] for point in bbox)),
                        'height': int(max(point[1] for point in bbox) - min(point[1] for point in bbox))
                    },
                    'region_type': 'text_block'
                }
                regions.append(region)
        
        # Combine text
        extracted_text = ' '.join(text_parts)
        
        # Calculate overall bounding box
        overall_bbox = []
        if all_coords:
            x_coords = all_coords[::2]  # Every other coordinate is x
            y_coords = all_coords[1::2]  # Every other coordinate is y
            overall_bbox = [
                [min(x_coords), min(y_coords)],
                [max(x_coords), min(y_coords)],
                [max(x_coords), max(y_coords)],
                [min(x_coords), max(y_coords)]
            ]
        
        # Calculate statistics
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        word_count = len(extracted_text.split()) if extracted_text else 0
        
        # Detect primary language (simplified)
        primary_language = 'en'  # Default to English for EasyOCR
        
        stats = {
            'avg_confidence': avg_confidence,
            'overall_bbox': overall_bbox,
            'primary_language': primary_language,
            'word_count': word_count
        }
        
        return extracted_text, regions, stats
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported language codes"""
        return self.supported_languages.copy()
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status information"""
        return {
            'service': 'EasyOCR',
            'available': self.is_available(),
            'easyocr_installed': EASYOCR_AVAILABLE,
            'opencv_available': OPENCV_AVAILABLE,
            'supported_languages': len(self.supported_languages),
            'reader_initialized': self.reader is not None
        }

# Global service instance
easyocr_service = EasyOCRService()