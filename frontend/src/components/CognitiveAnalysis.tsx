import React, { useState } from 'react';
import { Brain, Zap, Network, Lightbulb, Loader2 } from 'lucide-react';
import { analyzeCognitiveRelationships, autoConnectNodes } from '../lib/api';
import type { CognitiveAnalysisResponse, AutoConnectResponse, RelationshipSuggestion } from '../lib/api';

interface CognitiveAnalysisProps {
  workspaceId: string;
  selectedNodeIds?: string[];
  onRelationshipSuggested?: (suggestion: RelationshipSuggestion) => void;
  onConnectionsCreated?: (connections: number) => void;
}

export const CognitiveAnalysis: React.FC<CognitiveAnalysisProps> = ({
  workspaceId,
  selectedNodeIds,
  onRelationshipSuggested,
  onConnectionsCreated,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CognitiveAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeRelationships = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeCognitiveRelationships(workspaceId, selectedNodeIds);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze relationships');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoConnect = async () => {
    setIsAutoConnecting(true);
    setError(null);
    
    try {
      const result: AutoConnectResponse = await autoConnectNodes(workspaceId);
      if (result.success && onConnectionsCreated) {
        onConnectionsCreated(result.connections_created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-connect nodes');
    } finally {
      setIsAutoConnecting(false);
    }
  };

  const handleSuggestionClick = (suggestion: RelationshipSuggestion) => {
    if (onRelationshipSuggested) {
      onRelationshipSuggested(suggestion);
    }
  };

  const getRelationshipTypeColor = (type: string) => {
    switch (type) {
      case 'support':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'contradiction':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'dependency':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'ai-relationship':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return 'text-green-700 font-semibold';
    if (strength >= 0.6) return 'text-yellow-700 font-medium';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Cognitive Analysis</h3>
      </div>

      <div className="space-y-3">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAnalyzeRelationships}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Network className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze Relationships'}
          </button>

          <button
            onClick={handleAutoConnect}
            disabled={isAutoConnecting}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isAutoConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isAutoConnecting ? 'Connecting...' : 'Auto-Connect'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Luxury Analysis Results */}
        {analysisResult && (
          <div className="space-y-5">
            {/* Relationship Suggestions */}
            {analysisResult.suggestions.length > 0 && (
              <div className="luxury-glass rounded-xl p-4 border border-[#6B6B3A]/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#6B6B3A]/20 to-purple-500/20 flex items-center justify-center border border-[#6B6B3A]/30">
                    <Network className="w-3 h-3 text-[#6B6B3A]" />
                  </div>
                  <h4 className="text-sm font-bold glow-olive-text">
                    Relationship Suggestions
                  </h4>
                  <span className="ml-auto px-2 py-1 bg-[#6B6B3A]/20 text-[#6B6B3A] text-xs rounded-full border border-[#6B6B3A]/30">
                    {analysisResult.suggestions.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                  {analysisResult.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="group relative luxury-button p-3 rounded-xl cursor-pointer hover-elevate transition-all duration-300 border border-gray-600/30 hover:border-[#6B6B3A]/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs border font-medium shadow-lg ${getRelationshipTypeColor(suggestion.relationship_type)}`}>
                          {suggestion.relationship_type}
                        </span>
                        <span className={`text-xs font-semibold ${getStrengthColor(suggestion.strength)}`}>
                          {Math.round(suggestion.strength * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2 leading-relaxed">{suggestion.reasoning}</p>
                      {suggestion.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {suggestion.keywords.map((keyword, kidx) => (
                            <span key={kidx} className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-md border border-gray-600/30 font-medium">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cognitive Clusters */}
            {analysisResult.clusters.length > 0 && (
              <div className="luxury-glass rounded-xl p-4 border border-blue-400/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-400/30">
                    <Brain className="w-3 h-3 text-blue-300" />
                  </div>
                  <h4 className="text-sm font-bold text-blue-300">
                    Cognitive Clusters
                  </h4>
                  <span className="ml-auto px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-400/30">
                    {analysisResult.clusters.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {analysisResult.clusters.map((cluster, index) => (
                    <div key={index} className="luxury-button p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/30 rounded-xl shadow-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-400/30 font-medium">
                          {cluster.type}
                        </span>
                        <span className="font-bold text-sm text-[#E5E7EB]">{cluster.name}</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2 leading-relaxed">{cluster.description}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <p className="text-xs text-blue-300 font-medium">{cluster.nodes.length} nodes in cluster</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Insights */}
            {analysisResult.insights.length > 0 && (
              <div className="luxury-glass rounded-xl p-4 border border-amber-400/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-400/30">
                    <Lightbulb className="w-3 h-3 text-amber-300" />
                  </div>
                  <h4 className="text-sm font-bold text-amber-300">
                    Strategic Insights
                  </h4>
                  <span className="ml-auto px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full border border-amber-400/30">
                    {analysisResult.insights.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {analysisResult.insights.map((insight, index) => (
                    <div key={index} className="luxury-button p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-400/30 rounded-xl shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-300 leading-relaxed">{insight}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Luxury Help Text */}
        {!analysisResult && !isAnalyzing && (
          <div className="luxury-glass rounded-xl p-4 border border-gray-600/30">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B6B3A]/20 to-purple-500/20 flex items-center justify-center border border-[#6B6B3A]/30 flex-shrink-0 mt-0.5">
                  <Network className="w-4 h-4 text-[#6B6B3A]" />
                </div>
                <div>
                  <h5 className="font-semibold text-[#E5E7EB] mb-1">Analyze Relationships</h5>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    AI will examine your nodes and suggest meaningful connections based on content, context, and strategic implications.
                  </p>
                </div>
              </div>
              
              <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-400/30 flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <h5 className="font-semibold text-[#E5E7EB] mb-1">Auto-Connect</h5>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Automatically create high-confidence connections between related ideas, simulating cognitive brain connections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};