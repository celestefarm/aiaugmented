import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Info, User, Target, X, Link, Check } from 'lucide-react';

interface DraggableNode {
  id: string;
  x: number;
  y: number;
  title: string;
  description?: string;
  type?: string;
  source_agent?: string;
  confidence?: number;
  created_at?: string | number;
  key_message?: string;
  summarized_titles?: {
    card?: string;
    tooltip?: string;
    list?: string;
  };
  [key: string]: any;
}

interface DraggableNodeCanvasProps {
  nodes: DraggableNode[];
  onNodePositionChange?: (nodeId: string, newX: number, newY: number) => void;
  onNodeClick?: (nodeId: string, event?: React.MouseEvent) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  gridSize?: number;
  snapToGrid?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface DragState {
  isDragging: boolean;
  draggedNodeId: string | null;
  dragStartX: number;
  dragStartY: number;
  dragOffsetX: number;
  dragOffsetY: number;
  currentX: number;
  currentY: number;
}

const initialDragState: DragState = {
  isDragging: false,
  draggedNodeId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragOffsetX: 0,
  dragOffsetY: 0,
  currentX: 0,
  currentY: 0
};

export const DraggableNodeCanvas: React.FC<DraggableNodeCanvasProps> = ({
  nodes,
  onNodePositionChange,
  onNodeClick,
  onNodeDoubleClick,
  gridSize = 20,
  snapToGrid = true,
  disabled = false,
  className = '',
  style = {}
}) => {
  console.log('🔍 DRAGGABLE NODE CANVAS - Rendering with nodes:', nodes.length);
  console.log('🔍 DRAGGABLE NODE CANVAS - Disabled:', disabled);
  console.log('🔍 DRAGGABLE NODE CANVAS - Style:', style);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>(initialDragState);

  // Mouse down handler - starts drag operation
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    console.log('🔍 NODE MOUSE DOWN - Node ID:', nodeId);
    console.log('🔍 NODE MOUSE DOWN - Disabled:', disabled);
    
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    console.log('🔍 NODE MOUSE DOWN - Node position:', { x: node.x, y: node.y });
    console.log('🔍 NODE MOUSE DOWN - Mouse position:', { mouseX, mouseY });
    console.log('🔍 NODE MOUSE DOWN - Canvas rect:', rect);
    
    setDragState({
      isDragging: true,
      draggedNodeId: nodeId,
      dragStartX: mouseX,
      dragStartY: mouseY,
      dragOffsetX: mouseX - node.x,
      dragOffsetY: mouseY - node.y,
      currentX: node.x,
      currentY: node.y
    });
  }, [nodes, disabled]);

  // Mouse move handler - updates drag position
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedNodeId || disabled) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    let newX = mouseX - dragState.dragOffsetX;
    let newY = mouseY - dragState.dragOffsetY;
    
    // Apply grid snapping if enabled
    if (snapToGrid && gridSize) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }
    
    setDragState(prev => ({
      ...prev,
      currentX: newX,
      currentY: newY
    }));
  }, [dragState.isDragging, dragState.draggedNodeId, dragState.dragOffsetX, dragState.dragOffsetY, snapToGrid, gridSize, disabled]);

  // Mouse up handler - completes drag operation
  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedNodeId) return;
    
    console.log('🔍 NODE MOUSE UP - Final position:', {
      x: dragState.currentX,
      y: dragState.currentY,
      nodeId: dragState.draggedNodeId
    });
    
    // Notify parent of position change
    if (onNodePositionChange) {
      onNodePositionChange(dragState.draggedNodeId, dragState.currentX, dragState.currentY);
    }
    
    // Reset drag state
    setDragState(initialDragState);
  }, [dragState.isDragging, dragState.draggedNodeId, dragState.currentX, dragState.currentY, onNodePositionChange]);

  // Get position for a specific node
  const getNodePosition = useCallback((node: DraggableNode) => {
    // CRITICAL: Only apply drag position to the specific dragged node
    if (dragState.isDragging && dragState.draggedNodeId === node.id) {
      return {
        x: dragState.currentX,
        y: dragState.currentY
      };
    }
    
    // All other nodes use their stored position
    return {
      x: node.x,
      y: node.y
    };
  }, [dragState.isDragging, dragState.draggedNodeId, dragState.currentX, dragState.currentY]);

  // Helper functions for node styling
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

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'human':
        return 'glow-olive-text';
      case 'ai':
        return 'text-blue-300';
      case 'risk':
        return 'text-red-300';
      case 'dependency':
        return 'text-gray-300';
      case 'decision':
        return 'text-yellow-300';
      default:
        return 'text-gray-300';
    }
  };

  const getNodeStyle = (node: DraggableNode, isBeingDragged: boolean) => {
    const baseStyle = 'glass-pane p-4 w-60 cursor-grab active:cursor-grabbing hover:scale-105 transition-all duration-200 group pointer-events-auto select-none';
    
    // Determine creator-based styling
    const creator = node.source_agent && node.source_agent.trim() !== '' ? 'ai' : 'human';
    const creatorStyle = creator === 'human' ? 'node-human-created' : 'node-ai-created';
    
    // Apply type-based styling
    switch (node.type) {
      case 'human':
        return `${baseStyle} pulse-glow border-[#6B6B3A]/30 bg-gradient-to-br from-[#6B6B3A]/5 to-[#6B6B3A]/10 ${creatorStyle}`;
      case 'ai':
        return `${baseStyle} bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-400/40 shadow-lg shadow-blue-500/10 ${creatorStyle}`;
      case 'risk':
        return `${baseStyle} bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-400/40 shadow-lg shadow-red-500/10 ${creatorStyle}`;
      case 'dependency':
        return `${baseStyle} bg-gradient-to-br from-gray-500/10 to-slate-500/10 border-gray-400/40 shadow-lg shadow-gray-500/10 ${creatorStyle}`;
      case 'decision':
        return `${baseStyle} bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-400/40 shadow-lg shadow-yellow-500/10 ${creatorStyle}`;
      default:
        return `${baseStyle} bg-gradient-to-br from-gray-400/5 to-gray-500/10 border-gray-400/30 ${creatorStyle}`;
    }
  };

  const formatTimestamp = (timestamp?: string | number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Render individual node
  const renderNode = useCallback((node: DraggableNode) => {
    const position = getNodePosition(node);
    const isBeingDragged = dragState.isDragging && dragState.draggedNodeId === node.id;
    
    return (
      <div
        key={node.id}
        className={getNodeStyle(node, isBeingDragged)}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          cursor: disabled ? 'default' : (isBeingDragged ? 'grabbing' : 'grab'),
          opacity: isBeingDragged ? 0.8 : 1,
          transform: isBeingDragged ? 'scale(1.05)' : 'scale(1)',
          zIndex: isBeingDragged ? 1000 : 1,
          transition: isBeingDragged ? 'none' : 'transform 0.2s ease',
          userSelect: 'none',
          pointerEvents: disabled ? 'none' : 'auto'
        }}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onClick={(e) => onNodeClick?.(node.id, e)}
        onDoubleClick={() => onNodeDoubleClick?.(node.id)}
        tabIndex={0}
        role="button"
        aria-label={`Node: ${node.title}`}
      >
        <div className="relative">
          {/* Agent Label - Now inside the node box, top-left */}
          {node.source_agent && (
            <div className="absolute top-0 left-0 text-xs text-blue-400 font-medium bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30 shadow-sm z-10">
              {node.source_agent === 'strategist' ? 'Strategist Agent' : node.source_agent}
            </div>
          )}
          
          {/* Add top padding when agent label is present */}
          <div className={node.source_agent ? 'pt-8' : ''}>
            <div className="flex items-center gap-2 mb-2">
              {getNodeIcon(node.type)}
              <h3 className={`font-bold text-sm ${getNodeTypeColor(node.type)}`}>
                {node.title.length > 25 ? node.title.substring(0, 25) + '...' : node.title}
              </h3>
            </div>
          
            {/* Key Message - 2-line summary under title */}
            {node.key_message && (
              <div className="text-xs text-gray-200 mb-2 leading-relaxed font-medium">
                {node.key_message}
              </div>
            )}
            
            {/* Fallback to truncated title or generic placeholder if no key message */}
            {!node.key_message && (
              <p className="text-xs text-gray-300 mb-2 line-clamp-2">
                {(() => {
                  // Use summarized title as subtext if available
                  if (node.summarized_titles?.card &&
                      node.summarized_titles.card !== node.title) {
                    return node.summarized_titles.card;
                  }
                  // Fallback to truncated main title or generic placeholder
                  if (node.title.length > 50) {
                    return node.title.substring(0, 50) + '...';
                  }
                  return 'Click to view details';
                })()}
              </p>
            )}
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              {node.confidence && (
                <span className="text-[#6B6B3A] bg-[#6B6B3A]/10 px-1.5 py-0.5 rounded">
                  {node.confidence}%
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                node.type === 'human' ? 'bg-[#6B6B3A]/20 text-[#6B6B3A]' :
                node.type === 'ai' ? 'bg-blue-500/20 text-blue-300' :
                node.type === 'risk' ? 'bg-red-500/20 text-red-300' :
                node.type === 'dependency' ? 'bg-gray-500/20 text-gray-300' :
                node.type === 'decision' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-gray-400/20 text-gray-300'
              }`}>
                {node.type}
              </span>
            </div>
            <span className="text-gray-500">
              {formatTimestamp(node.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  }, [dragState, getNodePosition, handleMouseDown, onNodeClick, onNodeDoubleClick, disabled]);

  // Global mouse event handlers
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const syntheticEvent = {
        clientX: e.clientX,
        clientY: e.clientY,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation()
      } as React.MouseEvent;
      
      handleMouseMove(syntheticEvent);
    };

    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={canvasRef}
      className={`draggable-node-canvas ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 0, 0, 0.1)', // Temporary red tint to see if it's rendering
        ...style
      }}
      onMouseMove={handleMouseMove}
      onClick={() => console.log('🔍 DRAGGABLE NODE CANVAS - Canvas clicked')}
    >
      {nodes.map((node, index) => {
        console.log('🔍 DRAGGABLE NODE CANVAS - Rendering node', index, ':', node.id, 'at', node.x, node.y);
        return renderNode(node);
      })}
    </div>
  );
};

export default DraggableNodeCanvas;