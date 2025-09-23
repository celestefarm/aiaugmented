import { Node, Edge } from '../../../lib/api';
import { AnalyticsData, ProcessedInsight } from '../LastMileBriefCanvas';

export interface StrategicOutlook {
  summary: string;
  keyImplications: string[];
  riskFactors: string[];
  opportunities: string[];
  timeHorizon: 'short-term' | 'medium-term' | 'long-term';
  confidence: number;
}

export interface ActionableRecommendation {
  id: string;
  insight: string;
  recommendation: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: 'transformational' | 'significant' | 'moderate' | 'minimal';
  effort: 'low' | 'medium' | 'high' | 'extensive';
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  category: string;
  successMetrics: string[];
}

/**
 * Generates executive-level strategic outlook based on comprehensive analysis
 */
export function generateStrategicOutlook(
  nodes: Node[], 
  edges: Edge[], 
  analytics: AnalyticsData, 
  insights: ProcessedInsight[]
): StrategicOutlook {
  const networkAnalysis = analyzeNetworkStructure(nodes, edges);
  const riskAssessment = assessStrategicRisks(nodes, analytics);
  const opportunityAnalysis = identifyStrategicOpportunities(nodes, edges, analytics);
  
  // Generate comprehensive strategic summary
  const summary = generateStrategicSummary(networkAnalysis, riskAssessment, opportunityAnalysis, analytics);
  
  // Extract key implications
  const keyImplications = extractKeyImplications(networkAnalysis, analytics, insights);
  
  // Determine time horizon based on strategic complexity
  const timeHorizon = determineTimeHorizon(nodes, edges, analytics);
  
  // Calculate overall confidence
  const confidence = calculateStrategicConfidence(analytics, insights);
  
  return {
    summary,
    keyImplications,
    riskFactors: riskAssessment.factors,
    opportunities: opportunityAnalysis.opportunities,
    timeHorizon,
    confidence
  };
}

/**
 * Generates actionable recommendations with clear insight-to-recommendation mapping
 */
export function generateActionableRecommendations(
  nodes: Node[],
  edges: Edge[],
  analytics: AnalyticsData,
  insights: ProcessedInsight[]
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = [];
  
  // Network optimization recommendations
  recommendations.push(...generateNetworkRecommendations(nodes, edges, analytics));
  
  // Confidence improvement recommendations
  recommendations.push(...generateConfidenceRecommendations(nodes, analytics));
  
  // Risk mitigation recommendations
  recommendations.push(...generateRiskRecommendations(nodes, analytics));
  
  // Strategic enhancement recommendations
  recommendations.push(...generateStrategicRecommendations(insights, analytics));
  
  // Sort by priority and impact
  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const impactOrder = { transformational: 4, significant: 3, moderate: 2, minimal: 1 };
    
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    const aImpact = impactOrder[a.impact];
    const bImpact = impactOrder[b.impact];
    
    if (aPriority !== bPriority) return bPriority - aPriority;
    return bImpact - aImpact;
  });
}

/**
 * Infers strategic title from explanation map central theme
 */
export function inferStrategicTitle(nodes: Node[], analytics: AnalyticsData): string {
  const dominantType = Object.entries(analytics.nodeDistribution.byType)
    .sort(([,a], [,b]) => b - a)[0];
  
  const totalNodes = nodes.length;
  const networkDensity = analytics.connectionAnalysis.networkDensity;
  const avgConfidence = analytics.confidenceMetrics.average;
  
  // Generate contextual title based on strategic characteristics
  if (dominantType && dominantType[0] === 'decision' && totalNodes > 10) {
    return 'Strategic Decision Framework Analysis';
  } else if (dominantType && dominantType[0] === 'risk' && avgConfidence < 0.6) {
    return 'Risk Assessment & Mitigation Strategy';
  } else if (networkDensity > 0.6 && totalNodes > 15) {
    return 'Integrated Strategic Network Analysis';
  } else if (dominantType && dominantType[0] === 'human' && totalNodes > 8) {
    return 'Stakeholder-Centric Strategic Framework';
  } else if (avgConfidence > 0.8 && totalNodes > 5) {
    return 'High-Confidence Strategic Initiative';
  } else if (totalNodes > 20) {
    return 'Comprehensive Strategic Landscape Analysis';
  } else if (totalNodes > 10) {
    return 'Strategic Framework Assessment';
  } else {
    return 'Strategic Analysis Overview';
  }
}

/**
 * Analyzes network structure for strategic insights
 */
function analyzeNetworkStructure(nodes: Node[], edges: Edge[]) {
  const nodeConnections: { [key: string]: number } = {};
  const centralNodes: Node[] = [];
  
  // Calculate node connectivity
  edges.forEach(edge => {
    const fromId = edge.from_node_id.toString();
    const toId = edge.to_node_id.toString();
    nodeConnections[fromId] = (nodeConnections[fromId] || 0) + 1;
    nodeConnections[toId] = (nodeConnections[toId] || 0) + 1;
  });
  
  // Identify central nodes (top 20% by connections)
  const sortedNodes = nodes
    .map(node => ({ node, connections: nodeConnections[node.id.toString()] || 0 }))
    .sort((a, b) => b.connections - a.connections);
  
  const centralCount = Math.max(1, Math.floor(nodes.length * 0.2));
  const centralNodesList = sortedNodes.slice(0, centralCount).map(item => item.node);
  
  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    centralNodes: centralNodesList,
    averageConnections: edges.length > 0 ? (edges.length * 2) / nodes.length : 0,
    isolatedNodes: nodes.filter(node => (nodeConnections[node.id.toString()] || 0) === 0).length
  };
}

/**
 * Assesses strategic risks based on network analysis
 */
function assessStrategicRisks(nodes: Node[], analytics: AnalyticsData) {
  const risks: string[] = [];
  
  // Low confidence risk
  if (analytics.confidenceMetrics.average < 0.6) {
    risks.push('Strategic uncertainty due to low average confidence levels across key elements');
  }
  
  // Network fragmentation risk
  if (analytics.connectionAnalysis.networkDensity < 0.3) {
    risks.push('Strategic fragmentation risk from insufficient interconnections between elements');
  }
  
  // Over-concentration risk
  const dominantType = Object.entries(analytics.nodeDistribution.byType)
    .sort(([,a], [,b]) => b - a)[0];
  if (dominantType && dominantType[1] / nodes.length > 0.7) {
    risks.push(`Over-concentration in ${dominantType[0]} elements may limit strategic flexibility`);
  }
  
  // Execution risk from high complexity
  if (nodes.length > 25 && analytics.connectionAnalysis.networkDensity > 0.7) {
    risks.push('Execution complexity risk from highly interconnected strategic framework');
  }
  
  return { factors: risks };
}

/**
 * Identifies strategic opportunities
 */
function identifyStrategicOpportunities(nodes: Node[], edges: Edge[], analytics: AnalyticsData) {
  const opportunities: string[] = [];
  
  // High confidence opportunity
  if (analytics.confidenceMetrics.average > 0.75) {
    opportunities.push('Strong foundation for strategic execution with high confidence levels');
  }
  
  // Network leverage opportunity
  if (analytics.connectionAnalysis.networkDensity > 0.5) {
    opportunities.push('Synergy opportunities from well-connected strategic elements');
  }
  
  // Balanced portfolio opportunity
  const typeCount = Object.keys(analytics.nodeDistribution.byType).length;
  if (typeCount >= 3 && nodes.length > 10) {
    opportunities.push('Diversified strategic approach enables multiple value creation pathways');
  }
  
  // Scalability opportunity
  if (nodes.length > 15 && analytics.connectionAnalysis.averageConnections > 2) {
    opportunities.push('Scalable strategic framework with established interconnection patterns');
  }
  
  return { opportunities };
}

/**
 * Generates comprehensive strategic summary
 */
function generateStrategicSummary(
  networkAnalysis: any,
  riskAssessment: any,
  opportunityAnalysis: any,
  analytics: AnalyticsData
): string {
  const nodeCount = networkAnalysis.totalNodes;
  const edgeCount = networkAnalysis.totalEdges;
  const avgConfidence = Math.round(analytics.confidenceMetrics.average * 100);
  const networkDensity = Math.round(analytics.connectionAnalysis.networkDensity * 100);
  
  let summary = `This strategic analysis encompasses ${nodeCount} key elements with ${edgeCount} interconnections, `;
  summary += `demonstrating ${avgConfidence}% average confidence and ${networkDensity}% network integration. `;
  
  if (avgConfidence > 75 && networkDensity > 50) {
    summary += 'The framework exhibits strong strategic coherence with high confidence levels and well-integrated elements, ';
    summary += 'positioning the organization for effective execution and value realization.';
  } else if (avgConfidence > 60 && networkDensity > 30) {
    summary += 'The strategic foundation shows solid development with moderate integration, ';
    summary += 'indicating readiness for focused implementation with targeted enhancements.';
  } else {
    summary += 'The strategic framework is in development phase, requiring additional analysis and integration ';
    summary += 'to strengthen confidence levels and element interconnections before full-scale execution.';
  }
  
  return summary;
}

/**
 * Extracts key strategic implications
 */
function extractKeyImplications(networkAnalysis: any, analytics: AnalyticsData, insights: ProcessedInsight[]): string[] {
  const implications: string[] = [];
  
  // Network structure implications
  if (networkAnalysis.centralNodes.length > 0) {
    implications.push(`${networkAnalysis.centralNodes.length} central elements drive strategic connectivity and require priority attention`);
  }
  
  // Confidence implications
  if (analytics.confidenceMetrics.average > 0.8) {
    implications.push('High confidence levels support aggressive strategic execution and resource commitment');
  } else if (analytics.confidenceMetrics.average < 0.5) {
    implications.push('Low confidence levels necessitate additional research and validation before major commitments');
  }
  
  // Integration implications
  if (analytics.connectionAnalysis.networkDensity > 0.6) {
    implications.push('High integration requires coordinated execution approach and change management');
  } else if (analytics.connectionAnalysis.networkDensity < 0.3) {
    implications.push('Low integration allows for modular implementation but may miss synergy opportunities');
  }
  
  // Scale implications
  if (networkAnalysis.totalNodes > 20) {
    implications.push('Strategic complexity requires structured governance and phased implementation approach');
  }
  
  return implications;
}

/**
 * Determines strategic time horizon
 */
function determineTimeHorizon(nodes: Node[], edges: Edge[], analytics: AnalyticsData): 'short-term' | 'medium-term' | 'long-term' {
  const complexity = nodes.length + edges.length;
  const integration = analytics.connectionAnalysis.networkDensity;
  const confidence = analytics.confidenceMetrics.average;
  
  if (complexity > 40 || (integration > 0.7 && nodes.length > 15)) {
    return 'long-term';
  } else if (complexity > 20 || confidence < 0.6) {
    return 'medium-term';
  } else {
    return 'short-term';
  }
}

/**
 * Calculates overall strategic confidence
 */
function calculateStrategicConfidence(analytics: AnalyticsData, insights: ProcessedInsight[]): number {
  const baseConfidence = analytics.confidenceMetrics.average;
  const networkBonus = analytics.connectionAnalysis.networkDensity * 0.1;
  const insightBonus = insights.length > 0 ? Math.min(insights.length * 0.02, 0.1) : 0;
  
  return Math.min(1, baseConfidence + networkBonus + insightBonus);
}

/**
 * Generate network optimization recommendations
 */
function generateNetworkRecommendations(nodes: Node[], edges: Edge[], analytics: AnalyticsData): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = [];
  
  if (analytics.connectionAnalysis.networkDensity < 0.3) {
    recommendations.push({
      id: 'network-integration',
      insight: 'Strategic network shows low connectivity between elements',
      recommendation: 'Strengthen relationships between strategic elements by identifying and creating missing connections',
      priority: 'high',
      impact: 'significant',
      effort: 'medium',
      timeframe: 'short-term',
      category: 'Network Optimization',
      successMetrics: ['Network density > 40%', 'Average connections per node > 2', 'Isolated nodes < 10%']
    });
  }
  
  return recommendations;
}

/**
 * Generate confidence improvement recommendations
 */
function generateConfidenceRecommendations(nodes: Node[], analytics: AnalyticsData): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = [];
  
  if (analytics.confidenceMetrics.average < 0.7) {
    recommendations.push({
      id: 'confidence-enhancement',
      insight: 'Strategic elements show below-optimal confidence levels',
      recommendation: 'Conduct additional research and validation for low-confidence strategic elements',
      priority: 'high',
      impact: 'significant',
      effort: 'medium',
      timeframe: 'medium-term',
      category: 'Quality Assurance',
      successMetrics: ['Average confidence > 70%', 'High-confidence elements > 60%', 'Low-confidence elements < 20%']
    });
  }
  
  return recommendations;
}

/**
 * Generate risk mitigation recommendations
 */
function generateRiskRecommendations(nodes: Node[], analytics: AnalyticsData): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = [];
  
  const riskNodes = nodes.filter(node => node.type === 'risk').length;
  if (riskNodes / nodes.length < 0.1 && nodes.length > 10) {
    recommendations.push({
      id: 'risk-assessment',
      insight: 'Strategic framework lacks comprehensive risk analysis',
      recommendation: 'Expand risk assessment to identify and document potential strategic threats and mitigation strategies',
      priority: 'medium',
      impact: 'moderate',
      effort: 'medium',
      timeframe: 'short-term',
      category: 'Risk Management',
      successMetrics: ['Risk elements > 10% of total', 'Risk mitigation plans documented', 'Risk-decision connections established']
    });
  }
  
  return recommendations;
}

/**
 * Generate strategic enhancement recommendations
 */
function generateStrategicRecommendations(insights: ProcessedInsight[], analytics: AnalyticsData): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = [];
  
  const highImpactInsights = insights.filter(insight => insight.impact === 'high');
  if (highImpactInsights.length > 0) {
    recommendations.push({
      id: 'insight-implementation',
      insight: `${highImpactInsights.length} high-impact insights identified requiring strategic action`,
      recommendation: 'Prioritize implementation of high-impact insights to maximize strategic value realization',
      priority: 'critical',
      impact: 'transformational',
      effort: 'high',
      timeframe: 'medium-term',
      category: 'Strategic Implementation',
      successMetrics: ['High-impact insights implemented', 'Strategic value metrics improved', 'Stakeholder alignment achieved']
    });
  }
  
  return recommendations;
}