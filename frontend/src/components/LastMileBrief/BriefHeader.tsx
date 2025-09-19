import React, { useState } from 'react';
import { FileText, Download, Share2, RefreshCw, Edit, Save, Calendar, BarChart3, Users, Link } from 'lucide-react';
import { BriefMetadata } from './LastMileBriefCanvas';

export interface BriefAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface BriefHeaderProps {
  title: string;
  metadata: BriefMetadata;
  actions: BriefAction[];
  viewMode: 'overview' | 'detailed' | 'interactive';
  onViewModeChange: (mode: 'overview' | 'detailed' | 'interactive') => void;
  onTitleEdit?: (newTitle: string) => void;
}

const BriefHeader: React.FC<BriefHeaderProps> = ({
  title,
  metadata,
  actions,
  viewMode,
  onViewModeChange,
  onTitleEdit
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  const handleTitleEdit = () => {
    if (isEditingTitle) {
      // Save title
      if (onTitleEdit && editedTitle.trim() !== title) {
        onTitleEdit(editedTitle.trim());
      }
      setIsEditingTitle(false);
    } else {
      // Start editing
      setEditedTitle(title);
      setIsEditingTitle(true);
    }
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleEdit();
    } else if (e.key === 'Escape') {
      setEditedTitle(title);
      setIsEditingTitle(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getActionIcon = (actionId: string) => {
    switch (actionId) {
      case 'refresh':
        return <RefreshCw className="w-4 h-4" />;
      case 'export':
        return <Download className="w-4 h-4" />;
      case 'share':
        return <Share2 className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="brief-header">
      <div className="brief-header-main">
        <div className="brief-title-section">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleEdit}
              onKeyDown={handleTitleKeyPress}
              className="brief-title-input"
              autoFocus
            />
          ) : (
            <h1 className="brief-title">{title}</h1>
          )}
          
          {onTitleEdit && (
            <button
              onClick={handleTitleEdit}
              className="title-edit-btn"
              title={isEditingTitle ? 'Save title' : 'Edit title'}
            >
              {isEditingTitle ? (
                <Save className="w-4 h-4" />
              ) : (
                <Edit className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        <div className="brief-actions">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className="brief-action-btn"
              title={action.label}
            >
              {action.icon || getActionIcon(action.id)}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="brief-metadata">
        <div className="metadata-item">
          <Calendar className="w-4 h-4" />
          <span>Generated: {formatDate(metadata.generatedAt)}</span>
        </div>
        
        <div className="metadata-item">
          <BarChart3 className="w-4 h-4" />
          <span>Nodes: {metadata.nodeCount}</span>
        </div>
        
        <div className="metadata-item">
          <Link className="w-4 h-4" />
          <span>Connections: {metadata.edgeCount}</span>
        </div>
        
        <div className="metadata-item">
          <Users className="w-4 h-4" />
          <span>Confidence: {Math.round(metadata.confidenceScore * 100)}%</span>
        </div>
      </div>

      <div className="view-mode-selector">
        <div className="view-mode-tabs">
          <button
            className={`view-mode-tab ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => onViewModeChange('overview')}
          >
            Overview
          </button>
          <button
            className={`view-mode-tab ${viewMode === 'detailed' ? 'active' : ''}`}
            onClick={() => onViewModeChange('detailed')}
          >
            Detailed
          </button>
          <button
            className={`view-mode-tab ${viewMode === 'interactive' ? 'active' : ''}`}
            onClick={() => onViewModeChange('interactive')}
          >
            Interactive
          </button>
        </div>
      </div>
    </div>
  );
};

export default BriefHeader;