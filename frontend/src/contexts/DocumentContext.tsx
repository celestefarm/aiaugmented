import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { GenerateBriefResponse, apiClient } from '../lib/api';
import { BriefData, AnalyticsData, VisualizationData, ProcessedInsight, KeyMetric, ExecutiveInsight, Recommendation } from '../components/LastMileBrief/index';
import type { Node, Edge } from '../lib/api';
import { strategicAnalysisService, EnhancedStrategicAnalysis } from '../services/strategicAnalysisService';

// PERFORMANCE OPTIMIZATION: Cache interface for reducing redundant API calls
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  workspaceId: string;
}

interface PerformanceCache {
  nodes: Map<string, CacheEntry<Node[]>>;
  edges: Map<string, CacheEntry<Edge[]>>;
  briefs: Map<string, CacheEntry<GenerateBriefResponse>>;
  analytics: Map<string, CacheEntry<AnalyticsData>>;
}

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
  // Document upload state
  uploadedDocuments: any[];
  isUploading: boolean;
  uploadError: string | null;
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
    uploadedDocuments: [],
    isUploading: false,
    uploadError: null,
  });

  // PERFORMANCE OPTIMIZATION: Initialize performance cache
  const performanceCache = useRef<PerformanceCache>({
    nodes: new Map(),
    edges: new Map(),
    briefs: new Map(),
    analytics: new Map(),
  });

  // Cache configuration
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  const MAX_CACHE_SIZE = 50; // Maximum entries per cache type

  // PERFORMANCE OPTIMIZATION: Cache utility functions
  const isCacheValid = function<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < CACHE_TTL;
  };

  const getCachedData = function<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (entry && isCacheValid(entry)) {
      console.log(`🚀 [CACHE HIT] Retrieved cached data for key: ${key}`);
      return entry.data;
    }
    if (entry) {
      console.log(`⏰ [CACHE EXPIRED] Removing expired entry for key: ${key}`);
      cache.delete(key);
    }
    return null;
  };

  const setCachedData = function<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, workspaceId: string): void {
    // Implement LRU-style cache eviction if needed
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        console.log(`🗑️ [CACHE EVICTION] Removing oldest entry: ${oldestKey}`);
        cache.delete(oldestKey);
      }
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      workspaceId
    });
    console.log(`💾 [CACHE SET] Cached data for key: ${key}, size: ${cache.size}`);
  };

  const clearCacheForWorkspace = (workspaceId: string): void => {
    console.log(`🧹 [CACHE CLEAR] Clearing cache for workspace: ${workspaceId}`);
    
    // Clear all cache types for the specific workspace
    [performanceCache.current.nodes, performanceCache.current.edges, 
     performanceCache.current.briefs, performanceCache.current.analytics].forEach(cache => {
      const keysToDelete: string[] = [];
      cache.forEach((entry, key) => {
        if (entry.workspaceId === workspaceId) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => cache.delete(key));
    });
  };

  // PERFORMANCE OPTIMIZATION: Cached API call functions
  const getCachedNodes = async (workspaceId: string): Promise<Node[]> => {
    const cacheKey = `nodes_${workspaceId}`;
    const cached = getCachedData(performanceCache.current.nodes, cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`🌐 [API CALL] Fetching nodes for workspace: ${workspaceId}`);
    const response = await apiClient.getNodes(workspaceId);
    const nodes = response?.nodes || [];
    
    setCachedData(performanceCache.current.nodes, cacheKey, nodes, workspaceId);
    return nodes;
  };

  const getCachedEdges = async (workspaceId: string): Promise<Edge[]> => {
    const cacheKey = `edges_${workspaceId}`;
    const cached = getCachedData(performanceCache.current.edges, cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`🌐 [API CALL] Fetching edges for workspace: ${workspaceId}`);
    const response = await apiClient.getEdges(workspaceId);
    const edges = response?.edges || [];
    
    setCachedData(performanceCache.current.edges, cacheKey, edges, workspaceId);
    return edges;
  };

  const getCachedBrief = async (workspaceId: string): Promise<GenerateBriefResponse> => {
    const cacheKey = `brief_${workspaceId}`;
    const cached = getCachedData(performanceCache.current.briefs, cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`🌐 [API CALL] Generating brief for workspace: ${workspaceId}`);
    const brief = await apiClient.generateBrief(workspaceId);
    
    setCachedData(performanceCache.current.briefs, cacheKey, brief, workspaceId);
    return brief;
  };

  const generateBriefForWorkspace = async (workspaceId: string): Promise<void> => {
    const startTime = performance.now();
    console.log('🚀 [PERF] Starting optimized brief generation at:', new Date().toISOString());
    
    setDocumentState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    try {
      // OPTIMIZATION: Use cached brief generation
      const response = await getCachedBrief(workspaceId);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`⚡ [PERF] Brief generation completed in ${duration.toFixed(2)}ms`);
      
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
      const errorTime = performance.now() - startTime;
      console.error(`❌ [PERF] Brief generation failed after ${errorTime.toFixed(2)}ms`);
      
      setDocumentState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate brief',
      }));
    }
  };

  const generateEnhancedBrief = async (workspaceId: string, options: EnhancedBriefOptions = {}): Promise<void> => {
    const startTime = performance.now();
    console.log('=== ENHANCED BRIEF GENERATION WITH PERFORMANCE OPTIMIZATIONS ===');
    console.log('Workspace ID:', workspaceId);
    console.log('Options:', options);
    console.log('🚀 [PERF] Starting enhanced brief generation at:', new Date().toISOString());
    
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
      console.log('Step 1: Fetching nodes and edges with caching...');
      const apiCallsStart = performance.now();
      
      // OPTIMIZATION: Use cached API calls with parallel execution
      const [nodes, edges] = await Promise.all([
        getCachedNodes(workspaceId),
        getCachedEdges(workspaceId)
      ]);
      
      const apiCallsEnd = performance.now();
      const apiCallsDuration = apiCallsEnd - apiCallsStart;
      console.log(`⚡ [PERF] Cached API calls completed in ${apiCallsDuration.toFixed(2)}ms`);
      console.log(`📊 [PERF] Fetched ${nodes?.length || 0} nodes and ${edges?.length || 0} edges`);
      
      // CRITICAL: Check if responses are valid
      if (!nodes || !Array.isArray(nodes)) {
        console.error('CRITICAL: Invalid nodes response');
        throw new Error('Failed to fetch nodes - API returned invalid data');
      }
      
      if (!edges || !Array.isArray(edges)) {
        console.error('CRITICAL: Invalid edges response');
        throw new Error('Failed to fetch edges - API returned invalid data');
      }

      console.log('Step 2: Generating strategic analysis with backend integration...');
      const strategicAnalysisStart = performance.now();
      
      // Use the strategic analysis service to get enhanced analysis
      let strategicAnalysis: EnhancedStrategicAnalysis;
      
      try {
        strategicAnalysis = await strategicAnalysisService.generateEnhancedAnalysis(
          nodes,
          edges,
          workspaceId
        );
        console.log('Strategic analysis generated:', strategicAnalysis);
      } catch (strategicError) {
        console.warn('Strategic analysis service failed, using fallback:', strategicError);
        const fallbackStart = performance.now();
        
        // Fallback to basic analysis if strategic service fails
        const analytics = generateAnalyticsFromData(nodes, edges);
        const visualizations = generateVisualizationsFromData(nodes, edges);
        const insights = generateInsightsFromData(nodes, edges, analytics);
        
        const fallbackEnd = performance.now();
        console.log(`🔄 [PERF] Fallback analysis completed in ${(fallbackEnd - fallbackStart).toFixed(2)}ms`);
        
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
      
      const strategicAnalysisEnd = performance.now();
      const strategicAnalysisDuration = strategicAnalysisEnd - strategicAnalysisStart;
      console.log(`🧠 [PERF] Strategic analysis completed in ${strategicAnalysisDuration.toFixed(2)}ms`);

      console.log('Step 3: Generating basic brief for content with caching...');
      const briefGenerationStart = performance.now();
      
      // OPTIMIZATION: Use cached brief generation
      let basicBrief: GenerateBriefResponse;
      try {
        basicBrief = await getCachedBrief(workspaceId);
      } catch (briefError) {
        console.warn('Basic brief generation failed, using strategic analysis content:', briefError);
        basicBrief = {
          content: strategicAnalysis.strategicOutlook.summary,
          generated_at: new Date().toISOString(),
          node_count: nodes.length,
          edge_count: edges.length
        };
      }
      
      const briefGenerationEnd = performance.now();
      const briefGenerationDuration = briefGenerationEnd - briefGenerationStart;
      console.log(`📄 [PERF] Brief generation completed in ${briefGenerationDuration.toFixed(2)}ms`);
      console.log(`📏 [PERF] Generated brief content length: ${basicBrief.content?.length || 0} characters`);

      console.log('Step 4: Creating enhanced brief data...');
      const dataProcessingStart = performance.now();
      
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
          nodes: nodes,
          edges: edges
        }
      };
      
      const dataProcessingEnd = performance.now();
      const dataProcessingDuration = dataProcessingEnd - dataProcessingStart;
      console.log(`🔧 [PERF] Data processing completed in ${dataProcessingDuration.toFixed(2)}ms`);
      console.log('Enhanced brief data created:', enhancedBriefData);

      console.log('Step 5: Updating document state...');
      const stateUpdateStart = performance.now();
      
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
      
      const stateUpdateEnd = performance.now();
      const stateUpdateDuration = stateUpdateEnd - stateUpdateStart;
      console.log(`🔄 [PERF] State update completed in ${stateUpdateDuration.toFixed(2)}ms`);
      
      // Calculate and log total performance metrics
      const totalTime = performance.now() - startTime;
      console.log('=== OPTIMIZED ENHANCED BRIEF GENERATION PERFORMANCE SUMMARY ===');
      console.log(`🏁 [PERF] Total generation time: ${totalTime.toFixed(2)}ms`);
      console.log(`📊 [PERF] Performance breakdown:`);
      console.log(`  - API calls (cached): ${apiCallsDuration.toFixed(2)}ms (${((apiCallsDuration / totalTime) * 100).toFixed(1)}%)`);
      console.log(`  - Strategic analysis: ${strategicAnalysisDuration.toFixed(2)}ms (${((strategicAnalysisDuration / totalTime) * 100).toFixed(1)}%)`);
      console.log(`  - Brief generation (cached): ${briefGenerationDuration.toFixed(2)}ms (${((briefGenerationDuration / totalTime) * 100).toFixed(1)}%)`);
      console.log(`  - Data processing: ${dataProcessingDuration.toFixed(2)}ms (${((dataProcessingDuration / totalTime) * 100).toFixed(1)}%)`);
      console.log(`  - State update: ${stateUpdateDuration.toFixed(2)}ms (${((stateUpdateDuration / totalTime) * 100).toFixed(1)}%)`);
      console.log(`📈 [PERF] Data volume: ${basicBrief.node_count} nodes, ${basicBrief.edge_count} edges, ${basicBrief.content?.length || 0} chars`);
      
      console.log('Enhanced brief generation with performance optimizations completed successfully');
    } catch (error) {
      const errorTime = performance.now() - startTime;
      console.error('=== ENHANCED BRIEF GENERATION ERROR ===');
      console.error(`❌ [PERF] Error occurred after ${errorTime.toFixed(2)}ms`);
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
      // OPTIMIZATION: Use cached API calls
      const [nodes, edges] = await Promise.all([
        getCachedNodes(workspaceId),
        getCachedEdges(workspaceId)
      ]);

      const analytics = generateAnalyticsFromData(nodes, edges);
      
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