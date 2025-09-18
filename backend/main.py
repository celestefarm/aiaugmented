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
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Import routers
from routers import health, auth, workspaces, nodes, edges, agents, messages, documents

# Include routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(workspaces.router, prefix="/api/v1")
app.include_router(nodes.router, prefix="/api/v1")
app.include_router(edges.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)