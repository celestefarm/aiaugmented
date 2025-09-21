# Project Blueprint: ArtisanHub

## Phase 1: High-Level Architectural Decisions

### 1.1. Architecture Pattern Selection

**Decision:** Modular Monolith

**Rationale:** For a solo developer, a modular monolith offers the best balance of development speed and operational simplicity. This approach allows for a clean separation of concerns and logical code organization without the overhead of managing a distributed system.

### 1.2. Technology Stack Selection

**Frontend Framework & UI:**

*   **Framework:** Next.js
*   **Version:** ~15.5
*   **Rationale:** Next.js provides a powerful and flexible framework for building modern React applications. Its features like server-side rendering, static site generation, and a rich ecosystem make it an excellent choice for this project. The App Router will be used for its improved data fetching and layout capabilities.

*   **UI Components:** shadcn/ui
*   **Version:** ~3.3.1
*   **Rationale:** shadcn/ui offers a set of accessible and unstyled components that can be easily customized. This approach avoids being locked into a specific design system and allows for rapid UI development that aligns perfectly with the project's visual identity.

**Backend Runtime & Framework:**

*   **Runtime:** Python
*   **Version:** ~3.13.3
*   **Rationale:** Python's readability, extensive libraries, and strong community support make it a solid foundation for the backend.

*   **Framework:** FastAPI
*   **Version:** ~0.116.2
*   **Rationale:** FastAPI is a high-performance web framework for Python that is easy to learn and use. Its automatic interactive documentation and Pydantic-based data validation will significantly speed up development.

**Primary Database:**

*   **Database:** MongoDB Atlas (Free Tier)
*   **Rationale:** A NoSQL document database like MongoDB provides the flexibility needed for agile development where data models can evolve. It maps naturally to Python and JavaScript objects, simplifying data access. The free tier of MongoDB Atlas is sufficient for development and early-stage production.

### 1.3. Core Infrastructure & Services (Local Development Focus)

*   **Local Development:** The project will be run using simple command-line instructions (`npm run dev` for frontend, `uvicorn main:app --reload` for backend). No containerization is needed.
*   **File Storage:** A local file system storage will be used for file uploads. A designated, git-ignored directory (`./uploads`) will be created at the root of the backend project.
*   **Authentication:** A library-based approach with JWTs (JSON Web Tokens) will be used for securing APIs.
*   **External Services:** None identified in the PRD.

### 1.4. Integration and API Strategy

*   **API Style:** REST. All APIs will be versioned from the start (e.g., `/api/v1/...`).
*   **Standard Formats:** A standard JSON structure for success and error responses will be defined.

## Phase 2: Detailed Module Architecture

### 2.1. Module Identification

*   **Domain Modules:**
    *   `UserModule`: Manages user authentication, profiles, and settings.
    *   `PainPointModule`: Manages the creation, display, and interaction with the pain point section.
*   **Infrastructure Modules:**
    *   `DataAccessModule`: Handles all interactions with the MongoDB database.
*   **Shared Module:**
    *   Contains shared UI components, utilities, and types.

### 2.2. Module Responsibilities and Contracts

**UserModule:**

*   **Responsibilities:** User registration, login, password hashing, JWT generation and validation, user profile management.
*   **Interface Contract:** Exposes API endpoints for `/api/v1/auth/register`, `/api/v1/auth/login`, and `/api/v1/users/me`.

**PainPointModule:**

*   **Responsibilities:** Manages the content and interactions of the pain point section on the landing page.
*   **Interface Contract:** Exposes API endpoints for retrieving pain point data.

**DataAccessModule:**

*   **Responsibilities:** Provides a clean and consistent API for accessing the database.
*   **Interface Contract:** Exposes functions for creating, reading, updating, and deleting documents in the database.

### 2.3. Key Module Design

*   **Folder Structure:**
    *   `backend/`
        *   `main.py`
        *   `requirements.txt`
        *   `routers/`
            *   `auth.py`
            *   `users.py`
            *   `pain_points.py`
        *   `models/`
            *   `user.py`
            *   `pain_point.py`
        *   `utils/`
            *   `auth.py`
            *   `database.py`
    *   `frontend/`
        *   `src/`
            *   `app/`
                *   `page.tsx`
                *   `login/page.tsx`
                *   `register/page.tsx`
                *   `profile/page.tsx`
            *   `components/`
                *   `PainPointSection.tsx`
                *   `LoginForm.tsx`
                *   `RegisterForm.tsx`
            *   `lib/`
                *   `api.ts`
*   **Key Patterns:** Repository Pattern for data access.

## Phase 3: Tactical Sprint-by-Sprint Plan

### Sprint S0: Project Foundation & Setup

*   **Sprint ID & Name:** S0: Project Foundation & Setup
*   **Project Context:** This project is to build a web application called 'ArtisanHub', a platform where artists can create portfolios, showcase their work, and connect with potential buyers.
*   **Goal:** To establish a fully configured, runnable project skeleton on the local machine, with all necessary credentials and basic styling configured, enabling rapid feature development in subsequent sprints.
*   **Tasks:**
    1.  **Developer Onboarding & Repository Setup:**
        *   Ask the developer for the URL of their new, empty GitHub repository for this project.
    2.  **Collect Secrets & Configuration:**
        *   Ask the user to provide the connection string for their MongoDB Atlas free-tier cluster.
        *   Ask the user for the primary and secondary color hex codes for the UI theme.
    3.  **Project Scaffolding:**
        *   Create a monorepo structure with `frontend` and `backend` directories.
        *   Initialize a Git repository.
        *   Create a comprehensive `.gitignore` file at the root.
    4.  **Backend Setup (Python/FastAPI):**
        *   Set up a Python virtual environment inside the `backend` directory.
        *   Install FastAPI, Uvicorn, Pydantic, python-dotenv, and other core dependencies.
        *   Create a basic file structure: `main.py`, `requirements.txt`.
        *   Create `backend/.env.example` and `backend/.env`. Populate `backend/.env` with the `DATABASE_URL`.
    5.  **Frontend Setup (Next.js & shadcn/ui):**
        *   Scaffold the frontend application using `create-next-app` in the `frontend` directory.
        *   Use the `npx shadcn@latest init` command to initialize shadcn/ui.
        *   Configure the `tailwind.config.js` file with the primary and secondary colors provided by the user.
        *   Create `frontend/.env.example` and `frontend/.env` for any client-side environment variables.
    6.  **Documentation:**
        *   Create a `README.md` file at the project root.
        *   Populate it with the project context, technology stack, and setup instructions.
    7.  **"Hello World" Verification:**
        *   Backend: Create a `/api/v1/health` endpoint that returns `{"status": "ok"}`.
        *   Frontend: Create a basic page that fetches data from the backend's `/api/v1/health` endpoint and displays the status.
    8.  **Final Commit:**
        *   Stage all the created files.
        *   Commit the initial project structure and push to the `main` branch on GitHub.

### Sprint S1: User Authentication & Profiles

*   **Sprint ID & Name:** S1: User Authentication & Profiles
*   **Project Context:** This sprint builds the foundational user authentication system.
*   **Previous Sprint's Accomplishments:** Sprint S0 established a local development environment.
*   **Goal:** To implement a complete, secure user registration and login system using JWTs.
*   **Tasks:**
    1.  **Database Model:**
        *   Define a Pydantic model for the `User` collection in the backend.
    2.  **Backend: Registration Logic:**
        *   Implement the `POST /api/v1/auth/register` endpoint.
    3.  **Backend: Login Logic:**
        *   Implement the `POST /api/v1/auth/login` endpoint.
    4.  **Backend: Protected Route:**
        *   Create a protected endpoint `GET /api/v1/users/me`.
    5.  **Frontend: UI Pages:**
        *   Build the UI for a login page and a register page.
        *   Build a placeholder profile page.
    6.  **Frontend: State & API Integration:**
        *   Set up global state management for the user session.
        *   Implement client-side forms for login and registration.
        *   Protect the profile page from unauthenticated access.
    7.  **Final Commit:**
        *   Commit all changes and push to the `main` branch.

### Sprint S2: Landing Page Pain Point Section

*   **Sprint ID & Name:** S2: Landing Page Pain Point Section
*   **Project Context:** This sprint focuses on implementing the pain point section of the landing page.
*   **Previous Sprint's Accomplishments:** Sprint S1 delivered a complete user authentication system.
*   **Goal:** To create a visually engaging and interactive "Pain Point" section on the landing page.
*   **Tasks:**
    1.  **Component Scaffolding:**
        *   Create a new React component `PainPointSection.tsx`.
    2.  **Static Content and Layout:**
        *   Implement the main heading and subheading.
        *   Create the three-column layout for the pain points.
        *   Populate the columns with static text and icons.
    3.  **Styling:**
        *   Apply Tailwind CSS classes to match the design specifications.
    4.  **Interactivity:**
        *   Implement the hover effect for the columns.
    5.  **Integration:**
        *   Add the `PainPointSection` component to the main landing page.
    6.  **Final Commit:**
        *   Commit all changes and push to the `main` branch.