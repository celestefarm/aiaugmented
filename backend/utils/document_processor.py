import io
import os
import tempfile
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image
import pytesseract
import PyPDF2
from docx import Document
import openpyxl
from openpyxl.utils import get_column_letter
import logging

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Service for processing uploaded documents and extracting content"""
    
    # Supported file types and their MIME types
    SUPPORTED_TYPES = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg'
    }
    
    # Maximum file size (20MB)
    MAX_FILE_SIZE = 20 * 1024 * 1024
    
    @classmethod
    def is_supported_file(cls, filename: str, content_type: str) -> bool:
        """Check if file type is supported"""
        file_ext = os.path.splitext(filename.lower())[1]
        return file_ext in cls.SUPPORTED_TYPES
    
    @classmethod
    def get_file_extension(cls, filename: str) -> str:
        """Get file extension from filename"""
        return os.path.splitext(filename.lower())[1]
    
    @classmethod
    def validate_file_size(cls, file_size: int) -> bool:
        """Validate file size is within limits"""
        return file_size <= cls.MAX_FILE_SIZE
    
    @classmethod
    async def process_document(cls, file_content: bytes, filename: str, content_type: str) -> Dict[str, Any]:
        """
        Process uploaded document and extract content
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            content_type: MIME type
            
        Returns:
            Dictionary containing extracted content and metadata
        """
        try:
            file_ext = cls.get_file_extension(filename)
            
            if file_ext == '.pdf':
                return await cls._process_pdf(file_content)
            elif file_ext == '.docx':
                return await cls._process_docx(file_content)
            elif file_ext == '.xlsx':
                return await cls._process_xlsx(file_content)
            elif file_ext in ['.png', '.jpg', '.jpeg']:
                return await cls._process_image(file_content)
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")
                
        except Exception as e:
            logger.error(f"Error processing document {filename}: {str(e)}")
            return {
                'extracted_text': None,
                'extracted_data': None,
                'page_count': None,
                'processing_status': 'failed',
                'processing_error': str(e),
                'key_insights': [],
                'suggested_nodes': []
            }
    
    @classmethod
    async def _process_pdf(cls, file_content: bytes) -> Dict[str, Any]:
        """Process PDF file and extract text"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            extracted_text = ""
            page_count = len(pdf_reader.pages)
            
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text.strip():
                        extracted_text += f"\n--- Page {page_num + 1} ---\n{page_text}\n"
                except Exception as e:
                    logger.warning(f"Error extracting text from PDF page {page_num + 1}: {str(e)}")
                    continue
            
            # Generate insights and suggested nodes
            key_insights = cls._generate_key_insights(extracted_text)
            suggested_nodes = cls._generate_suggested_nodes(extracted_text, page_count)
            
            return {
                'extracted_text': extracted_text.strip(),
                'extracted_data': {'page_count': page_count},
                'page_count': page_count,
                'processing_status': 'completed',
                'processing_error': None,
                'key_insights': key_insights,
                'suggested_nodes': suggested_nodes
            }
            
        except Exception as e:
            raise Exception(f"PDF processing failed: {str(e)}")
    
    @classmethod
    async def _process_docx(cls, file_content: bytes) -> Dict[str, Any]:
        """Process DOCX file and extract text"""
        try:
            docx_file = io.BytesIO(file_content)
            doc = Document(docx_file)
            
            extracted_text = ""
            paragraph_count = 0
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    extracted_text += paragraph.text + "\n"
                    paragraph_count += 1
            
            # Extract tables if any
            table_data = []
            for table in doc.tables:
                table_rows = []
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells]
                    table_rows.append(row_data)
                table_data.append(table_rows)
            
            # Generate insights and suggested nodes
            key_insights = cls._generate_key_insights(extracted_text)
            suggested_nodes = cls._generate_suggested_nodes(extracted_text, 1)
            
            return {
                'extracted_text': extracted_text.strip(),
                'extracted_data': {
                    'paragraph_count': paragraph_count,
                    'tables': table_data
                },
                'page_count': 1,  # DOCX doesn't have clear page breaks
                'processing_status': 'completed',
                'processing_error': None,
                'key_insights': key_insights,
                'suggested_nodes': suggested_nodes
            }
            
        except Exception as e:
            raise Exception(f"DOCX processing failed: {str(e)}")
    
    @classmethod
    async def _process_xlsx(cls, file_content: bytes) -> Dict[str, Any]:
        """Process XLSX file and extract data"""
        try:
            xlsx_file = io.BytesIO(file_content)
            workbook = openpyxl.load_workbook(xlsx_file, data_only=True)
            
            extracted_text = ""
            extracted_data = {'sheets': {}}
            
            for sheet_name in workbook.sheetnames:
                sheet = workbook[sheet_name]
                sheet_data = []
                sheet_text = f"\n--- Sheet: {sheet_name} ---\n"
                
                # Get all rows with data
                for row in sheet.iter_rows(values_only=True):
                    if any(cell is not None for cell in row):
                        row_data = [str(cell) if cell is not None else "" for cell in row]
                        sheet_data.append(row_data)
                        sheet_text += " | ".join(row_data) + "\n"
                
                extracted_data['sheets'][sheet_name] = sheet_data
                extracted_text += sheet_text
            
            # Generate insights and suggested nodes
            key_insights = cls._generate_key_insights(extracted_text)
            suggested_nodes = cls._generate_suggested_nodes(extracted_text, 1)
            
            return {
                'extracted_text': extracted_text.strip(),
                'extracted_data': extracted_data,
                'page_count': len(workbook.sheetnames),
                'processing_status': 'completed',
                'processing_error': None,
                'key_insights': key_insights,
                'suggested_nodes': suggested_nodes
            }
            
        except Exception as e:
            raise Exception(f"XLSX processing failed: {str(e)}")
    
    @classmethod
    async def _process_image(cls, file_content: bytes) -> Dict[str, Any]:
        """Process image file using OCR"""
        try:
            image = Image.open(io.BytesIO(file_content))
            
            # Use OCR to extract text
            extracted_text = pytesseract.image_to_string(image)
            
            # Get image metadata
            image_data = {
                'width': image.width,
                'height': image.height,
                'format': image.format,
                'mode': image.mode
            }
            
            # Generate insights and suggested nodes
            key_insights = cls._generate_key_insights(extracted_text)
            suggested_nodes = cls._generate_suggested_nodes(extracted_text, 1)
            
            return {
                'extracted_text': extracted_text.strip(),
                'extracted_data': image_data,
                'page_count': 1,
                'processing_status': 'completed',
                'processing_error': None,
                'key_insights': key_insights,
                'suggested_nodes': suggested_nodes
            }
            
        except Exception as e:
            raise Exception(f"Image processing failed: {str(e)}")
    
    @classmethod
    def _generate_key_insights(cls, text: str) -> List[str]:
        """Generate key insights from extracted text"""
        if not text or len(text.strip()) < 50:
            return []
        
        insights = []
        
        # Simple keyword-based insights
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['strategy', 'strategic', 'plan', 'planning']):
            insights.append("Document contains strategic planning content")
        
        if any(word in text_lower for word in ['risk', 'risks', 'threat', 'threats']):
            insights.append("Document discusses risks and threats")
        
        if any(word in text_lower for word in ['decision', 'decisions', 'choose', 'option']):
            insights.append("Document involves decision-making processes")
        
        if any(word in text_lower for word in ['data', 'analysis', 'metrics', 'statistics']):
            insights.append("Document contains analytical data")
        
        if any(word in text_lower for word in ['recommendation', 'suggest', 'propose']):
            insights.append("Document includes recommendations")
        
        # Add word count insight
        word_count = len(text.split())
        insights.append(f"Document contains approximately {word_count} words")
        
        return insights[:5]  # Limit to 5 insights
    
    @classmethod
    def _generate_suggested_nodes(cls, text: str, page_count: int) -> List[Dict[str, Any]]:
        """Generate suggested nodes based on document content"""
        if not text or len(text.strip()) < 50:
            return []
        
        suggested_nodes = []
        text_lower = text.lower()
        
        # Extract potential titles from the first few sentences
        sentences = text.split('.')[:5]
        
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if len(sentence) > 20 and len(sentence) < 100:
                node_type = "human"  # Default type
                
                # Determine node type based on content
                if any(word in sentence.lower() for word in ['risk', 'threat', 'danger']):
                    node_type = "risk"
                elif any(word in sentence.lower() for word in ['decision', 'choose', 'option']):
                    node_type = "decision"
                elif any(word in sentence.lower() for word in ['depend', 'require', 'need']):
                    node_type = "dependency"
                
                suggested_nodes.append({
                    'title': sentence[:80] + "..." if len(sentence) > 80 else sentence,
                    'description': f"Extracted from uploaded document (page {min(i+1, page_count)})",
                    'type': node_type,
                    'confidence': 70,
                    'source_type': 'document'
                })
        
        return suggested_nodes[:3]  # Limit to 3 suggestions