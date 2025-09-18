from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Tuple
from models.user import UserResponse
from utils.dependencies import get_current_active_user
from database import get_database
from bson import ObjectId
from datetime import datetime
import httpx
import os
import json
import re

router = APIRouter(tags=["cognitive-analysis"])


class NodeRelationshipRequest(BaseModel):
    """Request model for analyzing node relationships"""
    workspace_id: str = Field(..., description="Workspace ID")
    node_ids: Optional[List[str]] = Field(None, description="Specific node IDs to analyze (optional)")


class RelationshipSuggestion(BaseModel):
    """Model for relationship suggestions between nodes"""
    from_node_id: str
    to_node_id: str
    relationship_type: str  # 'support', 'contradiction', 'dependency', 'ai-relationship'
    strength: float  # 0.0 to 1.0
    reasoning: str
    keywords: List[str]


class CognitiveAnalysisResponse(BaseModel):
    """Response model for cognitive analysis"""
    suggestions: List[RelationshipSuggestion]
    clusters: List[Dict[str, str]]
    insights: List[str]


async def analyze_node_relationships_with_ai(nodes: List[Dict], workspace_context: str = "") -> List[RelationshipSuggestion]:
    """Use OpenAI to analyze relationships between nodes"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return []
    
    # Create a comprehensive prompt for relationship analysis
    nodes_text = ""
    for i, node in enumerate(nodes):
        nodes_text += f"Node {i+1} (ID: {node['id']}): {node['title']}\n"
        nodes_text += f"Description: {node['description']}\n"
        nodes_text += f"Type: {node['type']}\n"
        if node.get('source_agent'):
            nodes_text += f"Source Agent: {node['source_agent']}\n"
        nodes_text += "\n"
    
    system_prompt = """You are a cognitive analysis AI that specializes in identifying relationships between ideas, concepts, and strategic elements. Your task is to analyze nodes in a strategic thinking map and suggest meaningful connections.

For each potential relationship, consider:
1. SUPPORT relationships: Ideas that reinforce, enable, or strengthen each other
2. CONTRADICTION relationships: Ideas that conflict, oppose, or create tension
3. DEPENDENCY relationships: Ideas where one depends on or requires another
4. AI-RELATIONSHIP: Complex interdependencies, cause-effect chains, or emergent connections

Think like a strategic consultant analyzing:
- Business implications and dependencies
- Risk factors and mitigation strategies  
- Market dynamics and competitive forces
- Operational requirements and constraints
- Political/power dynamics in organizations
- Legal and compliance considerations
- Technology enablers and barriers

Return your analysis as a JSON array of relationship suggestions. Each suggestion should have:
- from_node_id: source node ID
- to_node_id: target node ID  
- relationship_type: one of 'support', 'contradiction', 'dependency', 'ai-relationship'
- strength: confidence score 0.0-1.0
- reasoning: clear explanation of why this relationship exists
- keywords: relevant terms that indicate this relationship

Focus on non-obvious but meaningful connections. Think about second and third-order effects."""

    user_prompt = f"""Analyze these strategic nodes and suggest relationships:

{nodes_text}

Workspace Context: {workspace_context}

Identify meaningful relationships between these nodes. Focus on strategic implications, dependencies, risks, and opportunities. Consider how ideas in different domains (marketing, legal, technology, operations, etc.) might connect."""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gpt-4",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 2000,
        "temperature": 0.7
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            
            # Extract JSON from the response
            json_match = re.search(r'\[.*\]', ai_response, re.DOTALL)
            if json_match:
                suggestions_data = json.loads(json_match.group())
                suggestions = []
                
                for suggestion in suggestions_data:
                    # Validate that the node IDs exist
                    from_id = suggestion.get('from_node_id')
                    to_id = suggestion.get('to_node_id')
                    
                    if from_id and to_id and from_id != to_id:
                        # Check if nodes exist
                        from_exists = any(node['id'] == from_id for node in nodes)
                        to_exists = any(node['id'] == to_id for node in nodes)
                        
                        if from_exists and to_exists:
                            suggestions.append(RelationshipSuggestion(
                                from_node_id=from_id,
                                to_node_id=to_id,
                                relationship_type=suggestion.get('relationship_type', 'ai-relationship'),
                                strength=min(1.0, max(0.0, suggestion.get('strength', 0.5))),
                                reasoning=suggestion.get('reasoning', ''),
                                keywords=suggestion.get('keywords', [])
                            ))
                
                return suggestions
            
    except Exception as e:
        print(f"Error in AI relationship analysis: {e}")
    
    return []


@router.post("/workspaces/{workspace_id}/cognitive-analysis", response_model=CognitiveAnalysisResponse)
async def analyze_workspace_relationships(
    workspace_id: str,
    request: NodeRelationshipRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Analyze relationships between nodes using AI-powered cognitive analysis.
    
    This endpoint provides:
    1. Relationship suggestions between existing nodes
    2. Conceptual clusters of related ideas
    3. Strategic insights about the workspace
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
        "owner_id": current_user.id
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Get nodes for analysis
    query = {"workspace_id": ObjectId(workspace_id)}
    if request.node_ids:
        # Validate node IDs
        valid_node_ids = [ObjectId(nid) for nid in request.node_ids if ObjectId.is_valid(nid)]
        if valid_node_ids:
            query["_id"] = {"$in": valid_node_ids}
    
    cursor = database.nodes.find(query)
    node_docs = await cursor.to_list(length=None)
    
    if len(node_docs) < 2:
        return CognitiveAnalysisResponse(
            suggestions=[],
            clusters=[],
            insights=["Need at least 2 nodes for relationship analysis"]
        )
    
    # Convert nodes to analysis format
    nodes_for_analysis = []
    for doc in node_docs:
        nodes_for_analysis.append({
            "id": str(doc["_id"]),
            "title": doc["title"],
            "description": doc["description"],
            "type": doc["type"],
            "source_agent": doc.get("source_agent"),
            "x": doc["x"],
            "y": doc["y"]
        })
    
    # Get workspace context
    workspace_context = f"Workspace: {workspace_doc.get('title', 'Strategic Analysis')}"
    
    # Analyze relationships with AI
    suggestions = await analyze_node_relationships_with_ai(nodes_for_analysis, workspace_context)
    
    # Create simple clusters based on node types and proximity
    clusters = []
    type_groups = {}
    for node in nodes_for_analysis:
        node_type = node["type"]
        if node_type not in type_groups:
            type_groups[node_type] = []
        type_groups[node_type].append(node)
    
    for node_type, nodes in type_groups.items():
        if len(nodes) > 1:
            clusters.append({
                "type": f"{node_type}_cluster",
                "name": f"{node_type.title()} Concepts",
                "nodes": [node["id"] for node in nodes],
                "description": f"Related {node_type} concepts and ideas"
            })
    
    # Generate insights
    insights = []
    if suggestions:
        insights.append(f"Found {len(suggestions)} potential relationships between your ideas")
        
        # Count relationship types
        type_counts = {}
        for suggestion in suggestions:
            rel_type = suggestion.relationship_type
            type_counts[rel_type] = type_counts.get(rel_type, 0) + 1
        
        for rel_type, count in type_counts.items():
            insights.append(f"{count} {rel_type} relationships identified")
    
    if clusters:
        insights.append(f"Identified {len(clusters)} conceptual clusters")
    
    # Add strategic insights
    if any(s.relationship_type == "contradiction" for s in suggestions):
        insights.append("⚠️ Found potential conflicts that may need resolution")
    
    if any(s.relationship_type == "dependency" for s in suggestions):
        insights.append("🔗 Identified critical dependencies in your strategy")
    
    return CognitiveAnalysisResponse(
        suggestions=suggestions,
        clusters=clusters,
        insights=insights
    )


@router.post("/workspaces/{workspace_id}/auto-connect")
async def auto_connect_nodes(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Automatically create connections between nodes based on AI analysis.
    """
    # Get cognitive analysis
    analysis_request = NodeRelationshipRequest(workspace_id=workspace_id)
    analysis = await analyze_workspace_relationships(workspace_id, analysis_request, current_user)
    
    database = get_database()
    created_connections = []
    
    # Create edges for high-confidence suggestions
    for suggestion in analysis.suggestions:
        if suggestion.strength >= 0.7:  # Only create high-confidence connections
            try:
                # Check if connection already exists
                existing = await database.edges.find_one({
                    "workspace_id": ObjectId(workspace_id),
                    "$or": [
                        {
                            "from_node_id": ObjectId(suggestion.from_node_id),
                            "to_node_id": ObjectId(suggestion.to_node_id)
                        },
                        {
                            "from_node_id": ObjectId(suggestion.to_node_id),
                            "to_node_id": ObjectId(suggestion.from_node_id)
                        }
                    ]
                })
                
                if not existing:
                    edge_doc = {
                        "workspace_id": ObjectId(workspace_id),
                        "from_node_id": ObjectId(suggestion.from_node_id),
                        "to_node_id": ObjectId(suggestion.to_node_id),
                        "type": suggestion.relationship_type,
                        "description": suggestion.reasoning,
                        "created_at": datetime.utcnow()
                    }
                    
                    result = await database.edges.insert_one(edge_doc)
                    created_connections.append({
                        "id": str(result.inserted_id),
                        "from_node_id": suggestion.from_node_id,
                        "to_node_id": suggestion.to_node_id,
                        "type": suggestion.relationship_type,
                        "reasoning": suggestion.reasoning
                    })
                    
            except Exception as e:
                print(f"Error creating auto-connection: {e}")
                continue
    
    return {
        "success": True,
        "connections_created": len(created_connections),
        "connections": created_connections,
        "message": f"Created {len(created_connections)} intelligent connections"
    }