import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FloatingPortal, FloatingArrow } from '@floating-ui/react';
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

export const EnhancedNodeTooltip: React.FC<EnhancedNodeTooltipProps> = ({
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
  // Access chat context for conversation data
  const { messages } = useAgentChat();
  
  // AI Executive Summary state
  const [aiSummary, setAiSummary] = useState<ExecutiveSummaryResponse | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Calculate connection count
  const connectionCount = useMemo(() => {
    return edges.filter(e => e.from_node_id === node.id || e.to_node_id === node.id).length;
  }, [edges, node.id]);

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

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        const syntheticEvent = {
          stopPropagation: () => {},
          preventDefault: () => {}
        } as React.MouseEvent;
        handleOpenModal(syntheticEvent);
        break;
    }
  }, [handleOpenModal]);

  if (!isOpen) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{
        position: 'fixed',
        top: `${(floatingStyles.top || 0) as number}px`,
        left: `${(floatingStyles.left || 0) as number}px`,
        width: '380px',
        minHeight: '320px',
        maxHeight: '420px',
        zIndex: 10000,
        pointerEvents: 'auto'
      }}
      className="tooltip-portal"
      {...getFloatingProps()}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="tooltip"
      aria-labelledby={`enhanced-tooltip-title-${node.id}`}
      aria-describedby={`enhanced-tooltip-content-${node.id}`}
    >
        {/* Glass-Effect Container */}
        <div className="enhanced-glass-tooltip">
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="tooltip-arrow-enhanced"
          />
          
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
          </div>
        </div>
      </div>
    </div>
  );
};

// CSS-in-JS styles for glass effect (to be added to global CSS)
const glassEffectStyles = `
.enhanced-glass-tooltip {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1) 0%, 
    rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  overflow: hidden;
  position: relative;
}

.enhanced-glass-tooltip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.4) 50%, 
    transparent 100%);
}

.glass-header {
  padding: 20px 20px 0 20px;
  background: linear-gradient(135deg, 
    rgba(107, 107, 58, 0.2) 0%, 
    rgba(107, 107, 58, 0.1) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-content {
  padding: 16px 20px;
  max-height: 240px;
  overflow-y: auto;
}

.executive-summary-section {
  margin-bottom: 16px;
}

.section-header-ai {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.ai-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3));
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px;
  padding: 4px 8px;
  color: #93c5fd;
  font-size: 10px;
  font-weight: 500;
}

.bullet-points {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bullet-point {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
}

.bullet-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6B6B3A, #8B8B4A);
  margin-top: 6px;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(107, 107, 58, 0.4);
}

.bullet-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1.4;
  font-weight: 400;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shimmer-line {
  height: 12px;
  background: linear-gradient(90deg, 
    rgba(255, 255, 255, 0.1) 0%, 
    rgba(255, 255, 255, 0.2) 50%, 
    rgba(255, 255, 255, 0.1) 100%);
  border-radius: 6px;
  animation: shimmer 1.5s ease-in-out infinite;
}

.shimmer-line.short {
  width: 70%;
}

@keyframes shimmer {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

.error-state {
  text-align: center;
  padding: 12px;
}

.retry-button {
  margin-top: 8px;
  padding: 4px 12px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: rgba(239, 68, 68, 0.3);
}

.ai-confidence {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.confidence-bar {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #6B6B3A, #8B8B4A);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.confidence-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.glass-footer {
  padding: 12px 20px;
  background: linear-gradient(135deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.1) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
}

.footer-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.stat-item.confidence {
  color: #6B6B3A;
  font-weight: 500;
}

.text-shadow {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.tooltip-arrow-enhanced {
  fill: rgba(255, 255, 255, 0.1);
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}
`;

// Export styles for global CSS injection
export { glassEffectStyles };