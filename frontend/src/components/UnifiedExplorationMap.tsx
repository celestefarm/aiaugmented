import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, User, Target, Trash2, ZoomIn, ZoomOut, Link, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMap } from '@/contexts/MapContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAgentChat } from '@/contexts/AgentChatContext';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, clearAllNodes } from '@/lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import CanvasErrorBoundary from './CanvasErrorBoundary';
import SparringSession from './SparringSession';
import CanvasRenderer from './CanvasRenderer';
import { CanvasInteractionManager } from '@/managers/CanvasInteractionManager';
import { Transform, Point, canvasStateManager } from '@/stores/canvasStore';

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
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 });
  const [hasInitializedView, setHasInitializedView] = useState(false);
  
  // UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Performance refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const interactionManagerRef = useRef<CanvasInteractionManager | null>(null);
  
  // Constants
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 120;
  const GRID_SIZE = 20;

  // Show notification helper
  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Initialize interaction manager
  useEffect(() => {
    if (!interactionManagerRef.current) {
      interactionManagerRef.current = new CanvasInteractionManager({
        onNodePositionUpdate: async (nodeId: string, position: Point) => {
          try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;

            const updateData: NodeUpdateRequest = {
              title: node.title,
              description: node.description,
              type: node.type,
              x: position.x,
              y: position.y,
              confidence: node.confidence,
              feasibility: node.feasibility,
              source_agent: node.source_agent
            };

            await updateNodeAPI(nodeId, updateData);
            showNotification(`Moved ${node.title}`);
          } catch (error) {
            console.error('Failed to update node position:', error);
            showNotification('Failed to update node position');
          }
        },
        onTransformUpdate: (newTransform: Transform) => {
          setTransform(newTransform);
        },
        onNodeSelect: (nodeId: string) => {
          setSelectedNode(nodeId);
        },
        onConnectionCreate: async (fromNodeId: string, toNodeId: string) => {
          try {
            const result = await createConnection(fromNodeId, toNodeId);
            if (result) {
              showNotification('Connection created successfully');
            }
          } catch (error) {
            console.error('Failed to create connection:', error);
            showNotification('Failed to create connection');
          }
        }
      });
    }

    return () => {
      if (interactionManagerRef.current) {
        interactionManagerRef.current.dispose();
        interactionManagerRef.current = null;
      }
    };
  }, [nodes, updateNodeAPI, showNotification]);

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
    if (interactionManagerRef.current) {
      interactionManagerRef.current.handleZoom(
        delta,
        centerX || viewport.width / 2,
        centerY || viewport.height / 2
      );
    }
  }, [viewport]);

  // Handle wheel events
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (interactionManagerRef.current) {
      interactionManagerRef.current.handleWheel(e.nativeEvent);
    }
  }, []);

  // Handle canvas mouse events
  const handleCanvasMouseDown = useCallback((event: MouseEvent) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.handleMouseDown(event);
    }
  }, []);

  const handleNodeMouseDown = useCallback((nodeId: string, event: MouseEvent) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.handleMouseDown(event, nodeId);
    }
  }, []);

  // Handle canvas mouse move for connection point highlighting
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent) => {
    if (interactionManagerRef.current) {
      // Let the interaction manager handle all mouse move logic
      // This avoids duplicate coordinate transformations and state management
      const nativeEvent = new MouseEvent('mousemove', {
        clientX: event.clientX,
        clientY: event.clientY,
        bubbles: true,
        cancelable: true
      });
      
      // The interaction manager will handle hover states internally
      // This is more efficient and avoids race conditions
    }
  }, []);

  // Handle middle mouse button for panning
  const handleCanvasMouseUp = useCallback((event: MouseEvent) => {
    // Prevent context menu on middle mouse button
    if (event.button === 1) {
      event.preventDefault();
    }
  }, []);

  // Handle context menu to prevent it on middle mouse
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  }, []);

  // Start connecting mode
  const startConnecting = useCallback(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.startConnecting();
      showNotification('Connection mode activated - Click a node and drag to connect');
    }
  }, [showNotification]);

  // Cancel interaction
  const cancelInteraction = useCallback(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.cancelConnection();
      showNotification('Operation cancelled');
    }
  }, [showNotification]);

  // Get current interaction mode
  const currentMode = interactionManagerRef.current?.getCurrentMode() || 'IDLE';

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

  // Update viewport when container size changes
  useEffect(() => {
    const updateViewport = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setViewport({ width: rect.width, height: rect.height });
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
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

        {/* Canvas Area */}
        <div
          ref={canvasContainerRef}
          className="flex-1 select-none overflow-hidden relative canvas-container"
          style={{
            boxShadow: 'inset 0 0 40px -10px rgba(107, 107, 58, 0.3)',
            height: '100vh',
            paddingTop: '4rem',
          }}
          onWheel={handleWheel}
          onMouseMove={handleCanvasMouseMove}
          onContextMenu={handleContextMenu}
          tabIndex={0}
          role="application"
          aria-label="Strategy mapping canvas"
        >
          {/* Top Toolbar */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex space-x-2 z-40">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    const centerX = (-transform.x + viewport.width / 2) / transform.scale;
                    const centerY = (-transform.y + viewport.height / 2) / transform.scale;
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
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (currentMode === 'CONNECTING') {
                      cancelInteraction();
                    } else {
                      startConnecting();
                    }
                  }}
                  className={`glass-pane px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
                    currentMode === 'CONNECTING'
                      ? 'text-[#6B6B3A] bg-[#6B6B3A]/20'
                      : 'text-[#E5E7EB] hover:text-[#6B6B3A]'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  <span>{currentMode === 'CONNECTING' ? 'Cancel' : 'Connect'}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Connect Nodes</TooltipContent>
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

          {/* Connection creation hint */}
          {currentMode === 'CONNECTING' && (
            <div className="absolute top-36 left-1/2 transform -translate-x-1/2 glass-pane px-4 py-2 text-sm text-[#6B6B3A] z-40">
              Click a node and drag to another node to create connection
            </div>
          )}

          {/* Canvas Renderer with Enhanced Error Boundary */}
          <CanvasErrorBoundary
            onError={(error, errorInfo) => {
              console.error('Canvas rendering error:', error);
              // Could send to error reporting service here
            }}
          >
            <CanvasRenderer
              nodes={nodes}
              edges={edges}
              transform={transform}
              viewport={viewport}
              onCanvasMouseDown={handleCanvasMouseDown}
              onNodeMouseDown={handleNodeMouseDown}
              className="absolute inset-0"
            />
          </CanvasErrorBoundary>
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
      </div>
    </TooltipProvider>
  );
};

export default UnifiedExplorationMap;