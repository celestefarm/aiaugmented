import React, { useState, useMemo, useCallback } from 'react';
import { FloatingPortal, FloatingArrow } from '@floating-ui/react';
import { Node, Edge } from '@/lib/api';
import { formatTimestamp } from '@/utils/nodeUtils';
import {
  processNodeContent,
  ProcessedContent
} from '@/utils/tooltipContentUtils';
import { FullContextModal } from './FullContextModal';
import {
  User,
  Target,
  X,
  Link,
  Check,
  Info,
  ExternalLink,
  Lightbulb
} from 'lucide-react';

interface NodeTooltipProps {
  node: Node;
  edges: Edge[];
  isOpen: boolean;
  refs: any;
  floatingStyles: React.CSSProperties;
  arrowRef: React.RefObject<SVGSVGElement>;
  context: any;
  getFloatingProps: () => any;
  onModalOpen?: (node: Node, edges: Edge[], processedContent: ProcessedContent) => void;
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'human':
      return <User className="w-4 h-4 text-[#6B6B3A]" />;
    case 'ai':
      return <Target className="w-4 h-4 text-blue-400" />;
    case 'risk':
      return <X className="w-4 h-4 text-red-400" />;
    case 'dependency':
      return <Link className="w-4 h-4 text-gray-400" />;
    case 'decision':
      return <Check className="w-4 h-4 text-yellow-400" />;
    default:
      return <Info className="w-4 h-4 text-gray-400" />;
  }
};

export const NodeTooltip: React.FC<NodeTooltipProps> = ({
  node,
  edges,
  isOpen,
  refs,
  floatingStyles,
  arrowRef,
  context,
  getFloatingProps,
  onModalOpen,
}) => {
  // Process content with memoization for performance
  const processedContent = useMemo(() => {
    return processNodeContent(node);
  }, [node]);

  // Calculate connection count
  const connectionCount = useMemo(() => {
    return edges.filter(e => e.from_node_id === node.id || e.to_node_id === node.id).length;
  }, [edges, node.id]);

  // Handle modal open - now delegates to parent component
  const handleOpenModal = useCallback((e: React.MouseEvent) => {
    // Prevent event propagation to avoid tooltip dismiss
    e.stopPropagation();
    e.preventDefault();
    
    if (onModalOpen) {
      onModalOpen(node, edges, processedContent);
    }
  }, [onModalOpen, node, edges, processedContent]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Create a synthetic mouse event for consistency
        const syntheticEvent = {
          stopPropagation: () => {},
          preventDefault: () => {}
        } as React.MouseEvent;
        handleOpenModal(syntheticEvent);
        break;
    }
  }, [handleOpenModal]);

  // Remove problematic useEffect that caused re-rendering during animation

  if (!isOpen) return null;

  return (
    <>
      <FloatingPortal>
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            width: '320px',
            minHeight: '280px',
            maxHeight: '320px'
          }}
          className="tooltip-portal"
          {...getFloatingProps()}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="tooltip"
          aria-labelledby={`tooltip-title-${node.id}`}
          aria-describedby={`tooltip-content-${node.id}`}
        >
          <div className="tooltip-content-enhanced">
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="tooltip-arrow"
            />
            
            {/* Header */}
            <div className="tooltip-header">
              <div className="flex items-center gap-2 mb-4">
                {getNodeIcon(node.type)}
                <h3 
                  id={`tooltip-title-${node.id}`}
                  className="font-semibold text-[#6B6B3A] flex-1 truncate"
                >
                  {node.title}
                </h3>
              </div>
            </div>

            {/* Content */}
            <div id={`tooltip-content-${node.id}`} className="tooltip-body" style={{ overflow: 'visible' }}>
              {/* Tier 1: Quick Scan View */}
              <div className="tooltip-section tooltip-executive-summary">
                <div className="tooltip-section-header">
                  <Target className="tooltip-section-icon" />
                  <span>Executive Summary</span>
                </div>
                <div className="tooltip-section-content">
                  {processedContent.executiveSummary}
                </div>
              </div>

              {/* Key Insights - Always visible */}
              <div className="tooltip-section">
                <div className="tooltip-section-header">
                  <Lightbulb className="tooltip-section-icon" />
                  <span>Key Insights</span>
                </div>
                <ul className="tooltip-insights-list">
                  {processedContent.keyInsights.map((insight, index) => (
                    <li key={index} className="tooltip-insights-item">
                      <div className="tooltip-insights-bullet" />
                      <span className="tooltip-section-content">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Action Button */}
            <div className="tooltip-action-buttons">
              <button
                onClick={handleOpenModal}
                className="tooltip-action-button"
                aria-label="Open full context modal"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Full Context</span>
              </button>
            </div>

            {/* Footer */}
            <div className="tooltip-footer-enhanced">
              <div className="tooltip-footer-stats">
                <span>{connectionCount} connections</span>
                {node.confidence && (
                  <span className="text-[#6B6B3A]">
                    {node.confidence}% confidence
                  </span>
                )}
              </div>
              <span className="tooltip-footer-timestamp">
                {formatTimestamp(node.created_at)}
              </span>
            </div>
          </div>
        </div>
      </FloatingPortal>
    </>
  );
};