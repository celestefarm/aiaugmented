import React, { useState, useCallback, useEffect } from 'react';
import { X, Edit3, Save, RotateCcw, Copy, Trash2, Link, Zap, AlertTriangle, CheckCircle, Tag, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Edge, Node, ConnectorCardData, updateEdge, deleteEdge, summarizeRelationship } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ConnectorCardProps {
  edge: Edge;
  fromNode: Node;
  toNode: Node;
  position: { x: number; y: number };
  onClose: () => void;
  onUpdate: (updatedEdge: Edge) => void;
  onDelete: (edgeId: string) => void;
  className?: string;
}

export const ConnectorCard: React.FC<ConnectorCardProps> = ({
  edge,
  fromNode,
  toNode,
  position,
  onClose,
  onUpdate,
  onDelete,
  className = ''
}) => {
  const { currentWorkspace } = useWorkspace();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [editData, setEditData] = useState({
    description: edge.description || '',
    ai_summary: edge.ai_summary || '',
    type: edge.type,
    tags: edge.tags || [],
    relationship_strength: edge.relationship_strength || 0.5
  });
  const [newTag, setNewTag] = useState('');

  // Auto-generate AI summary if not present
  useEffect(() => {
    if (!edge.ai_summary && !edge.user_edited && currentWorkspace) {
      handleGenerateAISummary();
    }
  }, [edge.id]);

  const handleGenerateAISummary = useCallback(async () => {
    if (!currentWorkspace) return;
    
    setIsSummarizing(true);
    try {
      const response = await summarizeRelationship(currentWorkspace.id, {
        from_node_id: edge.from_node_id,
        to_node_id: edge.to_node_id,
        context: {
          from_node: fromNode,
          to_node: toNode,
          current_description: edge.description
        }
      });

      const updatedEdge = {
        ...edge,
        ai_summary: response.ai_summary,
        relationship_strength: response.relationship_strength,
        confidence_score: response.confidence_score,
        tags: response.tags,
        last_ai_update: response.generated_at
      };

      setEditData(prev => ({
        ...prev,
        ai_summary: response.ai_summary,
        relationship_strength: response.relationship_strength,
        tags: response.tags
      }));

      onUpdate(updatedEdge);
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
    } finally {
      setIsSummarizing(false);
    }
  }, [currentWorkspace, edge, fromNode, toNode, onUpdate]);

  const handleSave = useCallback(async () => {
    if (!currentWorkspace) return;
    
    setIsLoading(true);
    try {
      const updatedEdge = await updateEdge(currentWorkspace.id, edge.id, {
        ...editData,
        user_edited: true
      });
      
      onUpdate(updatedEdge);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update edge:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, edge.id, editData, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditData({
      description: edge.description || '',
      ai_summary: edge.ai_summary || '',
      type: edge.type,
      tags: edge.tags || [],
      relationship_strength: edge.relationship_strength || 0.5
    });
    setIsEditing(false);
  }, [edge]);

  const handleDelete = useCallback(async () => {
    if (!currentWorkspace) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this connection?');
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      await deleteEdge(currentWorkspace.id, edge.id);
      onDelete(edge.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete edge:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, edge.id, onDelete, onClose]);

  const handleCopySummary = useCallback(() => {
    const summary = editData.ai_summary || editData.description;
    navigator.clipboard.writeText(summary);
  }, [editData]);

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !editData.tags.includes(newTag.trim())) {
      setEditData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  }, [newTag, editData.tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'support':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'contradiction':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'dependency':
        return <Link className="w-4 h-4 text-blue-400" />;
      case 'ai-relationship':
        return <Brain className="w-4 h-4 text-purple-400" />;
      default:
        return <Link className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'support':
        return 'border-green-400/40 bg-green-500/10';
      case 'contradiction':
        return 'border-red-400/40 bg-red-500/10';
      case 'dependency':
        return 'border-blue-400/40 bg-blue-500/10';
      case 'ai-relationship':
        return 'border-purple-400/40 bg-purple-500/10';
      default:
        return 'border-gray-400/40 bg-gray-500/10';
    }
  };

  const strengthPercentage = Math.round((editData.relationship_strength || 0.5) * 100);
  const confidenceScore = edge.confidence_score ? Math.round(edge.confidence_score * 100) : null;

  return (
    <div
      className={`absolute z-50 w-96 max-w-sm glass-pane rounded-xl shadow-2xl border ${getRelationshipColor(edge.type)} ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          {getRelationshipIcon(edge.type)}
          <h3 className="text-sm font-semibold text-white capitalize">
            {edge.type.replace('-', ' ')} Connection
          </h3>
          {confidenceScore && (
            <Badge variant="outline" className="text-xs">
              {confidenceScore}% confidence
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isLoading}
                className="w-8 h-8 p-0 hover:bg-gray-700/50"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit connection</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="w-8 h-8 p-0 hover:bg-gray-700/50"
              >
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Node Connection Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">From:</span>
            <span className="text-white font-medium truncate">{fromNode.title}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">To:</span>
            <span className="text-white font-medium truncate">{toNode.title}</span>
          </div>
        </div>

        {/* Relationship Strength */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Strength:</span>
            <span className="text-white">{strengthPercentage}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${strengthPercentage}%` }}
            />
          </div>
        </div>

        {/* AI Summary */}
        {(editData.ai_summary || isSummarizing) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">AI Insights</span>
              </div>
              {!isSummarizing && (
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateAISummary}
                        disabled={isLoading}
                        className="w-6 h-6 p-0 hover:bg-gray-700/50"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Regenerate AI summary</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySummary}
                        className="w-6 h-6 p-0 hover:bg-gray-700/50"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy summary</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
            {isSummarizing ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Zap className="w-4 h-4 animate-pulse" />
                <span>Generating AI insights...</span>
              </div>
            ) : (
              <div className="text-sm text-gray-200 leading-relaxed bg-gray-800/30 rounded-lg p-3">
                {isEditing ? (
                  <Textarea
                    value={editData.ai_summary}
                    onChange={(e) => setEditData(prev => ({ ...prev, ai_summary: e.target.value }))}
                    className="min-h-[80px] bg-transparent border-gray-600 text-gray-200 resize-none"
                    placeholder="AI-generated relationship summary..."
                  />
                ) : (
                  editData.ai_summary
                )}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-white">Description</span>
          {isEditing ? (
            <Textarea
              value={editData.description}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-[60px] bg-gray-800/50 border-gray-600 text-gray-200 resize-none"
              placeholder="Describe this connection..."
            />
          ) : (
            <p className="text-sm text-gray-200 leading-relaxed">
              {editData.description || 'No description provided'}
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">Tags</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {editData.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs bg-gray-700/50 text-gray-200 hover:bg-gray-600/50"
              >
                {tag}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
            {isEditing && (
              <div className="flex items-center gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="w-20 h-6 text-xs bg-gray-800/50 border-gray-600"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTag}
                  className="w-6 h-6 p-0 hover:bg-gray-700/50"
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-700/50">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="text-gray-300 border-gray-600 hover:bg-gray-700/50"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAISummary}
              disabled={isLoading || isSummarizing}
              className="text-purple-300 border-purple-600/50 hover:bg-purple-700/20"
            >
              <Brain className="w-4 h-4 mr-1" />
              {isSummarizing ? 'Analyzing...' : 'AI Analyze'}
            </Button>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isLoading}
          className="text-red-400 hover:bg-red-700/20 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ConnectorCard;