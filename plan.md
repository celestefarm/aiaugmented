# Plan to Integrate the Strategist AI Agent into the Frontend

## 1. Update the AgentChatContext

- **File:** `frontend/src/contexts/AgentChatContext.tsx`
- **Action:**
    - Remove the mock data for agents and messages.
    - Implement API calls to fetch real agents and messages from the backend.
    - Update the `sendMessage` function to call the new `/api/v1/agents/interact` endpoint.

## 2. Create a new SparringSession component

- **File:** `frontend/src/components/SparringSession.tsx`
- **Action:**
    - Create a new component to handle the chat interface in the right sidebar.
    - This component will be responsible for displaying messages, handling user input, and calling the `sendMessage` function from the `AgentChatContext`.

## 3. Integrate the SparringSession component

- **File:** `frontend/src/components/ExplorationMap.tsx`
- **Action:**
    - Remove the existing chat interface from the right sidebar.
    - Add the new `SparringSession` component to the right sidebar.

## 4. Update the API client

- **File:** `frontend/src/lib/api.ts`
- **Action:**
    - Add a new function to call the `/api/v1/agents/interact` endpoint.