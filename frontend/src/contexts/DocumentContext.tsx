import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GenerateBriefResponse, apiClient } from '../lib/api';
import { BriefData, AnalyticsData, VisualizationData, ProcessedInsight, KeyMetric, ExecutiveInsight, Recommendation } from '../components/LastMileBrief/index';
import { Node, Edge } from '../lib/api';
import { strategicAnalysisService, EnhancedStrategicAnalysis } from '../services/strategicAnalysisService';

interface DocumentState {
  briefContent: string | null;
  isGenerating: boolean;
  lastGenerated: string | null;
  nodeCount: number;
  edgeCount: number;
  error: string | null;
  // Enhanced state for new brief functionality
  enhancedBriefData: BriefData | null;
  analytics: AnalyticsData | null;
  visualizations: VisualizationData[];
  insights: ProcessedInsight[];
  isLoadingEnhanced: boolean;
  // Strategic analysis integration
  strategicAnalysis: EnhancedStrategicAnalysis | null;
  strategicSessionId: string | null;
}

interface DocumentContextType {
  documentState: DocumentState;
  generateBriefForWorkspace: (workspaceId: string) => Promise<void>;
  generateEnhancedBrief: (workspaceId: string, options?: EnhancedBriefOptions) => Promise<void>;
  clearBrief: () => void;
  setBriefContent: (content: string) => void;
  refreshAnalytics: (workspaceId: string) => Promise<void>;
  exportBrief: (workspaceId: string, format: ExportFormat) => Promise<void>;
}

interface EnhancedBriefOptions {
  includeAnalytics?: boolean;
  includeVisualizations?: boolean;
  includeInsights?: boolean;
  format?: 'standard' | 'executive' | 'detailed';
}

type ExportFormat = 'pdf' | 'json' | 'csv';

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

interface DocumentProviderProps {
  children: ReactNode;
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ children }) => {
  const [documentState, setDocumentState] = useState<DocumentState>({
    briefContent: null,
    isGenerating: false,
    lastGenerated: null,
    nodeCount: 0,
    edgeCount: 0,
    error: null,
    enhancedBriefData: null,
    analytics: null,
    visualizations: [],
    insights: [],
    isLoadingEnhanced: false,
    strategicAnalysis: null,
    strategicSessionId: null,
  });

  const generateBriefForWorkspace = async (workspaceId: string): Promise<void> => {
    setDocumentState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    try {
      const response: GenerateBriefResponse = await apiClient.generateBrief(workspaceId);
      
      setDocumentState(prev => ({
        ...prev,
        briefContent: response.content,
        lastGenerated: response.generated_at,
        nodeCount: response.node_count,
        edgeCount: response.edge_count,
        isGenerating: false,
        error: null,
      }));
    } catch (error) {
      setDocumentState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate brief',
      }));
    }
  };

  const generateEnhancedBrief = async (workspaceId: string, options: EnhancedBriefOptions = {}): Promise<void> => {
    console.log('=== ENHANCED BRIEF GENERATION WITH STRATEGIC ANALYSIS ===');
    console.log('Workspace ID:', workspaceId);
    console.log('Options:', options);
    
    // Validate workspace ID is provided
    if (!workspaceId || workspaceId.trim() === '') {
      console.error('CRITICAL: No workspace ID provided to generateEnhancedBrief');
      setDocumentState(prev => ({
        ...prev,
        isLoadingEnhanced: false,
        error: 'No workspace ID provided - please select a valid workspace',
      }));
      return;
    }
    
    setDocumentState(prev => ({
      ...prev,
      isLoadingEnhanced: true,
      error: null,
    }));

    try {
      console.log('Step 1: Fetching nodes and edges...');
      // Fetch nodes and edges for enhanced processing
      const [nodesResponse, edgesResponse] = await Promise.all([
        apiClient.getNodes(workspaceId),
        apiClient.getEdges(workspaceId)
      ]);
      
      console.log('Nodes response:', nodesResponse);
      console.log('Edges response:', edgesResponse);
      
      // CRITICAL: Check if responses are valid
      if (!nodesResponse || !nodesResponse.nodes) {
        console.error('CRITICAL: Invalid nodes response');
        throw new Error('Failed to fetch nodes - API returned invalid data');
      }
      
      if (!edgesResponse || !edgesResponse.edges) {
        console.error('CRITICAL: Invalid edges response');
        throw new Error('Failed to fetch edges - API returned invalid data');
      }

      console.log('Step 2: Generating strategic analysis with backend integration...');
      // Use the strategic analysis service to get enhanced analysis
      let strategicAnalysis: EnhancedStrategicAnalysis;
      
      try {
        strategicAnalysis = await strategicAnalysisService.generateEnhancedAnalysis(
          nodesResponse.nodes,
          edgesResponse.edges,
          workspaceId
        );
        console.log('Strategic analysis generated:', strategicAnalysis);
      } catch (strategicError) {
        console.warn('Strategic analysis service failed, using fallback:', strategicError);
        // Fallback to basic analysis if strategic service fails
        const analytics = generateAnalyticsFromData(nodesResponse.nodes, edgesResponse.edges);
        const visualizations = generateVisualizationsFromData(nodesResponse.nodes, edgesResponse.edges);
        const insights = generateInsightsFromData(nodesResponse.nodes, edgesResponse.edges, analytics);
        
        strategicAnalysis = {
          strategicOutlook: {
            summary: 'Strategic analysis using fallback method',
            keyImplications: [],
            riskFactors: [],
            opportunities: [],
            timeHorizon: 'medium-term',
            confidence: 0.6
          },
          recommendations: [],
          riskAssessment: {
            risks: [],
            overallRiskLevel: 'medium'
          },
          analytics,
          visualizations,
          insights,
          sessionId: `fallback_${workspaceId}_${Date.now()}`,
          currentPhase: 'reconnaissance'
        };
      }

      console.log('Step 3: Generating basic brief for content...');
      // Generate basic brief for content (fallback gracefully if it fails)
      let basicBrief: GenerateBriefResponse;
      try {
        basicBrief = await apiClient.generateBrief(workspaceId);
      } catch (briefError) {
        console.warn('Basic brief generation failed, using strategic analysis content:', briefError);
        basicBrief = {
          content: strategicAnalysis.strategicOutlook.summary,
          generated_at: new Date().toISOString(),
          node_count: nodesResponse.nodes.length,
          edge_count: edgesResponse.edges.length
        };
      }

      console.log('Step 4: Creating enhanced brief data...');
      // Create enhanced brief data using strategic analysis
      const enhancedBriefData: BriefData = {
        id: `brief-${workspaceId}-${Date.now()}`,
        workspaceId: workspaceId,
        title: `Strategic Brief: AI-Enhanced Analysis`,
        generatedAt: new Date(),
        version: '2.0',
        metadata: {
          generatedAt: new Date(basicBrief.generated_at),
          nodeCount: basicBrief.node_count,
          edgeCount: basicBrief.edge_count,
          confidenceScore: strategicAnalysis.analytics.confidenceMetrics.average,
          lastModified: new Date()
        },
        executiveSummary: {
          keyMetrics: generateKeyMetrics(strategicAnalysis.analytics),
          insights: generateExecutiveInsights(strategicAnalysis.insights),
          recommendations: strategicAnalysis.recommendations && Array.isArray(strategicAnalysis.recommendations)
            ? strategicAnalysis.recommendations.map(rec => ({
                id: rec.id,
                title: rec.recommendation,
                description: rec.insight,
                priority: rec.priority === 'critical' ? 'high' : rec.priority,
                impact: rec.impact === 'transformational' ? 'high' : rec.impact === 'significant' ? 'medium' : 'low',
                effort: rec.effort === 'extensive' ? 'high' : rec.effort,
                category: rec.category
              }))
            : []
        },
        analytics: strategicAnalysis.analytics,
        visualizations: strategicAnalysis.visualizations,
        insights: strategicAnalysis.insights,
        recommendations: strategicAnalysis.recommendations && Array.isArray(strategicAnalysis.recommendations)
          ? strategicAnalysis.recommendations.map(rec => ({
              id: rec.id,
              title: rec.recommendation,
              description: rec.insight,
              priority: rec.priority === 'critical' ? 'high' : rec.priority,
              impact: rec.impact === 'transformational' ? 'high' : rec.impact === 'significant' ? 'medium' : 'low',
              effort: rec.effort === 'extensive' ? 'high' : rec.effort,
              category: rec.category
            }))
          : [],
        rawData: {
          nodes: nodesResponse.nodes,
          edges: edgesResponse.edges
        }
      };
      
      console.log('Enhanced brief data created:', enhancedBriefData);

      console.log('Step 5: Updating document state...');
      setDocumentState(prev => ({
        ...prev,
        briefContent: basicBrief.content,
        lastGenerated: basicBrief.generated_at,
        nodeCount: basicBrief.node_count,
        edgeCount: basicBrief.edge_count,
        enhancedBriefData,
        analytics: strategicAnalysis.analytics,
        visualizations: strategicAnalysis.visualizations,
        insights: strategicAnalysis.insights,
        strategicAnalysis,
        strategicSessionId: strategicAnalysis.sessionId,
        isGenerating: false,
        isLoadingEnhanced: false,
        error: null,
      }));
      
      console.log('Enhanced brief generation with strategic analysis completed successfully');
    } catch (error) {
      console.error('=== ENHANCED BRIEF GENERATION ERROR ===');
      console.error('Error occurred during enhanced brief generation');
      console.error('Error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate enhanced brief';
      console.error('Setting error state:', errorMessage);
      
      setDocumentState(prev => ({
        ...prev,
        isGenerating: false,
        isLoadingEnhanced: false,
        error: errorMessage,
      }));
    }
  };

  const refreshAnalytics = async (workspaceId: string): Promise<void> => {
    try {
      const [nodesResponse, edgesResponse] = await Promise.all([
        apiClient.getNodes(workspaceId),
        apiClient.getEdges(workspaceId)
      ]);

      const analytics = generateAnalyticsFromData(nodesResponse.nodes, edgesResponse.edges);
      
      setDocumentState(prev => ({
        ...prev,
        analytics,
        error: null,
      }));
    } catch (error) {
      setDocumentState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh analytics',
      }));
    }
  };

  const exportBrief = async (workspaceId: string, format: ExportFormat): Promise<void> => {
    try {
      // For now, use the existing export functionality
      // In a real implementation, this would support multiple formats
      if (format === 'json') {
        await apiClient.exportWorkspace(workspaceId);
      } else {
        throw new Error(`Export format ${format} not yet implemented`);
      }
    } catch (error) {
      setDocumentState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to export brief',
      }));
    }
  };

  const clearBrief = (): void => {
    setDocumentState(prev => ({
      ...prev,
      briefContent: null,
      lastGenerated: null,
      nodeCount: 0,
      edgeCount: 0,
      error: null,
      enhancedBriefData: null,
      analytics: null,
      visualizations: [],
      insights: [],
      strategicAnalysis: null,
      strategicSessionId: null,
    }));
  };

  const setBriefContent = (content: string): void => {
    setDocumentState(prev => ({
      ...prev,
      briefContent: content,
    }));
  };

  const value: DocumentContextType = {
    documentState,
    generateBriefForWorkspace,
    generateEnhancedBrief,
    clearBrief,
    setBriefContent,
    refreshAnalytics,
    exportBrief,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = (): DocumentContextType => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};

// Utility functions for data processing
function generateAnalyticsFromData(nodes: Node[], edges: Edge[]): AnalyticsData {
  // Add safety checks for nodes and edges arrays
  const safeNodes = nodes && Array.isArray(nodes) ? nodes : [];
  const safeEdges = edges && Array.isArray(edges) ? edges : [];
  
  console.log('📈 [DocumentContext] generateAnalyticsFromData called:', {
    nodesCount: safeNodes.length,
    edgesCount: safeEdges.length,
    nodesType: typeof nodes,
    edgesType: typeof edges,
    nodesIsArray: Array.isArray(nodes),
    edgesIsArray: Array.isArray(edges)
  });

  const nodesByType = safeNodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const confidenceDistribution = safeNodes.reduce((acc, node) => {
    const confidence = node.confidence || 50;
    if (confidence >= 80) acc.high++;
    else if (confidence >= 60) acc.medium++;
    else acc.low++;
    return acc;
  }, { high: 0, medium: 0, low: 0 });

  const connectionTypes = safeEdges.reduce((acc, edge) => {
    acc[edge.type] = (acc[edge.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const averageConfidence = safeNodes.length > 0
    ? safeNodes.reduce((sum, node) => sum + (node.confidence || 50), 0) / safeNodes.length / 100
    : 0;

  return {
    nodeDistribution: {
      byType: nodesByType,
      byConfidence: confidenceDistribution,
      bySource: { 'user': safeNodes.length, 'ai-generated': 0 },
      byCreationDate: {}
    },
    connectionAnalysis: {
      totalConnections: safeEdges.length,
      connectionTypes,
      averageConnections: safeNodes.length > 0 ? safeEdges.length / safeNodes.length : 0,
      networkDensity: safeNodes.length > 1 ? (2 * safeEdges.length) / (safeNodes.length * (safeNodes.length - 1)) : 0,
      centralityMetrics: {
        betweenness: {},
        closeness: {},
        degree: {}
      }
    },
    confidenceMetrics: {
      average: averageConfidence,
      distribution: confidenceDistribution,
      highConfidenceNodes: confidenceDistribution.high,
      lowConfidenceNodes: confidenceDistribution.low
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

function generateVisualizationsFromData(nodes: Node[], edges: Edge[]): VisualizationData[] {
  // Add safety checks for nodes and edges arrays
  const safeNodes = nodes && Array.isArray(nodes) ? nodes : [];
  const safeEdges = edges && Array.isArray(edges) ? edges : [];
  
  console.log('📊 [DocumentContext] generateVisualizationsFromData called:', {
    nodesCount: safeNodes.length,
    edgesCount: safeEdges.length
  });

  return [
    {
      id: 'node-network-viz',
      type: 'node-network',
      title: 'Strategic Network Overview',
      description: 'Interactive visualization of all strategic elements and their relationships',
      data: { nodes: safeNodes, edges: safeEdges },
      config: {
        width: 800,
        height: 600,
        theme: 'luxury',
        interactive: true
      },
      insights: ['Network shows strong clustering around decision nodes'],
      interactivity: {
        clickable: true,
        hoverable: true,
        zoomable: true,
        draggable: true
      }
    }
  ];
}

function generateInsightsFromData(nodes: Node[], edges: Edge[], analytics: AnalyticsData): ProcessedInsight[] {
  // Add safety checks for nodes and edges arrays
  const safeNodes = nodes && Array.isArray(nodes) ? nodes : [];
  const safeEdges = edges && Array.isArray(edges) ? edges : [];
  
  console.log('💡 [DocumentContext] generateInsightsFromData called:', {
    nodesCount: safeNodes.length,
    edgesCount: safeEdges.length,
    analyticsProvided: !!analytics
  });

  const insights: ProcessedInsight[] = [];

  // Network density insight
  if (analytics.connectionAnalysis.networkDensity > 0.5) {
    insights.push({
      id: 'network-density',
      type: 'pattern',
      title: 'High Network Connectivity',
      description: 'The strategic network shows strong interconnectedness, indicating well-integrated planning.',
      confidence: 0.85,
      impact: 'high',
      category: 'network-analysis',
      supportingData: [
        { type: 'density', value: analytics.connectionAnalysis.networkDensity.toFixed(2), source: 'network-analysis' }
      ],
      visualizations: ['node-network-viz']
    });
  }

  // Node type distribution insight
  const dominantType = Object.entries(analytics.nodeDistribution.byType)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (dominantType) {
    insights.push({
      id: 'dominant-node-type',
      type: 'trend',
      title: `${dominantType[0].charAt(0).toUpperCase() + dominantType[0].slice(1)} Elements Dominate`,
      description: `${dominantType[0]} elements represent the largest category in your strategic framework.`,
      confidence: 0.9,
      impact: 'medium',
      category: 'composition-analysis',
      supportingData: [
        { type: 'count', value: dominantType[1], source: 'node-analysis' }
      ],
      visualizations: []
    });
  }

  return insights;
}

function generateKeyMetrics(analytics: AnalyticsData): KeyMetric[] {
  return [
    {
      id: 'total-nodes',
      label: 'Strategic Elements',
      value: Object.values(analytics.nodeDistribution.byType).reduce((sum, count) => sum + count, 0),
      trend: 'up',
      significance: 'high',
      format: 'number'
    },
    {
      id: 'network-density',
      label: 'Network Density',
      value: `${(analytics.connectionAnalysis.networkDensity * 100).toFixed(1)}%`,
      trend: 'stable',
      significance: 'medium',
      format: 'percentage'
    },
    {
      id: 'confidence-score',
      label: 'Average Confidence',
      value: `${(analytics.confidenceMetrics.average * 100).toFixed(0)}%`,
      trend: 'up',
      significance: 'high',
      format: 'percentage'
    }
  ];
}

function generateExecutiveInsights(insights: ProcessedInsight[]): ExecutiveInsight[] {
  // Add safety checks for insights array
  const safeInsights = insights && Array.isArray(insights) ? insights : [];
  
  console.log('📊 [DocumentContext] generateExecutiveInsights called:', {
    insightsCount: safeInsights.length,
    insightsType: typeof insights,
    insightsIsArray: Array.isArray(insights)
  });

  return safeInsights.map(insight => ({
    id: insight.id,
    title: insight.title,
    description: insight.description,
    impact: insight.impact,
    confidence: insight.confidence,
    supportingData: insight.supportingData && Array.isArray(insight.supportingData)
      ? insight.supportingData.map(data => `${data.type}: ${data.value}`)
      : []
  }));
}

function generateRecommendations(analytics: AnalyticsData, insights: ProcessedInsight[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Low confidence recommendation
  if (analytics.confidenceMetrics.average < 0.7) {
    recommendations.push({
      id: 'improve-confidence',
      title: 'Strengthen Analysis Confidence',
      description: 'Consider adding more detailed analysis or validation to increase confidence scores.',
      priority: 'medium',
      impact: 'medium',
      effort: 'low',
      category: 'quality-improvement'
    });
  }

  // Network density recommendation
  if (analytics.connectionAnalysis.networkDensity < 0.3) {
    recommendations.push({
      id: 'increase-connections',
      title: 'Enhance Strategic Connections',
      description: 'The network could benefit from more interconnections between strategic elements.',
      priority: 'high',
      impact: 'high',
      effort: 'medium',
      category: 'network-optimization'
    });
  }

  return recommendations;
}