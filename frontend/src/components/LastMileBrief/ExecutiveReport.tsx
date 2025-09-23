import React, { useMemo } from 'react';
import { TrendingUp, BarChart3, PieChart, Target, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { Node, Edge } from '../../lib/api';
import { AnalyticsData, ProcessedInsight } from './LastMileBriefCanvas';
import DataCharts from './DataCharts';
import { generateKeyTrendChart, generateComponentBreakdownChart, ChartData } from './utils/chartGeneration';
import {
  generateStrategicOutlook,
  generateActionableRecommendations,
  inferStrategicTitle,
  StrategicOutlook,
  ActionableRecommendation
} from './utils/strategicAnalysis';
import './ExecutiveReport.css';

export interface ExecutiveReportProps {
  nodes: Node[];
  edges: Edge[];
  analytics: AnalyticsData;
  insights: ProcessedInsight[];
}

const ExecutiveReport: React.FC<ExecutiveReportProps> = ({
  nodes = [],
  edges = [],
  analytics,
  insights = []
}) => {
  // Generate executive report data with fallback for empty data
  const reportData = useMemo(() => {
    // Handle case where analytics might be null/undefined
    const safeAnalytics = analytics || {
      nodeDistribution: {
        byType: {},
        byConfidence: { high: 0, medium: 0, low: 0 },
        bySource: { 'user': 0, 'ai-generated': 0 },
        byCreationDate: {}
      },
      connectionAnalysis: {
        totalConnections: 0,
        connectionTypes: {},
        averageConnections: 0,
        networkDensity: 0,
        centralityMetrics: { betweenness: {}, closeness: {}, degree: {} }
      },
      confidenceMetrics: {
        average: 0,
        distribution: { high: 0, medium: 0, low: 0 },
        highConfidenceNodes: 0,
        lowConfidenceNodes: 0
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

    const title = inferStrategicTitle(nodes, safeAnalytics);
    const keyTrendChart = generateKeyTrendChart(nodes, edges, safeAnalytics);
    const componentChart = generateComponentBreakdownChart(nodes, safeAnalytics);
    const strategicOutlook = generateStrategicOutlook(nodes, edges, safeAnalytics, insights);
    const recommendations = generateActionableRecommendations(nodes, edges, safeAnalytics, insights);
    
    return {
      title,
      keyTrendChart,
      componentChart,
      strategicOutlook,
      recommendations,
      analytics: safeAnalytics
    };
  }, [nodes, edges, analytics, insights]);

  const getOverviewSummary = (): string => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const avgConfidence = Math.round(reportData.analytics.confidenceMetrics.average * 100);
    const networkDensity = Math.round(reportData.analytics.connectionAnalysis.networkDensity * 100);
    const highPriorityRecs = reportData.recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length;
    
    if (nodeCount === 0) {
      return `This workspace is currently empty and ready for strategic content. Begin by adding strategic elements to the explanation map to generate comprehensive executive insights, trend analysis, and actionable recommendations. The system will automatically analyze relationships, assess confidence levels, and provide strategic guidance as content is developed.`;
    }
    
    return `This comprehensive analysis of ${nodeCount} strategic elements reveals ${avgConfidence}% average confidence with ${networkDensity}% network integration across ${edgeCount} interconnections. The strategic landscape demonstrates ${reportData.strategicOutlook.confidence > 0.7 ? 'strong' : reportData.strategicOutlook.confidence > 0.5 ? 'moderate' : 'developing'} foundational strength with ${highPriorityRecs} high-priority recommendations for executive action. Key insights indicate ${reportData.strategicOutlook.opportunities.length} strategic opportunities and ${reportData.strategicOutlook.riskFactors.length} risk factors requiring leadership attention.`;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'high':
        return <Zap className="w-4 h-4 text-orange-400" />;
      case 'medium':
        return <Target className="w-4 h-4 text-yellow-400" />;
      case 'low':
        return <Clock className="w-4 h-4 text-green-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'transformational':
        return 'impact-transformational';
      case 'significant':
        return 'impact-significant';
      case 'moderate':
        return 'impact-moderate';
      case 'minimal':
        return 'impact-minimal';
      default:
        return 'impact-moderate';
    }
  };

  const getEffortColor = (effort: string): string => {
    switch (effort) {
      case 'extensive':
        return 'effort-extensive';
      case 'high':
        return 'effort-high';
      case 'medium':
        return 'effort-medium';
      case 'low':
        return 'effort-low';
      default:
        return 'effort-medium';
    }
  };

  const chartTheme = {
    primaryColor: '#C6AC8E',
    backgroundColor: '#0A0908',
    textColor: '#EAE0D5',
    gridColor: 'rgba(234, 224, 213, 0.1)',
    accentColors: ['#C6AC8E', '#EAE0D5', '#10B981', '#3B82F6', '#F59E0B', '#EF4444']
  };

  return (
    <div className="executive-report">
      {/* Executive Brief Header */}
      <div className="report-header-section">
        <div className="report-title-container">
          <h1 className="report-main-title">Executive Brief: {reportData.title}</h1>
          <div className="report-metadata">
            <span className="metadata-item">
              <BarChart3 className="w-4 h-4" />
              {nodes.length} Strategic Elements
            </span>
            <span className="metadata-item">
              <TrendingUp className="w-4 h-4" />
              {Math.round(reportData.analytics.confidenceMetrics.average * 100)}% Avg Confidence
            </span>
            <span className="metadata-item">
              <PieChart className="w-4 h-4" />
              {Math.round(reportData.analytics.connectionAnalysis.networkDensity * 100)}% Integration
            </span>
          </div>
        </div>
      </div>

      {/* Executive Overview */}
      <div className="report-section">
        <h2 className="section-title">Executive Overview</h2>
        <div className="overview-content">
          <p className="overview-summary">{getOverviewSummary()}</p>
        </div>
      </div>

      {/* Key Trend Analysis */}
      <div className="report-section">
        <h2 className="section-title">Key Trend Analysis</h2>
        <div className="trend-analysis-container">
          <div className="chart-section">
            <DataCharts 
              charts={[{
                id: reportData.keyTrendChart.title.toLowerCase().replace(/\s+/g, '-'),
                type: reportData.keyTrendChart.type as any,
                title: reportData.keyTrendChart.title,
                data: reportData.keyTrendChart.data,
                config: { width: 600, height: 350, responsive: true },
                insights: reportData.keyTrendChart.insights.map((insight, index) => ({
                  id: `trend-insight-${index}`,
                  type: 'trend',
                  description: insight,
                  confidence: 0.85
                }))
              }]}
              theme={chartTheme}
            />
          </div>
          <div className="trend-explanation">
            <p className="trend-description">{reportData.keyTrendChart.description}</p>
            <div className="trend-insights">
              <h4>Key Insights:</h4>
              <ul>
                {reportData.keyTrendChart.insights.map((insight, index) => (
                  <li key={index} className="trend-insight-item">{insight}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="report-section">
        <h2 className="section-title">Strategic Component Breakdown</h2>
        <div className="component-analysis-container">
          <div className="chart-section">
            <DataCharts 
              charts={[{
                id: reportData.componentChart.title.toLowerCase().replace(/\s+/g, '-'),
                type: reportData.componentChart.type as any,
                title: reportData.componentChart.title,
                data: reportData.componentChart.data,
                config: { width: 500, height: 400, responsive: true },
                insights: reportData.componentChart.insights.map((insight, index) => ({
                  id: `component-insight-${index}`,
                  type: 'composition',
                  description: insight,
                  confidence: 0.9
                }))
              }]}
              theme={chartTheme}
            />
          </div>
          <div className="component-explanation">
            <p className="component-description">{reportData.componentChart.description}</p>
            <div className="component-insights">
              <h4>Composition Analysis:</h4>
              <ul>
                {reportData.componentChart.insights.map((insight, index) => (
                  <li key={index} className="component-insight-item">{insight}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Outlook */}
      <div className="report-section">
        <h2 className="section-title">Strategic Outlook</h2>
        <div className="outlook-content">
          <div className="outlook-summary">
            <p className="outlook-main-text">{reportData.strategicOutlook.summary}</p>
            <div className="outlook-confidence">
              <span className="confidence-label">Strategic Confidence:</span>
              <span className="confidence-value">
                {Math.round(reportData.strategicOutlook.confidence * 100)}%
              </span>
              <span className="confidence-horizon">
                ({reportData.strategicOutlook.timeHorizon} horizon)
              </span>
            </div>
          </div>

          <div className="outlook-details">
            <div className="outlook-grid">
              <div className="outlook-card implications">
                <h4>Key Implications</h4>
                <ul>
                  {reportData.strategicOutlook.keyImplications.map((implication, index) => (
                    <li key={index}>{implication}</li>
                  ))}
                </ul>
              </div>

              <div className="outlook-card opportunities">
                <h4>Strategic Opportunities</h4>
                <ul>
                  {reportData.strategicOutlook.opportunities.map((opportunity, index) => (
                    <li key={index}>{opportunity}</li>
                  ))}
                </ul>
              </div>

              <div className="outlook-card risks">
                <h4>Risk Factors</h4>
                <ul>
                  {reportData.strategicOutlook.riskFactors.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      <div className="report-section">
        <h2 className="section-title">Executive Recommendations</h2>
        <div className="recommendations-content">
          <div className="recommendations-summary">
            <p>Based on comprehensive analysis, the following {reportData.recommendations.length} recommendations provide clear pathways for strategic value realization:</p>
          </div>
          
          <div className="recommendations-list">
            {reportData.recommendations.slice(0, 8).map((recommendation, index) => (
              <div key={recommendation.id} className="recommendation-item">
                <div className="recommendation-header">
                  <div className="recommendation-priority">
                    {getPriorityIcon(recommendation.priority)}
                    <span className={`priority-label priority-${recommendation.priority}`}>
                      {recommendation.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="recommendation-meta">
                    <span className={`impact-badge ${getImpactColor(recommendation.impact)}`}>
                      {recommendation.impact}
                    </span>
                    <span className={`effort-badge ${getEffortColor(recommendation.effort)}`}>
                      {recommendation.effort} effort
                    </span>
                    <span className="timeframe-badge">
                      {recommendation.timeframe}
                    </span>
                  </div>
                </div>
                
                <div className="recommendation-content">
                  <div className="insight-recommendation-pair">
                    <div className="insight-text">
                      <strong>Insight:</strong> {recommendation.insight}
                    </div>
                    <div className="recommendation-arrow">→</div>
                    <div className="recommendation-text">
                      <strong>Recommendation:</strong> {recommendation.recommendation}
                    </div>
                  </div>
                  
                  <div className="recommendation-details">
                    <div className="category-tag">
                      {recommendation.category}
                    </div>
                    {recommendation.successMetrics.length > 0 && (
                      <div className="success-metrics">
                        <span className="metrics-label">Success Metrics:</span>
                        <div className="metrics-list">
                          {recommendation.successMetrics.slice(0, 3).map((metric, metricIndex) => (
                            <span key={metricIndex} className="metric-item">{metric}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {reportData.recommendations.length > 8 && (
            <div className="recommendations-footer">
              <p className="additional-recommendations">
                {reportData.recommendations.length - 8} additional recommendations available in detailed analysis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutiveReport;