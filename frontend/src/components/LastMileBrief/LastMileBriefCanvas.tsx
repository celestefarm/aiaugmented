import React, { useState, useEffect } from 'react';
import { useDocument } from '../../contexts/DocumentContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Node, Edge } from '../../lib/api';
import BriefHeader from './BriefHeader';
import ExecutiveReport from './ExecutiveReport';
import VisualizationGrid from './VisualizationGrid';
import './LastMileBriefCanvas.css';

// Types based on technical specification
export interface BriefData {
  id: string;
  workspaceId: string;
  title: string;
  generatedAt: Date;
  version: string;
  metadata: BriefMetadata;
  executiveSummary: ExecutiveSummaryData;
  analytics: AnalyticsData;
  visualizations: VisualizationData[];
  insights: ProcessedInsight[];
  recommendations: Recommendation[];
  rawData: {
    nodes: Node[];
    edges: Edge[];
  };
}

export interface BriefMetadata {
  generatedAt: Date;
  nodeCount: number;
  edgeCount: number;
  confidenceScore: number;
  lastModified: Date;
}

export interface ExecutiveSummaryData {
  keyMetrics: KeyMetric[];
  insights: ExecutiveInsight[];
  recommendations: Recommendation[];
}

export interface KeyMetric {
  id: string;
  label: string;
  value: number | string;
  trend: 'up' | 'down' | 'stable';
  significance: 'high' | 'medium' | 'low';
  format: 'number' | 'percentage' | 'currency' | 'text';
}

export interface ExecutiveInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  supportingData: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: string;
}

export interface AnalyticsData {
  nodeDistribution: NodeDistribution;
  connectionAnalysis: ConnectionAnalysis;
  confidenceMetrics: ConfidenceMetrics;
  temporalAnalysis: TemporalAnalysis;
  clusterAnalysis: ClusterAnalysis;
}

export interface NodeDistribution {
  byType: Record<string, number>;
  byConfidence: ConfidenceDistribution;
  bySource: Record<string, number>;
  byCreationDate: TemporalDistribution;
}

export interface ConnectionAnalysis {
  totalConnections: number;
  connectionTypes: Record<string, number>;
  averageConnections: number;
  networkDensity: number;
  centralityMetrics: CentralityMetrics;
}

export interface ConfidenceMetrics {
  average: number;
  distribution: ConfidenceDistribution;
  highConfidenceNodes: number;
  lowConfidenceNodes: number;
}

export interface ConfidenceDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface TemporalAnalysis {
  creationTrend: TemporalDistribution;
  activityPattern: TemporalDistribution;
}

export interface TemporalDistribution {
  [key: string]: number;
}

export interface ClusterAnalysis {
  clusters: ClusterData[];
  totalClusters: number;
  averageClusterSize: number;
}

export interface ClusterData {
  id: string;
  name: string;
  nodes: string[];
  description: string;
  strength: number;
}

export interface CentralityMetrics {
  betweenness: Record<string, number>;
  closeness: Record<string, number>;
  degree: Record<string, number>;
}

export interface VisualizationData {
  id: string;
  type: VisualizationType;
  title: string;
  description: string;
  data: any;
  config: VisualizationConfig;
  insights: string[];
  interactivity: InteractivityConfig;
}

export type VisualizationType =
  | 'node-network'
  | 'force-directed-graph'
  | 'hierarchical-tree'
  | 'sankey-diagram'
  | 'chord-diagram'
  | 'heatmap'
  | 'timeline'
  | 'scatter-plot'
  | 'bar-chart'
  | 'pie-chart'
  | 'line'
  | 'bar'
  | 'pie'
  | 'scatter'
  | 'treemap'
  | 'sunburst';

export interface VisualizationConfig {
  width?: number;
  height?: number;
  theme?: string;
  interactive?: boolean;
  [key: string]: any;
}

export interface InteractivityConfig {
  clickable: boolean;
  hoverable: boolean;
  zoomable: boolean;
  draggable: boolean;
}

export interface ProcessedInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'pattern' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  supportingData: SupportingData[];
  visualizations: string[];
}

export interface SupportingData {
  type: string;
  value: any;
  source: string;
}

export interface LastMileBriefCanvasProps {
  workspaceId: string;
  refreshTrigger?: number;
  onExport?: () => void;
  onShare?: () => void;
}

export interface LastMileBriefState {
  briefData: BriefData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  viewMode: 'overview' | 'detailed' | 'interactive';
}

const LastMileBriefCanvas: React.FC<LastMileBriefCanvasProps> = ({
  workspaceId,
  refreshTrigger,
  onExport,
  onShare
}) => {
  const { documentState, generateEnhancedBrief, exportBrief } = useDocument();
  const { currentWorkspace } = useWorkspace();
  
  const [briefState, setBriefState] = useState<LastMileBriefState>({
    briefData: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    viewMode: 'overview'
  });

  // Update brief data when document state changes
  useEffect(() => {
    if (documentState.enhancedBriefData) {
      setBriefState(prev => ({
        ...prev,
        briefData: documentState.enhancedBriefData,
        lastUpdated: new Date(),
        error: null,
        isLoading: false
      }));
    }
  }, [documentState.enhancedBriefData]);

  // Handle loading states
  useEffect(() => {
    setBriefState(prev => ({
      ...prev,
      isLoading: documentState.isGenerating || documentState.isLoadingEnhanced
    }));
  }, [documentState.isGenerating, documentState.isLoadingEnhanced]);

  // Handle errors
  useEffect(() => {
    if (documentState.error) {
      setBriefState(prev => ({
        ...prev,
        error: documentState.error,
        isLoading: false
      }));
    }
  }, [documentState.error]);

  // Handle refresh trigger
  useEffect(() => {
    const activeWorkspaceId = workspaceId || currentWorkspace?.id;
    if (refreshTrigger && activeWorkspaceId) {
      handleRefresh();
    }
  }, [refreshTrigger, workspaceId, currentWorkspace]);

  // Generate enhanced brief on mount if needed
  useEffect(() => {
    const activeWorkspaceId = workspaceId || currentWorkspace?.id;
    if (activeWorkspaceId && !documentState.enhancedBriefData && !documentState.isLoadingEnhanced) {
      handleRefresh();
    }
  }, [workspaceId, currentWorkspace]);

  const handleRefresh = async () => {
    // Use workspaceId prop as primary source, fallback to currentWorkspace.id
    const activeWorkspaceId = workspaceId || currentWorkspace?.id;
    
    if (!activeWorkspaceId) {
      console.error('CRITICAL: No workspace ID available for refresh');
      console.error('workspaceId prop:', workspaceId);
      console.error('currentWorkspace:', currentWorkspace);
      setBriefState(prev => ({
        ...prev,
        error: 'No workspace ID available - please ensure a workspace is selected',
        isLoading: false
      }));
      return;
    }
    
    console.log('=== LAST MILE BRIEF REFRESH ===');
    console.log('Using workspace ID:', activeWorkspaceId);
    console.log('Source: workspaceId prop =', workspaceId, ', currentWorkspace.id =', currentWorkspace?.id);
    
    setBriefState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('Calling generateEnhancedBrief with workspace ID:', activeWorkspaceId);
      await generateEnhancedBrief(activeWorkspaceId, {
        includeAnalytics: true,
        includeVisualizations: true,
        includeInsights: true,
        format: 'executive'
      });
      console.log('generateEnhancedBrief completed successfully');
    } catch (error) {
      console.error('=== LAST MILE BRIEF REFRESH ERROR ===');
      console.error('Error during refresh:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh brief';
      console.error('Setting error state:', errorMessage);
      
      setBriefState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
    }
  };

  const handleViewModeChange = (mode: 'overview' | 'detailed' | 'interactive') => {
    setBriefState(prev => ({ ...prev, viewMode: mode }));
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    }
  };

  // Show loading state
  if (documentState.isGenerating || briefState.isLoading) {
    return (
      <div className="last-mile-brief-canvas loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h3>Generating Strategic Brief</h3>
          <p>Processing {documentState.nodeCount} nodes and {documentState.edgeCount} connections</p>
        </div>
      </div>
    );
  }

  // Show error state only for critical errors, but still try to render ExecutiveReport with empty data
  if (briefState.error || documentState.error) {
    const errorMessage = briefState.error || documentState.error;
    console.log('=== HANDLING ERROR STATE ===');
    console.log('Error message:', errorMessage);
    console.log('Brief state error:', briefState.error);
    console.log('Document state error:', documentState.error);
    
    // If it's a workspace access error, still try to render the ExecutiveReport with empty data
    if (errorMessage && (errorMessage.includes('Access denied') || errorMessage.includes('permission'))) {
      console.log('Access denied error detected, rendering ExecutiveReport with empty data');
      
      return (
        <div className="last-mile-brief-canvas">
          <BriefHeader
            title="Strategic Analysis"
            metadata={{
              generatedAt: new Date(),
              nodeCount: 0,
              edgeCount: 0,
              confidenceScore: 0,
              lastModified: new Date()
            }}
            actions={[
              { id: 'refresh', label: 'Refresh', onClick: handleRefresh },
              { id: 'export', label: 'Export', onClick: handleExport },
              { id: 'share', label: 'Share', onClick: handleShare }
            ]}
            viewMode={briefState.viewMode}
            onViewModeChange={handleViewModeChange}
          />

          <div className="brief-content">
            {/* Show error banner */}
            <div className="error-banner" style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '2rem',
              color: '#FCA5A5'
            }}>
              <p><strong>Data Access Issue:</strong> {errorMessage}</p>
              <button onClick={handleRefresh} className="btn-primary" style={{ marginTop: '0.5rem' }}>
                Try Again
              </button>
            </div>

            <ExecutiveReport
              nodes={[]}
              edges={[]}
              analytics={null}
              insights={[]}
            />
          </div>
        </div>
      );
    }
    
    // For other critical errors, show the full error state
    return (
      <div className="last-mile-brief-canvas error">
        <div className="error-container">
          <h3>Brief Generation Error</h3>
          <p>{errorMessage}</p>
          <div className="error-details">
            <details>
              <summary>Technical Details</summary>
              <pre style={{ fontSize: '12px', marginTop: '10px', padding: '10px', background: '#1a1a1a', borderRadius: '4px' }}>
                {JSON.stringify({
                  briefStateError: briefState.error,
                  documentStateError: documentState.error,
                  workspaceId: currentWorkspace?.id,
                  timestamp: new Date().toISOString()
                }, null, 2)}
              </pre>
            </details>
          </div>
          <button onClick={handleRefresh} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!briefState.briefData) {
    return (
      <div className="last-mile-brief-canvas empty">
        <div className="empty-container">
          <h3>No Brief Generated Yet</h3>
          <p>Generate a strategic brief to see comprehensive insights and visualizations.</p>
          <button onClick={handleRefresh} className="btn-primary">
            Generate Brief
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="last-mile-brief-canvas">
      <BriefHeader
        title={briefState.briefData.title}
        metadata={briefState.briefData.metadata}
        actions={[
          { id: 'refresh', label: 'Refresh', onClick: handleRefresh },
          { id: 'export', label: 'Export', onClick: handleExport },
          { id: 'share', label: 'Share', onClick: handleShare }
        ]}
        viewMode={briefState.viewMode}
        onViewModeChange={handleViewModeChange}
      />

      <div className="brief-content">
        <ExecutiveReport
          nodes={briefState.briefData.rawData.nodes}
          edges={briefState.briefData.rawData.edges}
          analytics={briefState.briefData.analytics}
          insights={briefState.briefData.insights}
        />

        <VisualizationGrid
          visualizations={briefState.briefData.visualizations}
          analytics={briefState.briefData.analytics}
          insights={briefState.briefData.insights}
          viewMode={briefState.viewMode}
          rawData={briefState.briefData.rawData}
        />
      </div>
    </div>
  );
};

export default LastMileBriefCanvas;