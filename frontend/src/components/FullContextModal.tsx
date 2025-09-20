import React, { useMemo, useState } from 'react';
import { X, Target, TrendingUp, AlertTriangle, CheckCircle, Users, Clock, ArrowRight, Edit3, Save } from 'lucide-react';
import { Node, Edge } from '@/lib/api';
import { ProcessedContent } from '@/utils/tooltipContentUtils';
import { formatTimestamp } from '@/utils/nodeUtils';

interface FullContextModalProps {
  node: Node;
  edges: Edge[];
  processedContent: ProcessedContent;
  isOpen: boolean;
  onClose: () => void;
}

interface RelatedNode {
  id: string;
  title: string;
  type: string;
  relationship: string;
}

interface EditableContent {
  executiveSummary: string;
  strategicAnalysis: string;
  decisionPoints: string[];
  nextActions: string[];
  keyInsights: string[];
}

export const FullContextModal: React.FC<FullContextModalProps> = ({
  node,
  edges,
  processedContent,
  isOpen,
  onClose
}) => {
  // Initialize editable content state
  const [editableContent, setEditableContent] = useState<EditableContent>({
    executiveSummary: processedContent.executiveSummary,
    strategicAnalysis: processedContent.strategicAnalysis,
    decisionPoints: [...processedContent.decisionPoints],
    nextActions: [...processedContent.nextActions],
    keyInsights: [...processedContent.keyInsights]
  });

  const [isEditing, setIsEditing] = useState(false);

  // Calculate related nodes from edges
  const relatedNodes = useMemo(() => {
    const related: RelatedNode[] = [];
    
    edges.forEach(edge => {
      if (edge.from_node_id === node.id || edge.to_node_id === node.id) {
        // In a real implementation, you'd fetch the related node data
        // For now, we'll create placeholder data
        const isSource = edge.from_node_id === node.id;
        related.push({
          id: isSource ? edge.to_node_id : edge.from_node_id,
          title: `Related Node ${related.length + 1}`,
          type: edge.type,
          relationship: isSource ? 'influences' : 'influenced by'
        });
      }
    });
    
    return related;
  }, [node.id, edges]);

  const connectionCount = edges.filter(
    e => e.from_node_id === node.id || e.to_node_id === node.id
  ).length;

  // Handle content changes
  const handleContentChange = (field: keyof EditableContent, value: string | string[]) => {
    setEditableContent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle array item changes (for decision points, next actions, key insights)
  const handleArrayItemChange = (field: 'decisionPoints' | 'nextActions' | 'keyInsights', index: number, value: string) => {
    setEditableContent(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  // Add new array item
  const addArrayItem = (field: 'decisionPoints' | 'nextActions' | 'keyInsights') => {
    setEditableContent(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  // Remove array item
  const removeArrayItem = (field: 'decisionPoints' | 'nextActions' | 'keyInsights', index: number) => {
    setEditableContent(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-[#6B6B3A]/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#6B6B3A]/20">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-[#6B6B3A]" />
            <h2 className="text-xl font-semibold text-white">
              Complete Conversation Analysis
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-[#6B6B3A]/20 hover:border-[#6B6B3A]/40 transition-all duration-200"
              aria-label={isEditing ? "Save changes" : "Edit content"}
            >
              {isEditing ? <Save className="w-5 h-5 text-green-400" /> : <Edit3 className="w-5 h-5 text-[#6B6B3A]" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-[#6B6B3A]/20 hover:border-[#6B6B3A]/40 transition-all duration-200"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)] overflow-hidden">
          {/* Left Column */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Strategic Overview */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#6B6B3A]" />
                <h3 className="text-lg font-semibold text-white">Strategic Overview</h3>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-[#6B6B3A]/10">
                {isEditing ? (
                  <textarea
                    value={editableContent.executiveSummary}
                    onChange={(e) => handleContentChange('executiveSummary', e.target.value)}
                    className="w-full bg-slate-700/50 text-gray-300 rounded-lg p-3 border border-[#6B6B3A]/20 focus:border-[#6B6B3A]/40 focus:outline-none resize-none"
                    rows={3}
                    placeholder="Executive Summary..."
                  />
                ) : (
                  <p className="text-gray-300 leading-relaxed mb-4">
                    {editableContent.executiveSummary}
                  </p>
                )}
                <div className="text-sm text-gray-400 mt-4">
                  <strong>Strategic Analysis:</strong>
                  {isEditing ? (
                    <textarea
                      value={editableContent.strategicAnalysis}
                      onChange={(e) => handleContentChange('strategicAnalysis', e.target.value)}
                      className="w-full mt-2 bg-slate-700/50 text-gray-300 rounded-lg p-3 border border-[#6B6B3A]/20 focus:border-[#6B6B3A]/40 focus:outline-none resize-none"
                      rows={2}
                      placeholder="Strategic Analysis..."
                    />
                  ) : (
                    <p className="mt-2">{editableContent.strategicAnalysis}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Key Decisions */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-[#6B6B3A]" />
                <h3 className="text-lg font-semibold text-white">Key Decisions</h3>
              </div>
              <div className="space-y-3">
                {editableContent.decisionPoints.length > 0 ? (
                  editableContent.decisionPoints.map((decision, index) => (
                    <div key={index} className="bg-slate-800/30 rounded-lg p-3 border border-[#6B6B3A]/10">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <textarea
                            value={decision}
                            onChange={(e) => handleArrayItemChange('decisionPoints', index, e.target.value)}
                            className="flex-1 bg-slate-700/50 text-gray-300 rounded-lg p-2 border border-[#6B6B3A]/20 focus:border-[#6B6B3A]/40 focus:outline-none resize-none"
                            rows={1}
                            placeholder="Decision point..."
                          />
                          <button
                            onClick={() => removeArrayItem('decisionPoints', index)}
                            className="px-2 py-1 text-red-400 hover:text-red-300 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-300">{decision}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">No specific decisions identified</p>
                )}
                {isEditing && (
                  <button
                    onClick={() => addArrayItem('decisionPoints')}
                    className="w-full p-2 border-2 border-dashed border-[#6B6B3A]/30 rounded-lg text-[#6B6B3A] hover:border-[#6B6B3A]/50 transition-colors"
                  >
                    + Add Decision Point
                  </button>
                )}
              </div>
            </div>

            {/* Impact Assessment */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-[#6B6B3A]" />
                <h3 className="text-lg font-semibold text-white">Impact Assessment</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-lg p-4 border border-[#6B6B3A]/10">
                  <h4 className="font-medium text-white mb-2">Opportunities</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {editableContent.keyInsights.slice(0, Math.ceil(editableContent.keyInsights.length / 2)).map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                        {isEditing ? (
                          <div className="flex-1 flex gap-1">
                            <textarea
                              value={insight}
                              onChange={(e) => handleArrayItemChange('keyInsights', index, e.target.value)}
                              className="flex-1 bg-slate-700/50 text-gray-300 rounded p-1 border border-[#6B6B3A]/20 focus:border-[#6B6B3A]/40 focus:outline-none resize-none text-xs"
                              rows={1}
                              placeholder="Key insight..."
                            />
                            <button
                              onClick={() => removeArrayItem('keyInsights', index)}
                              className="text-red-400 hover:text-red-300 text-xs px-1"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <span>{insight}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {isEditing && (
                    <button
                      onClick={() => addArrayItem('keyInsights')}
                      className="w-full mt-2 p-1 border border-dashed border-[#6B6B3A]/30 rounded text-[#6B6B3A] hover:border-[#6B6B3A]/50 transition-colors text-xs"
                    >
                      + Add Insight
                    </button>
                  )}
                </div>
                <div className="bg-slate-800/30 rounded-lg p-4 border border-[#6B6B3A]/10">
                  <h4 className="font-medium text-white mb-2">Considerations</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {editableContent.keyInsights.slice(Math.ceil(editableContent.keyInsights.length / 2)).map((insight, index) => {
                      const actualIndex = Math.ceil(editableContent.keyInsights.length / 2) + index;
                      return (
                        <li key={actualIndex} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
                          {isEditing ? (
                            <div className="flex-1 flex gap-1">
                              <textarea
                                value={insight}
                                onChange={(e) => handleArrayItemChange('keyInsights', actualIndex, e.target.value)}
                                className="flex-1 bg-slate-700/50 text-gray-300 rounded p-1 border border-[#6B6B3A]/20 focus:border-[#6B6B3A]/40 focus:outline-none resize-none text-xs"
                                rows={1}
                                placeholder="Key insight..."
                              />
                              <button
                                onClick={() => removeArrayItem('keyInsights', actualIndex)}
                                className="text-red-400 hover:text-red-300 text-xs px-1"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <span>{insight}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-80 border-l border-[#6B6B3A]/20 p-6 overflow-y-auto bg-slate-900/20">
            {/* Relationship Map */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#6B6B3A]" />
                <h3 className="text-lg font-semibold text-white">Relationship Map</h3>
              </div>
              <div className="space-y-3">
                {relatedNodes.length > 0 ? (
                  relatedNodes.map((relatedNode, index) => (
                    <div key={index} className="bg-slate-800/30 rounded-lg p-3 border border-[#6B6B3A]/10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-[#6B6B3A]" />
                        <span className="text-sm font-medium text-white truncate">
                          {relatedNode.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 capitalize">
                        {relatedNode.relationship} • {relatedNode.type}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic text-sm">No connections found</p>
                )}
              </div>
            </div>

            {/* Conversation History */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[#6B6B3A]" />
                <h3 className="text-lg font-semibold text-white">Timeline</h3>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-[#6B6B3A]/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#6B6B3A]" />
                  <div>
                    <p className="text-sm font-medium text-white">Node Created</p>
                    <p className="text-xs text-gray-400">{formatTimestamp(node.created_at)}</p>
                  </div>
                </div>
                {node.updated_at !== node.created_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Last Updated</p>
                      <p className="text-xs text-gray-400">{formatTimestamp(node.updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Actions */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowRight className="w-5 h-5 text-[#6B6B3A]" />
                <h3 className="text-lg font-semibold text-white">Recommended Actions</h3>
              </div>
              <div className="space-y-2">
                {editableContent.nextActions.length > 0 ? (
                  editableContent.nextActions.map((action, index) => (
                    <div key={index} className="bg-slate-800/30 rounded-lg p-3 border border-[#6B6B3A]/10">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <textarea
                            value={action}
                            onChange={(e) => handleArrayItemChange('nextActions', index, e.target.value)}
                            className="flex-1 bg-slate-700/50 text-gray-300 rounded-lg p-2 border border-[#6B6B3A]/20 focus:border-[#6B6B3A]/40 focus:outline-none resize-none text-sm"
                            rows={1}
                            placeholder="Next action..."
                          />
                          <button
                            onClick={() => removeArrayItem('nextActions', index)}
                            className="px-2 py-1 text-red-400 hover:text-red-300 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-300">{action}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic text-sm">No specific actions recommended</p>
                )}
                {isEditing && (
                  <button
                    onClick={() => addArrayItem('nextActions')}
                    className="w-full p-2 border-2 border-dashed border-[#6B6B3A]/30 rounded-lg text-[#6B6B3A] hover:border-[#6B6B3A]/50 transition-colors text-sm"
                  >
                    + Add Action
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#6B6B3A]/20 bg-slate-900/30">
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>{connectionCount} connections</span>
            {node.confidence && (
              <span className="text-[#6B6B3A]">{node.confidence}% confidence</span>
            )}
            <span>Type: {node.type}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#6B6B3A]/20 hover:bg-[#6B6B3A]/30 border border-[#6B6B3A]/40 rounded-lg text-white transition-all duration-200"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};