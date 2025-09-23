import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  CheckCircle, 
  Shield,
  Eye,
  Filter,
  Search,
  Clock,
  User,
  FileText,
  Database,
  Lightbulb,
  Target
} from 'lucide-react';

interface EvidencePiece {
  id: string;
  content: string;
  type: 'quantitative' | 'qualitative' | 'anecdotal' | 'expert_opinion' | 'research_based' | 'experiential' | 'hypothetical';
  quality: 'high' | 'medium' | 'low' | 'speculative';
  confidence: number;
  source: string;
  timestamp: string;
  tags?: string[];
  context?: string;
  reliability_score?: number;
  recency_score?: number;
  verification_level?: number;
}

interface EvidenceClassification {
  primary_quality: string;
  quality_scores: Record<string, number>;
  evidence_types: string[];
  confidence_score: number;
  evidence_pieces: EvidencePiece[];
  source_reliability: number;
  recency_score: number;
  verification_level: number;
}

interface EvidenceQualityDashboardProps {
  evidenceClassification: EvidenceClassification;
  evidencePieces?: EvidencePiece[];
  onEvidenceSelect?: (evidence: EvidencePiece) => void;
  onQualityFilter?: (quality: string) => void;
  onTypeFilter?: (type: string) => void;
  className?: string;
  showFilters?: boolean;
  compact?: boolean;
}

const EvidenceQualityDashboard: React.FC<EvidenceQualityDashboardProps> = ({
  evidenceClassification,
  evidencePieces = [],
  onEvidenceSelect,
  onQualityFilter,
  onTypeFilter,
  className = "",
  showFilters = true,
  compact = false
}) => {
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());

  // Combine evidence from classification and props
  const allEvidence = useMemo(() => {
    const classificationEvidence = evidenceClassification.evidence_pieces || [];
    return [...classificationEvidence, ...evidencePieces];
  }, [evidenceClassification.evidence_pieces, evidencePieces]);

  // Filter evidence based on selected filters and search
  const filteredEvidence = useMemo(() => {
    return allEvidence.filter(evidence => {
      const matchesQuality = !selectedQuality || evidence.quality === selectedQuality;
      const matchesType = !selectedType || evidence.type === selectedType;
      const matchesSearch = !searchTerm || 
        evidence.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evidence.source.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesQuality && matchesType && matchesSearch;
    });
  }, [allEvidence, selectedQuality, selectedType, searchTerm]);

  // Calculate quality distribution
  const qualityDistribution = useMemo(() => {
    const distribution = { high: 0, medium: 0, low: 0, speculative: 0 };
    allEvidence.forEach(evidence => {
      distribution[evidence.quality]++;
    });
    return distribution;
  }, [allEvidence]);

  // Calculate type distribution
  const typeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    allEvidence.forEach(evidence => {
      distribution[evidence.type] = (distribution[evidence.type] || 0) + 1;
    });
    return distribution;
  }, [allEvidence]);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'speculative': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quantitative': return <BarChart3 className="h-4 w-4" />;
      case 'qualitative': return <FileText className="h-4 w-4" />;
      case 'expert_opinion': return <User className="h-4 w-4" />;
      case 'research_based': return <Database className="h-4 w-4" />;
      case 'experiential': return <Target className="h-4 w-4" />;
      case 'hypothetical': return <Lightbulb className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const toggleEvidenceExpansion = (evidenceId: string) => {
    const newExpanded = new Set(expandedEvidence);
    if (newExpanded.has(evidenceId)) {
      newExpanded.delete(evidenceId);
    } else {
      newExpanded.add(evidenceId);
    }
    setExpandedEvidence(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`evidence-quality-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Evidence Quality Dashboard</h2>
            <p className="text-sm text-gray-500">{allEvidence.length} evidence pieces analyzed</p>
          </div>
        </div>
        <Badge className={getQualityColor(evidenceClassification.primary_quality)}>
          Primary Quality: {evidenceClassification.primary_quality.toUpperCase()}
        </Badge>
      </div>

      {/* Quality Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Confidence</p>
                <p className={`text-2xl font-bold ${getConfidenceColor(evidenceClassification.confidence_score)}`}>
                  {Math.round(evidenceClassification.confidence_score * 100)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Source Reliability</p>
                <p className={`text-2xl font-bold ${getConfidenceColor(evidenceClassification.source_reliability)}`}>
                  {Math.round(evidenceClassification.source_reliability * 100)}%
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recency Score</p>
                <p className={`text-2xl font-bold ${getConfidenceColor(evidenceClassification.recency_score)}`}>
                  {Math.round(evidenceClassification.recency_score * 100)}%
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verification Level</p>
                <p className={`text-2xl font-bold ${getConfidenceColor(evidenceClassification.verification_level)}`}>
                  {Math.round(evidenceClassification.verification_level * 100)}%
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Quality Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(qualityDistribution).map(([quality, count]) => (
                <div key={quality} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getQualityColor(quality)} variant="outline">
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </Badge>
                    <span className="text-sm text-gray-600">{count} pieces</span>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        quality === 'high' ? 'bg-green-500' :
                        quality === 'medium' ? 'bg-yellow-500' :
                        quality === 'low' ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(count / allEvidence.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Evidence Types</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(typeDistribution).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(type)}
                    <span className="text-sm font-medium capitalize">
                      {type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">({count})</span>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(count / allEvidence.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="flex items-center space-x-2 flex-1 min-w-64">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search evidence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Quality Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Quality:</span>
                <select
                  value={selectedQuality || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setSelectedQuality(value);
                    onQualityFilter?.(value || '');
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Qualities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="speculative">Speculative</option>
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Type:</span>
                <select
                  value={selectedType || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setSelectedType(value);
                    onTypeFilter?.(value || '');
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="quantitative">Quantitative</option>
                  <option value="qualitative">Qualitative</option>
                  <option value="expert_opinion">Expert Opinion</option>
                  <option value="research_based">Research Based</option>
                  <option value="experiential">Experiential</option>
                  <option value="hypothetical">Hypothetical</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(selectedQuality || selectedType || searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedQuality(null);
                    setSelectedType(null);
                    setSearchTerm('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidence List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Evidence Details</span>
              <Badge variant="secondary">{filteredEvidence.length} items</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEvidence.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No evidence matches the current filters.</p>
              </div>
            ) : (
              filteredEvidence.map((evidence) => (
                <div
                  key={evidence.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => toggleEvidenceExpansion(evidence.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getTypeIcon(evidence.type)}
                        <Badge className={getQualityColor(evidence.quality)} variant="outline">
                          {evidence.quality}
                        </Badge>
                        <Badge variant="outline">
                          {evidence.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(evidence.timestamp)}
                        </span>
                      </div>
                      <p className={`text-gray-700 ${expandedEvidence.has(evidence.id) ? '' : 'line-clamp-2'}`}>
                        {evidence.content}
                      </p>
                      {expandedEvidence.has(evidence.id) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Source:</span>
                              <span className="ml-2 font-medium">{evidence.source}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Confidence:</span>
                              <span className={`ml-2 font-medium ${getConfidenceColor(evidence.confidence)}`}>
                                {Math.round(evidence.confidence * 100)}%
                              </span>
                            </div>
                            {evidence.reliability_score !== undefined && (
                              <div>
                                <span className="text-gray-600">Reliability:</span>
                                <span className={`ml-2 font-medium ${getConfidenceColor(evidence.reliability_score)}`}>
                                  {Math.round(evidence.reliability_score * 100)}%
                                </span>
                              </div>
                            )}
                            {evidence.verification_level !== undefined && (
                              <div>
                                <span className="text-gray-600">Verification:</span>
                                <span className={`ml-2 font-medium ${getConfidenceColor(evidence.verification_level)}`}>
                                  {Math.round(evidence.verification_level * 100)}%
                                </span>
                              </div>
                            )}
                          </div>
                          {evidence.tags && evidence.tags.length > 0 && (
                            <div className="mt-2">
                              <span className="text-sm text-gray-600">Tags:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {evidence.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col items-end space-y-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(evidence.confidence)}`}>
                        {Math.round(evidence.confidence * 100)}%
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEvidenceSelect?.(evidence);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EvidenceQualityDashboard;