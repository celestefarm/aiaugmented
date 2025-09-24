import { Node, Edge } from '../../../lib/api';
import { AnalyticsData } from '../LastMileBriefCanvas';

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'infographic';
  title: string;
  description: string;
  data: any;
  insights: string[];
}

export interface TrendData {
  labels: string[];
  values: number[];
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  significance: 'high' | 'medium' | 'low';
}

export interface ComponentBreakdown {
  categories: { name: string; value: number; color: string }[];
  total: number;
  dominantCategory: string;
  diversity: 'high' | 'medium' | 'low';
}

/**
 * Intelligently selects and generates the most appropriate chart for key trends
 */
export function generateKeyTrendChart(nodes: Node[], edges: Edge[], analytics: AnalyticsData): ChartData {
  // Analyze temporal patterns in node creation
  const temporalData = analyzeTemporalTrends(nodes);
  
  // Analyze confidence trends
  const confidenceTrends = analyzeConfidenceTrends(nodes);
  
  // Analyze connection growth
  const connectionTrends = analyzeConnectionTrends(nodes, edges);
  
  // Select the most significant trend
  const mostSignificantTrend = selectMostSignificantTrend(temporalData, confidenceTrends, connectionTrends);
  
  if (mostSignificantTrend.type === 'temporal') {
    return {
      type: 'line',
      title: 'Strategic Development Timeline',
      description: 'Evolution of strategic elements over time showing development patterns and momentum',
      data: {
        labels: mostSignificantTrend.labels,
        datasets: [{
          label: 'Strategic Elements Added',
          data: mostSignificantTrend.values,
          borderColor: '#C6AC8E',
          backgroundColor: 'rgba(198, 172, 142, 0.1)',
          borderWidth: 3,
          fill: true
        }]
      },
      insights: generateTrendInsights(mostSignificantTrend)
    };
  } else if (mostSignificantTrend.type === 'confidence') {
    return {
      type: 'bar',
      title: 'Strategic Confidence Distribution',
      description: 'Analysis of confidence levels across strategic elements revealing areas of certainty and uncertainty',
      data: {
        labels: ['High Confidence', 'Medium Confidence', 'Low Confidence'],
        datasets: [{
          label: 'Number of Elements',
          data: mostSignificantTrend.values,
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
          borderColor: ['#059669', '#D97706', '#DC2626'],
          borderWidth: 2
        }]
      },
      insights: generateConfidenceInsights(mostSignificantTrend, analytics)
    };
  } else {
    return {
      type: 'bar',
      title: 'Network Connectivity Analysis',
      description: 'Strategic network density and connection patterns showing integration levels',
      data: {
        labels: mostSignificantTrend.labels,
        datasets: [{
          label: 'Connection Strength',
          data: mostSignificantTrend.values,
          backgroundColor: '#C6AC8E',
          borderColor: '#5E503F',
          borderWidth: 2
        }]
      },
      insights: generateConnectionInsights(mostSignificantTrend, analytics)
    };
  }
}

/**
 * Generates component breakdown chart showing strategic landscape composition
 */
export function generateComponentBreakdownChart(nodes: Node[], analytics: AnalyticsData): ChartData {
  const breakdown = analyzeComponentBreakdown(nodes, analytics);
  
  return {
    type: 'pie',
    title: 'Strategic Landscape Composition',
    description: 'Breakdown of strategic elements by type showing the composition and focus areas of the strategic framework',
    data: {
      labels: breakdown.categories.map(cat => cat.name),
      datasets: [{
        data: breakdown.categories.map(cat => cat.value),
        backgroundColor: breakdown.categories.map(cat => cat.color),
        borderColor: '#22333B',
        borderWidth: 2
      }]
    },
    insights: generateComponentInsights(breakdown)
  };
}

/**
 * Analyzes temporal trends in node creation
 */
function analyzeTemporalTrends(nodes: Node[]): TrendData {
  // Group nodes by creation date (by day)
  const dateGroups: { [key: string]: number } = {};
  
  nodes.forEach(node => {
    const date = new Date(node.created_at).toISOString().split('T')[0];
    dateGroups[date] = (dateGroups[date] || 0) + 1;
  });
  
  const sortedDates = Object.keys(dateGroups).sort();
  const values = sortedDates.map(date => dateGroups[date]);
  
  // Determine trend direction
  let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile' = 'stable';
  if (values.length > 1) {
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.2) trend = 'increasing';
    else if (secondAvg < firstAvg * 0.8) trend = 'decreasing';
    else trend = 'stable';
  }
  
  return {
    labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
    values,
    trend,
    significance: values.length > 5 ? 'high' : values.length > 2 ? 'medium' : 'low'
  };
}

/**
 * Analyzes confidence level trends
 */
function analyzeConfidenceTrends(nodes: Node[]): TrendData {
  const confidenceDistribution = { high: 0, medium: 0, low: 0 };
  
  nodes.forEach(node => {
    const confidence = node.confidence || 50;
    if (confidence >= 80) confidenceDistribution.high++;
    else if (confidence >= 60) confidenceDistribution.medium++;
    else confidenceDistribution.low++;
  });
  
  return {
    labels: ['High', 'Medium', 'Low'],
    values: [confidenceDistribution.high, confidenceDistribution.medium, confidenceDistribution.low],
    trend: confidenceDistribution.high > confidenceDistribution.low ? 'increasing' : 'decreasing',
    significance: 'high'
  };
}

/**
 * Analyzes connection growth and patterns
 */
function analyzeConnectionTrends(nodes: Node[], edges: Edge[]): TrendData {
  // Analyze node connectivity
  const nodeConnections: { [key: string]: number } = {};
  
  edges.forEach(edge => {
    const fromId = edge.from_node_id.toString();
    const toId = edge.to_node_id.toString();
    nodeConnections[fromId] = (nodeConnections[fromId] || 0) + 1;
    nodeConnections[toId] = (nodeConnections[toId] || 0) + 1;
  });
  
  // Group by connection count
  const connectionGroups = { isolated: 0, connected: 0, highly_connected: 0 };
  
  nodes.forEach(node => {
    const connections = nodeConnections[node.id.toString()] || 0;
    if (connections === 0) connectionGroups.isolated++;
    else if (connections <= 2) connectionGroups.connected++;
    else connectionGroups.highly_connected++;
  });
  
  return {
    labels: ['Isolated', 'Connected', 'Highly Connected'],
    values: [connectionGroups.isolated, connectionGroups.connected, connectionGroups.highly_connected],
    trend: connectionGroups.highly_connected > connectionGroups.isolated ? 'increasing' : 'decreasing',
    significance: edges.length > nodes.length ? 'high' : 'medium'
  };
}

/**
 * Selects the most significant trend for display
 */
function selectMostSignificantTrend(temporal: TrendData, confidence: TrendData, connection: TrendData) {
  // Prioritize based on significance and data richness
  if (temporal.significance === 'high' && temporal.values.length > 3) {
    return { ...temporal, type: 'temporal' };
  } else if (confidence.significance === 'high') {
    return { ...confidence, type: 'confidence' };
  } else {
    return { ...connection, type: 'connection' };
  }
}

/**
 * Analyzes component breakdown for pie chart
 */
function analyzeComponentBreakdown(nodes: Node[], analytics: AnalyticsData): ComponentBreakdown {
  const typeColors: { [key: string]: string } = {
    human: '#C6AC8E',
    ai: '#EAE0D5',
    decision: '#10B981',
    risk: '#EF4444',
    dependency: '#3B82F6',
    default: '#9CA3AF'
  };
  
  const categories = Object.entries(analytics.nodeDistribution.byType).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    color: typeColors[type] || typeColors.default
  }));
  
  const total = categories.reduce((sum, cat) => sum + cat.value, 0);
  const dominantCategory = categories.reduce((max, cat) => cat.value > max.value ? cat : max, categories[0]);
  
  // Calculate diversity
  const maxPercentage = dominantCategory.value / total;
  const diversity = maxPercentage > 0.6 ? 'low' : maxPercentage > 0.4 ? 'medium' : 'high';
  
  return {
    categories,
    total,
    dominantCategory: dominantCategory.name,
    diversity
  };
}

/**
 * Generate insights for trend analysis
 */
function generateTrendInsights(trend: TrendData & { type: string }): string[] {
  const insights: string[] = [];
  
  if (trend.type === 'temporal') {
    if (trend.trend === 'increasing') {
      insights.push('Strategic development is accelerating with increasing momentum in recent periods');
      insights.push('Growing pace of strategic element addition indicates active strategic planning');
    } else if (trend.trend === 'decreasing') {
      insights.push('Strategic development pace has slowed, suggesting consolidation phase');
      insights.push('Reduced new element creation may indicate focus on implementation');
    } else {
      insights.push('Consistent strategic development pace indicates steady, methodical approach');
    }
  }
  
  return insights;
}

/**
 * Generate insights for confidence analysis
 */
function generateConfidenceInsights(trend: TrendData, analytics: AnalyticsData): string[] {
  const insights: string[] = [];
  const [high, medium, low] = trend.values;
  const total = high + medium + low;
  
  if (high / total > 0.6) {
    insights.push('Strong confidence levels across strategic elements indicate well-researched planning');
    insights.push('High confidence suggests readiness for strategic execution');
  } else if (low / total > 0.4) {
    insights.push('Significant uncertainty in strategic elements requires additional analysis');
    insights.push('Low confidence areas present both risks and opportunities for refinement');
  } else {
    insights.push('Balanced confidence distribution shows realistic strategic assessment');
    insights.push('Mixed confidence levels indicate thorough consideration of uncertainties');
  }
  
  return insights;
}

/**
 * Generate insights for connection analysis
 */
function generateConnectionInsights(trend: TrendData, analytics: AnalyticsData): string[] {
  const insights: string[] = [];
  const networkDensity = analytics.connectionAnalysis.networkDensity;
  
  if (networkDensity > 0.5) {
    insights.push('Highly interconnected strategic network indicates strong integration');
    insights.push('Dense connections suggest comprehensive strategic thinking');
  } else if (networkDensity < 0.2) {
    insights.push('Sparse strategic connections may indicate siloed thinking');
    insights.push('Opportunity to strengthen relationships between strategic elements');
  } else {
    insights.push('Moderate connectivity shows balanced strategic architecture');
    insights.push('Network density supports both integration and focused execution');
  }
  
  return insights;
}

/**
 * Generate insights for component breakdown
 */
function generateComponentInsights(breakdown: ComponentBreakdown): string[] {
  const insights: string[] = [];
  
  if (breakdown.diversity === 'low') {
    insights.push(`Strategic focus heavily concentrated in ${breakdown.dominantCategory} elements`);
    insights.push('Concentrated approach may provide clarity but could limit strategic options');
  } else if (breakdown.diversity === 'high') {
    insights.push('Diverse strategic portfolio spans multiple domains and approaches');
    insights.push('High diversity indicates comprehensive strategic coverage');
  } else {
    insights.push('Balanced strategic composition with clear priorities and supporting elements');
    insights.push('Strategic diversity supports both focus and flexibility');
  }
  
  // Add specific insights based on dominant category
  if (breakdown.dominantCategory === 'Decision') {
    insights.push('Decision-heavy framework indicates active strategic choice-making phase');
  } else if (breakdown.dominantCategory === 'Risk') {
    insights.push('Risk-focused approach suggests thorough consideration of potential challenges');
  } else if (breakdown.dominantCategory === 'Human') {
    insights.push('Human-centric strategy emphasizes stakeholder perspectives and insights');
  }
  
  return insights;
}