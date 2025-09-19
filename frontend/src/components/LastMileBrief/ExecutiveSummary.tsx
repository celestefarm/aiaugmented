import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Clock, Target, Zap } from 'lucide-react';
import { KeyMetric, ExecutiveInsight, Recommendation } from './LastMileBriefCanvas';

export interface ExecutiveSummaryProps {
  keyMetrics: KeyMetric[];
  insights: ExecutiveInsight[];
  recommendations: Recommendation[];
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  keyMetrics,
  insights,
  recommendations
}) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getSignificanceColor = (significance: 'high' | 'medium' | 'low') => {
    switch (significance) {
      case 'high':
        return 'significance-high';
      case 'medium':
        return 'significance-medium';
      case 'low':
        return 'significance-low';
    }
  };

  const getImpactIcon = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <Zap className="w-4 h-4 text-red-400" />;
      case 'medium':
        return <Target className="w-4 h-4 text-yellow-400" />;
      case 'low':
        return <Clock className="w-4 h-4 text-green-400" />;
    }
  };

  const formatMetricValue = (value: number | string, format: string) => {
    if (format === 'percentage' && typeof value === 'number') {
      return `${value}%`;
    }
    if (format === 'currency' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }
    if (format === 'number' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US').format(value);
    }
    return value.toString();
  };

  return (
    <div className="executive-summary">
      {/* Key Metrics Section */}
      <div className="summary-section">
        <h2 className="section-title">Key Metrics</h2>
        <div className="metrics-grid">
          {keyMetrics.map((metric) => (
            <div key={metric.id} className={`metric-card ${getSignificanceColor(metric.significance)}`}>
              <div className="metric-header">
                <span className="metric-label">{metric.label}</span>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="metric-value">
                {formatMetricValue(metric.value, metric.format)}
              </div>
              <div className="metric-significance">
                <span className={`significance-badge ${metric.significance}`}>
                  {metric.significance} impact
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Executive Insights Section */}
      <div className="summary-section">
        <h2 className="section-title">Executive Insights</h2>
        <div className="insights-grid">
          {insights.map((insight) => (
            <div key={insight.id} className="insight-card">
              <div className="insight-header">
                <div className="insight-title-row">
                  <h3 className="insight-title">{insight.title}</h3>
                  {getImpactIcon(insight.impact)}
                </div>
                <div className="insight-meta">
                  <span className={`impact-badge ${insight.impact}`}>
                    {insight.impact} impact
                  </span>
                  <span className="confidence-score">
                    {Math.round(insight.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
              <p className="insight-description">{insight.description}</p>
              {insight.supportingData.length > 0 && (
                <div className="supporting-data">
                  <span className="supporting-label">Supporting data:</span>
                  <div className="supporting-tags">
                    {insight.supportingData.map((data, index) => (
                      <span key={index} className="supporting-tag">
                        {data}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="summary-section">
        <h2 className="section-title">Strategic Recommendations</h2>
        <div className="recommendations-grid">
          {recommendations.map((recommendation) => (
            <div key={recommendation.id} className="recommendation-card">
              <div className="recommendation-header">
                <div className="recommendation-title-row">
                  <h3 className="recommendation-title">{recommendation.title}</h3>
                  {getPriorityIcon(recommendation.priority)}
                </div>
                <div className="recommendation-meta">
                  <span className={`priority-badge ${recommendation.priority}`}>
                    {recommendation.priority} priority
                  </span>
                  <span className={`impact-badge ${recommendation.impact}`}>
                    {recommendation.impact} impact
                  </span>
                  <span className={`effort-badge ${recommendation.effort}`}>
                    {recommendation.effort} effort
                  </span>
                </div>
              </div>
              <p className="recommendation-description">{recommendation.description}</p>
              <div className="recommendation-category">
                <span className="category-label">Category:</span>
                <span className="category-tag">{recommendation.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="summary-section">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Metrics</span>
            <span className="stat-value">{keyMetrics.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Key Insights</span>
            <span className="stat-value">{insights.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Recommendations</span>
            <span className="stat-value">{recommendations.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">High Priority Actions</span>
            <span className="stat-value">
              {recommendations.filter(r => r.priority === 'high').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummary;