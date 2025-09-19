import re
from typing import Dict, List, Any, Optional
from datetime import datetime
import json

class CognitiveAnalyzer:
    """Analyzes user messages for cognitive patterns and insights"""
    
    def __init__(self):
        # Thinking pattern keywords
        self.thinking_patterns = {
            "analytical": ["analyze", "data", "metrics", "numbers", "statistics", "evidence", "research", "study", "facts", "proof"],
            "creative": ["innovative", "creative", "brainstorm", "imagine", "what if", "outside the box", "novel", "unique", "original"],
            "systematic": ["process", "step by step", "methodology", "framework", "structure", "organized", "systematic", "logical"],
            "intuitive": ["feel", "sense", "gut", "instinct", "seems like", "appears", "hunch", "intuition", "feeling"],
            "risk_aware": ["risk", "danger", "threat", "concern", "worry", "problem", "issue", "challenge", "obstacle"],
            "opportunity_focused": ["opportunity", "potential", "growth", "advantage", "benefit", "upside", "possibility", "chance"]
        }
        
        # Cognitive bias indicators
        self.cognitive_biases = {
            "anchoring": ["first", "initial", "originally", "started with", "based on", "beginning with"],
            "confirmation_bias": ["proves", "confirms", "validates", "supports my view", "as expected", "obviously"],
            "availability_heuristic": ["recently", "just heard", "saw on news", "everyone knows", "common knowledge"],
            "overconfidence": ["definitely", "certainly", "obviously", "clearly", "without doubt", "absolutely"]
        }
        
        # Communication style indicators
        self.communication_styles = {
            "data_driven": ["statistics", "data shows", "research indicates", "studies prove", "numbers", "metrics"],
            "narrative": ["story", "example", "case", "situation", "scenario", "experience", "happened"],
            "visual": ["picture", "diagram", "chart", "visualize", "see", "show", "display"],
            "collaborative": ["we", "us", "together", "team", "group", "collectively", "jointly"]
        }

    def analyze_message(self, message_content: str, user_id: str) -> Dict[str, Any]:
        """Analyze a user message for cognitive patterns"""
        content_lower = message_content.lower()
        
        analysis = {
            "thinking_patterns": self._detect_thinking_patterns(content_lower),
            "biases_detected": self._detect_biases(content_lower),
            "communication_style": self._detect_communication_style(content_lower),
            "complexity_level": self._assess_complexity(message_content),
            "emotional_tone": self._detect_emotional_tone(content_lower),
            "decision_indicators": self._detect_decision_indicators(content_lower),
            "strategic_frameworks_mentioned": self._detect_frameworks(content_lower),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return analysis

    def _detect_thinking_patterns(self, content: str) -> Dict[str, float]:
        """Detect thinking patterns with confidence scores"""
        patterns = {}
        
        for pattern_name, keywords in self.thinking_patterns.items():
            matches = sum(1 for keyword in keywords if keyword in content)
            if matches > 0:
                # Normalize score between 0 and 1, with diminishing returns
                patterns[pattern_name] = min(matches / max(len(keywords) * 0.3, 1), 1.0)
        
        return patterns

    def _detect_biases(self, content: str) -> List[str]:
        """Detect potential cognitive biases"""
        detected_biases = []
        
        for bias_name, indicators in self.cognitive_biases.items():
            if any(indicator in content for indicator in indicators):
                detected_biases.append(bias_name)
        
        return detected_biases

    def _detect_communication_style(self, content: str) -> str:
        """Detect primary communication style"""
        style_scores = {}
        
        for style_name, indicators in self.communication_styles.items():
            score = sum(1 for indicator in indicators if indicator in content)
            if score > 0:
                style_scores[style_name] = score
        
        if style_scores:
            return max(style_scores, key=style_scores.get)
        return "balanced"

    def _assess_complexity(self, content: str) -> str:
        """Assess the complexity level of the message"""
        word_count = len(content.split())
        sentence_count = len(re.split(r'[.!?]+', content))
        avg_sentence_length = word_count / max(sentence_count, 1)
        
        if avg_sentence_length > 20 and word_count > 100:
            return "high"
        elif avg_sentence_length > 10 and word_count > 50:
            return "medium"
        else:
            return "low"

    def _detect_emotional_tone(self, content: str) -> str:
        """Detect emotional tone of the message"""
        positive_words = ["excited", "confident", "optimistic", "great", "excellent", "love", "amazing", "fantastic"]
        negative_words = ["worried", "concerned", "frustrated", "difficult", "problem", "issue", "stressed", "anxious"]
        neutral_words = ["think", "consider", "analyze", "review", "examine", "evaluate"]
        
        positive_score = sum(1 for word in positive_words if word in content)
        negative_score = sum(1 for word in negative_words if word in content)
        neutral_score = sum(1 for word in neutral_words if word in content)
        
        if positive_score > negative_score and positive_score > neutral_score:
            return "positive"
        elif negative_score > positive_score and negative_score > neutral_score:
            return "negative"
        else:
            return "neutral"

    def _detect_decision_indicators(self, content: str) -> Dict[str, bool]:
        """Detect decision-making indicators"""
        return {
            "seeking_advice": any(phrase in content for phrase in ["what should", "how do", "advice", "recommend", "suggest"]),
            "comparing_options": any(phrase in content for phrase in ["versus", "vs", "compare", "option", "alternative"]),
            "expressing_uncertainty": any(phrase in content for phrase in ["not sure", "uncertain", "don't know", "confused", "unclear"]),
            "ready_to_decide": any(phrase in content for phrase in ["ready to", "going to", "will", "decided", "plan to"])
        }

    def _detect_frameworks(self, content: str) -> List[str]:
        """Detect mentions of strategic frameworks"""
        frameworks = [
            "swot", "porter", "five forces", "blue ocean", "lean canvas",
            "business model canvas", "okr", "balanced scorecard", "pestle",
            "ansoff", "bcg matrix", "value chain", "pest analysis"
        ]
        
        detected = []
        for framework in frameworks:
            if framework in content:
                detected.append(framework)
        
        return detected


class MentorshipEngine:
    """Generates mentorship responses based on cognitive analysis"""
    
    def __init__(self):
        self.socratic_question_templates = {
            "challenge_assumption": [
                "What assumptions are you making about {topic}?",
                "How do you know that {assumption} is true?",
                "What evidence supports your belief that {belief}?",
                "What if the opposite were true?"
            ],
            "explore_alternatives": [
                "What other options have you considered?",
                "How might someone with a different perspective view this?",
                "What would happen if you did the opposite?",
                "What creative solutions haven't you explored yet?"
            ],
            "deepen_analysis": [
                "What factors are you not considering?",
                "How does this connect to your broader strategy?",
                "What are the second-order effects of this decision?",
                "What would success look like in 5 years?"
            ],
            "encourage_reflection": [
                "How does this align with your values?",
                "What have you learned from similar situations?",
                "How will you know if you're successful?",
                "What would you tell someone else in this situation?"
            ]
        }

    def generate_mentorship_response(self, 
                                   user_message: str, 
                                   cognitive_analysis: Dict[str, Any],
                                   user_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate mentorship guidance based on cognitive analysis"""
        
        response_strategy = self._determine_response_strategy(cognitive_analysis, user_profile)
        
        guidance = {
            "response_type": response_strategy,
            "guidance_type": self._get_guidance_type(cognitive_analysis),
            "learning_objective": self._get_learning_objective(cognitive_analysis),
            "follow_up_needed": True,
            "personalization_notes": self._get_personalization_notes(cognitive_analysis, user_profile),
            "suggested_questions": self._get_suggested_questions(response_strategy, cognitive_analysis),
            "framework_suggestions": self._get_framework_suggestions(cognitive_analysis)
        }
        
        return guidance

    def _determine_response_strategy(self, 
                                   cognitive_analysis: Dict[str, Any], 
                                   user_profile: Optional[Dict[str, Any]]) -> str:
        """Determine the best mentorship strategy"""
        
        if cognitive_analysis.get("biases_detected"):
            return "bias_awareness"
        elif cognitive_analysis.get("decision_indicators", {}).get("seeking_advice"):
            return "socratic_questioning"
        elif not cognitive_analysis.get("strategic_frameworks_mentioned"):
            return "framework_suggestion"
        elif cognitive_analysis.get("thinking_patterns", {}).get("analytical", 0) > 0.7:
            return "perspective_expansion"
        elif cognitive_analysis.get("decision_indicators", {}).get("expressing_uncertainty"):
            return "confidence_building"
        else:
            return "supportive_guidance"

    def _get_guidance_type(self, analysis: Dict[str, Any]) -> str:
        """Determine specific guidance type"""
        patterns = analysis.get("thinking_patterns", {})
        
        if analysis.get("biases_detected"):
            return "challenge_assumptions"
        elif "analytical" in patterns and patterns["analytical"] > 0.6:
            return "expand_creativity"
        elif "creative" in patterns and patterns["creative"] > 0.6:
            return "ground_in_reality"
        elif "risk_aware" in patterns and patterns["risk_aware"] > 0.5:
            return "explore_opportunities"
        else:
            return "balanced_exploration"

    def _get_learning_objective(self, analysis: Dict[str, Any]) -> str:
        """Determine learning objective"""
        if analysis.get("biases_detected"):
            return "recognize_biases"
        elif analysis.get("decision_indicators", {}).get("expressing_uncertainty"):
            return "build_confidence"
        elif not analysis.get("strategic_frameworks_mentioned"):
            return "learn_frameworks"
        else:
            return "develop_strategic_thinking"

    def _get_personalization_notes(self, analysis: Dict[str, Any], profile: Optional[Dict[str, Any]]) -> List[str]:
        """Generate personalization notes for the AI"""
        notes = []
        
        # Based on communication style
        style = analysis.get("communication_style", "balanced")
        if style == "data_driven":
            notes.append("User prefers data-backed responses and evidence")
        elif style == "narrative":
            notes.append("User responds well to stories and examples")
        elif style == "visual":
            notes.append("User thinks visually - use diagrams and visual metaphors")
        elif style == "collaborative":
            notes.append("User values team input and collaborative approaches")
        
        # Based on thinking patterns
        patterns = analysis.get("thinking_patterns", {})
        if "analytical" in patterns and patterns["analytical"] > 0.6:
            notes.append("Challenge with creative alternatives and intuitive approaches")
        if "creative" in patterns and patterns["creative"] > 0.6:
            notes.append("Ground creative ideas in practical implementation")
        if "risk_aware" in patterns and patterns["risk_aware"] > 0.5:
            notes.append("Balance risk awareness with opportunity exploration")
        
        # Based on emotional tone
        tone = analysis.get("emotional_tone", "neutral")
        if tone == "negative":
            notes.append("Provide encouragement and positive reframing")
        elif tone == "positive":
            notes.append("Channel enthusiasm into structured planning")
        
        return notes

    def _get_suggested_questions(self, strategy: str, analysis: Dict[str, Any]) -> List[str]:
        """Get suggested Socratic questions based on strategy"""
        if strategy == "bias_awareness":
            return [
                "What evidence might challenge your current view?",
                "How might someone who disagrees with you see this situation?",
                "What assumptions are you taking for granted?"
            ]
        elif strategy == "socratic_questioning":
            return [
                "What's the real problem you're trying to solve?",
                "What would success look like?",
                "What are you not considering?"
            ]
        elif strategy == "framework_suggestion":
            return [
                "What strategic framework might help structure your thinking here?",
                "How would you analyze this systematically?",
                "What factors should you evaluate?"
            ]
        else:
            return [
                "What's your intuition telling you?",
                "How does this connect to your bigger picture?",
                "What would you advise someone else in this situation?"
            ]

    def _get_framework_suggestions(self, analysis: Dict[str, Any]) -> List[str]:
        """Suggest relevant strategic frameworks"""
        suggestions = []
        
        decision_indicators = analysis.get("decision_indicators", {})
        patterns = analysis.get("thinking_patterns", {})
        
        if decision_indicators.get("comparing_options"):
            suggestions.append("Decision Matrix")
            suggestions.append("Pros and Cons Analysis")
        
        if "risk_aware" in patterns:
            suggestions.append("Risk Assessment Matrix")
            suggestions.append("SWOT Analysis")
        
        if "opportunity_focused" in patterns:
            suggestions.append("Blue Ocean Strategy")
            suggestions.append("Opportunity Assessment")
        
        if not suggestions:  # Default suggestions
            suggestions.extend(["SWOT Analysis", "Porter's Five Forces", "Decision Matrix"])
        
        return suggestions[:3]  # Limit to top 3 suggestions