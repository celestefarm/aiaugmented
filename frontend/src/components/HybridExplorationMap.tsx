
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, User, Target, Trash2, ZoomIn, ZoomOut, Link, RefreshCw, Check, Info, HelpCircle, Users, Briefcase } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMap } from '@/contexts/MapContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAgentChat } from '@/contexts/AgentChatContext';
import { useInteraction } from '@/contexts/InteractionContext';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, clearAllNodes, removeMessageFromMap } from '@/lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import SparringSession from './SparringSession';
import { NodeWithTooltip } from './NodeWithTooltip';
import { FullContextModal } from './FullContextModal';
import { ProcessedContent } from '@/utils/tooltipContentUtils';
import { TransformManager, Transform } from '@/managers/TransformManager';

// Import the original SimpleNode component from ExplorationMap
const SimpleNodeComponent: React.FC<{
  node: Node;
  transform: Transform;
  isSelected: boolean;
  isDragging: boolean;
  agents: any[];
  onMouseDown: (e: React.MouseEvent, nodeId: string, nodeType: 'ai' | 'human') => void;
  onSelect: () => void;
  onTooltipClick?: (e: React.MouseEvent) => void;
}> = ({ node, transform, isSelected, isDragging, agents, onMouseDown, onSelect, onTooltipClick }) => {
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
    e.preventDefault();
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
        left: `${node.x}px`,
        top: `${node.y}px`,
        zIndex: isDragging ? 1000 : 20,
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        pointerEvents: 'auto',
        userSelect: 'none',
        position: 'absolute',
        willChange: isDragging ? 'transform' : 'auto'
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        if (isDragging) {
          e.preventDefault();
        }
      }}
    >
      <div className="relative">
        {node.source_agent && (
          <div className="absolute top-0 left-0 text-xs text-blue-400 font-medium bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30 shadow-sm z-10">
            {(() => {
              const agent = agents.find(a => a.agent_id === node.source_agent);
              return agent ? agent.name : node.source_agent;
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

const HybridExplorationMap: React.FC = () => {
  console.log('🔍 [LIFECYCLE] HybridExplorationMap component initializing');
  
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
    removeMessageFromMap: removeMessageFromMapContext,
    loadMessages
  } = useAgentChat();
  
  // Use the existing InteractionContext for perfect compatibility
  const {
    interactionState,
    handleCanvasMouseDown,
    handleNodeMouseDown,
    handleGlobalMouseMove,
    handleGlobalMouseUp,
    updateTransform,
    startConnecting,
    cancelInteraction,
    registerTransformUpdateCallback,
  } = useInteraction();
  
  // Create stable TransformManager instance
  const transformManager = useRef<TransformManager>(new TransformManager());
  
  // Simple state for CSS transform updates
  const [cssTransform, setCssTransform] = useState<string>('translate(0px, 0px) scale(1)');
  const [hasInitializedView, setHasInitializedView] = useState(false);

  console.log('🔍 [STATE] Component state:', {
    nodesCount: nodes.length,
    cssTransform,
    hasInitializedView,
    interactionState: interactionState.state,
    mapLoading
  });

  // Subscribe to TransformManager updates
  useEffect(() => {
    console.log('🔍 [TRANSFORM-SUBSCRIPTION] Setting up TransformManager subscription');
    
    const unsubscribe = transformManager.current.subscribe((transform: Transform) => {
      console.log('🔍 [TRANSFORM-UPDATE] TransformManager notified of change:', transform);
      const newCssTransform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
      console.log('🔍 [CSS-TRANSFORM] Setting CSS transform:', newCssTransform);
      setCssTransform(newCssTransform);
    });

    // Set initial CSS transform
    const initialTransform = transformManager.current.getTransform();
    console.log('🔍 [INITIAL-TRANSFORM] Loading initial transform from TransformManager:', initialTransform);
    const initialCssTransform = `translate(${initialTransform.x}px, ${initialTransform.y}px) scale(${initialTransform.scale})`;
    console.log('🔍 [INITIAL-CSS] Setting initial CSS transform:', initialCssTransform);
    setCssTransform(initialCssTransform);

    return () => {
      console.log('🔍 [TRANSFORM-SUBSCRIPTION] Cleaning up TransformManager subscription');
      unsubscribe();
    };
  }, []);
  
  // UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showAgentDetailsModal, setShowAgentDetailsModal] = useState<string | null>(null);
  
  // Modal state for tooltips
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
  
  // Constants
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 120;
  const GRID_SIZE = 20;

  // Show notification helper
  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Enhanced global event listeners using InteractionManager
  useEffect(() => {
    console.log('🔍 [INTERACTION-LISTENERS] Interaction state changed:', interactionState.state);
    
    if (interactionState.state !== 'IDLE') {
      console.log('🔍 [INTERACTION-LISTENERS] Adding global mouse event listeners');
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false });
      
      return () => {
        console.log('🔍 [INTERACTION-LISTENERS] Removing global mouse event listeners');
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [interactionState.state, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Update InteractionManager with current transform and handle panning
  useEffect(() => {
    console.log('🔍 [INTERACTION-SYNC] Syncing transform with InteractionManager, cssTransform:', cssTransform);
    const currentTransform = transformManager.current.getTransform();
    console.log('🔍 [INTERACTION-SYNC] Current TransformManager transform:', currentTransform);
    updateTransform(currentTransform);
    console.log('🔍 [INTERACTION-SYNC] ✅ Transform synced with InteractionManager');
  }, [cssTransform, updateTransform]);

  // Handle InteractionManager transform updates (for panning)
  const handleInteractionTransformUpdate = useCallback((newTransform: Transform) => {
    console.log('🔍 [INTERACTION-CALLBACK] InteractionManager requesting transform update:', newTransform);
    transformManager.current.setTransform(newTransform);
    console.log('🔍 [INTERACTION-CALLBACK] ✅ Transform updated via InteractionManager');
  }, []);

  // Register callbacks with InteractionManager
  useEffect(() => {
    registerTransformUpdateCallback(handleInteractionTransformUpdate);
  }, [registerTransformUpdateCallback, handleInteractionTransformUpdate]);

  // Sidebar resize event listeners - Optimized for smooth performance
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        const deltaX = resizeStartX - e.clientX; // Negative delta means expanding
        const newWidth = Math.max(280, Math.min(600, resizeStartWidth + deltaX));
        setRightSidebarWidth(newWidth);
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isResizingSidebar) {
        e.preventDefault();
        e.stopPropagation();
        
        setIsResizingSidebar(false);
        setResizeStartX(0);
        setResizeStartWidth(0);
        
        // Clean up body styles
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';
      }
    };

    if (isResizingSidebar) {
      // Use passive: false for preventDefault to work
      document.addEventListener('mousemove', handleMouseMove, { passive: false, capture: true });
      document.addEventListener('mouseup', handleMouseUp, { passive: false, capture: true });
      
      // Optimize body styles for smooth dragging
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none'; // Prevent interference from other elements
      
      // Re-enable pointer events on the sidebar
      const sidebar = document.querySelector('[data-sidebar="true"]');
      if (sidebar) {
        (sidebar as HTMLElement).style.pointerEvents = 'auto';
      }
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('mouseup', handleMouseUp, true);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';
      };
    }
  }, [isResizingSidebar, resizeStartX, resizeStartWidth]);

  // Auto-center logic using TransformManager
  useEffect(() => {
    console.log('🔍 [AUTO-CENTER] Auto-center effect triggered:', {
      hasInitializedView,
      nodesLength: nodes.length,
      canvasRefExists: !!canvasRef.current
    });

    if (!hasInitializedView && nodes.length > 0 && canvasRef.current) {
      console.log('🔧 [AUTO-CENTER] ⚡ STARTING AUTO-CENTERING PROCESS');
      console.log('🔧 [AUTO-CENTER] Node data:', nodes.map(n => ({ id: n.id, x: n.x, y: n.y, title: n.title })));

      const nodePositions = nodes.map(node => ({ x: node.x, y: node.y }));
      console.log('🔧 [AUTO-CENTER] Node positions:', nodePositions);
      
      if (nodePositions.length > 0) {
        // PADDING FIX: Use more conservative node padding calculations
        const nodePadding = { width: NODE_WIDTH / 2, height: NODE_HEIGHT / 2 };
        console.log('🔧 [AUTO-CENTER] Node padding:', nodePadding);
        
        const minX = Math.min(...nodePositions.map(p => p.x)) - nodePadding.width;
        const maxX = Math.max(...nodePositions.map(p => p.x)) + nodePadding.width;
        const minY = Math.min(...nodePositions.map(p => p.y)) - nodePadding.height;
        const maxY = Math.max(...nodePositions.map(p => p.y)) + nodePadding.height;
        
        const nodeBounds = { minX, maxX, minY, maxY };
        console.log('🔧 [AUTO-CENTER] Calculated node bounds:', nodeBounds);
        
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const viewport = { width: canvasRect.width, height: canvasRect.height };
        console.log('🔧 [AUTO-CENTER] Canvas viewport:', viewport);
        console.log('🔧 [AUTO-CENTER] Canvas rect details:', {
          left: canvasRect.left,
          top: canvasRect.top,
          right: canvasRect.right,
          bottom: canvasRect.bottom,
          width: canvasRect.width,
          height: canvasRect.height
        });
        
        // PADDING FIX: Validate viewport dimensions before proceeding
        if (viewport.width <= 0 || viewport.height <= 0) {
          console.log('🔧 [AUTO-CENTER] ⚠️ Invalid viewport dimensions, deferring auto-centering');
          return;
        }
        
        // Check current transform before auto-centering
        const currentTransform = transformManager.current.getTransform();
        console.log('🔧 [AUTO-CENTER] Current transform before auto-centering:', currentTransform);
        
        // PADDING FIX: Use conservative padding that scales with viewport size
        const conservativePadding = Math.min(50, Math.min(viewport.width, viewport.height) * 0.1);
        console.log('🔧 [AUTO-CENTER] Using conservative padding:', conservativePadding);
        
        // Use TransformManager's optimal centering with conservative padding
        const optimalTransform = transformManager.current.calculateOptimalCenterTransform(
          nodeBounds,
          viewport,
          conservativePadding
        );
        console.log('🔧 [AUTO-CENTER] Calculated optimal transform:', optimalTransform);
        
        // PADDING FIX: Validate the calculated transform before applying
        const isTransformReasonable = (
          Math.abs(optimalTransform.x) < viewport.width * 2 &&
          Math.abs(optimalTransform.y) < viewport.height * 2 &&
          optimalTransform.scale > 0.1 && optimalTransform.scale < 5
        );
        
        if (!isTransformReasonable) {
          console.log('🔧 [AUTO-CENTER] ⚠️ Calculated transform seems unreasonable, using safe default');
          transformManager.current.setTransform({ x: 0, y: 0, scale: 1 });
        } else {
          console.log('🔧 [AUTO-CENTER] 🎯 APPLYING OPTIMAL TRANSFORM');
          transformManager.current.setTransform(optimalTransform);
        }
        
        const finalTransform = transformManager.current.getTransform();
        console.log('🔧 [AUTO-CENTER] Final transform after setting:', finalTransform);
        
        setHasInitializedView(true);
        console.log('🔧 [AUTO-CENTER] ✅ Auto-centering completed, hasInitializedView set to true');
      }
    } else {
      console.log('🔧 [AUTO-CENTER] Skipping auto-center:', {
        reason: hasInitializedView ? 'Already initialized' : nodes.length === 0 ? 'No nodes' : 'No canvas ref'
      });
    }
  }, [nodes, hasInitializedView]);

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

  // Create new node
  const createNode = useCallback(async (canvasX: number, canvasY: number, data: Partial<NodeCreateRequest> = {}) => {
    if (!currentWorkspace) {
      showNotification('No workspace selected');
      return null;
    }

    try {
      const snappedPos = {
        x: Math.round(canvasX / GRID_SIZE) * GRID_SIZE,
        y: Math.round(canvasY / GRID_SIZE) * GRID_SIZE
      };
      
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
  }, [currentWorkspace, showNotification, createNodeAPI]);

  // Delete node
  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      console.log('🗑️ [HYBRID-DELETE-NODE] Starting node deletion process:', { nodeId, nodeTitle: node.title });
      
      // CRITICAL FIX: Call removeMessageFromMap API to properly revert chat message state
      // This ensures the "Added to map" button reverts to "Add to map" for both AI and human messages
      try {
        console.log('🗑️ [HYBRID-DELETE-NODE] Calling removeMessageFromMap API for node:', nodeId);
        const removeResult = await removeMessageFromMapContext(nodeId);
        console.log('🗑️ [HYBRID-DELETE-NODE] removeMessageFromMap result:', removeResult);
        
        if (removeResult) {
          console.log('🗑️ [HYBRID-DELETE-NODE] ✅ Successfully reverted message state for node:', nodeId);
        } else {
          console.warn('🗑️ [HYBRID-DELETE-NODE] ⚠️ removeMessageFromMap returned false, but continuing with node deletion');
        }
      } catch (removeError) {
        console.warn('🗑️ [HYBRID-DELETE-NODE] ⚠️ Failed to revert message state, but continuing with node deletion:', removeError);
        // Don't fail the whole operation if message revert fails - the node deletion is more important
      }
      
      // Delete the node from the canvas
      await deleteNodeAPI(nodeId);
      setSelectedNode(null);
      showNotification(`Deleted node: ${node.title}`);
      
      // ENHANCED FIX: Refresh both chat messages and map data to ensure UI consistency
      // This ensures both the chat sidebar and canvas are properly synchronized
      try {
        console.log('🗑️ [HYBRID-DELETE-NODE] Refreshing chat messages and map data...');
        await Promise.all([
          loadMessages(),
          refreshMapData()
        ]);
        console.log('🗑️ [HYBRID-DELETE-NODE] ✅ Successfully refreshed chat and map data');
        
      } catch (refreshError) {
        console.warn('🗑️ [HYBRID-DELETE-NODE] ⚠️ Failed to refresh chat messages after node deletion:', refreshError);
        // Don't fail the whole operation if message refresh fails
      }
    } catch (error) {
      console.error('🗑️ [HYBRID-DELETE-NODE] ❌ Failed to delete node:', error);
      showNotification('Failed to delete node');
    }
  }, [nodes, showNotification, deleteNodeAPI, loadMessages, refreshMapData, removeMessageFromMapContext]);

  // Handle zoom using TransformManager
  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    const zoomFactor = delta > 0 ? 1.2 : 0.8;
    
    if (centerX !== undefined && centerY !== undefined && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = centerX - rect.left;
      const mouseY = centerY - rect.top;
      
      transformManager.current.scaleAt(zoomFactor, mouseX, mouseY);
    } else {
      // Zoom at center if no specific point provided
      const currentTransform = transformManager.current.getTransform();
      transformManager.current.setTransform({
        scale: Math.max(0.1, Math.min(3, currentTransform.scale * zoomFactor))
      });
    }
  }, []);

  // Handle wheel events
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(-e.deltaY, e.clientX, e.clientY);
  }, [handleZoom]);

  // Handle modal open/close
  const handleModalOpen = useCallback((node: Node, edges: Edge[], processedContent: ProcessedContent) => {
    setModalState({
      isOpen: true,
      node,
      edges,
      processedContent
    });
  }, []);

  const handleModalClose = useCallback(() => {
    setModalState({
      isOpen: false,
      node: null,
      edges: [],
      processedContent: null
    });
  }, []);

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

  // Get edge style
  const getEdgeStyle = useCallback((type: string, strength?: number) => {
    const baseOpacity = strength ? Math.max(0.4, strength) : 0.6;
    const strokeWidth = strength ? Math.max(1.5, strength * 3) : 2;
    
    switch (type) {
      case 'support':
        return {
          stroke: `rgba(156, 163, 175, ${baseOpacity})`,
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
  }, []);

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
      <div className="w-full h-screen flex relative overflow-hidden bg-[#0A0A0A] text-[#E5E7EB]">
        {/* Notification */}
        {notification && (
          <div className="absolute top-4 right-4 z-50 glass-pane px-4 py-2 text-sm text-[#E5E7EB] border border-[#6B6B3A]/30 rounded-lg">
            {notification}
          </div>
        )}

        {/* Left Sidebar - Agents */}
        <div
          className={`flex-shrink-0 h-screen glass-pane border-r border-gray-800/50 transition-all duration-300 ease-in-out ${
            leftSidebarCollapsed ? 'w-12' : 'w-64'
          }`}
          style={{ zIndex: 30, paddingTop: '4rem' }}
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
            <div className="p-4 h-full flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
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
                            <span
                              className={`font-medium ${
                                activeAgents.includes(agent.agent_id) ? 'glow-olive-text' : 'text-[#E5E7EB]'
                              }`}
                              style={{ fontSize: '9px', lineHeight: '1.3' }}
                            >
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

        {/* Canvas Area with Synchronized Rendering */}
        <div
          ref={canvasRef}
          className={`flex-1 select-none overflow-hidden relative ${
            interactionState.state === 'PANNING' ? 'cursor-grabbing' :
            interactionState.state === 'CONNECTING' ? 'cursor-crosshair' :
            interactionState.state === 'DRAGGING_NODE' ? 'cursor-grabbing' :
            'cursor-grab'
          }`}
          style={{
            height: '100vh',
            paddingTop: '4rem',
            willChange: interactionState.state === 'PANNING' ? 'transform' : 'auto',
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            transformStyle: 'preserve-3d',
          }}
          onMouseDown={(e) => {
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
            
            if (!isUIElement) {
              handleCanvasMouseDown(e as any);
            }
          }}
          onWheel={handleWheel}
        >
          {/* Top Toolbar */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-40">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (interactionState.state === 'CONNECTING') {
                      cancelInteraction();
                      showNotification('Connection mode cancelled');
                    } else {
                      startConnecting();
                      showNotification('Connection mode activated - Click a node and drag to connect');
                    }
                  }}
                  className={`glass-pane px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
                    interactionState.state === 'CONNECTING'
                      ? 'text-[#6B6B3A] bg-[#6B6B3A]/20 ring-1 ring-[#6B6B3A]/30'
                      : 'text-[#E5E7EB] hover:text-[#6B6B3A] hover:bg-[#6B6B3A]/10'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  <span>{interactionState.state === 'CONNECTING' ? 'Cancel Connection' : 'Connect Nodes'}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {interactionState.state === 'CONNECTING'
                  ? 'Cancel connection mode'
                  : 'Connect Nodes - Click node and drag to connect'
                }
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleZoom(1)}
                  className="glass-pane px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] hover:bg-[#6B6B3A]/10 transition-colors"
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
                  className="glass-pane px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] hover:bg-[#6B6B3A]/10 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
          </div>

          {/* Connection creation hint */}
          {interactionState.state === 'CONNECTING' && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 glass-pane px-4 py-2 text-sm text-[#6B6B3A] z-40 border border-[#6B6B3A]/30">
              🔗 Click a node and drag to another node to create connection
            </div>
          )}
          {/* Canvas content with TransformManager integration */}
          <div
            className="absolute inset-0"
            style={{
              transform: cssTransform,
              transformOrigin: '0 0',
              willChange: interactionState.state === 'PANNING' ? 'transform' : 'auto'
            }}
          >
            {/* Render nodes */}
            {nodes.map(node => (
              <SimpleNodeComponent
                key={node.id}
                node={node}
                transform={{ x: 0, y: 0, scale: 1 }} // Nodes now use absolute positioning within transformed container
                isSelected={selectedNode === node.id}
                isDragging={interactionState.state === 'DRAGGING_NODE'}
                agents={agents}
                onMouseDown={handleNodeMouseDown}
                onSelect={() => setSelectedNode(node.id)}
                onTooltipClick={(e) => {
                  // Handle tooltip click if needed
                }}
              />
            ))}
          </div>
        </div>

        {/* Right Sidebar - Sparring Session */}
        <div
          data-sidebar="true"
          className={`flex-shrink-0 h-screen glass-pane border-l border-gray-800/50 overflow-hidden relative ${
            isResizingSidebar ? '' : 'transition-all duration-200 ease-in-out'
          }`}
          style={{
            width: `${rightSidebarWidth}px`,
            minWidth: '280px',
            maxWidth: '600px',
            zIndex: 30,
            paddingTop: '4rem',
            // Performance optimizations for smooth dragging
            willChange: isResizingSidebar ? 'width' : 'auto',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)', // Force hardware acceleration
          }}
        >
          {/* Resize Handle */}
          <div
            className={`absolute left-0 top-0 w-2 h-full cursor-col-resize z-20 ${
              isResizingSidebar ? 'bg-[#6B6B3A]/70' : 'bg-transparent hover:bg-[#6B6B3A]/30'
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsResizingSidebar(true);
              setResizeStartX(e.clientX);
              setResizeStartWidth(rightSidebarWidth);
            }}
            style={{
              background: isResizingSidebar
                ? 'linear-gradient(90deg, rgba(107, 107, 58, 0.8) 0%, rgba(107, 107, 58, 0.4) 100%)'
                : undefined,
              // Smooth hover transition only when not dragging
              transition: isResizingSidebar ? 'none' : 'background-color 0.15s ease-out'
            }}
          >
            {/* Visual indicator for resize handle */}
            <div
              className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-[#6B6B3A]/60 rounded-r transition-opacity duration-200 ${
                isResizingSidebar ? 'opacity-100' : 'opacity-0 hover:opacity-100'
              }`}
            />
          </div>
          
          <div className="relative p-3 h-full overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
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

        {/* Agent Details Modal */}
        {showAgentDetailsModal && (
          <Dialog open={!!showAgentDetailsModal} onOpenChange={() => setShowAgentDetailsModal(null)}>
            <DialogContent className="max-w-5xl p-0 border-0 bg-transparent shadow-none">
              {(() => {
                const agent = agents.find(a => a.agent_id === showAgentDetailsModal);
                if (!agent?.full_description) return null;
                
                return (
                  <div className="relative w-full max-w-5xl mx-auto">
                    {/* Luxury Glass Container with Floating Effect */}
                    <div className="relative luxury-glass hover-elevate rounded-3xl">
                      
                      {/* Subtle Glow Effect */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-gold-500/5 via-transparent to-silver-500/5 pointer-events-none"></div>
                      
                      {/* Header Section */}
                      <div className="relative px-10 py-8 border-b border-gold-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/30 flex items-center justify-center border border-gold-500/30 shadow-lg">
                              <User className="w-8 h-8 text-gold-400" />
                            </div>
                            <div>
                              <h1 className="text-3xl serif-elegant text-white mb-1 tracking-wide">
                                {agent.name}
                              </h1>
                              <p className="text-sm sans-refined text-gold-400/80">
                                Strategic Agent Profile
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setShowAgentDetailsModal(null)}
                            className="w-12 h-12 rounded-full refined-close text-gold-400 flex items-center justify-center"
                            aria-label="Close agent details"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>
                      </div>

                      {/* Content Section - Two Column Layout */}
                      <div className="px-10 py-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          
                          {/* Left Column */}
                          <div className="space-y-8">
                            {/* Mission Section */}
                            <div className="group">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500/20 to-gold-600/30 flex items-center justify-center border border-gold-500/30">
                                  <Target className="w-4 h-4 text-gold-400" />
                                </div>
                                <h2 className="text-lg sans-refined metallic-gold">
                                  Mission
                                </h2>
                              </div>
                              <div className="pl-11">
                                <p className="text-gray-200 leading-relaxed serif-elegant">
                                  {agent.full_description.mission}
                                </p>
                              </div>
                              {/* Metallic divider */}
                              <div className="mt-6 metallic-divider"></div>
                            </div>

                            {/* Role & Responsibilities Section */}
                            <div className="group">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-silver-500/20 to-silver-600/30 flex items-center justify-center border border-silver-500/30">
                                  <Briefcase className="w-4 h-4 text-silver-400" />
                                </div>
                                <h2 className="text-lg sans-refined metallic-silver">
                                  Role & Responsibilities
                                </h2>
                              </div>
                              <div className="pl-11 space-y-3">
                                <p className="text-gray-200 leading-relaxed serif-elegant">
                                  {agent.full_description.role}
                                </p>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {agent.full_description.jobDescription}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-8">
                            {/* Key Tasks Section */}
                            <div className="group">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500/20 to-gold-600/30 flex items-center justify-center border border-gold-500/30">
                                  <Target className="w-4 h-4 text-gold-400" />
                                </div>
                                <h2 className="text-lg sans-refined metallic-gold">
                                  Key Tasks
                                </h2>
                              </div>
                              <div className="pl-11">
                                <ul className="space-y-3">
                                  {agent.full_description.tasks?.map((task, index) => (
                                    <li key={index} className="flex items-start space-x-3 group/item">
                                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 mt-2 flex-shrink-0 shadow-sm"></div>
                                      <span className="text-gray-200 leading-relaxed group-hover/item:text-white transition-colors">
                                        {task}
                                      </span>
                                    </li>
                                  )) || []}
                                </ul>
                              </div>
                              {/* Metallic divider */}
                              <div className="mt-6 metallic-divider"></div>
                            </div>

                            {/* Collaboration Section */}
                            <div className="group">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-silver-500/20 to-silver-600/30 flex items-center justify-center border border-silver-500/30">
                                  <Users className="w-4 h-4 text-silver-400" />
                                </div>
                                <h2 className="text-lg sans-refined metallic-silver">
                                  Collaboration
                                </h2>
                              </div>
                              <div className="pl-11 space-y-4">
                                <div className="p-4 rounded-xl bg-slate-800/30 border border-gold-500/10 hover:border-gold-500/20 transition-colors luxury-button">
                                  <span className="text-xs sans-refined text-gold-400/90 block mb-2">
                                    With Humans
                                  </span>
                                  <p className="text-gray-200 text-sm leading-relaxed">
                                    {agent.full_description.humanCollaboration}
                                  </p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-800/30 border border-silver-500/10 hover:border-silver-500/20 transition-colors luxury-button">
                                  <span className="text-xs sans-refined text-silver-400/90 block mb-2">
                                    With Other Agents
                                  </span>
                                  <p className="text-gray-200 text-sm leading-relaxed">
                                    {agent.full_description.agentCollaboration}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer with subtle branding */}
                      <div className="px-10 py-6 border-t border-gold-500/10">
                        <div className="flex items-center justify-center">
                          <div className="flex items-center space-x-2 text-xs sans-refined text-gray-500">
                            <div className="w-1 h-1 rounded-full bg-gold-500/50"></div>
                            <span>Strategic Intelligence Profile</span>
                            <div className="w-1 h-1 rounded-full bg-gold-500/50"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}

        {/* Modal for tooltips */}
        {modalState.isOpen && modalState.node && (
          <FullContextModal
            isOpen={modalState.isOpen}
            node={modalState.node}
            edges={modalState.edges}
            processedContent={modalState.processedContent}
            onClose={handleModalClose}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default HybridExplorationMap;