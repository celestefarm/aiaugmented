import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Plus, Target, Trash2, ZoomIn, ZoomOut, RefreshCw, X, User, Link, Check, Info, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMap } from '@/contexts/MapContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAgentChat } from '@/contexts/AgentChatContext';
import { Node, Edge, NodeCreateRequest, clearAllNodes } from '@/lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import SparringSession from './SparringSession';
// SimpleNode component extracted from ExplorationMap
interface SimpleNodeProps {
  node: Node;
  transform: { x: number; y: number; scale: number };
  isSelected: boolean;
  isDragging: boolean;
  agents: any[];
  onMouseDown: (event: React.MouseEvent, nodeId: string) => void;
  onSelect: () => void;
  onTooltipClick?: (event: React.MouseEvent) => void;
}

const SimpleNode: React.FC<SimpleNodeProps> = ({
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
    
    e.preventDefault();
    onMouseDown(e, node.id);
    onSelect();
  }, [node.id, onMouseDown, onSelect]);

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
import ConnectorManager, { ConnectorAnchor, ConnectorState } from '@/managers/ConnectorManager';
import ConnectorRenderer from './ConnectorRenderer';
import ConnectorButton from './ConnectorButton';
import ConnectorCard from './ConnectorCard';

const EnhancedExplorationMap: React.FC = () => {
  // Context hooks
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
  const { agents, addMessageToMap } = useAgentChat();
  
  // Canvas state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [hasInitializedView, setHasInitializedView] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  
  // Connector system state
  const [connectorManager] = useState(() => new ConnectorManager({
    onConnectionCreated: (edge: Edge) => {
      showNotification(`Connected nodes successfully`);
      refreshMapData();
    },
    onConnectionFailed: (error: string) => {
      showNotification(`Connection failed: ${error}`);
    },
    onModeChanged: (mode: string) => {
      console.log('Connector mode changed:', mode);
    }
  }));
  
  const [connectorState, setConnectorState] = useState<ConnectorState>(connectorManager.getState());
  const [connectorAnchors, setConnectorAnchors] = useState<ConnectorAnchor[]>([]);
  
  // Connector card state
  const [connectorCard, setConnectorCard] = useState<{
    edge: Edge;
    fromNode: Node;
    toNode: Node;
    position: { x: number; y: number };
  } | null>(null);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Constants
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2;
  const GRID_SIZE = 20;
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 120;

  // Initialize connector manager
  useEffect(() => {
    if (currentWorkspace && nodes.length > 0) {
      connectorManager.initialize(currentWorkspace.id, nodes);
      setConnectorAnchors(connectorManager.getAnchors());
      setConnectorState(connectorManager.getState());
    }
  }, [currentWorkspace, nodes, connectorManager]);

  // Update connector manager when nodes change
  useEffect(() => {
    connectorManager.updateNodes(nodes);
    setConnectorAnchors(connectorManager.getAnchors());
  }, [nodes, connectorManager]);

  // Update connector manager transform
  useEffect(() => {
    connectorManager.updateTransform(transform);
    setConnectorAnchors(connectorManager.getAnchors());
  }, [transform, connectorManager]);

  // Show notification helper
  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

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
    e.preventDefault();
    handleZoom(-e.deltaY, e.clientX, e.clientY);
  }, [handleZoom]);

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
    } catch (error) {
      console.error('Failed to delete node:', error);
      showNotification('Failed to delete node');
    }
  }, [nodes, showNotification, deleteNodeAPI]);

  // Handle clear all nodes
  const handleClearAllNodes = useCallback(async () => {
    if (!currentWorkspace) {
      showNotification('No workspace selected');
      return;
    }

    if (nodes.length === 0) {
      showNotification('No nodes to clear');
      return;
    }

    try {
      showNotification('Clearing all nodes...');
      const result = await clearAllNodes(currentWorkspace.id);
      await refreshMapData();
      
      setSelectedNode(null);
      const successMessage = `Successfully cleared ${result.deleted_nodes} nodes and ${result.deleted_edges} connections`;
      showNotification(successMessage);
    } catch (error) {
      console.error('Clear all nodes error:', error);
      const errorMessage = `Failed to clear nodes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      showNotification(errorMessage);
    }
  }, [currentWorkspace, nodes.length, showNotification, refreshMapData]);

  // Handle re-center view
  const handleRecenterView = useCallback(() => {
    if (nodes.length > 0 && canvasRef.current) {
      const nodePositions = nodes.map(node => ({ x: node.x, y: node.y }));
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
      showNotification('View re-centered on all nodes');
    } else {
      showNotification('No nodes to center on');
    }
  }, [nodes, showNotification]);

  // Handle connector toggle
  const handleConnectorToggle = useCallback(() => {
    connectorManager.toggleConnectMode();
    setConnectorState(connectorManager.getState());
  }, [connectorManager]);

  // Handle node mouse down for connector system
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    // Check if we're in connect mode
    if (connectorState.mode === 'CONNECTING') {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenPosition = {
        x: e.clientX,
        y: e.clientY
      };

      const canvasPosition = {
        x: (e.clientX - rect.left - transform.x) / transform.scale,
        y: (e.clientY - rect.top - transform.y) / transform.scale
      };

      const handled = connectorManager.handleNodeMouseDown(nodeId, canvasPosition);
      if (handled) {
        setConnectorState(connectorManager.getState());
        setConnectorAnchors(connectorManager.getAnchors());
      }
      return;
    }

    // Regular node selection logic
    setSelectedNode(nodeId);
  }, [connectorManager, connectorState.mode, transform]);

  // Handle mouse move for connector system
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (connectorState.mode === 'DRAGGING_CONNECTION') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const position = {
        x: (e.clientX - rect.left - transform.x) / transform.scale,
        y: (e.clientY - rect.top - transform.y) / transform.scale
      };

      connectorManager.handleMouseMove(position);
      setConnectorState(connectorManager.getState());
      setConnectorAnchors(connectorManager.getAnchors());
    }
  }, [connectorManager, connectorState.mode, transform]);

  // Handle mouse up for connector system
  const handleMouseUp = useCallback(async () => {
    if (connectorState.mode === 'DRAGGING_CONNECTION') {
      await connectorManager.handleMouseUp();
      setConnectorState(connectorManager.getState());
      setConnectorAnchors(connectorManager.getAnchors());
    }
  }, [connectorManager, connectorState.mode]);

  // Handle edge click to show connector card
  const handleEdgeClick = useCallback((edge: Edge, position: { x: number; y: number }) => {
    const fromNode = nodes.find(n => n.id === edge.from_node_id);
    const toNode = nodes.find(n => n.id === edge.to_node_id);
    
    if (fromNode && toNode) {
      setConnectorCard({
        edge,
        fromNode,
        toNode,
        position
      });
    }
  }, [nodes]);

  // Handle connector card close
  const handleConnectorCardClose = useCallback(() => {
    setConnectorCard(null);
  }, []);

  // Handle connector card update
  const handleConnectorCardUpdate = useCallback((updatedEdge: Edge) => {
    refreshMapData();
    if (connectorCard) {
      setConnectorCard({
        ...connectorCard,
        edge: updatedEdge
      });
    }
  }, [refreshMapData, connectorCard]);

  // Handle connector card delete
  const handleConnectorCardDelete = useCallback((edgeId: string) => {
    refreshMapData();
    setConnectorCard(null);
  }, [refreshMapData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const handled = connectorManager.handleKeyDown(e);
      if (handled) {
        setConnectorState(connectorManager.getState());
        setConnectorAnchors(connectorManager.getAnchors());
        return;
      }

      if (e.key === 'Escape') {
        setConnectorCard(null);
        setSelectedNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectorManager]);

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

  // Show loading state
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

  // Show error state
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
                    className="p-2 rounded-md transition-colors hover:bg-gray-800/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-start space-x-1.5 flex-1 min-w-0">
                        <User className="w-3 h-3 text-[#6B6B3A] flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="leading-tight">
                            <span className="text-xs font-medium text-[#E5E7EB]">
                              {agent.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-auto p-4 pt-3 border-t border-gray-800/50 glass-pane">
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="flex-1 px-4 py-2 text-sm font-medium text-[#E5E7EB] bg-[#6B6B3A]/20 hover:bg-[#6B6B3A]/30 border border-[#6B6B3A]/30 rounded-lg transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="flex-1 px-4 py-2 text-sm font-medium text-[#E5E7EB] bg-[#6B6B3A]/20 hover:bg-[#6B6B3A]/30 border border-[#6B6B3A]/30 rounded-lg transition-colors"
                  >
                    Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div
          ref={canvasRef}
          className={`flex-1 select-none overflow-hidden relative ${
            connectorState.mode === 'CONNECTING' ? 'cursor-crosshair' :
            connectorState.mode === 'DRAGGING_CONNECTION' ? 'cursor-grabbing' :
            'cursor-grab'
          }`}
          style={{
            height: '100vh',
            paddingTop: '4rem',
            willChange: 'auto',
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            transformStyle: 'preserve-3d',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          tabIndex={0}
          role="application"
          aria-label="Enhanced strategy mapping canvas"
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
                  aria-label="Add new node (N)"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Node</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Add Node (N)</TooltipContent>
            </Tooltip>
            
            {/* Enhanced Connector Button */}
            <ConnectorButton
              mode={connectorState.mode}
              isEnabled={connectorState.isEnabled}
              nodeCount={nodes.length}
              onToggle={handleConnectorToggle}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRecenterView}
                  disabled={nodes.length === 0}
                  className="glass-pane px-4 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Re-center view on all nodes"
                >
                  <Target className="w-4 h-4" />
                  <span>Re-center</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Re-center view on all nodes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={async () => {
                    if (nodes.length === 0) {
                      showNotification('No nodes to clear');
                      return;
                    }
                    
                    const confirmed = window.confirm(`Are you sure you want to clear all ${nodes.length} nodes? This action cannot be undone.`);
                    if (!confirmed) return;
                    
                    await handleClearAllNodes();
                  }}
                  disabled={nodes.length === 0}
                  className="glass-pane px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Clear all nodes from canvas"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All ({nodes.length})</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Clear All Nodes - Cannot be undone!</TooltipContent>
            </Tooltip>

            <div className="flex space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => handleZoom(1)}
                    className="glass-pane px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Zoom In (+)</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => handleZoom(-1)}
                    className="glass-pane px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out (-)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Connect Mode Banner */}
          {connectorState.mode === 'CONNECTING' && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 glass-pane px-4 py-2 text-sm text-[#6B6B3A] border border-[#6B6B3A]/30 rounded-lg z-40">
              Connect mode: drag from a node to another node to link
            </div>
          )}

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

            {/* Enhanced Connector Renderer */}
            <ConnectorRenderer
              nodes={nodes}
              edges={edges}
              anchors={connectorAnchors}
              connectorState={connectorState}
              transform={transform}
              onEdgeClick={handleEdgeClick}
            />

            {/* Enhanced nodes */}
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
                
                return (
                  <SimpleNode
                    key={node.id}
                    node={node}
                    transform={transform}
                    isSelected={isSelected}
                    isDragging={false}
                    agents={agents}
                    onMouseDown={handleNodeMouseDown}
                    onSelect={() => setSelectedNode(node.id)}
                  />
                );
              })}
            </ErrorBoundary>
          </div>
        </div>

        {/* Right Sidebar - Sparring Session */}
        <div className="flex-shrink-0 w-80 h-screen glass-pane border-l border-gray-800/50 overflow-hidden" style={{ paddingTop: '4rem' }}>
          <div className="p-3 h-full overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
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

        {/* Enhanced Connector Card */}
        {connectorCard && (
          <ConnectorCard
            edge={connectorCard.edge}
            fromNode={connectorCard.fromNode}
            toNode={connectorCard.toNode}
            position={connectorCard.position}
            onClose={handleConnectorCardClose}
            onUpdate={handleConnectorCardUpdate}
            onDelete={handleConnectorCardDelete}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default EnhancedExplorationMap;