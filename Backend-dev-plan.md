# Backend Development Plan: Agentic Boardroom

## 1) Executive Summary

**What will be built:** A FastAPI backend for the Agentic Boardroom - a cognitive workspace that transforms strategic decision-making through AI-driven analysis and collaborative mapping. The backend will power a sophisticated frontend featuring an interactive Exploration Map for divergent thinking and a Last-Mile Brief generator for executive-ready reports.

**Why:** The current frontend uses dummy data and requires a robust backend to support real-time collaboration, AI agent interactions, strategic node management, and document synthesis capabilities.

**Constraints honored:** FastAPI (Python 3.12) with async operations, MongoDB Atlas with Motor and Pydantic v2, no Docker, frontend-driven manual testing, single `main` branch workflow, API base path `/api/v1/*`, minimal design approach.

**Sprint approach:** Dynamic sprint count (S0-S6) to fully cover all discovered frontend features including workspace management, node/edge operations, AI agent system, chat functionality, document generation, and real-time collaboration.

## 2) In-scope & Success Criteria

**In-scope:**
- Workspace management with customizable titles and persistence
- Interactive node system (human, AI, decision, risk, dependency types)
- Dynamic edge/connection management with relationship types
- Multi-agent AI system with 9+ specialized agents
- Real-time chat with AI responses and message-to-map conversion
- Document synthesis from map data to structured briefs
- User authentication and session management
- Auto-save and version history
- Export capabilities (share, download, copy)
- Model selection and configuration

**Success criteria:**
- Full coverage of all frontend features with live data
- Each sprint passes manual UI testing
- Real-time collaboration works seamlessly
- AI agents provide contextual responses
- Map-to-brief synthesis generates coherent documents
- Push to `main` after each successful sprint

## 3) API Design

**Conventions:**
- Base path: `/api/v1`
- RESTful design with async FastAPI
- JSON request/response format
- Consistent error envelope: `{"error": "message", "code": "ERROR_CODE"}`
- Authentication via JWT tokens in Authorization header
- No pagination by default (keep minimal)

**Endpoints:**

**Health & System:**
- `GET /api/v1/healthz` - Health check with DB connectivity status

**Authentication:**
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login, returns JWT
- `POST /api/v1/auth/logout` - Logout (token invalidation)
- `GET /api/v1/auth/me` - Get current user profile

**Workspaces:**
- `GET /api/v1/workspaces` - List user workspaces
- `POST /api/v1/workspaces` - Create new workspace
- `GET /api/v1/workspaces/{workspace_id}` - Get workspace details
- `PUT /api/v1/workspaces/{workspace_id}` - Update workspace (title, settings)
- `DELETE /api/v1/workspaces/{workspace_id}` - Delete workspace

**Nodes:**
- `GET /api/v1/workspaces/{workspace_id}/nodes` - Get all nodes in workspace
- `POST /api/v1/workspaces/{workspace_id}/nodes` - Create new node
- `PUT /api/v1/workspaces/{workspace_id}/nodes/{node_id}` - Update node
- `DELETE /api/v1/workspaces/{workspace_id}/nodes/{node_id}` - Delete node

**Edges:**
- `GET /api/v1/workspaces/{workspace_id}/edges` - Get all edges in workspace
- `POST /api/v1/workspaces/{workspace_id}/edges` - Create new edge
- `PUT /api/v1/workspaces/{workspace_id}/edges/{edge_id}` - Update edge
- `DELETE /api/v1/workspaces/{workspace_id}/edges/{edge_id}` - Delete edge

**Chat & Messages:**
- `GET /api/v1/workspaces/{workspace_id}/messages` - Get chat history
- `POST /api/v1/workspaces/{workspace_id}/messages` - Send message, get AI response
- `POST /api/v1/workspaces/{workspace_id}/messages/{message_id}/add-to-map` - Convert message to node

**AI Agents:**
- `GET /api/v1/agents` - List available agents
- `POST /api/v1/workspaces/{workspace_id}/agents/{agent_id}/activate` - Activate agent
- `DELETE /api/v1/workspaces/{workspace_id}/agents/{agent_id}/activate` - Deactivate agent
- `POST /api/v1/agents/custom` - Create custom agent

**Document Generation:**
- `POST /api/v1/workspaces/{workspace_id}/generate-brief` - Generate brief from map data
- `GET /api/v1/workspaces/{workspace_id}/export` - Export workspace data

**History & Versioning:**
- `GET /api/v1/workspaces/{workspace_id}/history` - Get workspace history
- `POST /api/v1/workspaces/{workspace_id}/save` - Manual save checkpoint

## 4) Data Model (MongoDB Atlas)

**Collections:**

**users:**
- `_id: ObjectId` - Primary key
- `email: str` - Unique email address
- `password_hash: str` - Argon2 hashed password
- `name: str` - Display name
- `created_at: datetime` - Registration timestamp
- `last_login: datetime` - Last login timestamp
- `is_active: bool` - Account status

Example document:
```json
{
  "_id": "ObjectId('...')",
  "email": "user@example.com",
  "password_hash": "$argon2id$v=19$m=65536,t=3,p=4$...",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z",
  "last_login": "2024-01-15T14:22:00Z",
  "is_active": true
}
```

**workspaces:**
- `_id: ObjectId` - Primary key
- `title: str` - Workspace title (editable)
- `owner_id: ObjectId` - Reference to users collection
- `created_at: datetime` - Creation timestamp
- `updated_at: datetime` - Last modification timestamp
- `settings: dict` - Workspace configuration (model selection, etc.)
- `transform: dict` - Canvas transform state (x, y, scale)

Example document:
```json
{
  "_id": "ObjectId('...')",
  "title": "Q4 APAC Market Entry Strategy",
  "owner_id": "ObjectId('...')",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T14:22:00Z",
  "settings": {
    "selected_model": "gemini",
    "active_agents": ["strategist", "risk-compliance"]
  },
  "transform": {"x": 0, "y": 0, "scale": 1}
}
```

**nodes:**
- `_id: ObjectId` - Primary key
- `workspace_id: ObjectId` - Reference to workspaces collection
- `title: str` - Node title
- `description: str` - Node description/content
- `type: str` - Node type (human, ai, decision, risk, dependency)
- `x: float` - Canvas X position
- `y: float` - Canvas Y position
- `confidence: int` - Confidence percentage (optional)
- `feasibility: str` - Feasibility rating (optional)
- `source_agent: str` - Creating agent ID (optional)
- `created_at: datetime` - Creation timestamp
- `updated_at: datetime` - Last modification timestamp

Example document:
```json
{
  "_id": "ObjectId('...')",
  "workspace_id": "ObjectId('...')",
  "title": "Direct Market Entry",
  "description": "Establish direct presence in Singapore market",
  "type": "human",
  "x": 400.0,
  "y": 300.0,
  "confidence": 85,
  "feasibility": "high",
  "source_agent": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T14:22:00Z"
}
```

**edges:**
- `_id: ObjectId` - Primary key
- `workspace_id: ObjectId` - Reference to workspaces collection
- `from_node_id: ObjectId` - Source node reference
- `to_node_id: ObjectId` - Target node reference
- `type: str` - Relationship type (support, contradiction, dependency, ai-relationship)
- `description: str` - Connection description
- `created_at: datetime` - Creation timestamp

Example document:
```json
{
  "_id": "ObjectId('...')",
  "workspace_id": "ObjectId('...')",
  "from_node_id": "ObjectId('...')",
  "to_node_id": "ObjectId('...')",
  "type": "support",
  "description": "Direct entry supports market control objective",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**messages:**
- `_id: ObjectId` - Primary key
- `workspace_id: ObjectId` - Reference to workspaces collection
- `author: str` - Message author (user name or agent name)
- `type: str` - Message type (human, ai)
- `content: str` - Message content
- `created_at: datetime` - Message timestamp
- `added_to_map: bool` - Whether message was converted to node

Example document:
```json
{
  "_id": "ObjectId('...')",
  "workspace_id": "ObjectId('...')",
  "author": "Strategist Agent",
  "type": "ai",
  "content": "Consider the regulatory compliance timeline for Singapore market entry",
  "created_at": "2024-01-15T10:30:00Z",
  "added_to_map": false
}
```

**agents:**
- `_id: ObjectId` - Primary key
- `agent_id: str` - Unique agent identifier
- `name: str` - Agent display name
- `ai_role: str` - AI capabilities description
- `human_role: str` - Human collaboration description
- `is_custom: bool` - Whether agent is user-created
- `is_active: bool` - Default activation state
- `full_description: dict` - Detailed agent information

Example document:
```json
{
  "_id": "ObjectId('...')",
  "agent_id": "strategist",
  "name": "Strategist Agent",
  "ai_role": "Frame 2-3 strategic options, identify key trade-offs",
  "human_role": "Define success metrics, apply contextual judgment",
  "is_custom": false,
  "is_active": true,
  "full_description": {
    "role": "Strategic Options Architect",
    "mission": "Transform complex business challenges into clear, actionable strategic pathways"
  }
}
```

## 5) Frontend Audit & Feature Map

**Route/Component Analysis:**

**Index Page (`/`):**
- Purpose: Main application container with view switching
- Data needed: Current workspace, view state
- Backend capability: `GET /api/v1/workspaces/{id}` for workspace data
- Auth requirement: Yes

**Header Component:**
- Purpose: Navigation, model selection, export actions
- Data needed: Workspace title, available models, user info
- Backend capability: `PUT /api/v1/workspaces/{id}` for title updates, `GET /api/v1/workspaces/{id}/export` for exports
- Auth requirement: Yes

**ExplorationMap Component:**
- Purpose: Interactive canvas for strategic mapping
- Data needed: Nodes, edges, agents, chat messages, transform state
- Backend capability: Full CRUD for nodes/edges, agent management, chat system, auto-save
- Auth requirement: Yes
- Notes: Complex real-time interactions, drag-and-drop, connection creation

**LastMileBrief Component:**
- Purpose: Document generation and editing
- Data needed: Synthesized brief content from map data
- Backend capability: `POST /api/v1/workspaces/{id}/generate-brief` for AI synthesis
- Auth requirement: Yes
- Notes: Content editing with live updates

**Agent System:**
- Purpose: AI-powered strategic analysis
- Data needed: Agent configurations, activation states, conversation context
- Backend capability: Agent activation/deactivation, context-aware responses
- Auth requirement: Yes
- Notes: 9 specialized agents plus custom agent creation

## 6) Configuration & ENV Vars (core only)

```env
APP_ENV=development
PORT=8000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agentic_boardroom
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=86400
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 7) Background Work

**Auto-save Background Task:**
- What triggers it: Timer-based (every 30 seconds) or change-based
- What it does: Persists workspace state (nodes, edges, transform) to database
- UI observation: Last saved timestamp in footer, success/error notifications

**AI Response Generation:**
- What triggers it: User sends chat message with active agents
- What it does: Generates contextual AI responses based on workspace state and agent personas
- UI observation: Typing indicators, message delivery status

## 8) Integrations

**OpenAI/Anthropic/Google AI APIs:**
- Purpose: Power AI agent responses and document synthesis
- Flow: User message → Context preparation → LLM API call → Response processing → Storage
- Additional envs: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`

**File Storage (Optional):**
- Purpose: Export document storage and sharing
- Flow: Generate brief → Convert to PDF/DOCX → Store → Return download link
- Additional envs: `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

## 9) Testing Strategy (Manual via Frontend)

**Policy:** Validate all functionality through the UI by navigating screens, creating nodes, sending messages, and generating briefs. Observe Network tab in DevTools for API calls and responses.

**Per-sprint Manual Test Checklist (Frontend):**
- Navigate to application and verify loading
- Test authentication flow (signup/login)
- Create and modify workspace elements
- Verify real-time updates and persistence
- Test AI agent interactions
- Validate data consistency across views

**User Test Prompt:**
"Open the Agentic Boardroom application, create a new strategic workspace, add several nodes representing different strategic options, connect them with relationships, activate an AI agent to provide analysis, send a chat message and convert the response to a map node, then switch to the Brief view and generate a strategic document. Verify all data persists after page refresh."

**Post-sprint:** If tests pass, commit changes and push to GitHub `main`; if not, fix issues and retest before pushing.

## 10) Dynamic Sprint Plan & Backlog (S0-S6)

### S0 - Environment Setup & Frontend Connection (always)

**Objectives:**
- Create FastAPI skeleton with `/api/v1` structure and `/healthz` endpoint
- Set up MongoDB Atlas connection with Motor and Pydantic v2 models
- Implement health check with DB connectivity verification
- Enable CORS for frontend origin
- Initialize Git repository and GitHub setup
- Wire frontend to backend (replace dummy data with API calls)

**User Stories:**
- As a developer, I need a working FastAPI backend so the frontend can connect to real data
- As a user, I need the application to load without errors and show system health

**Tasks:**
- Set up Python 3.12 virtual environment
- Install FastAPI, Motor, Pydantic v2, and dependencies
- Create basic project structure with `/api/v1` routing
- Implement `/healthz` endpoint with MongoDB ping
- Configure CORS middleware for frontend URL
- Set up environment variables and configuration
- Initialize Git repository with `.gitignore`
- Create GitHub repository and set `main` as default branch
- Update frontend API base URL configuration
- Replace dummy data calls with real API endpoints

**Definition of Done:**
- Backend runs locally on port 8000
- `/healthz` endpoint responds with JSON status and DB connectivity
- Frontend successfully connects to backend
- CORS allows frontend requests
- Repository exists on GitHub with initial commit

**Manual Test Checklist (Frontend):**
- Set `MONGODB_URI` environment variable
- Start backend server (`uvicorn main:app --reload`)
- Open frontend application
- Verify health check endpoint returns success
- Check browser Network tab shows successful API calls
- Confirm no CORS errors in console

**User Test Prompt:**
"Start the backend server, open the frontend application, and verify the health status indicator shows green/connected. Check that the application loads without errors and the browser console shows successful API connections."

**Post-sprint:**
- Commit all setup code and configuration
- Push to GitHub `main` branch
- Verify CI/CD pipeline (if applicable)

### S1 - Basic Auth (signup, login, logout)

**Objectives:**
- Implement user registration and authentication system
- Create JWT-based session management
- Protect workspace routes with authentication middleware
- Enable user profile management

**User Stories:**
- As a new user, I need to create an account so I can save my workspaces
- As a returning user, I need to log in to access my saved work
- As a user, I need secure session management so my data stays private

**Endpoints:**
- `POST /api/v1/auth/signup` - User registration with email/password
- `POST /api/v1/auth/login` - Authentication returning JWT token
- `POST /api/v1/auth/logout` - Token invalidation
- `GET /api/v1/auth/me` - Current user profile

**Tasks:**
- Create User model with Pydantic v2 and MongoDB schema
- Implement password hashing with Argon2
- Set up JWT token generation and validation
- Create authentication middleware for protected routes
- Build signup/login/logout endpoints
- Add user profile endpoint
- Implement token refresh mechanism
- Add authentication state to frontend

**Definition of Done:**
- Users can register new accounts via frontend
- Login returns valid JWT token
- Protected routes require authentication
- Logout invalidates tokens
- User session persists across browser refresh

**Manual Test Checklist (Frontend):**
- Navigate to signup page and create new account
- Log in with created credentials
- Access a protected workspace page
- Log out and verify redirect to login
- Attempt to access protected page while logged out
- Log back in and verify session restoration

**User Test Prompt:**
"Create a new account using the signup form, log in with your credentials, navigate to the main workspace, log out, try to access the workspace (should be blocked), then log back in and verify you can access your workspace again."

**Post-sprint:**
- Commit authentication system
- Push to `main` branch
- Update API documentation

### S2 - Workspace Management

**Objectives:**
- Implement workspace CRUD operations
- Enable workspace title editing and persistence
- Add workspace settings and configuration
- Support multiple workspaces per user

**User Stories:**
- As a user, I need to create and manage multiple strategic workspaces
- As a user, I need to customize workspace titles and settings
- As a user, I need my workspace state to persist between sessions

**Endpoints:**
- `GET /api/v1/workspaces` - List user workspaces
- `POST /api/v1/workspaces` - Create new workspace
- `GET /api/v1/workspaces/{workspace_id}` - Get workspace details
- `PUT /api/v1/workspaces/{workspace_id}` - Update workspace
- `DELETE /api/v1/workspaces/{workspace_id}` - Delete workspace

**Tasks:**
- Create Workspace model with MongoDB schema
- Implement workspace CRUD endpoints
- Add workspace ownership and access control
- Build workspace settings management
- Implement canvas transform state persistence
- Add workspace selection to frontend
- Create workspace creation/editing UI integration

**Definition of Done:**
- Users can create multiple workspaces
- Workspace titles are editable and persist
- Canvas position and zoom state saves automatically
- Workspace settings (model selection) persist
- Users can switch between workspaces

**Manual Test Checklist (Frontend):**
- Create a new workspace with custom title
- Edit workspace title and verify it saves
- Pan and zoom the canvas, refresh page, verify position persists
- Change model selection, verify it saves
- Create second workspace and switch between them
- Delete a workspace and verify it's removed

**User Test Prompt:**
"Create a new workspace called 'Test Strategy', edit the title to 'My Strategy Plan', move around the canvas and zoom in/out, refresh the browser, and verify your canvas position and title are preserved. Then create a second workspace and switch between them."

**Post-sprint:**
- Commit workspace management features
- Push to `main` branch

### S3 - Node & Edge System

**Objectives:**
- Implement full node CRUD operations with real-time updates
- Support all node types (human, AI, decision, risk, dependency)
- Enable edge/connection management with relationship types
- Add drag-and-drop positioning with persistence

**User Stories:**
- As a strategist, I need to create and organize strategic nodes on the map
- As a user, I need to connect nodes with different relationship types
- As a user, I need my node positions and connections to save automatically

**Endpoints:**
- `GET /api/v1/workspaces/{workspace_id}/nodes` - Get all nodes
- `POST /api/v1/workspaces/{workspace_id}/nodes` - Create node
- `PUT /api/v1/workspaces/{workspace_id}/nodes/{node_id}` - Update node
- `DELETE /api/v1/workspaces/{workspace_id}/nodes/{node_id}` - Delete node
- `GET /api/v1/workspaces/{workspace_id}/edges` - Get all edges
- `POST /api/v1/workspaces/{workspace_id}/edges` - Create edge
- `DELETE /api/v1/workspaces/{workspace_id}/edges/{edge_id}` - Delete edge

**Tasks:**
- Create Node and Edge models with MongoDB schemas
- Implement node CRUD endpoints with validation
- Add edge management with relationship type support
- Build position tracking and auto-save functionality
- Implement node type-specific styling and behavior
- Add connection creation and deletion logic
- Integrate with frontend drag-and-drop system

**Definition of Done:**
- Users can create nodes of all types via double-click or toolbar
- Nodes can be dragged and positions save automatically
- Node editing dialog works with real data
- Connections can be created between nodes
- Different connection types display correctly
- Node and edge deletion works properly

**Manual Test Checklist (Frontend):**
- Double-click canvas to create a new node
- Edit node title and description, verify saves
- Drag node to new position, refresh page, verify position persists
- Create multiple nodes of different types
- Use connection mode to link nodes with different relationship types
- Delete nodes and verify connections are removed
- Test undo/redo functionality

**User Test Prompt:**
"Create several strategic nodes by double-clicking the canvas, edit their titles and descriptions, drag them to different positions, connect them with various relationship types using connection mode, delete a node and verify its connections disappear, then use undo to restore it."

**Post-sprint:**
- Commit node and edge system
- Push to `main` branch

### S4 - AI Agent System

**Objectives:**
- Implement multi-agent AI system with 9 specialized agents
- Enable agent activation/deactivation per workspace
- Add context-aware AI responses based on workspace state
- Support custom agent creation

**User Stories:**
- As a strategist, I need AI agents to provide specialized analysis of my strategic map
- As a user, I need to activate relevant agents for my specific strategic challenge
- As a power user, I need to create custom agents for specialized domains

**Endpoints:**
- `GET /api/v1/agents` - List available agents
- `POST /api/v1/workspaces/{workspace_id}/agents/{agent_id}/activate` - Activate agent
- `DELETE /api/v1/workspaces/{workspace_id}/agents/{agent_id}/activate` - Deactivate agent
- `POST /api/v1/agents/custom` - Create custom agent

**Tasks:**
- Create Agent model and seed database with 9 default agents
- Implement agent activation/deactivation per workspace
- Build context preparation system for AI responses
- Integrate with LLM APIs (OpenAI/Anthropic/Google)
- Add agent-specific response generation logic
- Implement custom agent creation and management
- Build agent details modal and configuration UI

**Definition of Done:**
- All 9 agents display in left sidebar with correct information
- Agent activation toggles work and persist
- Activated agents provide contextual responses in chat
- Agent details modal shows full descriptions
- Custom agent creation works with user-defined parameters
- AI responses reflect agent personalities and expertise

**Manual Test Checklist (Frontend):**
- View agent list in left sidebar
- Activate/deactivate different agents and verify state persists
- Click agent info button to view detailed descriptions
- Send chat messages and verify activated agents respond appropriately
- Create a custom agent with specific expertise
- Test agent responses reflect their specialized knowledge

**User Test Prompt:**
"Activate the Strategist Agent and Risk & Compliance Agent, send a message about market entry strategy, verify you get responses from both agents with different perspectives, then create a custom 'Financial Analysis Agent' and test its responses."

**Post-sprint:**
- Commit AI agent system
- Push to `main` branch

### S5 - Chat & Real-time Communication

**Objectives:**
- Implement real-time chat system with AI agent responses
- Enable message-to-node conversion functionality
- Add chat history persistence and loading
- Support typing indicators and message status

**User Stories:**
- As a user, I need to have strategic conversations with AI agents
- As a strategist, I need to convert valuable insights from chat into map nodes
- As a collaborator, I need to see chat history and message status

**Endpoints:**
- `GET /api/v1/workspaces/{workspace_id}/messages` - Get chat history
- `POST /api/v1/workspaces/{workspace_id}/messages` - Send message, get AI response
- `POST /api/v1/workspaces/{workspace_id}/messages/{message_id}/add-to-map` - Convert to node

**Tasks:**
- Create Message model with MongoDB schema
- Implement chat message CRUD operations
- Build AI response generation with context awareness
- Add message-to-node conversion with smart positioning
- Implement chat history loading and pagination
- Add real-time message delivery (WebSocket or polling)
- Build typing indicators and message status tracking

**Definition of Done:**
- Users can send messages and receive AI responses
- Chat history loads and persists between sessions
- Message-to-node conversion creates properly positioned nodes
- AI responses are contextually relevant to workspace content
- Chat interface shows message timestamps and authors
- "Add to Map" functionality works with duplicate prevention

**Manual Test Checklist (Frontend):**
- Send several chat messages and verify AI responses
- Convert AI response to map node using "Add to Map" button
- Verify converted message shows "Added to Map" status
- Refresh page and verify chat history loads
- Test message-to-node conversion creates properly positioned nodes
- Clear chat and verify messages are removed

**User Test Prompt:**
"Start a conversation about strategic planning, send several messages to activated AI agents, convert one of the AI responses to a map node using the 'Add to Map' button, refresh the page to verify chat history persists, and confirm the converted node appears on your map."

**Post-sprint:**
- Commit chat and messaging system
- Push to `main` branch

### S6 - Document Generation & Export

**Objectives:**
- Implement AI-powered brief generation from map data
- Enable document editing and real-time updates
- Add export functionality (PDF, JSON, sharing)
- Support document templates and formatting

**User Stories:**
- As an executive, I need AI to synthesize my strategic map into a coherent brief
- As a user, I need to edit and refine the generated document
- As a stakeholder, I need to export and share strategic documents

**Endpoints:**
- `POST /api/v1/workspaces/{workspace_id}/generate-brief` - Generate brief from map
- `GET /api/v1/workspaces/{workspace_id}/export` - Export workspace data
- `PUT /api/v1/workspaces/{workspace_id}/brief` - Update brief content

**Tasks:**
- Build map-to-brief synthesis using AI
- Create document generation templates
- Implement brief content editing and persistence
- Add export functionality (JSON, PDF generation)
- Build sharing and collaboration features
- Implement document version tracking
- Add brief regeneration with updated map data

**Definition of Done:**
- "Generate Brief" creates coherent document from map nodes
- Brief content is editable with real-time saving
- Export functionality works for multiple formats
- Document reflects current map state and relationships
- Brief regeneration incorporates new map changes
- Sharing functionality provides accessible links

**Manual Test Checklist (Frontend):**
- Create a strategic map with multiple connected nodes
- Switch to Brief view and generate document
- Edit brief content and verify changes save
- Export brief in different formats
- Add new nodes to map and regenerate brief
- Test sharing functionality and access controls

**User Test Prompt:**
"Create a comprehensive strategic map with at least 5 connected nodes representing different strategic options, switch to the Last-Mile Brief view, generate a brief document, edit some sections of the generated content, export the brief as PDF, then add a new node to your map and regenerate the brief to see updated content."

**Post-sprint:**
- Commit document generation system
- Push to `main` branch
- Prepare for production deployment

## Implementation Notes

**Development Approach:**
- Start each sprint with API endpoint implementation
- Follow with database model creation and validation
- Integrate with frontend components incrementally
- Test thoroughly via UI before moving to next sprint

**Key Technical Decisions:**
- Use FastAPI's automatic OpenAPI documentation
- Implement async/await throughout for performance
- Use Pydantic v2 for request/response validation
- Store workspace state as embedded documents for performance
- Implement soft deletes for audit trail

**Performance Considerations:**
- Index MongoDB collections on workspace_id and user_id
- Use connection pooling for database operations
- Implement caching for agent configurations
- Optimize AI API calls with request batching

**Security Measures:**
- Hash passwords with Argon2
- Validate JWT tokens on all protected routes
- Sanitize user input to prevent injection attacks
- Implement rate limiting on AI API endpoints
- Use HTTPS in production environment