from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import asyncio
from datetime import datetime

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    database: Dict[str, Any]
    version: str

@router.get("/healthz", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint that verifies system status and database connectivity.
    Returns JSON with status, timestamp, database connectivity, and version info.
    """
    from database import get_database
    db_client = get_database()
    
    health_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "database": {
            "connected": False,
            "response_time_ms": None,
            "error": None
        },
        "version": "1.0.0"
    }
    
    # Test database connectivity
    if db_client is not None:
        try:
            start_time = asyncio.get_event_loop().time()
            # Test with a simple database operation
            await db_client.users.count_documents({})
            end_time = asyncio.get_event_loop().time()
            
            response_time_ms = round((end_time - start_time) * 1000, 2)
            
            health_data["database"] = {
                "connected": True,
                "response_time_ms": response_time_ms,
                "error": None
            }
        except Exception as e:
            health_data["status"] = "unhealthy"
            health_data["database"] = {
                "connected": False,
                "response_time_ms": None,
                "error": str(e)
            }
    else:
        health_data["status"] = "unhealthy"
        health_data["database"] = {
            "connected": False,
            "response_time_ms": None,
            "error": "Database client not initialized"
        }
    
    return HealthResponse(**health_data)