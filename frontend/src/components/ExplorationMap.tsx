import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Info, Mic, Paperclip, Plus, Upload, ChevronLeft, ChevronRight, X, Clock, User, Target, Users, Briefcase, Edit, Trash2, Undo, Redo, Save, ZoomIn, ZoomOut, Check, Link, MoreVertical, Grid3X3, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMap } from '@/contexts/MapContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAgentChat, Agent, ChatMessage } from '@/contexts/AgentChatContext';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, RelationshipSuggestion, summarizeConversation } from '@/lib/api';
import SparringSession from './SparringSession';
import { CognitiveAnalysis } from './CognitiveAnalysis';
import NodeEditModal from './NodeEditModal';
import { generateDisplayTitle, generateSmartDisplayTitle } from '@/utils/nodeUtils';

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

const ExplorationMap: React.FC = () => {
  console.log('=== EXPLORATION MAP COMPONENT LOADED ===');
  console.log('Debugging instrumentation is active and ready');
  console.log('To see Save Changes button logs:');
  console.log('1. Open browser dev tools (F12)');
  console.log('2. Go to Console tab');
  console.log('3. Double-click a node to edit');
  console.log('4. Click Save Changes button');
  console.log('5. Watch for detailed logging output');
  
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
    addMessageToMap
  } = useAgentChat();
  
  // Canvas interaction state - FIXED
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedNodePosition, setDraggedNodePosition] = useState<{ x: number; y: number } | null>(null);
  
  // UI state
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipAnimating, setTooltipAnimating] = useState<string | null>(null);
  const [tooltipPositions, setTooltipPositions] = useState<Record<string, { x: number; y: number; position: 'above'; align: 'center' }>>({});
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
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
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [connectionPreview, setConnectionPreview] = useState<{ x: number; y: number } | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
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

  // Smart title processing effect
  useEffect(() => {
    console.log('=== SMART TITLE PROCESSING EFFECT ===');
    console.log('Nodes count:', nodes.length);
    console.log('Current smartTitles state:', smartTitles);
    
    const processSmartTitles = async () => {
      console.log('Processing smart titles for', nodes.length, 'nodes');
      
      for (const node of nodes) {
        console.log(`Processing node ${node.id}: "${node.title}"`);
        const contexts: Array<'card' | 'tooltip' | 'list'> = ['card', 'tooltip', 'list'];
        
        for (const context of contexts) {
          const key = `${node.id}-${context}`;
          const cached = smartTitles[key];
          
          console.log(`  Context ${context}: cached =`, cached);
          
          if (!cached) {
            const maxLengths = { card: 25, tooltip: 40, list: 30 };
            const maxLength = maxLengths[context];
            
            console.log(`  Title length: ${node.title.length}, max: ${maxLength}`);
            
            // If title is already short enough, no need for smart processing
            if (node.title.length <= maxLength) {
              console.log(`  Title is short enough, using as-is`);
              setSmartTitles(prev => ({
                ...prev,
                [key]: { title: node.title, isLoading: false }
              }));
              continue;
            }
            
            // Check for cached summarized title
            if (node.summarized_titles && node.summarized_titles[context]) {
              const cachedTitle = node.summarized_titles[context];
              console.log(`  Found cached summarized title: "${cachedTitle}"`);
              if (cachedTitle.length <= maxLength) {
                setSmartTitles(prev => ({
                  ...prev,
                  [key]: { title: cachedTitle, isLoading: false }
                }));
                continue;
              }
            }
            
            // Set loading state and fetch smart title
            const fallbackTitle = generateDisplayTitle(node.title, node.description, context);
            console.log(`  Using fallback title: "${fallbackTitle}"`);
            
            setSmartTitles(prev => ({
              ...prev,
              [key]: { title: fallbackTitle, isLoading: true }
            }));
            
            // Fetch smart title asynchronously
            try {
              console.log(`  Fetching smart title from API...`);
              const smartTitle = await generateSmartDisplayTitle(node, context);
              console.log(`  Got smart title: "${smartTitle}"`);
              
              setSmartTitles(prev => ({
                ...prev,
                [key]: { title: smartTitle, isLoading: false }
              }));
            } catch (error) {
              console.warn(`Failed to get smart title for node ${node.id}:`, error);
              setSmartTitles(prev => ({
                ...prev,
                [key]: { title: fallbackTitle, isLoading: false }
              }));
            }
          }
        }
      }
    };
    
    if (nodes.length > 0) {
      processSmartTitles();
    }
  }, [nodes]);

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
    } catch (error) {
      console.error('Failed to delete node:', error);
      showNotification('Failed to delete node');
    }
  }, [nodes, saveToHistory, showNotification, deleteNodeAPI]);

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
      }
      return newEdge;
    } catch (error) {
      console.error('Failed to create connection:', error);
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
            setIsCreatingConnection(!isCreatingConnection);
            setConnectionStart(null);
            setConnectionPreview(null);
            showNotification(isCreatingConnection ? 'Cancelled connection mode' : 'Connection mode activated - click two nodes to connect');
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
            setIsCreatingConnection(false);
            setConnectionStart(null);
            setConnectionPreview(null);
            setSelectedNode(null);
            setShowContextMenu(null);
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
          case 'Enter':
            if (focusedNode) {
              e.preventDefault();
              const node = nodes.find(n => n.id === focusedNode);
              if (node) {
                setEditingNode({ ...node });
                setShowNodeEditor(true);
              }
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedNode, deleteNode, nodes, edges, transform, handleZoom, isCreatingConnection, focusedNode, createNode, showNotification]);

  // Canvas mouse event handlers - FIXED
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(null);
    
    if (draggedNode || isCreatingConnection) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setSelectedNode(null);
    setFocusedNode(null);
  }, [draggedNode, isCreatingConnection]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Update connection preview
    if (isCreatingConnection && connectionStart) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setConnectionPreview(canvasPos);
    }
    
    if (draggedNode) {
      // Handle node dragging with real-time visual updates
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      const snappedPos = snapToGrid(canvasPos.x - dragOffset.x, canvasPos.y - dragOffset.y);
      
      // Update the dragged node's position for real-time visual feedback
      setDraggedNodePosition(snappedPos);
    } else if (isDragging) {
      // Handle canvas panning
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setTransform(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggedNode, isDragging, dragStart, dragOffset, screenToCanvas, snapToGrid, isCreatingConnection, connectionStart]);

  const handleCanvasMouseUp = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (draggedNode && draggedNodePosition) {
      // Update node position in backend
      try {
        const node = nodes.find(n => n.id === draggedNode);
        if (node) {
          const updateData: NodeUpdateRequest = {
            title: node.title,
            description: node.description,
            type: node.type,
            x: draggedNodePosition.x,
            y: draggedNodePosition.y,
            confidence: node.confidence,
            feasibility: node.feasibility,
            source_agent: node.source_agent
          };
          
          await updateNodeAPI(draggedNode, updateData);
          showNotification(`Moved ${node.title}`);
        }
      } catch (error) {
        console.error('Failed to update node position:', error);
        showNotification('Failed to update node position');
      }
    }
    
    // Clean up drag state
    setIsDragging(false);
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
    setDraggedNodePosition(null);
  }, [draggedNode, draggedNodePosition, nodes, updateNodeAPI, showNotification]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (draggedNode || isCreatingConnection) return;
    
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    createNode(canvasPos.x, canvasPos.y);
  }, [draggedNode, isCreatingConnection, screenToCanvas, createNode]);

  const handleCanvasRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(-e.deltaY, e.clientX, e.clientY);
  }, [handleZoom]);

  // Node event handlers - FIXED
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    setActiveTooltip(null);
    
    if (isCreatingConnection) {
      if (connectionStart && connectionStart !== nodeId) {
        createConnection(connectionStart, nodeId);
        setIsCreatingConnection(false);
        setConnectionStart(null);
        setConnectionPreview(null);
      } else if (!connectionStart) {
        setConnectionStart(nodeId);
        showNotification('Click another node to create connection');
      }
      return;
    }
    
    setSelectedNode(nodeId);
    setFocusedNode(nodeId);
    setDraggedNode(nodeId);
    
    // Calculate offset for smooth dragging
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setDragOffset({
        x: canvasPos.x - node.x,
        y: canvasPos.y - node.y
      });
    }
  }, [isCreatingConnection, connectionStart, createConnection, nodes, screenToCanvas, showNotification]);

  // Calculate tooltip position with guaranteed vertical separation
  const calculateTooltipPosition = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    // Safe spacing rule: 10px gap (within 8-12px requirement)
    const SAFE_GAP = 10;
    const tooltipWidth = 320; // w-80 = 320px
    
    // Position tooltip above the entire node with clean separation
    // Center horizontally on the node, position above with guaranteed gap
    const x = (NODE_WIDTH - tooltipWidth) / 2; // Center on node
    const y = -(SAFE_GAP); // Above node with non-negotiable gap
    
    return { x, y, position: 'above' as const, align: 'center' as const };
  }, [nodes]);

  // Simplified tooltip event handlers with fixed positioning
  const handleTooltipIconClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    if (activeTooltip === nodeId) {
      // Hide current tooltip with animation
      setTooltipAnimating(nodeId);
      setTimeout(() => {
        setActiveTooltip(null);
        setTooltipAnimating(null);
        setTooltipPositions(prev => {
          const newPositions = { ...prev };
          delete newPositions[nodeId];
          return newPositions;
        });
      }, 150); // Match the fade-out duration
    } else {
      // Calculate fixed position for new tooltip
      const position = calculateTooltipPosition(nodeId);
      if (position) {
        setTooltipPositions(prev => ({
          ...prev,
          [nodeId]: position
        }));
      }
      
      // Show new tooltip
      setActiveTooltip(nodeId);
      setTooltipAnimating(null);
    }
  }, [activeTooltip, calculateTooltipPosition]);

  const handleTooltipMouseLeave = useCallback(() => {
    // Add a small delay before hiding to prevent accidental dismissal
    setTimeout(() => {
      if (activeTooltip) {
        setTooltipAnimating(activeTooltip);
        setTimeout(() => {
          setActiveTooltip(null);
          setTooltipAnimating(null);
          setTooltipPositions(prev => {
            const newPositions = { ...prev };
            if (activeTooltip) delete newPositions[activeTooltip];
            return newPositions;
          });
        }, 150);
      }
    }, 200); // 200ms delay before starting hide animation
  }, [activeTooltip]);

  // Handle tooltip mouse enter to cancel hide animation
  const handleTooltipMouseEnter = useCallback(() => {
    setTooltipAnimating(null);
  }, []);

  // Handle edit node from context menu or toolbar
  const handleEditNode = useCallback((nodeId: string) => {
    console.log('=== HANDLE EDIT NODE - OPENING EDIT MODAL ===');
    console.log('Node ID:', nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    console.log('Found node:', node);
    
    if (node) {
      const editingNodeCopy = { ...node };
      console.log('Setting editingNode to:', editingNodeCopy);
      console.log('editingNode ID type:', typeof editingNodeCopy.id);
      console.log('editingNode ID value:', editingNodeCopy.id);
      console.log('editingNode title:', editingNodeCopy.title);
      console.log('editingNode description length:', editingNodeCopy.description?.length || 0);
      
      setEditingNode(editingNodeCopy);
      setShowNodeEditor(true);
      
      console.log('Edit modal should now be open');
    } else {
      console.error('CRITICAL: Node not found for ID:', nodeId);
    }
  }, [nodes]);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    console.log('=== NODE DOUBLE CLICK - DELEGATING TO HANDLE EDIT NODE ===');
    console.log('Event:', e);
    console.log('Node ID:', nodeId);
    
    e.stopPropagation();
    e.preventDefault();
    
    handleEditNode(nodeId);
  }, [handleEditNode]);

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
    if (!isCreatingConnection || !connectionStart) return false;
    if (nodeId === connectionStart) return false;
    
    // Check if connection already exists
    const existingConnection = edges.find(e =>
      (e.from_node_id === connectionStart && e.to_node_id === nodeId) ||
      (e.from_node_id === nodeId && e.to_node_id === connectionStart)
    );
    
    return !existingConnection;
  }, [isCreatingConnection, connectionStart, edges]);

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
          stroke: `rgba(34, 197, 94, ${baseOpacity})`,
          strokeWidth,
          strokeDasharray: 'none',
          filter: strength && strength > 0.8 ? 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))' : 'none'
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

  const getNodeStyle = (type: string, isSelected: boolean = false, isFocused: boolean = false, isValidTarget: boolean = false) => {
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
    
    switch (type) {
      case 'human':
        return `${baseStyle} pulse-glow border-[#6B6B3A]/30 bg-gradient-to-br from-[#6B6B3A]/5 to-[#6B6B3A]/10 ${additionalStyles}`;
      case 'ai':
        return `${baseStyle} bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-400/40 shadow-lg shadow-blue-500/10 ${additionalStyles}`;
      case 'risk':
        return `${baseStyle} bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-400/40 shadow-lg shadow-red-500/10 ${additionalStyles}`;
      case 'dependency':
        return `${baseStyle} bg-gradient-to-br from-gray-500/10 to-slate-500/10 border-gray-400/40 shadow-lg shadow-gray-500/10 ${additionalStyles}`;
      case 'decision':
        return `${baseStyle} bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-400/40 shadow-lg shadow-yellow-500/10 ${additionalStyles}`;
      default:
        return `${baseStyle} bg-gradient-to-br from-gray-400/5 to-gray-500/10 border-gray-400/30 ${additionalStyles}`;
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

  // Close context menu and tooltips when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      setShowContextMenu(null);
      
      // Close tooltip if clicking outside of it
      if (activeTooltip) {
        const target = event.target as Element;
        const tooltipElement = target.closest('.tooltip-container');
        const tooltipButton = target.closest('[data-tooltip-trigger]');
        
        if (!tooltipElement && !tooltipButton) {
          setTooltipAnimating(activeTooltip);
          setTimeout(() => {
            setActiveTooltip(null);
            setTooltipAnimating(null);
            setTooltipPositions(prev => {
              const newPositions = { ...prev };
              if (activeTooltip) delete newPositions[activeTooltip];
              return newPositions;
            });
          }, 150);
        }
      }
    };
    
    if (showContextMenu || activeTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu, activeTooltip]);

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
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-red-300 mb-2">Failed to load map</p>
          <p className="text-gray-400 text-sm">{mapError}</p>
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
                    console.log('=== CONTEXT MENU EDIT CLICKED ===');
                    console.log('Context menu nodeId:', showContextMenu.nodeId);
                    
                    if (showContextMenu.nodeId) {
                      handleEditNode(showContextMenu.nodeId);
                    } else {
                      console.error('CRITICAL: No nodeId in context menu');
                    }
                    setShowContextMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700/50 flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Node</span>
                </button>
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

        {/* Map Area - RESPONSIVE CANVAS */}
        <div
          ref={canvasRef}
          className={`flex-1 select-none overflow-hidden relative ${
            isDragging ? 'cursor-grabbing' :
            isCreatingConnection ? 'cursor-crosshair' :
            'cursor-grab'
          }`}
          style={{
            boxShadow: 'inset 0 0 40px -10px rgba(107, 107, 58, 0.3)',
            height: '100vh',
            paddingTop: '4rem',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onDoubleClick={handleCanvasDoubleClick}
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
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-40">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={async () => {
                    try {
                      console.log('=== MANUAL REFRESH BUTTON CLICKED ===');
                      await refreshMapData();
                      showNotification('Map data refreshed successfully');
                    } catch (error) {
                      console.error('Failed to refresh map data:', error);
                      showNotification('Failed to refresh map data');
                    }
                  }}
                  disabled={mapLoading}
                  className="glass-pane px-4 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Refresh map data"
                >
                  <Clock className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Refresh Map Data</TooltipContent>
            </Tooltip>

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
                    setIsCreatingConnection(!isCreatingConnection);
                    setConnectionStart(null);
                    setConnectionPreview(null);
                    showNotification(isCreatingConnection ? 'Cancelled connection mode' : 'Connection mode activated');
                  }}
                  className={`glass-pane px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
                    isCreatingConnection 
                      ? 'text-[#6B6B3A] bg-[#6B6B3A]/20 border-[#6B6B3A]/40' 
                      : 'text-[#E5E7EB] hover:text-[#6B6B3A]'
                  }`}
                  aria-label="Toggle connection mode (C)"
                >
                  <Link className="w-4 h-4" />
                  <span>{isCreatingConnection ? 'Cancel Connection' : 'Connect Nodes'}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Connect Nodes (C)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={async () => {
                    try {
                      await autoArrangeNodes();
                      showNotification('Nodes auto-arranged successfully');
                    } catch (error) {
                      console.error('Failed to auto-arrange nodes:', error);
                      showNotification('Failed to auto-arrange nodes');
                    }
                  }}
                  disabled={nodes.length === 0}
                  className="glass-pane px-4 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Auto-arrange nodes to prevent overlapping"
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>Auto-Arrange</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Auto-Arrange Nodes</TooltipContent>
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
                      onClick={() => {
                        console.log('=== TOOLBAR EDIT BUTTON CLICKED ===');
                        console.log('Selected node:', selectedNode);
                        handleEditNode(selectedNode);
                      }}
                      className="glass-pane px-3 py-2 text-sm font-medium text-[#E5E7EB] hover:text-[#6B6B3A] transition-colors"
                      aria-label="Edit selected node"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Node (Enter)</TooltipContent>
                </Tooltip>
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
          {isCreatingConnection && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 glass-pane px-4 py-2 text-sm text-[#6B6B3A] z-40">
              {connectionStart ? 'Click another node to create connection' : 'Click a node to start connection'}
            </div>
          )}

          {/* Canvas Content Container - FIXED */}
          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
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

            {/* SVG Layer for Edges - FIXED */}
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
              {/* Existing edges */}
              {edges.map(edge => {
                const fromNode = nodes.find(n => n.id === edge.from_node_id);
                const toNode = nodes.find(n => n.id === edge.to_node_id);
                if (!fromNode || !toNode) return null;

                const style = getEdgeStyle(edge.type);
                const fromX = fromNode.x + NODE_WIDTH / 2 + 2000;
                const fromY = fromNode.y + NODE_HEIGHT / 2 + 2000;
                const toX = toNode.x + NODE_WIDTH / 2 + 2000;
                const toY = toNode.y + NODE_HEIGHT / 2 + 2000;

                return (
                  <g key={edge.id}>
                    <line
                      x1={fromX}
                      y1={fromY}
                      x2={toX}
                      y2={toY}
                      {...style}
                      className="transition-all duration-200 cursor-pointer hover:stroke-opacity-80 pointer-events-auto"
                      onClick={() => deleteEdge(edge.id)}
                    />
                    {/* Arrow marker */}
                    <polygon
                      points={`${toX-8},${toY-4} ${toX},${toY} ${toX-8},${toY+4}`}
                      fill={style.stroke}
                      opacity="0.7"
                    />
                  </g>
                );
              })}

              {/* Connection preview line */}
              {isCreatingConnection && connectionStart && connectionPreview && (
                (() => {
                  const startNode = nodes.find(n => n.id === connectionStart);
                  if (!startNode) return null;
                  
                  const fromX = startNode.x + NODE_WIDTH / 2 + 2000;
                  const fromY = startNode.y + NODE_HEIGHT / 2 + 2000;
                  
                  return (
                    <line
                      x1={fromX}
                      y1={fromY}
                      x2={connectionPreview.x + 2000}
                      y2={connectionPreview.y + 2000}
                      stroke="rgba(107, 107, 58, 0.6)"
                      strokeWidth={2}
                      strokeDasharray="4,4"
                      className="pointer-events-none"
                    />
                  );
                })()
              )}
            </svg>

            {/* Nodes Layer - FIXED */}
            {nodes.map(node => {
              // Use dragged position if this node is being dragged, otherwise use stored position
              const nodePosition = draggedNode === node.id && draggedNodePosition
                ? draggedNodePosition
                : { x: node.x, y: node.y };
              
              return (
                <div
                  key={node.id}
                  className={getNodeStyle(
                    node.type,
                    selectedNode === node.id,
                    focusedNode === node.id,
                    isValidConnectionTarget(node.id)
                  )}
                  style={{
                    position: 'absolute',
                    left: nodePosition.x,
                    top: nodePosition.y,
                    zIndex: draggedNode === node.id ? 30 : 20, // Bring dragged node to front
                    opacity: draggedNode === node.id ? 0.8 : 1, // Slight transparency while dragging
                    transform: draggedNode === node.id ? 'scale(1.05)' : 'scale(1)', // Slight scale while dragging
                    transition: draggedNode === node.id ? 'none' : 'transform 0.2s ease', // Disable transition while dragging
                  }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
                onContextMenu={(e) => handleNodeRightClick(e, node.id)}
                onKeyDown={(e) => handleNodeKeyDown(e, node.id)}
                tabIndex={0}
                role="button"
                aria-label={`Node: ${node.title}`}
                aria-describedby={`node-desc-${node.id}`}
              >
                <div className="relative">
                  {/* Agent Label - Now inside the node box, top-left */}
                  {node.source_agent && (
                    <div className="absolute top-0 left-0 text-xs text-blue-400 font-medium bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30 shadow-sm z-10">
                      {node.source_agent === 'strategist' ? 'Strategist Agent' : node.source_agent}
                    </div>
                  )}
                  
                  {/* Tooltip Icon Button - Top-right corner */}
                  <button
                    onClick={(e) => handleTooltipIconClick(e, node.id)}
                    className="absolute top-0 right-0 w-6 h-6 rounded-full bg-gray-700/80 hover:bg-gray-600/80 flex items-center justify-center transition-colors z-10"
                    aria-label="Toggle tooltip"
                    data-tooltip-trigger
                  >
                    <Info className="w-3 h-3 text-gray-300" />
                  </button>
                  
                  {/* Add top padding when agent label is present */}
                  <div className={node.source_agent ? 'pt-8' : ''}>
                    <div className="flex items-center gap-2 mb-2">
                      {getNodeIcon(node.type)}
                      <h3 className={`font-bold text-sm ${getNodeTypeColor(node.type)}`}>
                        {getSmartTitle(node, 'card').title}
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
                      <p
                        id={`node-desc-${node.id}`}
                        className="text-xs text-gray-300 mb-2 line-clamp-2"
                      >
                        {(() => {
                          // Use summarized title as subtext if available and different from main title
                          const smartTitle = getSmartTitle(node, 'card');
                          if (node.summarized_titles?.card &&
                              node.summarized_titles.card !== node.title &&
                              node.summarized_titles.card !== smartTitle.title) {
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

                  {/* Enhanced Tooltip with Clean Vertical Separation */}
                  {activeTooltip === node.id && (
                    <div className="tooltip-container absolute pointer-events-auto z-50">
                      <div
                        className={`tooltip-content tooltip-smooth p-4 text-xs absolute glass-pane border border-gray-600/50 rounded-lg shadow-2xl w-80 ${
                          tooltipAnimating === node.id ? 'exiting' : 'entering'
                        }`}
                        style={{
                          left: `${(NODE_WIDTH - 320) / 2}px`, // Center on node (320px = w-80)
                          top: `-10px`, // Fixed 10px gap above node
                          transform: 'translateY(-100%)' // Move tooltip fully above the gap
                        }}
                        onMouseLeave={handleTooltipMouseLeave}
                        onMouseEnter={handleTooltipMouseEnter}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          {getNodeIcon(node.type)}
                          <div className="font-medium text-[#6B6B3A]">
                            {node.title}
                          </div>
                        </div>
                        
                        {/* Keynote Points - Primary content */}
                        {node.keynote_points && node.keynote_points.length > 0 ? (
                          <div className="mb-3">
                            <div className="text-gray-400 font-medium mb-2">Key Discussion Points:</div>
                            <div className="space-y-1">
                              {node.keynote_points.map((point, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <div className="w-1 h-1 rounded-full bg-[#6B6B3A] mt-2 flex-shrink-0"></div>
                                  <span className="text-gray-300 leading-relaxed">{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Fallback to conversation text if no keynote points */
                          <div className="mb-3">
                            <div className="text-gray-400 font-medium mb-2">Full Conversation:</div>
                            <div className="space-y-1">
                              {formatConversationText(node.description).map((point, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <div className="w-1 h-1 rounded-full bg-[#6B6B3A] mt-2 flex-shrink-0"></div>
                                  <span className="text-gray-300 leading-relaxed">{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Key Message in tooltip if available */}
                        {node.key_message && (
                          <div className="mb-3 p-2 bg-[#6B6B3A]/10 rounded border border-[#6B6B3A]/20">
                            <div className="text-gray-400 font-medium mb-1">Key Message:</div>
                            <div className="text-gray-200 leading-relaxed">{node.key_message}</div>
                          </div>
                        )}
                        
                        {/* Metadata */}
                        <div className="flex items-center justify-between text-xs border-t border-gray-600/30 pt-2">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-400">
                              {edges.filter(e => e.from_node_id === node.id || e.to_node_id === node.id).length} connections
                            </span>
                            {node.confidence && (
                              <span className="text-[#6B6B3A]">
                                {node.confidence}% confidence
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500">
                            {formatTimestamp(node.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar - Sparring Session */}
        <div className="flex-shrink-0 w-80 h-screen glass-pane border-l border-gray-800/50 overflow-hidden" style={{ zIndex: 30, paddingTop: '4rem' }}>
          <div className="p-3 h-full overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
            <SparringSession onAddToMap={addIdeaToMapLocal} />
          </div>
        </div>

        {/* Node Editor Modal */}
        <NodeEditModal
          isOpen={showNodeEditor}
          node={editingNode}
          onClose={() => {
            setShowNodeEditor(false);
            setEditingNode(null);
          }}
          onSave={async (nodeId: string, updateData: NodeUpdateRequest) => {
            await updateNodeAPI(nodeId, updateData);
          }}
          onShowNotification={showNotification}
        />

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
      </div>
    </TooltipProvider>
  );
};

export default ExplorationMap;