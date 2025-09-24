"""
RED TEAM PROTOCOL
Socratic dialogue system for challenging strategic assumptions and options
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import random
from datetime import datetime

class ChallengeType(Enum):
    ASSUMPTION_CHALLENGE = "assumption_challenge"
    EVIDENCE_SCRUTINY = "evidence_scrutiny"
    ALTERNATIVE_PERSPECTIVE = "alternative_perspective"
    RISK_AMPLIFICATION = "risk_amplification"
    RESOURCE_CONSTRAINT = "resource_constraint"
    STAKEHOLDER_OPPOSITION = "stakeholder_opposition"
    TIMING_CHALLENGE = "timing_challenge"
    SCALE_CHALLENGE = "scale_challenge"

class ChallengeDifficulty(Enum):
    GENTLE = "gentle"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"
    DEVIL_ADVOCATE = "devil_advocate"

@dataclass
class RedTeamChallenge:
    """Individual red team challenge"""
    challenge_type: ChallengeType
    question: str
    target: str  # What is being challenged
    difficulty: ChallengeDifficulty
    context: Dict[str, Any]
    expected_response_elements: List[str]
    follow_up_questions: List[str]

class RedTeamProtocol:
    """Socratic dialogue system for strategic challenge"""
    
    def __init__(self):
        self.challenge_templates = self._initialize_challenge_templates()
        self.active_challenges = []
        self.challenge_history = []
        self.user_response_patterns = {}
        
    def generate_challenge(self, 
                         target_type: str, 
                         target_content: str, 
                         context: Dict[str, Any] = None,
                         difficulty: ChallengeDifficulty = ChallengeDifficulty.MODERATE) -> RedTeamChallenge:
        """Generate a strategic challenge based on target and context"""
        
        context = context or {}
        
        # Select appropriate challenge type based on target
        challenge_type = self._select_challenge_type(target_type, context)
        
        # Generate challenge question
        challenge_question = self._generate_challenge_question(
            challenge_type, target_content, context, difficulty
        )
        
        # Create challenge object
        challenge = RedTeamChallenge(
            challenge_type=challenge_type,
            question=challenge_question,
            target=target_content,
            difficulty=difficulty,
            context=context,
            expected_response_elements=self._get_expected_elements(challenge_type),
            follow_up_questions=self._generate_follow_ups(challenge_type, target_content)
        )
        
        self.active_challenges.append(challenge)
        return challenge
    
    def evaluate_response(self, 
                         challenge: RedTeamChallenge, 
                         user_response: str) -> Dict[str, Any]:
        """Evaluate user response to red team challenge"""
        
        evaluation = {
            "response_quality": 0.0,
            "addresses_challenge": False,
            "provides_evidence": False,
            "acknowledges_limitations": False,
            "suggests_mitigations": False,
            "strengthens_position": False,
            "areas_for_improvement": [],
            "follow_up_needed": False,
            "next_challenge_type": None
        }
        
        # Analyze response content
        response_lower = user_response.lower()
        
        # Check if response addresses the challenge
        if any(keyword in response_lower for keyword in ["because", "however", "although", "consider"]):
            evaluation["addresses_challenge"] = True
            evaluation["response_quality"] += 0.2
        
        # Check for evidence provision
        if any(keyword in response_lower for keyword in ["data", "evidence", "research", "shows", "indicates"]):
            evaluation["provides_evidence"] = True
            evaluation["response_quality"] += 0.3
        
        # Check for limitation acknowledgment
        if any(keyword in response_lower for keyword in ["limitation", "risk", "challenge", "uncertain", "assume"]):
            evaluation["acknowledges_limitations"] = True
            evaluation["response_quality"] += 0.2
        
        # Check for mitigation suggestions
        if any(keyword in response_lower for keyword in ["mitigate", "address", "solution", "alternative", "backup"]):
            evaluation["suggests_mitigations"] = True
            evaluation["response_quality"] += 0.3
        
        # Determine if position is strengthened
        if evaluation["response_quality"] >= 0.6:
            evaluation["strengthens_position"] = True
        
        # Identify areas for improvement
        if not evaluation["provides_evidence"]:
            evaluation["areas_for_improvement"].append("Provide more concrete evidence")
        if not evaluation["acknowledges_limitations"]:
            evaluation["areas_for_improvement"].append("Acknowledge potential limitations")
        if not evaluation["suggests_mitigations"]:
            evaluation["areas_for_improvement"].append("Suggest risk mitigation strategies")
        
        # Determine follow-up needs
        if evaluation["response_quality"] < 0.5:
            evaluation["follow_up_needed"] = True
            evaluation["next_challenge_type"] = self._select_follow_up_challenge(challenge, evaluation)
        
        # Update user response patterns
        self._update_response_patterns(challenge, evaluation)
        
        return evaluation
    
    def generate_socratic_follow_up(self, 
                                  original_challenge: RedTeamChallenge,
                                  user_response: str,
                                  evaluation: Dict[str, Any]) -> str:
        """Generate Socratic follow-up question"""
        
        if evaluation["response_quality"] >= 0.7:
            # Strong response - probe deeper
            return self._generate_deeper_probe(original_challenge, user_response)
        elif evaluation["response_quality"] >= 0.4:
            # Moderate response - guide improvement
            return self._generate_improvement_guide(original_challenge, evaluation)
        else:
            # Weak response - provide scaffolding
            return self._generate_scaffolding_question(original_challenge)
    
    def _initialize_challenge_templates(self) -> Dict[ChallengeType, Dict]:
        """Initialize challenge templates for different types"""
        return {
            ChallengeType.ASSUMPTION_CHALLENGE: {
                "gentle": [
                    "What evidence supports the assumption that {assumption}?",
                    "How confident are you that {assumption} will hold true?",
                    "What would happen if {assumption} turned out to be incorrect?"
                ],
                "moderate": [
                    "This assumption seems to rely heavily on {assumption}. What if market conditions change?",
                    "Have you considered scenarios where {assumption} doesn't hold?",
                    "What's your backup plan if {assumption} proves false?"
                ],
                "aggressive": [
                    "This assumption about {assumption} seems optimistic. What hard data supports it?",
                    "Isn't the assumption that {assumption} a significant blind spot?",
                    "How do you justify betting the strategy on {assumption}?"
                ]
            },
            ChallengeType.EVIDENCE_SCRUTINY: {
                "gentle": [
                    "Can you walk me through how you validated this evidence?",
                    "What's the source and reliability of this information?",
                    "How recent is this data, and could it have changed?"
                ],
                "moderate": [
                    "This evidence seems limited. What contradictory data might exist?",
                    "How do you know this evidence is representative?",
                    "What biases might be present in this data collection?"
                ],
                "aggressive": [
                    "This evidence appears cherry-picked. Where's the contradictory data?",
                    "How can you base strategy on such limited evidence?",
                    "Isn't this evidence too narrow to support such broad conclusions?"
                ]
            },
            ChallengeType.ALTERNATIVE_PERSPECTIVE: {
                "gentle": [
                    "How might a competitor view this situation differently?",
                    "What would a skeptical stakeholder say about this approach?",
                    "Are there other ways to interpret this information?"
                ],
                "moderate": [
                    "Your main competitor would likely disagree with this analysis. How do you respond?",
                    "What if the key stakeholders see this completely differently?",
                    "Have you considered the perspective of those who might be negatively affected?"
                ],
                "aggressive": [
                    "This analysis ignores how your competitors will react. Isn't that naive?",
                    "You're viewing this through rose-colored glasses. What about the opposition?",
                    "This strategy seems to assume everyone will cooperate. Really?"
                ]
            },
            ChallengeType.RISK_AMPLIFICATION: {
                "gentle": [
                    "What risks haven't been fully considered here?",
                    "How might small problems become big ones?",
                    "What's the worst-case scenario for this approach?"
                ],
                "moderate": [
                    "These risks seem understated. What if they compound?",
                    "How would you handle multiple risks occurring simultaneously?",
                    "What if the risk mitigation strategies fail?"
                ],
                "aggressive": [
                    "You're seriously underestimating these risks. What happens when they cascade?",
                    "This risk assessment is dangerously optimistic. Where's the contingency?",
                    "How do you justify such risk exposure for uncertain returns?"
                ]
            },
            ChallengeType.RESOURCE_CONSTRAINT: {
                "gentle": [
                    "Do you have sufficient resources for this approach?",
                    "What if budget constraints become tighter?",
                    "How would resource limitations affect the timeline?"
                ],
                "moderate": [
                    "This seems resource-intensive. What if funding is cut by 30%?",
                    "How do you prioritize when resources are scarce?",
                    "What if key team members become unavailable?"
                ],
                "aggressive": [
                    "This strategy is unrealistic given resource constraints. How do you justify it?",
                    "You're assuming unlimited resources. That's not reality, is it?",
                    "How can you promise results without guaranteed resources?"
                ]
            }
        }
    
    def _select_challenge_type(self, target_type: str, context: Dict[str, Any]) -> ChallengeType:
        """Select appropriate challenge type based on target and context"""
        
        if target_type == "assumption":
            return ChallengeType.ASSUMPTION_CHALLENGE
        elif target_type == "evidence":
            return ChallengeType.EVIDENCE_SCRUTINY
        elif target_type == "strategic_option":
            # Vary challenge type for strategic options
            options = [
                ChallengeType.ALTERNATIVE_PERSPECTIVE,
                ChallengeType.RISK_AMPLIFICATION,
                ChallengeType.RESOURCE_CONSTRAINT
            ]
            return random.choice(options)
        else:
            return ChallengeType.ASSUMPTION_CHALLENGE
    
    def _generate_challenge_question(self, 
                                   challenge_type: ChallengeType,
                                   target_content: str,
                                   context: Dict[str, Any],
                                   difficulty: ChallengeDifficulty) -> str:
        """Generate specific challenge question"""
        
        templates = self.challenge_templates.get(challenge_type, {})
        difficulty_templates = templates.get(difficulty.value, templates.get("moderate", []))
        
        if not difficulty_templates:
            return f"Can you elaborate on {target_content}?"
        
        template = random.choice(difficulty_templates)
        
        # Replace placeholders
        if "{assumption}" in template:
            template = template.replace("{assumption}", target_content)
        
        return template
    
    def _get_expected_elements(self, challenge_type: ChallengeType) -> List[str]:
        """Get expected elements in response to challenge type"""
        
        element_map = {
            ChallengeType.ASSUMPTION_CHALLENGE: [
                "evidence_support", "confidence_level", "contingency_plan"
            ],
            ChallengeType.EVIDENCE_SCRUTINY: [
                "source_validation", "data_quality", "alternative_sources"
            ],
            ChallengeType.ALTERNATIVE_PERSPECTIVE: [
                "stakeholder_views", "competitor_analysis", "opposing_arguments"
            ],
            ChallengeType.RISK_AMPLIFICATION: [
                "risk_assessment", "mitigation_strategies", "contingency_plans"
            ],
            ChallengeType.RESOURCE_CONSTRAINT: [
                "resource_analysis", "prioritization", "efficiency_measures"
            ]
        }
        
        return element_map.get(challenge_type, ["evidence", "reasoning", "alternatives"])
    
    def _generate_follow_ups(self, challenge_type: ChallengeType, target_content: str) -> List[str]:
        """Generate follow-up questions for deeper probing"""
        
        follow_up_map = {
            ChallengeType.ASSUMPTION_CHALLENGE: [
                "What would convince you this assumption is wrong?",
                "How often do similar assumptions prove incorrect?",
                "What's your confidence interval on this assumption?"
            ],
            ChallengeType.EVIDENCE_SCRUTINY: [
                "What evidence would contradict your conclusion?",
                "How do you account for selection bias?",
                "What's the margin of error on this data?"
            ],
            ChallengeType.ALTERNATIVE_PERSPECTIVE: [
                "How would you convince a skeptic?",
                "What would change your mind?",
                "Where might you be wrong?"
            ]
        }
        
        return follow_up_map.get(challenge_type, [
            "Can you provide more detail?",
            "What evidence supports this?",
            "How certain are you?"
        ])
    
    def _select_follow_up_challenge(self, 
                                  original_challenge: RedTeamChallenge,
                                  evaluation: Dict[str, Any]) -> ChallengeType:
        """Select appropriate follow-up challenge type"""
        
        if not evaluation["provides_evidence"]:
            return ChallengeType.EVIDENCE_SCRUTINY
        elif not evaluation["acknowledges_limitations"]:
            return ChallengeType.RISK_AMPLIFICATION
        elif not evaluation["suggests_mitigations"]:
            return ChallengeType.RESOURCE_CONSTRAINT
        else:
            return ChallengeType.ALTERNATIVE_PERSPECTIVE
    
    def _generate_deeper_probe(self, challenge: RedTeamChallenge, response: str) -> str:
        """Generate deeper probing question for strong responses"""
        
        probes = [
            "That's a solid response. Now, what's the strongest counterargument to your position?",
            "Good reasoning. How would you stress-test this under extreme conditions?",
            "Interesting perspective. What would make you change your mind?",
            "Strong evidence. What's the biggest weakness in your argument?"
        ]
        
        return random.choice(probes)
    
    def _generate_improvement_guide(self, 
                                  challenge: RedTeamChallenge,
                                  evaluation: Dict[str, Any]) -> str:
        """Generate guiding question for moderate responses"""
        
        if not evaluation["provides_evidence"]:
            return "Can you provide specific evidence or data to support that position?"
        elif not evaluation["acknowledges_limitations"]:
            return "What are the potential limitations or risks with this approach?"
        elif not evaluation["suggests_mitigations"]:
            return "How would you address the concerns I've raised?"
        else:
            return "Can you elaborate on the implications of your reasoning?"
    
    def _generate_scaffolding_question(self, challenge: RedTeamChallenge) -> str:
        """Generate scaffolding question for weak responses"""
        
        scaffolds = [
            "Let me ask this differently: what's your main reason for believing this?",
            "Can you break this down step by step?",
            "What would you need to know to be more confident in this position?",
            "Let's start simpler: what's the core assumption here?"
        ]
        
        return random.choice(scaffolds)
    
    def _update_response_patterns(self, 
                                challenge: RedTeamChallenge,
                                evaluation: Dict[str, Any]):
        """Update user response patterns for adaptive challenging"""
        
        pattern_key = challenge.challenge_type.value
        
        if pattern_key not in self.user_response_patterns:
            self.user_response_patterns[pattern_key] = {
                "total_challenges": 0,
                "avg_quality": 0.0,
                "strengths": [],
                "weaknesses": []
            }
        
        pattern = self.user_response_patterns[pattern_key]
        pattern["total_challenges"] += 1
        
        # Update average quality
        current_avg = pattern["avg_quality"]
        new_quality = evaluation["response_quality"]
        pattern["avg_quality"] = (current_avg * (pattern["total_challenges"] - 1) + new_quality) / pattern["total_challenges"]
        
        # Track strengths and weaknesses
        if evaluation["provides_evidence"]:
            pattern["strengths"].append("evidence_provision")
        if evaluation["acknowledges_limitations"]:
            pattern["strengths"].append("limitation_awareness")
        if evaluation["suggests_mitigations"]:
            pattern["strengths"].append("mitigation_thinking")
        
        for weakness in evaluation["areas_for_improvement"]:
            pattern["weaknesses"].append(weakness)
    
    def get_adaptive_difficulty(self, challenge_type: ChallengeType) -> ChallengeDifficulty:
        """Get adaptive difficulty based on user performance"""
        
        pattern_key = challenge_type.value
        
        if pattern_key not in self.user_response_patterns:
            return ChallengeDifficulty.MODERATE
        
        avg_quality = self.user_response_patterns[pattern_key]["avg_quality"]
        
        if avg_quality >= 0.8:
            return ChallengeDifficulty.AGGRESSIVE
        elif avg_quality >= 0.6:
            return ChallengeDifficulty.MODERATE
        else:
            return ChallengeDifficulty.GENTLE
    
    def generate_challenge_summary(self) -> Dict[str, Any]:
        """Generate summary of red team session"""
        
        return {
            "total_challenges": len(self.challenge_history),
            "challenge_types": list(set(c.challenge_type.value for c in self.challenge_history)),
            "avg_response_quality": sum(self.user_response_patterns.get(ct, {}).get("avg_quality", 0) 
                                      for ct in self.user_response_patterns) / len(self.user_response_patterns) if self.user_response_patterns else 0,
            "user_strengths": self._identify_user_strengths(),
            "improvement_areas": self._identify_improvement_areas(),
            "strategic_robustness": self._assess_strategic_robustness()
        }
    
    def _identify_user_strengths(self) -> List[str]:
        """Identify user's strategic thinking strengths"""
        
        all_strengths = []
        for pattern in self.user_response_patterns.values():
            all_strengths.extend(pattern.get("strengths", []))
        
        # Count frequency and return most common
        strength_counts = {}
        for strength in all_strengths:
            strength_counts[strength] = strength_counts.get(strength, 0) + 1
        
        return sorted(strength_counts.keys(), key=lambda x: strength_counts[x], reverse=True)[:3]
    
    def _identify_improvement_areas(self) -> List[str]:
        """Identify areas for improvement"""
        
        all_weaknesses = []
        for pattern in self.user_response_patterns.values():
            all_weaknesses.extend(pattern.get("weaknesses", []))
        
        # Count frequency and return most common
        weakness_counts = {}
        for weakness in all_weaknesses:
            weakness_counts[weakness] = weakness_counts.get(weakness, 0) + 1
        
        return sorted(weakness_counts.keys(), key=lambda x: weakness_counts[x], reverse=True)[:3]
    
    def _assess_strategic_robustness(self) -> str:
        """Assess overall strategic robustness"""
        
        if not self.user_response_patterns:
            return "insufficient_data"
        
        avg_quality = sum(p["avg_quality"] for p in self.user_response_patterns.values()) / len(self.user_response_patterns)
        
        if avg_quality >= 0.8:
            return "highly_robust"
        elif avg_quality >= 0.6:
            return "moderately_robust"
        elif avg_quality >= 0.4:
            return "needs_strengthening"
        else:
            return "requires_significant_work"