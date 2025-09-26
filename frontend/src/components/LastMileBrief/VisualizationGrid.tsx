import React, { useState } from 'react';
import { Maximize2, Minimize2, Filter, Grid, List } from 'lucide-react';
import { VisualizationData, AnalyticsData, ProcessedInsight } from './LastMileBriefCanvas';
import { Node, Edge } from '../../lib/api';
import InteractiveMap from './InteractiveMap';
import DataCharts from './DataCharts';
import InsightCards from './InsightCards';

export interface VisualizationGridProps {
  visualizations: VisualizationData[];
  analytics: AnalyticsData;
  insights: ProcessedInsight[];
  viewMode: 'overview' | 'detailed' | 'interactive';
  rawData: {
    nodes: Node[];
    edges: Edge[];
  };
}

export interface GridLayout {
  columns: number;
  rows: number;
  gap: number;
}

const VisualizationGrid: React.FC<VisualizationGridProps> = ({
  visualizations = [],
  analytics,
  insights = [],
  viewMode,
  rawData
}) => {
  const [fullscreenViz, setFullscreenViz] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'masonry'>('grid');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const getGridLayout = (): GridLayout => {
    switch (viewMode) {
      case 'overview':
        return { columns: 2, rows: 2, gap: 24 };
      case 'detailed':
        return { columns: 3, rows: 3, gap: 20 };
      case 'interactive':
        return { columns: 1, rows: 1, gap: 0 };
      default:
        return { columns: 2, rows: 2, gap: 24 };
    }
  };

  const handleVisualizationClick = (vizId: string) => {
    if (fullscreenViz === vizId) {
      setFullscreenViz(null);
    } else {
      setFullscreenViz(vizId);
    }
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const getVisualizationComponent = (viz: VisualizationData) => {
    switch (viz.type) {
      case 'node-network':
        return (
          <InteractiveMap
            nodes={rawData.nodes}
            edges={rawData.edges}
            layout={{ type: 'force-directed-graph', ...viz.config }}
            interactions={viz.interactivity}
            onNodeClick={(nodeId) => console.log('Node clicked:', nodeId)}
            onEdgeClick={(edgeId) => console.log('Edge clicked:', edgeId)}
          />
        );
      case 'force-directed-graph':
        return (
          <InteractiveMap
            nodes={rawData.nodes}
            edges={rawData.edges}
            layout={{ type: viz.type, ...viz.config }}
            interactions={viz.interactivity}
            onNodeClick={(nodeId) => console.log('Node clicked:', nodeId)}
            onEdgeClick={(edgeId) => console.log('Edge clicked:', edgeId)}
          />
        );
      case 'bar-chart':
      case 'pie-chart':
      case 'line':
      case 'scatter-plot':
      case 'heatmap':
        return (
          <DataCharts
            charts={[{
              id: viz.id,
              type: viz.type === 'bar-chart' ? 'bar' : viz.type === 'pie-chart' ? 'pie' : viz.type as any,
              title: viz.title,
              data: viz.data,
              config: viz.config,
              insights: (viz.insights && Array.isArray(viz.insights)
                ? viz.insights.map((insight, index) => ({
                    id: `${viz.id}-insight-${index}`,
                    type: 'visualization',
                    description: insight,
                    confidence: 0.8
                  }))
                : [])
            }]}
            theme={{
              primaryColor: '#C6AC8E',
              backgroundColor: 'rgba(34, 51, 59, 0.4)',
              textColor: '#EAE0D5'
            }}
            onChartInteraction={(chartId, interaction) =>
              console.log('Chart interaction:', chartId, interaction)
            }
          />
        );
      default:
        return (
          <div className="visualization-placeholder">
            <h3>{viz.title}</h3>
            <p>{viz.description}</p>
          </div>
        );
    }
  };

  const layout = getGridLayout();

  if (fullscreenViz) {
    const viz = visualizations.find(v => v.id === fullscreenViz);
    if (viz) {
      return (
        <div className="visualization-fullscreen">
          <div className="fullscreen-header">
            <h2>{viz.title}</h2>
            <button
              onClick={() => setFullscreenViz(null)}
              className="fullscreen-close"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
          <div className="fullscreen-content">
            {getVisualizationComponent(viz)}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="visualization-grid">
      {/* Grid Controls */}
      <div className="grid-controls">
        <div className="layout-controls">
          <button
            className={`layout-btn ${layoutMode === 'grid' ? 'active' : ''}`}
            onClick={() => setLayoutMode('grid')}
          >
            <Grid className="w-4 h-4" />
            Grid
          </button>
          <button
            className={`layout-btn ${layoutMode === 'masonry' ? 'active' : ''}`}
            onClick={() => setLayoutMode('masonry')}
          >
            <List className="w-4 h-4" />
            Masonry
          </button>
        </div>

        <div className="filter-controls">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
          {['charts', 'maps', 'insights'].map(filter => (
            <button
              key={filter}
              className={`filter-btn ${activeFilters.includes(filter) ? 'active' : ''}`}
              onClick={() => toggleFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Overview */}
      {viewMode !== 'interactive' && analytics && (
        <div className="analytics-overview">
          <div className="analytics-cards">
            <div className="analytics-card">
              <h3>Node Distribution</h3>
              <div className="node-type-breakdown">
                {analytics.nodeDistribution?.byType && Object.entries(analytics.nodeDistribution.byType).map(([type, count]) => (
                  <div key={type} className="type-item">
                    <span className={`type-indicator ${type}`}></span>
                    <span className="type-label">{type}</span>
                    <span className="type-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h3>Connection Analysis</h3>
              <div className="connection-metrics">
                <div className="metric">
                  <span className="metric-label">Total Connections</span>
                  <span className="metric-value">{analytics.connectionAnalysis?.totalConnections || 0}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Network Density</span>
                  <span className="metric-value">{((analytics.connectionAnalysis?.networkDensity || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Avg Connections</span>
                  <span className="metric-value">{(analytics.connectionAnalysis?.averageConnections || 0).toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="analytics-card">
              <h3>Confidence Metrics</h3>
              <div className="confidence-breakdown">
                <div className="confidence-item high">
                  <span className="confidence-label">High</span>
                  <span className="confidence-count">{analytics.confidenceMetrics?.distribution?.high || 0}</span>
                </div>
                <div className="confidence-item medium">
                  <span className="confidence-label">Medium</span>
                  <span className="confidence-count">{analytics.confidenceMetrics?.distribution?.medium || 0}</span>
                </div>
                <div className="confidence-item low">
                  <span className="confidence-label">Low</span>
                  <span className="confidence-count">{analytics.confidenceMetrics?.distribution?.low || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Visualization Grid */}
      <div 
        className={`visualization-container ${layoutMode}`}
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
          gap: `${layout.gap}px`
        }}
      >
        {/* Interactive Map Section */}
        {(!activeFilters.length || activeFilters.includes('maps')) && (
          <div className="visualization-item map-section">
            <div className="viz-header">
              <h3>Strategic Network Map</h3>
              <button
                onClick={() => handleVisualizationClick('network-map')}
                className="viz-expand-btn"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <InteractiveMap
              nodes={rawData.nodes}
              edges={rawData.edges}
              layout={{ type: 'force-directed-graph' }}
              interactions={{
                clickable: true,
                hoverable: true,
                zoomable: true,
                draggable: viewMode === 'interactive'
              }}
              onNodeClick={(nodeId) => console.log('Node clicked:', nodeId)}
              onEdgeClick={(edgeId) => console.log('Edge clicked:', edgeId)}
            />
          </div>
        )}

        {/* Data Charts Section */}
        {(!activeFilters.length || activeFilters.includes('charts')) && (
          <div className="visualization-item charts-section">
            <div className="viz-header">
              <h3>Analytics Dashboard</h3>
              <button
                onClick={() => handleVisualizationClick('analytics-charts')}
                className="viz-expand-btn"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <DataCharts
              charts={[
                {
                  id: 'node-distribution',
                  type: 'pie',
                  title: 'Node Type Distribution',
                  data: {
                    labels: analytics?.nodeDistribution?.byType ? Object.keys(analytics.nodeDistribution.byType) : [],
                    datasets: [{
                      data: analytics?.nodeDistribution?.byType ? Object.values(analytics.nodeDistribution.byType) : [],
                      backgroundColor: ['#C6AC8E', '#EAE0D5', '#10B981', '#3B82F6', '#F59E0B']
                    }]
                  },
                  config: { responsive: true },
                  insights: [{
                    id: 'node-dist-insight',
                    type: 'distribution',
                    description: 'Node distribution analysis',
                    confidence: 0.9
                  }]
                },
                {
                  id: 'confidence-distribution',
                  type: 'bar',
                  title: 'Confidence Distribution',
                  data: {
                    labels: ['High', 'Medium', 'Low'],
                    datasets: [{
                      label: 'Node Count',
                      data: [
                        analytics?.confidenceMetrics?.distribution?.high || 0,
                        analytics?.confidenceMetrics?.distribution?.medium || 0,
                        analytics?.confidenceMetrics?.distribution?.low || 0
                      ],
                      backgroundColor: ['#10B981', '#F59E0B', '#EF4444']
                    }]
                  },
                  config: { responsive: true },
                  insights: [{
                    id: 'confidence-dist-insight',
                    type: 'confidence',
                    description: 'Confidence distribution analysis',
                    confidence: 0.9
                  }]
                }
              ]}
              theme={{
                primaryColor: '#C6AC8E',
                backgroundColor: 'rgba(34, 51, 59, 0.4)',
                textColor: '#EAE0D5'
              }}
              onChartInteraction={(chartId, interaction) => 
                console.log('Chart interaction:', chartId, interaction)
              }
            />
          </div>
        )}

        {/* Insights Section */}
        {(!activeFilters.length || activeFilters.includes('insights')) && insights.length > 0 && (
          <div className="visualization-item insights-section">
            <div className="viz-header">
              <h3>Strategic Insights</h3>
              <button
                onClick={() => handleVisualizationClick('strategic-insights')}
                className="viz-expand-btn"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <InsightCards
              insights={insights}
              layout="grid"
              filters={[]}
              onInsightClick={(insightId) => console.log('Insight clicked:', insightId)}
            />
          </div>
        )}

        {/* Additional Visualizations */}
        {visualizations && Array.isArray(visualizations) && visualizations.length > 0 && visualizations.map((viz) => (
          <div key={viz.id} className="visualization-item">
            <div className="viz-header">
              <h3>{viz.title}</h3>
              <button
                onClick={() => handleVisualizationClick(viz.id)}
                className="viz-expand-btn"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <div className="viz-content">
              {getVisualizationComponent(viz)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VisualizationGrid;