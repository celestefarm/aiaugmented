import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, Eye, Lightbulb, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { ProcessedInsight } from './LastMileBriefCanvas';

export interface InsightFilter {
  id: string;
  label: string;
  type: 'type' | 'impact' | 'confidence' | 'category';
  values: string[];
}

export interface InsightCardsProps {
  insights: ProcessedInsight[];
  layout: 'grid' | 'masonry' | 'list';
  filters: InsightFilter[];
  onInsightClick?: (insightId: string) => void;
}

const InsightCards: React.FC<InsightCardsProps> = ({
  insights,
  layout,
  filters,
  onInsightClick
}) => {
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'confidence' | 'impact' | 'type'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  const getInsightIcon = (type: ProcessedInsight['type']) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="w-5 h-5" />;
      case 'anomaly':
        return <AlertTriangle className="w-5 h-5" />;
      case 'pattern':
        return <Eye className="w-5 h-5" />;
      case 'recommendation':
        return <Lightbulb className="w-5 h-5" />;
      default:
        return <Eye className="w-5 h-5" />;
    }
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'impact-high';
      case 'medium':
        return 'impact-medium';
      case 'low':
        return 'impact-low';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  };

  const toggleFilter = (filterId: string, value: string) => {
    setActiveFilters(prev => {
      const currentValues = prev[filterId] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      return {
        ...prev,
        [filterId]: newValues
      };
    });
  };

  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  // Add safety checks for insights array
  const safeInsights = insights && Array.isArray(insights) ? insights : [];
  const safeFilters = filters && Array.isArray(filters) ? filters : [];
  
  console.log('💡 [InsightCards] Processing insights:', {
    insightsCount: safeInsights.length,
    filtersCount: safeFilters.length,
    insightsType: typeof insights,
    filtersType: typeof filters,
    insightsIsArray: Array.isArray(insights),
    filtersIsArray: Array.isArray(filters)
  });

  const filteredAndSortedInsights = safeInsights
    .filter(insight => {
      // Search filter
      if (searchTerm && !insight.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !insight.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Active filters
      for (const [filterId, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;
        
        const filter = safeFilters.find(f => f.id === filterId);
        if (!filter) continue;

        let fieldValue: string;
        switch (filter.type) {
          case 'type':
            fieldValue = insight.type;
            break;
          case 'impact':
            fieldValue = insight.impact;
            break;
          case 'category':
            fieldValue = insight.category;
            break;
          case 'confidence':
            fieldValue = insight.confidence >= 0.8 ? 'high' : 
                        insight.confidence >= 0.6 ? 'medium' : 'low';
            break;
          default:
            continue;
        }

        if (!values.includes(fieldValue)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortBy) {
        case 'confidence':
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case 'impact':
          const impactOrder = { high: 3, medium: 2, low: 1 };
          aValue = impactOrder[a.impact];
          bValue = impactOrder[b.impact];
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  const handleInsightClick = (insightId: string) => {
    onInsightClick?.(insightId);
  };

  return (
    <div className="insight-cards">
      {/* Controls */}
      <div className="insight-controls">
        {/* Search */}
        <div className="search-container">
          <Search className="w-4 h-4 search-icon" />
          <input
            type="text"
            placeholder="Search insights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Filters */}
        <div className="filters-container">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
          {safeFilters.map(filter => (
            <div key={filter.id} className="filter-group">
              <span className="filter-label">{filter.label}:</span>
              {filter.values && Array.isArray(filter.values) && filter.values.map(value => (
                <button
                  key={value}
                  className={`filter-btn ${
                    activeFilters[filter.id]?.includes(value) ? 'active' : ''
                  }`}
                  onClick={() => toggleFilter(filter.id, value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Sort */}
        <div className="sort-container">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="confidence">Confidence</option>
            <option value="impact">Impact</option>
            <option value="type">Type</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="sort-order-btn"
          >
            {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        <span>{filteredAndSortedInsights.length} of {safeInsights.length} insights</span>
      </div>

      {/* Insights Grid */}
      <div className={`insights-container ${layout}`}>
        {filteredAndSortedInsights.map(insight => {
          const isExpanded = expandedInsights.has(insight.id);
          
          return (
            <div
              key={insight.id}
              className={`insight-card ${getImpactColor(insight.impact)}`}
              onClick={() => handleInsightClick(insight.id)}
            >
              <div className="insight-header">
                <div className="insight-icon-title">
                  <div className={`insight-icon ${insight.type}`}>
                    {getInsightIcon(insight.type)}
                  </div>
                  <h3 className="insight-title">{insight.title}</h3>
                </div>
                
                <div className="insight-badges">
                  <span className={`type-badge ${insight.type}`}>
                    {insight.type}
                  </span>
                  <span className={`impact-badge ${insight.impact}`}>
                    {insight.impact} impact
                  </span>
                  <span className={`confidence-badge ${getConfidenceColor(insight.confidence)}`}>
                    {Math.round(insight.confidence * 100)}%
                  </span>
                </div>
              </div>

              <div className="insight-content">
                <p className="insight-description">
                  {isExpanded ? insight.description : 
                   insight.description.length > 150 ? 
                   `${insight.description.substring(0, 150)}...` : 
                   insight.description}
                </p>

                {insight.description.length > 150 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleInsightExpansion(insight.id);
                    }}
                    className="expand-btn"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              <div className="insight-meta">
                <div className="insight-category">
                  <span className="category-label">Category:</span>
                  <span className="category-value">{insight.category}</span>
                </div>

                {insight.supportingData && Array.isArray(insight.supportingData) && insight.supportingData.length > 0 && (
                  <div className="supporting-data">
                    <span className="supporting-label">Supporting data:</span>
                    <div className="supporting-items">
                      {insight.supportingData.slice(0, 3).map((data, index) => (
                        <span key={index} className="supporting-item">
                          {data.type}: {data.value}
                        </span>
                      ))}
                      {insight.supportingData.length > 3 && (
                        <span className="supporting-more">
                          +{insight.supportingData.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {insight.visualizations && Array.isArray(insight.visualizations) && insight.visualizations.length > 0 && (
                  <div className="related-visualizations">
                    <span className="viz-label">Related visualizations:</span>
                    <div className="viz-links">
                      {insight.visualizations.map((vizId, index) => (
                        <button
                          key={index}
                          className="viz-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle visualization navigation
                          }}
                        >
                          View Chart {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredAndSortedInsights.length === 0 && (
        <div className="empty-insights">
          <Eye className="w-12 h-12 opacity-50" />
          <h3>No insights found</h3>
          <p>Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
};

export default InsightCards;