
"""
Meta-Cognitive Service
Provides meta-cognitive capabilities for strategic thinking, self-reflection,
and continuous improvement in decision-making processes
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from enum import Enum
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
import statistics

from backend.database_memory import get_database
from backend.utils.cognitive_analysis import CognitiveAnalyzer, MentorshipEngine
from backend.utils.memory_service import memory_service, MemoryType
from backend.utils.outcome_analysis_service import outcome_analysis_service
from backend.utils.performance_monitor import perf_monitor
from bson import ObjectId

logger = logging.getLogger(__name__)


class MetaCognitiveLevel(Enum):
    """Levels of meta-cognitive awareness"""
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class ReflectionType(Enum):
    """Types of reflection processes"""
    STRATEGIC = "strategic"
    TACTICAL = "tactical"
    PROCESS = "process"
    OUTCOME = "outcome"
    LEARNING = "learning"
    BIAS = "bias"
    ASSUMPTION = "assumption"
    DECISION_QUALITY = "decision_quality"


class ThinkingPattern(Enum):
    """Identified thinking patterns"""
    ANALYTICAL = "analytical"
    CREATIVE = "creative"
    SYSTEMATIC = "systematic"
    INTUITIVE = "intuitive"
    CRITICAL = "critical"
    HOLISTIC = "holistic"
    SEQUENTIAL = "sequential"
    RANDOM = "random"


@dataclass
class MetaCognitiveInsight:
    """Individual meta-cognitive insight"""
    id: str
    user_id: str
    session_id: Optional[str]
    insight_type: str
    content: str
    confidence_level: float
    impact_score: float
    actionable_recommendations: List[str]
    supporting_evidence: List[str]
    related_patterns: List[str]
    created_at: datetime = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}


@dataclass
class ReflectionSession:
    """Meta-cognitive reflection session"""
    id: str
    user_id: str
    session_id: Optional[str]
    reflection_type: ReflectionType
    trigger_event: str
    questions_explored: List[str]
    insights_generated: List[str]
    action_items: List[str]
    learning_outcomes: List[str]
    cognitive_biases_identified: List[str]
    thinking_patterns_observed: List[ThinkingPattern]
    quality_score: float
    duration_minutes: int
    created_at: datetime = None
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}


@dataclass
class CognitiveProfile:
    """User's cognitive profile and meta-cognitive capabilities"""
    user_id: str
    meta_cognitive_level: MetaCognitiveLevel
    dominant_thinking_patterns: List[ThinkingPattern]
    cognitive_strengths: List[str]
    cognitive_blind_spots: List[str]
    bias_susceptibility: Dict[str, float]
    reflection_frequency: float
    learning_agility: float
    decision_quality_trend: List[float]
    self_awareness_score: float
    adaptation_capability: float
    last_updated: datetime = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.last_updated is None:
            self.last_updated = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}


class MetaCognitiveService:
    """Comprehensive meta-cognitive service for strategic thinking enhancement"""
    
    def __init__(self):
        self.cognitive_analyzer = CognitiveAnalyzer()
        self.mentorship_engine = MentorshipEngine()
        
        # Reflection question templates
        self.reflection_questions = {
            ReflectionType.STRATEGIC: [
                "What assumptions am I making about this strategic direction?",
                "How might my past experiences be influencing this decision?",
                "What alternative perspectives haven't I considered?",
                "What would success look like in 5 years?",
                "What are the second and third-order effects of this strategy?"
            ],
            ReflectionType.TACTICAL: [
                "What is the real problem I'm trying to solve?",
                "Am I addressing symptoms or root causes?",
                "What resources do I actually need vs. what I think I need?",
                "How will I know if this approach is working?",
                "What could go wrong and how would I respond?"
            ],
            ReflectionType.PROCESS: [
                "How effective was my decision-making process?",
                "What information was missing that would have helped?",
                "Where did I rush or spend too much time?",
                "How well did I involve the right stakeholders?",
                "What would I do differently next time?"
            ],
            ReflectionType.OUTCOME: [
                "What actually happened vs. what I expected?",
                "What factors contributed most to this outcome?",
                "What did I learn that I didn't expect to learn?",
                "How accurate were my initial assumptions?",
                "What patterns do I see across similar situations?"
            ],
            ReflectionType.LEARNING: [
                "What new insights have I gained?",
                "How has my thinking evolved on this topic?",
                "What mental models need updating?",
                "What skills do I need to develop further?",
                "How can I apply these learnings to future situations?"
            ],
            ReflectionType.BIAS: [
                "What biases might be influencing my thinking?",
                "Am I seeking information that confirms my existing beliefs?",
                "How might my emotional state be affecting my judgment?",
                "What would someone who disagrees with me say?",
                "Am I being overconfident or underconfident?"
            ]
        }
        
        # Meta-cognitive skill development areas
        self.skill_areas = {
            "self_awareness": "Understanding your own thinking processes and patterns",
            "cognitive_flexibility": "Ability to switch between different thinking approaches",
            "critical_thinking": "Systematic evaluation of information and arguments",
            "perspective_taking": "Ability to see situations from multiple viewpoints",
            "assumption_testing": "Skill in identifying and challenging assumptions",
            "pattern_recognition": "Ability to identify recurring themes and patterns",
            "systems_thinking": "Understanding interconnections and feedback loops",
            "decision_calibration": "Accuracy in assessing confidence levels"
        }

    async def initiate_reflection_session(self,
                                        user_id: str,
                                        reflection_type: ReflectionType,
                                        trigger_event: str,
                                        session_id: Optional[str] = None,
                                        context: Optional[Dict[str, Any]] = None) -> str:
        """Initiate a guided meta-cognitive reflection session"""
        try:
            reflection_id = f"reflection_{user_id}_{int(datetime.utcnow().timestamp())}"
            
            # Get relevant questions for this reflection type
            questions = self.reflection_questions.get(reflection_type, [])
            
            # Customize questions based on context
            if context:
                questions = await self._customize_reflection_questions(questions, context, user_id)
            
            # Create reflection session
            reflection_session = ReflectionSession(
                id=reflection_id,
                user_id=user_id,
                session_id=session_id,
                reflection_type=reflection_type,
                trigger_event=trigger_event,
                questions_explored=questions,
                insights_generated=[],
                action_items=[],
                learning_outcomes=[],
                cognitive_biases_identified=[],
                thinking_patterns_observed=[],
                quality_score=0.0,
                duration_minutes=0,
                metadata=context or {}
            )
            
            # Store session
            await self._store_reflection_session(reflection_session)
            
            logger.info(f"Initiated reflection session: {reflection_id}")
            return reflection_id
            
        except Exception as e:
            logger.error(f"Error initiating reflection session: {str(e)}")
            raise

    async def process_reflection_input(self,
                                     reflection_id: str,
                                     user_id: str,
                                     user_input: str,
                                     question_index: int) -> Dict[str, Any]:
        """Process user input during reflection session"""
        try:
            # Get reflection session
            session = await self._get_reflection_session(reflection_id, user_id)
            if not session:
                raise ValueError(f"Reflection session {reflection_id} not found")
            
            # Analyze the user input
            cognitive_analysis = self.cognitive_analyzer.analyze_message(user_input, user_id)
            
            # Extract insights from the analysis
            insights = await self._extract_meta_cognitive_insights(
                user_input, cognitive_analysis, session.reflection_type
            )
            
            # Update session with insights
            session.insights_generated.extend(insights)
            
            # Identify thinking patterns
            patterns = self._identify_thinking_patterns(cognitive_analysis)
            session.thinking_patterns_observed.extend(patterns)
            
            # Identify potential biases
            biases = cognitive_analysis.get("biases_detected", [])
            session.cognitive_biases_identified.extend(biases)
            
            # Generate follow-up questions or guidance
            follow_up = await self._generate_reflection_follow_up(
                user_input, cognitive_analysis, session, question_index
            )
            
            # Update session
            await self._update_reflection_session(session)
            
            return {
                "insights": insights,
                "thinking_patterns": [p.value for p in patterns],
                "biases_identified": biases,
                "follow_up": follow_up,
                "progress": {
                    "questions_completed": question_index + 1,
                    "total_questions": len(session.questions_explored),
                    "insights_generated": len(session.insights_generated)
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing reflection input: {str(e)}")
            raise

    async def complete_reflection_session(self,
                                        reflection_id: str,
                                        user_id: str) -> Dict[str, Any]:
        """Complete reflection session and generate summary"""
        try:
            # Get reflection session
            session = await self._get_reflection_session(reflection_id, user_id)
            if not session:
                raise ValueError(f"Reflection session {reflection_id} not found")
            
            # Calculate session quality score
            session.quality_score = self._calculate_reflection_quality(session)
            
            # Generate action items
            session.action_items = await self._generate_action_items(session)
            
            # Extract learning outcomes
            session.learning_outcomes = await self._extract_learning_outcomes(session)
            
            # Calculate duration
            if session.created_at:
                duration = datetime.utcnow() - session.created_at
                session.duration_minutes = int(duration.total_seconds() / 60)
            
            # Mark as completed
            session.completed_at = datetime.utcnow()
            
            # Update cognitive profile
            await self._update_cognitive_profile(user_id, session)
            
            # Store insights in memory
            await self._store_insights_in_memory(user_id, session)
            
            # Update session
            await self._update_reflection_session(session)
            
            # Generate summary
            summary = {
                "reflection_id": reflection_id,
                "reflection_type": session.reflection_type.value,
                "quality_score": session.quality_score,
                "duration_minutes": session.duration_minutes,
                "insights_generated": session.insights_generated,
                "thinking_patterns": [p.value for p in session.thinking_patterns_observed],
                "biases_identified": session.cognitive_biases_identified,
                "action_items": session.action_items,
                "learning_outcomes": session.learning_outcomes,
                "recommendations": await self._generate_meta_cognitive_recommendations(session)
            }
            
            logger.info(f"Completed reflection session: {reflection_id}")
            return summary
            
        except Exception as e:
            logger.error(f"Error completing reflection session: {str(e)}")
            raise

    async def analyze_thinking_patterns(self,
                                      user_id: str,
                                      time_range: Optional[Tuple[datetime, datetime]] = None) -> Dict[str, Any]:
        """Analyze user's thinking patterns over time"""
        try:
            # Get user's reflection sessions
            sessions = await self._get_user_reflection_sessions(user_id, time_range)
            
            if not sessions:
                return {"message": "No reflection data available"}
            
            # Analyze patterns
            pattern_frequency = Counter()
            bias_frequency = Counter()
            quality_scores = []
            
            for session in sessions:
                pattern_frequency.update([p.value for p in session.thinking_patterns_observed])
                bias_frequency.update(session.cognitive_biases_identified)
                if session.quality_score > 0:
                    quality_scores.append(session.quality_score)
            
            # Calculate trends
            dominant_patterns = pattern_frequency.most_common(3)
            common_biases = bias_frequency.most_common(3)
            avg_quality = statistics.mean(quality_scores) if quality_scores else 0
            
            # Generate insights
            insights = []
            if dominant_patterns:
                top_pattern = dominant_patterns[0][0]
                insights.append(f"Your dominant thinking pattern is {top_pattern}")
            
            if common_biases:
                top_bias = common_biases[0][0]
                insights.append(f"Watch out for {top_bias} - it appears frequently in your thinking")
            
            if avg_quality > 0.7:
                insights.append("Your reflection quality is high - keep up the good work!")
            elif avg_quality < 0.5:
                insights.append("Consider spending more time on deeper reflection")
            
            return {
                "analysis_period": time_range,
                "sessions_analyzed": len(sessions),
                "dominant_patterns": dominant_patterns,
                "common_biases": common_biases,
                "average_reflection_quality": avg_quality,
                "insights": insights,
                "recommendations": await self._generate_pattern_recommendations(
                    dominant_patterns, common_biases, avg_quality
                )
            }
            
        except Exception as e:
            logger.error(f"Error analyzing thinking patterns: {str(e)}")
            return {}

    async def get_cognitive_profile(self, user_id: str) -> CognitiveProfile:
        """Get or create user's cognitive profile"""
        try:
            # Try to get existing profile from memory
            memories = await memory_service.search_memories(
                user_id=user_id,
                memory_type=MemoryType.COGNITIVE_PROFILE,
                limit=1
            )
            
            if memories:
                profile_data = memories[0].content
                return CognitiveProfile(**profile_data)
            
            # Create new profile
            return await self._create_cognitive_profile(user_id)
            
        except Exception as e:
            logger.error(f"Error getting cognitive profile: {str(e)}")
            return await self._create_cognitive_profile(user_id)

    async def suggest_meta_cognitive_exercises(self,
                                             user_id: str,
                                             focus_area: Optional[str] = None) -> List[Dict[str, Any]]:
        """Suggest meta-cognitive exercises based on user's profile"""
        try:
            profile = await self.get_cognitive_profile(user_id)
            
            exercises = []
            
            # Exercises based on cognitive level
            if profile.meta_cognitive_level == MetaCognitiveLevel.BASIC:
                exercises.extend(self._get_basic_exercises())
            elif profile.meta_cognitive_level == MetaCognitiveLevel.INTERMEDIATE:
                exercises.extend(self._get_intermediate_exercises())
            else:
                exercises.extend(self._get_advanced_exercises())
            
            # Targeted exercises for blind spots
            for blind_spot in profile.cognitive_blind_spots:
                exercises.extend(self._get_targeted_exercises(blind_spot))
            
            # Focus area specific exercises
            if focus_area and focus_area in self.skill_areas:
                exercises.extend(self._get_skill_specific_exercises(focus_area))
            
            # Limit and prioritize
            return exercises[:5]
            
        except Exception as e:
            logger.error(f"Error suggesting exercises: {str(e)}")
            return []

    async def track_meta_cognitive_progress(self, user_id: str) -> Dict[str, Any]:
        """Track user's meta-cognitive development progress"""
        try:
            # Get historical data
            sessions = await self._get_user_reflection_sessions(user_id)
            profile = await self.get_cognitive_profile(user_id)
            
            if not sessions:
                return {"message": "No progress data available"}
            
            # Calculate progress metrics
            progress_metrics = {
                "reflection_frequency": len(sessions) / max((datetime.utcnow() - sessions[-1].created_at).days, 1),
                "average_session_quality": statistics.mean([s.quality_score for s in sessions if s.quality_score > 0]),
                "bias_awareness_improvement": self._calculate_bias_awareness_trend(sessions),
                "pattern_recognition_improvement": self._calculate_pattern_recognition_trend(sessions),
                "meta_cognitive_level": profile.meta_cognitive_level.value,
                "skill_development": self._assess_skill_development(sessions, profile)
            }
            
            # Generate development recommendations
            recommendations = await self._generate_development_recommendations(profile, progress_metrics)
            
            return {
                "current_level": profile.meta_cognitive_level.value,
                "progress_metrics": progress_metrics,
                "strengths": profile.cognitive_strengths,
                "development_areas": profile.cognitive_blind_spots,
                "recommendations": recommendations,
                "next_milestone": self._get_next_milestone(profile)
            }
            
        except Exception as e:
            logger.error(f"Error tracking progress: {str(e)}")
            return {}

    def _identify_thinking_patterns(self, cognitive_analysis: Dict[str, Any]) -> List[ThinkingPattern]:
        """Identify thinking patterns from cognitive analysis"""
        patterns = []
        
        thinking_patterns = cognitive_analysis.get("thinking_patterns", {})
        
        for pattern_name, score in thinking_patterns.items():
            if score > 0.6:  # Threshold for pattern identification
                try:
                    pattern_enum = ThinkingPattern(pattern_name.upper())
                    patterns.append(pattern_enum)
                except ValueError:
                    # Handle patterns not in enum
                    continue
        
        return patterns

    async def _extract_meta_cognitive_insights(self,
                                             user_input: str,
                                             cognitive_analysis: Dict[str, Any],
                                             reflection_type: ReflectionType) -> List[str]:
        """Extract meta-cognitive insights from user input"""
        insights = []
        
        # Insight from thinking patterns
        patterns = cognitive_analysis.get("thinking_patterns", {})
        dominant_pattern = max(patterns.keys(), key=lambda k: patterns[k]) if patterns else None
        
        if dominant_pattern and patterns[dominant_pattern] > 0.7:
            insights.append(f"You're primarily using {dominant_pattern} thinking in this reflection")
        
        # Insight from biases
        biases = cognitive_analysis.get("biases_detected", [])
        if biases:
            insights.append(f"Potential cognitive bias detected: {biases[0]}")
        
        # Insight from confidence levels
        confidence = cognitive_analysis.get("confidence_indicators", {})
        if confidence.get("level") == "low":
            insights.append("You seem uncertain about this topic - consider gathering more information")
        elif confidence.get("level") == "high":
            insights.append("High confidence detected - ensure you're not overlooking alternative perspectives")
        
        # Insight from complexity
        complexity = cognitive_analysis.get("complexity_level", "medium")
        if complexity == "high":
            insights.append("You're dealing with a complex issue - break it down into smaller components")
        
        return insights

    async def _generate_reflection_follow_up(self,
                                           user_input: str,
                                           cognitive_analysis: Dict[str, Any],
                                           session: ReflectionSession,
                                           question_index: int) -> Dict[str, Any]:
        """Generate follow-up questions or guidance"""
        follow_up = {
            "type": "guidance",
            "content": "",
            "next_question": None
        }
        
        # Check if we should ask follow-up questions
        biases = cognitive_analysis.get("biases_detected", [])
        if biases and "confirmation_bias" in biases:
            follow_up["type"] = "challenge"
            follow_up["content"] = "I notice you might be seeking confirming evidence. What information would challenge your current view?"
        
        # Check for next question
        if question_index + 1 < len(session.questions_explored):
            follow_up["next_question"] = session.questions_explored[question_index + 1]
        else:
            follow_up["type"] = "completion"
            follow_up["content"] = "You've explored all the key questions. Ready to wrap up this reflection?"
        
        return follow_up

    def _calculate_reflection_quality(self, session: ReflectionSession) -> float:
        """Calculate quality score for reflection session"""
        quality_factors = []
        
        # Depth of insights
        if session.insights_generated:
            insight_depth = len(session.insights_generated) / len(session.questions_explored)
            quality_factors.append(min(insight_depth, 1.0))
        
        # Pattern recognition
        if session.thinking_patterns_observed:
            quality_factors.append(0.8)
        
        # Bias awareness
        if session.cognitive_biases_identified:
            quality_factors.append(0.9)
        
        # Duration appropriateness (not too short, not too long)
        if session.duration_minutes > 0:
            if 10 <= session.duration_minutes <= 45:
                quality_factors.append(1.0)
            elif session.duration_minutes < 10:
                quality_factors.append(0.6)
            else:
                quality_factors.append(0.8)
        
        return statistics.mean(quality_factors) if quality_factors else 0.5

    async def _generate_action_items(self, session: ReflectionSession) -> List[str]:
        """Generate actionable items from reflection session"""
        action_items = []
        
        # Actions based on biases identified
        for bias in session.cognitive_biases_identified:
            if bias == "confirmation_bias":
                action_items.append("Actively seek out information that challenges your current assumptions")
            elif bias == "anchoring":
                action_items.append("Consider multiple starting points or reference points for your analysis")
        
        # Actions based on thinking patterns
        analytical_patterns = [p for p in session.thinking_patterns_observed if p == ThinkingPattern.ANALYTICAL]
        if len(analytical_patterns) > 2:
            action_items.append("Balance analytical thinking with creative or intuitive approaches")
        
        # Generic actions based on reflection type
        if session.reflection_type == ReflectionType.STRATEGIC:
            action_items.append("Schedule a follow-up review to assess progress on strategic initiatives")
        elif session.reflection_type == ReflectionType.OUTCOME:
            action_items.append("Document lessons learned for future reference")
        
        return action_items[:3]  # Limit to 3 most important actions

    async def _extract_learning_outcomes(self, session: ReflectionSession) -> List[str]:
        """Extract learning outcomes from reflection session"""
        learning_outcomes = []
        
        # Learning from insights
        if session.insights_generated:
            learning_outcomes.append(f"Generated {len(session.insights_generated)} new insights about the situation")
        
        # Learning from pattern recognition
        unique_patterns = list(set(session.thinking_patterns_observed))
        if unique_patterns:
            learning_outcomes.append(f"Identified {len(unique_patterns)} distinct thinking patterns in use")
        
        # Learning from bias awareness
        if session.cognitive_biases_identified:
            learning_outcomes.append(f"Became aware of {len(set(session.cognitive_biases_identified))} potential cognitive biases")
        
        return learning_outcomes

    async def _create_cognitive_profile(self, user_id: str) -> CognitiveProfile:
        """Create initial cognitive profile for user"""
        profile = CognitiveProfile(
            user_id=user_id,
            meta_cognitive_level=MetaCognitiveLevel.BASIC,
            dominant_thinking_patterns=[ThinkingPattern.ANALYTICAL],
            cognitive_strengths=["Logical reasoning"],
            cognitive_blind_spots=["Confirmation bias susceptibility"],
            bias_susceptibility={"confirmation_bias": 0.6, "anchoring": 0.5},
            reflection_frequency=0.0,
            learning_agility=0.5,
            decision_quality_trend=[0.5],
            self_awareness_score=0.4,
            adaptation_capability=0.5
        )
        
        # Store in memory
        await memory_service.store_memory(
            user_id=user_id,
            memory_type=MemoryType.COGNITIVE_PROFILE,
            content=asdict(profile),
            priority=memory_service.MemoryPriority.HIGH
        )
        
        return profile

    def _get_basic_exercises(self) -> List[Dict[str, Any]]:
        """Get basic meta-cognitive exercises"""
        return [
            {
                "title": "Daily Reflection",
                "description": "Spend 5 minutes each day reflecting on your decision-making",
                "instructions": "Ask yourself: What decisions did I make today? What influenced those decisions?",
                "duration_minutes": 5,
                "difficulty": "easy"
            },
            {
                "title": "Assumption Identification",
                "description": "Practice identifying assumptions in your thinking",
                "instructions": "Before making a decision, list 3 assumptions you're making",
                "duration_minutes": 10,
                "difficulty": "easy"
            }
        ]

    def _get_intermediate_exercises(self) -> List[Dict[str, Any]]:
        """Get intermediate meta-cognitive exercises"""
        return [
            {
                "title": "Perspective Taking",
                "description": "Consider multiple viewpoints on a decision",
                "instructions": "For each major decision, consider how 3 different stakeholders would view it",
                "duration_minutes": 15,
                "difficulty": "medium"
            },
            {
                "title": "Bias Hunting",
                "description": "Actively look for cognitive biases in your thinking",
                "instructions": "Review a recent decision and identify at least 2 potential biases that may have influenced it",
                "duration_minutes": 20,
                "difficulty": "medium"
            }
        ]

    def _get_advanced_exercises(self) -> List[Dict[str, Any]]:
        """Get advanced meta-cognitive exercises"""
        return [
            {
                "title": "Systems Thinking Analysis",
                "description": "Analyze the interconnections and feedback loops in complex situations",
                "instructions": "Map out the system dynamics of a strategic challenge you're facing",
                "duration_minutes": 30,
                "difficulty": "hard"
            },
            {
                "title": "Meta-Strategy Development",
                "description": "Develop strategies for improving your strategic thinking",
                "instructions": "Create a plan for enhancing your own decision-making capabilities",
                "duration_minutes": 45,
                "difficulty": "hard"
            }
        ]

    async def _store_reflection_session(self, session: ReflectionSession) -> None:
        """Store reflection session in database"""
        try:
            database = get_database()
            if not database:
                return
            
            session_doc = asdict(session)
            session_doc["reflection_type"] = session.reflection_type.value
            session_doc["thinking_patterns_observed"] = [p.value for p in session.thinking_patterns_observed]
            
            await database.reflection_sessions.insert_one(session_doc)
            
        except Exception as e:
            logger.error(f"Error storing reflection session: {str(e)}")

    async def _get_reflection_session(self, reflection_id: str, user_id: str) -> Optional[ReflectionSession]:
        """Get reflection session from database"""
        try:
            database = get_database()
            if not database:
                return None
            
            session_doc = await database.reflection_sessions.find_one({
                "id": reflection_id,
                "user_id": user_id
            })
            
            if session_doc:
                # Convert back to ReflectionSession (simplified)
                session_doc["reflection_type"] = ReflectionType(session_doc["reflection_type"])
                session_doc["thinking_patterns_observed"] = [
                    ThinkingPattern(p) for p in session_doc.get("thinking_patterns_observed", [])
                ]
                return ReflectionSession(**session_doc)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting reflection session: {str(e)}")
            return None

    async def _update_reflection_session(self, session: ReflectionSession) -> None:
        """Update reflection session in database"""
        try:
            database = get_database()
            if not database:
                return
            
            session_doc = asdict(session)
            session_doc["reflection_type"] = session.reflection_type.value
            session_doc["thinking_patterns_observed"] = [p.value for p in session.thinking_patterns_observed]
            
            await database.reflection_sessions.update_one(
                {"id": session.id},
                {"$set": session_doc}
            )
            
        except Exception as e:
            logger.error(f"Error updating reflection session: {str(e)}")

    async def _get_user_reflection_sessions(self,
                                         user_id: str,
                                         time_range: Optional[Tuple[datetime, datetime]] = None) -> List[ReflectionSession]:
        """Get user's reflection sessions"""
        try:
            database = get_database()
            if not database:
                return []
            
            query = {"user_id": user_id}
            if time_range:
                query["created_at"] = {"$gte": time_range[0], "$lte": time_range[1]}
            
            cursor = database.reflection_sessions.find(query).sort("created_at", -1)
            session_docs = await cursor.to_list(length=None)
            
            sessions = []
            for doc in session_docs:
                doc["reflection_type"] = ReflectionType(doc["reflection_type"])
                doc["thinking_patterns_observed"] = [
                    ThinkingPattern(p) for p in doc.get("thinking_patterns_observed", [])
                ]
                sessions.append(ReflectionSession(**doc))
            
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting user reflection sessions: {str(e)}")
            return []

    async def _customize_reflection_questions(self,
                                            questions: List[str],
                                            context: Dict[str, Any],
                                            user_id: str) -> List[str]:
        """Customize reflection questions based on context and user profile"""
        try:
            # Get user's cognitive profile
            profile = await self.get_cognitive_profile(user_id)
            
            # Customize based on context
            customized_questions = questions.copy()
            
            # Add context-specific questions
            if context.get("decision_type") == "strategic":
                customized_questions.append("How does this align with your long-term vision?")
            elif context.get("decision_type") == "operational":
                customized_questions.append("What are the immediate implementation challenges?")
            
            # Add questions based on user's blind spots
            for blind_spot in profile.cognitive_blind_spots:
                if "confirmation_bias" in blind_spot:
                    customized_questions.append("What evidence would prove you wrong?")
                elif "anchoring" in blind_spot:
                    customized_questions.append("What if you started with a completely different assumption?")
            
            return customized_questions[:7]  # Limit to 7 questions
            
        except Exception as e:
            logger.error(f"Error customizing reflection questions: {str(e)}")
            return questions

    async def _update_cognitive_profile(self, user_id: str, session: ReflectionSession) -> None:
        """Update user's cognitive profile based on reflection session"""
        try:
            profile = await self.get_cognitive_profile(user_id)
            
            # Update reflection frequency
            profile.reflection_frequency += 1
            
            # Update thinking patterns
            new_patterns = [p for p in session.thinking_patterns_observed if p not in profile.dominant_thinking_patterns]
            profile.dominant_thinking_patterns.extend(new_patterns[:2])  # Add up to 2 new patterns
            
            # Update bias susceptibility
            for bias in session.cognitive_biases_identified:
                if bias in profile.bias_susceptibility:
                    profile.bias_susceptibility[bias] = min(profile.bias_susceptibility[bias] + 0.1, 1.0)
                else:
                    profile.bias_susceptibility[bias] = 0.6
            
            # Update self-awareness score based on session quality
            if session.quality_score > 0.7:
                profile.self_awareness_score = min(profile.self_awareness_score + 0.05, 1.0)
            
            # Update meta-cognitive level if warranted
            if profile.reflection_frequency > 10 and profile.self_awareness_score > 0.7:
                if profile.meta_cognitive_level == MetaCognitiveLevel.BASIC:
                    profile.meta_cognitive_level = MetaCognitiveLevel.INTERMEDIATE
                elif profile.meta_cognitive_level == MetaCognitiveLevel.INTERMEDIATE and profile.self_awareness_score > 0.85:
                    profile.meta_cognitive_level = MetaCognitiveLevel.ADVANCED
            
            profile.last_updated = datetime.utcnow()
            
            # Store updated profile
            await memory_service.store_memory(
                user_id=user_id,
                memory_type=MemoryType.COGNITIVE_PROFILE,
                content=asdict(profile),
                priority=memory_service.MemoryPriority.HIGH
            )
            
        except Exception as e:
            logger.error(f"Error updating cognitive profile: {str(e)}")

    async def _store_insights_in_memory(self, user_id: str, session: ReflectionSession) -> None:
        """Store reflection insights in memory service"""
        try:
            for insight in session.insights_generated:
                await memory_service.store_memory(
                    user_id=user_id,
                    memory_type=MemoryType.STRATEGIC_PATTERNS,
                    content={
                        "insight": insight,
                        "reflection_type": session.reflection_type.value,
                        "session_id": session.id,
                        "quality_score": session.quality_score
                    },
                    session_id=session.session_id,
                    priority=memory_service.MemoryPriority.HIGH,
                    tags=["reflection", "insight", session.reflection_type.value]
                )
                
        except Exception as e:
            logger.error(f"Error storing insights in memory: {str(e)}")

    async def _generate_meta_cognitive_recommendations(self, session: ReflectionSession) -> List[str]:
        """Generate meta-cognitive recommendations based on session"""
        recommendations = []
        
        # Recommendations based on quality score
        if session.quality_score < 0.5:
            recommendations.append("Consider spending more time on each reflection question")
            recommendations.append("Try to dig deeper into your assumptions and reasoning")
        
        # Recommendations based on patterns
        if len(set(session.thinking_patterns_observed)) < 2:
            recommendations.append("Try to use different thinking approaches for more comprehensive analysis")
        
        # Recommendations based on biases
        if not session.cognitive_biases_identified:
            recommendations.append("Practice actively looking for potential biases in your thinking")
        elif len(session.cognitive_biases_identified) > 3:
            recommendations.append("Focus on addressing the most common biases in your thinking")
        
        # Recommendations based on reflection type
        if session.reflection_type == ReflectionType.STRATEGIC:
            recommendations.append("Schedule regular strategic reflection sessions to maintain long-term perspective")
        
        return recommendations[:3]  # Limit to top 3 recommendations

    async def _generate_pattern_recommendations(self,
                                              dominant_patterns: List[Tuple[str, int]],
                                              common_biases: List[Tuple[str, int]],
                                              avg_quality: float) -> List[str]:
        """Generate recommendations based on thinking patterns analysis"""
        recommendations = []
        
        # Pattern diversity recommendations
        if len(dominant_patterns) < 3:
            recommendations.append("Try to diversify your thinking patterns - explore creative and intuitive approaches")
        
        # Bias management recommendations
        if common_biases:
            top_bias = common_biases[0][0]
            recommendations.append(f"Develop specific strategies to counter {top_bias}")
        
        # Quality improvement recommendations
        if avg_quality < 0.6:
            recommendations.append("Focus on deeper reflection - spend more time exploring each question")
        
        return recommendations

    def _calculate_bias_awareness_trend(self, sessions: List[ReflectionSession]) -> float:
        """Calculate trend in bias awareness over time"""
        if len(sessions) < 2:
            return 0.0
        
        # Sort by date
        sorted_sessions = sorted(sessions, key=lambda x: x.created_at)
        
        # Calculate bias identification rate over time
        early_sessions = sorted_sessions[:len(sorted_sessions)//2]
        recent_sessions = sorted_sessions[len(sorted_sessions)//2:]
        
        early_bias_rate = sum(len(s.cognitive_biases_identified) for s in early_sessions) / len(early_sessions)
        recent_bias_rate = sum(len(s.cognitive_biases_identified) for s in recent_sessions) / len(recent_sessions)
        
        return recent_bias_rate - early_bias_rate

    def _calculate_pattern_recognition_trend(self, sessions: List[ReflectionSession]) -> float:
        """Calculate trend in pattern recognition over time"""
        if len(sessions) < 2:
            return 0.0
        
        # Sort by date
        sorted_sessions = sorted(sessions, key=lambda x: x.created_at)
        
        # Calculate pattern recognition rate over time
        early_sessions = sorted_sessions[:len(sorted_sessions)//2]
        recent_sessions = sorted_sessions[len(sorted_sessions)//2:]
        
        early_pattern_rate = sum(len(s.thinking_patterns_observed) for s in early_sessions) / len(early_sessions)
        recent_pattern_rate = sum(len(s.thinking_patterns_observed) for s in recent_sessions) / len(recent_sessions)
        
        return recent_pattern_rate - early_pattern_rate

    def _assess_skill_development(self, sessions: List[ReflectionSession], profile: CognitiveProfile) -> Dict[str, float]:
        """Assess development in various meta-cognitive skills"""
        skills = {}
        
        # Self-awareness
        skills["self_awareness"] = profile.self_awareness_score
        
        # Critical thinking (based on bias identification)
        if sessions:
            avg_biases_identified = sum(len(s.cognitive_biases_identified) for s in sessions) / len(sessions)
            skills["critical_thinking"] = min(avg_biases_identified / 3.0, 1.0)
        
        # Pattern recognition
        if sessions:
            avg_patterns_recognized = sum(len(s.thinking_patterns_observed) for s in sessions) / len(sessions)
            skills["pattern_recognition"] = min(avg_patterns_recognized / 4.0, 1.0)
        
        # Reflection quality
        if sessions:
            avg_quality = sum(s.quality_score for s in sessions if s.quality_score > 0) / len([s for s in sessions if s.quality_score > 0])
            skills["reflection_quality"] = avg_quality
        
        return skills

    async def _generate_development_recommendations(self,
                                                 profile: CognitiveProfile,
                                                 progress_metrics: Dict[str, Any]) -> List[str]:
        """Generate development recommendations based on profile and progress"""
        recommendations = []
        
        # Level-based recommendations
        if profile.meta_cognitive_level == MetaCognitiveLevel.BASIC:
            recommendations.append("Focus on daily reflection practice to build meta-cognitive awareness")
        elif profile.meta_cognitive_level == MetaCognitiveLevel.INTERMEDIATE:
            recommendations.append("Practice advanced techniques like perspective-taking and systems thinking")
        
        # Skill-specific recommendations
        if progress_metrics.get("average_session_quality", 0) < 0.6:
            recommendations.append("Spend more time on each reflection question for deeper insights")
        
        if progress_metrics.get("bias_awareness_improvement", 0) < 0.1:
            recommendations.append("Study common cognitive biases and practice identifying them")
        
        return recommendations[:3]

    def _get_next_milestone(self, profile: CognitiveProfile) -> str:
        """Get next development milestone for user"""
        if profile.meta_cognitive_level == MetaCognitiveLevel.BASIC:
            return "Reach intermediate level by completing 10 quality reflection sessions"
        elif profile.meta_cognitive_level == MetaCognitiveLevel.INTERMEDIATE:
            return "Advance to expert level by demonstrating consistent bias awareness and pattern recognition"
        elif profile.meta_cognitive_level == MetaCognitiveLevel.ADVANCED:
            return "Achieve expert level by mentoring others and developing novel meta-cognitive techniques"
        else:
            return "Continue refining and sharing your meta-cognitive expertise"

    def _get_targeted_exercises(self, blind_spot: str) -> List[Dict[str, Any]]:
        """Get exercises targeted at specific cognitive blind spots"""
        exercises = []
        
        if "confirmation_bias" in blind_spot:
            exercises.append({
                "title": "Devil's Advocate",
                "description": "Argue against your own position",
                "instructions": "Take your current view and spend 10 minutes arguing why it might be wrong",
                "duration_minutes": 10,
                "difficulty": "medium"
            })
        
        if "anchoring" in blind_spot:
            exercises.append({
                "title": "Multiple Starting Points",
                "description": "Consider different initial assumptions",
                "instructions": "Start your analysis from 3 completely different assumptions",
                "duration_minutes": 15,
                "difficulty": "medium"
            })
        
        return exercises

    def _get_skill_specific_exercises(self, skill_area: str) -> List[Dict[str, Any]]:
        """Get exercises for specific skill development"""
        exercises = []
        
        if skill_area == "critical_thinking":
            exercises.append({
                "title": "Evidence Evaluation",
                "description": "Systematically evaluate the quality of evidence",
                "instructions": "For each piece of evidence, assess its reliability, relevance, and sufficiency",
                "duration_minutes": 20,
                "difficulty": "medium"
            })
        
        if skill_area == "systems_thinking":
            exercises.append({
                "title": "Causal Loop Mapping",
                "description": "Map the feedback loops in a complex system",
                "instructions": "Identify the key variables and draw the causal relationships between them",
                "duration_minutes": 30,
                "difficulty": "hard"
            })
        
        return exercises


# Global service instance
meta_cognitive_service = MetaCognitiveService()


# Utility functions for easy access
async def start_reflection(user_id: str,
                          reflection_type: str,
                          trigger_event: str,
                          session_id: Optional[str] = None) -> str:
    """Utility function to start reflection session"""
    return await meta_cognitive_service.initiate_reflection_session(
        user_id=user_id,
        reflection_type=ReflectionType(reflection_type),
        trigger_event=trigger_event,
        session_id=session_id
    )


async def get_thinking_patterns(user_id: str) -> Dict[str, Any]:
    """Utility function to analyze thinking patterns"""
    return await meta_cognitive_service.analyze_thinking_patterns(user_id)


async def get_meta_cognitive_exercises(user_id: str, focus_area: Optional[str] = None) -> List[Dict[str, Any]]:
    """Utility function to get recommended exercises"""
    return await meta_cognitive_service.suggest_meta_cognitive_exercises(user_id, focus_area)