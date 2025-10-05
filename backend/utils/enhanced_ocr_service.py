"""
Enhanced OCR Service for Full Image Content Extraction

This service provides comprehensive OCR capabilities including:
- Multilingual text extraction with layout preservation
- Table detection and extraction
- Chart/graph parsing for axes and legends
- Diagram entity and connector label detection
- Image region referencing system
- Error handling for low-resolution images
- Size limits and timeouts
"""

import io
import os
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
from typing import Dict, Any, List, Optional, Tuple, Union
import logging
import asyncio
import time
from dataclasses import dataclass
from enum import Enum
import re
import json

# Optional imports with graceful fallbacks
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    cv2 = None

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None

# EasyOCR has been removed from the project
EASYOCR_AVAILABLE = False
easyocr_service = None
EasyOCRResult = None

logger = logging.getLogger(__name__)

class OCRQuality(Enum):
    """OCR quality levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXCELLENT = "excellent"

class ContentType(Enum):
    """Types of content detected in images"""
    TEXT = "text"
    TABLE = "table"
    CHART = "chart"
    DIAGRAM = "diagram"
    MIXED = "mixed"

@dataclass
class ImageRegion:
    """Represents a region in an image with coordinates and content"""
    x: int
    y: int
    width: int
    height: int
    content_type: ContentType
    text: str
    confidence: float
    metadata: Dict[str, Any]

@dataclass
class TableCell:
    """Represents a cell in a detected table"""
    row: int
    col: int
    text: str
    confidence: float
    bbox: Tuple[int, int, int, int]  # x, y, width, height

@dataclass
class DetectedTable:
    """Represents a detected table structure"""
    cells: List[TableCell]
    rows: int
    cols: int
    bbox: Tuple[int, int, int, int]
    confidence: float

@dataclass
class ChartElement:
    """Represents elements in charts/graphs"""
    element_type: str  # axis, legend, label, title, data_point
    text: str
    position: Tuple[int, int]
    confidence: float
    metadata: Dict[str, Any]

@dataclass
class OCRResult:
    """Complete OCR processing result"""
    original_text: str
    regions: List[ImageRegion]
    tables: List[DetectedTable]
    chart_elements: List[ChartElement]
    quality_assessment: OCRQuality
    processing_time: float
    language_detected: str
    confidence_score: float
    error_message: Optional[str] = None

class EnhancedOCRService:
    """Enhanced OCR service with advanced image content extraction capabilities"""
    
    # Supported languages for OCR
    SUPPORTED_LANGUAGES = {
        'eng': 'English',
        'fra': 'French', 
        'deu': 'German',
        'spa': 'Spanish',
        'ita': 'Italian',
        'por': 'Portuguese',
        'rus': 'Russian',
        'chi_sim': 'Chinese (Simplified)',
        'chi_tra': 'Chinese (Traditional)',
        'jpn': 'Japanese',
        'kor': 'Korean',
        'ara': 'Arabic',
        'hin': 'Hindi'
    }
    
    # OCR configuration for different quality levels
    OCR_CONFIGS = {
        OCRQuality.LOW: '--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!?-',
        OCRQuality.MEDIUM: '--oem 3 --psm 6',
        OCRQuality.HIGH: '--oem 3 --psm 6 -c preserve_interword_spaces=1',
        OCRQuality.EXCELLENT: '--oem 3 --psm 6 -c preserve_interword_spaces=1 -c tessedit_create_hocr=1'
    }
    
    # Timeout settings (seconds)
    DEFAULT_TIMEOUT = 30
    MAX_TIMEOUT = 120
    
    # Size limits
    MAX_IMAGE_SIZE = 50 * 1024 * 1024  # 50MB
    MIN_RESOLUTION = (100, 100)
    MAX_RESOLUTION = (10000, 10000)
    
    def __init__(self):
        """Initialize the Enhanced OCR Service"""
        self.tesseract_available = self._check_tesseract_availability()
        self.opencv_available = CV2_AVAILABLE
        
    def _check_tesseract_availability(self) -> bool:
        """Check if Tesseract is properly installed and configured"""
        try:
            version = pytesseract.get_tesseract_version()
            logger.info(f"Tesseract version detected: {version}")
            return True
        except Exception as e:
            logger.error(f"Tesseract not available: {e}")
            return False
    
    def _check_easyocr_availability(self) -> bool:
        """Check if EasyOCR is available as fallback (always False - EasyOCR removed)"""
        return False
    
    def _check_opencv_availability(self) -> bool:
        """Check if OpenCV is available for advanced image processing"""
        if CV2_AVAILABLE:
            logger.info(f"OpenCV version: {cv2.__version__}")
            return True
        else:
            logger.warning("OpenCV not available - some advanced features will be limited")
            return False
    
    async def process_image(
        self, 
        image_data: bytes, 
        filename: str = "image",
        languages: List[str] = None,
        timeout: int = None
    ) -> OCRResult:
        """
        Process an image with comprehensive OCR analysis
        
        Args:
            image_data: Raw image bytes
            filename: Original filename for context
            languages: List of language codes to use for OCR
            timeout: Processing timeout in seconds
            
        Returns:
            OCRResult with comprehensive extraction results
        """
        start_time = time.time()
        timeout = timeout or self.DEFAULT_TIMEOUT
        
        try:
            # Validate input
            if len(image_data) > self.MAX_IMAGE_SIZE:
                raise ValueError(f"Image too large: {len(image_data)} bytes > {self.MAX_IMAGE_SIZE}")
            
            # Load and validate image
            image = Image.open(io.BytesIO(image_data))
            if image.size[0] < self.MIN_RESOLUTION[0] or image.size[1] < self.MIN_RESOLUTION[1]:
                return OCRResult(
                    original_text="",
                    regions=[],
                    tables=[],
                    chart_elements=[],
                    quality_assessment=OCRQuality.LOW,
                    processing_time=time.time() - start_time,
                    language_detected="unknown",
                    confidence_score=0.0,
                    error_message="Image resolution too low for reliable OCR"
                )
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Assess image quality and determine processing approach
            quality = self._assess_image_quality(image)
            
            # Preprocess image for better OCR results
            processed_image = await self._preprocess_image(image, quality)
            
            # Detect content type
            content_type = await self._detect_content_type(processed_image)
            
            # Set up language configuration
            lang_config = self._setup_language_config(languages)
            
            # Perform OCR with timeout - Tesseract only (EasyOCR removed)
            try:
                if self.tesseract_available:
                    ocr_result = await asyncio.wait_for(
                        self._perform_comprehensive_ocr(processed_image, content_type, quality, lang_config),
                        timeout=timeout
                    )
                else:
                    raise RuntimeError("No OCR engine available - Tesseract is required")
            except Exception as e:
                logger.error(f"OCR processing failed: {e}")
                raise
            
            # Post-process and enhance results
            enhanced_result = await self._enhance_ocr_results(ocr_result, image, filename)
            
            processing_time = time.time() - start_time
            enhanced_result.processing_time = processing_time
            
            logger.info(f"OCR processing completed in {processing_time:.2f}s for {filename}")
            return enhanced_result
            
        except asyncio.TimeoutError:
            logger.error(f"OCR processing timed out after {timeout}s for {filename}")
            return OCRResult(
                original_text="",
                regions=[],
                tables=[],
                chart_elements=[],
                quality_assessment=OCRQuality.LOW,
                processing_time=time.time() - start_time,
                language_detected="unknown",
                confidence_score=0.0,
                error_message=f"Processing timed out after {timeout} seconds"
            )
        except Exception as e:
            logger.error(f"OCR processing failed for {filename}: {str(e)}")
            return OCRResult(
                original_text="",
                regions=[],
                tables=[],
                chart_elements=[],
                quality_assessment=OCRQuality.LOW,
                processing_time=time.time() - start_time,
                language_detected="unknown",
                confidence_score=0.0,
                error_message=str(e)
            )
    
    async def _perform_easyocr_processing(self, image_data: bytes, lang_config: Dict, timeout: int) -> OCRResult:
        """
        EasyOCR processing method (removed - EasyOCR no longer available)
        """
        raise RuntimeError("EasyOCR has been removed from the project. Please use Tesseract OCR instead.")
    
    def _assess_image_quality(self, image: Image.Image) -> OCRQuality:
        """Assess image quality for OCR processing"""
        width, height = image.size
        total_pixels = width * height
        
        # Convert to numpy array for analysis if OpenCV is available
        if self.opencv_available:
            img_array = np.array(image)
            
            # Calculate image sharpness using Laplacian variance
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Quality assessment based on resolution and sharpness
            if total_pixels > 2000000 and laplacian_var > 500:  # High res + sharp
                return OCRQuality.EXCELLENT
            elif total_pixels > 1000000 and laplacian_var > 200:  # Good res + decent sharpness
                return OCRQuality.HIGH
            elif total_pixels > 300000 and laplacian_var > 50:   # Medium res + some sharpness
                return OCRQuality.MEDIUM
            else:
                return OCRQuality.LOW
        else:
            # Fallback assessment based on resolution only
            if total_pixels > 2000000:
                return OCRQuality.HIGH
            elif total_pixels > 500000:
                return OCRQuality.MEDIUM
            else:
                return OCRQuality.LOW
    
    async def _preprocess_image(self, image: Image.Image, quality: OCRQuality) -> Image.Image:
        """Preprocess image to improve OCR accuracy"""
        try:
            # Convert to grayscale for processing
            if image.mode != 'L':
                processed = image.convert('L')
            else:
                processed = image.copy()
            
            # Apply preprocessing based on quality assessment
            if quality == OCRQuality.LOW:
                # Aggressive enhancement for low quality images
                processed = processed.filter(ImageFilter.MedianFilter(size=3))
                enhancer = ImageEnhance.Contrast(processed)
                processed = enhancer.enhance(2.0)
                enhancer = ImageEnhance.Sharpness(processed)
                processed = enhancer.enhance(2.0)
            elif quality == OCRQuality.MEDIUM:
                # Moderate enhancement
                enhancer = ImageEnhance.Contrast(processed)
                processed = enhancer.enhance(1.5)
                enhancer = ImageEnhance.Sharpness(processed)
                processed = enhancer.enhance(1.3)
            
            # Additional OpenCV preprocessing if available
            if self.opencv_available:
                processed = await self._opencv_preprocessing(processed, quality)
            
            return processed
            
        except Exception as e:
            logger.warning(f"Image preprocessing failed: {e}, using original image")
            return image
    
    async def _opencv_preprocessing(self, image: Image.Image, quality: OCRQuality) -> Image.Image:
        """Advanced preprocessing using OpenCV"""
        if not self.opencv_available:
            logger.warning("OpenCV not available, skipping advanced preprocessing")
            return image
            
        try:
            # Convert PIL to OpenCV format
            img_array = np.array(image)
            
            # Noise reduction
            if quality == OCRQuality.LOW:
                img_array = cv2.bilateralFilter(img_array, 9, 75, 75)
            
            # Adaptive thresholding for better text extraction
            img_array = cv2.adaptiveThreshold(
                img_array, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Morphological operations to clean up text
            kernel = np.ones((1, 1), np.uint8)
            img_array = cv2.morphologyEx(img_array, cv2.MORPH_CLOSE, kernel)
            
            # Convert back to PIL
            return Image.fromarray(img_array)
            
        except Exception as e:
            logger.warning(f"OpenCV preprocessing failed: {e}")
            return image
    
    async def _detect_content_type(self, image: Image.Image) -> ContentType:
        """Detect the primary content type in the image"""
        try:
            # Quick OCR to analyze content structure
            if self.tesseract_available:
                sample_text = pytesseract.image_to_string(image, config='--psm 6')
            else:
                # Skip content type detection if Tesseract not available
                return ContentType.TEXT
            
            # Analyze text patterns to determine content type
            lines = sample_text.strip().split('\n')
            non_empty_lines = [line.strip() for line in lines if line.strip()]
            
            if len(non_empty_lines) == 0:
                return ContentType.DIAGRAM
            
            # Check for table patterns (multiple columns, consistent spacing)
            table_indicators = 0
            for line in non_empty_lines:
                if '|' in line or '\t' in line or len(line.split()) > 4:
                    table_indicators += 1
            
            if table_indicators > len(non_empty_lines) * 0.6:
                return ContentType.TABLE
            
            # Check for chart/graph patterns
            chart_keywords = ['axis', 'legend', 'chart', 'graph', 'plot', '%', 'data']
            chart_indicators = sum(1 for line in non_empty_lines 
                                 for keyword in chart_keywords 
                                 if keyword.lower() in line.lower())
            
            if chart_indicators > 2:
                return ContentType.CHART
            
            # Check for diagram patterns (short labels, arrows, connectors)
            diagram_patterns = ['→', '->', '<-', '↑', '↓', '←', '↔']
            diagram_indicators = sum(1 for line in non_empty_lines 
                                   for pattern in diagram_patterns 
                                   if pattern in line)
            
            if diagram_indicators > 0 or len(non_empty_lines) < 10:
                return ContentType.DIAGRAM
            
            # Default to text if no specific patterns detected
            return ContentType.TEXT
            
        except Exception as e:
            logger.warning(f"Content type detection failed: {e}")
            return ContentType.MIXED
    
    def _setup_language_config(self, languages: List[str] = None) -> Dict[str, Any]:
        """Setup language configuration for OCR"""
        if not languages:
            return {
                'tesseract_config': 'eng',
                'languages': ['en']
            }
        
        # Validate and filter supported languages for Tesseract
        valid_tesseract_langs = [lang for lang in languages if lang in self.SUPPORTED_LANGUAGES]
        
        # EasyOCR language mapping removed (EasyOCR no longer available)
        
        if not valid_tesseract_langs:
            logger.warning(f"No supported languages found in {languages}, using English")
            return {
                'tesseract_config': 'eng',
                'languages': ['en']
            }
        
        return {
            'tesseract_config': '+'.join(valid_tesseract_langs),
            'languages': valid_tesseract_langs if valid_tesseract_langs else ['eng']
        }
    
    async def _perform_comprehensive_ocr(
        self, 
        image: Image.Image, 
        content_type: ContentType, 
        quality: OCRQuality,
        lang_config: str
    ) -> OCRResult:
        """Perform comprehensive OCR analysis based on content type"""
        
        # Get OCR configuration for quality level
        ocr_config = self.OCR_CONFIGS[quality]
        tesseract_lang = lang_config.get('tesseract_config', 'eng')
        full_config = f"{ocr_config} -l {tesseract_lang}"
        
        # Extract basic text
        original_text = pytesseract.image_to_string(image, config=full_config)
        
        # Get detailed OCR data for region analysis
        ocr_data = pytesseract.image_to_data(image, config=full_config, output_type=pytesseract.Output.DICT)
        
        # Process based on content type
        regions = await self._extract_regions(image, ocr_data, content_type)
        tables = await self._extract_tables(image, ocr_data) if content_type in [ContentType.TABLE, ContentType.MIXED] else []
        chart_elements = await self._extract_chart_elements(image, ocr_data) if content_type in [ContentType.CHART, ContentType.MIXED] else []
        
        # Calculate overall confidence
        confidences = [float(conf) for conf in ocr_data['conf'] if int(conf) > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Detect language
        detected_lang = self._detect_language(original_text)
        
        return OCRResult(
            original_text=original_text,
            regions=regions,
            tables=tables,
            chart_elements=chart_elements,
            quality_assessment=quality,
            processing_time=0.0,  # Will be set by caller
            language_detected=detected_lang,
            confidence_score=avg_confidence
        )
    
    async def _extract_regions(self, image: Image.Image, ocr_data: Dict, content_type: ContentType) -> List[ImageRegion]:
        """Extract text regions with spatial information"""
        regions = []
        
        # Group OCR data by text blocks
        n_boxes = len(ocr_data['text'])
        
        for i in range(n_boxes):
            text = ocr_data['text'][i].strip()
            conf = float(ocr_data['conf'][i])
            
            if text and conf > 30:  # Only include confident detections
                x = int(ocr_data['left'][i])
                y = int(ocr_data['top'][i])
                w = int(ocr_data['width'][i])
                h = int(ocr_data['height'][i])
                
                region = ImageRegion(
                    x=x, y=y, width=w, height=h,
                    content_type=content_type,
                    text=text,
                    confidence=conf,
                    metadata={
                        'block_num': ocr_data['block_num'][i],
                        'par_num': ocr_data['par_num'][i],
                        'line_num': ocr_data['line_num'][i],
                        'word_num': ocr_data['word_num'][i]
                    }
                )
                regions.append(region)
        
        return regions
    
    async def _extract_tables(self, image: Image.Image, ocr_data: Dict) -> List[DetectedTable]:
        """Extract table structures from OCR data"""
        tables = []
        
        try:
            # Group text by lines and estimate table structure
            lines = {}
            n_boxes = len(ocr_data['text'])
            
            for i in range(n_boxes):
                text = ocr_data['text'][i].strip()
                conf = float(ocr_data['conf'][i])
                
                if text and conf > 30:
                    line_num = ocr_data['line_num'][i]
                    if line_num not in lines:
                        lines[line_num] = []
                    
                    lines[line_num].append({
                        'text': text,
                        'x': int(ocr_data['left'][i]),
                        'y': int(ocr_data['top'][i]),
                        'w': int(ocr_data['width'][i]),
                        'h': int(ocr_data['height'][i]),
                        'conf': conf
                    })
            
            # Analyze line structure to detect tables
            if len(lines) > 2:  # Need at least 3 lines for a table
                # Sort lines by y-coordinate
                sorted_lines = sorted(lines.items(), key=lambda x: min(item['y'] for item in x[1]))
                
                # Check for consistent column structure
                potential_table = self._analyze_table_structure(sorted_lines)
                if potential_table:
                    tables.append(potential_table)
        
        except Exception as e:
            logger.warning(f"Table extraction failed: {e}")
        
        return tables
    
    def _analyze_table_structure(self, sorted_lines: List) -> Optional[DetectedTable]:
        """Analyze sorted lines to detect table structure"""
        try:
            # Simple table detection based on column alignment
            cells = []
            rows = len(sorted_lines)
            max_cols = 0
            
            for row_idx, (line_num, line_items) in enumerate(sorted_lines):
                # Sort items in line by x-coordinate
                sorted_items = sorted(line_items, key=lambda x: x['x'])
                max_cols = max(max_cols, len(sorted_items))
                
                for col_idx, item in enumerate(sorted_items):
                    cell = TableCell(
                        row=row_idx,
                        col=col_idx,
                        text=item['text'],
                        confidence=item['conf'],
                        bbox=(item['x'], item['y'], item['w'], item['h'])
                    )
                    cells.append(cell)
            
            if len(cells) > 4 and max_cols > 1:  # Minimum viable table
                # Calculate overall bounding box
                all_x = [cell.bbox[0] for cell in cells]
                all_y = [cell.bbox[1] for cell in cells]
                all_x2 = [cell.bbox[0] + cell.bbox[2] for cell in cells]
                all_y2 = [cell.bbox[1] + cell.bbox[3] for cell in cells]
                
                bbox = (min(all_x), min(all_y), max(all_x2) - min(all_x), max(all_y2) - min(all_y))
                avg_conf = sum(cell.confidence for cell in cells) / len(cells)
                
                return DetectedTable(
                    cells=cells,
                    rows=rows,
                    cols=max_cols,
                    bbox=bbox,
                    confidence=avg_conf
                )
        
        except Exception as e:
            logger.warning(f"Table structure analysis failed: {e}")
        
        return None
    
    async def _extract_chart_elements(self, image: Image.Image, ocr_data: Dict) -> List[ChartElement]:
        """Extract chart/graph elements like axes, legends, labels"""
        chart_elements = []
        
        try:
            n_boxes = len(ocr_data['text'])
            
            for i in range(n_boxes):
                text = ocr_data['text'][i].strip()
                conf = float(ocr_data['conf'][i])
                
                if text and conf > 30:
                    x = int(ocr_data['left'][i])
                    y = int(ocr_data['top'][i])
                    
                    # Classify chart element type based on text content and position
                    element_type = self._classify_chart_element(text, x, y, image.size)
                    
                    if element_type:
                        chart_element = ChartElement(
                            element_type=element_type,
                            text=text,
                            position=(x, y),
                            confidence=conf,
                            metadata={
                                'width': int(ocr_data['width'][i]),
                                'height': int(ocr_data['height'][i])
                            }
                        )
                        chart_elements.append(chart_element)
        
        except Exception as e:
            logger.warning(f"Chart element extraction failed: {e}")
        
        return chart_elements
    
    def _classify_chart_element(self, text: str, x: int, y: int, image_size: Tuple[int, int]) -> Optional[str]:
        """Classify chart element based on text content and position"""
        text_lower = text.lower()
        width, height = image_size
        
        # Position-based classification
        is_top = y < height * 0.2
        is_bottom = y > height * 0.8
        is_left = x < width * 0.2
        is_right = x > width * 0.8
        
        # Content-based classification
        if any(keyword in text_lower for keyword in ['title', 'chart', 'graph']):
            return 'title'
        elif any(keyword in text_lower for keyword in ['legend', 'key']):
            return 'legend'
        elif re.match(r'^[\d.,]+$', text.strip()):
            if is_left or is_bottom:
                return 'axis_label'
            else:
                return 'data_point'
        elif is_bottom and len(text) < 20:
            return 'x_axis_label'
        elif is_left and len(text) < 20:
            return 'y_axis_label'
        elif '%' in text or any(unit in text_lower for unit in ['$', '€', '£', 'kg', 'lb', 'm', 'ft']):
            return 'data_label'
        
        return 'label'
    
    def _detect_language(self, text: str) -> str:
        """Detect the primary language of extracted text"""
        if not text or len(text.strip()) < 10:
            return 'unknown'
        
        # Simple language detection based on character patterns
        # In a production system, you might use langdetect or similar library
        
        # Check for common English words
        english_words = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
        english_count = sum(1 for word in english_words if word in text.lower())
        
        if english_count > 3:
            return 'english'
        
        # Check for other language patterns
        if any(char in text for char in 'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ'):
            return 'european'
        elif any(char in text for char in 'αβγδεζηθικλμνξοπρστυφχψω'):
            return 'greek'
        elif any(ord(char) > 0x4e00 and ord(char) < 0x9fff for char in text):
            return 'chinese'
        elif any(ord(char) > 0x3040 and ord(char) < 0x309f for char in text):
            return 'japanese'
        elif any(ord(char) > 0xac00 and ord(char) < 0xd7af for char in text):
            return 'korean'
        
        return 'unknown'
    
    async def _enhance_ocr_results(self, result: OCRResult, original_image: Image.Image, filename: str) -> OCRResult:
        """Post-process and enhance OCR results"""
        try:
            # Clean up text
            result.original_text = self._clean_extracted_text(result.original_text)
            
            # Add image region references
            result = self._add_region_references(result, original_image.size)
            
            # Validate and filter low-confidence results
            result = self._filter_low_confidence_results(result)
            
            # Add contextual metadata
            result = self._add_contextual_metadata(result, filename)
            
        except Exception as e:
            logger.warning(f"Result enhancement failed: {e}")
        
        return result
    
    def _clean_extracted_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common OCR errors
        text = text.replace('|', 'I')  # Common OCR mistake
        text = text.replace('0', 'O')  # In text contexts
        
        # Remove artifacts
        text = re.sub(r'[^\w\s\.,!?;:()\-\'"/@#$%&*+=<>{}[\]\\|`~]', '', text)
        
        return text.strip()
    
    def _add_region_references(self, result: OCRResult, image_size: Tuple[int, int]) -> OCRResult:
        """Add region references to OCR results"""
        width, height = image_size
        
        for region in result.regions:
            # Add relative position references
            center_x = region.x + region.width // 2
            center_y = region.y + region.height // 2
            
            # Determine region location
            h_pos = "left" if center_x < width * 0.33 else "right" if center_x > width * 0.67 else "center"
            v_pos = "top" if center_y < height * 0.33 else "bottom" if center_y > height * 0.67 else "middle"
            
            region.metadata['region_reference'] = f"{v_pos}-{h_pos}"
            region.metadata['relative_position'] = {
                'x_percent': round((center_x / width) * 100, 1),
                'y_percent': round((center_y / height) * 100, 1)
            }
        
        return result
    
    def _filter_low_confidence_results(self, result: OCRResult) -> OCRResult:
        """Filter out low-confidence OCR results"""
        # Filter regions
        result.regions = [r for r in result.regions if r.confidence > 30]
        
        # Filter table cells
        for table in result.tables:
            table.cells = [c for c in table.cells if c.confidence > 30]
        
        # Filter chart elements
        result.chart_elements = [e for e in result.chart_elements if e.confidence > 30]
        
        return result
    
    def _add_contextual_metadata(self, result: OCRResult, filename: str) -> OCRResult:
        """Add contextual metadata to results"""
        # Add filename context
        for region in result.regions:
            region.metadata['source_file'] = filename
        
        # Add processing