# Enhanced Strategist Agent Implementation Specification

## Overview
This document specifies the implementation of a sophisticated Strategist Agent framework that transforms the current basic chat responses into a board-level strategic advisory system following a structured 6-step analysis process.

## Current State Analysis

### Existing Implementation
- **Location**: `frontend/src/contexts/AgentChatContext.tsx` (lines 422-437)
- **Current Logic**: Simple switch statement with basic templated responses
- **Limitations**: 
  - Generic responses without strategic depth
  - No structured analysis framework
  - Missing evidence classification
  - No stakeholder consideration
  - No actionable recommendations

### Current Strategist Response Logic
```typescript
case 'strategist':
  mockResponse = `From a strategic perspective, I see several key considerations regarding "${content}". We should evaluate the long-term implications and identify 2-3 viable options moving forward.`;
  break;
```

## Enhanced Framework Implementation

### 1. Strategic Analysis Engine

#### Core Data Structures
```typescript
interface StrategicAnalysis {
  mission: {
    testableOutcome: string;
    hardConstraints: string[];
    successMetrics: string[];
  };
  forceField: {
    accelerators: string[];
    frictions: string[];
    hiddenDependencies: string[];
  };
  options: StrategicOption[];
  evidenceQuality: {
    facts: number;
    assumptions: number;
    inferences: number;
  };
  stakeholderImpact: StakeholderAssessment[];
  nextSteps: ActionItem[];
}

interface StrategicOption {
  id: string;
  headline: string;
  coreLogic: string;
  keyTradeoffs: {
    gains: string[];
    losses: string[];
  };
  resourceRequirements: {
    time: string;
    money: string;
    people: string;
  };
  riskProfile: 'High' | 'Medium' | 'Low';
  timeline: string;
  killMetric: string;
  confidenceLevel: number;
  proofPoint: {
    hypothesis: string;
    successCriteria: string;
    resourceInvestment: string;
  };
}

interface StakeholderAssessment {
  role: 'CFO' | 'CMO' | 'COO' | 'Board' | 'Operations';
  sentiment: '👍' | '⚠️' | '👎';
  reasoning: string;
}

interface ActionItem {
  description: string;
  timeline: string;
  type: 'experiment' | 'conversation' | 'analysis';
}
```

### 2. Strategic Response Generator

#### Enhanced Strategist Logic
```typescript
class StrategistEngine {
  private analyzeUserInput(content: string): StrategicAnalysis {
    // Step 1: Mission Reframe
    const mission = this.reframeMission(content);
    
    // Step 2: Force-Field Analysis
    const forceField = this.analyzeForces(content, mission);
    
    // Step 3: Generate 3 Strategic Options
    const options = this.generateStrategicOptions(content, mission, forceField);
    
    // Step 4: Evidence Classification
    const evidenceQuality = this.classifyEvidence(options);
    
    // Step 5: Stress Testing
    const stressTestResults = this.stressTestOptions(options);
    
    // Step 6: Proof Point Design
    const proofPoints = this.designProofPoints(options);
    
    return {
      mission,
      forceField,
      options: options.map((option, index) => ({
        ...option,
        ...stressTestResults[index],
        proofPoint: proofPoints[index]
      })),
      evidenceQuality,
      stakeholderImpact: this.assessStakeholders(options),
      nextSteps: this.generateNextSteps(options)
    };
  }

  private reframeMission(content: string): Mission {
    // Extract and reframe user input into testable outcomes
    // Identify constraints and success metrics
    // Apply strategic thinking to clarify the real problem
  }

  private analyzeForces(content: string, mission: Mission): ForceField {
    // Identify accelerators, frictions, and dependencies
    // Consider market forces, organizational dynamics, external factors
  }

  private generateStrategicOptions(content: string, mission: Mission, forces: ForceField): StrategicOption[] {
    // Create exactly 3 distinct strategic approaches
    // Ensure each uses fundamentally different mechanisms
    // Apply different strategic levers (cost, differentiation, focus, etc.)
  }
}
```

### 3. Response Formatting System

#### Executive Brief Template
```typescript
const formatExecutiveBrief = (analysis: StrategicAnalysis): string => {
  const recommendedOption = analysis.options.reduce((prev, current) => 
    prev.confidenceLevel > current.confidenceLevel ? prev : current
  );

  return `
## Executive Brief

**MISSION**: ${analysis.mission.testableOutcome}

**RECOMMENDATION**: Option ${recommendedOption.id} has highest confidence (${recommendedOption.confidenceLevel.toFixed(2)}) because ${recommendedOption.coreLogic}

## Strategic Options

${analysis.options.map(option => `
### Option ${option.id}: ${option.headline}

**Approach**: ${option.coreLogic}
**Pros**: ${option.keyTradeoffs.gains.join(', ')}
**Cons**: ${option.keyTradeoffs.losses.join(', ')}
**Risk Level**: ${option.riskProfile}
**Timeline**: ${option.timeline}
**Investment**: ${option.resourceRequirements.time}, ${option.resourceRequirements.money}, ${option.resourceRequirements.people}
**Kill Metric**: ${option.killMetric}
`).join('')}

## Reality Check

**Stakeholder Impact Map**:
${analysis.stakeholderImpact.map(s => `- ${s.role}: ${s.sentiment} ${s.reasoning}`).join('\n')}

**Evidence Quality**:
- Facts: ${analysis.evidenceQuality.facts} statements
- Assumptions: ${analysis.evidenceQuality.assumptions} statements  
- Inferences: ${analysis.evidenceQuality.inferences} statements

## Next Steps

**Immediate Actions (Week 1)**:
${analysis.nextSteps.map(step => `- ${step.description} (${step.timeline})`).join('\n')}
  `;
};
```

### 4. Integration Points

#### AgentChatContext Modifications
```typescript
// Replace existing strategist case in sendMessage function
case 'strategist':
  const strategistEngine = new StrategistEngine();
  const analysis = strategistEngine.analyzeUserInput(content);
  mockResponse = formatExecutiveBrief(analysis);
  
  // Optional: Create nodes automatically from strategic options
  if (shouldCreateNodes) {
    await this.createStrategicNodes(analysis);
  }
  break;
```

#### Node Creation Integration
```typescript
private async createStrategicNodes(analysis: StrategicAnalysis): Promise<void> {
  // Create nodes for each strategic option
  for (const option of analysis.options) {
    await createNode({
      title: option.headline,
      description: option.coreLogic,
      type: 'decision',
      confidence: option.confidenceLevel,
      source_agent: 'Strategist Agent'
    });
  }
  
  // Create nodes for key assumptions to test
  for (const assumption of analysis.assumptions) {
    await createNode({
      title: `Test: ${assumption.hypothesis}`,
      description: assumption.testMethod,
      type: 'risk',
      source_agent: 'Strategist Agent'
    });
  }
}
```

### 5. Advanced Features

#### Conversation Memory
```typescript
interface ConversationContext {
  previousAnalyses: StrategicAnalysis[];
  validatedAssumptions: string[];
  rejectedOptions: string[];
  stakeholderFeedback: StakeholderFeedback[];
}

// Track conversation history to provide continuity
// Reference previous analyses and build upon them
// Update confidence levels based on new information
```

#### Dynamic Confidence Scoring
```typescript
class ConfidenceEngine {
  calculateOptionConfidence(option: StrategicOption, context: ConversationContext): number {
    let baseConfidence = 0.5;
    
    // Adjust based on evidence quality
    baseConfidence += (option.evidenceQuality.facts * 0.1);
    baseConfidence -= (option.evidenceQuality.assumptions * 0.05);
    
    // Adjust based on stakeholder alignment
    const stakeholderSupport = this.calculateStakeholderSupport(option);
    baseConfidence += (stakeholderSupport * 0.2);
    
    // Adjust based on resource feasibility
    const resourceFeasibility = this.assessResourceFeasibility(option);
    baseConfidence += (resourceFeasibility * 0.15);
    
    return Math.min(Math.max(baseConfidence, 0), 1);
  }
}
```

### 6. Quality Assurance Framework

#### Validation Rules
```typescript
interface QualityGates {
  optionDistinctiveness: boolean; // Each option uses different approach
  contradictionExposure: boolean; // At least 1 contradiction identified
  secondOrderEffects: boolean; // At least 1 second-order effect per option
  testableProofPoints: boolean; // At least 1 testable proof point
  stakeholderCoverage: boolean; // All major stakeholders considered
}

const validateAnalysis = (analysis: StrategicAnalysis): QualityGates => {
  return {
    optionDistinctiveness: checkOptionDistinctiveness(analysis.options),
    contradictionExposure: analysis.contradictions.length >= 1,
    secondOrderEffects: analysis.options.every(o => o.secondOrderEffects.length >= 1),
    testableProofPoints: analysis.options.every(o => o.proofPoint.hypothesis.length > 0),
    stakeholderCoverage: analysis.stakeholderImpact.length >= 4
  };
};
```

### 7. Implementation Phases

#### Phase 1: Core Framework (Week 1)
- [ ] Implement basic StrategistEngine class
- [ ] Create strategic analysis data structures
- [ ] Replace simple response with structured analysis
- [ ] Add executive brief formatting

#### Phase 2: Advanced Analysis (Week 2)
- [ ] Implement force-field analysis
- [ ] Add stakeholder impact assessment
- [ ] Create evidence classification system
- [ ] Add confidence scoring

#### Phase 3: Integration Features (Week 3)
- [ ] Integrate with node creation system
- [ ] Add conversation memory
- [ ] Implement quality gates
- [ ] Add stress testing capabilities

#### Phase 4: Refinement (Week 4)
- [ ] Add industry-specific templates
- [ ] Implement dynamic confidence updates
- [ ] Add scenario planning capabilities
- [ ] Performance optimization

### 8. Testing Strategy

#### Unit Tests
```typescript
describe('StrategistEngine', () => {
  test('generates exactly 3 distinct options', () => {
    const analysis = engine.analyzeUserInput('How should we launch our product?');
    expect(analysis.options).toHaveLength(3);
    expect(areOptionsDistinct(analysis.options)).toBe(true);
  });

  test('classifies evidence correctly', () => {
    const analysis = engine.analyzeUserInput('Market research shows 70% demand');
    expect(analysis.evidenceQuality.facts).toBeGreaterThan(0);
  });
});
```

#### Integration Tests
```typescript
describe('Strategist Integration', () => {
  test('creates nodes from strategic analysis', async () => {
    const response = await sendMessage('Strategic planning question');
    expect(mockCreateNode).toHaveBeenCalledTimes(3); // One per option
  });
});
```

### 9. Performance Considerations

#### Optimization Strategies
- **Lazy Loading**: Load analysis components only when strategist is active
- **Caching**: Cache analysis results for similar queries
- **Streaming**: Stream analysis results as they're generated
- **Debouncing**: Prevent rapid-fire analysis requests

#### Memory Management
- **Context Pruning**: Limit conversation history to last 10 interactions
- **Analysis Cleanup**: Remove old analyses after 24 hours
- **Node Limit**: Cap automatic node creation at 10 per session

### 10. Future Enhancements

#### Advanced Capabilities
- **Multi-Agent Collaboration**: Strategist coordinates with other agents
- **Real-Time Updates**: Analysis updates as market conditions change
- **Predictive Modeling**: Forecast option success probability
- **Learning System**: Improve recommendations based on outcomes

#### User Experience
- **Interactive Analysis**: Users can drill down into specific aspects
- **Visual Strategy Maps**: Automatic generation of strategy visualizations
- **Collaborative Editing**: Multiple users can refine strategic options
- **Export Capabilities**: Generate presentation-ready strategy documents

## Implementation Priority

### Critical Path
1. **Core StrategistEngine** - Foundation for all strategic analysis
2. **Response Formatting** - Ensures consistent, professional output
3. **Quality Gates** - Maintains analysis quality and completeness
4. **Node Integration** - Bridges strategy and visual mapping

### Success Metrics
- **Response Quality**: Measured by structured analysis completeness
- **User Engagement**: Time spent reviewing strategic recommendations
- **Decision Support**: Percentage of analyses leading to clear next steps
- **Accuracy**: Validation of strategic predictions over time

This specification provides a comprehensive roadmap for transforming the basic Strategist Agent into a sophisticated strategic advisory system that rivals top-tier consulting frameworks.