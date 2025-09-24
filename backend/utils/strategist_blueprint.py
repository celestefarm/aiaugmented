"""
STRATEGIST AGENT BLUEPRINT ENGINE
Core logic for strategic analysis and lightning brief generation
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
from datetime import datetime

class StrategicPhase(Enum):
    RECONNAISSANCE = "reconnaissance"
    ANALYSIS = "analysis"
    SYNTHESIS = "synthesis"
    VALIDATION = "validation"
    BRIEFING = "briefing"

class EvidenceQuality(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    SPECULATIVE = "speculative"

@dataclass
class StrategicEvidence:
    """Individual piece of evidence in strategic analysis"""
    content: str
    quality: EvidenceQuality
    source: str
    confidence: float
    timestamp: datetime = field(default_factory=datetime.now)
    tags: List[str] = field(default_factory=list)
    
class StrategicOption:
    """Strategic option with supporting evidence"""
    def __init__(self, title: str, description: str, evidence: List[StrategicEvidence] = None):
        self.title = title
        self.description = description
        self.evidence = evidence or []
        self.confidence_score = 0.0
        self.risk_factors = []
        self.opportunity_factors = []
        
    def calculate_confidence(self) -> float:
        """Calculate confidence based on evidence quality"""
        if not self.evidence:
            return 0.0
            
        quality_weights = {
            EvidenceQuality.HIGH: 1.0,
            EvidenceQuality.MEDIUM: 0.7,
            EvidenceQuality.LOW: 0.4,
            EvidenceQuality.SPECULATIVE: 0.2
        }
        
        total_weight = sum(quality_weights[ev.quality] * ev.confidence for ev in self.evidence)
        max_possible = len(self.evidence) * 1.0
        
        self.confidence_score = min(total_weight / max_possible if max_possible > 0 else 0.0, 1.0)
        return self.confidence_score

@dataclass
class LightningBrief:
    """Strategic lightning brief output"""
    situation_summary: str
    key_insights: List[str]
    strategic_options: List[StrategicOption]
    critical_assumptions: List[str]
    next_actions: List[str]
    confidence_level: str
    generated_at: datetime = field(default_factory=datetime.now)
    
class StrategistBlueprint:
    """Core STRATEGIST agent blueprint engine"""
    
    def __init__(self):
        self.current_phase = StrategicPhase.RECONNAISSANCE
        self.evidence_base = []
        self.strategic_options = []
        self.assumptions = []
        self.context_memory = {}
        
    def process_input(self, user_input: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Main processing pipeline for strategic analysis"""
        context = context or {}
        
        # Update context memory
        self.context_memory.update(context)
        
        # Phase-specific processing
        if self.current_phase == StrategicPhase.RECONNAISSANCE:
            return self._reconnaissance_phase(user_input)
        elif self.current_phase == StrategicPhase.ANALYSIS:
            return self._analysis_phase(user_input)
        elif self.current_phase == StrategicPhase.SYNTHESIS:
            return self._synthesis_phase(user_input)
        elif self.current_phase == StrategicPhase.VALIDATION:
            return self._validation_phase(user_input)
        elif self.current_phase == StrategicPhase.BRIEFING:
            return self._briefing_phase(user_input)
            
        return {"error": "Unknown phase"}
    
    def _reconnaissance_phase(self, user_input: str) -> Dict[str, Any]:
        """Gather and categorize information"""
        # Extract key information from input
        evidence = self._extract_evidence(user_input)
        self.evidence_base.extend(evidence)
        
        # Determine if we have enough for analysis
        if len(self.evidence_base) >= 3:  # Minimum threshold
            self.current_phase = StrategicPhase.ANALYSIS
            
        return {
            "phase": self.current_phase.value,
            "response": self._generate_reconnaissance_response(evidence),
            "evidence_count": len(self.evidence_base),
            "next_phase_ready": self.current_phase == StrategicPhase.ANALYSIS
        }
    
    def _analysis_phase(self, user_input: str) -> Dict[str, Any]:
        """Analyze evidence and identify patterns"""
        # Process additional evidence
        new_evidence = self._extract_evidence(user_input)
        self.evidence_base.extend(new_evidence)
        
        # Generate strategic options
        self.strategic_options = self._generate_strategic_options()
        
        # Move to synthesis if we have viable options
        if len(self.strategic_options) >= 2:
            self.current_phase = StrategicPhase.SYNTHESIS
            
        return {
            "phase": self.current_phase.value,
            "response": self._generate_analysis_response(),
            "strategic_options": [{"title": opt.title, "confidence": opt.confidence_score} 
                                for opt in self.strategic_options],
            "next_phase_ready": self.current_phase == StrategicPhase.SYNTHESIS
        }
    
    def _synthesis_phase(self, user_input: str) -> Dict[str, Any]:
        """Synthesize options into coherent strategy"""
        # Refine strategic options
        self._refine_strategic_options(user_input)
        
        # Generate assumptions
        self.assumptions = self._generate_critical_assumptions()
        
        self.current_phase = StrategicPhase.VALIDATION
        
        return {
            "phase": self.current_phase.value,
            "response": self._generate_synthesis_response(),
            "assumptions": self.assumptions,
            "refined_options": len(self.strategic_options),
            "next_phase_ready": True
        }
    
    def _validation_phase(self, user_input: str) -> Dict[str, Any]:
        """Validate assumptions and stress-test options"""
        validation_results = self._validate_assumptions(user_input)
        
        self.current_phase = StrategicPhase.BRIEFING
        
        return {
            "phase": self.current_phase.value,
            "response": self._generate_validation_response(validation_results),
            "validation_results": validation_results,
            "ready_for_brief": True
        }
    
    def _briefing_phase(self, user_input: str) -> Dict[str, Any]:
        """Generate final lightning brief"""
        lightning_brief = self._generate_lightning_brief()
        
        return {
            "phase": self.current_phase.value,
            "lightning_brief": lightning_brief,
            "response": "Lightning Brief generated. Ready for strategic action.",
            "complete": True
        }
    
    def _extract_evidence(self, text: str) -> List[StrategicEvidence]:
        """Extract strategic evidence from text input"""
        # Simplified evidence extraction - in production would use NLP
        evidence = []
        
        # Look for key indicators
        if "data shows" in text.lower() or "research indicates" in text.lower():
            evidence.append(StrategicEvidence(
                content=text,
                quality=EvidenceQuality.HIGH,
                source="user_input",
                confidence=0.8
            ))
        elif "i think" in text.lower() or "maybe" in text.lower():
            evidence.append(StrategicEvidence(
                content=text,
                quality=EvidenceQuality.SPECULATIVE,
                source="user_input",
                confidence=0.3
            ))
        else:
            evidence.append(StrategicEvidence(
                content=text,
                quality=EvidenceQuality.MEDIUM,
                source="user_input",
                confidence=0.6
            ))
            
        return evidence
    
    def _generate_strategic_options(self) -> List[StrategicOption]:
        """Generate strategic options from evidence base"""
        options = []
        
        # Analyze evidence patterns to generate options
        high_quality_evidence = [e for e in self.evidence_base if e.quality == EvidenceQuality.HIGH]
        
        if high_quality_evidence:
            options.append(StrategicOption(
                title="Data-Driven Approach",
                description="Strategy based on high-quality evidence and data",
                evidence=high_quality_evidence
            ))
        
        # Generate alternative options
        options.append(StrategicOption(
            title="Adaptive Strategy",
            description="Flexible approach that can pivot based on new information",
            evidence=self.evidence_base[-3:]  # Recent evidence
        ))
        
        # Calculate confidence for all options
        for option in options:
            option.calculate_confidence()
            
        return options
    
    def _refine_strategic_options(self, user_input: str):
        """Refine strategic options based on user feedback"""
        # Simplified refinement logic
        for option in self.strategic_options:
            if "risk" in user_input.lower():
                option.risk_factors.append("User highlighted risk concerns")
            if "opportunity" in user_input.lower():
                option.opportunity_factors.append("User identified opportunities")
    
    def _generate_critical_assumptions(self) -> List[str]:
        """Generate critical assumptions underlying the strategy"""
        assumptions = [
            "Current market conditions will remain stable",
            "Available resources are sufficient for implementation",
            "Key stakeholders will support the chosen approach"
        ]
        
        # Add context-specific assumptions
        if "budget" in str(self.context_memory):
            assumptions.append("Budget constraints are accurately estimated")
        if "timeline" in str(self.context_memory):
            assumptions.append("Timeline expectations are realistic")
            
        return assumptions
    
    def _validate_assumptions(self, user_input: str) -> Dict[str, str]:
        """Validate critical assumptions"""
        results = {}
        
        for assumption in self.assumptions:
            if "budget" in assumption.lower() and "budget" in user_input.lower():
                results[assumption] = "Validated by user input"
            elif "timeline" in assumption.lower() and "time" in user_input.lower():
                results[assumption] = "Validated by user input"
            else:
                results[assumption] = "Requires further validation"
                
        return results
    
    def _generate_lightning_brief(self) -> LightningBrief:
        """Generate the final lightning brief"""
        # Summarize situation
        situation_summary = f"Analysis of {len(self.evidence_base)} evidence points across strategic context."
        
        # Extract key insights
        key_insights = [
            f"Identified {len(self.strategic_options)} viable strategic options",
            f"Evidence quality distribution: {self._get_evidence_quality_summary()}",
            "Strategic alignment with stated objectives confirmed"
        ]
        
        # Determine next actions
        next_actions = [
            "Implement highest-confidence strategic option",
            "Monitor key assumptions for changes",
            "Establish feedback loops for strategy adjustment"
        ]
        
        # Calculate overall confidence
        avg_confidence = sum(opt.confidence_score for opt in self.strategic_options) / len(self.strategic_options)
        confidence_level = "High" if avg_confidence > 0.7 else "Medium" if avg_confidence > 0.4 else "Low"
        
        return LightningBrief(
            situation_summary=situation_summary,
            key_insights=key_insights,
            strategic_options=self.strategic_options,
            critical_assumptions=self.assumptions,
            next_actions=next_actions,
            confidence_level=confidence_level
        )
    
    def _get_evidence_quality_summary(self) -> str:
        """Get summary of evidence quality distribution"""
        quality_counts = {}
        for evidence in self.evidence_base:
            quality_counts[evidence.quality.value] = quality_counts.get(evidence.quality.value, 0) + 1
        
        return ", ".join([f"{k}: {v}" for k, v in quality_counts.items()])
    
    def _generate_reconnaissance_response(self, evidence: List[StrategicEvidence]) -> str:
        """Generate response for reconnaissance phase"""
        return f"Gathering strategic intelligence. Captured {len(evidence)} evidence points. What additional context can you provide?"
    
    def _generate_analysis_response(self) -> str:
        """Generate response for analysis phase"""
        return f"Analyzing {len(self.evidence_base)} evidence points. Identified {len(self.strategic_options)} strategic options. What factors should we prioritize?"
    
    def _generate_synthesis_response(self) -> str:
        """Generate response for synthesis phase"""
        return f"Synthesizing strategy from {len(self.strategic_options)} options. Key assumptions identified. What constraints should we consider?"
    
    def _generate_validation_response(self, validation_results: Dict[str, str]) -> str:
        """Generate response for validation phase"""
        validated_count = sum(1 for result in validation_results.values() if "Validated" in result)
        return f"Validated {validated_count}/{len(validation_results)} critical assumptions. Ready to generate Lightning Brief?"
    
    def reset(self):
        """Reset the blueprint for new analysis"""
        self.current_phase = StrategicPhase.RECONNAISSANCE
        self.evidence_base = []
        self.strategic_options = []
        self.assumptions = []
        self.context_memory = {}