from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from database import connect_to_mongo, close_mongo_connection

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    # Seed agents on startup
    from utils.seed_agents import seed_agents
    await seed_agents()
    yield
    # Shutdown
    await close_mongo_connection()

# Create FastAPI app with lifespan
app = FastAPI(
    title="Agentic Boardroom API",
    description="Backend API for the Agentic Boardroom strategic decision-making platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5137").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins + ["http://localhost:5137"],  # Ensure frontend origin is allowed
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint that returns server status"""
    return {"message": "Server is running"}

# Import routers
from routers import health, auth, workspaces, nodes, edges, agents, messages, documents, interactions, cognitive_analysis

# Include routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(workspaces.router, prefix="/api/v1")
app.include_router(nodes.router, prefix="/api/v1")
app.include_router(edges.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")
app.include_router(interactions.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(cognitive_analysis.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)