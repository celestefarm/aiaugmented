from database_memory import get_database
from models.agent import AgentCreate, AgentInDB
from typing import List
import asyncio


# Default agents data based on the Backend-dev-plan.md
DEFAULT_AGENTS = [
    {
        "agent_id": "strategist",
        "name": "Strategic Co-Pilot",
        "ai_role": "Advanced strategic mentor with AGENT BLUEPRINT engine that guides you through multi-phase strategic analysis, generates Lightning Briefs, and challenges assumptions through red team protocols",
        "human_role": "Provide strategic context, validate insights, and apply judgment to personalized recommendations",
        "is_custom": False,
        "is_active": True,
        "model_name": "openai/gpt-4-32k",  # Use GPT-4-32K for better token capacity
        "full_description": {
            "role": "Strategic Co-Pilot & Cognitive Twin with AGENT BLUEPRINT Engine",
            "mission": "Transform strategic thinking through personalized mentorship, multi-phase strategic analysis, Lightning Brief generation, and red team challenge protocols",
            "expertise": [
                "Strategic planning", "Cognitive pattern analysis", "Socratic dialogue",
                "Decision simulation", "Bias detection", "Communication adaptation",
                "Mentorship guidance", "Framework application", "Evidence classification",
                "Lightning Brief generation", "Red team protocols", "Strategic validation"
            ],
            "approach": "Multi-phase strategic analysis with personalized mentorship that adapts to your thinking style and develops your strategic capabilities through structured workflows",
            "agent_blueprint_config": {
                "blueprint_engine_enabled": True,
                "multi_phase_analysis": True,
                "lightning_brief_generation": True,
                "red_team_protocols": True,
                "evidence_classification": True,
                "strategic_validation": True
            },
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
            "strategic_phases": {
                "reconnaissance": {
                    "enabled": True,
                    "description": "Gather and categorize strategic intelligence",
                    "min_evidence_threshold": 3,
                    "evidence_quality_focus": True
                },
                "analysis": {
                    "enabled": True,
                    "description": "Analyze evidence and identify strategic patterns",
                    "min_options_threshold": 2,
                    "pattern_recognition": True
                },
                "synthesis": {
                    "enabled": True,
                    "description": "Synthesize options into coherent strategy",
                    "assumption_generation": True,
                    "option_refinement": True
                },
                "validation": {
                    "enabled": True,
                    "description": "Validate assumptions and stress-test options",
                    "red_team_challenges": True,
                    "assumption_testing": True
                },
                "briefing": {
                    "enabled": True,
                    "description": "Generate Lightning Brief with actionable insights",
                    "brief_generation": True,
                    "confidence_scoring": True
                }
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
                ],
                "evidence_classification": [
                    "High Quality", "Medium Quality", "Low Quality", "Speculative",
                    "Source Validation", "Confidence Scoring", "Reliability Assessment"
                ],
                "red_team_protocols": [
                    "Assumption Challenge", "Evidence Scrutiny", "Alternative Perspective",
                    "Risk Amplification", "Resource Constraint", "Stakeholder Opposition"
                ]
            },
            "lightning_brief_config": {
                "situation_summary": True,
                "key_insights_extraction": True,
                "strategic_options_ranking": True,
                "critical_assumptions_identification": True,
                "next_actions_prioritization": True,
                "confidence_level_assessment": True
            },
            "red_team_config": {
                "socratic_dialogue": True,
                "challenge_difficulty_adaptation": True,
                "response_quality_evaluation": True,
                "follow_up_generation": True,
                "strategic_robustness_assessment": True
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
        "agent_id": "risk-agent",
        "name": "Risk Agent",
        "ai_role": "Identify regulatory risks, compliance requirements, and mitigation strategies",
        "human_role": "Validate regulatory interpretation, assess risk tolerance",
        "is_custom": False,
        "is_active": True,
        "model_name": "openai/gpt-4-32k",  # Add model configuration
        "full_description": {
            "role": "Risk Assessment Specialist",
            "mission": "Ensure strategic decisions account for regulatory and operational risks",
            "expertise": ["Regulatory compliance", "Risk assessment", "Mitigation planning"],
            "approach": "Comprehensive risk analysis with practical mitigation recommendations"
        }
    },
    {
        "agent_id": "execution-agent",
        "name": "Execution Agent",
        "ai_role": "Drive execution excellence, monitor progress, and ensure strategic initiatives are delivered",
        "human_role": "Provide execution context, validate implementation approaches",
        "is_custom": False,
        "is_active": True,
        "model_name": "openai/gpt-4-32k",  # Add model configuration
        "full_description": {
            "role": "Execution Excellence Specialist",
            "mission": "Transform strategic plans into actionable results through disciplined execution",
            "expertise": ["Project management", "Performance tracking", "Implementation strategy"],
            "approach": "Results-driven execution analysis with focus on delivery and accountability"
        }
    },
    {
        "agent_id": "market-competition-agent",
        "name": "Market & Competition Agent",
        "ai_role": "Analyze market trends, competitive landscape, and strategic positioning opportunities",
        "human_role": "Provide market context, validate competitive assumptions",
        "is_custom": False,
        "is_active": True,
        "model_name": "openai/gpt-4-32k",  # Add model configuration
        "full_description": {
            "role": "Market Intelligence & Competitive Strategy Specialist",
            "mission": "Deliver comprehensive market insights and competitive intelligence for strategic advantage",
            "expertise": ["Market research", "Competitive analysis", "Strategic positioning"],
            "approach": "Evidence-based market analysis with competitive intelligence and positioning strategies"
        }
    },
    {
        "agent_id": "mentor-agent",
        "name": "Mentor Agent",
        "ai_role": "Provide strategic guidance, leadership development, and decision-making support",
        "human_role": "Share experience, validate leadership approaches",
        "is_custom": False,
        "is_active": True,
        "model_name": "openai/gpt-4-32k",  # Add model configuration
        "full_description": {
            "role": "Strategic Mentor & Leadership Advisor",
            "mission": "Guide strategic thinking and leadership development through experienced counsel",
            "expertise": ["Strategic guidance", "Leadership development", "Decision frameworks"],
            "approach": "Mentorship-driven strategic advice with focus on capability building and wisdom transfer"
        }
    },
    {
        "agent_id": "stakeholder-agent",
        "name": "Stakeholder Agent",
        "ai_role": "Analyze stakeholder interests, manage relationships, and ensure alignment across constituencies",
        "human_role": "Validate stakeholder perspectives, provide relationship context",
        "is_custom": False,
        "is_active": True,
        "model_name": "openai/gpt-4-32k",  # Add model configuration
        "full_description": {
            "role": "Stakeholder Relationship & Alignment Specialist",
            "mission": "Ensure strategic decisions consider and align diverse stakeholder interests",
            "expertise": ["Stakeholder analysis", "Relationship management", "Consensus building"],
            "approach": "Stakeholder-centric analysis with focus on alignment, communication, and relationship optimization"
        }
    },
    {
        "agent_id": "brief-agent",
        "name": "Brief Agent",
        "ai_role": "Synthesize complex information into clear, actionable strategic briefs and communications",
        "human_role": "Validate key messages, provide communication preferences",
        "is_custom": False,
        "is_active": True,
        "model_name": "openai/gpt-4-32k",  # Add model configuration
        "full_description": {
            "role": "Strategic Communication & Brief Specialist",
            "mission": "Transform complex strategic analysis into clear, compelling, and actionable communications",
            "expertise": ["Strategic communication", "Information synthesis", "Executive briefing"],
            "approach": "Communication-focused analysis with emphasis on clarity, impact, and actionable insights"
        }
    },
    {
        "agent_id": "foresight-agent",
        "name": "Foresight Agent",
        "ai_role": "Identify emerging trends, future scenarios, and long-term strategic implications",
        "human_role": "Validate future assumptions, provide industry foresight",
        "is_custom": False,
        "is_active": True,
        "model_name": "openai/gpt-4-32k",  # Add model configuration
        "full_description": {
            "role": "Strategic Foresight & Future Planning Specialist",
            "mission": "Anticipate future trends and scenarios to inform long-term strategic planning",
            "expertise": ["Trend analysis", "Scenario planning", "Future forecasting"],
            "approach": "Forward-looking strategic analysis with focus on emerging opportunities and long-term implications"
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
        from database_memory import connect_to_mongo, close_mongo_connection
        await connect_to_mongo()
        await seed_agents()
        await update_strategist_agent()  # Update existing strategist
        await close_mongo_connection()
    
    asyncio.run(main())