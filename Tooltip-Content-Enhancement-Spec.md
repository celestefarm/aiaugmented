# NodeTooltip Content Enhancement Specification

## Executive Summary

This specification outlines a comprehensive redesign of the NodeTooltip component to address usability issues with conversation summary display. The solution implements a **Progressive Disclosure** pattern optimized for AI-summarized conversation content, eliminating scrollbars while maximizing information density and user comprehension.

## Problem Analysis

### Current Limitations
- **Poor Usability**: Fixed height (400px) with scrollbar creates friction for content consumption
- **Context Loss**: Text truncation at 200 characters loses critical conversation context
- **Inefficient Space Usage**: 320px width constraint doesn't adapt to content richness
- **No Content Hierarchy**: All information appears equally important, reducing scanning efficiency
- **Tokenization Waste**: Valuable AI-summarized content is hidden behind scrolling

### User Impact
- Users cannot quickly reconnect with their conversation context
- Strategic decision-making is hindered by incomplete information visibility
- Cognitive load increases due to poor information architecture

## Solution: Progressive Disclosure with Smart Summarization

### Design Philosophy
**"Maximum Context, Minimum Friction"** - Deliver the right amount of information at the right time through intelligent content layering.

### Three-Tier Information Architecture

#### Tier 1: Quick Scan View (Default State)
**Purpose**: Instant context recognition and strategic assessment

**Content Structure**:
```
┌─────────────────────────────────────┐
│ [Icon] Node Title               [×] │
├─────────────────────────────────────┤
│ 🎯 Executive Summary                │
│ "Key strategic insight in 1-2       │
│  sentences that captures essence"   │
│                                     │
│ 📋 Key Insights                     │
│ • Primary strategic point           │
│ • Critical decision factor          │
│ • Important consideration           │
│                                     │
│ [Expand ↓] [Full Context →]         │
├─────────────────────────────────────┤
│ 3 connections | 85% confidence      │
│ 2h ago                              │
└─────────────────────────────────────┘
```

**Specifications**:
- **Dimensions**: 340px width × 280-320px height (dynamic)
- **Executive Summary**: ≤50 words, AI-generated conversation essence
- **Key Insights**: 3-4 bullet points, ≤15 words each
- **Visual Hierarchy**: Clear typography scale and spacing

#### Tier 2: Expanded Context View (In-Place Expansion)
**Purpose**: Detailed understanding without losing spatial context

**Content Structure**:
```
┌─────────────────────────────────────┐
│ [Icon] Node Title               [×] │
├─────────────────────────────────────┤
│ 🎯 Executive Summary                │
│ "Expanded 2-3 sentence summary      │
│  with additional strategic context" │
│                                     │
│ 📊 Strategic Analysis               │
│ • Market opportunity assessment     │
│ • Risk factors identified           │
│ • Resource requirements             │
│ • Timeline considerations           │
│                                     │
│ 🎯 Decision Points                  │
│ • Should we prioritize X over Y?    │
│ • What resources are needed?        │
│                                     │
│ 📝 Next Actions                     │
│ • Conduct market research           │
│ • Schedule stakeholder meeting      │
│                                     │
│ [Collapse ↑] [Full Context →]       │
├─────────────────────────────────────┤
│ 3 connections | 85% confidence      │
│ 2h ago                              │
└─────────────────────────────────────┘
```

**Specifications**:
- **Dimensions**: 380px width × 400-500px height (dynamic)
- **Content Sections**: Structured with clear visual separation
- **Word Limits**: Strategic Analysis (≤120 words), Decision Points (≤60 words), Next Actions (≤40 words)
- **Animation**: Smooth height transition (300ms ease-out)

#### Tier 3: Full Context Modal (Deep Dive)
**Purpose**: Complete conversation analysis and relationship mapping

**Content Structure**:
```
┌─────────────────────────────────────────────────────────────┐
│ Complete Conversation Analysis                          [×] │
├─────────────────────────────────────────────────────────────┤
│ [Left Column]              │ [Right Column]                 │
│                           │                                │
│ 📈 Strategic Overview      │ 🔗 Relationship Map           │
│ Comprehensive summary      │ Connected nodes visualization  │
│                           │                                │
│ 🎯 Key Decisions          │ 📚 Conversation History       │
│ Decision tree analysis    │ Related discussions timeline   │
│                           │                                │
│ 📊 Impact Assessment      │ 🚀 Recommended Actions        │
│ Risk/opportunity matrix   │ Prioritized next steps         │
└─────────────────────────────────────────────────────────────┘
```

**Specifications**:
- **Dimensions**: 800px width × 600px height (fixed modal)
- **Layout**: Two-column responsive design
- **Content**: Full conversation synthesis with visual elements
- **Interactions**: Scrollable sections, interactive relationship map

## Technical Implementation

### Component Architecture

#### Enhanced NodeTooltip Component Structure
```typescript
interface EnhancedNodeTooltipProps {
  node: Node;
  edges: Edge[];
  isOpen: boolean;
  refs: any;
  floatingStyles: React.CSSProperties;
  arrowRef: React.RefObject<SVGSVGElement>;
  context: any;
  getFloatingProps: () => any;
}

interface TooltipState {
  displayTier: 'quick' | 'expanded' | 'modal';
  isExpanding: boolean;
  contentHeight: number;
  modalOpen: boolean;
}
```

#### State Management
```typescript
const [tooltipState, setTooltipState] = useState<TooltipState>({
  displayTier: 'quick',
  isExpanding: false,
  contentHeight: 280,
  modalOpen: false
});

// Smart content processing
const processedContent = useMemo(() => ({
  executiveSummary: generateExecutiveSummary(node.key_message, node.keynote_points),
  keyInsights: extractKeyInsights(node.keynote_points, 4),
  strategicAnalysis: generateStrategicAnalysis(node.description),
  decisionPoints: extractDecisionPoints(node.description),
  nextActions: generateActionItems(node.description)
}), [node]);
```

### Dynamic Sizing Logic
```typescript
const calculateOptimalHeight = (content: ProcessedContent, tier: DisplayTier): number => {
  const baseHeight = 280;
  const lineHeight = 20;
  const sectionSpacing = 16;
  
  switch (tier) {
    case 'quick':
      return Math.min(
        baseHeight + (content.keyInsights.length * lineHeight),
        320
      );
    case 'expanded':
      return Math.min(
        baseHeight + 
        (content.strategicAnalysis.length * 0.1) + 
        (content.decisionPoints.length * lineHeight) +
        (content.nextActions.length * lineHeight) +
        (sectionSpacing * 4),
        500
      );
    default:
      return baseHeight;
  }
};
```

### Content Processing Functions

#### Executive Summary Generation
```typescript
const generateExecutiveSummary = (keyMessage: string, keynotePoints: string[]): string => {
  if (keyMessage && keyMessage.length <= 50) return keyMessage;
  
  // AI-powered summarization logic
  const combinedContent = [keyMessage, ...keynotePoints].join(' ');
  return intelligentTruncate(combinedContent, 50, {
    preserveContext: true,
    prioritizeKeywords: ['strategic', 'decision', 'opportunity', 'risk'],
    endWithCompleteSentence: true
  });
};
```

#### Key Insights Extraction
```typescript
const extractKeyInsights = (keynotePoints: string[], maxCount: number): string[] => {
  if (!keynotePoints || keynotePoints.length === 0) return [];
  
  return keynotePoints
    .map(point => intelligentTruncate(point, 15))
    .slice(0, maxCount)
    .filter(point => point.length > 5); // Filter out too-short points
};
```

### CSS Implementation

#### Base Tooltip Styles
```css
.tooltip-content-enhanced {
  width: var(--tooltip-width, 340px);
  min-height: 280px;
  max-height: var(--tooltip-max-height, 500px);
  
  /* Enhanced glass effect */
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(107, 107, 58, 0.4);
  border-radius: 12px;
  padding: 20px;
  
  /* Superior shadow for depth */
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.5),
    0 0 24px rgba(107, 107, 58, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  
  /* Smooth transitions */
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### Content Section Styles
```css
.tooltip-section {
  margin-bottom: 16px;
}

.tooltip-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(107, 107, 58, 0.9);
}

.tooltip-section-content {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(229, 231, 235, 0.9);
}

.tooltip-insights-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tooltip-insights-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
  padding: 4px 0;
}

.tooltip-insights-bullet {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(107, 107, 58, 0.8);
  margin-top: 8px;
  flex-shrink: 0;
}
```

#### Expansion Animation
```css
.tooltip-expanding {
  overflow: hidden;
  transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.tooltip-content-enter {
  opacity: 0;
  transform: translateY(8px);
}

.tooltip-content-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Responsive Design

#### Mobile Adaptations
```css
@media (max-width: 768px) {
  .tooltip-content-enhanced {
    width: min(340px, 90vw);
    max-height: 60vh;
    padding: 16px;
  }
  
  .tooltip-section-header {
    font-size: 13px;
  }
  
  .tooltip-section-content {
    font-size: 12px;
  }
}
```

#### Tablet Adaptations
```css
@media (min-width: 769px) and (max-width: 1024px) {
  .tooltip-content-enhanced {
    width: 360px;
  }
}
```

### Accessibility Implementation

#### ARIA Labels and Roles
```typescript
<div
  role="tooltip"
  aria-labelledby={`tooltip-title-${node.id}`}
  aria-describedby={`tooltip-content-${node.id}`}
  aria-expanded={tooltipState.displayTier !== 'quick'}
>
  <h3 id={`tooltip-title-${node.id}`} className="sr-only">
    {node.title} Details
  </h3>
  <div id={`tooltip-content-${node.id}`}>
    {/* Content sections */}
  </div>
</div>
```

#### Keyboard Navigation
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      expandTooltip();
      break;
    case 'Escape':
      e.preventDefault();
      collapseTooltip();
      break;
    case 'Tab':
      // Allow natural tab navigation through interactive elements
      break;
  }
};
```

### Performance Optimizations

#### Content Memoization
```typescript
const memoizedContent = useMemo(() => {
  return {
    executiveSummary: generateExecutiveSummary(node.key_message, node.keynote_points),
    keyInsights: extractKeyInsights(node.keynote_points, 4),
    // Only compute expensive content when needed
    ...(tooltipState.displayTier !== 'quick' && {
      strategicAnalysis: generateStrategicAnalysis(node.description),
      decisionPoints: extractDecisionPoints(node.description),
      nextActions: generateActionItems(node.description)
    })
  };
}, [node, tooltipState.displayTier]);
```

#### Lazy Loading for Modal Content
```typescript
const FullContextModal = lazy(() => import('./FullContextModal'));

// Only load modal component when needed
{tooltipState.modalOpen && (
  <Suspense fallback={<div>Loading...</div>}>
    <FullContextModal node={node} edges={edges} />
  </Suspense>
)}
```

## Implementation Phases

### Phase 1: Core Enhancement (Week 1)
- [ ] Implement Tier 1 (Quick Scan View) with dynamic sizing
- [ ] Add content processing functions for executive summary and key insights
- [ ] Update CSS for enhanced visual hierarchy
- [ ] Test responsive behavior across devices

### Phase 2: Progressive Disclosure (Week 2)
- [ ] Implement Tier 2 (Expanded Context View) with smooth animations
- [ ] Add strategic analysis and decision points processing
- [ ] Implement expand/collapse interactions
- [ ] Add accessibility features and keyboard navigation

### Phase 3: Full Context Modal (Week 3)
- [ ] Design and implement Tier 3 modal interface
- [ ] Add relationship mapping visualization
- [ ] Implement conversation history timeline
- [ ] Performance optimization and testing

### Phase 4: Polish & Integration (Week 4)
- [ ] Cross-browser testing and bug fixes
- [ ] Performance profiling and optimization
- [ ] User acceptance testing
- [ ] Documentation and deployment

## Success Metrics

### User Experience Metrics
- **Context Recognition Time**: < 3 seconds to understand conversation essence
- **Information Accessibility**: 90% of key information visible without scrolling
- **Interaction Efficiency**: < 2 clicks to access any level of detail

### Technical Performance Metrics
- **Render Time**: < 100ms for Tier 1, < 200ms for Tier 2
- **Memory Usage**: < 5MB additional memory per tooltip instance
- **Accessibility Score**: WCAG 2.1 AA compliance (100%)

### Business Impact Metrics
- **User Engagement**: Increased time spent reviewing node content
- **Decision Quality**: Faster strategic decision-making
- **Cognitive Load**: Reduced mental effort to process information

## Risk Mitigation

### Technical Risks
- **Performance Impact**: Mitigated through lazy loading and content memoization
- **Browser Compatibility**: Comprehensive testing across modern browsers
- **Mobile Usability**: Responsive design with touch-optimized interactions

### User Experience Risks
- **Information Overload**: Controlled through progressive disclosure pattern
- **Interaction Complexity**: Clear visual cues and consistent interaction patterns
- **Content Quality**: AI summarization validation and fallback mechanisms

## Conclusion

This enhanced NodeTooltip design transforms a problematic scrolling interface into an intelligent, progressive disclosure system that maximizes the value of AI-summarized conversation content. By implementing three distinct information tiers, users can quickly scan for context, dive deeper when needed, and access comprehensive analysis without losing spatial awareness on the strategic map.

The solution balances information density with usability, ensuring that valuable conversation insights are immediately accessible while maintaining the lightweight, responsive nature essential for strategic decision-making workflows.