# Backend Development Plan: Agentic Boardroom

## 1) Executive Summary
This document outlines the development plan for the backend of the "Agentic Boardroom" application. The backend will be a FastAPI application using MongoDB Atlas for data storage. It will provide a robust API to support the features observed in the frontend, including user authentication, workspace management, a dynamic exploration map with nodes and edges, and real-time interaction with AI agents.

The plan honors the specified constraints: FastAPI (Python 3.12, async), MongoDB Atlas with Motor and Pydantic v2, no Docker, and a `main`-only Git workflow. The development is broken down into a dynamic number of sprints, starting with environment setup and progressively adding features like authentication, workspace management, and core map functionalities.

## 2) In-scope & Success Criteria
- **In-scope:**
  - User authentication (signup, login, logout, session management).
  - Full CRUD operations for workspaces.
  - Full CRUD operations for nodes and edges within a workspace.
  - API endpoints to manage and interact with AI agents.
  - Real-time chat functionality for "Sparring Sessions".
  - A mechanism to convert chat messages into map nodes.
- **Success criteria:**
  - All frontend features are fully supported by the backend API.
  - Each sprint's deliverables pass the manual tests conducted through the frontend.
  - The final application provides a seamless and responsive user experience.
  - Code is successfully pushed to the `main` branch on GitHub after each sprint.

## 3) API Design
- **Conventions:**
  - Base path: `/api/v1`
  - Authentication: JWT-based, with tokens sent in the `Authorization` header.
  - Error model: `{ "detail": "Error message" }`

- **Endpoints:**

  - **Auth**
    - `POST /api/v1/auth/signup`: Register a new user.
    - `POST /api/v1/auth/login`: Authenticate a user and return a JWT.
    - `POST /api/v1/auth/logout`: Invalidate the user's session (server-side logic TBD, could be a simple client-side token deletion).
    - `GET /api/v1/auth/me`: Get the currently authenticated user's details.

  - **Workspaces**
    - `GET /api/v1/workspaces`: Get a list of workspaces for the current user.
    - `POST /api/v1/workspaces`: Create a new workspace.
    - `GET /api/v1/workspaces/{workspace_id}`: Get a single workspace.
    - `PUT /api/v1/workspaces/{workspace_id}`: Update a workspace.
    - `DELETE /api/v1/workspaces/{workspace_id}`: Delete a workspace.

  - **Nodes**
    - `GET /api/v1/workspaces/{workspace_id}/nodes`: Get all nodes for a workspace.
    - `POST /api/v1/workspaces/{workspace_id}/nodes`: Create a new node.
    - `PUT /api/v1/workspaces/{workspace_id}/nodes/{node_id}`: Update a node.
    - `DELETE /api/v1/workspaces/{workspace_id}/nodes/{node_id}`: Delete a node.

  - **Edges**
    - `GET /api/v1/workspaces/{workspace_id}/edges`: Get all edges for a workspace.
    - `POST /api/v1/workspaces/{workspace_id}/edges`: Create a new edge.
    - `DELETE /api/v1/workspaces/{workspace_id}/edges/{edge_id}`: Delete an edge.

  - **Agents**
    - `GET /api/v1/agents`: Get a list of all available agents.
    - `POST /api/v1/workspaces/{workspace_id}/agents/{agent_id}/activate`: Activate an agent for a workspace.
    - `DELETE /api/v1/workspaces/{workspace_id}/agents/{agent_id}/activate`: Deactivate an agent.

  - **Messages**
    - `GET /api/v1/workspaces/{workspace_id}/messages`: Get all messages for a workspace.
    - `POST /api/v1/workspaces/{workspace_id}/messages`: Send a message and get an AI response.
    - `POST /api/v1/workspaces/{workspace_id}/messages/{message_id}/add-to-map`: Convert a message to a node.

## 4) Data Model (MongoDB Atlas)
- **Collections:**

  - **users**
    - `_id`: ObjectId (auto-generated)
    - `email`: String (required, unique)
    - `name`: String (required)
    - `hashed_password`: String (required)
    - `created_at`: DateTime (auto-generated)
    - `last_login`: DateTime
    - `is_active`: Boolean (default: true)
    - *Example:*
      ```json
      {
        "_id": "ObjectId('60c72b2f9b1d8b001f8e4c6a')",
        "email": "test@example.com",
        "name": "Test User",
        "hashed_password": "...",
        "created_at": "2025-09-18T12:00:00Z",
        "last_login": "2025-09-18T12:00:00Z",
        "is_active": true
      }
      ```

  - **workspaces**
    - `_id`: ObjectId (auto-generated)
    - `title`: String (required)
    - `owner_id`: ObjectId (references `users`)
    - `created_at`: DateTime (auto-generated)
    - `updated_at`: DateTime (auto-generated)
    - `settings`: Object
    - `transform`: Object (`x`, `y`, `scale`)
    - *Example:*
      ```json
      {
        "_id": "ObjectId('60c72b2f9b1d8b001f8e4c6b')",
        "title": "Q4 Strategy",
        "owner_id": "ObjectId('60c72b2f9b1d8b001f8e4c6a')",
        "created_at": "2025-09-18T12:00:00Z",
        "updated_at": "2025-09-18T12:00:00Z",
        "settings": {},
        "transform": { "x": 0, "y": 0, "scale": 1 }
      }
      ```

  - **nodes**
    - `_id`: ObjectId (auto-generated)
    - `workspace_id`: ObjectId (references `workspaces`)
    - `title`: String (required)
    - `description`: String
    - `type`: String (e.g., 'human', 'ai', 'risk')
    - `x`: Number (required)
    - `y`: Number (required)
    - `source_agent`: String
    - `created_at`: DateTime (auto-generated)
    - `updated_at`: DateTime (auto-generated)
    - *Example:*
      ```json
      {
        "_id": "ObjectId('60c72b2f9b1d8b001f8e4c6c')",
        "workspace_id": "ObjectId('60c72b2f9b1d8b001f8e4c6b')",
        "title": "Core Challenge",
        "description": "Define the main problem.",
        "type": "human",
        "x": 100,
        "y": 150,
        "created_at": "2025-09-18T12:00:00Z",
        "updated_at": "2025-09-18T12:00:00Z"
      }
      ```

  - **edges**
    - `_id`: ObjectId (auto-generated)
    - `workspace_id`: ObjectId (references `workspaces`)
    - `from_node_id`: ObjectId (references `nodes`)
    - `to_node_id`: ObjectId (references `nodes`)
    - `type`: String (e.g., 'support', 'contradiction')
    - `description`: String
    - `created_at`: DateTime (auto-generated)
    - *Example:*
      ```json
      {
        "_id": "ObjectId('60c72b2f9b1d8b001f8e4c6d')",
        "workspace_id": "ObjectId('60c72b2f9b1d8b001f8e4c6b')",
        "from_node_id": "ObjectId('60c72b2f9b1d8b001f8e4c6c')",
        "to_node_id": "ObjectId('60c72b2f9b1d8b001f8e4c6e')",
        "type": "support",
        "description": "Node A supports Node B",
        "created_at": "2025-09-18T12:00:00Z"
      }
      ```

  - **messages**
    - `_id`: ObjectId (auto-generated)
    - `workspace_id`: ObjectId (references `workspaces`)
    - `author`: String (e.g., 'You', 'Strategist Agent')
    - `type`: String ('human' or 'ai')
    - `content`: String (required)
    - `created_at`: DateTime (auto-generated)
    - `added_to_map`: Boolean (default: false)
    - *Example:*
      ```json
      {
        "_id": "ObjectId('60c72b2f9b1d8b001f8e4c6f')",
        "workspace_id": "ObjectId('60c72b2f9b1d8b001f8e4c6b')",
        "author": "You",
        "type": "human",
        "content": "What is the marketing strategy?",
        "created_at": "2025-09-18T12:00:00Z",
        "added_to_map": false
      }
      ```

## 5) Frontend Audit & Feature Map
- **`Auth.tsx`**:
  - **Purpose**: User signup and login.
  - **Backend Capability**: `POST /auth/signup`, `POST /auth/login`.
- **`Dashboard.tsx`**:
  - **Purpose**: Display, create, and delete workspaces.
  - **Backend Capability**: `GET /workspaces`, `POST /workspaces`, `DELETE /workspaces/{id}`.
- **`ExplorationMap.tsx`**:
  - **Purpose**: The main canvas for strategic mapping.
  - **Backend Capability**:
    - `GET /workspaces/{id}/nodes`, `POST /workspaces/{id}/nodes`, `PUT /workspaces/{id}/nodes/{node_id}`, `DELETE /workspaces/{id}/nodes/{node_id}`.
    - `GET /workspaces/{id}/edges`, `POST /workspaces/{id}/edges`, `DELETE /workspaces/{id}/edges/{edge_id}`.
    - `GET /agents`, `POST /workspaces/{id}/agents/{agent_id}/activate`, `DELETE /workspaces/{id}/agents/{agent_id}/activate`.
- **`SparringSession.tsx`**:
  - **Purpose**: Chat interface for interacting with AI agents.
  - **Backend Capability**:
    - `GET /workspaces/{id}/messages`, `POST /workspaces/{id}/messages`.
    - `POST /workspaces/{id}/messages/{message_id}/add-to-map`.

## 6) Configuration & ENV Vars
- `APP_ENV`: `development`
- `PORT`: `8000`
- `MONGODB_URI`: (User provided)
- `JWT_SECRET`: (Auto-generated secret key)
- `JWT_EXPIRES_IN`: `3600` (1 hour)
- `CORS_ORIGINS`: `http://localhost:5137`

## 7) Testing Strategy (Manual via Frontend)
- **Policy**: All backend features will be tested manually through the frontend UI.
- **Process**: After each sprint, the developer will run through the "Manual Test Checklist" to ensure all new and existing features work as expected.
- **User Test Prompt**: A concise prompt will be provided for the user to perform their own validation.

## 8) Dynamic Sprint Plan & Backlog

### S0 - Environment Setup & Frontend Connection
- **Objectives**:
  - Create a basic FastAPI application skeleton.
  - Implement a `/healthz` endpoint that checks database connectivity.
  - Set up CORS to allow requests from the frontend.
  - Initialize a Git repository and push to GitHub.
- **Tasks**:
  - `pip install fastapi uvicorn motor pydantic python-jose passlib`.
  - Create `main.py` with a basic FastAPI app.
  - Implement the `/api/v1/healthz` endpoint.
  - Configure CORS middleware.
  - Create `.gitignore`.
  - `git init`, `git add .`, `git commit -m "Initial commit"`.
- **Definition of Done**:
  - The backend server runs locally.
  - The `/healthz` endpoint returns a successful response including DB status.
  - The frontend can successfully make requests to the backend.
- **Manual Test Checklist (Frontend)**:
  - Start the backend server.
  - Open the frontend application in the browser.
  - Verify that there are no CORS errors in the browser console.
  - Use browser dev tools to manually send a request to `/healthz` and verify the response.
- **User Test Prompt**:
  - "Please run the backend and frontend, and confirm that the application loads without any CORS errors in the console."
- **Post-sprint**:
  - Commit changes and push to `main`.

### S1 - Basic Auth (signup, login, logout)
- **Objectives**:
  - Implement user registration and login functionality.
  - Secure endpoints using JWT authentication.
- **Endpoints**:
  - `POST /api/v1/auth/signup`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
- **Tasks**:
  - Create the `users` collection and Pydantic model.
  - Implement password hashing using `passlib`.
  - Create utility functions for creating and verifying JWTs.
  - Implement the auth endpoints.
  - Create a dependency to protect routes.
- **Definition of Done**:
  - Users can create an account and log in through the frontend.
  - The `/dashboard` route is protected and only accessible to logged-in users.
- **Manual Test Checklist (Frontend)**:
  - Navigate to the `/auth` page.
  - Create a new user account.
  - Log out.
  - Log in with the new account.
  - Verify that you are redirected to the dashboard.
  - Try to access the dashboard when logged out and verify you are redirected to the login page.
- **User Test Prompt**:
  - "Please test the signup and login functionality. Ensure you can create an account, log out, and log back in."
- **Post-sprint**:
  - Commit changes and push to `main`.

### S2 - Workspace Management
- **Objectives**:
  - Implement full CRUD functionality for workspaces.
- **Endpoints**:
  - `GET /api/v1/workspaces`
  - `POST /api/v1/workspaces`
  - `DELETE /api/v1/workspaces/{workspace_id}`
- **Tasks**:
  - Create the `workspaces` collection and Pydantic model.
  - Implement the workspace endpoints, ensuring they are protected and scoped to the current user.
- **Definition of Done**:
  - Logged-in users can create, view, and delete workspaces from the dashboard.
- **Manual Test Checklist (Frontend)**:
  - Log in to the application.
  - On the dashboard, create a new workspace.
  - Verify the new workspace appears in the list.
  - Delete the workspace and verify it is removed.
- **User Test Prompt**:
  - "Please log in and test the workspace management on the dashboard. You should be able to create and delete workspaces."
- **Post-sprint**:
  - Commit changes and push to `main`.

### S3 - Exploration Map (Nodes & Edges)
- **Objectives**:
  - Implement CRUD functionality for nodes and edges.
- **Endpoints**:
  - `GET /api/v1/workspaces/{workspace_id}/nodes`
  - `POST /api/v1/workspaces/{workspace_id}/nodes`
  - `PUT /api/v1/workspaces/{workspace_id}/nodes/{node_id}`
  - `DELETE /api/v1/workspaces/{workspace_id}/nodes/{node_id}`
  - `GET /api/v1/workspaces/{workspace_id}/edges`
  - `POST /api/v1/workspaces/{workspace_id}/edges`
  - `DELETE /api/v1/workspaces/{workspace_id}/edges/{edge_id}`
- **Tasks**:
  - Create the `nodes` and `edges` collections and Pydantic models.
  - Implement the endpoints, ensuring they are scoped to the specified workspace.
- **Definition of Done**:
  - Users can create, move, edit, and delete nodes on the exploration map.
  - Users can create and delete edges between nodes.
- **Manual Test Checklist (Frontend)**:
  - Open a workspace.
  - Double-click on the canvas to create a node.
  - Drag the node to a new position.
  - Double-click the node to edit its title and description.
  - Create a second node.
  - Use the "Connect Nodes" feature to create an edge between them.
  - Delete the edge and then delete both nodes.
- **User Test Prompt**:
  - "Please open a workspace and test the node and edge functionality. You should be able to create, edit, move, connect, and delete nodes and edges."
- **Post-sprint**:
  - Commit changes and push to `main`.

### S4 - Agent & Chat Integration
- **Objectives**:
  - Implement the chat functionality and agent interaction.
- **Endpoints**:
  - `GET /api/v1/agents`
  - `GET /api/v1/workspaces/{workspace_id}/messages`
  - `POST /api/v1/workspaces/{workspace_id}/messages`
  - `POST /api/v1/workspaces/{workspace_id}/messages/{message_id}/add-to-map`
- **Tasks**:
  - Create the `messages` collection and Pydantic model.
  - Implement a basic agent manager to list available agents.
  - Implement the `sendMessage` endpoint. This will be a placeholder for now, returning a canned response.
  - Implement the `addMessageToMap` endpoint.
- **Definition of Done**:
  - Users can send messages in the chat and receive a response.
  - Users can add a message from the chat to the map as a new node.
- **Manual Test Checklist (Frontend)**:
  - Open a workspace.
  - Type a message in the chat and send it.
  - Verify that a response from the "Strategist Agent" appears.
  - Click the "Add to Map" button on the agent's response.
  - Verify that a new node appears on the map with the content of the message.
- **User Test Prompt**:
  - "Please test the chat functionality. Send a message and then use the 'Add to Map' feature to create a node from the response."
- **Post-sprint**:
  - Commit changes and push to `main`.