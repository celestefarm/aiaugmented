# Strategic Co-Pilot Architecture Plan

## Current System Analysis

### Existing Architecture
- **Backend**: FastAPI with MongoDB, modular router structure
- **Frontend**: React with TypeScript, context-based state management
- **Current Agents**: 9 specialized agents including the Strategist Agent
- **Core Features**: Interactive map, agent chat, workspace management
- **Data Models**: User, Workspace, Node, Edge, Agent, Message

### Key Strengths to Build Upon
1. **Robust Agent System**: Well-structured agent framework with activation/deactivation
2. **Interactive Map**: Visual strategy mapping with nodes and connections
3. **Real-time Chat**: Agent interaction system with message persistence
4. **Workspace Management**: Multi-workspace support with settings
5. **Modular Architecture**: Clean separation of concerns

### Enhancement Opportunities
1. **Limited Cognitive Modeling**: No user thinking pattern analysis
2. **Basic Agent Interactions**: Simple Q&A without mentorship depth
3. **No Decision Testing**: Missing sandbox for strategy validation
4. **Static Communication**: No context-aware message adaptation
5. **Minimal Learning**: No longitudinal user development tracking

## Strategic Co-Pilot Enhancement Design

### 1. Cognitive Twin Foundation

#### Purpose
Model and analyze user thinking patterns to provide personalized strategic guidance.

#### Core Components

**A. User Cognitive Profile Model**
```python
class CognitiveProfile(BaseModel):
    user_id: PyObjectId
    thinking_patterns: Dict[str, float]  # e.g., {"analytical": 0.8, "creative": 0.6}
    decision_biases: List[str]  # e.g., ["anchoring", "confirmation_bias"]
    preferred_frameworks: List[str]  # e.g., ["SWOT", "Porter's Five Forces"]
    communication_style: str  # e.g., "data-driven", "narrative", "visual"
    expertise_areas: Dict[str, float]  # competency scores
    growth_areas: List[str]
    interaction_history: List[Dict]  # pattern analysis data
    last_updated: datetime
```

**B. Pattern Analysis Engine**
- **Message Analysis**: Extract thinking patterns from user messages
- **Decision Tracking**: Monitor decision-making approaches
- **Bias Detection**: Identify cognitive biases in reasoning
- **Style Recognition**: Understand communication preferences

**C. Personalization Engine**
- **Adaptive Responses**: Tailor agent responses to user's cognitive style
- **Challenge Calibration**: Adjust difficulty of strategic challenges
- **Framework Suggestions**: Recommend relevant strategic frameworks

#### Implementation Strategy
1. **Data Collection**: Analyze existing user interactions
2. **Pattern Recognition**: Use NLP to identify thinking patterns
3. **Profile Building**: Gradually build comprehensive cognitive profiles
4. **Adaptive Behavior**: Modify agent responses based on profiles

### 2. Decision Sandbox Environment

#### Purpose
Provide an interactive environment for testing and refining strategies before implementation.

#### Core Components

**A. Sandbox Session Model**
```python
class SandboxSession(BaseModel):
    id: PyObjectId
    user_id: PyObjectId
    workspace_id: PyObjectId
    title: str
    scenario_type: str  # "strategy_test", "role_play", "what_if"
    initial_context: Dict[str, Any]
    current_state: Dict[str, Any]
    simulation_history: List[Dict]
    outcomes: List[Dict]
    insights: List[str]
    created_at: datetime
    updated_at: datetime
```

**B. Scenario Engine**
- **Strategy Testing**: Simulate market responses to strategic decisions
- **Role-Playing**: Practice difficult conversations with AI personas
- **What-If Analysis**: Explore consequences of different choices
- **Competitive Simulation**: Model competitor reactions

**C. Outcome Modeling**
- **Probability Assessment**: Calculate likelihood of different outcomes
- **Risk Analysis**: Identify potential failure points
- **Success Metrics**: Define and track key performance indicators
- **Learning Extraction**: Capture insights from simulations

#### Key Features
1. **Interactive Scenarios**: Dynamic, branching decision trees
2. **AI Personas**: Realistic stakeholder simulations
3. **Outcome Visualization**: Clear presentation of results
4. **Learning Integration**: Connect insights to real strategies

### 3. Communication Amplifier

#### Purpose
Enhance agent communication with context-aware, audience-specific message adaptation.

#### Core Components

**A. Communication Context Model**
```python
class CommunicationContext(BaseModel):
    audience_type: str  # "executive", "technical", "creative"
    communication_goal: str  # "persuade", "inform", "collaborate"
    complexity_level: str  # "high", "medium", "low"
    preferred_style: str  # "data-driven", "story-based", "visual"
    time_constraint: str  # "urgent", "normal", "detailed"
    cultural_context: Optional[str]
```

**B. Message Adaptation Engine**
- **Audience Analysis**: Identify target audience characteristics
- **Style Transformation**: Adapt message style and tone
- **Complexity Adjustment**: Modify technical depth
- **Format Optimization**: Choose best presentation format

**C. Multi-Modal Output**
- **Executive Summary**: High-level strategic overview
- **Technical Deep-Dive**: Detailed implementation analysis
- **Visual Presentation**: Charts, diagrams, and infographics
- **Action-Oriented**: Clear next steps and recommendations

### 4. Enhanced Agent Interaction System

#### Purpose
Transform agents from simple responders to wise mentors with deep strategic insight.

#### Core Components

**A. Mentorship Framework**
```python
class MentorshipSession(BaseModel):
    agent_id: str
    user_id: PyObjectId
    session_type: str  # "socratic", "coaching", "advisory"
    learning_objectives: List[str]
    current_challenge: str
    guidance_history: List[Dict]
    progress_markers: List[Dict]
    next_steps: List[str]
```

**B. Socratic Dialogue Engine**
- **Question Generation**: Create thought-provoking questions
- **Assumption Challenge**: Identify and question underlying assumptions
- **Perspective Expansion**: Introduce alternative viewpoints
- **Insight Facilitation**: Guide users to their own discoveries

**C. Wisdom Integration**
- **Strategic Frameworks**: Deep knowledge of business strategy models
- **Historical Context**: Learn from past strategic successes/failures
- **Industry Insights**: Sector-specific strategic knowledge
- **Best Practices**: Proven strategic methodologies

## Database Schema Extensions

### New Collections

**1. cognitive_profiles**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  thinking_patterns: {
    analytical: 0.8,
    creative: 0.6,
    systematic: 0.9,
    intuitive: 0.4
  },
  decision_biases: ["anchoring", "confirmation_bias"],
  preferred_frameworks: ["SWOT", "Porter's Five Forces"],
  communication_style: "data-driven",
  expertise_areas: {
    "financial_analysis": 0.7,
    "market_research": 0.8,
    "risk_management": 0.6
  },
  growth_areas: ["creative_thinking", "stakeholder_management"],
  interaction_history: [...],
  created_at: ISODate,
  updated_at: ISODate
}
```

**2. sandbox_sessions**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  workspace_id: ObjectId,
  title: "Market Entry Strategy Test",
  scenario_type: "strategy_test",
  initial_context: {
    market: "European SaaS",
    budget: 500000,
    timeline: "6 months"
  },
  current_state: {...},
  simulation_history: [...],
  outcomes: [...],
  insights: [...],
  created_at: ISODate,
  updated_at: ISODate
}
```

**3. mentorship_sessions**
```javascript
{
  _id: ObjectId,
  agent_id: "strategist",
  user_id: ObjectId,
  workspace_id: ObjectId,
  session_type: "socratic",
  learning_objectives: ["improve strategic thinking"],
  current_challenge: "market positioning",
  guidance_history: [...],
  progress_markers: [...],
  created_at: ISODate,
  updated_at: ISODate
}
```

### Enhanced Existing Collections

**agents** (add mentorship capabilities)
```javascript
{
  // existing fields...
  mentorship_config: {
    socratic_enabled: true,
    coaching_style: "challenging",
    expertise_depth: "expert",
    personality_traits: ["wise", "patient", "insightful"]
  },
  cognitive_frameworks: ["systems_thinking", "design_thinking"],
  wisdom_base: {
    strategic_models: [...],
    case_studies: [...],
    best_practices: [...]
  }
}
```

**messages** (add cognitive analysis)
```javascript
{
  // existing fields...
  cognitive_analysis: {
    thinking_patterns: ["analytical", "systematic"],
    biases_detected: ["anchoring"],
    complexity_level: "high",
    emotional_tone: "confident"
  },
  mentorship_context: {
    guidance_type: "socratic_question",
    learning_objective: "challenge_assumptions",
    follow_up_needed: true
  }
}
```

## API Endpoints Design

### Cognitive Twin Endpoints

**GET /api/v1/users/{user_id}/cognitive-profile**
- Retrieve user's cognitive profile
- Response: CognitiveProfile model

**PUT /api/v1/users/{user_id}/cognitive-profile**
- Update cognitive profile
- Request: Partial cognitive profile updates

**POST /api/v1/cognitive/analyze-interaction**
- Analyze user interaction for patterns
- Request: Message content and context
- Response: Cognitive insights

### Decision Sandbox Endpoints

**POST /api/v1/workspaces/{workspace_id}/sandbox/sessions**
- Create new sandbox session
- Request: Scenario type and initial context
- Response: SandboxSession model

**GET /api/v1/workspaces/{workspace_id}/sandbox/sessions**
- List user's sandbox sessions
- Response: List of SandboxSession models

**POST /api/v1/sandbox/sessions/{session_id}/simulate**
- Run simulation step
- Request: Decision/action to simulate
- Response: Simulation results and outcomes

**GET /api/v1/sandbox/sessions/{session_id}/insights**
- Extract insights from session
- Response: Strategic insights and recommendations

### Enhanced Agent Interaction Endpoints

**POST /api/v1/agents/{agent_id}/mentor**
- Start mentorship session
- Request: Learning objectives and current challenge
- Response: MentorshipSession model

**POST /api/v1/mentorship/{session_id}/interact**
- Continue mentorship dialogue
- Request: User response/question
- Response: Mentorship guidance (questions, insights, challenges)

**GET /api/v1/agents/{agent_id}/wisdom-base**
- Access agent's strategic knowledge
- Response: Relevant frameworks, case studies, best practices

### Communication Amplifier Endpoints

**POST /api/v1/communication/adapt**
- Adapt message for specific audience
- Request: Original message, audience context
- Response: Adapted message variants

**POST /api/v1/communication/analyze-audience**
- Analyze communication context
- Request: Audience description, communication goal
- Response: Optimal communication strategy

## Frontend Component Architecture

### 1. Decision Sandbox Interface

**Components:**
- `DecisionSandbox.tsx` - Main sandbox container
- `ScenarioBuilder.tsx` - Create and configure scenarios
- `SimulationRunner.tsx` - Execute and visualize simulations
- `OutcomeAnalyzer.tsx` - Analyze and extract insights
- `SandboxHistory.tsx` - View past sandbox sessions

**Key Features:**
- Interactive scenario configuration
- Real-time simulation visualization
- Outcome probability displays
- Insight extraction and learning

### 2. Cognitive Twin Dashboard

**Components:**
- `CognitiveDashboard.tsx` - Overview of thinking patterns
- `PatternAnalysis.tsx` - Detailed pattern visualization
- `GrowthTracker.tsx` - Track cognitive development
- `BiasAwareness.tsx` - Highlight and address biases

**Key Features:**
- Visual thinking pattern representation
- Growth area recommendations
- Bias detection alerts
- Personalized learning paths

### 3. Enhanced Agent Interface

**Components:**
- `MentorshipChat.tsx` - Specialized mentorship dialogue
- `SocraticDialogue.tsx` - Question-based learning interface
- `WisdomExplorer.tsx` - Browse strategic frameworks
- `ProgressTracker.tsx` - Monitor learning progress

**Key Features:**
- Mentorship-focused chat interface
- Strategic framework integration
- Progress visualization
- Personalized guidance

### 4. Communication Amplifier

**Components:**
- `MessageAdapter.tsx` - Adapt messages for different audiences
- `AudienceAnalyzer.tsx` - Analyze communication context
- `StyleSelector.tsx` - Choose communication style
- `FormatOptimizer.tsx` - Optimize message format

**Key Features:**
- Real-time message adaptation
- Audience-specific previews
- Style transformation options
- Multi-modal output formats

## Integration Strategy

### Phase 1: Foundation (Weeks 1-4)
1. **Database Schema**: Implement new collections and extend existing ones
2. **Basic API Endpoints**: Create core CRUD operations for new models
3. **Cognitive Analysis**: Implement basic pattern recognition
4. **Agent Enhancement**: Add mentorship capabilities to Strategist Agent

### Phase 2: Core Features (Weeks 5-8)
1. **Decision Sandbox**: Implement basic scenario testing
2. **Cognitive Twin**: Build user profiling and adaptation
3. **Enhanced Interactions**: Deploy Socratic dialogue system
4. **Frontend Components**: Create basic UI for new features

### Phase 3: Advanced Features (Weeks 9-12)
1. **Communication Amplifier**: Implement message adaptation
2. **Advanced Simulations**: Complex scenario modeling
3. **Wisdom Integration**: Deep strategic knowledge base
4. **Learning Analytics**: Comprehensive progress tracking

### Phase 4: Optimization (Weeks 13-16)
1. **Performance Tuning**: Optimize AI processing and database queries
2. **User Experience**: Refine interfaces based on feedback
3. **Advanced Analytics**: Sophisticated cognitive modeling
4. **Integration Testing**: End-to-end system validation

## Technical Considerations

### AI/ML Requirements
- **NLP Models**: For cognitive pattern analysis and message understanding
- **Recommendation Engine**: For personalized guidance and framework suggestions
- **Simulation Engine**: For scenario modeling and outcome prediction
- **Sentiment Analysis**: For emotional intelligence in mentorship

### Performance Optimization
- **Caching Strategy**: Cache cognitive profiles and frequently used wisdom
- **Async Processing**: Background analysis of user interactions
- **Database Indexing**: Optimize queries for pattern analysis
- **API Rate Limiting**: Manage AI model usage costs

### Security & Privacy
- **Data Encryption**: Protect sensitive cognitive profile data
- **Access Controls**: Ensure users only access their own profiles
- **Audit Logging**: Track access to sensitive mentorship data
- **Anonymization**: Option to anonymize data for research

### Scalability
- **Microservices**: Consider splitting cognitive analysis into separate service
- **Message Queues**: Handle async cognitive analysis processing
- **CDN Integration**: Optimize delivery of wisdom base content
- **Load Balancing**: Distribute AI processing across multiple instances

## Success Metrics

### User Engagement
- **Session Duration**: Increased time spent in strategic planning
- **Feature Adoption**: Usage rates of sandbox and mentorship features
- **Return Rate**: Frequency of user returns to the platform
- **Depth of Interaction**: Quality and depth of strategic conversations

### Learning Outcomes
- **Cognitive Growth**: Measurable improvement in thinking patterns
- **Bias Reduction**: Decreased occurrence of identified biases
- **Framework Adoption**: Increased use of strategic frameworks
- **Decision Quality**: Improved strategic decision outcomes

### System Performance
- **Response Time**: AI processing speed for mentorship interactions
- **Accuracy**: Precision of cognitive pattern recognition
- **Reliability**: System uptime and error rates
- **Scalability**: Performance under increased user load

This architecture transforms the existing Strategist AI from a simple Q&A system into a comprehensive Strategic Co-Pilot that provides personalized, intelligent guidance for strategic thinking and decision-making.