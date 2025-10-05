# Agentic Boardroom Backend

FastAPI backend for the Agentic Boardroom strategic decision-making platform.

## Sprint 0 - Environment Setup & Frontend Connection

This implementation covers the basic setup and health check endpoint as specified in the Backend Development Plan.

## Setup

1. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # or
   source venv/bin/activate  # Linux/Mac
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   # Copy the example file
   copy .env.example .env
   
   # Edit .env and add your Anthropic API key
   # Get your key from: https://console.anthropic.com/
   ```
   
   **Required variables:**
   - `ANTHROPIC_API_KEY` - Your Anthropic API key (required for AI features)
   - `MONGODB_URI` - MongoDB connection string (default: `mongodb://localhost:27017/agentic_boardroom`)
   
   See [../ANTHROPIC_API_KEY_SETUP.md](../ANTHROPIC_API_KEY_SETUP.md) for detailed setup instructions.

4. **Run the server:**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

## API Endpoints

### Health Check
- **GET** `/api/v1/healthz`
- Returns system health status and database connectivity
- Response format:
  ```json
  {
    "status": "healthy|unhealthy",
    "timestamp": "2025-09-17T19:50:16.479114",
    "database": {
      "connected": true|false,
      "response_time_ms": 12.34,
      "error": null|"error message"
    },
    "version": "1.0.0"
  }
  ```

## Configuration

Environment variables in `.env`:
- `ANTHROPIC_API_KEY`: **Required** - Your Anthropic API key for Claude AI
- `MONGODB_URI`: MongoDB connection string (default: `mongodb://localhost:27017/agentic_boardroom`)
- `APP_ENV`: Application environment (development/production)
- `PORT`: Server port (default: 8000)
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `JWT_SECRET`: JWT signing secret
- `OPENAI_API_KEY`: Optional - OpenAI API key if using OpenAI models

## Development

- Server runs on `http://localhost:8000`
- API documentation available at `http://localhost:8000/docs` (Swagger UI)
- Alternative docs at `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── routers/             # API route handlers
│   ├── __init__.py
│   └── health.py        # Health check endpoint
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Next Steps

Sprint 0 is complete. The next sprints will implement:
- S1: Authentication system
- S2: Workspace management
- S3: Node & Edge system
- S4: AI Agent system
- S5: Chat & Real-time communication
- S6: Document generation & Export