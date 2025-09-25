import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, User, Target, Trash2, ZoomIn, ZoomOut, Link, RefreshCw, Info, Users, Briefcase, Check, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMap } from '@/contexts/MapContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAgentChat, Agent } from '@/contexts/AgentChatContext';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, clearAllNodes, summarizeConversation } from '@/lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import SparringSession from './SparringSession';
import { NodeWithTooltip } from './NodeWithTooltip';
import { FullContextModal } from './FullContextModal';
import { ProcessedContent } from '@/utils/tooltipContentUtils';

// High-performance transform management
interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface CanvasState {
  transform: Transform;
  isDragging: boolean;
  isPanning: boolean;
  draggedNodeId: string | null;
  dragOffset: { x: number; y: number } | null;
  panStart: { x: number; y: number } | null;
  panStartTransform: Transform | null;
}

// Optimized Node Component with minimal re-renders
const OptimizedNode: React.FC<{
  node: Node;
  isSelected: boolean;
  isDragging: boolean;
  agents: Agent[];
  onMouseDown: (event: React.MouseEvent, nodeId: string, nodeType: 'ai' | 'human') => void;
  onSelect: () => void;
  onTooltipClick?: (event: React.MouseEvent) => void;
  style: React.CSSProperties;
}> = React.memo(({
  node,
  isSelected,
  isDragging,
  agents,
  onMouseDown,
  onSelect,
  onTooltipClick,
  style
}) => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.tooltip') ||
        target.closest('[data-tooltip]') ||
        target.closest('.node-tooltip') ||
        target.closest('[data-state="open"]') ||
        target.closest('[role="tooltip"]') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea')) {
      return;
    }
    
    const nodeType: 'ai' | 'human' = node.source_agent ? 'ai' : 'human';
    
    try {
      e.preventDefault();
    } catch (error) {
      console.debug('Cannot preventDefault on passive mouse event');
    }
    
    onMouseDown(e, node.id, nodeType);
    onSelect();
  }, [node.id, node.source_agent, onMouseDown, onSelect]);

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

  return (
    <div
      id={`node-${node.id}`}
      className={`absolute glass-pane p-4 w-60 cursor-grab active:cursor-grabbing hover:scale-105 transition-all duration-200 group pointer-events-auto select-none ${
        isSelected ? 'ring-2 ring-[#6B6B3A] ring-opacity-70 shadow-lg shadow-[#6B6B3A]/20' : ''
      } ${
        node.type === 'human' ? 'pulse-glow border-[#6B6B3A]/30 bg-gradient-to-br from-[#6B6B3A]/5 to-[#6B6B3A]/10' :
        node.type === 'ai' ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-400/40 shadow-lg shadow-blue-500/10' :
        node.type === 'risk' ? 'bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-400/40 shadow-lg shadow-red-500/10' :
        node.type === 'dependency' ? 'bg-gradient-to-br from-gray-500/10 to-slate-500/10 border-gray-400/40 shadow-lg shadow-gray-500/10' :
        node.type === 'decision' ? 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-400/40 shadow-lg shadow-yellow-500/10' :
        'bg-gradient-to-br from-gray-400/5 to-gray-500/10 border-gray-400/30'
      }`}
      style={style}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        if (isDragging) {
          try {
            e.preventDefault();
          } catch (error) {
            console.debug('Cannot preventDefault on passive context menu event');
          }
        }
      }}
    >
      <div className="relative">
        {node.source_agent && (
          <div className="absolute top-0 left-0 text-xs text-blue-400 font-medium bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30 shadow-sm z-10">
            {(() => {
              const agent = agents.find(a => a.agent_id === node.source_agent);
              return agent ? agent.name : 'Strategist AI';
            })()}
          </div>
        )}
        
        <div className={node.source_agent ? 'pt-8' : ''}>
          <div className="flex items-center gap-2 mb-2">
            {getNodeIcon(node.type)}
            <h3 className={`font-bold text-sm ${getNodeTypeColor(node.type)}`}>
              {node.title.length > 25 ? node.title.substring(0, 25) + '...' : node.title}
            </h3>
          </div>
        
          {node.key_message && (
            <div className="text-xs text-gray-200 mb-2 leading-relaxed font-medium">
              {node.key_message}
            </div>
          )}
          
          {!node.key_message && (
            <p className="text-xs text-gray-300 mb-2 line-clamp-2">
              {node.title.length > 50 ? node.title.substring(0, 50) + '...' : 'Click to view details'}
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
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onTooltipClick?.(e);
            }}
            className="w-6 h-6 rounded-full bg-gray-700/50 hover:bg-gray-600/70 flex items-center justify-center transition-colors opacity-70 hover:opacity-100 group-hover:opacity-100"
            aria-label="Show tooltip"
            title="Click for AI insights"
          >
            <HelpCircle className="w-3 h-3 text-gray-300 hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison for minimal re-renders
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.node.x === nextProps.node.x &&
    prevProps.node.y === nextProps.node.y &&
    prevProps.node.title === nextProps.node.title &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDragging === nextProps.isDragging &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
  );
});

// High-performance SVG Edge component with smooth updates
const OptimizedEdges: React.FC<{
  nodes: Node[];
  edges: Edge[];
  canvasState: CanvasState;
  getEdgeStyle: (type: string, strength?: number) => any;
  onDeleteEdge: (edgeId: string) => void;
}> = React.memo(({ nodes, edges, canvasState, getEdgeStyle, onDeleteEdge }) => {
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      positions[node.id] = { x: node.x, y: node.y };
    });
    return positions;
  }, [nodes]);

  // Real-time position updates during drag
  const getRealTimePosition = useCallback((nodeId: string) => {
    const basePos = nodePositions[nodeId];
    if (!basePos) return { x: 0, y: 0 };

    // If this node is being dragged, get its current DOM position
    if (canvasState.isDragging && canvasState.draggedNodeId === nodeId) {
      const nodeElement = document.getElementById(`node-${nodeId}`);
      if (nodeElement) {
        const rect = nodeElement.getBoundingClientRect();
        const canvasElement = nodeElement.closest('[role="application"]') as HTMLElement;
        if (canvasElement) {
          const canvasRect = canvasElement.getBoundingClientRect();
          return {
            x: (rect.left - canvasRect.left - canvasState.transform.x) / canvasState.transform.scale,
            y: (rect.top - canvasRect.top - canvasState.transform.y) / canvasState.transform.scale
          };
        }
      }
    }

    return basePos;
  }, [nodePositions, canvasState]);

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: -2000,
        top: -2000,
        width: 4000,
        height: 4000,
        zIndex: 10
      }}
    >
      {edges.map(edge => {
        const fromNode = nodes.find(n => n.id === edge.from_node_id);
        const toNode = nodes.find(n => n.id === edge.to_node_id);
        
        if (!fromNode || !toNode) return null;

        const fromPos = getRealTimePosition(fromNode.id);
        const toPos = getRealTimePosition(toNode.id);
        
        const fromCenterX = fromPos.x + 120 + 2000; // NODE_WIDTH / 2 + SVG offset
        const fromCenterY = fromPos.y + 60 + 2000;  // NODE_HEIGHT / 2 + SVG offset
        const toCenterX = toPos.x + 120 + 2000;
        const toCenterY = toPos.y + 60 + 2000;

        const style = getEdgeStyle(edge.type);

        return (
          <g key={edge.id}>
            <line
              x1={fromCenterX}
              y1={fromCenterY}
              x2={toCenterX}
              y2={toCenterY}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
              className="transition-all duration-200 cursor-pointer hover:stroke-opacity-80 pointer-events-auto"
              onClick={() => onDeleteEdge(edge.id)}
            />
            <polygon
              points={`${toCenterX-8},${toCenterY-4} ${toCenterX},${toCenterY} ${toCenterX-8},${toCenterY+4}`}
              fill={style.stroke}
              opacity="0.7"
            />
          </g>
        );
      })}
    </svg>
  );
}, (prevProps, nextProps) => {
  // Only re-render if nodes/edges change or during drag operations
  const isDragging = prevProps.canvasState.isDragging || nextProps.canvasState.isDragging;
  const nodesChanged = prevProps.nodes.length !== nextProps.nodes.length ||
    prevProps.nodes.some((node, i) => nextProps.nodes[i]?.id !== node.id);
  const edgesChanged = prevProps.edges.length !== nextProps.edges.length ||
    prevProps.edges.some((edge, i) => nextProps.edges[i]?.id !== edge.id);
  
  return !isDragging && !nodesChanged && !edgesChanged;
});

const OptimizedExplorationMap: React.FC = () => {
  // Use existing contexts
  const {
    nodes,
    edges,
    isLoading: mapLoading,
    error: mapError,
    createNode: createNodeAPI,
    updateNode: updateNodeAPI,
    deleteNode: deleteNodeAPI,
    createEdge: createEdgeAPI,
    deleteEdge: deleteEdgeAPI,
    refreshMapData
  } = useMap();
  
  const { currentWorkspace } = useWorkspace();
  
  const {
    agents,
    activeAgents,
    activateAgent,
    deactivateAgent,
    addMessageToMap,
    loadMessages
  } = useAgentChat();

  // Optimized canvas state management
  const [canvasState, setCanvasState] = useState<CanvasState>({
    transform: { x: 0, y: 0, scale: 1 },
    isDragging: false,
    isPanning: false,
    draggedNodeId: null,
    dragOffset: null,
    panStart: null,
    panStartTransform: null
  });

  const [hasInitializedView, setHasInitializedView] = useState(false);
  
  // UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showAgentDetailsModal, setShowAgentDetailsModal] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; nodeId?: string } | null>(null);
  const [summarizingNodes, setSummarizingNodes] = useState<Set<string>>(new Set());
  
  // Modal state management
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    node: Node | null;
    edges: Edge[];
    processedContent: ProcessedContent | null;
  }>({
    isOpen: false,
    node: null,
    edges: [],
    processedContent: null
  });
  
  // Performance refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Constants
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 120;
  const GRID_SIZE = 20;
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2;

  // Show notification helper
  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Coordinate conversion helpers
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - canvasState.transform.x) / canvasState.transform.scale;
    const y = (screenY - rect.top - canvasState.transform.y) / canvasState.transform.scale;
    
    return { x, y };
  }, [canvasState.transform]);

  // Snap to grid helper
  const snapToGrid = useCallback((x: number, y: number) => {
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE
    };
  }, []);

  // Create new node
  const createNode = useCallback(async (canvasX: number, canvasY: number, data: Partial<NodeCreateRequest> = {}) => {
    if (!currentWorkspace) {
      showNotification('No workspace selected');
      return null;
    }

    try {
      const snappedPos = snapToGrid(canvasX, canvasY);
      const nodeData: NodeCreateRequest = {
        title: data.title || 'New Node',
        description: data.description || 'Double-click to edit this node',
        type: data.type || 'human',
        x: snappedPos.x,
        y: snappedPos.y,
        source_agent: data.source_agent,
        confidence: data.confidence,
        feasibility: data.feasibility
      };
      
      const newNode = await createNodeAPI(nodeData);
      if (newNode) {
        setSelectedNode(newNode.id);
        showNotification(`Created node: ${newNode.title}`);
      }
      return newNode;
    } catch (error) {
      console.error('Failed to create node:', error);
      showNotification(`Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, [currentWorkspace, snapToGrid, showNotification, createNodeAPI]);

  // Delete node
  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      await deleteNodeAPI(nodeId);
      setSelectedNode(null);
      showNotification(`Deleted node: ${node.title}`);
      
      try {
        await loadMessages();
      } catch (refreshError) {
        console.warn('Failed to refresh chat messages after node deletion:', refreshError);
      }
    } catch (error) {
      console.error('Failed to delete node:', error);
      showNotification('Failed to delete node');
    }
  }, [nodes, showNotification, deleteNodeAPI, loadMessages]);

  // Handle manual conversation summarization
  const handleSummarizeConversation = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      showNotification('Node not found');
      return;
    }

    try {
      setSummarizingNodes(prev => new Set([...prev, nodeId]));
      showNotification('Summarizing conversation...');

      const updatedNode = await summarizeConversation(nodeId, {
        conversation_text: node.description
      });

      await refreshMapData();
      showNotification('Conversation summarized successfully');
    } catch (error) {
      console.error('Failed to summarize conversation:', error);
      showNotification(`Failed to summarize conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSummarizingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    }
  }, [nodes, showNotification, refreshMapData]);

  // Handle modal open
  const handleModalOpen = useCallback((node: Node, edges: Edge[], processedContent: ProcessedContent) => {
    setModalState({
      isOpen: true,
      node,
      edges,
      processedContent
    });
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setModalState({
      isOpen: false,
      node: null,
      edges: [],
      processedContent: null
    });
  }, []);

  // Create connection between nodes
  const createConnection = useCallback(async (fromId: string, toId: string, type: Edge['type'] = 'support') => {
    try {
      if (fromId === toId) {
        showNotification('Cannot connect node to itself');
        return null;
      }

      const existingConnection = edges.find(e =>
        (e.from_node_id === fromId && e.to_node_id === toId) || (e.from_node_id === toId && e.to_node_id === fromId)
      );
      if (existingConnection) {
        showNotification('Connection already exists');
        return null;
      }

      const fromNode = nodes.find(n => n.id === fromId);
      const toNode = nodes.find(n => n.id === toId);
      
      if (!fromNode || !toNode) {
        showNotification('Invalid nodes for connection');
        return null;
      }
      
      const edgeData: EdgeCreateRequest = {
        from_node_id: fromId,
        to_node_id: toId,
        type,
        description: `Connection from ${fromNode.title} to ${toNode.title}`
      };
      
      const newEdge = await createEdgeAPI(edgeData);
      
      if (newEdge) {
        showNotification(`Connected ${fromNode.title} to ${toNode.title}`);
      }
      
      return newEdge;
    } catch (error) {
      console.error('Failed to create connection:', error);
      showNotification('Failed to create connection');
      return null;
    }
  }, [nodes, edges, showNotification, createEdgeAPI]);

  // Handle zoom
  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    const zoomFactor = delta > 0 ? 1.2 : 0.8;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, canvasState.transform.scale * zoomFactor));
    
    if (newScale !== canvasState.transform.scale && canvasRef.current) {
      let newX = canvasState.transform.x;
      let newY = canvasState.transform.y;
      
      if (centerX !== undefined && centerY !== undefined) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = centerX - rect.left;
        const mouseY = centerY - rect.top;
        
        const scaleDiff = newScale - canvasState.transform.scale;
        newX = canvasState.transform.x - (mouseX - canvasState.transform.x) * (scaleDiff / canvasState.transform.scale);
        newY = canvasState.transform.y - (mouseY - canvasState.transform.y) * (scaleDiff / canvasState.transform.scale);
      }
      
      setCanvasState(prev => ({
        ...prev,
        transform: { x: newX, y: newY, scale: newScale }
      }));
    }
  }, [canvasState.transform]);

  // Handle wheel events
  const handleWheel = useCallback((e: React.WheelEvent) => {
    try {
      e.preventDefault();
    } catch (error) {
      console.debug('Cannot preventDefault on passive wheel event');
    }
    handleZoom(-e.deltaY, e.clientX, e.clientY);
  }, [handleZoom]);

  // Optimized mouse event handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    const isNodeElement = target.closest('[id^="node-"]') || target.id.startsWith('node-');
    if (isNodeElement) {
      return;
    }
    
    const isUIElement = target.closest('button') ||
                       target.closest('input') ||
                       target.closest('textarea') ||
                       target.closest('[role="button"]') ||
                       target.closest('.tooltip') ||
                       target.closest('[data-tooltip]');
    if (isUIElement) {
      return;
    }
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const relativeY = e.clientY - rect.top;
      if (relativeY < 120) {
        return;
      }
    }
    
    // Start panning
    try {
      e.preventDefault();
    } catch (error) {
      console.debug('Cannot preventDefault on passive canvas mouse event');
    }
    
    setCanvasState(prev => ({
      ...prev,
      isPanning: true,
      panStart: { x: e.clientX, y: e.clientY },
      panStartTransform: { ...prev.transform }
    }));
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, []);

  // Handle mouse move for panning with requestAnimationFrame optimization
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasState.isPanning || !canvasState.panStart || !canvasState.panStartTransform) {
      return;
    }
    
    const deltaX = e.clientX - canvasState.panStart.x;
    const deltaY = e.clientY - canvasState.panStart.y;
    
    // Use requestAnimationFrame for smooth updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setCanvasState(prev => ({
        ...prev,
        transform: {
          x: prev.panStartTransform!.x + deltaX,
          y: prev.panStartTransform!.y + deltaY,
          scale: prev.panStartTransform!.scale
        }
      }));
    });
  }, [canvasState.isPanning, canvasState.panStart, canvasState.panStartTransform]);

  // Handle mouse up to end panning
  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (canvasState.isPanning) {
      setCanvasState(prev => ({
        ...prev,
        isPanning: false,
        panStart: null,
        panStartTransform: null
      }));
      
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
      }
    }
  }, [canvasState.isPanning]);

  // Global mouse event handlers
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasState.isPanning || !canvasState.panStart || !canvasState.panStartTransform) {
      return;
    }
    
    const deltaX = e.clientX - canvasState.panStart.x;
    const deltaY = e.clientY - canvasState.panStart.y;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      setCanvasState(prev => ({
        ...prev,
        transform: {
          x: prev.panStartTransform!.x + deltaX,
          y: prev.panStartTransform!.y + deltaY,
          scale: prev.panStartTransform!.scale
        }
      }));
    });
  }, [canvasState.isPanning, canvasState.panStart, canvasState.panStartTransform]);

  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    if (canvasState.isPanning) {
      setCanvasState(prev => ({
        ...prev,
        isPanning: false,
        panStart: null,
        panStartTransform: null
      }));
      
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
      }
    }
  }, [canvasState.isPanning]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string, nodeType: 'ai' | 'human') => {
    const target = e.target as HTMLElement;
    if (target.closest('.tooltip') ||
        target.closest('[data-tooltip]') ||
        target.closest('.node-tooltip') ||
        target.closest('[data-state="open"]') ||
        target.closest('[role="tooltip"]') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea')) {
      return;
    }
    
    try {
      e.preventDefault();
    } catch (error) {
      console.debug('Cannot preventDefault on passive node mouse event');
    }
    setSelectedNode(nodeId);
  }, []);

  // Get edge style for SVG rendering
  const getEdgeStyle = (type: string, strength?: number) => {
    const baseOpacity = strength ? Math.max(0.4, strength) : 0.6;
    const strokeWidth = strength ? Math.max(2, strength * 4) : 2;
    
    switch (type) {
      case 'support':
        return {
          stroke: `rgba(34, 197, 94, ${baseOpacity})`,
          strokeWidth,
          strokeDasharray: 'none'
        };
      case 'conflict':
        return {
          stroke: `rgba(239, 68, 68, ${baseOpacity})`,
          strokeWidth,
          strokeDasharray: '5,5'
        };
      case 'dependency':
        return {
          stroke: `rgba(168, 85, 247, ${baseOpacity})`,
          strokeWidth,
          strokeDasharray: '10,5'
        };
      case 'sequence':
        return {
          stroke: `rgba(59, 130, 246, ${baseOpacity})`,
          strokeWidth,
          strokeDasharray: 'none'
        };
      default:
        return {
          stroke: `rgba(156, 163, 175, ${baseOpacity})`,
          strokeWidth: 1,
          strokeDasharray: 'none'
        };
    }
  };

  // Auto-center view when nodes are first loaded
  useEffect(() => {
    if (!hasInitializedView && nodes.length > 0 && canvasRef.current) {
      const bounds = {
        minX: Math.min(...nodes.map(n => n.x)),
        maxX: Math.max(...nodes.map(n => n.x + NODE_WIDTH)),
        minY: Math.min(...nodes.map(n => n.y)),
        maxY: Math.max(...nodes.map(n => n.y + NODE_HEIGHT))
      };
      
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const viewportCenterX = rect.width / 2;
      const viewportCenterY = rect.height / 2;
      
      setCanvasState(prev => ({
        ...prev,
        transform: {
          x: viewportCenterX - centerX,
          y: viewportCenterY - centerY,
          scale: 1
        }
      }));
      
      setHasInitializedView(true);
    }
  }, [nodes, hasInitializedView]);

  // Global event listeners for smooth panning
  useEffect(() => {
    if (canvasState.isPanning) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [canvasState.isPanning, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Cleanup animation frames
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle context menu
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(null);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  // Memoized node styles for performance
  const nodeStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    nodes.forEach(node => {
      styles[node.id] = {
        transform: `translate(${node.x}px, ${node.y}px)`,
        zIndex: selectedNode === node.id ? 1000 : 100
      };
    });
    return styles;
  }, [nodes, selectedNode]);

  // Handle add message to map from sidebar
  const handleAddToMap = useCallback(async (messageId: string, messageData: any) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const canvasPos = screenToCanvas(centerX, centerY);
    
    const nodeData: Partial<NodeCreateRequest> = {
      title: messageData.title || 'New Message',
      description: messageData.content || messageData.description || '',
      type: messageData.source_agent ? 'ai' : 'human',
      source_agent: messageData.source_agent,
      confidence: messageData.confidence,
      feasibility: messageData.feasibility
    };
    
    const newNode = await createNode(canvasPos.x, canvasPos.y, nodeData);
    if (newNode) {
      // Update the message to reflect it's been added to map
      await addMessageToMap(messageId, newNode.id);
    }
  }, [screenToCanvas, createNode, addMessageToMap]);

  // Render loading state
  if (mapLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#6B6B3A] mx-auto mb-4" />
          <p className="text-gray-300">Loading exploration map...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (mapError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <X className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-300 mb-4">Failed to load exploration map</p>
          <button
            onClick={refreshMapData}
            className="px-4 py-2 bg-[#6B6B3A] text-white rounded hover:bg-[#5A5A2F] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
          {/* Left Sidebar */}
          <div className={`transition-all duration-300 bg-gray-800/50 border-r border-gray-700/50 backdrop-blur-sm ${
            leftSidebarCollapsed ? 'w-16' : 'w-80'
          }`}>
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                {!leftSidebarCollapsed && (
                  <h2 className="text-lg font-semibold text-white">Agents</h2>
                )}
                <button
                  onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
                  className="p-2 hover:bg-gray-700/50 rounded transition-colors"
                >
                  {leftSidebarCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronLeft className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>
            
            {!leftSidebarCollapsed && (
              <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-80px)]">
                {agents.map(agent => (
                  <div key={agent.agent_id} className="glass-pane p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          activeAgents.includes(agent.agent_id) ? 'bg-green-400' : 'bg-gray-500'
                        }`} />
                        <span className="text-sm font-medium text-white">{agent.name}</span>
                      </div>
                      <button
                        onClick={() => setShowAgentDetailsModal(agent.agent_id)}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Details
                      </button>
                    </div>
                    <p className="text-xs text-gray-300 mb-3">{agent.ai_role}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => activeAgents.includes(agent.agent_id) ? deactivateAgent(agent.agent_id) : activateAgent(agent.agent_id)}
                        className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                          activeAgents.includes(agent.agent_id)
                            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                            : 'bg-[#6B6B3A]/20 text-[#6B6B3A] hover:bg-[#6B6B3A]/30'
                        }`}
                      >
                        {activeAgents.includes(agent.agent_id) ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Canvas Controls */}
            <div className="absolute top-4 left-4 z-50 flex gap-2">
              <button
                onClick={() => handleZoom(1)}
                className="p-2 glass-pane hover:bg-white/10 transition-colors rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => handleZoom(-1)}
                className="p-2 glass-pane hover:bg-white/10 transition-colors rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => setCanvasState(prev => ({ ...prev, transform: { x: 0, y: 0, scale: 1 } }))}
                className="p-2 glass-pane hover:bg-white/10 transition-colors rounded"
                title="Reset View"
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Canvas */}
            <div
              ref={canvasRef}
              className="w-full h-full cursor-grab active:cursor-grabbing relative"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
                backgroundSize: `${GRID_SIZE * canvasState.transform.scale}px ${GRID_SIZE * canvasState.transform.scale}px`,
                backgroundPosition: `${canvasState.transform.x}px ${canvasState.transform.y}px`
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onWheel={handleWheel}
              role="application"
              aria-label="Exploration Map Canvas"
            >
              {/* Transform Container */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `translate(${canvasState.transform.x}px, ${canvasState.transform.y}px) scale(${canvasState.transform.scale})`,
                  transformOrigin: '0 0'
                }}
              >
                {/* SVG Edges */}
                <OptimizedEdges
                  nodes={nodes}
                  edges={edges}
                  canvasState={canvasState}
                  getEdgeStyle={getEdgeStyle}
                  onDeleteEdge={deleteEdgeAPI}
                />

                {/* Nodes */}
                {nodes.map(node => (
                  <OptimizedNode
                    key={node.id}
                    node={node}
                    isSelected={selectedNode === node.id}
                    isDragging={canvasState.isDragging && canvasState.draggedNodeId === node.id}
                    agents={agents}
                    onMouseDown={handleNodeMouseDown}
                    onSelect={() => setSelectedNode(node.id)}
                    onTooltipClick={(e) => {
                      e.stopPropagation();
                      // Handle tooltip click - could open modal or show details
                    }}
                    style={nodeStyles[node.id]}
                  />
                ))}
              </div>
            </div>

            {/* Context Menu */}
            {showContextMenu && (
              <div
                className="absolute z-50 glass-pane border border-gray-600/50 rounded-lg shadow-xl py-2 min-w-48"
                style={{
                  left: showContextMenu.x,
                  top: showContextMenu.y
                }}
              >
                {showContextMenu.nodeId ? (
                  <>
                    <button
                      onClick={() => {
                        if (showContextMenu.nodeId) {
                          deleteNode(showContextMenu.nodeId);
                        }
                        setShowContextMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left text-red-300 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Node
                    </button>
                    <button
                      onClick={() => {
                        if (showContextMenu.nodeId) {
                          handleSummarizeConversation(showContextMenu.nodeId);
                        }
                        setShowContextMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left text-blue-300 hover:bg-blue-500/20 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Summarize
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      const canvasPos = screenToCanvas(showContextMenu.x, showContextMenu.y);
                      createNode(canvasPos.x, canvasPos.y);
                      setShowContextMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-[#6B6B3A] hover:bg-[#6B6B3A]/20 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Node
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Chat */}
          <div
            className="bg-gray-800/50 border-l border-gray-700/50 backdrop-blur-sm overflow-hidden"
            style={{ width: rightSidebarWidth }}
          >
            <SparringSession onAddToMap={(messageId) => handleAddToMap(messageId, {})} />
          </div>

          {/* Notification */}
          {notification && (
            <div className="fixed top-4 right-4 z-50 glass-pane border border-[#6B6B3A]/50 px-4 py-2 rounded-lg shadow-xl">
              <p className="text-white text-sm">{notification}</p>
            </div>
          )}

          {/* Agent Details Modal */}
          {showAgentDetailsModal && (
            <Dialog open={!!showAgentDetailsModal} onOpenChange={() => setShowAgentDetailsModal(null)}>
              <DialogContent className="glass-pane border-gray-600/50">
                <DialogHeader>
                  <DialogTitle className="text-white">Agent Details</DialogTitle>
                </DialogHeader>
                {(() => {
                  const agent = agents.find(a => a.agent_id === showAgentDetailsModal);
                  return agent ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-300 mb-1">Name</h3>
                        <p className="text-white">{agent.name}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-300 mb-1">Description</h3>
                        <p className="text-gray-200">{agent.ai_role}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-300 mb-1">Status</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          activeAgents.includes(agent.agent_id)
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            activeAgents.includes(agent.agent_id) ? 'bg-green-400' : 'bg-gray-500'
                          }`} />
                          {activeAgents.includes(agent.agent_id) ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </DialogContent>
            </Dialog>
          )}

          {/* Full Context Modal */}
          {modalState.isOpen && modalState.node && (
            <FullContextModal
              isOpen={modalState.isOpen}
              onClose={handleModalClose}
              node={modalState.node}
              edges={modalState.edges}
              processedContent={modalState.processedContent}
            />
          )}
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default OptimizedExplorationMap;