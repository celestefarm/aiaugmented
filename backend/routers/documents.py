from fastapi import APIRouter, HTTPException, status, Depends, Response, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from models.user import UserResponse
from models.node import NodeInDB
from models.edge import EdgeInDB
from models.workspace import WorkspaceInDB
from models.document import UploadedDocument, DocumentUploadResponse, DocumentProcessingResult, DocumentListResponse
from utils.dependencies import get_current_active_user
# Lazy import to avoid loading heavy OCR dependencies on startup
# from utils.document_processor import DocumentProcessor

def get_document_processor():
    """Lazy import DocumentProcessor to avoid loading heavy dependencies on startup"""
    from utils.document_processor import DocumentProcessor
    return DocumentProcessor
from utils.performance_monitor import perf_monitor, monitor_performance
from database import get_database
from bson import ObjectId
from typing import Dict, Any, List
import json
import motor.motor_asyncio
from datetime import datetime
import logging
import time
import asyncio
from collections import defaultdict

router = APIRouter(tags=["Documents"])
logger = logging.getLogger(__name__)


class GenerateBriefResponse(BaseModel):
    """Response model for generate brief endpoint"""
    content: str = Field(..., description="Generated brief content")
    generated_at: datetime = Field(..., description="Generation timestamp")
    node_count: int = Field(..., description="Number of nodes processed")
    edge_count: int = Field(..., description="Number of edges processed")


class WorkspaceExportResponse(BaseModel):
    """Response model for workspace export"""
    workspace: Dict[str, Any] = Field(..., description="Workspace data")
    nodes: List[Dict[str, Any]] = Field(..., description="All nodes in workspace")
    edges: List[Dict[str, Any]] = Field(..., description="All edges in workspace")
    exported_at: datetime = Field(..., description="Export timestamp")


@router.post("/workspaces/{workspace_id}/generate-brief", response_model=GenerateBriefResponse)
@monitor_performance("generate_brief_endpoint")
async def generate_brief(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Generate a structured brief from workspace map data.
    
    Fetches all nodes and edges for the given workspace and generates a structured
    summary organized by node type. For this sprint, uses simple concatenation
    of node titles and descriptions.
    
    Args:
        workspace_id: Workspace ID to generate brief for
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Generated brief content with metadata
        
    Raises:
        HTTPException: If workspace not found or access denied
    """
    # Start overall performance monitoring
    overall_timer = perf_monitor.start_timer("generate_brief_total")
    
    # Add debug logging
    print(f"=== GENERATE BRIEF ENDPOINT CALLED ===")
    print(f"Workspace ID: {workspace_id}")
    print(f"Current User: {current_user.email if current_user else 'None'}")
    print(f"Current User ID: {current_user.id if current_user else 'None'}")
    
    # Validate ObjectId format
    validation_timer = perf_monitor.start_timer("workspace_validation")
    if not ObjectId.is_valid(workspace_id):
        print(f"Invalid workspace ID format: {workspace_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    print(f"Searching for workspace with ID: {workspace_id}, Owner: {current_user.id}")
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace_doc:
        print(f"Workspace not found for ID: {workspace_id}, User: {current_user.id}")
        # Also check if workspace exists but with different owner
        any_workspace = await database.workspaces.find_one({"_id": ObjectId(workspace_id)})
        if any_workspace:
            print(f"Workspace exists but belongs to different user: {any_workspace.get('owner_id')}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't have permission to access this workspace"
            )
        else:
            print(f"Workspace does not exist at all")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )
    
    workspace = WorkspaceInDB(**workspace_doc)
    perf_monitor.end_timer(validation_timer, {"workspace_found": True, "workspace_title": workspace.title})
    print(f"Found workspace: {workspace.title}")
    
    # OPTIMIZATION: Fetch nodes and edges in parallel
    parallel_fetch_timer = perf_monitor.start_timer("parallel_data_fetch")
    
    # Create parallel tasks for data fetching
    async def fetch_nodes():
        nodes_cursor = database.nodes.find({"workspace_id": ObjectId(workspace_id)})
        node_docs = await nodes_cursor.to_list(length=None)
        
        # Convert ObjectId fields to strings for Pydantic validation
        nodes = []
        for doc in node_docs:
            doc['_id'] = str(doc['_id'])
            if isinstance(doc.get('workspace_id'), ObjectId):
                doc['workspace_id'] = str(doc['workspace_id'])
            nodes.append(NodeInDB(**doc))
        return nodes
    
    async def fetch_edges():
        edges_cursor = database.edges.find({"workspace_id": ObjectId(workspace_id)})
        edge_docs = await edges_cursor.to_list(length=None)
        edges = []
        for doc in edge_docs:
            # Convert ObjectId fields to strings for Pydantic validation
            if isinstance(doc.get('_id'), ObjectId):
                doc['_id'] = str(doc['_id'])
            if isinstance(doc.get('workspace_id'), ObjectId):
                doc['workspace_id'] = str(doc['workspace_id'])
            if isinstance(doc.get('from_node_id'), ObjectId):
                doc['from_node_id'] = str(doc['from_node_id'])
            if isinstance(doc.get('to_node_id'), ObjectId):
                doc['to_node_id'] = str(doc['to_node_id'])
            edges.append(EdgeInDB(**doc))
        return edges
    
    # Execute both queries in parallel
    nodes, edges = await asyncio.gather(fetch_nodes(), fetch_edges())
    
    perf_monitor.end_timer(parallel_fetch_timer, {
        "node_count": len(nodes),
        "edge_count": len(edges)
    })
    print(f"Found {len(nodes)} nodes and {len(edges)} edges (parallel fetch)")
    
    # OPTIMIZATION: Generate structured brief content with optimized algorithm
    content_timer = perf_monitor.start_timer("generate_brief_content_optimized")
    brief_content = _generate_brief_content_optimized(workspace, nodes, edges)
    perf_monitor.end_timer(content_timer, {
        "content_length": len(brief_content),
        "node_count": len(nodes),
        "edge_count": len(edges)
    })
    
    # Create response
    response_timer = perf_monitor.start_timer("create_response")
    response = GenerateBriefResponse(
        content=brief_content,
        generated_at=datetime.utcnow(),
        node_count=len(nodes),
        edge_count=len(edges)
    )
    perf_monitor.end_timer(response_timer)
    
    # End overall monitoring
    perf_monitor.end_timer(overall_timer, {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "content_length": len(brief_content),
        "success": True
    })
    
    print(f"Brief generated successfully, content length: {len(brief_content)}")
    return response


@router.get("/workspaces/{workspace_id}/export")
async def export_workspace(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Export workspace data as a JSON file.
    
    Returns the raw workspace data (nodes, edges, settings) as a JSON file
    with appropriate Content-Disposition header to trigger download.
    
    Args:
        workspace_id: Workspace ID to export
        current_user: Current authenticated user (from dependency)
        
    Returns:
        JSON file download with workspace data
        
    Raises:
        HTTPException: If workspace not found or access denied
    """
    # Validate ObjectId format
    if not ObjectId.is_valid(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    workspace = WorkspaceInDB(**workspace_doc)
    
    # Fetch all nodes for the workspace
    nodes_cursor = database.nodes.find({"workspace_id": ObjectId(workspace_id)})
    node_docs = await nodes_cursor.to_list(length=None)
    
    # Fetch all edges for the workspace
    edges_cursor = database.edges.find({"workspace_id": ObjectId(workspace_id)})
    edge_docs = await edges_cursor.to_list(length=None)
    
    # Prepare export data
    export_data = {
        "workspace": {
            "id": str(workspace.id),
            "title": workspace.title,
            "owner_id": str(workspace.owner_id),
            "created_at": workspace.created_at.isoformat(),
            "updated_at": workspace.updated_at.isoformat(),
            "settings": workspace.settings,
            "transform": workspace.transform
        },
        "nodes": [
            {
                "id": str(doc["_id"]),
                "workspace_id": str(doc["workspace_id"]),
                "title": doc["title"],
                "description": doc["description"],
                "type": doc["type"],
                "x": doc["x"],
                "y": doc["y"],
                "confidence": doc.get("confidence"),
                "feasibility": doc.get("feasibility"),
                "source_agent": doc.get("source_agent"),
                "created_at": doc["created_at"].isoformat(),
                "updated_at": doc["updated_at"].isoformat()
            }
            for doc in node_docs
        ],
        "edges": [
            {
                "id": str(doc["_id"]),
                "workspace_id": str(doc["workspace_id"]),
                "from_node_id": str(doc["from_node_id"]),
                "to_node_id": str(doc["to_node_id"]),
                "type": doc["type"],
                "description": doc["description"],
                "created_at": doc["created_at"].isoformat()
            }
            for doc in edge_docs
        ],
        "exported_at": datetime.utcnow().isoformat(),
        "export_version": "1.0"
    }
    
    # Convert to JSON string
    json_content = json.dumps(export_data, indent=2, ensure_ascii=False)
    
    # Create filename with workspace title and timestamp
    safe_title = "".join(c for c in workspace.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"workspace_{safe_title}_{timestamp}.json".replace(" ", "_")
    
    # Return JSON response with download headers
    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Content-Type": "application/json; charset=utf-8"
        }
    )


def _generate_brief_content(workspace: WorkspaceInDB, nodes: List[NodeInDB], edges: List[EdgeInDB]) -> str:
    """
    Generate structured brief content from workspace data.
    
    For this sprint, implements simple concatenation of node titles and descriptions
    organized by node type, as specified in the requirements.
    
    Args:
        workspace: Workspace data
        nodes: List of nodes in workspace
        edges: List of edges in workspace
        
    Returns:
        Generated brief content as markdown string
    """
    content_start_time = time.time()
    
    # Group nodes by type
    grouping_timer = perf_monitor.start_timer("group_nodes_by_type")
    nodes_by_type = {}
    for node in nodes:
        if node.type not in nodes_by_type:
            nodes_by_type[node.type] = []
        nodes_by_type[node.type].append(node)
    perf_monitor.end_timer(grouping_timer, {"unique_types": len(nodes_by_type)})
    
    # Start building the brief
    header_timer = perf_monitor.start_timer("build_brief_header")
    brief_lines = []
    brief_lines.append(f"# Strategic Brief: {workspace.title}")
    brief_lines.append("")
    brief_lines.append(f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    brief_lines.append(f"**Workspace:** {workspace.title}")
    brief_lines.append(f"**Total Nodes:** {len(nodes)}")
    brief_lines.append(f"**Total Connections:** {len(edges)}")
    brief_lines.append("")
    
    # Add executive summary
    brief_lines.append("## Executive Summary")
    brief_lines.append("")
    if nodes:
        brief_lines.append(f"This strategic analysis encompasses {len(nodes)} key elements across {len(nodes_by_type)} categories, ")
        brief_lines.append(f"with {len(edges)} interconnections mapping the strategic landscape.")
    else:
        brief_lines.append("This workspace is currently empty. Add nodes to generate a comprehensive brief.")
    brief_lines.append("")
    perf_monitor.end_timer(header_timer)
    
    # Process each node type
    nodes_processing_timer = perf_monitor.start_timer("process_node_types")
    type_order = ["human", "ai", "decision", "risk", "dependency"]
    type_titles = {
        "human": "Human Insights & Perspectives",
        "ai": "AI-Generated Analysis",
        "decision": "Key Decisions & Options",
        "risk": "Risk Assessment & Mitigation",
        "dependency": "Dependencies & Prerequisites"
    }
    
    nodes_processed = 0
    for node_type in type_order:
        if node_type in nodes_by_type:
            brief_lines.append(f"## {type_titles.get(node_type, node_type.title() + ' Elements')}")
            brief_lines.append("")
            
            for node in nodes_by_type[node_type]:
                brief_lines.append(f"### {node.title}")
                if node.description:
                    brief_lines.append(f"{node.description}")
                
                # Add metadata if available
                metadata_parts = []
                if node.confidence is not None:
                    metadata_parts.append(f"Confidence: {node.confidence}%")
                if node.feasibility:
                    metadata_parts.append(f"Feasibility: {node.feasibility}")
                if node.source_agent:
                    metadata_parts.append(f"Source: {node.source_agent}")
                
                if metadata_parts:
                    brief_lines.append(f"*{' | '.join(metadata_parts)}*")
                
                brief_lines.append("")
                nodes_processed += 1
    
    # Handle any other node types not in the standard list
    for node_type, type_nodes in nodes_by_type.items():
        if node_type not in type_order:
            brief_lines.append(f"## {node_type.title()} Elements")
            brief_lines.append("")
            
            for node in type_nodes:
                brief_lines.append(f"### {node.title}")
                if node.description:
                    brief_lines.append(f"{node.description}")
                brief_lines.append("")
                nodes_processed += 1
    
    perf_monitor.end_timer(nodes_processing_timer, {"nodes_processed": nodes_processed})
    
    # Add connections summary
    edges_processing_timer = perf_monitor.start_timer("process_edges")
    edges_processed = 0
    if edges:
        brief_lines.append("## Strategic Connections")
        brief_lines.append("")
        brief_lines.append("The following connections map the relationships between strategic elements:")
        brief_lines.append("")
        
        # Group edges by type
        edges_by_type = {}
        for edge in edges:
            if edge.type not in edges_by_type:
                edges_by_type[edge.type] = []
            edges_by_type[edge.type].append(edge)
        
        for edge_type, type_edges in edges_by_type.items():
            brief_lines.append(f"### {edge_type.title()} Relationships ({len(type_edges)})")
            brief_lines.append("")
            
            for edge in type_edges:
                # Find source and target node titles - THIS IS POTENTIALLY SLOW O(n*m)
                source_node = next((n for n in nodes if str(n.id) == str(edge.from_node_id)), None)
                target_node = next((n for n in nodes if str(n.id) == str(edge.to_node_id)), None)
                
                if source_node and target_node:
                    brief_lines.append(f"- **{source_node.title}** → **{target_node.title}**")
                    if edge.description:
                        brief_lines.append(f"  {edge.description}")
                brief_lines.append("")
                edges_processed += 1
    
    perf_monitor.end_timer(edges_processing_timer, {
        "edges_processed": edges_processed,
        "edge_types": len(edges_by_type) if edges else 0
    })
    
    # Add conclusion
    conclusion_timer = perf_monitor.start_timer("build_conclusion")
    brief_lines.append("## Conclusion")
    brief_lines.append("")
    if nodes:
        brief_lines.append("This strategic brief synthesizes the key elements and relationships within the workspace. ")
        brief_lines.append("The interconnected nature of these elements provides a comprehensive view of the strategic landscape, ")
        brief_lines.append("enabling informed decision-making and strategic planning.")
    else:
        brief_lines.append("This workspace is ready for strategic content. Begin by adding nodes representing key strategic elements, ")
        brief_lines.append("decisions, risks, and dependencies to generate a comprehensive strategic brief.")
    perf_monitor.end_timer(conclusion_timer)
    
    # Final string join - potentially expensive for large content
    join_timer = perf_monitor.start_timer("join_brief_content")
    final_content = "\n".join(brief_lines)
    perf_monitor.end_timer(join_timer, {
        "total_lines": len(brief_lines),
        "final_content_length": len(final_content)
    })
    
    # Log overall content generation performance
    total_time = time.time() - content_start_time
    perf_monitor.log_document_processing(
        document_count=1,
        total_chars=len(final_content),
        processing_time=total_time
    )
    
    return final_content


@router.post("/workspaces/{workspace_id}/upload", response_model=List[DocumentUploadResponse])
async def upload_documents(
    workspace_id: str,
    files: List[UploadFile] = File(...),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Upload one or more documents to a workspace.
    
    Supports PDF, DOCX, XLSX, PNG, JPG, and JPEG files.
    Files are stored in GridFS and processed asynchronously.
    
    Args:
        workspace_id: Workspace ID to upload documents to
        files: List of files to upload
        current_user: Current authenticated user
        
    Returns:
        List of upload responses with document metadata
        
    Raises:
        HTTPException: If workspace not found, file validation fails, or upload fails
    """
    logger.info(f"=== DOCUMENT UPLOAD ENDPOINT CALLED ===")
    logger.info(f"Workspace ID: {workspace_id}")
    logger.info(f"Number of files: {len(files)}")
    logger.info(f"Current User: {current_user.email}")
    
    # Validate ObjectId format
    if not ObjectId.is_valid(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied"
        )
    
    uploaded_documents = []
    
    for file in files:
        try:
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            logger.info(f"Processing file: {file.filename}, size: {file_size} bytes")
            
            # Validate file
            if not get_document_processor().is_supported_file(file.filename, file.content_type):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported file type: {file.filename}"
                )
            
            if not get_document_processor().validate_file_size(file_size):
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large: {file.filename}. Maximum size is 20MB."
                )
            
            # Store file in our in-memory file storage
            # Create a unique filename to avoid conflicts
            import uuid
            unique_filename = f"{uuid.uuid4()}_{file.filename}"
            
            gridfs_file_id = await database.file_storage.upload_from_stream(
                unique_filename,
                file_content,
                metadata={
                    "original_filename": file.filename,
                    "content_type": file.content_type,
                    "workspace_id": workspace_id,
                    "uploaded_by": current_user.id,
                    "upload_timestamp": datetime.utcnow()
                }
            )
            
            logger.info(f"File stored in GridFS with ID: {gridfs_file_id}")
            
            # Create document record
            now = datetime.utcnow()
            document = UploadedDocument(
                workspace_id=workspace_id,  # Keep as string for Pydantic validation
                filename=unique_filename,
                original_filename=file.filename,
                file_size=file_size,
                content_type=file.content_type,
                file_extension=get_document_processor().get_file_extension(file.filename),
                gridfs_file_id=str(gridfs_file_id),  # Convert to string for Pydantic validation
                processing_status="pending",
                created_at=now,
                updated_at=now
            )
            
            # Insert document record
            result = await database.documents.insert_one(document.model_dump(by_alias=True, exclude={"id"}))
            document.id = result.inserted_id
            
            logger.info(f"Document record created with ID: {document.id}")
            
            # Process document asynchronously (in background)
            try:
                processing_result = await get_document_processor().process_document(
                    file_content, file.filename, file.content_type
                )
                
                # Update document with processing results
                await database.documents.update_one(
                    {"_id": document.id},
                    {
                        "$set": {
                            "extracted_text": processing_result.get("extracted_text"),
                            "extracted_data": processing_result.get("extracted_data"),
                            "page_count": processing_result.get("page_count"),
                            "processing_status": processing_result.get("processing_status", "completed"),
                            "processing_error": processing_result.get("processing_error"),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                logger.info(f"Document processing completed for: {file.filename}")
                
            except Exception as processing_error:
                logger.error(f"Document processing failed for {file.filename}: {str(processing_error)}")
                # Update document with error status
                await database.documents.update_one(
                    {"_id": document.id},
                    {
                        "$set": {
                            "processing_status": "failed",
                            "processing_error": str(processing_error),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            
            # Create response with current processing status
            # Get the updated document to ensure we have the latest status
            updated_doc = await database.documents.find_one({"_id": document.id})
            current_status = updated_doc.get("processing_status", "pending") if updated_doc else "pending"
            
            upload_response = DocumentUploadResponse(
                id=str(document.id),
                filename=file.filename,
                file_size=file_size,
                content_type=file.content_type,
                processing_status=current_status,
                created_at=document.created_at
            )
            
            uploaded_documents.append(upload_response)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading file {file.filename}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file {file.filename}: {str(e)}"
            )
    
    logger.info(f"Successfully uploaded {len(uploaded_documents)} documents")
    return uploaded_documents


@router.get("/workspaces/{workspace_id}/documents", response_model=DocumentListResponse)
async def list_documents(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    List all documents in a workspace.
    
    Args:
        workspace_id: Workspace ID to list documents for
        current_user: Current authenticated user
        
    Returns:
        List of documents with metadata
        
    Raises:
        HTTPException: If workspace not found or access denied
    """
    # Validate ObjectId format
    if not ObjectId.is_valid(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied"
        )
    
    # Fetch documents
    documents_cursor = database.documents.find({"workspace_id": ObjectId(workspace_id)})
    document_docs = await documents_cursor.to_list(length=None)
    
    documents = []
    for doc in document_docs:
        documents.append(DocumentUploadResponse(
            id=str(doc["_id"]),
            filename=doc["original_filename"],
            file_size=doc["file_size"],
            content_type=doc["content_type"],
            processing_status=doc["processing_status"],
            created_at=doc["created_at"]
        ))
    
    return DocumentListResponse(
        documents=documents,
        total=len(documents)
    )


@router.get("/workspaces/{workspace_id}/documents/{document_id}/content")
async def get_document_content(
    workspace_id: str,
    document_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Get processed content from a document.
    
    Args:
        workspace_id: Workspace ID
        document_id: Document ID
        current_user: Current authenticated user
        
    Returns:
        Document processing result with extracted content
        
    Raises:
        HTTPException: If document not found or access denied
    """
    # Validate ObjectId formats
    if not ObjectId.is_valid(workspace_id) or not ObjectId.is_valid(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace or document ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied"
        )
    
    # Fetch document
    document_doc = await database.documents.find_one({
        "_id": ObjectId(document_id),
        "workspace_id": ObjectId(workspace_id)
    })
    
    if not document_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return DocumentProcessingResult(
        document_id=document_id,
        extracted_text=document_doc.get("extracted_text"),
        extracted_data=document_doc.get("extracted_data"),
        page_count=document_doc.get("page_count"),
        processing_status=document_doc["processing_status"],
        processing_error=document_doc.get("processing_error")
    )


@router.delete("/workspaces/{workspace_id}/documents/{document_id}")
async def delete_document(
    workspace_id: str,
    document_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Delete a document and its associated file.
    
    Args:
        workspace_id: Workspace ID
        document_id: Document ID to delete
        current_user: Current authenticated user
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If document not found or access denied
    """
    # Validate ObjectId formats
    if not ObjectId.is_valid(workspace_id) or not ObjectId.is_valid(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace or document ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied"
        )
    
    # Fetch document
    document_doc = await database.documents.find_one({
        "_id": ObjectId(document_id),
        "workspace_id": ObjectId(workspace_id)
    })
    
    if not document_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete file from our in-memory file storage
    try:
        await database.file_storage.delete(ObjectId(document_doc["gridfs_file_id"]))
    except Exception as e:
        logger.warning(f"Failed to delete file: {str(e)}")
    
    # Delete document record
    await database.documents.delete_one({"_id": ObjectId(document_id)})
    
    return {"message": "Document deleted successfully"}


def _generate_brief_content_optimized(workspace: WorkspaceInDB, nodes: List[NodeInDB], edges: List[EdgeInDB]) -> str:
    """
    OPTIMIZED version of brief content generation with performance improvements:
    1. Pre-built node lookup dictionary (O(1) instead of O(n))
    2. Efficient string building using list comprehension
    3. Reduced redundant operations
    4. Parallel processing where possible
    
    Args:
        workspace: Workspace data
        nodes: List of nodes in workspace
        edges: List of edges in workspace
        
    Returns:
        Generated brief content as markdown string
    """
    content_start_time = time.time()
    
    # OPTIMIZATION 1: Pre-build node lookup dictionary for O(1) access
    node_lookup_timer = perf_monitor.start_timer("build_node_lookup")
    node_lookup = {str(node.id): node for node in nodes}
    perf_monitor.end_timer(node_lookup_timer, {"nodes_indexed": len(node_lookup)})
    
    # OPTIMIZATION 2: Group nodes by type using defaultdict for efficiency
    grouping_timer = perf_monitor.start_timer("group_nodes_optimized")
    nodes_by_type = defaultdict(list)
    for node in nodes:
        nodes_by_type[node.type].append(node)
    perf_monitor.end_timer(grouping_timer, {"unique_types": len(nodes_by_type)})
    
    # OPTIMIZATION 3: Use list for efficient string building
    header_timer = perf_monitor.start_timer("build_header_optimized")
    brief_parts = [
        f"# Strategic Brief: {workspace.title}",
        "",
        f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC",
        f"**Workspace:** {workspace.title}",
        f"**Total Nodes:** {len(nodes)}",
        f"**Total Connections:** {len(edges)}",
        "",
        "## Executive Summary",
        ""
    ]
    
    if nodes:
        brief_parts.extend([
            f"This strategic analysis encompasses {len(nodes)} key elements across {len(nodes_by_type)} categories, ",
            f"with {len(edges)} interconnections mapping the strategic landscape."
        ])
    else:
        brief_parts.append("This workspace is currently empty. Add nodes to generate a comprehensive brief.")
    
    brief_parts.append("")
    perf_monitor.end_timer(header_timer)
    
    # OPTIMIZATION 4: Process node types with efficient iteration
    nodes_processing_timer = perf_monitor.start_timer("process_nodes_optimized")
    type_order = ["human", "ai", "decision", "risk", "dependency"]
    type_titles = {
        "human": "Human Insights & Perspectives",
        "ai": "AI-Generated Analysis",
        "decision": "Key Decisions & Options",
        "risk": "Risk Assessment & Mitigation",
        "dependency": "Dependencies & Prerequisites"
    }
    
    nodes_processed = 0
    
    # Process ordered types first
    for node_type in type_order:
        if node_type in nodes_by_type:
            brief_parts.append(f"## {type_titles.get(node_type, node_type.title() + ' Elements')}")
            brief_parts.append("")
            
            for node in nodes_by_type[node_type]:
                brief_parts.append(f"### {node.title}")
                if node.description:
                    brief_parts.append(node.description)
                
                # OPTIMIZATION 5: Build metadata efficiently
                metadata_parts = []
                if node.confidence is not None:
                    metadata_parts.append(f"Confidence: {node.confidence}%")
                if node.feasibility:
                    metadata_parts.append(f"Feasibility: {node.feasibility}")
                if node.source_agent:
                    metadata_parts.append(f"Source: {node.source_agent}")
                
                if metadata_parts:
                    brief_parts.append(f"*{' | '.join(metadata_parts)}*")
                
                brief_parts.append("")
                nodes_processed += 1
    
    # Process remaining node types
    for node_type, type_nodes in nodes_by_type.items():
        if node_type not in type_order:
            brief_parts.extend([
                f"## {node_type.title()} Elements",
                ""
            ])
            
            for node in type_nodes:
                brief_parts.extend([
                    f"### {node.title}",
                    node.description if node.description else "",
                    ""
                ])
                nodes_processed += 1
    
    perf_monitor.end_timer(nodes_processing_timer, {"nodes_processed": nodes_processed})
    
    # OPTIMIZATION 6: Process edges with O(1) node lookup instead of O(n)
    edges_processing_timer = perf_monitor.start_timer("process_edges_optimized")
    edges_processed = 0
    
    if edges:
        brief_parts.extend([
            "## Strategic Connections",
            "",
            "The following connections map the relationships between strategic elements:",
            ""
        ])
        
        # Group edges by type efficiently
        edges_by_type = defaultdict(list)
        for edge in edges:
            edges_by_type[edge.type].append(edge)
        
        for edge_type, type_edges in edges_by_type.items():
            brief_parts.extend([
                f"### {edge_type.title()} Relationships ({len(type_edges)})",
                ""
            ])
            
            for edge in type_edges:
                # CRITICAL OPTIMIZATION: O(1) node lookup instead of O(n) search
                source_node = node_lookup.get(str(edge.from_node_id))
                target_node = node_lookup.get(str(edge.to_node_id))
                
                if source_node and target_node:
                    brief_parts.append(f"- **{source_node.title}** → **{target_node.title}**")
                    if edge.description:
                        brief_parts.append(f"  {edge.description}")
                brief_parts.append("")
                edges_processed += 1
    
    perf_monitor.end_timer(edges_processing_timer, {
        "edges_processed": edges_processed,
        "edge_types": len(edges_by_type) if edges else 0
    })
    
    # Add conclusion
    conclusion_timer = perf_monitor.start_timer("build_conclusion_optimized")
    brief_parts.extend([
        "## Conclusion",
        ""
    ])
    
    if nodes:
        brief_parts.extend([
            "This strategic brief synthesizes the key elements and relationships within the workspace. ",
            "The interconnected nature of these elements provides a comprehensive view of the strategic landscape, ",
            "enabling informed decision-making and strategic planning."
        ])
    else:
        brief_parts.extend([
            "This workspace is ready for strategic content. Begin by adding nodes representing key strategic elements, ",
            "decisions, risks, and dependencies to generate a comprehensive strategic brief."
        ])
    
    perf_monitor.end_timer(conclusion_timer)
    
    # OPTIMIZATION 7: Single join operation instead of repeated concatenation
    join_timer = perf_monitor.start_timer("join_content_optimized")
    final_content = "\n".join(brief_parts)
    perf_monitor.end_timer(join_timer, {
        "total_parts": len(brief_parts),
        "final_content_length": len(final_content)
    })
    
    # Log overall performance improvement
    total_time = time.time() - content_start_time
    perf_monitor.log_document_processing(
        document_count=1,
        total_chars=len(final_content),
        processing_time=total_time
    )
    
    print(f"🚀 [OPTIMIZED] Brief content generated in {total_time*1000:.2f}ms")
    
    return final_content