import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Info, Mic, Paperclip, Plus, Upload, ChevronLeft, ChevronRight, X, Clock, User, Target, Users, Briefcase, Trash2, Undo, Redo, Save, ZoomIn, ZoomOut, Check, Link, MoreVertical, RefreshCw, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMap } from '@/contexts/MapContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAgentChat, Agent, ChatMessage } from '@/contexts/AgentChatContext';
import { useInteraction } from '@/contexts/InteractionContext';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, RelationshipSuggestion, summarizeConversation, clearAllNodes } from '@/lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import SparringSession from './SparringSession';
import { CognitiveAnalysis } from './CognitiveAnalysis';
import { generateDisplayTitle, generateSmartDisplayTitle } from '@/utils/nodeUtils';
import { useTooltip } from '@/hooks/useTooltip';
import { EnhancedNodeTooltip } from './EnhancedNodeTooltip';
import { NodeWithTooltip } from './NodeWithTooltip';
import { FullContextModal } from './FullContextModal';
import { ProcessedContent } from '@/utils/tooltipContentUtils';
import SVGEdges from './SVGEdges';

interface CustomAgentData {
  name: string;
  mission: string;
  jobDescription: string;
  goals: string;
  expertise: string;
}

interface MapHistory {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}


// New SimpleNode component that uses InteractionManager
interface SimpleNodeProps {
  node: Node;
  transform: { x: number; y: number; scale: number };
  isSelected: boolean;
  isDragging: boolean;
  agents: Agent[];
  onMouseDown: (event: React.MouseEvent, nodeId: string, nodeType: 'ai' | 'human') => void;
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
    // CRITICAL FIX: Check if this is a tooltip or UI interaction
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
    
    // CRITICAL FIX: Prevent default but allow event to bubble to canvas
    e.preventDefault();
    
    onMouseDown(e, node.id, nodeType);
    onSelect();
  }, [node.id, node.title, node.source_agent, onMouseDown, onSelect]);

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
        // CRITICAL FIX: Use consistent coordinate calculation
        left: `${node.x * transform.scale + transform.x}px`,
        top: `${node.y * transform.scale + transform.y}px`,
        zIndex: isDragging ? 1000 : 20,
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        pointerEvents: 'auto',
        userSelect: 'none',
        position: 'absolute',
        // CRITICAL FIX: Prevent React from overriding drag positions
        willChange: isDragging ? 'transform' : 'auto'
      }}
      onMouseDown={handleMouseDown}
      // CRITICAL FIX: Prevent context menu during drag
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

const ExplorationMap: React.FC = () => {
  
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
    autoArrangeNodes,
    refreshMapData
  } = useMap();
  
  const { currentWorkspace } = useWorkspace();
  
  // Use AgentChatContext for agents and messages
  const {
    agents,
    activeAgents,
    isLoadingAgents,
    agentError,
    activateAgent,
    deactivateAgent,
    addMessageToMap,
    loadMessages
  } = useAgentChat();
  
  // Use enhanced InteractionContext with new InteractionManager
  const {
    interactionState,
    interactionManager,
    handleCanvasMouseDown,
    handleNodeMouseDown,
    handleGlobalMouseMove,
    handleGlobalMouseUp,
    updateTransform,
    startConnecting,
    cancelInteraction,
    setCreationMode,
    onNodeAddedFromChat,
    // Legacy methods for backward compatibility
    transitionToPanning,
    transitionToNodeDragging,
    transitionToConnecting,
    transitionToIdle,
    updatePanStart,
    updateDraggedNodePosition,
    registerNodePositionUpdateCallback,
    registerTransformUpdateCallback,
    registerNodeSelectCallback,
    registerConnectionCreateCallback
  } = useInteraction();
  
  // Canvas transform state (separate from interaction state)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Note: draggedNodePosition state removed - now using interactionState directly for better performance
  
  // UI state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320); // Default width in pixels
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [showCustomAgentDialog, setShowCustomAgentDialog] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showAgentDetailsModal, setShowAgentDetailsModal] = useState<string | null>(null);
  const [customAgentData, setCustomAgentData] = useState<CustomAgentData>({
    name: '',
    mission: '',
    jobDescription: '',
    goals: '',
    expertise: ''
  });
  
  // Enhanced functionality state
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectionPreview, setConnectionPreview] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<MapHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; nodeId?: string } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [summarizingNodes, setSummarizingNodes] = useState<Set<string>>(new Set());
  
  // Track which messages have been added to map
  const [addedToMap, setAddedToMap] = useState<Set<string>>(new Set());
  
  // Smart title management
  const [smartTitles, setSmartTitles] = useState<Record<string, { title: string; isLoading: boolean }>>({});
  
  // Modal state management - decoupled from tooltip
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
  const nextNodeId = useRef(1);
  const nextEdgeId = useRef(1);
  
  // Constants - FIXED
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2;
  const GRID_SIZE = 20;
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 120;


  // Show notification helper
  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // MEMORY LEAK FIX: Smart title processing with proper cleanup and request cancellation
  useEffect(() => {
    // Create AbortController for request cancellation
    const abortController = new AbortController();
    const { signal } = abortController;
    
    // Track active requests to prevent duplicates
    const activeRequests = new Set<string>();
    
    const processSmartTitles = async () => {
      // Early return if component is unmounting
      if (signal.aborted) {
        return;
      }
      
      // MEMORY LEAK FIX: Process only nodes that need processing
      const nodesToProcess = nodes.filter(node => {
        const contexts: Array<'card' | 'tooltip' | 'list'> = ['card', 'tooltip', 'list'];
        return contexts.some(context => {
          const key = `${node.id}-${context}`;
          const cached = smartTitles[key];
          const maxLength = { card: 25, tooltip: 40, list: 30 }[context];
          
          // Skip if already cached, processing, or title is short enough
          return !cached &&
                 !activeRequests.has(key) &&
                 node.title.length > maxLength &&
                 (!node.summarized_titles?.[context] || node.summarized_titles[context].length > maxLength);
        });
      });
      
      if (nodesToProcess.length === 0) {
        return;
      }
      
      // MEMORY LEAK FIX: Process with controlled concurrency
      const CONCURRENT_REQUESTS = 3; // Limit concurrent API calls
      const processNode = async (node: Node) => {
        if (signal.aborted) return;
        
        const contexts: Array<'card' | 'tooltip' | 'list'> = ['card', 'tooltip', 'list'];
        
        for (const context of contexts) {
          if (signal.aborted) return;
          
          const key = `${node.id}-${context}`;
          const cached = smartTitles[key];
          const maxLength = { card: 25, tooltip: 40, list: 30 }[context];
          
          // Skip if already processed or processing
          if (cached || activeRequests.has(key)) continue;
          
          // Skip if title is short enough
          if (node.title.length <= maxLength) {
            setSmartTitles(prev => ({
              ...prev,
              [key]: { title: node.title, isLoading: false }
            }));
            continue;
          }
          
          // Check for cached summarized title from backend
          if (node.summarized_titles?.[context]) {
            const cachedTitle = node.summarized_titles[context];
            if (cachedTitle.length <= maxLength) {
              setSmartTitles(prev => ({
                ...prev,
                [key]: { title: cachedTitle, isLoading: false }
              }));
              continue;
            }
          }
          
          // Mark as processing to prevent duplicates
          activeRequests.add(key);
          
          const fallbackTitle = generateDisplayTitle(node.title, node.description, context);
          
          // Set loading state
          if (!signal.aborted) {
            setSmartTitles(prev => ({
              ...prev,
              [key]: { title: fallbackTitle, isLoading: true }
            }));
          }
          
          try {
            // MEMORY LEAK FIX: Pass abort signal to API call
            const smartTitle = await generateSmartDisplayTitle(node, context, signal);
            
            if (!signal.aborted) {
              setSmartTitles(prev => ({
                ...prev,
                [key]: { title: smartTitle, isLoading: false }
              }));
            }
          } catch (error) {
            // Only log error if not cancelled
            if (!signal.aborted && !(error instanceof DOMException && error.name === 'AbortError')) {
              console.warn(`Failed to get smart title for node ${node.id}:`, error);
              setSmartTitles(prev => ({
                ...prev,
                [key]: { title: fallbackTitle, isLoading: false }
              }));
            }
          } finally {
            // Always clean up active request tracking
            activeRequests.delete(key);
          }
        }
      };
      
      // MEMORY LEAK FIX: Process nodes with controlled concurrency
      const promises: Promise<void>[] = [];
      for (let i = 0; i < nodesToProcess.length; i += CONCURRENT_REQUESTS) {
        const batch = nodesToProcess.slice(i, i + CONCURRENT_REQUESTS);
        promises.push(...batch.map(processNode));
        
        // Wait for current batch before starting next
        if (promises.length >= CONCURRENT_REQUESTS) {
          await Promise.allSettled(promises.splice(0, CONCURRENT_REQUESTS));
          
          // Small delay to prevent API overload
          if (!signal.aborted && i + CONCURRENT_REQUESTS < nodesToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      // Process remaining promises
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
      
      if (!signal.aborted) {
        }
    };
    
    // MEMORY LEAK FIX: Debounce with proper cleanup
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (nodes.length > 0) {
      timeoutId = setTimeout(() => {
        if (!signal.aborted) {
          processSmartTitles().catch(error => {
            if (!signal.aborted) {
              console.error('Smart title processing failed:', error);
            }
          });
        }
      }, 300);
    }
    
    // MEMORY LEAK FIX: Comprehensive cleanup function
    return () => {
      // Cancel all pending requests
      abortController.abort();
      
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Clear active requests tracking
      activeRequests.clear();
    };
  }, [nodes.length, smartTitles]); // MEMORY LEAK FIX: Proper dependencies

  // Helper function to get smart title
  const getSmartTitle = useCallback((node: Node, context: 'card' | 'tooltip' | 'list' = 'card') => {
    const key = `${node.id}-${context}`;
    const cached = smartTitles[key];
    return cached || { title: generateDisplayTitle(node.title, node.description, context), isLoading: false };
  }, [smartTitles]);

  // Coordinate conversion helpers - FIXED
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

  // Save state to history for undo/redo
  const saveToHistory = useCallback(() => {
    const newHistoryEntry: MapHistory = {
      nodes: [...nodes],
      edges: [...edges],
      timestamp: Date.now()
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newHistoryEntry);
    
    // Keep only last 50 history entries for performance
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, history, historyIndex]);

  // Auto-save transform changes to workspace
  useEffect(() => {
    if (!currentWorkspace) return;
    
    const interval = setInterval(() => {
      // Update workspace transform in the background
      // This could be implemented later if needed
      setLastSaved(Date.now());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [currentWorkspace, transform]);

  // Undo functionality - disabled for API-based approach
  const undo = useCallback(() => {
    showNotification('Undo not available with API integration');
  }, [showNotification]);

  // Redo functionality - disabled for API-based approach
  const redo = useCallback(() => {
    showNotification('Redo not available with API integration');
  }, [showNotification]);

  // Create new node with proper positioning - FIXED
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
      
      saveToHistory();
      const newNode = await createNodeAPI(nodeData);
      if (newNode) {
        setSelectedNode(newNode.id);
        setFocusedNode(newNode.id);
        showNotification(`Created node: ${newNode.title}`);
      }
      return newNode;
    } catch (error) {
      console.error('Failed to create node:', error);
      showNotification(`Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, [currentWorkspace, saveToHistory, snapToGrid, showNotification, createNodeAPI]);

  // Delete node and its connections
  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      saveToHistory();
      await deleteNodeAPI(nodeId);
      setSelectedNode(null);
      setFocusedNode(null);
      showNotification(`Deleted node: ${node.title}`);
      
      // CRITICAL FIX: Refresh chat messages to update "Added to map" labels
      // The backend automatically resets the message's added_to_map status when a node is deleted
      // We need to refresh the frontend chat state to reflect this change
      try {
        await loadMessages();
        
      } catch (refreshError) {
        console.warn('Failed to refresh chat messages after node deletion:', refreshError);
        // Don't fail the whole operation if message refresh fails
      }
    } catch (error) {
      console.error('Failed to delete node:', error);
      showNotification('Failed to delete node');
    }
  }, [nodes, saveToHistory, showNotification, deleteNodeAPI, loadMessages]);

  // Delete edge
  const deleteEdge = useCallback(async (edgeId: string) => {
    try {
      const edge = edges.find(e => e.id === edgeId);
      if (!edge) return;
      
      saveToHistory();
      await deleteEdgeAPI(edgeId);
      showNotification('Deleted connection');
    } catch (error) {
      console.error('Failed to delete edge:', error);
      showNotification('Failed to delete connection');
    }
  }, [edges, saveToHistory, showNotification, deleteEdgeAPI]);

  // Create connection between nodes
  const createConnection = useCallback(async (fromId: string, toId: string, type: Edge['type'] = 'support') => {
    try {
      // Prevent self-connections
      if (fromId === toId) {
        showNotification('Cannot connect node to itself');
        return null;
      }

      // Prevent duplicate connections
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
      
      saveToHistory();
      
      const newEdge = await createEdgeAPI(edgeData);
      
      if (newEdge) {
        showNotification(`Connected ${fromNode.title} to ${toNode.title}`);
      } else {
        }
      
      return newEdge;
    } catch (error) {
      console.error('🔗 [CONNECTION-DEBUG] ❌ createConnection failed with error:', error);
      showNotification('Failed to create connection');
      return null;
    }
  }, [nodes, edges, saveToHistory, showNotification, createEdgeAPI]);

  // Add message to chat - now handled by context
  const addChatMessage = useCallback(async (content: string, author: string, type: 'human' | 'ai') => {
    // This is now handled by the sendMessage function from context
    // We'll keep this for compatibility but it won't be used directly
    return null;
  }, []);

  // Add idea to map from chat with smart positioning
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

  // Zoom functionality - FIXED
  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    const zoomFactor = delta > 0 ? 1.2 : 0.8;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, transform.scale * zoomFactor));
    
    if (newScale !== transform.scale && canvasRef.current) {
      let newX = transform.x;
      let newY = transform.y;
      
      // Zoom towards cursor position if provided
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

  // Legacy mouse handlers - now simplified since InteractionManager handles most logic
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // InteractionManager now handles all mouse movement logic
    // No legacy connection preview needed
  }, []);

  // Simplified mouse up handler
  const handleMouseUp = useCallback(async (e: React.MouseEvent) => {
    // Most mouse up handling is now done by InteractionManager
    // This is kept for legacy compatibility
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

  // Update InteractionManager with current transform
  useEffect(() => {
    updateTransform(transform);
  }, [transform, updateTransform]);

  // Register callbacks with InteractionManager
  useEffect(() => {
    // Register node position update callback (final position persistence)
    registerNodePositionUpdateCallback(async (nodeId: string, position: { x: number; y: number }) => {
      try {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) {
          console.error('Node not found for position update:', nodeId);
          return;
        }

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
        
        // Note: draggedNodePosition state removed - no cleanup needed
      } catch (error) {
        console.error('Failed to update node position:', error);
        showNotification('Failed to update node position');
      }
    });

    // Register transform update callback (for canvas panning)
    registerTransformUpdateCallback((newTransform: { x: number; y: number; scale: number }) => {
      setTransform(newTransform);
    });

    // Register node select callback
    registerNodeSelectCallback((nodeId: string) => {
      setSelectedNode(nodeId);
      setFocusedNode(nodeId);
    });

    // Register connection create callback
    registerConnectionCreateCallback(async (fromNodeId: string, toNodeId: string) => {
      try {
        const result = await createConnection(fromNodeId, toNodeId);
        } catch (error) {
        console.error('🔗 [CONNECTION-DEBUG] createConnection failed:', error);
        throw error;
      }
    });
  }, [
    registerNodePositionUpdateCallback,
    registerTransformUpdateCallback,
    registerNodeSelectCallback,
    registerConnectionCreateCallback,
    nodes,
    updateNodeAPI,
    showNotification,
    createConnection
  ]);

  // Note: Real-time drag position management removed - now handled directly in SVGEdges

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 's':
            e.preventDefault();
            // Save is now handled automatically via API
            showNotification('Map auto-saved via API');
            break;
          case '=':
          case '+':
            e.preventDefault();
            handleZoom(1);
            break;
          case '-':
            e.preventDefault();
            handleZoom(-1);
            break;
        }
      } else {
        switch (e.key) {
          case 'n':
          case 'N':
            e.preventDefault();
            // Create node at center of current view
            const centerX = (-transform.x + (canvasRef.current?.clientWidth || 800) / 2) / transform.scale;
            const centerY = (-transform.y + (canvasRef.current?.clientHeight || 600) / 2) / transform.scale;
            createNode(centerX, centerY);
            break;
          case 'c':
          case 'C':
            e.preventDefault();
            if (interactionState.state === 'CONNECTING') {
              cancelInteraction();
              showNotification('Cancelled connection mode');
            } else if (interactionState.state === 'IDLE') {
              startConnecting();
              showNotification('Connection mode activated - Click a node and drag to connect');
            }
            break;
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            if (selectedNode) {
              deleteNode(selectedNode);
            }
            break;
          case 'Escape':
            e.preventDefault();
            // Cancel any active interaction and return to IDLE
            cancelInteraction();
            setSelectedNode(null);
            setShowContextMenu(null);
            showNotification('Operation cancelled');
            break;
          case 'Tab':
            e.preventDefault();
            // Cycle through nodes for keyboard navigation
            const nodeIds = nodes.map(n => n.id);
            if (nodeIds.length > 0) {
              const currentIndex = focusedNode ? nodeIds.indexOf(focusedNode) : -1;
              const nextIndex = (currentIndex + 1) % nodeIds.length;
              setFocusedNode(nodeIds[nextIndex]);
              setSelectedNode(nodeIds[nextIndex]);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedNode, deleteNode, nodes, edges, transform, handleZoom, interactionState, focusedNode, createNode, showNotification, transitionToIdle, transitionToConnecting]);

  // Legacy event dispatcher - now simplified since InteractionManager handles most logic
  const handleMouseDown = useCallback((e: React.MouseEvent, target: 'canvas' | 'node', nodeId?: string) => {
    // This is kept for any remaining legacy calls, but most logic is now in InteractionManager
    if (target === 'canvas') {
      handleCanvasMouseDown(e);
    } else if (target === 'node' && nodeId) {
      // Determine node type from nodes array
      const node = nodes.find(n => n.id === nodeId);
      const nodeType = node?.type === 'ai' ? 'ai' : 'human';
      handleNodeMouseDown(e, nodeId, nodeType);
    }
  }, [handleCanvasMouseDown, handleNodeMouseDown, nodes]);

  // Legacy connection target handler - now handled by InteractionManager
  const handleConnectionTarget = useCallback((nodeId: string) => {
    // This function is kept for compatibility but InteractionManager now handles all connection logic
    }, []);

  // Remove the old handleCanvasMouseDown since it's now provided by InteractionContext
  // The InteractionContext handleCanvasMouseDown will be used directly

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    // Delegate to centralized handler
    handleMouseMove(e);
  }, [handleMouseMove]);

  const handleCanvasMouseUp = useCallback(async (e: React.MouseEvent) => {
    // Delegate to centralized handler
    handleMouseUp(e);
  }, [handleMouseUp]);


  const handleCanvasRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(-e.deltaY, e.clientX, e.clientY);
  }, [handleZoom]);

  // Remove the old handleNodeMouseDown since it's now provided by InteractionContext
  // The InteractionContext handleNodeMouseDown will be used directly



  const handleNodeRightClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);

  const handleNodeKeyDown = useCallback((e: React.KeyboardEvent, nodeId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedNode(nodeId);
      setFocusedNode(nodeId);
    }
  }, []);

  // Check if node is a valid connection target
  const isValidConnectionTarget = useCallback((nodeId: string) => {
    if (interactionState.state !== 'CONNECTING') return false;
    
    const { connectionStart } = interactionState.data;
    if (!connectionStart) return false;
    if (nodeId === connectionStart) return false;
    
    // Check if connection already exists
    const existingConnection = edges.find(e =>
      (e.from_node_id === connectionStart && e.to_node_id === nodeId) ||
      (e.from_node_id === nodeId && e.to_node_id === connectionStart)
    );
    
    return !existingConnection;
  }, [interactionState, edges]);

  // Agent management functions
  const toggleAgent = async (agentId: string) => {
    const agent = agents.find(a => a.agent_id === agentId);
    
    if (!agent) return;
    
    try {
      const isActive = activeAgents.includes(agentId);
      if (isActive) {
        await deactivateAgent(agentId);
      } else {
        if (agent.is_custom && !isActive) {
          setShowCustomAgentDialog(true);
          return;
        }
        await activateAgent(agentId);
      }
    } catch (error) {
      console.error('Failed to toggle agent:', error);
      showNotification('Failed to toggle agent');
    }
  };

  const handleCustomAgentSave = async () => {
    try {
      // For now, just activate the agent - custom agent creation would need backend support
      await activateAgent('custom-agent');
      setShowCustomAgentDialog(false);
      setCustomAgentData({
        name: '',
        mission: '',
        jobDescription: '',
        goals: '',
        expertise: ''
      });
    } catch (error) {
      console.error('Failed to save custom agent:', error);
      showNotification('Failed to save custom agent');
    }
  };

  const handleCustomAgentCancel = () => {
    setShowCustomAgentDialog(false);
    setCustomAgentData({
      name: '',
      mission: '',
      jobDescription: '',
      goals: '',
      expertise: ''
    });
  };

  // Cognitive analysis handlers
  const handleRelationshipSuggestion = useCallback(async (suggestion: RelationshipSuggestion) => {
    try {
      // Create the suggested connection
      const connection = await createConnection(
        suggestion.from_node_id,
        suggestion.to_node_id,
        suggestion.relationship_type
      );
      
      if (connection) {
        showNotification(`Created ${suggestion.relationship_type} connection (${Math.round(suggestion.strength * 100)}% confidence)`);
      }
    } catch (error) {
      console.error('Failed to create suggested connection:', error);
      showNotification('Failed to create suggested connection');
    }
  }, [createConnection, showNotification]);

  const handleConnectionsCreated = useCallback((count: number) => {
    showNotification(`Auto-connected ${count} node${count !== 1 ? 's' : ''} based on AI analysis`);
  }, [showNotification]);

  // Handle manual conversation summarization
  const handleSummarizeConversation = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      showNotification('Node not found');
      return;
    }

    try {
      // Add node to summarizing set to show loading state
      setSummarizingNodes(prev => new Set([...prev, nodeId]));
      showNotification('Summarizing conversation...');

      // Call the API to summarize the conversation
      const updatedNode = await summarizeConversation(nodeId, {
        conversation_text: node.description
      });

      // Trigger a full refresh of the map data to get the updated node
      await refreshMapData();
      
      showNotification('Conversation summarized successfully');
    } catch (error) {
      console.error('Failed to summarize conversation:', error);
      showNotification(`Failed to summarize conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Remove node from summarizing set
      setSummarizingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    }
  }, [nodes, showNotification, refreshMapData]);

  // Handle clearing all nodes from the canvas
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
      
      // Call the API function correctly
      const result = await clearAllNodes(currentWorkspace.id);
      
      // Refresh the map data to reflect the changes
      await refreshMapData();
      
      // Clear local state
      setSelectedNode(null);
      setFocusedNode(null);
      setConnectionPreview(null);
      
      const successMessage = `Successfully cleared ${result.deleted_nodes} nodes and ${result.deleted_edges} connections`;
      showNotification(successMessage);
    } catch (error) {
      console.error('=== CLEAR ALL NODES ERROR ===');
      console.error('Error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      const errorMessage = `Failed to clear nodes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      showNotification(errorMessage);
    }
  }, [currentWorkspace, nodes.length, showNotification, refreshMapData]);

// Handle modal open - completely independent of tooltip lifecycle
const handleModalOpen = useCallback((node: Node, edges: Edge[], processedContent: ProcessedContent) => {
  setModalState({
    isOpen: true,
    node,
    edges,
    processedContent
  });
}, []);

// Handle modal close - simple state reset
const handleModalClose = useCallback(() => {
  setModalState({
    isOpen: false,
    node: null,
    edges: [],
    processedContent: null
  });
}, []);

  // Navigation functions - removed since we now have proper workspace management

  // Utility functions
  const toggleLeftSidebar = () => setLeftSidebarCollapsed(!leftSidebarCollapsed);
  const toggleAgentExpansion = (agentId: string) => setExpandedAgent(expandedAgent === agentId ? null : agentId);
  const openAgentDetailsModal = (agentId: string) => setShowAgentDetailsModal(agentId);
  const closeAgentDetailsModal = () => setShowAgentDetailsModal(null);

  const getEdgeStyle = (type: string, strength?: number) => {
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
  };

  // Helper function to determine if a node was created by a human or AI agent
  const getNodeCreator = useCallback((node: Node): 'human' | 'ai' => {
    // If the node has a source_agent field, it was created by an AI agent
    if (node.source_agent && node.source_agent.trim() !== '') {
      return 'ai';
    }
    // Otherwise, it was created by a human user
    return 'human';
  }, []);

  const getNodeStyle = (node: Node, isSelected: boolean = false, isFocused: boolean = false, isValidTarget: boolean = false) => {
    const baseStyle = 'glass-pane p-4 w-60 cursor-grab active:cursor-grabbing hover:scale-105 transition-all duration-200 group pointer-events-auto select-none';
    let additionalStyles = '';
    
    if (isSelected) {
      additionalStyles += ' ring-2 ring-[#6B6B3A] ring-opacity-70 shadow-lg shadow-[#6B6B3A]/20';
    }
    
    if (isFocused) {
      additionalStyles += ' ring-2 ring-blue-400 ring-opacity-50';
    }
    
    if (isValidTarget) {
      additionalStyles += ' ring-2 ring-green-400 ring-opacity-70 shadow-lg shadow-green-400/20 animate-pulse';
    }
    
    // Determine creator-based styling
    const creator = getNodeCreator(node);
    let creatorStyle = '';
    
    if (creator === 'human') {
      creatorStyle = 'node-human-created';
    } else {
      creatorStyle = 'node-ai-created';
    }
    
    // Apply creator-based styling with fallback to type-based styling
    switch (node.type) {
      case 'human':
        return `${baseStyle} pulse-glow border-[#6B6B3A]/30 bg-gradient-to-br from-[#6B6B3A]/5 to-[#6B6B3A]/10 ${creatorStyle} ${additionalStyles}`;
      case 'ai':
        return `${baseStyle} bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-400/40 shadow-lg shadow-blue-500/10 ${creatorStyle} ${additionalStyles}`;
      case 'risk':
        return `${baseStyle} bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-400/40 shadow-lg shadow-red-500/10 ${creatorStyle} ${additionalStyles}`;
      case 'dependency':
        return `${baseStyle} bg-gradient-to-br from-gray-500/10 to-slate-500/10 border-gray-400/40 shadow-lg shadow-gray-500/10 ${creatorStyle} ${additionalStyles}`;
      case 'decision':
        return `${baseStyle} bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-400/40 shadow-lg shadow-yellow-500/10 ${creatorStyle} ${additionalStyles}`;
      default:
        return `${baseStyle} bg-gradient-to-br from-gray-400/5 to-gray-500/10 border-gray-400/30 ${creatorStyle} ${additionalStyles}`;
    }
  };

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

  // Format conversation text into bullet points for better readability
  const formatConversationText = (text: string): string[] => {
    if (!text) return [];
    
    // Split by sentences and clean up
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10) // Filter out very short fragments
      .slice(0, 5); // Limit to 5 bullet points for readability
    
    // If we don't have good sentences, try splitting by common separators
    if (sentences.length < 2) {
      const alternatives = text
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(s => s.length > 15)
        .slice(0, 4);
      
      if (alternatives.length > 1) {
        return alternatives;
      }
    }
    
    return sentences.length > 0 ? sentences : [text.substring(0, 200) + (text.length > 200 ? '...' : '')];
  };

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
          
          {/* Show different actions based on error type */}
          {mapError.includes('Not authenticated') ? (
            <div className="space-y-3">
              <p className="text-yellow-400 text-sm">Please log in to access your workspace</p>
              <button
                onClick={() => window.location.href = '/auth'}
                className="px-4 py-2 bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black font-medium rounded-lg transition-colors"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black font-medium rounded-lg transition-colors mr-2"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Retry
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          )}
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
          className={`flex-shrink-0 h-screen glass-pane border-r border-gray-800/50 transition-all duration-300 ease-in-out ${
            leftSidebarCollapsed ? 'w-12' : 'w-64'
          }`}
          style={{ zIndex: 30, paddingTop: '4rem' }}
        >
          {leftSidebarCollapsed ? (
            <div className="p-2 h-full flex flex-col items-center">
              <button
                onClick={toggleLeftSidebar}
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
                  onClick={toggleLeftSidebar}
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
                        ? agent.is_custom
                          ? 'bg-blue-500/20 border border-blue-400/30'
                          : 'bg-[#6B6B3A]/20 border border-[#6B6B3A]/30'
                        : 'hover:bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2 flex-1">
                        <span className={`text-xs font-medium leading-tight ${
                          activeAgents.includes(agent.agent_id)
                            ? agent.is_custom
                              ? 'text-blue-300'
                              : 'glow-olive-text'
                            : 'text-[#E5E7EB]'
                        }`}>
                          {agent.name}
                        </span>
                        
                        <button
                          onClick={() => openAgentDetailsModal(agent.agent_id)}
                          className="text-gray-400 hover:text-[#6B6B3A] transition-colors"
                          aria-label={`View details for ${agent.name}`}
                        >
                          <User className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeAgents.includes(agent.agent_id)}
                          onChange={() => toggleAgent(agent.agent_id)}
                          className="sr-only peer"
                          aria-label={`Toggle ${agent.name}`}
                        />
                        <div className={`w-8 h-4 rounded-full peer-focus:outline-none transition-colors after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full ${
                          activeAgents.includes(agent.agent_id)
                            ? agent.is_custom
                              ? 'bg-blue-500'
                              : 'bg-[#6B6B3A]'
                            : 'bg-gray-600'
                        }`}></div>
                      </label>
                    </div>
                    
                    {activeAgents.includes(agent.agent_id) && (
                      <div className="space-y-0.5 text-[10px] leading-tight">
                        <div>
                          <span className={`font-medium ${
                            agent.is_custom ? 'text-blue-300' : 'text-[#E5E7EB]'
                          }`}>AI:</span>
                          <span className="text-gray-400 ml-1">{agent.ai_role}</span>
                        </div>
                        <div>
                          <span className={`font-medium ${
                            agent.is_custom ? 'text-blue-300' : 'text-[#E5E7EB]'
                          }`}>Human:</span>
                          <span className="text-gray-400 ml-1">{agent.human_role}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>


              {/* Navigation removed - now handled by Header component */}

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

        {/* Map Area - ULTRA-SMOOTH RESPONSIVE CANVAS */}
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
            // SMOOTHNESS ENHANCEMENT: Optimize for smooth animations
            willChange: interactionState.state === 'PANNING' ? 'transform' : 'auto',
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            transformStyle: 'preserve-3d',
          }}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            
            // Priority 1: Check if this is a node element - let node events handle themselves
            const isNodeElement = target.closest('[id^="node-"]') || target.id.startsWith('node-');
            if (isNodeElement) {
              return; // Let node events bubble up naturally
            }
            
            // Priority 2: Check if this is a UI element (buttons, inputs, etc.)
            const isUIElement = target.closest('button') ||
                               target.closest('input') ||
                               target.closest('textarea') ||
                               target.closest('[role="button"]') ||
                               target.closest('.tooltip') ||
                               target.closest('[data-tooltip]');
            if (isUIElement) {
              return;
            }
            
            // Priority 3: Check if click is in toolbar area (top 120px of canvas)
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              const relativeY = e.clientY - rect.top;
              if (relativeY < 120) {
                return;
              }
            }
            
            // CANVAS DRAG FIX: Handle canvas panning for ANY click in the canvas area
            // This is the key fix - don't restrict to only direct canvas clicks
            // Call the canvas mouse down handler to enable panning
            handleCanvasMouseDown(e);
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onContextMenu={handleCanvasRightClick}
          onWheel={handleWheel}
          tabIndex={0}
          role="application"
          aria-label="Strategy mapping canvas"
        >
          {/* Debug Info - Node Count Display */}
          <div className="absolute top-4 right-4 glass-pane px-4 py-2 text-sm text-[#E5E7EB] z-50">
            <div className="text-xs">
              <div>Nodes: {nodes.length}</div>
              <div>Edges: {edges.length}</div>
              <div>Loading: {mapLoading ? 'Yes' : 'No'}</div>
              {mapError && <div className="text-red-400">Error: {mapError}</div>}
            </div>
          </div>

          {/* Top Toolbar */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex space-x-2 z-40">

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
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (interactionState.state === 'CONNECTING') {
                      cancelInteraction();
                      showNotification('Cancelled connection mode');
                    } else if (interactionState.state === 'IDLE') {
                      startConnecting();
                      showNotification('Connection mode activated - Click a node and drag to connect');
                    }
                  }}
                  className={`glass-pane px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
                    interactionState.state === 'CONNECTING'
                      ? 'text-[#6B6B3A] bg-[#6B6B3A]/20 border-[#6B6B3A]/40'
                      : 'text-[#E5E7EB] hover:text-[#6B6B3A]'
                  }`}
                  aria-label="Toggle connection mode (C)"
                >
                  <Link className="w-4 h-4" />
                  <span>{interactionState.state === 'CONNECTING' ? 'Cancel Connection' : 'Connect Nodes'}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Connect Nodes (C) - Click node and drag to connect</TooltipContent>
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
                    onClick={undo}
                    disabled={true}
                    className="glass-pane px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Undo not available with API"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={redo}
                    disabled={true}
                    className="glass-pane px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Redo not available with API"
                  >
                    <Redo className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>
            </div>

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

            {selectedNode && (
              <div className="flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => deleteNode(selectedNode)}
                      className="glass-pane px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                      aria-label="Delete selected node"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Delete Node (Del)</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Connection creation hint */}
          {interactionState.state === 'CONNECTING' && (
            <div className="absolute top-36 left-1/2 transform -translate-x-1/2 glass-pane px-4 py-2 text-sm text-[#6B6B3A] z-40">
              Click a node and drag to another node to create connection
            </div>
          )}

          {/* Canvas Content Container - ULTRA-SMOOTH */}
          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
              // SMOOTHNESS ENHANCEMENT: Hardware acceleration and smooth transitions
              willChange: interactionState.state === 'PANNING' ? 'transform' : 'auto',
              backfaceVisibility: 'hidden',
              perspective: '1000px',
              transformStyle: 'preserve-3d',
              // Add subtle transition when not actively panning for smooth stop
              transition: interactionState.state === 'PANNING' ? 'none' : 'transform 0.1s cubic-bezier(0.4, 0.0, 0.2, 1)',
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

            {/* SVG Layer for Edges - FINAL FIX: Inside transformed container, no additional transform */}
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
                {/* Memoized SVG Edges Component for real-time updates */}
                <SVGEdges
                  nodes={nodes}
                  edges={edges}
                  getEdgeStyle={getEdgeStyle}
                  onDeleteEdge={deleteEdge}
                  NODE_WIDTH={NODE_WIDTH}
                  NODE_HEIGHT={NODE_HEIGHT}
                  interactionState={interactionState}
                  screenToCanvas={screenToCanvas}
                  transform={transform}
                />

                {/* Connection drag preview line - kept in main component for interaction state access */}
                {interactionState.state === 'DRAGGING_CONNECTION' && interactionState.data.connectionDragContext && (
                  (() => {
                    const dragContext = interactionState.data.connectionDragContext;
                    if (!dragContext.isActive) return null;
                    
                    // FIXED: Check for target node under cursor for snapping
                    let targetNodeCenter = null;
                    const allNodeElements = document.querySelectorAll('[id^="node-"]');
                    for (const nodeEl of allNodeElements) {
                      const rect = nodeEl.getBoundingClientRect();
                      const isHovering = dragContext.currentPosition.x >= rect.left &&
                                       dragContext.currentPosition.x <= rect.right &&
                                       dragContext.currentPosition.y >= rect.top &&
                                       dragContext.currentPosition.y <= rect.bottom;
                      
                      if (isHovering && nodeEl.id !== `node-${dragContext.startNodeId}`) {
                        targetNodeCenter = {
                          x: rect.left + rect.width / 2,
                          y: rect.top + rect.height / 2
                        };
                        break;
                      }
                    }
                    
                    // DIAGNOSTIC: Enhanced coordinate transformation debugging
                    // DIAGNOSTIC: Test different coordinate transformation approaches
                    const approaches = {
                      // Transform-aware approach (CORRECT)
                      transformAware: (() => {
                        const canvasRect = canvasRef.current?.getBoundingClientRect();
                        if (!canvasRect) return null;
                        
                        // Convert screen coordinates to canvas coordinates, then to SVG space
                        const startCanvasX = (dragContext.startPosition.x - canvasRect.left - transform.x) / transform.scale;
                        const startCanvasY = (dragContext.startPosition.y - canvasRect.top - transform.y) / transform.scale;
                        
                        // Use target node center if snapping, otherwise use cursor position
                        const endScreenPos = targetNodeCenter || dragContext.currentPosition;
                        const endCanvasX = (endScreenPos.x - canvasRect.left - transform.x) / transform.scale;
                        const endCanvasY = (endScreenPos.y - canvasRect.top - transform.y) / transform.scale;
                        
                        return {
                          startX: startCanvasX + 2000,
                          startY: startCanvasY + 2000,
                          endX: endCanvasX + 2000,
                          endY: endCanvasY + 2000
                        };
                      })(),
                      // Canvas-relative approach (FALLBACK)
                      canvasRelative: (() => {
                        const canvasRect = canvasRef.current?.getBoundingClientRect();
                        if (!canvasRect) return null;
                        
                        const startCanvasX = dragContext.startPosition.x - canvasRect.left;
                        const startCanvasY = dragContext.startPosition.y - canvasRect.top;
                        
                        const endScreenPos = targetNodeCenter || dragContext.currentPosition;
                        const endCanvasX = endScreenPos.x - canvasRect.left;
                        const endCanvasY = endScreenPos.y - canvasRect.top;
                        
                        return {
                          startX: startCanvasX + 2000,
                          startY: startCanvasY + 2000,
                          endX: endCanvasX + 2000,
                          endY: endCanvasY + 2000
                        };
                      })(),
                      // Current approach (LEGACY)
                      current: {
                        startX: dragContext.startPosition.x + 2000,
                        startY: dragContext.startPosition.y + 2000,
                        endX: (targetNodeCenter || dragContext.currentPosition).x + 2000,
                        endY: (targetNodeCenter || dragContext.currentPosition).y + 2000
                      }
                    };
                    
                    // FIXED: Use the correct coordinate transformation approach
                    // The SVG coordinate system needs canvas coordinates + 2000px offset
                    let startX, startY, endX, endY;
                    
                    if (approaches.transformAware) {
                      // Use transform-aware approach for proper coordinate handling
                      startX = approaches.transformAware.startX;
                      startY = approaches.transformAware.startY;
                      endX = approaches.transformAware.endX;
                      endY = approaches.transformAware.endY;
                      } else if (approaches.canvasRelative) {
                      // Fallback to canvas-relative approach
                      startX = approaches.canvasRelative.startX;
                      startY = approaches.canvasRelative.startY;
                      endX = approaches.canvasRelative.endX;
                      endY = approaches.canvasRelative.endY;
                      } else {
                      // Last resort: use current approach
                      startX = approaches.current.startX;
                      startY = approaches.current.startY;
                      endX = approaches.current.endX;
                      endY = approaches.current.endY;
                      }
                    
                    return (
                      <g key="connection-drag-preview">
                        {/* FIXED: Connection line with proper coordinates and snapping feedback */}
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke={targetNodeCenter ? "rgba(156, 163, 175, 1.0)" : "rgba(156, 163, 175, 0.8)"}
                          strokeWidth={targetNodeCenter ? 3 : 2.5}
                          strokeLinecap="round"
                          className="pointer-events-none"
                          style={{
                            filter: targetNodeCenter
                              ? 'drop-shadow(0 0 6px rgba(156, 163, 175, 0.6))'
                              : 'drop-shadow(0 0 3px rgba(156, 163, 175, 0.4))',
                            transition: 'all 0.1s ease-out'
                          }}
                        />
                        {/* FIXED: Arrow marker with proper coordinates and snapping feedback */}
                        <polygon
                          points={`${endX-8},${endY-4} ${endX},${endY} ${endX-8},${endY+4}`}
                          fill={targetNodeCenter ? "rgba(156, 163, 175, 1.0)" : "rgba(156, 163, 175, 0.9)"}
                          className="pointer-events-none"
                          style={{
                            transition: 'all 0.1s ease-out'
                          }}
                        />
                        {/* FIXED: Target node highlight when snapping */}
                        {targetNodeCenter && (
                          <circle
                            cx={endX}
                            cy={endY}
                            r="12"
                            fill="none"
                            stroke="rgba(156, 163, 175, 0.6)"
                            strokeWidth="2"
                            className="pointer-events-none animate-pulse"
                          />
                        )}
                      </g>
                    );
                  })()
                )}
              </svg>
            </ErrorBoundary>
          </div>

          {/* Enhanced nodes with AI-powered tooltips */}
          <ErrorBoundary context="Node Rendering" fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                <Target className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-yellow-300 text-sm">Node rendering error</p>
                <p className="text-yellow-400/70 text-xs mt-1">Some nodes may not display correctly</p>
              </div>
            </div>
          }>
            {nodes.map(node => {
              // Check if this node is being dragged
              const isDragging = interactionState.state === 'DRAGGING_NODE' && interactionState.data.draggedNodeId === node.id;
              const isSelected = selectedNode === node.id;
              
              return (
                <ErrorBoundary key={`node-boundary-${node.id}`} context={`Node ${node.id}`} fallback={
                  <div
                    className="absolute glass-pane p-4 w-60 border-red-500/50 bg-red-900/20"
                    style={{
                      left: `${node.x * transform.scale + transform.x}px`,
                      top: `${node.y * transform.scale + transform.y}px`,
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
                      setFocusedNode(node.id);
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
                        setFocusedNode(node.id);
                      }}
                      onTooltipClick={(e) => {
                        // This will be handled by NodeWithTooltip
                        e.stopPropagation();
                      }}
                    />
                  </NodeWithTooltip>
                </ErrorBoundary>
              );
            })}
          </ErrorBoundary>
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
                  <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Error</h3>
                  <p className="text-gray-600 mb-4">The chat interface encountered an error.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            }>
              <SparringSession onAddToMap={addIdeaToMapLocal} />
            </ErrorBoundary>
          </div>
        </div>


        {/* Agent Details Modal - Luxury Glass-Floating Design */}
        {showAgentDetailsModal && (
          <Dialog open={!!showAgentDetailsModal} onOpenChange={closeAgentDetailsModal}>
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
                            onClick={closeAgentDetailsModal}
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

        {/* Custom Agent Configuration Dialog */}
        <Dialog open={showCustomAgentDialog} onOpenChange={setShowCustomAgentDialog}>
          <DialogContent className="max-w-2xl p-0 border-0 bg-transparent shadow-none">
            <div className="relative w-full max-w-2xl mx-auto glass-pane rounded-2xl shadow-2xl">
              <div className="relative px-8 py-6 border-b border-gray-800/50 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[#E5E7EB] mb-1">
                      Configure Custom Agent
                    </h2>
                    <p className="text-sm text-gray-400">
                      Create your specialized AI assistant with custom expertise
                    </p>
                  </div>
                  <button
                    onClick={handleCustomAgentCancel}
                    className="w-10 h-10 rounded-full bg-[#6B6B3A]/20 text-[#6B6B3A] hover:bg-[#6B6B3A]/30 flex items-center justify-center transition-colors"
                    aria-label="Close dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="agent-name" className="text-base font-semibold text-[#E5E7EB] mb-3 block">
                        Agent Identity
                      </Label>
                      <Input
                        id="agent-name"
                        value={customAgentData.name}
                        onChange={(e) => setCustomAgentData({...customAgentData, name: e.target.value})}
                        placeholder="e.g., Financial Strategy Advisor"
                        className="glass-pane h-12 text-base text-[#E5E7EB] placeholder-gray-400 border-gray-600/50 focus:border-[#6B6B3A] rounded-xl"
                      />
                    </div>

                    <div>
                      <Label htmlFor="agent-mission" className="text-base font-semibold text-[#E5E7EB] mb-3 block">
                        Core Mission
                      </Label>
                      <Textarea
                        id="agent-mission"
                        value={customAgentData.mission}
                        onChange={(e) => setCustomAgentData({...customAgentData, mission: e.target.value})}
                        placeholder="Define the agent's primary purpose and strategic focus..."
                        className="glass-pane min-h-[100px] text-base text-[#E5E7EB] placeholder-gray-400 border-gray-600/50 focus:border-[#6B6B3A] rounded-xl resize-none"
                      />
                    </div>

                    <div>
                      <Label htmlFor="agent-expertise" className="text-base font-semibold text-[#E5E7EB] mb-3 block">
                        Expertise Domains
                      </Label>
                      <Input
                        id="agent-expertise"
                        value={customAgentData.expertise}
                        onChange={(e) => setCustomAgentData({...customAgentData, expertise: e.target.value})}
                        placeholder="Financial modeling, Risk assessment, Market analysis..."
                        className="glass-pane h-12 text-base text-[#E5E7EB] placeholder-gray-400 border-gray-600/50 focus:border-[#6B6B3A] rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="agent-jd" className="text-base font-semibold text-[#E5E7EB] mb-3 block">
                        Responsibilities & Approach
                      </Label>
                      <Textarea
                        id="agent-jd"
                        value={customAgentData.jobDescription}
                        onChange={(e) => setCustomAgentData({...customAgentData, jobDescription: e.target.value})}
                        placeholder="Describe how this agent operates, its methodology, and key responsibilities..."
                        className="glass-pane min-h-[120px] text-base text-[#E5E7EB] placeholder-gray-400 border-gray-600/50 focus:border-[#6B6B3A] rounded-xl resize-none"
                      />
                    </div>

                    <div>
                      <Label htmlFor="agent-goals" className="text-base font-semibold text-[#E5E7EB] mb-3 block">
                        Success Outcomes
                      </Label>
                      <Textarea
                        id="agent-goals"
                        value={customAgentData.goals}
                        onChange={(e) => setCustomAgentData({...customAgentData, goals: e.target.value})}
                        placeholder="What specific outcomes and value should this agent deliver..."
                        className="glass-pane min-h-[120px] text-base text-[#E5E7EB] placeholder-gray-400 border-gray-600/50 focus:border-[#6B6B3A] rounded-xl resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 border-t border-gray-800/50 rounded-b-2xl">
                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={handleCustomAgentCancel}
                    className="px-6 py-3 h-auto rounded-xl font-medium border-gray-600/50 text-[#E5E7EB] hover:bg-gray-800/50 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCustomAgentSave}
                    disabled={!customAgentData.name.trim()}
                    className="px-8 py-3 h-auto rounded-xl font-semibold bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Agent
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Full Context Modal - Now managed at ExplorationMap level */}
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

export default ExplorationMap;