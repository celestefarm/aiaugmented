
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, User, Target, Trash2, ZoomIn, ZoomOut, Link, RefreshCw, Info, Users, Briefcase, Check, HelpCircle, Palette } from 'lucide-react';
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
import SVGEdges from './SVGEdges';

// SimpleNode component - your original rich node design
const SimpleNode: React.FC<{
  node: Node;
  transform: { x: number; y: number; scale: number };
  isSelected: boolean;
  isDragging: boolean;
  agents: Agent[];
  onMouseDown: (event: React.MouseEvent, nodeId: string, nodeType: 'ai' | 'human') => void;
  onSelect: () => void;
  onTooltipClick?: (event: React.MouseEvent) => void;
}> = ({
  node,
  transform,
  isSelected,
  isDragging,
  agents,
  onMouseDown,
  onSelect,
  onTooltipClick
}) => {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Check if this is a tooltip or UI interaction
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
    
    // Determine node type based on source_agent or type
    const nodeType: 'ai' | 'human' = node.source_agent ? 'ai' : 'human';
    
    // Try to prevent default, but don't fail if it's a passive listener
    try {
      e.preventDefault();
    } catch (error) {
      // Passive event listener - can't prevent default
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
      style={{
        transform: `translate(${node.x}px, ${node.y}px) ${isDragging ? 'scale(1.05)' : 'scale(1)'}`,
        zIndex: isDragging ? 1000 : 20,
        opacity: isDragging ? 0.8 : 1,
        pointerEvents: 'auto',
        userSelect: 'none',
        position: 'absolute',
        willChange: 'transform',
        backfaceVisibility: 'hidden'
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        if (isDragging) {
          try {
            e.preventDefault();
          } catch (error) {
            // Passive event listener - can't prevent default
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
          
          {/* Tooltip Icon */}
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
};

const UnifiedExplorationMap: React.FC = () => {
  // Use MapContext for nodes and edges
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
  
  // Use AgentChatContext for agents and messages
  const {
    agents,
    activeAgents,
    activateAgent,
    deactivateAgent,
    addMessageToMap,
    loadMessages
  } = useAgentChat();
  
  // Canvas transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [hasInitializedView, setHasInitializedView] = useState(false);
  
  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [panStartTransform, setPanStartTransform] = useState<{ x: number; y: number; scale: number } | null>(null);
  
  // UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  // Canvas background theme state with localStorage persistence
  const [canvasTheme, setCanvasTheme] = useState<'charcoal' | 'black' | 'navy'>(() => {
    const saved = localStorage.getItem('explorationMapCanvasTheme');
    return (saved === 'black' || saved === 'navy') ? saved as 'black' | 'navy' : 'charcoal'; // Default to charcoal
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [showAgentDetailsModal, setShowAgentDetailsModal] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; nodeId?: string } | null>(null);
  const [summarizingNodes, setSummarizingNodes] = useState<Set<string>>(new Set());
  
  // Modal state management for full context modal
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
  
  // Resize state for right sidebar
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  
  // Performance refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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

  // Canvas theme toggle handler with persistence - cycles through 3 themes
  const toggleCanvasTheme = useCallback(() => {
    const themeOrder: Array<'charcoal' | 'black' | 'navy'> = ['charcoal', 'black', 'navy'];
    const currentIndex = themeOrder.indexOf(canvasTheme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const newTheme = themeOrder[nextIndex];
    
    setCanvasTheme(newTheme);
    localStorage.setItem('explorationMapCanvasTheme', newTheme);
    showNotification(`Canvas theme changed to ${newTheme}`);
  }, [canvasTheme, showNotification]);

  // Get canvas background styles based on theme
  const getCanvasBackgroundStyle = useCallback(() => {
    switch (canvasTheme) {
      case 'charcoal':
        return {
          backgroundColor: '#1a1a1a',
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          boxShadow: 'inset 0 0 40px -10px rgba(64, 64, 64, 0.3)'
        };
      case 'black':
        return {
          backgroundColor: '#0A0A0A',
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
          boxShadow: 'inset 0 0 40px -10px rgba(107, 107, 58, 0.3)'
        };
      case 'navy':
        return {
          backgroundColor: '#0f1419',
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)',
          boxShadow: 'inset 0 0 40px -10px rgba(59, 130, 246, 0.2)'
        };
      default:
        return {
          backgroundColor: '#1a1a1a',
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          boxShadow: 'inset 0 0 40px -10px rgba(64, 64, 64, 0.3)'
        };
    }
  }, [canvasTheme]);

  // Coordinate conversion helpers
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - transform.x) / transform.scale;
    const y = (screenY - rect.top - transform.y) / transform.scale;
    
    return { x, y };
  }, [transform]);

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
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, transform.scale * zoomFactor));
    
    if (newScale !== transform.scale && canvasRef.current) {
      let newX = transform.x;
      let newY = transform.y;
      
      if (centerX !== undefined && centerY !== undefined) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = centerX - rect.left;
        const mouseY = centerY - rect.top;
        
        const scaleDiff = newScale - transform.scale;
        newX = transform.x - (mouseX - transform.x) * (scaleDiff / transform.scale);
        newY = transform.y - (mouseY - transform.y) * (scaleDiff / transform.scale);
      }
      
      setTransform({ x: newX, y: newY, scale: newScale });
    }
  }, [transform]);

  // Handle wheel events
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Try to prevent default, but don't fail if it's a passive listener
    try {
      e.preventDefault();
    } catch (error) {
      // Passive event listener - can't prevent default
      console.debug('Cannot preventDefault on passive wheel event');
    }
    handleZoom(-e.deltaY, e.clientX, e.clientY);
  }, [handleZoom]);

  // Mouse event handlers
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
    
    // CANVAS CLICK FIX: Reset delete button states when clicking empty canvas
    console.log('🎯 [CANVAS-CLICK] Empty canvas clicked - resetting delete button states');
    console.log('🎯 [CANVAS-CLICK] Before reset:', {
      selectedNode: selectedNode
    });
    
    // Clear selection (this will reset delete button states)
    setSelectedNode(null);
    
    // Start panning
    try {
      e.preventDefault();
    } catch (error) {
      // Passive event listener - can't prevent default
      console.debug('Cannot preventDefault on passive canvas mouse event');
    }
    
    // Initialize panning state
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanStartTransform({ ...transform });
    
    // Change cursor to grabbing
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, [transform, selectedNode]);

  // Handle mouse move for panning - optimized with requestAnimationFrame
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart || !panStartTransform) {
      return;
    }
    
    // Calculate delta from pan start
    const deltaX = e.clientX - panStart.x;
    const deltaY = e.clientY - panStart.y;
    
    // Update transform in real-time with requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      const newTransform = {
        x: panStartTransform.x + deltaX,
        y: panStartTransform.y + deltaY,
        scale: panStartTransform.scale
      };
      
      setTransform(newTransform);
    });
  }, [isPanning, panStart, panStartTransform]);

  // Handle mouse up to end panning
  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      setPanStartTransform(null);
      
      // Reset cursor
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
      }
    }
  }, [isPanning]);

  // Global mouse move handler for smooth panning - optimized with requestAnimationFrame
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning || !panStart || !panStartTransform) {
      return;
    }
    
    // Calculate delta from pan start
    const deltaX = e.clientX - panStart.x;
    const deltaY = e.clientY - panStart.y;
    
    // Update transform in real-time with requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      const newTransform = {
        x: panStartTransform.x + deltaX,
        y: panStartTransform.y + deltaY,
        scale: panStartTransform.scale
      };
      
      setTransform(newTransform);
    });
  }, [isPanning, panStart, panStartTransform]);

  // Global mouse up handler
  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      setPanStartTransform(null);
      
      // Reset cursor
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
      }
    }
  }, [isPanning]);

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
      // Passive event listener - can't prevent default
      console.debug('Cannot preventDefault on passive node mouse event');
    }
    setSelectedNode(nodeId);
  }, []);

  // Get edge style for SVG rendering
  const getEdgeStyle = (type: string, strength?: number) => {
    const baseOpacity = strength ? Math.max(0.4, strength) : 0.6;
    const strokeWidth = strength ? Math.max(1.5, strength * 3) : 2;
    
    switch (type) {
      case 'support':
        return {
          stroke: `rgba(156, 163, 175, ${baseOpacity})`, // Changed from green to light gray
          strokeWidth,
          strokeDasharray: 'none',
          filter: strength && strength > 0.8 ? 'drop-shadow(0 0 4px rgba(156, 163, 175, 0.5))' : 'none'
        };
      case 'contradiction':
        return {
          stroke: `rgba(239, 68, 68, ${baseOpacity})`,
          strokeWidth,
          strokeDasharray: '8,4',
          filter: strength && strength > 0.8 ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))' : 'none'
        };
      case 'dependency':
        return {
          stroke: `rgba(156, 163, 175, ${baseOpacity})`,
          strokeWidth,
          strokeDasharray: '4,4',
          filter: strength && strength > 0.8 ? 'drop-shadow(0 0 4px rgba(156, 163, 175, 0.5))' : 'none'
        };
      case 'ai-relationship':
        return {
          stroke: `rgba(147, 51, 234, ${baseOpacity})`,
          strokeWidth,
          strokeDasharray: '6,3',
          filter: strength && strength > 0.8 ? 'drop-shadow(0 0 4px rgba(147, 51, 234, 0.5))' : 'none'
        };
      default:
        return {
          stroke: `rgba(255, 255, 255, ${baseOpacity * 0.7})`,
          strokeWidth: strokeWidth * 0.8,
          strokeDasharray: 'none',
          filter: 'none'
        };
    }
  };

  // Add idea to map from chat
  const addIdeaToMapLocal = useCallback(async (messageId: string, customTitle?: string) => {
    try {
      const success = await addMessageToMap(messageId, customTitle);
      if (success) {
        showNotification('Message added to map successfully');
      } else {
        showNotification('Failed to add message to map');
      }
    } catch (error) {
      console.error('Failed to add message to map:', error);
      showNotification('Failed to add message to map');
    }
  }, [addMessageToMap, showNotification]);

  // Global event listeners for panning
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false });
      
      // Prevent text selection during panning
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isPanning, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setShowContextMenu(null);
    };
    
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      
      const deltaX = e.clientX - resizeStartX;
      const newWidth = Math.max(280, Math.min(700, resizeStartWidth - deltaX));
      setRightSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    if (isResizingSidebar) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizingSidebar, resizeStartX, resizeStartWidth]);

  // Show loading state if map is loading
  if (mapLoading && nodes.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0A0A0A] text-[#E5E7EB]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#6B6B3A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading exploration map...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's a map error
  if (mapError) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0A0A0A] text-[#E5E7EB]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-red-300 mb-2 text-lg font-semibold">Failed to load map</p>
          <p className="text-gray-400 text-sm mb-4">{mapError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black font-medium rounded-lg transition-colors mr-2"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full h-full flex relative overflow-hidden bg-[#0A0A0A] text-[#E5E7EB]">
        {/* Notification */}
        {notification && (
          <div className="absolute top-16 right-4 z-50 glass-pane px-4 py-2 text-sm text-[#E5E7EB] border border-[#6B6B3A]/30 rounded-lg">
            {notification}
          </div>
        )}

        {/* Context Menu */}
        {showContextMenu && (
          <div 
            className="absolute z-50 glass-pane border border-gray-600/50 rounded-lg py-2 min-w-[150px]"
            style={{ left: showContextMenu.x, top: showContextMenu.y }}
          >
            {showContextMenu.nodeId ? (
              <>
                <button
                  onClick={() => {
                    if (showContextMenu.nodeId) {
                      handleSummarizeConversation(showContextMenu.nodeId);
                    }
                    setShowContextMenu(null);
                  }}
                  disabled={showContextMenu.nodeId ? summarizingNodes.has(showContextMenu.nodeId) : false}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700/50 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showContextMenu.nodeId && summarizingNodes.has(showContextMenu.nodeId) ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>
                    {showContextMenu.nodeId && summarizingNodes.has(showContextMenu.nodeId)
                      ? 'Summarizing...'
                      : 'Summarize'
                    }
                  </span>
                </button>
                <button
                  onClick={() => {
                    if (showContextMenu.nodeId) {
                      deleteNode(showContextMenu.nodeId);
                    }
                    setShowContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700/50 text-red-400 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Node</span>
                </button>
              </>
            ) : (
              <button 
                onClick={() => {
                  const canvasPos = screenToCanvas(showContextMenu.x, showContextMenu.y);
                  createNode(canvasPos.x, canvasPos.y);
                  setShowContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700/50 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Node Here</span>
              </button>
            )}
          </div>
        )}

        {/* Left Sidebar - Agents */}
        <div
          className={`flex-shrink-0 h-full glass-pane border-r border-gray-800/50 transition-all duration-300 ease-in-out ${
            leftSidebarCollapsed ? 'w-12' : 'w-64'
          }`}
          style={{ zIndex: 30, paddingTop: '4px' }}
        >
          {leftSidebarCollapsed ? (
            <div className="p-2 h-full flex flex-col items-center">
              <button
                onClick={() => setLeftSidebarCollapsed(false)}
                className="w-8 h-8 rounded bg-[#6B6B3A]/20 text-[#E5E7EB] hover:bg-[#6B6B3A]/30 flex items-center justify-center transition-colors"
                aria-label="Expand agents panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-[#E5E7EB]">Agents</h2>
                <button
                  onClick={() => setLeftSidebarCollapsed(true)}
                  className="w-6 h-6 rounded bg-[#6B6B3A]/20 text-[#E5E7EB] hover:bg-[#6B6B3A]/30 flex items-center justify-center transition-colors"
                  aria-label="Collapse agents panel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto space-y-2 mb-4">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className={`p-2 rounded-md transition-colors ${
                      activeAgents.includes(agent.agent_id)
                        ? 'bg-[#6B6B3A]/20 border border-[#6B6B3A]/30'
                        : 'hover:bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-start space-x-1.5 flex-1 min-w-0">
                        <User className="w-3 h-3 text-[#6B6B3A] flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="leading-tight">
                            <span className={`text-xs font-medium ${
                              activeAgents.includes(agent.agent_id) ? 'glow-olive-text' : 'text-[#E5E7EB]'
                            }`} style={{ fontSize: '9px', lineHeight: '1.3' }}>
                              {agent.name}{' '}
                              <button
                                onClick={() => setShowAgentDetailsModal(agent.agent_id)}
                                className="text-gray-400 hover:text-[#6B6B3A] transition-colors inline-block align-baseline"
                                style={{ whiteSpace: 'nowrap' }}
                                aria-label={`View details for ${agent.name}`}
                              >
                                <Info className="w-3 h-3 inline" />
                              </button>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeAgents.includes(agent.agent_id)}
                          onChange={() => {
                            const isActive = activeAgents.includes(agent.agent_id);
                            if (isActive) {
                              deactivateAgent(agent.agent_id);
                            } else {
                              activateAgent(agent.agent_id);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full ${
                          activeAgents.includes(agent.agent_id) ? 'bg-[#6B6B3A]' : 'bg-gray-600'
                        }`}></div>
                      </label>
                    </div>
                    
                  </div>
                ))}
              </div>

              <div className="mt-auto p-4 pt-3 border-t border-gray-800/50">
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="flex-1 px-4 py-2 text-sm font-medium text-[#E5E7EB] bg-[#6B6B3A]/20 hover:bg-[#6B6B3A]/30 border border-[#6B6B3A]/30 rounded-lg transition-colors"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div
          ref={canvasRef}
          className="flex-1 select-none overflow-hidden relative"
          style={{
            ...getCanvasBackgroundStyle(),
            height: '100%',
            paddingTop: '4px',
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp} // End panning if mouse leaves canvas
          tabIndex={0}
          role="application"
          aria-label="Strategy mapping canvas"
        >
          {/* Top Toolbar */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-40">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    const centerX = (-transform.x + (canvasRef.current?.clientWidth || 800) / 2) / transform.scale;
                    const centerY = (-transform.y + (canvasRef.current?.clientHeight || 600) / 2) / transform.scale;
                    createNode(centerX, centerY);
                  }}
                  className="glass-pane px-4 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Node</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Add Node</TooltipContent>
            </Tooltip>
            
            <div className="flex space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleZoom(1)}
                    className="glass-pane px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleZoom(-1)}
                    className="glass-pane px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
            </div>

            {selectedNode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => deleteNode(selectedNode)}
                    className="glass-pane px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete Node</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Theme Toggle Button - Positioned in Right Corner */}
          <div className="absolute top-4 right-4 z-50">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleCanvasTheme}
                  className={`glass-pane px-3 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
                    canvasTheme === 'charcoal' ? 'bg-gray-500/20 text-gray-300' :
                    canvasTheme === 'black' ? 'bg-gray-800/20 text-gray-200' :
                    canvasTheme === 'navy' ? 'bg-blue-500/20 text-blue-300' : 'text-[#E5E7EB] hover:text-[#6B6B3A]'
                  }`}
                  title={`Current: ${canvasTheme} theme - Click to cycle themes`}
                >
                  <Palette className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Change Background Theme</TooltipContent>
            </Tooltip>
          </div>

          {/* Canvas Content Container */}
          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
              willChange: 'auto',
              backfaceVisibility: 'hidden',
              perspective: '1000px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Grid Background */}
            <div
              className="absolute pointer-events-none opacity-20"
              style={{
                left: -2000,
                top: -2000,
                width: 4000,
                height: 4000,
                backgroundImage: `
                  linear-gradient(rgba(107, 107, 58, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(107, 107, 58, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              }}
            />

            {/* SVG Layer for Edges */}
            <ErrorBoundary context="SVG Edges Rendering" fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4 bg-red-900/20 rounded-lg border border-red-500/30">
                  <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-300 text-sm">Edge rendering error</p>
                </div>
              </div>
            }>
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
                <SVGEdges
                  nodes={nodes}
                  edges={edges}
                  getEdgeStyle={getEdgeStyle}
                  onDeleteEdge={(edgeId) => {
                    console.log('Delete edge:', edgeId);
                  }}
                  NODE_WIDTH={NODE_WIDTH}
                  NODE_HEIGHT={NODE_HEIGHT}
                  interactionState={{
                    state: 'IDLE',
                    data: { draggedNodeId: null }
                  } as any}
                  screenToCanvas={screenToCanvas}
                  transform={transform}
                />
              </svg>
            </ErrorBoundary>
            {/* Enhanced nodes with AI-powered tooltips - moved inside transformed container */}
            <ErrorBoundary context="Node Rendering" fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                  <Target className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-yellow-300 text-sm">Node rendering error</p>
                </div>
              </div>
            }>
              {nodes.map(node => {
                const isSelected = selectedNode === node.id;
                const isDragging = false;
                
                return (
                  <ErrorBoundary key={`node-boundary-${node.id}`} context={`Node ${node.id}`} fallback={
                    <div
                      className="absolute glass-pane p-4 w-60 border-red-500/50 bg-red-900/20"
                      style={{
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        zIndex: 20
                      }}
                    >
                      <div className="flex items-center gap-2 text-red-300">
                        <X className="w-4 h-4" />
                        <span className="text-sm">Node Error</span>
                      </div>
                      <p className="text-xs text-red-400 mt-1">{node.title}</p>
                    </div>
                  }>
                    <NodeWithTooltip
                      key={node.id}
                      node={node}
                      edges={edges}
                      transform={transform}
                      isSelected={isSelected}
                      isDragging={isDragging}
                      onMouseDown={handleNodeMouseDown}
                      onSelect={() => {
                        setSelectedNode(node.id);
                      }}
                      onModalOpen={handleModalOpen}
                    >
                      <SimpleNode
                        node={node}
                        transform={transform}
                        isSelected={isSelected}
                        isDragging={isDragging}
                        agents={agents}
                        onMouseDown={handleNodeMouseDown}
                        onSelect={() => {
                          setSelectedNode(node.id);
                        }}
                        onTooltipClick={(e) => {
                          e.stopPropagation();
                        }}
                      />
                    </NodeWithTooltip>
                  </ErrorBoundary>
                );
              })}
            </ErrorBoundary>
          </div>
          
          {/* Debug info */}
          {nodes.length > 0 && (
            <div className="absolute top-4 left-4 z-50 glass-pane px-3 py-2 text-xs text-white">
              🎨 Rich Nodes: {nodes.length} | Transform: x={Math.round(transform.x)}, y={Math.round(transform.y)}, scale={transform.scale.toFixed(2)}
            </div>
          )}
        </div>

        {/* Right Sidebar - Sparring Session */}
        <div
          className="flex-shrink-0 h-full glass-pane border-l border-gray-800/50 overflow-hidden relative"
          style={{
            width: `${rightSidebarWidth}px`,
            minWidth: '280px',
            maxWidth: '700px',
            zIndex: 30,
            paddingTop: '4px',
            transform: 'translate3d(0,0,0)',
          }}
        >
          {/* Resize Handle */}
          <div
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#6B6B3A]/50 transition-colors z-40"
            onMouseDown={(e) => {
              setIsResizingSidebar(true);
              setResizeStartX(e.clientX);
              setResizeStartWidth(rightSidebarWidth);
              e.preventDefault();
            }}
            style={{
              background: isResizingSidebar ? 'rgba(107, 107, 58, 0.5)' : 'transparent',
            }}
          />
          <div className="relative p-3 h-full overflow-hidden" style={{ paddingLeft: '8px' }}>
            <ErrorBoundary context="Sparring Session" fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <X className="w-6 h-6 text-red-600 mx-auto mb-2" />
                  <p className="text-red-300">Chat Error</p>
                </div>
              </div>
            }>
              <SparringSession onAddToMap={addIdeaToMapLocal} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Full Context Modal */}
        {modalState.node && modalState.processedContent && (
          <FullContextModal
            node={modalState.node}
            edges={modalState.edges}
            processedContent={modalState.processedContent}
            isOpen={modalState.isOpen}
            onClose={handleModalClose}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default UnifiedExplorationMap;