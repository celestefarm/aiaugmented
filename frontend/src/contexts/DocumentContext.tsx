import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GenerateBriefResponse, apiClient } from '../lib/api';
import { BriefData, AnalyticsData, VisualizationData, ProcessedInsight, KeyMetric, ExecutiveInsight, Recommendation } from '../components/LastMileBrief/index';
import { Node, Edge } from '../lib/api';

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
    console.log('=== ENHANCED BRIEF GENERATION DEBUG ===');
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
      console.log('Step 1: Generating basic brief...');
      // First generate the basic brief
      const basicBrief = await apiClient.generateBrief(workspaceId);
      console.log('Basic brief response:', basicBrief);
      
      // CRITICAL: Check if basicBrief is valid
      if (!basicBrief) {
        console.error('CRITICAL: basicBrief is null/undefined');
        throw new Error('Failed to generate basic brief - API returned null/undefined');
      }
      
      if (typeof basicBrief !== 'object') {
        console.error('CRITICAL: basicBrief is not an object:', typeof basicBrief, basicBrief);
        throw new Error('Failed to generate basic brief - API returned invalid data type');
      }
      
      console.log('Step 2: Fetching nodes and edges...');
      // Fetch nodes and edges for enhanced processing
      const [nodesResponse, edgesResponse] = await Promise.all([
        apiClient.getNodes(workspaceId),
        apiClient.getEdges(workspaceId)
      ]);
      
      console.log('Nodes response:', nodesResponse);
      console.log('Edges response:', edgesResponse);
      
      // CRITICAL: Check if responses are valid
      if (!nodesResponse) {
        console.error('CRITICAL: nodesResponse is null/undefined');
        throw new Error('Failed to fetch nodes - API returned null/undefined');
      }
      
      if (!edgesResponse) {
        console.error('CRITICAL: edgesResponse is null/undefined');
        throw new Error('Failed to fetch edges - API returned null/undefined');
      }
      
      if (!nodesResponse.nodes) {
        console.error('CRITICAL: nodesResponse.nodes is null/undefined');
        throw new Error('Failed to fetch nodes - nodes property is missing');
      }
      
      if (!edgesResponse.edges) {
        console.error('CRITICAL: edgesResponse.edges is null/undefined');
        throw new Error('Failed to fetch edges - edges property is missing');
      }

      console.log('Step 3: Generating analytics...');
      // Generate analytics data
      const analytics = generateAnalyticsFromData(nodesResponse.nodes, edgesResponse.edges);
      console.log('Analytics generated:', analytics);
      
      console.log('Step 4: Generating visualizations...');
      // Generate visualizations
      const visualizations = generateVisualizationsFromData(nodesResponse.nodes, edgesResponse.edges);
      console.log('Visualizations generated:', visualizations);
      
      console.log('Step 5: Generating insights...');
      // Generate insights
      const insights = generateInsightsFromData(nodesResponse.nodes, edgesResponse.edges, analytics);
      console.log('Insights generated:', insights);

      console.log('Step 6: Creating enhanced brief data...');
      // Create enhanced brief data
      const enhancedBriefData: BriefData = {
        id: `brief-${workspaceId}-${Date.now()}`,
        workspaceId: workspaceId,
        title: `Strategic Brief: Enhanced Analysis`,
        generatedAt: new Date(),
        version: '1.0',
        metadata: {
          generatedAt: new Date(basicBrief.generated_at),
          nodeCount: basicBrief.node_count,
          edgeCount: basicBrief.edge_count,
          confidenceScore: analytics.confidenceMetrics.average,
          lastModified: new Date()
        },
        executiveSummary: {
          keyMetrics: generateKeyMetrics(analytics),
          insights: generateExecutiveInsights(insights),
          recommendations: generateRecommendations(analytics, insights)
        },
        analytics,
        visualizations,
        insights,
        recommendations: [],
        rawData: {
          nodes: nodesResponse.nodes,
          edges: edgesResponse.edges
        }
      };
      
      console.log('Enhanced brief data created:', enhancedBriefData);

      console.log('Step 7: Updating document state...');
      setDocumentState(prev => ({
        ...prev,
        briefContent: basicBrief.content,
        lastGenerated: basicBrief.generated_at,
        nodeCount: basicBrief.node_count,
        edgeCount: basicBrief.edge_count,
        enhancedBriefData,
        analytics,
        visualizations,
        insights,
        isGenerating: false,
        isLoadingEnhanced: false,
        error: null,
      }));
      
      console.log('Enhanced brief generation completed successfully');
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
  const nodesByType = nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const confidenceDistribution = nodes.reduce((acc, node) => {
    const confidence = node.confidence || 50;
    if (confidence >= 80) acc.high++;
    else if (confidence >= 60) acc.medium++;
    else acc.low++;
    return acc;
  }, { high: 0, medium: 0, low: 0 });

  const connectionTypes = edges.reduce((acc, edge) => {
    acc[edge.type] = (acc[edge.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const averageConfidence = nodes.length > 0
    ? nodes.reduce((sum, node) => sum + (node.confidence || 50), 0) / nodes.length / 100
    : 0;

  return {
    nodeDistribution: {
      byType: nodesByType,
      byConfidence: confidenceDistribution,
      bySource: { 'user': nodes.length, 'ai-generated': 0 },
      byCreationDate: {}
    },
    connectionAnalysis: {
      totalConnections: edges.length,
      connectionTypes,
      averageConnections: nodes.length > 0 ? edges.length / nodes.length : 0,
      networkDensity: nodes.length > 1 ? (2 * edges.length) / (nodes.length * (nodes.length - 1)) : 0,
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
  return [
    {
      id: 'node-network-viz',
      type: 'node-network',
      title: 'Strategic Network Overview',
      description: 'Interactive visualization of all strategic elements and their relationships',
      data: { nodes, edges },
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
  return insights.map(insight => ({
    id: insight.id,
    title: insight.title,
    description: insight.description,
    impact: insight.impact,
    confidence: insight.confidence,
    supportingData: insight.supportingData.map(data => `${data.type}: ${data.value}`)
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