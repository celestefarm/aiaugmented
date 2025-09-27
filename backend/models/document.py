from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, List, Any
from datetime import datetime
from bson import ObjectId
from models.user import PyObjectId


class UploadedDocument(BaseModel):
    """Model for uploaded documents stored in GridFS"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    workspace_id: PyObjectId
    filename: str
    original_filename: str
    file_size: int
    content_type: str
    file_extension: str
    gridfs_file_id: PyObjectId  # Reference to GridFS file
    extracted_text: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None  # For structured data from Excel, etc.
    processing_status: str = Field(default="pending")  # pending, processing, completed, failed
    processing_error: Optional[str] = None
    page_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class DocumentUploadResponse(BaseModel):
    """Response model for document upload"""
    id: str
    filename: str
    file_size: int
    content_type: str
    processing_status: str
    created_at: datetime


class DocumentProcessingResult(BaseModel):
    """Result of document processing"""
    document_id: str
    extracted_text: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    page_count: Optional[int] = None
    processing_status: str
    processing_error: Optional[str] = None
    key_insights: Optional[List[str]] = None
    suggested_nodes: Optional[List[Dict[str, Any]]] = None


class DocumentListResponse(BaseModel):
    """Response model for listing documents"""
    documents: List[DocumentUploadResponse]
    total: int