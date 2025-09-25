from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from database_memory import connect_to_mongo, close_mongo_connection

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    # Seed agents on startup
    from utils.seed_agents import seed_agents
    await seed_agents()
    # Seed users on startup
    from utils.seed_users import seed_users
    await seed_users()
    # Seed workspaces on startup
    from utils.seed_workspaces import seed_workspaces
    await seed_workspaces()
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
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5137,http://localhost:5138,http://localhost:5139").split(",")
# Clean up any whitespace from origins
cors_origins = [origin.strip() for origin in cors_origins]
final_origins = cors_origins + ["http://localhost:5137", "http://localhost:5138", "http://localhost:5139", "https://aiaugmented.onrender.com"]
# Remove duplicates while preserving order
final_origins = list(dict.fromkeys(final_origins))

# Add wildcard for development - REMOVE IN PRODUCTION
if os.getenv("ENVIRONMENT", "development") == "development":
    final_origins.append("*")

print(f"DEBUG: CORS Origins configured: {final_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=final_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint that returns server status"""
    return {"message": "Server is running"}

# Import routers
from routers import health, auth, workspaces, nodes, edges, agents, messages, documents, interactions, cognitive_analysis, ai_summarization

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
app.include_router(ai_summarization.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)