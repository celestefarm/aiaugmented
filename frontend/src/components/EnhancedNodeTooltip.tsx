import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Node, Edge, generateExecutiveSummary, ExecutiveSummaryResponse } from '@/lib/api';
import { formatTimestamp } from '@/utils/nodeUtils';
import { useAgentChat } from '@/contexts/AgentChatContext';
import { FullContextModal } from './FullContextModal';
import { ProcessedContent } from '@/utils/tooltipContentUtils';
import {
  User,
  Target,
  X,
  Link,
  Check,
  Info,
  ExternalLink,
  Lightbulb,
  Brain,
  Loader2
} from 'lucide-react';

interface EnhancedNodeTooltipProps {
  node: Node;
  edges: Edge[];
  isOpen: boolean;
  transform: { x: number; y: number; scale: number };
  nodeElement: HTMLElement | null;
  onModalOpen?: (node: Node, edges: Edge[], processedContent: ProcessedContent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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

export const EnhancedNodeTooltip: React.FC<EnhancedNodeTooltipProps> = ({
  node,
  edges,
  isOpen,
  transform,
  nodeElement,
  onModalOpen,
  onMouseEnter,
  onMouseLeave,
}) => {
  // Access chat context for conversation data
  const { messages } = useAgentChat();
  
  // AI Executive Summary state
  const [aiSummary, setAiSummary] = useState<ExecutiveSummaryResponse | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Calculate connection count
  const connectionCount = useMemo(() => {
    return edges.filter(e => e.from_node_id === node.id || e.to_node_id === node.id).length;
  }, [edges, node.id]);

  // Calculate tooltip position accounting for canvas transforms
  const calculateTooltipPosition = useCallback(() => {
    if (!nodeElement) return null;
    
    const nodeRect = nodeElement.getBoundingClientRect();
    const tooltipWidth = 380;
    const tooltipHeight = 320;
    const offset = 16; // Distance from node
    
    // Check if nodeRect is valid
    if (nodeRect.width === 0 || nodeRect.height === 0) {
      return null;
    }
    
    // Calculate center position above the node using the corrected node element position
    let x = nodeRect.left + (nodeRect.width / 2) - (tooltipWidth / 2);
    let y = nodeRect.top - tooltipHeight - offset;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Horizontal positioning with better centering
    const padding = 16;
    if (x < padding) {
      x = padding;
    } else if (x + tooltipWidth > viewportWidth - padding) {
      x = viewportWidth - tooltipWidth - padding;
    }
    
    // Vertical positioning with smart placement
    if (y < padding) {
      // Not enough space above, try below
      const belowY = nodeRect.bottom + offset;
      if (belowY + tooltipHeight <= viewportHeight - padding) {
        y = belowY;
      } else {
        // Not enough space below either, position to the side
        const sideY = Math.max(padding, Math.min(
          nodeRect.top + (nodeRect.height / 2) - (tooltipHeight / 2),
          viewportHeight - tooltipHeight - padding
        ));
        
        // Try to position to the right first
        if (nodeRect.right + tooltipWidth + offset <= viewportWidth - padding) {
          x = nodeRect.right + offset;
          y = sideY;
        } else if (nodeRect.left - tooltipWidth - offset >= padding) {
          x = nodeRect.left - tooltipWidth - offset;
          y = sideY;
        } else {
          // Last resort: center in viewport
          x = (viewportWidth - tooltipWidth) / 2;
          y = (viewportHeight - tooltipHeight) / 2;
        }
      }
    }
    
    const finalPosition = { x: Math.round(x), y: Math.round(y) };
    
    return finalPosition;
  }, [nodeElement]);

  // Update tooltip position when needed
  useEffect(() => {
    if (isOpen && nodeElement) {
      const position = calculateTooltipPosition();
      setTooltipPosition(position);
      
      // Update position on scroll/resize
      const updatePosition = () => {
        const newPosition = calculateTooltipPosition();
        setTooltipPosition(newPosition);
      };
      
      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, nodeElement, transform, calculateTooltipPosition]);

  // Generate AI-powered executive summary when tooltip opens
  useEffect(() => {
    if (isOpen && !aiSummary && !isLoadingAI) {
      generateAIExecutiveSummary();
    }
  }, [isOpen, node.id]);

  const generateAIExecutiveSummary = useCallback(async () => {
    try {
      setIsLoadingAI(true);
      setAiError(null);
      
      console.log('🤖 [AI-TOOLTIP] Generating executive summary for node:', node.id);
      
      // Find related messages for additional context
      const relatedMessages = messages.filter(msg => 
        msg.content.toLowerCase().includes(node.title.toLowerCase().split(' ')[0]) ||
        (node.source_agent && msg.author === node.source_agent)
      );
      
      console.log('🤖 [AI-TOOLTIP] Found related messages:', relatedMessages.length);
      
      // Call AI summarization API
      const response = await generateExecutiveSummary(node.id, {
        conversation_context: node.description,
        include_related_messages: true
      });
      
      console.log('🤖 [AI-TOOLTIP] AI summary response:', response);
      setAiSummary(response);
      
    } catch (error) {
      console.error('🤖 [AI-TOOLTIP] Failed to generate AI summary:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to generate AI summary');
    } finally {
      setIsLoadingAI(false);
    }
  }, [node.id, node.title, node.description, node.source_agent, messages]);

  // Handle modal open
  const handleOpenModal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (onModalOpen) {
      // Create processed content for modal
      const processedContent: ProcessedContent = {
        executiveSummary: aiSummary?.executive_summary.join('. ') || 'AI summary not available',
        keyInsights: aiSummary?.executive_summary || ['Loading AI insights...'],
        strategicAnalysis: node.description || 'No analysis available',
        decisionPoints: [],
        nextActions: []
      };
      
      onModalOpen(node, edges, processedContent);
    }
  }, [onModalOpen, node, edges, aiSummary]);

  if (!isOpen || !tooltipPosition) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${tooltipPosition.x}px`,
        top: `${tooltipPosition.y}px`,
        width: '380px',
        minHeight: '320px',
        maxHeight: '420px',
        zIndex: 10000,
        pointerEvents: 'auto'
      }}
      role="tooltip"
      aria-labelledby={`enhanced-tooltip-title-${node.id}`}
      aria-describedby={`enhanced-tooltip-content-${node.id}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Glass-Effect Container */}
      <div className="enhanced-glass-tooltip">
        {/* Header with Glass Effect */}
        <div className="glass-header">
          <div className="flex items-center gap-3 mb-4">
            {getNodeIcon(node.type)}
            <h3 
              id={`enhanced-tooltip-title-${node.id}`}
              className="font-semibold text-white flex-1 truncate text-shadow"
            >
              {node.title}
            </h3>
            {node.source_agent && (
              <div className="ai-badge">
                <Brain className="w-3 h-3" />
                <span className="text-xs">AI</span>
              </div>
            )}
          </div>
        </div>

        {/* AI-Powered Executive Summary Section */}
        <div id={`enhanced-tooltip-content-${node.id}`} className="glass-content">
          <div className="executive-summary-section">
            <div className="section-header-ai">
              <span className="text-white font-medium">Executive Summary</span>
              {isLoadingAI && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
            </div>
            
            <div className="ai-summary-content">
              {isLoadingAI ? (
                <div className="loading-state">
                  <div className="shimmer-line"></div>
                  <div className="shimmer-line short"></div>
                  <div className="shimmer-line"></div>
                </div>
              ) : aiError ? (
                <div className="error-state">
                  <p className="text-red-300 text-sm">Failed to generate AI summary</p>
                  <button 
                    onClick={generateAIExecutiveSummary}
                    className="retry-button"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Retry
                  </button>
                </div>
              ) : aiSummary ? (
                <div className="bullet-points">
                  {aiSummary.executive_summary.map((point, index) => (
                    <div key={index} className="bullet-point">
                      <div className="bullet-dot"></div>
                      <span className="bullet-text">{point}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="fallback-summary">
                  <p className="text-gray-300 text-sm">
                    {node.key_message || node.description?.substring(0, 100) + '...' || 'No summary available'}
                  </p>
                </div>
              )}
            </div>

            {/* AI Confidence Indicator */}
            {aiSummary && (
              <div className="ai-confidence">
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill"
                    style={{ width: `${aiSummary.confidence}%` }}
                  ></div>
                </div>
                <span className="confidence-text">
                  {aiSummary.confidence}% confidence • {aiSummary.sources_analyzed} sources
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Glass Effect */}
        <div className="glass-footer">
          <div className="footer-stats">
            <span className="stat-item">
              <Link className="w-3 h-3" />
              {connectionCount} connections
            </span>
            {node.confidence && (
              <span className="stat-item confidence">
                {node.confidence}% confidence
              </span>
            )}
          </div>
          
          {/* View Full Context Button */}
          {onModalOpen && aiSummary && (
            <button
              onClick={handleOpenModal}
              className="view-full-button"
              style={{ pointerEvents: 'auto' }}
            >
              <ExternalLink className="w-3 h-3" />
              View Full Context
            </button>
          )}
        </div>
      </div>
    </div>
  );
};