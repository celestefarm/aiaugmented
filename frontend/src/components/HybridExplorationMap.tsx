
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, User, Target, Trash2, ZoomIn, ZoomOut, Link, RefreshCw, Check, Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMap } from '@/contexts/MapContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAgentChat } from '@/contexts/AgentChatContext';
import { useInteraction } from '@/contexts/InteractionContext';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, clearAllNodes } from '@/lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import SparringSession from './SparringSession';
import { NodeWithTooltip } from './NodeWithTooltip';
import { FullContextModal } from './FullContextModal';
import { ProcessedContent } from '@/utils/tooltipContentUtils';

// Import the original SimpleNode component from ExplorationMap
const SimpleNodeComponent: React.FC<any> = ({ node, transform, isSelected, isDragging, agents, onMouseDown, onSelect, onTooltipClick }) => {
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
        left: `${node.x * transform.scale + transform.x}px`,
        top: `${node.y * transform.scale + transform.y}px`,
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
  } = useInteraction();
  
  // Canvas transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [hasInitializedView, setHasInitializedView] = useState(false);
  
  // UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
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
    if (interactionState.state !== 'IDLE') {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false });
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [interactionState.state, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Update InteractionManager with current transform
  useEffect(() => {
    updateTransform(transform);
  }, [transform, updateTransform]);

  // Auto-center view on existing nodes when first loaded
  useEffect(() => {
    if (!hasInitializedView && nodes.length > 0 && canvasRef.current) {
      const nodePositions = nodes.map(node => ({ x: node.x, y: node.y }));
      
      if (nodePositions.length > 0) {
        const nodePadding = { width: NODE_WIDTH / 2, height: NODE_HEIGHT / 2 };
        const viewportPadding = 50;
        
        const minX = Math.min(...nodePositions.map(p => p.x)) - nodePadding.width;
        const maxX = Math.max(...nodePositions.map(p => p.x)) + nodePadding.width;
        const minY = Math.min(...nodePositions.map(p => p.y)) - nodePadding.height;
        const maxY = Math.max(...nodePositions.map(p => p.y)) + nodePadding.height;
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const toolbarHeight = 120;
        const canvasCenterX = canvasRect.width / 2;
        const canvasCenterY = (canvasRect.height - toolbarHeight) / 2 + toolbarHeight;
        
        const newTransform = {
          x: canvasCenterX - centerX,
          y: canvasCenterY - centerY + viewportPadding,
          scale: 1
        };
        
        setTransform(newTransform);
        setHasInitializedView(true);
      }
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

  // Handle zoom
  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    const zoomFactor = delta > 0 ? 1.2 : 0.8;
    const newScale = Math.max(0.5, Math.min(2, transform.scale * zoomFactor));
    
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
                      <span className={`text-xs font-medium leading-tight ${
                        activeAgents.includes(agent.agent_id) ? 'glow-olive-text' : 'text-[#E5E7EB]'
                      }`}>
                        {agent.name}
                      </span>
                      
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
            boxShadow: 'inset 0 0 40px -10px rgba(107, 107, 58, 0.3)',
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
          {/* Canvas content would go here */}
          <div className="absolute inset-0">
            {/* Render nodes */}
            {nodes.map(node => (
              <SimpleNodeComponent
                key={node.id}
                node={node}
                transform={transform}
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
          className="flex-shrink-0 h-screen glass-pane border-l border-gray-800/50 overflow-hidden relative"
          style={{
            width: `${rightSidebarWidth}px`,
            minWidth: '280px',
            maxWidth: '600px',
            zIndex: 30,
            paddingTop: '4rem',
          }}
        >
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