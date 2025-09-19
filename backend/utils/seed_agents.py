from database import get_database
from models.agent import AgentCreate, AgentInDB
from typing import List
import asyncio


# Default agents data based on the Backend-dev-plan.md
DEFAULT_AGENTS = [
    {
        "agent_id": "strategist",
        "name": "Strategic Co-Pilot",
        "ai_role": "Wise strategic mentor who analyzes your thinking patterns and guides you through Socratic dialogue to develop deeper strategic insights",
        "human_role": "Provide strategic context, validate insights, and apply judgment to personalized recommendations",
        "is_custom": False,
        "is_active": True,
        "model_name": "openai/gpt-4",
        "full_description": {
            "role": "Strategic Co-Pilot & Cognitive Twin",
            "mission": "Transform strategic thinking through personalized mentorship, cognitive pattern analysis, and decision sandbox testing",
            "expertise": [
                "Strategic planning", "Cognitive pattern analysis", "Socratic dialogue",
                "Decision simulation", "Bias detection", "Communication adaptation",
                "Mentorship guidance", "Framework application"
            ],
            "approach": "Personalized mentorship that adapts to your thinking style and develops your strategic capabilities",
            "cognitive_twin_config": {
                "pattern_analysis_enabled": True,
                "bias_detection_enabled": True,
                "learning_adaptation_enabled": True,
                "personalization_level": "high"
            },
            "mentorship_config": {
                "socratic_enabled": True,
                "coaching_style": "challenging_but_supportive",
                "expertise_depth": "expert",
                "personality_traits": ["wise", "patient", "insightful", "challenging"],
                "question_types": ["assumption_challenging", "perspective_expanding", "depth_probing"]
            },
            "wisdom_base": {
                "strategic_models": [
                    "Porter's Five Forces", "SWOT Analysis", "Blue Ocean Strategy",
                    "Balanced Scorecard", "OKRs", "Lean Canvas", "Business Model Canvas",
                    "PESTLE Analysis", "Value Chain Analysis", "BCG Matrix"
                ],
                "cognitive_frameworks": [
                    "Systems Thinking", "Design Thinking", "Critical Thinking",
                    "Decision Analysis", "Risk Assessment", "Stakeholder Analysis"
                ],
                "mentorship_techniques": [
                    "Socratic Questioning", "Assumption Challenging", "Perspective Taking",
                    "Scenario Planning", "Reflection Facilitation", "Insight Synthesis"
                ]
            },
            "sandbox_config": {
                "scenario_types": ["strategy_test", "role_play", "what_if", "competitive_analysis"],
                "simulation_depth": "advanced",
                "outcome_modeling": True,
                "learning_extraction": True
            }
        }
    },
    {
        "agent_id": "risk-compliance",
        "name": "Risk & Compliance Agent",
        "ai_role": "Identify regulatory risks, compliance requirements, and mitigation strategies",
        "human_role": "Validate regulatory interpretation, assess risk tolerance",
        "is_custom": False,
        "is_active": True,
        "full_description": {
            "role": "Risk Assessment Specialist",
            "mission": "Ensure strategic decisions account for regulatory and operational risks",
            "expertise": ["Regulatory compliance", "Risk assessment", "Mitigation planning"],
            "approach": "Comprehensive risk analysis with practical mitigation recommendations"
        }
    },
    {
        "agent_id": "market-analyst",
        "name": "Market Analyst Agent",
        "ai_role": "Analyze market trends, competitive landscape, and customer insights",
        "human_role": "Provide market context, validate assumptions with local knowledge",
        "is_custom": False,
        "is_active": True,
        "full_description": {
            "role": "Market Intelligence Specialist",
            "mission": "Deliver data-driven market insights to inform strategic decisions",
            "expertise": ["Market research", "Competitive analysis", "Customer behavior"],
            "approach": "Evidence-based market analysis with actionable insights"
        }
    },
    {
        "agent_id": "financial-advisor",
        "name": "Financial Advisor Agent",
        "ai_role": "Evaluate financial implications, ROI projections, and budget requirements",
        "human_role": "Validate financial assumptions, provide budget constraints",
        "is_custom": False,
        "is_active": True,
        "full_description": {
            "role": "Financial Strategy Consultant",
            "mission": "Ensure strategic decisions are financially sound and sustainable",
            "expertise": ["Financial modeling", "ROI analysis", "Budget planning"],
            "approach": "Rigorous financial analysis with clear cost-benefit evaluation"
        }
    },
    {
        "agent_id": "operations-expert",
        "name": "Operations Expert Agent",
        "ai_role": "Assess operational feasibility, resource requirements, and implementation challenges",
        "human_role": "Validate operational constraints, provide implementation insights",
        "is_custom": False,
        "is_active": True,
        "full_description": {
            "role": "Operational Excellence Advisor",
            "mission": "Ensure strategic plans are operationally viable and executable",
            "expertise": ["Process optimization", "Resource planning", "Implementation strategy"],
            "approach": "Practical operational assessment with focus on execution readiness"
        }
    },
    {
        "agent_id": "technology-architect",
        "name": "Technology Architect Agent",
        "ai_role": "Evaluate technology requirements, digital transformation needs, and tech stack decisions",
        "human_role": "Validate technical feasibility, provide technology constraints",
        "is_custom": False,
        "is_active": True,
        "full_description": {
            "role": "Technology Strategy Specialist",
            "mission": "Align technology capabilities with strategic objectives",
            "expertise": ["Technology assessment", "Digital transformation", "Architecture design"],
            "approach": "Strategic technology evaluation with focus on scalability and integration"
        }
    },
    {
        "agent_id": "customer-advocate",
        "name": "Customer Advocate Agent",
        "ai_role": "Represent customer perspective, analyze user experience impact, and customer value proposition",
        "human_role": "Validate customer insights, provide user feedback and preferences",
        "is_custom": False,
        "is_active": True,
        "full_description": {
            "role": "Customer Experience Champion",
            "mission": "Ensure strategic decisions prioritize customer value and satisfaction",
            "expertise": ["Customer experience", "User research", "Value proposition design"],
            "approach": "Customer-centric analysis with focus on user needs and satisfaction"
        }
    },
    {
        "agent_id": "sustainability-advisor",
        "name": "Sustainability Advisor Agent",
        "ai_role": "Assess environmental impact, sustainability metrics, and ESG considerations",
        "human_role": "Validate sustainability priorities, provide ESG context",
        "is_custom": False,
        "is_active": True,
        "full_description": {
            "role": "ESG Strategy Consultant",
            "mission": "Integrate sustainability and social responsibility into strategic planning",
            "expertise": ["Environmental impact", "ESG compliance", "Sustainable business practices"],
            "approach": "Comprehensive sustainability assessment with long-term impact focus"
        }
    },
    {
        "agent_id": "innovation-catalyst",
        "name": "Innovation Catalyst Agent",
        "ai_role": "Identify innovation opportunities, emerging trends, and disruptive potential",
        "human_role": "Validate innovation feasibility, provide creative insights",
        "is_custom": False,
        "is_active": True,
        "full_description": {
            "role": "Innovation Strategy Leader",
            "mission": "Drive strategic innovation and identify future growth opportunities",
            "expertise": ["Innovation management", "Trend analysis", "Disruptive technology"],
            "approach": "Forward-thinking innovation analysis with practical implementation pathways"
        }
    }
]


async def seed_agents():
    """Seed the database with default agents"""
    db = get_database()
    if db is None:
        print("❌ Database not available for seeding agents")
        return False
    
    agents_collection = db.agents
    
    try:
        # Check if agents already exist
        existing_count = await agents_collection.count_documents({})
        if existing_count > 0:
            print(f"ℹ️  Agents collection already has {existing_count} documents. Skipping seeding.")
            return True
        
        # Create agent documents
        agent_docs = []
        for agent_data in DEFAULT_AGENTS:
            agent_create = AgentCreate(**agent_data)
            agent_in_db = AgentInDB(**agent_create.model_dump())
            agent_docs.append(agent_in_db.model_dump(by_alias=True, exclude={"id"}))
        
        # Insert all agents
        result = await agents_collection.insert_many(agent_docs)
        print(f"✅ Successfully seeded {len(result.inserted_ids)} default agents")
        
        # Create indexes for better performance
        await agents_collection.create_index("agent_id", unique=True)
        await agents_collection.create_index("is_custom")
        print("✅ Created indexes for agents collection")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to seed agents: {e}")
        return False


async def get_all_agents() -> List[AgentInDB]:
    """Get all agents from database"""
    db = get_database()
    if db is None:
        return []
    
    agents_collection = db.agents
    agents_cursor = agents_collection.find({})
    agents = []
    
    async for agent_doc in agents_cursor:
        # Convert ObjectId to string for Pydantic compatibility
        if agent_doc and "_id" in agent_doc:
            agent_doc["_id"] = str(agent_doc["_id"])
        agent = AgentInDB(**agent_doc)
        agents.append(agent)
    
    return agents


async def get_agent_by_id(agent_id: str) -> AgentInDB | None:
    """Get agent by agent_id"""
    db = get_database()
    if db is None:
        return None
    
    agents_collection = db.agents
    agent_doc = await agents_collection.find_one({"agent_id": agent_id})
    
    if agent_doc:
        # Convert ObjectId to string for Pydantic compatibility
        if agent_doc and "_id" in agent_doc:
            agent_doc["_id"] = str(agent_doc["_id"])
        return AgentInDB(**agent_doc)
    return None


async def create_custom_agent(agent_data: AgentCreate) -> AgentInDB | None:
    """Create a new custom agent"""
    db = get_database()
    if db is None:
        return None
    
    agents_collection = db.agents
    
    try:
        # Check if agent_id already exists
        existing = await agents_collection.find_one({"agent_id": agent_data.agent_id})
        if existing:
            raise ValueError(f"Agent with ID '{agent_data.agent_id}' already exists")
        
        agent_in_db = AgentInDB(**agent_data.model_dump())
        agent_doc = agent_in_db.model_dump(by_alias=True, exclude={"id"})
        
        result = await agents_collection.insert_one(agent_doc)
        agent_doc["_id"] = str(result.inserted_id)  # Convert to string
        
        return AgentInDB(**agent_doc)
        
    except Exception as e:
        print(f"❌ Failed to create custom agent: {e}")
        return None


async def update_strategist_agent():
    """Update the existing Strategist Agent with Cognitive Twin capabilities"""
    db = get_database()
    if db is None:
        print("❌ Database not available for updating agents")
        return False
    
    agents_collection = db.agents
    
    try:
        # Find the enhanced strategist configuration
        enhanced_strategist = None
        for agent_data in DEFAULT_AGENTS:
            if agent_data["agent_id"] == "strategist":
                enhanced_strategist = agent_data
                break
        
        if not enhanced_strategist:
            print("❌ Enhanced strategist configuration not found")
            return False
        
        # Update the existing strategist agent
        result = await agents_collection.update_one(
            {"agent_id": "strategist"},
            {"$set": enhanced_strategist}
        )
        
        if result.modified_count > 0:
            print("✅ Successfully updated Strategist Agent with Cognitive Twin capabilities")
            return True
        else:
            print("ℹ️  Strategist Agent was already up to date or not found")
            return False
            
    except Exception as e:
        print(f"❌ Failed to update strategist agent: {e}")
        return False


if __name__ == "__main__":
    # For testing the seeding function
    async def main():
        from database import connect_to_mongo, close_mongo_connection
        await connect_to_mongo()
        await seed_agents()
        await update_strategist_agent()  # Update existing strategist
        await close_mongo_connection()
    
    asyncio.run(main())