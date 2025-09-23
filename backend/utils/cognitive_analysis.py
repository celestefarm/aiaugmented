
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from enum import Enum
import json
import math

class EvidenceQuality(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    SPECULATIVE = "speculative"

class EvidenceType(Enum):
    QUANTITATIVE = "quantitative"
    QUALITATIVE = "qualitative"
    ANECDOTAL = "anecdotal"
    EXPERT_OPINION = "expert_opinion"
    RESEARCH_BASED = "research_based"
    EXPERIENTIAL = "experiential"
    HYPOTHETICAL = "hypothetical"

class StrategicContext(Enum):
    MARKET_ANALYSIS = "market_analysis"
    COMPETITIVE_INTELLIGENCE = "competitive_intelligence"
    INTERNAL_ASSESSMENT = "internal_assessment"
    STAKEHOLDER_FEEDBACK = "stakeholder_feedback"
    FINANCIAL_DATA = "financial_data"
    OPERATIONAL_METRICS = "operational_metrics"
    CUSTOMER_INSIGHTS = "customer_insights"
    REGULATORY_ENVIRONMENT = "regulatory_environment"

class CognitiveAnalyzer:
    """Enhanced analyzer for cognitive patterns and evidence classification"""
    
    def __init__(self):
        # Thinking pattern keywords
        self.thinking_patterns = {
            "analytical": ["analyze", "data", "metrics", "numbers", "statistics", "evidence", "research", "study", "facts", "proof"],
            "creative": ["innovative", "creative", "brainstorm", "imagine", "what if", "outside the box", "novel", "unique", "original"],
            "systematic": ["process", "step by step", "methodology", "framework", "structure", "organized", "systematic", "logical"],
            "intuitive": ["feel", "sense", "gut", "instinct", "seems like", "appears", "hunch", "intuition", "feeling"],
            "risk_aware": ["risk", "danger", "threat", "concern", "worry", "problem", "issue", "challenge", "obstacle"],
            "opportunity_focused": ["opportunity", "potential", "growth", "advantage", "benefit", "upside", "possibility", "chance"],
            "strategic": ["strategic", "long-term", "vision", "mission", "goals", "objectives", "planning", "roadmap"],
            "tactical": ["immediate", "short-term", "quick", "now", "urgent", "today", "this week", "tactical"]
        }
        
        # Cognitive bias indicators
        self.cognitive_biases = {
            "anchoring": ["first", "initial", "originally", "started with", "based on", "beginning with"],
            "confirmation_bias": ["proves", "confirms", "validates", "supports my view", "as expected", "obviously"],
            "availability_heuristic": ["recently", "just heard", "saw on news", "everyone knows", "common knowledge"],
            "overconfidence": ["definitely", "certainly", "obviously", "clearly", "without doubt", "absolutely"],
            "sunk_cost": ["already invested", "can't waste", "too far in", "committed", "spent too much"],
            "groupthink": ["everyone agrees", "consensus", "unanimous", "we all think", "team believes"]
        }
        
        # Communication style indicators
        self.communication_styles = {
            "data_driven": ["statistics", "data shows", "research indicates", "studies prove", "numbers", "metrics"],
            "narrative": ["story", "example", "case", "situation", "scenario", "experience", "happened"],
            "visual": ["picture", "diagram", "chart", "visualize", "see", "show", "display"],
            "collaborative": ["we", "us", "together", "team", "group", "collectively", "jointly"]
        }
        
        # Evidence quality indicators
        self.evidence_quality_indicators = {
            "high_quality": {
                "quantitative": ["data shows", "statistics indicate", "research proves", "study found", "measured", "quantified"],
                "authoritative": ["expert", "professor", "researcher", "study", "peer-reviewed", "published"],
                "recent": ["recent", "latest", "current", "up-to-date", "new", "fresh"],
                "verified": ["verified", "confirmed", "validated", "cross-checked", "corroborated"]
            },
            "medium_quality": {
                "observational": ["observed", "noticed", "seen", "witnessed", "experienced"],
                "industry": ["industry", "sector", "market", "competitors", "peers"],
                "logical": ["logical", "reasonable", "makes sense", "follows that", "therefore"]
            },
            "low_quality": {
                "anecdotal": ["heard", "someone said", "rumor", "gossip", "word of mouth"],
                "outdated": ["old", "previous", "past", "historical", "years ago"],
                "unverified": ["might", "could", "possibly", "perhaps", "maybe"]
            },
            "speculative": {
                "hypothetical": ["what if", "suppose", "imagine", "hypothetically", "theoretically"],
                "opinion": ["think", "believe", "feel", "opinion", "view", "perspective"],
                "assumption": ["assume", "presume", "guess", "estimate", "approximate"]
            }
        }
        
        # Strategic context indicators
        self.strategic_context_indicators = {
            "market_analysis": ["market", "industry", "sector", "competition", "demand", "supply"],
            "competitive_intelligence": ["competitor", "rival", "competitive", "market share", "positioning"],
            "internal_assessment": ["internal", "organization", "company", "team", "resources", "capabilities"],
            "stakeholder_feedback": ["stakeholder", "customer", "client", "user", "feedback", "input"],
            "financial_data": ["revenue", "profit", "cost", "budget", "financial", "ROI", "investment"],
            "operational_metrics": ["operations", "efficiency", "productivity", "performance", "metrics"],
            "customer_insights": ["customer", "user", "client", "satisfaction", "needs", "preferences"],
            "regulatory_environment": ["regulation", "compliance", "legal", "policy", "government", "law"]
        }

    def analyze_message(self, message_content: str, user_id: str) -> Dict[str, Any]:
        """Enhanced analysis including evidence classification"""
        content_lower = message_content.lower()
        
        analysis = {
            "thinking_patterns": self._detect_thinking_patterns(content_lower),
            "biases_detected": self._detect_biases(content_lower),
            "communication_style": self._detect_communication_style(content_lower),
            "complexity_level": self._assess_complexity(message_content),
            "emotional_tone": self._detect_emotional_tone(content_lower),
            "decision_indicators": self._detect_decision_indicators(content_lower),
            "strategic_frameworks_mentioned": self._detect_frameworks(content_lower),
            "evidence_classification": self._classify_evidence(message_content),
            "strategic_context": self._identify_strategic_context(content_lower),
            "confidence_indicators": self._assess_confidence_level(content_lower),
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
            "ready_to_decide": any(phrase in content for phrase in ["ready to", "going to", "will", "decided", "plan to"]),
            "seeking_validation": any(phrase in content for phrase in ["right", "correct", "good idea", "makes sense", "agree"]),
            "exploring_implications": any(phrase in content for phrase in ["what if", "consequences", "impact", "result", "outcome"])
        }

    def _detect_frameworks(self, content: str) -> List[str]:
        """Detect mentions of strategic frameworks"""
        frameworks = [
            "swot", "porter", "five forces", "blue ocean", "lean canvas",
            "business model canvas", "okr", "balanced scorecard", "pestle",
            "ansoff", "bcg matrix", "value chain", "pest analysis", "mckinsey",
            "design thinking", "agile", "lean startup", "jobs to be done"
        ]
        
        detected = []
        for framework in frameworks:
            if framework in content:
                detected.append(framework)
        
        return detected

    def _classify_evidence(self, content: str) -> Dict[str, Any]:
        """Classify evidence quality and type in the message"""
        content_lower = content.lower()
        
        # Determine evidence quality
        quality_scores = {
            EvidenceQuality.HIGH: 0,
            EvidenceQuality.MEDIUM: 0,
            EvidenceQuality.LOW: 0,
            EvidenceQuality.SPECULATIVE: 0
        }
        
        # Score based on quality indicators
        for quality_level, categories in self.evidence_quality_indicators.items():
            for category, indicators in categories.items():
                matches = sum(1 for indicator in indicators if indicator in content_lower)
                if quality_level == "high_quality":
                    quality_scores[EvidenceQuality.HIGH] += matches * 2
                elif quality_level == "medium_quality":
                    quality_scores[EvidenceQuality.MEDIUM] += matches
                elif quality_level == "low_quality":
                    quality_scores[EvidenceQuality.LOW] += matches
                elif quality_level == "speculative":
                    quality_scores[EvidenceQuality.SPECULATIVE] += matches
        
        # Determine primary evidence quality
        primary_quality = max(quality_scores, key=quality_scores.get) if any(quality_scores.values()) else EvidenceQuality.MEDIUM
        
        # Determine evidence types present
        evidence_types = self._identify_evidence_types(content_lower)
        
        # Calculate confidence score
        confidence_score = self._calculate_evidence_confidence(quality_scores, evidence_types)
        
        # Extract specific evidence pieces
        evidence_pieces = self._extract_evidence_pieces(content)
        
        return {
            "primary_quality": primary_quality.value,
            "quality_scores": {k.value: v for k, v in quality_scores.items()},
            "evidence_types": [t.value for t in evidence_types],
            "confidence_score": confidence_score,
            "evidence_pieces": evidence_pieces,
            "source_reliability": self._assess_source_reliability(content_lower),
            "recency_score": self._assess_recency(content_lower),
            "verification_level": self._assess_verification_level(content_lower)
        }

    def _identify_evidence_types(self, content: str) -> List[EvidenceType]:
        """Identify types of evidence present"""
        types = []
        
        # Quantitative evidence
        if any(indicator in content for indicator in ["data", "statistics", "numbers", "metrics", "percentage", "%"]):
            types.append(EvidenceType.QUANTITATIVE)
        
        # Qualitative evidence
        if any(indicator in content for indicator in ["feedback", "opinion", "perspective", "view", "sentiment"]):
            types.append(EvidenceType.QUALITATIVE)
        
        # Anecdotal evidence
        if any(indicator in content for indicator in ["story", "example", "case", "experience", "happened"]):
            types.append(EvidenceType.ANECDOTAL)
        
        # Expert opinion
        if any(indicator in content for indicator in ["expert", "specialist", "authority", "professor", "researcher"]):
            types.append(EvidenceType.EXPERT_OPINION)
        
        # Research-based
        if any(indicator in content for indicator in ["study", "research", "survey", "analysis", "investigation"]):
            types.append(EvidenceType.RESEARCH_BASED)
        
        # Experiential
        if any(indicator in content for indicator in ["experienced", "tried", "tested", "implemented", "practiced"]):
            types.append(EvidenceType.EXPERIENTIAL)
        
        # Hypothetical
        if any(indicator in content for indicator in ["what if", "suppose", "imagine", "hypothetically", "theoretically"]):
            types.append(EvidenceType.HYPOTHETICAL)
        
        return types if types else [EvidenceType.QUALITATIVE]

    def _calculate_evidence_confidence(self, quality_scores: Dict[EvidenceQuality, int], evidence_types: List[EvidenceType]) -> float:
        """Calculate overall confidence score for evidence"""
        # Base score from quality
        quality_weights = {
            EvidenceQuality.HIGH: 1.0,
            EvidenceQuality.MEDIUM: 0.7,
            EvidenceQuality.LOW: 0.4,
            EvidenceQuality.SPECULATIVE: 0.2
        }
        
        total_quality_score = sum(quality_weights[quality] * score for quality, score in quality_scores.items())
        max_possible_quality = sum(quality_scores.values()) * 1.0 if sum(quality_scores.values()) > 0 else 1.0
        
        quality_confidence = min(total_quality_score / max_possible_quality, 1.0)
        
        # Bonus for diverse evidence types
        type_diversity_bonus = min(len(evidence_types) * 0.1, 0.3)
        
        # Penalty for purely hypothetical evidence
        hypothetical_penalty = 0.3 if EvidenceType.HYPOTHETICAL in evidence_types and len(evidence_types) == 1 else 0
        
        final_confidence = max(0.0, min(1.0, quality_confidence + type_diversity_bonus - hypothetical_penalty))
        
        return round(final_confidence, 2)

    def _extract_evidence_pieces(self, content: str) -> List[Dict[str, Any]]:
        """Extract specific pieces of evidence from content"""
        evidence_pieces = []
        sentences = re.split(r'[.!?]+', content)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 10:  # Skip very short sentences
                continue
                
            sentence_lower = sentence.lower()
            
            # Check if sentence contains evidence indicators
            has_evidence = any(
                indicator in sentence_lower 
                for category in self.evidence_quality_indicators.values()
                for indicators in category.values()
                for indicator in indicators
            )
            
            if has_evidence:
                evidence_type = self._identify_evidence_types(sentence_lower)
                quality = self._classify_sentence_quality(sentence_lower)
                
                evidence_pieces.append({
                    "content": sentence,
                    "type": evidence_type[0].value if evidence_type else "qualitative",
                    "quality": quality.value,
                    "confidence": self._calculate_sentence_confidence(sentence_lower)
                })
        
        return evidence_pieces[:5]  # Limit to top 5 pieces

    def _classify_sentence_quality(self, sentence: str) -> EvidenceQuality:
        """Classify quality of a single sentence"""
        high_indicators = sum(1 for category in self.evidence_quality_indicators["high_quality"].values() 
                             for indicator in category if indicator in sentence)
        medium_indicators = sum(1 for category in self.evidence_quality_indicators["medium_quality"].values() 
                               for indicator in category if indicator in sentence)
        low_indicators = sum(1 for category in self.evidence_quality_indicators["low_quality"].values() 
                            for indicator in category if indicator in sentence)
        speculative_indicators = sum(1 for category in self.evidence_quality_indicators["speculative"].values() 
                                   for indicator in category if indicator in sentence)
        
        if high_indicators > 0:
            return EvidenceQuality.HIGH
        elif medium_indicators > 0:
            return EvidenceQuality.MEDIUM
        elif low_indicators > 0:
            return EvidenceQuality.LOW
        else:
            return EvidenceQuality.SPECULATIVE

    def _calculate_sentence_confidence(self, sentence: str) -> float:
        """Calculate confidence score for a single sentence"""
        # Simple heuristic based on evidence quality indicators
        high_count = sum(1 for category in self.evidence_quality_indicators["high_quality"].values() 
                        for indicator in category if indicator in sentence)
        medium_count = sum(1 for category in self.evidence_quality_indicators["medium_quality"].values() 
                          for indicator in category if indicator in sentence)
        low_count = sum(1 for category in self.evidence_quality_indicators["low_quality"].values() 
                       for indicator in category if indicator in sentence)
        speculative_count = sum(1 for category in self.evidence_quality_indicators["speculative"].values() 
                               for indicator in category if indicator in sentence)
        
        score = (high_count * 1.0 + medium_count * 0.7 + low_count * 0.4 + speculative_count * 0.2)
        return min(score / 2.0, 1.0)  # Normalize to 0-1 range

    def _identify_strategic_context(self, content: str) -> List[str]:
        """Identify strategic context areas mentioned"""
        contexts = []
        
        for context_name, indicators in self.strategic_context_indicators.items():
            if any(indicator in content for indicator in indicators):
                contexts.append(context_name)
        
        return contexts

    def _assess_confidence_level(self, content: str) -> Dict[str, Any]:
        """Assess user's confidence level in their statements"""
        high_confidence = ["certain", "sure", "confident", "definitely", "absolutely", "clearly"]
        medium_confidence = ["likely", "probably", "seems", "appears", "believe"]
        low_confidence = ["uncertain", "unsure", "maybe", "perhaps", "might", "could"]
        
        high_score = sum(1 for word in high_confidence if word in content)
        medium_score = sum(1 for word in medium_confidence if word in content)
        low_score = sum(1 for word in low_confidence if word in content)
        
        total_indicators = high_score + medium_score + low_score
        
        if total_indicators == 0:
            confidence_level = "neutral"
            confidence_score = 0.5
        elif high_score > medium_score and high_score > low_score:
            confidence_level = "high"
            confidence_score = 0.8
        elif low_score > medium_score and low_score > high_score:
            confidence_level = "low"
            confidence_score = 0.2
        else:
            confidence_level = "medium"
            confidence_score = 0.5
        
        return {
            "level": confidence_level,
            "score": confidence_score,
            "indicators": {
                "high_confidence": high_score,
                "medium_confidence": medium_score,
                "low_confidence": low_score
            }
        }

    def _assess_source_reliability(self, content: str) -> float:
        """Assess reliability of sources mentioned"""
        reliable_sources = ["research", "study", "expert", "data", "statistics", "published", "peer-reviewed"]
        unreliable_sources = ["rumor", "gossip", "heard", "someone said", "unverified"]
        
        reliable_count = sum(1 for source in reliable_sources if source in content)
        unreliable_count = sum(1 for source in unreliable_sources if source in content)
        
        if reliable_count + unreliable_count == 0:
            return 0.5  # Neutral when no source indicators
        
        reliability_score = reliable_count / (reliable_count + unreliable_count)
        return round(reliability_score, 2)

    def _assess_recency(self, content: str) -> float:
        """Assess how recent the evidence appears to be"""
        recent_indicators = ["recent", "latest", "current", "new", "today", "this week", "this month"]
        old_indicators = ["old", "previous", "past", "historical", "years ago", "decades ago"]
        
        recent_count = sum(1 for indicator in recent_indicators if indicator in content)
        old_count = sum(1 for indicator in old_indicators if indicator in content)
        
        if recent_count + old_count == 0:
            return 0.5  # Neutral when no recency indicators
        
        recency_score = recent_count / (recent_count + old_count)
        return round(recency_score, 2)

    def _assess_verification_level(self, content: str) -> float:
        """Assess level of verification mentioned"""
        verified_indicators = ["verified", "confirmed", "validated", "cross-checked", "corroborated", "proven"]
        unverified_indicators = ["unverified", "unconfirmed", "alleged", "claimed", "supposed"]
        
        verified_count = sum(1 for indicator in verified_indicators if indicator in content)
        unverified_count = sum(1 for indicator in unverified_indicators if indicator in content)
        
        if verified_count + unverified_count == 0:
            return 0.5  # Neutral when no verification indicators
        
        verification_score = verified_count / (verified_count + unverified_count)
        return round(verification_score, 2)


class MentorshipEngine:
    """Enhanced mentorship engine with evidence-based guidance"""
    
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
            ],
            "evidence_strengthening": [
                "What additional evidence would strengthen your position?",
                "How could you verify this information?",
                "What sources would be most credible for this claim?",
                "What data would convince a skeptic?"
            ]
        }

    def generate_mentorship_response(self, 
                                   user_message: str, 
                                   cognitive_analysis: Dict[str, Any],
                                   user_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate enhanced mentorship guidance based on cognitive analysis"""
        
        response_strategy = self._determine_response_strategy(cognitive_analysis, user_profile)
        
        guidance = {
            "response_type": response_strategy,
            "guidance_type": self._get_guidance_type(cognitive_analysis),
            "learning_objective": self._get_learning_objective(cognitive_analysis),
            "follow_up_needed": True,
            "personalization_notes": self._get_personalization_notes(cognitive_analysis, user_profile),
            "suggested_questions": self._get_suggested_questions(response_strategy, cognitive_analysis),
            "framework_suggestions": self._get_framework_suggestions(cognitive_analysis),
            "evidence_guidance": self._get_evidence_guidance(cognitive_analysis),
            "strategic_focus": self._get_strategic_focus(cognitive_analysis)
        }
        
        return guidance

    def _determine_response_strategy(self, 
                                   cognitive_analysis: Dict[str, Any], 
                                   user_profile: Optional[Dict[str, Any]]) -> str:
        """Determine the best mentorship strategy"""
        
        evidence_classification = cognitive_analysis.get("evidence_classification", {})
        evidence_quality = evidence_classification.get("primary_quality", "medium")
        
        if cognitive_analysis.get("biases_detected"):
            return "bias_awareness"
        elif evidence_quality in ["low", "speculative"]:
            return "evidence_strengthening"
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
        evidence_classification = analysis.get("evidence_classification", {})
        
        if analysis.get("biases_detected"):
            return "challenge_assumptions"
        elif evidence_classification.get("primary_quality") in ["low", "speculative"]:
            return "strengthen_evidence"
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
        evidence_classification = analysis.get("evidence_classification", {})
        
        if analysis.get("biases_detected"):
            return "recognize_biases"
        elif evidence_classification.get("confidence_score", 0.5) < 0.4:
            return "improve_evidence_quality"
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
        
        # Based on evidence quality
        evidence_classification = analysis.get("evidence_classification", {})
        if evidence_classification.get("primary_quality") in ["low", "speculative"]:
            notes.append("Guide user to strengthen evidence base and validate assumptions")
        elif evidence_classification.get("confidence_score", 0.5) > 0.8:
            notes.append("Challenge high-confidence positions to explore blind spots")
        
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
        elif strategy == "evidence_strengthening":
            return [
                "What additional evidence would strengthen your position?",
                "How could you verify this information?",
                "What would convince a skeptic of your position?"
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
        strategic_context = analysis.get("strategic_context", [])
        
        if decision_indicators.get("comparing_options"):
            suggestions.append("Decision Matrix")
            suggestions.append("Pros and Cons Analysis")
        
        if "risk_aware" in patterns:
            suggestions.append("Risk Assessment Matrix")
            suggestions.append("SWOT Analysis")
        
        if "opportunity_focused" in patterns:
            suggestions.append("Blue Ocean Strategy")
            suggestions.append("Opportunity Assessment")
        
        if "market_analysis" in strategic_context:
            suggestions.append("Porter's Five Forces")
            suggestions.append("Market Segmentation Analysis")
        
        if "competitive_intelligence" in strategic_context:
            suggestions.append("Competitive Positioning Map")
            suggestions.append("BCG Matrix")
        
        if not suggestions:  # Default suggestions
            suggestions.extend(["SWOT Analysis", "Porter's Five Forces", "Decision Matrix"])
        
        return suggestions[:3]  # Limit to top 3 suggestions

    def _get_evidence_guidance(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate evidence-specific guidance"""
        evidence_classification = analysis.get("evidence_classification", {})
        
        guidance = {
            "current_quality": evidence_classification.get("primary_quality", "medium"),
            "confidence_score": evidence_classification.get("confidence_score", 0.5),
            "improvement_suggestions": [],
            "validation_methods": [],
            "source_diversification": []
        }
        
        # Quality-specific suggestions
        if evidence_classification.get("primary_quality") == "speculative":
            guidance["improvement_suggestions"].extend([
                "Seek concrete data and research to support your hypotheses",
                "Test assumptions with small experiments or pilot programs",
                "Gather expert opinions to validate your thinking"
            ])
        elif evidence_classification.get("primary_quality") == "low":
            guidance["improvement_suggestions"].extend([
                "Look for more recent and authoritative sources",
                "Cross-reference information from multiple sources",
                "Seek quantitative data to complement anecdotal evidence"
            ])
        
        # Validation methods
        if evidence_classification.get("verification_level", 0.5) < 0.5:
            guidance["validation_methods"].extend([
                "Cross-check information with independent sources",
                "Look for peer-reviewed research or expert validation",
                "Test key assumptions with data or experiments"
            ])
        
        # Source diversification
        evidence_types = evidence_classification.get("evidence_types", [])
        if len(evidence_types) < 2:
            guidance["source_diversification"].extend([
                "Gather both quantitative and qualitative evidence",
                "Include multiple stakeholder perspectives",
                "Balance internal and external data sources"
            ])
        
        return guidance

    def _get_strategic_focus(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Determine strategic focus areas based on analysis"""
        patterns = analysis.get("thinking_patterns", {})
        strategic_context = analysis.get("strategic_context", [])
        
        focus_areas = {
            "primary_focus": "strategic_planning",
            "secondary_focuses": [],
            "recommended_depth": "medium",
            "time_horizon": "medium_term"
        }
        
        # Determine primary focus
        if "strategic" in patterns and patterns["strategic"] > 0.6:
            focus_areas["primary_focus"] = "long_term_strategy"
            focus_areas["time_horizon"] = "long_term"
        elif "tactical" in patterns and patterns["tactical"] > 0.6:
            focus_areas["primary_focus"] = "tactical_execution"
            focus_areas["time_horizon"] = "short_term"
        elif "risk_aware" in patterns and patterns["risk_aware"] > 0.5:
            focus_areas["primary_focus"] = "risk_management"
        elif "opportunity_focused" in patterns and patterns["opportunity_focused"] > 0.5:
            focus_areas["primary_focus"] = "opportunity_development"
        
        # Add secondary focuses based on strategic context
        if "market_analysis" in strategic_context:
            focus_areas["secondary_focuses"].append("market_strategy")
        if "competitive_intelligence" in strategic_context:
            focus_areas["secondary_focuses"].append("competitive_positioning")
        if "internal_assessment" in strategic_context:
            focus_areas["secondary_focuses"].append("capability_building")
        if "stakeholder_feedback" in strategic_context:
            focus_areas["secondary_focuses"].append("stakeholder_alignment")
        
        # Determine recommended depth
        complexity = analysis.get("complexity_level", "medium")
        if complexity == "high":
            focus_areas["recommended_depth"] = "deep"
        elif complexity == "low":
            focus_areas["recommended_depth"] = "surface"
        
        return focus_areas


class EvidenceClassifier:
    """Specialized classifier for strategic evidence"""
    
    def __init__(self):
        self.analyzer = CognitiveAnalyzer()
    
    def classify_evidence_batch(self, evidence_items: List[str]) -> List[Dict[str, Any]]:
        """Classify multiple evidence items"""
        classifications = []
        
        for item in evidence_items:
            classification = self.analyzer._classify_evidence(item)
            classification["original_text"] = item
            classifications.append(classification)
        
        return classifications
    
    def rank_evidence_by_quality(self, evidence_items: List[str]) -> List[Dict[str, Any]]:
        """Rank evidence items by quality"""
        classifications = self.classify_evidence_batch(evidence_items)
        
        # Sort by confidence score descending
        ranked = sorted(classifications, key=lambda x: x["confidence_score"], reverse=True)
        
        return ranked
    
    def identify_evidence_gaps(self, evidence_items: List[str]) -> Dict[str, Any]:
        """Identify gaps in evidence coverage"""
        classifications = self.classify_evidence_batch(evidence_items)
        
        # Analyze coverage
        quality_distribution = {}
        type_distribution = {}
        context_coverage = set()
        
        for classification in classifications:
            quality = classification["primary_quality"]
            quality_distribution[quality] = quality_distribution.get(quality, 0) + 1
            
            for evidence_type in classification["evidence_types"]:
                type_distribution[evidence_type] = type_distribution.get(evidence_type, 0) + 1
        
        # Identify gaps
        gaps = {
            "quality_gaps": [],
            "type_gaps": [],
            "recommendations": []
        }
        
        # Quality gaps
        if quality_distribution.get("high", 0) == 0:
            gaps["quality_gaps"].append("No high-quality evidence found")
            gaps["recommendations"].append("Seek authoritative sources and verified data")
        
        if quality_distribution.get("medium", 0) + quality_distribution.get("high", 0) < len(evidence_items) * 0.5:
            gaps["quality_gaps"].append("Majority of evidence is low quality or speculative")
            gaps["recommendations"].append("Strengthen evidence base with research and expert input")
        
        # Type gaps
        if "quantitative" not in type_distribution:
            gaps["type_gaps"].append("Missing quantitative evidence")
            gaps["recommendations"].append("Include data, metrics, and measurable evidence")
        
        if "expert_opinion" not in type_distribution:
            gaps["type_gaps"].append("Missing expert perspectives")
            gaps["recommendations"].append("Consult subject matter experts and authorities")
        
        return gaps