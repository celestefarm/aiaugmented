/**
 * Strategic Analysis Service
 * Bridges frontend LastMileBrief components with backend strategist blueprint engine
 */

import {
  strategicInteractWithAgent,
  StrategicInteractionRequest,
  StrategicInteractionResponse,
  LightningBrief,
  StrategicOption,
  Node,
  Edge
} from '../lib/api';
import {
  generateStrategicOutlook,
  generateActionableRecommendations,
  StrategicOutlook,
  ActionableRecommendation
} from '../components/LastMileBrief/utils/strategicAnalysis';
import {
  AnalyticsData,
  VisualizationData,
  ProcessedInsight
} from '../components/LastMileBrief/LastMileBriefCanvas';

export interface EnhancedStrategicAnalysis {
  lightningBrief?: LightningBrief;
  strategicOutlook: StrategicOutlook;
  recommendations: ActionableRecommendation[];
  riskAssessment: {
    risks: Array<{
      category: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      probability: 'high' | 'medium' | 'low';
      mitigation: string;
    }>;
    overallRiskLevel: 'high' | 'medium' | 'low';
  };
  analytics: AnalyticsData;
  visualizations: VisualizationData[];
  insights: ProcessedInsight[];
  sessionId: string;
  currentPhase: string;
}

export class StrategicAnalysisService {
  private static instance: StrategicAnalysisService;
  private activeSessions: Map<string, string> = new Map(); // workspaceId -> sessionId

  static getInstance(): StrategicAnalysisService {
    if (!StrategicAnalysisService.instance) {
      StrategicAnalysisService.instance = new StrategicAnalysisService();
    }
    return StrategicAnalysisService.instance;
  }

  /**
   * Generate enhanced strategic analysis using backend strategist blueprint
   */
  async generateEnhancedAnalysis(
    nodes: Node[], 
    edges: Edge[], 
    workspaceId: string,
    customPrompt?: string
  ): Promise<EnhancedStrategicAnalysis> {
    try {
      console.log('=== STRATEGIC ANALYSIS SERVICE ===');
      console.log('Generating enhanced analysis for workspace:', workspaceId);
      console.log('Nodes count:', nodes.length);
      console.log('Edges count:', edges.length);

      // Prepare strategic context from nodes and edges
      const strategicContext = this.prepareStrategicContext(nodes, edges);
      
      // Get or create session for this workspace
      const sessionId = this.activeSessions.get(workspaceId);
      
      // Create strategic interaction request
      const prompt = customPrompt || this.generateAnalysisPrompt(nodes, edges);
      
      const request: StrategicInteractionRequest = {
        agent_id: 'strategist',
        prompt,
        context: strategicContext,
        session_id: sessionId,
        enable_red_team: false // Start without red team for initial analysis
      };

      console.log('Strategic interaction request:', request);

      // Call backend strategist
      const response = await strategicInteractWithAgent(request);
      
      console.log('Strategic interaction response:', response);

      // Store session ID for future interactions
      this.activeSessions.set(workspaceId, response.session_id);

      // Generate frontend analytics using existing utilities
      const analytics = this.generateAnalytics(nodes, edges, response);
      const visualizations = this.generateVisualizations(nodes, edges, response);
      const insights = this.generateInsights(nodes, edges, response);

      // Generate enhanced recommendations using backend data
      const recommendations = this.generateEnhancedRecommendations(response);
      const riskAssessment = this.generateEnhancedRiskAssessment(response);
      const strategicOutlook = this.generateEnhancedOutlook(response);

      const result: EnhancedStrategicAnalysis = {
        lightningBrief: response.lightning_brief,
        strategicOutlook,
        recommendations,
        riskAssessment,
        analytics,
        visualizations,
        insights,
        sessionId: response.session_id,
        currentPhase: response.current_phase
      };

      console.log('Enhanced strategic analysis generated:', result);
      return result;

    } catch (error) {
      console.error('Strategic analysis service error:', error);
      
      // Fallback to frontend-only analysis if backend fails
      console.log('Falling back to frontend-only analysis');
      return this.generateFallbackAnalysis(nodes, edges, workspaceId);
    }
  }

  /**
   * Continue strategic analysis in a specific phase
   */
  async continueAnalysis(
    workspaceId: string,
    prompt: string,
    forcePhase?: string,
    enableRedTeam: boolean = false
  ): Promise<EnhancedStrategicAnalysis> {
    const sessionId = this.activeSessions.get(workspaceId);
    
    if (!sessionId) {
      throw new Error('No active strategic session found for this workspace');
    }

    const request: StrategicInteractionRequest = {
      agent_id: 'strategist',
      prompt,
      session_id: sessionId,
      force_phase: forcePhase,
      enable_red_team: enableRedTeam
    };

    const response = await strategicInteractWithAgent(request);

    // Generate updated analysis based on continued session
    return this.processStrategicResponse(response, workspaceId);
  }

  /**
   * Generate Lightning Brief using backend strategist
   */
  async generateLightningBrief(workspaceId: string): Promise<LightningBrief | null> {
    try {
      const sessionId = this.activeSessions.get(workspaceId);
      
      if (!sessionId) {
        console.warn('No active session for lightning brief generation');
        return null;
      }

      const request: StrategicInteractionRequest = {
        agent_id: 'strategist',
        prompt: 'Generate a comprehensive Lightning Brief based on our strategic analysis.',
        session_id: sessionId,
        force_phase: 'briefing'
      };

      const response = await strategicInteractWithAgent(request);
      return response.lightning_brief || null;

    } catch (error) {
      console.error('Lightning brief generation error:', error);
      return null;
    }
  }

  private prepareStrategicContext(nodes: Node[], edges: Edge[]): Record<string, any> {
    return {
      workspace_data: {
        node_count: nodes.length,
        edge_count: edges.length,
        node_types: this.getNodeTypeDistribution(nodes),
        edge_types: this.getEdgeTypeDistribution(edges),
        key_themes: this.extractKeyThemes(nodes),
        relationship_patterns: this.analyzeRelationshipPatterns(edges)
      },
      analysis_request: {
        focus_areas: ['strategic_options', 'risk_assessment', 'opportunity_identification'],
        depth_level: 'comprehensive',
        include_assumptions: true,
        generate_alternatives: true
      }
    };
  }

  private generateAnalysisPrompt(nodes: Node[], edges: Edge[]): string {
    const nodeTypes = this.getNodeTypeDistribution(nodes);
    const keyThemes = this.extractKeyThemes(nodes);
    
    return `I need a comprehensive strategic analysis of this workspace containing ${nodes.length} nodes and ${edges.length} connections.

Key Elements:
- Node Types: ${Object.entries(nodeTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}
- Key Themes: ${keyThemes.join(', ')}

Please analyze this strategic landscape and provide:
1. Strategic options based on the evidence
2. Risk assessment and mitigation strategies  
3. Opportunity identification and prioritization
4. Critical assumptions that need validation
5. Recommended next actions

Focus on actionable insights that can drive strategic decision-making.`;
  }

  private generateEnhancedRecommendations(response: StrategicInteractionResponse): ActionableRecommendation[] {
    const recommendations: ActionableRecommendation[] = [];

    // Extract recommendations from lightning brief
    if (response.lightning_brief?.strategic_options) {
      response.lightning_brief.strategic_options.forEach((option: StrategicOption, index: number) => {
        recommendations.push({
          id: `strategic-option-${index}`,
          insight: `Strategic option identified: ${option.title}`,
          recommendation: option.description,
          priority: index === 0 ? 'critical' : index === 1 ? 'high' : 'medium',
          impact: option.confidence_score > 0.8 ? 'transformational' : option.confidence_score > 0.6 ? 'significant' : 'moderate',
          effort: this.estimateEffort(option.confidence_score),
          timeframe: this.estimateTimeframe(option.confidence_score),
          category: 'Strategic Implementation',
          successMetrics: option.success_criteria || [`Implement ${option.title}`, 'Monitor progress', 'Measure impact']
        });
      });
    }

    // Extract from next actions
    if (response.lightning_brief?.next_actions) {
      response.lightning_brief.next_actions.forEach((action: string, index: number) => {
        recommendations.push({
          id: `next-action-${index}`,
          insight: 'Immediate action required',
          recommendation: action,
          priority: index < 2 ? 'high' : 'medium',
          impact: 'moderate',
          effort: 'medium',
          timeframe: 'immediate',
          category: 'Next Actions',
          successMetrics: ['Complete action', 'Document results', 'Review impact']
        });
      });
    }

    return recommendations;
  }

  private generateEnhancedRiskAssessment(response: StrategicInteractionResponse): {
    risks: Array<{
      category: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      probability: 'high' | 'medium' | 'low';
      mitigation: string;
    }>;
    overallRiskLevel: 'high' | 'medium' | 'low';
  } {
    const risks = [];

    // Extract risks from strategic options
    if (response.lightning_brief?.strategic_options) {
      response.lightning_brief.strategic_options.forEach((option: StrategicOption) => {
        if (option.risk_factors) {
          option.risk_factors.forEach((risk: string) => {
            risks.push({
              category: 'Strategic Risk',
              description: risk,
              impact: this.assessRiskImpact(risk),
              probability: this.assessRiskProbability(option.confidence_score),
              mitigation: `Monitor and develop contingency plans for ${option.title}`
            });
          });
        }
      });
    }

    // Extract from critical assumptions
    if (response.lightning_brief?.critical_assumptions) {
      response.lightning_brief.critical_assumptions.forEach((assumption: string) => {
        risks.push({
          category: 'Assumption Risk',
          description: `Risk if assumption proves false: ${assumption}`,
          impact: 'medium',
          probability: 'medium',
          mitigation: 'Validate assumption through additional research and testing'
        });
      });
    }

    return {
      risks,
      overallRiskLevel: this.calculateOverallRiskLevel(risks)
    };
  }

  private generateEnhancedOutlook(response: StrategicInteractionResponse): StrategicOutlook {
    if (response.lightning_brief?.situation_summary) {
      return {
        summary: response.lightning_brief.situation_summary,
        keyImplications: response.lightning_brief.key_insights || [],
        riskFactors: response.lightning_brief.critical_assumptions || [],
        opportunities: response.lightning_brief.strategic_options?.map(opt => opt.title) || [],
        timeHorizon: 'medium-term',
        confidence: 0.8
      };
    }

    // Fallback to basic outlook
    return {
      summary: 'Strategic analysis in progress',
      keyImplications: [],
      riskFactors: [],
      opportunities: [],
      timeHorizon: 'short-term',
      confidence: 0.5
    };
  }

  private generateAnalytics(nodes: Node[], edges: Edge[], response: StrategicInteractionResponse): AnalyticsData {
    return {
      nodeDistribution: {
        byType: this.getNodeTypeDistribution(nodes),
        byConfidence: this.getConfidenceDistribution(nodes),
        bySource: {},
        byCreationDate: {}
      },
      connectionAnalysis: {
        totalConnections: edges.length,
        connectionTypes: this.getEdgeTypeDistribution(edges),
        averageConnections: edges.length / Math.max(nodes.length, 1),
        networkDensity: edges.length / Math.max(nodes.length * (nodes.length - 1), 1),
        centralityMetrics: {
          betweenness: {},
          closeness: {},
          degree: {}
        }
      },
      confidenceMetrics: {
        average: nodes.reduce((sum, node) => sum + (node.confidence || 0.5), 0) / Math.max(nodes.length, 1),
        distribution: this.getConfidenceDistribution(nodes),
        highConfidenceNodes: nodes.filter(n => (n.confidence || 0.5) > 0.7).length,
        lowConfidenceNodes: nodes.filter(n => (n.confidence || 0.5) < 0.4).length
      },
      temporalAnalysis: {
        creationTrend: {},
        activityPattern: {}
      },
      clusterAnalysis: {
        clusters: [],
        totalClusters: 0,
        averageClusterSize: 0
      }
    };
  }

  private generateVisualizations(nodes: Node[], edges: Edge[], response: StrategicInteractionResponse): VisualizationData[] {
    return [{
      id: 'strategic-overview',
      type: 'bar-chart',
      title: 'Strategic Analysis Overview',
      description: 'Current phase progress and key metrics',
      data: {
        phaseProgress: this.calculatePhaseProgress(response),
        confidenceLevel: response.lightning_brief?.confidence_level || 'medium',
        analysisDepth: response.strategic_data.evidence_count > 5 ? 'deep' : 'surface'
      },
      config: {
        width: 400,
        height: 300,
        theme: 'dark',
        interactive: true
      },
      insights: [`Currently in ${response.current_phase} phase`],
      interactivity: {
        clickable: true,
        hoverable: true,
        zoomable: false,
        draggable: false
      }
    }];
  }

  private generateInsights(nodes: Node[], edges: Edge[], response: StrategicInteractionResponse): ProcessedInsight[] {
    const insights = [];

    // Add insights from lightning brief
    if (response.lightning_brief?.key_insights) {
      insights.push(...response.lightning_brief.key_insights.map((insight: string) => ({
        type: 'strategic' as const,
        title: 'Strategic Insight',
        description: insight,
        confidence: 0.8,
        impact: 'high' as const
      })));
    }

    // Add phase-specific insights
    insights.push({
      type: 'process' as const,
      title: `${response.current_phase.charAt(0).toUpperCase() + response.current_phase.slice(1)} Phase`,
      description: `Currently in ${response.current_phase} phase of strategic analysis`,
      confidence: 1.0,
      impact: 'medium' as const
    });

    return insights;
  }

  private generateFallbackAnalysis(nodes: Node[], edges: Edge[], workspaceId: string): EnhancedStrategicAnalysis {
    console.log('Generating fallback analysis using frontend utilities');
    
    // Create basic analytics data
    const analytics: AnalyticsData = {
      nodeDistribution: {
        byType: this.getNodeTypeDistribution(nodes),
        byConfidence: this.getConfidenceDistribution(nodes),
        bySource: {},
        byCreationDate: {}
      },
      connectionAnalysis: {
        totalConnections: edges.length,
        connectionTypes: this.getEdgeTypeDistribution(edges),
        averageConnections: edges.length / Math.max(nodes.length, 1),
        networkDensity: edges.length / Math.max(nodes.length * (nodes.length - 1), 1),
        centralityMetrics: {
          betweenness: {},
          closeness: {},
          degree: {}
        }
      },
      confidenceMetrics: {
        average: nodes.reduce((sum, node) => sum + (node.confidence || 0.5), 0) / Math.max(nodes.length, 1),
        distribution: this.getConfidenceDistribution(nodes),
        highConfidenceNodes: nodes.filter(n => (n.confidence || 0.5) > 0.7).length,
        lowConfidenceNodes: nodes.filter(n => (n.confidence || 0.5) < 0.4).length
      },
      temporalAnalysis: {
        creationTrend: {},
        activityPattern: {}
      },
      clusterAnalysis: {
        clusters: [],
        totalClusters: 0,
        averageClusterSize: 0
      }
    };

    const insights: ProcessedInsight[] = [{
      id: 'fallback-1',
      type: 'pattern',
      title: 'Fallback Analysis',
      description: 'Using frontend-only analysis due to backend unavailability',
      confidence: 0.6,
      impact: 'medium',
      category: 'System',
      supportingData: [],
      visualizations: []
    }];

    // Generate strategic outlook using the utility function
    const strategicOutlook = generateStrategicOutlook(nodes, edges, analytics, insights);
    
    // Generate recommendations using the utility function
    const recommendations = generateActionableRecommendations(nodes, edges, analytics, insights);
    
    return {
      strategicOutlook,
      recommendations,
      riskAssessment: {
        risks: [{
          category: 'System Risk',
          description: 'Backend strategic analysis unavailable',
          impact: 'medium',
          probability: 'high',
          mitigation: 'Restore backend connectivity for enhanced analysis'
        }],
        overallRiskLevel: 'medium'
      },
      analytics,
      visualizations: [],
      insights,
      sessionId: `fallback_${workspaceId}_${Date.now()}`,
      currentPhase: 'reconnaissance'
    };
  }

  private processStrategicResponse(response: StrategicInteractionResponse, workspaceId: string): EnhancedStrategicAnalysis {
    // This would be similar to generateEnhancedAnalysis but for continued sessions
    // Implementation would be similar to the main analysis method
    throw new Error('Method not implemented yet');
  }

  // Utility methods
  private getNodeTypeDistribution(nodes: Node[]): Record<string, number> {
    return nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getEdgeTypeDistribution(edges: Edge[]): Record<string, number> {
    return edges.reduce((acc, edge) => {
      acc[edge.type] = (acc[edge.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getConfidenceDistribution(nodes: Node[]): { high: number; medium: number; low: number } {
    const distribution = { high: 0, medium: 0, low: 0 };
    
    nodes.forEach(node => {
      const confidence = node.confidence || 0.5;
      if (confidence > 0.7) {
        distribution.high++;
      } else if (confidence > 0.4) {
        distribution.medium++;
      } else {
        distribution.low++;
      }
    });
    
    return distribution;
  }

  private extractKeyThemes(nodes: Node[]): string[] {
    // Extract common words from node titles and descriptions
    const words = nodes.flatMap(node => 
      `${node.title} ${node.description}`.toLowerCase().split(/\s+/)
    );
    
    const wordCounts = words.reduce((acc, word) => {
      if (word.length > 3) { // Filter out short words
        acc[word] = (acc[word] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private analyzeRelationshipPatterns(edges: Edge[]): Record<string, number> {
    return this.getEdgeTypeDistribution(edges);
  }

  private estimateTimeframe(confidence: number): 'immediate' | 'short-term' | 'medium-term' | 'long-term' {
    if (confidence > 0.8) return 'short-term';
    if (confidence > 0.6) return 'medium-term';
    return 'long-term';
  }

  private estimateEffort(confidence: number): 'low' | 'medium' | 'high' | 'extensive' {
    if (confidence > 0.8) return 'medium';
    if (confidence > 0.6) return 'high';
    return 'extensive';
  }

  private assessRiskImpact(risk: string): 'high' | 'medium' | 'low' {
    const highImpactKeywords = ['critical', 'major', 'significant', 'severe'];
    const lowImpactKeywords = ['minor', 'small', 'limited'];
    
    const riskLower = risk.toLowerCase();
    if (highImpactKeywords.some(keyword => riskLower.includes(keyword))) return 'high';
    if (lowImpactKeywords.some(keyword => riskLower.includes(keyword))) return 'low';
    return 'medium';
  }

  private assessRiskProbability(confidence: number): 'high' | 'medium' | 'low' {
    // Lower confidence in strategic option suggests higher risk probability
    if (confidence < 0.4) return 'high';
    if (confidence < 0.7) return 'medium';
    return 'low';
  }

  private calculateOverallRiskLevel(risks: Array<{impact: string; probability: string}>): 'high' | 'medium' | 'low' {
    const highRiskCount = risks.filter(r => r.impact === 'high' || r.probability === 'high').length;
    const totalRisks = risks.length;
    
    if (totalRisks === 0) return 'low';
    if (highRiskCount / totalRisks > 0.5) return 'high';
    if (highRiskCount / totalRisks > 0.2) return 'medium';
    return 'low';
  }

  private calculatePhaseProgress(response: StrategicInteractionResponse): number {
    const phaseOrder = ['reconnaissance', 'analysis', 'synthesis', 'validation', 'briefing'];
    const currentIndex = phaseOrder.indexOf(response.current_phase);
    return currentIndex >= 0 ? (currentIndex + 1) / phaseOrder.length : 0.2;
  }

  private findCentralNodes(nodes: Node[], edges: Edge[]): string[] {
    const nodeDegrees = nodes.map(node => ({
      id: node.id,
      degree: edges.filter(edge => edge.from_node_id === node.id || edge.to_node_id === node.id).length
    }));

    return nodeDegrees
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 3)
      .map(node => node.id);
  }
}

// Export singleton instance
export const strategicAnalysisService = StrategicAnalysisService.getInstance();