import React, { useState, useEffect } from 'react';
import { Edit, Save, X, Share2, Mail, MessageCircle, Copy, Download } from 'lucide-react';
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
  isEditing: boolean;
  editedData: BriefData | null;
  hasUnsavedChanges: boolean;
  showShareModal: boolean;
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
    viewMode: 'overview',
    isEditing: false,
    editedData: null,
    hasUnsavedChanges: false,
    showShareModal: false
  });

  // Update brief data when document state changes
  useEffect(() => {
    if (documentState.enhancedBriefData) {
      setBriefState(prev => ({
        ...prev,
        briefData: documentState.enhancedBriefData,
        editedData: prev.isEditing ? prev.editedData : documentState.enhancedBriefData,
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

  const handleEditToggle = () => {
    console.log('=== EDIT TOGGLE CLICKED ===');
    setBriefState(prev => {
      console.log('Current edit state:', prev.isEditing);
      if (prev.isEditing) {
        // Exiting edit mode - ask for confirmation if there are unsaved changes
        if (prev.hasUnsavedChanges) {
          const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
          if (!confirmDiscard) {
            return prev; // Stay in edit mode
          }
        }
        // Exit edit mode and discard changes
        console.log('Exiting edit mode');
        return {
          ...prev,
          isEditing: false,
          editedData: null,
          hasUnsavedChanges: false
        };
      } else {
        // Enter edit mode
        console.log('Entering edit mode');
        return {
          ...prev,
          isEditing: true,
          editedData: prev.briefData ? { ...prev.briefData } : null,
          hasUnsavedChanges: false
        };
      }
    });
  };

  const handleSaveChanges = async () => {
    if (!briefState.editedData || !briefState.hasUnsavedChanges) {
      return;
    }

    try {
      // Here you would typically save to backend
      console.log('Saving changes:', briefState.editedData);
      
      // For now, just update the local state
      setBriefState(prev => ({
        ...prev,
        briefData: prev.editedData,
        isEditing: false,
        editedData: null,
        hasUnsavedChanges: false,
        lastUpdated: new Date()
      }));

      // Show success message
      console.log('Changes saved successfully');
    } catch (error) {
      console.error('Failed to save changes:', error);
      // You could show an error toast here
    }
  };

  const handleTitleEdit = (newTitle: string) => {
    if (!briefState.editedData) return;
    
    setBriefState(prev => ({
      ...prev,
      editedData: prev.editedData ? {
        ...prev.editedData,
        title: newTitle
      } : null,
      hasUnsavedChanges: true
    }));
  };

  const handleContentEdit = (field: string, value: any) => {
    if (!briefState.editedData) return;
    
    setBriefState(prev => ({
      ...prev,
      editedData: prev.editedData ? {
        ...prev.editedData,
        [field]: value
      } : null,
      hasUnsavedChanges: true
    }));
  };


  const handleShare = () => {
    setBriefState(prev => ({ ...prev, showShareModal: !prev.showShareModal }));
  };

  const handleCloseShareModal = () => {
    setBriefState(prev => ({ ...prev, showShareModal: false }));
  };

  const generateShareContent = () => {
    const displayData = briefState.isEditing ? briefState.editedData : briefState.briefData;
    if (!displayData) return '';

    const content = `
📊 Strategic Brief: ${displayData.title}

📈 Executive Overview:
This comprehensive analysis reveals key strategic insights across ${displayData.rawData?.nodes?.length || 0} strategic elements with ${Math.round((displayData.analytics?.confidenceMetrics?.average || 0) * 100)}% average confidence.

🎯 Key Highlights:
• ${displayData.analytics?.connectionAnalysis?.totalConnections || 0} strategic connections identified
• ${Math.round((displayData.analytics?.connectionAnalysis?.networkDensity || 0) * 100)}% network integration
• ${displayData.insights?.length || 0} strategic insights generated

💡 Strategic Recommendations:
${displayData.executiveSummary?.recommendations?.slice(0, 3).map((rec, index) => `${index + 1}. ${rec.title}`).join('\n') || 'Strategic recommendations available in full report'}

🔗 Generated by Strategic Analysis Platform
    `.trim();

    return content;
  };

  const handleEmailShare = () => {
    const content = generateShareContent();
    const subject = `Strategic Brief: ${(briefState.isEditing ? briefState.editedData : briefState.briefData)?.title || 'Strategic Analysis'}`;
    const body = encodeURIComponent(content);
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.open(mailtoLink, '_blank');
    handleCloseShareModal();
  };

  const handleWhatsAppShare = () => {
    const content = generateShareContent();
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(content)}`;
    window.open(whatsappLink, '_blank');
    handleCloseShareModal();
  };

  const handleCopyLink = async () => {
    const content = generateShareContent();
    try {
      await navigator.clipboard.writeText(content);
      // You could show a toast notification here
      console.log('Content copied to clipboard');
      handleCloseShareModal();
    } catch (err) {
      console.error('Failed to copy content:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      handleCloseShareModal();
    }
  };

  const handleDownloadPDF = () => {
    handleCloseShareModal();
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the PDF');
      return;
    }

    const displayData = briefState.isEditing ? briefState.editedData : briefState.briefData;
    if (!displayData) {
      alert('No data available to download');
      return;
    }

    // Generate PDF content
    const pdfContent = generatePDFContent(displayData);
    
    // Write content to the new window
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing (user can cancel)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 500);
    };
  };

  const generatePDFContent = (data: BriefData) => {
    const currentDate = new Date().toLocaleDateString();
    const nodeCount = data.rawData?.nodes?.length || 0;
    const edgeCount = data.rawData?.edges?.length || 0;
    const avgConfidence = Math.round((data.analytics?.confidenceMetrics?.average || 0) * 100);
    const networkDensity = Math.round((data.analytics?.connectionAnalysis?.networkDensity || 0) * 100);

    // Generate comprehensive overview
    const getOverviewSummary = (): string => {
      if (nodeCount === 0) {
        return `This workspace is currently empty and ready for strategic content. Begin by adding strategic elements to the explanation map to generate comprehensive executive insights, trend analysis, and actionable recommendations. The system will automatically analyze relationships, assess confidence levels, and provide strategic guidance as content is developed.`;
      }
      
      return `This comprehensive analysis of ${nodeCount} strategic elements reveals ${avgConfidence}% average confidence with ${networkDensity}% network integration across ${edgeCount} interconnections. The strategic landscape demonstrates ${avgConfidence > 70 ? 'strong' : avgConfidence > 50 ? 'moderate' : 'developing'} foundational strength with multiple high-priority recommendations for executive action. Key insights indicate strategic opportunities and risk factors requiring leadership attention across the analyzed network of strategic elements.`;
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Strategic Brief - ${data.title}</title>
    <style>
        @page {
            margin: 0.75in;
            size: A4;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background: white;
            font-size: 12px;
        }
        
        .pdf-header {
            text-align: center;
            border-bottom: 3px solid #C6AC8E;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .pdf-title {
            font-size: 24px;
            font-weight: bold;
            color: #0A0908;
            margin: 0 0 10px 0;
        }
        
        .pdf-subtitle {
            font-size: 16px;
            color: #666;
            margin: 0;
        }
        
        .pdf-metadata {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #e9ecef;
        }
        
        .metadata-item {
            text-align: center;
        }
        
        .metadata-label {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .metadata-value {
            font-size: 18px;
            font-weight: bold;
            color: #C6AC8E;
        }
        
        .pdf-section {
            margin: 25px 0;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #0A0908;
            border-bottom: 2px solid #C6AC8E;
            padding-bottom: 8px;
            margin-bottom: 15px;
            page-break-after: avoid;
        }
        
        .section-content {
            font-size: 12px;
            line-height: 1.7;
            text-align: justify;
            margin-bottom: 15px;
        }
        
        .subsection-title {
            font-size: 14px;
            font-weight: bold;
            color: #0A0908;
            margin: 20px 0 10px 0;
            page-break-after: avoid;
        }
        
        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        
        .analytics-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            page-break-inside: avoid;
        }
        
        .analytics-card h4 {
            font-size: 13px;
            font-weight: bold;
            color: #0A0908;
            margin: 0 0 10px 0;
        }
        
        .metric-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .metric-list li {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 11px;
        }
        
        .recommendations-list {
            margin: 15px 0;
        }
        
        .recommendation-item {
            background: #f8f9fa;
            border-left: 4px solid #C6AC8E;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
            page-break-inside: avoid;
        }
        
        .recommendation-header {
            font-weight: bold;
            color: #0A0908;
            margin-bottom: 8px;
            font-size: 13px;
        }
        
        .recommendation-content {
            color: #555;
            font-size: 12px;
            line-height: 1.6;
        }
        
        .recommendation-meta {
            margin-top: 10px;
            font-size: 11px;
            color: #666;
        }
        
        .priority-high { border-left-color: #EF4444; }
        .priority-medium { border-left-color: #F59E0B; }
        .priority-low { border-left-color: #10B981; }
        
        .insights-list {
            list-style: none;
            padding: 0;
            margin: 15px 0;
        }
        
        .insights-list li {
            background: #f0f8f0;
            border-left: 3px solid #10B981;
            padding: 12px 15px;
            margin: 10px 0;
            border-radius: 0 5px 5px 0;
            page-break-inside: avoid;
            font-size: 12px;
        }
        
        .insights-list li strong {
            color: #0A0908;
        }
        
        .outlook-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        
        .outlook-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            page-break-inside: avoid;
        }
        
        .outlook-card.implications { border-left: 4px solid #3B82F6; }
        .outlook-card.opportunities { border-left: 4px solid #10B981; }
        .outlook-card.risks { border-left: 4px solid #EF4444; }
        
        .outlook-card h4 {
            font-size: 13px;
            font-weight: bold;
            color: #0A0908;
            margin: 0 0 10px 0;
        }
        
        .outlook-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .outlook-list li {
            padding: 4px 0;
            font-size: 11px;
            line-height: 1.5;
            border-bottom: 1px solid #e9ecef;
        }
        
        .outlook-list li:last-child {
            border-bottom: none;
        }
        
        .pdf-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            font-size: 10px;
            color: #666;
            page-break-inside: avoid;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .pdf-section {
                page-break-inside: avoid;
            }
            
            .recommendation-item,
            .analytics-card,
            .outlook-card {
                page-break-inside: avoid;
            }
            
            .section-title {
                page-break-after: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="pdf-header">
        <h1 class="pdf-title">Strategic Brief: ${data.title}</h1>
        <p class="pdf-subtitle">Comprehensive Strategic Analysis • Generated on ${currentDate}</p>
    </div>
    
    <div class="pdf-metadata">
        <div class="metadata-item">
            <div class="metadata-label">Strategic Elements</div>
            <div class="metadata-value">${nodeCount}</div>
        </div>
        <div class="metadata-item">
            <div class="metadata-label">Connections</div>
            <div class="metadata-value">${edgeCount}</div>
        </div>
        <div class="metadata-item">
            <div class="metadata-label">Avg Confidence</div>
            <div class="metadata-value">${avgConfidence}%</div>
        </div>
        <div class="metadata-item">
            <div class="metadata-label">Network Density</div>
            <div class="metadata-value">${networkDensity}%</div>
        </div>
    </div>
    
    <div class="pdf-section">
        <h2 class="section-title">Executive Overview</h2>
        <div class="section-content">
            ${getOverviewSummary()}
        </div>
    </div>
    
    ${data.analytics ? `
    <div class="pdf-section">
        <h2 class="section-title">Strategic Analytics</h2>
        <div class="analytics-grid">
            <div class="analytics-card">
                <h4>Node Distribution</h4>
                <ul class="metric-list">
                    ${Object.entries(data.analytics.nodeDistribution?.byType || {}).map(([type, count]) => `
                        <li><span>${type}</span><span>${count}</span></li>
                    `).join('')}
                </ul>
            </div>
            <div class="analytics-card">
                <h4>Connection Analysis</h4>
                <ul class="metric-list">
                    <li><span>Total Connections</span><span>${data.analytics.connectionAnalysis?.totalConnections || 0}</span></li>
                    <li><span>Network Density</span><span>${networkDensity}%</span></li>
                    <li><span>Avg Connections</span><span>${(data.analytics.connectionAnalysis?.averageConnections || 0).toFixed(1)}</span></li>
                </ul>
            </div>
            <div class="analytics-card">
                <h4>Confidence Metrics</h4>
                <ul class="metric-list">
                    <li><span>High Confidence</span><span>${data.analytics.confidenceMetrics?.distribution?.high || 0}</span></li>
                    <li><span>Medium Confidence</span><span>${data.analytics.confidenceMetrics?.distribution?.medium || 0}</span></li>
                    <li><span>Low Confidence</span><span>${data.analytics.confidenceMetrics?.distribution?.low || 0}</span></li>
                </ul>
            </div>
        </div>
    </div>
    ` : ''}
    
    ${data.insights && data.insights.length > 0 ? `
    <div class="pdf-section">
        <h2 class="section-title">Strategic Insights</h2>
        <div class="section-content">
            This analysis has identified ${data.insights.length} key strategic insights across the network of strategic elements. These insights represent patterns, trends, and critical observations that inform strategic decision-making.
        </div>
        <ul class="insights-list">
            ${data.insights.map(insight => `
                <li><strong>${insight.title}:</strong> ${insight.description} <em>(Confidence: ${Math.round(insight.confidence * 100)}%)</em></li>
            `).join('')}
        </ul>
    </div>
    ` : ''}
    
    <div class="pdf-section page-break">
        <h2 class="section-title">Strategic Outlook</h2>
        <div class="section-content">
            Based on the comprehensive analysis of strategic elements and their interconnections, the following strategic outlook provides key implications, opportunities, and risk factors for executive consideration.
        </div>
        <div class="outlook-grid">
            <div class="outlook-card implications">
                <h4>Key Implications</h4>
                <ul class="outlook-list">
                    <li>Strategic network demonstrates ${avgConfidence > 70 ? 'strong' : avgConfidence > 50 ? 'moderate' : 'developing'} confidence levels</li>
                    <li>Network density of ${networkDensity}% indicates ${networkDensity > 60 ? 'high' : networkDensity > 30 ? 'moderate' : 'low'} integration</li>
                    <li>${nodeCount} strategic elements provide comprehensive coverage</li>
                    <li>Analysis reveals ${edgeCount} strategic connections</li>
                </ul>
            </div>
            <div class="outlook-card opportunities">
                <h4>Strategic Opportunities</h4>
                <ul class="outlook-list">
                    <li>Leverage high-confidence strategic elements for immediate action</li>
                    <li>Strengthen network connections to improve integration</li>
                    <li>Develop strategic initiatives based on identified patterns</li>
                    <li>Capitalize on well-connected strategic nodes</li>
                </ul>
            </div>
            <div class="outlook-card risks">
                <h4>Risk Factors</h4>
                <ul class="outlook-list">
                    <li>Low-confidence elements require additional validation</li>
                    <li>Isolated strategic elements may need better integration</li>
                    <li>Network gaps could indicate missing strategic considerations</li>
                    <li>Dependency risks in highly connected nodes</li>
                </ul>
            </div>
        </div>
    </div>
    
    ${data.recommendations && data.recommendations.length > 0 ? `
    <div class="pdf-section">
        <h2 class="section-title">Executive Recommendations</h2>
        <div class="section-content">
            Based on comprehensive analysis, the following ${data.recommendations.length} recommendations provide clear pathways for strategic value realization. Each recommendation includes priority level, expected impact, and implementation considerations.
        </div>
        <div class="recommendations-list">
            ${data.recommendations.map((rec, index) => `
                <div class="recommendation-item priority-${rec.priority || 'medium'}">
                    <div class="recommendation-header">
                        ${index + 1}. ${rec.title || `${(rec.priority || 'medium').charAt(0).toUpperCase() + (rec.priority || 'medium').slice(1)} Priority Recommendation`}
                    </div>
                    <div class="recommendation-content">
                        ${rec.description || 'Strategic recommendation for executive consideration based on analysis findings.'}
                    </div>
                    <div class="recommendation-meta">
                        Priority: ${(rec.priority || 'medium').toUpperCase()} | Impact: ${(rec.impact || 'medium').toUpperCase()} | Effort: ${(rec.effort || 'medium').toUpperCase()}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}
    
    <div class="pdf-footer">
        <p><strong>Strategic Analysis Report</strong> • Generated by Strategic Analysis Platform • ${currentDate}</p>
        <p>This comprehensive report contains ${nodeCount} strategic elements with ${edgeCount} interconnections</p>
        <p>Analysis confidence: ${avgConfidence}% • Network integration: ${networkDensity}%</p>
    </div>
</body>
</html>`;
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

  // Get the data to display (edited data if in edit mode, otherwise original data)
  const displayData = briefState.isEditing ? briefState.editedData : briefState.briefData;
  
  if (!displayData) {
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
        title={displayData.title}
        metadata={displayData.metadata}
        actions={[
          {
            id: 'edit',
            label: briefState.isEditing ? 'Save Changes' : 'Edit',
            icon: briefState.isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />,
            onClick: briefState.isEditing ? handleSaveChanges : handleEditToggle,
            disabled: briefState.isEditing && !briefState.hasUnsavedChanges
          },
          ...(briefState.isEditing ? [{
            id: 'cancel',
            label: 'Cancel',
            icon: <X className="w-4 h-4" />,
            onClick: handleEditToggle
          }] : []),
          { id: 'refresh', label: 'Refresh', onClick: handleRefresh, disabled: briefState.isEditing },
          { id: 'share', label: 'Share', onClick: handleShare, disabled: briefState.isEditing }
        ]}
        viewMode={briefState.viewMode}
        onViewModeChange={handleViewModeChange}
        onTitleEdit={briefState.isEditing ? handleTitleEdit : undefined}
      />

      <div className="brief-content">
        <ExecutiveReport
          nodes={displayData.rawData?.nodes || []}
          edges={displayData.rawData?.edges || []}
          analytics={displayData.analytics}
          insights={displayData.insights || []}
          isEditing={briefState.isEditing}
          onContentEdit={handleContentEdit}
        />
        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 9999
          }}>
            <div>Edit Mode: {briefState.isEditing ? 'ON' : 'OFF'}</div>
            <div>Has Changes: {briefState.hasUnsavedChanges ? 'YES' : 'NO'}</div>
          </div>
        )}

        <VisualizationGrid
          visualizations={displayData.visualizations || []}
          analytics={displayData.analytics}
          insights={displayData.insights || []}
          viewMode={briefState.viewMode}
          rawData={{
            nodes: displayData.rawData?.nodes || [],
            edges: displayData.rawData?.edges || []
          }}
        />
      </div>

      {/* Share Modal */}
      {briefState.showShareModal && (
        <div className="share-modal-overlay" onClick={handleCloseShareModal}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Strategic Brief</h3>
              <button onClick={handleCloseShareModal} className="share-modal-close">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="share-modal-content">
              <p className="share-description">
                Share your strategic analysis with colleagues and stakeholders
              </p>
              
              <div className="share-options">
                <button onClick={handleEmailShare} className="share-option email">
                  <Mail className="w-5 h-5" />
                  <div className="share-option-content">
                    <span className="share-option-title">Email</span>
                    <span className="share-option-desc">Send via email client</span>
                  </div>
                </button>
                
                <button onClick={handleWhatsAppShare} className="share-option whatsapp">
                  <MessageCircle className="w-5 h-5" />
                  <div className="share-option-content">
                    <span className="share-option-title">WhatsApp</span>
                    <span className="share-option-desc">Share on WhatsApp</span>
                  </div>
                </button>
                
                <button onClick={handleCopyLink} className="share-option copy">
                  <Copy className="w-5 h-5" />
                  <div className="share-option-content">
                    <span className="share-option-title">Copy Content</span>
                    <span className="share-option-desc">Copy to clipboard</span>
                  </div>
                </button>
                
                <button onClick={handleDownloadPDF} className="share-option download">
                  <Download className="w-5 h-5" />
                  <div className="share-option-content">
                    <span className="share-option-title">Download PDF</span>
                    <span className="share-option-desc">Save as PDF file</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LastMileBriefCanvas;