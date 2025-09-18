from fastapi import APIRouter, HTTPException, status, Depends, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from models.user import UserResponse
from models.node import NodeInDB
from models.edge import EdgeInDB
from models.workspace import WorkspaceInDB
from utils.dependencies import get_current_active_user
from database import get_database
from bson import ObjectId
from typing import Dict, Any, List
import json
from datetime import datetime

router = APIRouter(tags=["Documents"])


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
    nodes = [NodeInDB(**doc) for doc in node_docs]
    
    # Fetch all edges for the workspace
    edges_cursor = database.edges.find({"workspace_id": ObjectId(workspace_id)})
    edge_docs = await edges_cursor.to_list(length=None)
    edges = [EdgeInDB(**doc) for doc in edge_docs]
    
    # Generate structured brief content
    brief_content = _generate_brief_content(workspace, nodes, edges)
    
    return GenerateBriefResponse(
        content=brief_content,
        generated_at=datetime.utcnow(),
        node_count=len(nodes),
        edge_count=len(edges)
    )


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
    # Group nodes by type
    nodes_by_type = {}
    for node in nodes:
        if node.type not in nodes_by_type:
            nodes_by_type[node.type] = []
        nodes_by_type[node.type].append(node)
    
    # Start building the brief
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
    
    # Process each node type
    type_order = ["human", "ai", "decision", "risk", "dependency"]
    type_titles = {
        "human": "Human Insights & Perspectives",
        "ai": "AI-Generated Analysis",
        "decision": "Key Decisions & Options",
        "risk": "Risk Assessment & Mitigation",
        "dependency": "Dependencies & Prerequisites"
    }
    
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
    
    # Add connections summary
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
                # Find source and target node titles
                source_node = next((n for n in nodes if str(n.id) == str(edge.from_node_id)), None)
                target_node = next((n for n in nodes if str(n.id) == str(edge.to_node_id)), None)
                
                if source_node and target_node:
                    brief_lines.append(f"- **{source_node.title}** → **{target_node.title}**")
                    if edge.description:
                        brief_lines.append(f"  {edge.description}")
                brief_lines.append("")
    
    # Add conclusion
    brief_lines.append("## Conclusion")
    brief_lines.append("")
    if nodes:
        brief_lines.append("This strategic brief synthesizes the key elements and relationships within the workspace. ")
        brief_lines.append("The interconnected nature of these elements provides a comprehensive view of the strategic landscape, ")
        brief_lines.append("enabling informed decision-making and strategic planning.")
    else:
        brief_lines.append("This workspace is ready for strategic content. Begin by adding nodes representing key strategic elements, ")
        brief_lines.append("decisions, risks, and dependencies to generate a comprehensive strategic brief.")
    
    return "\n".join(brief_lines)