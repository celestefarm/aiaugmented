import React from 'react';
import ExecutiveReport from '../ExecutiveReport';
import { Node, Edge } from '../../../lib/api';
import { AnalyticsData, ProcessedInsight } from '../LastMileBriefCanvas';

// Sample test data
const sampleNodes: Node[] = [
  {
    id: '1',
    workspace_id: 'test-workspace',
    title: 'Strategic Initiative A',
    description: 'Key strategic initiative for market expansion',
    type: 'decision',
    x: 100,
    y: 100,
    confidence: 85,
    feasibility: 'high',
    source_agent: 'strategist',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    workspace_id: 'test-workspace',
    title: 'Risk Assessment',
    description: 'Market volatility risk analysis',
    type: 'risk',
    x: 200,
    y: 150,
    confidence: 70,
    feasibility: 'medium',
    source_agent: 'analyst',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    workspace_id: 'test-workspace',
    title: 'Human Resources Plan',
    description: 'Talent acquisition and development strategy',
    type: 'human',
    x: 150,
    y: 200,
    confidence: 90,
    feasibility: 'high',
    source_agent: 'hr-specialist',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z'
  }
];

const sampleEdges: Edge[] = [
  {
    id: 'e1',
    workspace_id: 'test-workspace',
    from_node_id: '1',
    to_node_id: '2',
    type: 'support',
    description: 'Strategic initiative influences risk assessment',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'e2',
    workspace_id: 'test-workspace',
    from_node_id: '1',
    to_node_id: '3',
    type: 'dependency',
    description: 'Strategic initiative requires HR support',
    created_at: '2024-01-02T00:00:00Z'
  }
];

const sampleAnalytics: AnalyticsData = {
  nodeDistribution: {
    byType: { decision: 1, risk: 1, human: 1 },
    byConfidence: { high: 2, medium: 1, low: 0 },
    bySource: { 'user': 3, 'ai-generated': 0 },
    byCreationDate: {}
  },
  connectionAnalysis: {
    totalConnections: 2,
    connectionTypes: { influences: 1, requires: 1 },
    averageConnections: 1.33,
    networkDensity: 0.67,
    centralityMetrics: {
      betweenness: {},
      closeness: {},
      degree: {}
    }
  },
  confidenceMetrics: {
    average: 0.82,
    distribution: { high: 2, medium: 1, low: 0 },
    highConfidenceNodes: 2,
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

const sampleInsights: ProcessedInsight[] = [
  {
    id: 'insight-1',
    type: 'trend',
    title: 'High Strategic Confidence',
    description: 'Strategic elements show strong confidence levels indicating readiness for execution',
    confidence: 0.9,
    impact: 'high',
    category: 'strategic-readiness',
    supportingData: [
      { type: 'confidence', value: 82, source: 'analysis' }
    ],
    visualizations: []
  }
];

const ExecutiveReportTest: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#0A0908', minHeight: '100vh' }}>
      <h1 style={{ color: '#EAE0D5', marginBottom: '20px' }}>Executive Report Test</h1>
      <ExecutiveReport
        nodes={sampleNodes}
        edges={sampleEdges}
        analytics={sampleAnalytics}
        insights={sampleInsights}
      />
    </div>
  );
};

export default ExecutiveReportTest;