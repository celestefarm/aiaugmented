import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, apiClient } from '../lib/api';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from './AuthContext';
import { createErrorHandler, ErrorStateManager, ErrorState } from '../lib/errorHandler';

// ERROR HANDLING FIX: Enhanced Map context types with comprehensive error handling
interface MapContextType {
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
  errorState: ErrorState;
  
  // Node actions
  loadMapData: () => Promise<void>;
  createNode: (data: NodeCreateRequest) => Promise<Node | null>;
  updateNode: (nodeId: string, data: NodeUpdateRequest) => Promise<Node | null>;
  deleteNode: (nodeId: string) => Promise<void>;
  
  // Edge actions
  createEdge: (data: EdgeCreateRequest) => Promise<Edge | null>;
  deleteEdge: (edgeId: string) => Promise<void>;
  
  // Utility actions
  clearMapData: () => void;
  refreshMapData: () => Promise<void>;
  autoArrangeNodes: () => Promise<void>;
  
  // ERROR HANDLING FIX: Error management actions
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
}

// Create context
const MapContext = createContext<MapContextType | undefined>(undefined);

// Map provider props
interface MapProviderProps {
  children: ReactNode;
}

// ERROR HANDLING FIX: Enhanced Map provider with comprehensive error handling
export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<ErrorState>(ErrorStateManager.createInitialState());
  const [lastFailedOperation, setLastFailedOperation] = useState<(() => Promise<void>) | null>(null);
  
  const { currentWorkspace } = useWorkspace();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // PERFORMANCE FIX: Memoize error handler to prevent recreation on every render
  const errorHandler = useMemo(() => createErrorHandler('MapContext', {
    maxRetries: 2,
    baseDelay: 1500,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  }), []);

  // PERFORMANCE FIX: Add request deduplication to prevent multiple simultaneous requests
  const [isLoadingRef, setIsLoadingRef] = useState(false);

  // Clear map data function - defined early to avoid dependency issues
  const clearMapData = useCallback((): void => {
    setNodes([]);
    setEdges([]);
    setError(null);
  }, []);

  // PERFORMANCE FIX: Enhanced load map data with dependency cycle prevention
  const loadMapData = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    // PERFORMANCE FIX: Request deduplication - prevent multiple simultaneous requests
    if (isLoadingRef && !forceRefresh) {
      console.log('🔄 [MapContext] Request already in progress, skipping duplicate');
      return;
    }

    if (!currentWorkspace?.id) {
      console.log('🏠 [MapContext] No current workspace, clearing map data');
      clearMapData();
      return;
    }

    if (authLoading) {
      console.log('🔐 [MapContext] Authentication still loading, waiting...');
      return;
    }

    const hasValidToken = apiClient.isAuthenticated();
    if (!hasValidToken) {
      console.log('🚫 [MapContext] No valid authentication token');
      const authError = ErrorStateManager.setError(new Error('Authentication required'), 'MapContext');
      setErrorState(authError);
      setError('Not authenticated');
      clearMapData();
      return;
    }

    const operation = async () => {
      setIsLoadingRef(true);
      setIsLoading(true);
      setError(null);
      setErrorState(ErrorStateManager.clearError());
      
      console.log('🔄 [MapContext] Loading map data for workspace:', currentWorkspace.id);
      
      // Load nodes and edges from API with error handling
      const [nodesResponse, edgesResponse] = await Promise.all([
        apiClient.getNodes(currentWorkspace.id),
        apiClient.getEdges(currentWorkspace.id)
      ]);
      
      console.log('✅ [MapContext] Map data loaded successfully:', {
        nodes: nodesResponse.nodes.length,
        edges: edgesResponse.edges.length
      });
      
      // Update state with new data
      setNodes([...nodesResponse.nodes]);
      setEdges([...edgesResponse.edges]);
    };

    // Store operation for retry capability
    setLastFailedOperation(() => operation);

    try {
      await errorHandler.handleOperation(operation, {
        context: 'MapContext',
        operation: 'loadMapData',
        showUserMessage: true
      });
    } catch (err) {
      console.error('❌ [MapContext] Failed to load map data:', err);
      const errorState = ErrorStateManager.setError(err, 'MapContext');
      setErrorState(errorState);
      setError(errorState.error);
      setNodes([]);
      setEdges([]);
    } finally {
      setIsLoadingRef(false);
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, isAuthenticated, authLoading, errorHandler]);

  // ERROR HANDLING FIX: Enhanced create node with error handling
  const createNode = useCallback(async (data: NodeCreateRequest): Promise<Node | null> => {
    if (!currentWorkspace?.id) {
      const error = 'No workspace selected';
      setError(error);
      setErrorState(ErrorStateManager.setError(new Error(error), 'MapContext'));
      return null;
    }

    try {
      setError(null);
      setErrorState(ErrorStateManager.clearError());
      
      const newNode = await errorHandler.handleOperation(
        () => apiClient.createNode(currentWorkspace.id, data),
        {
          context: 'MapContext',
          operation: 'createNode',
          showUserMessage: true
        }
      );
      
      setNodes(prev => [...prev, newNode]);
      console.log('✅ [MapContext] Node created successfully:', newNode.id);
      return newNode;
    } catch (err) {
      console.error('❌ [MapContext] Failed to create node:', err);
      const errorState = ErrorStateManager.setError(err, 'MapContext');
      setErrorState(errorState);
      setError(errorState.error);
      return null;
    }
  }, [currentWorkspace, errorHandler]);

  // Update an existing node
  const updateNode = useCallback(async (nodeId: string, data: NodeUpdateRequest): Promise<Node | null> => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      return null;
    }

    try {
      setError(null);
      const updatedNode = await apiClient.updateNode(currentWorkspace.id, nodeId, data);
      
      setNodes(prev => prev.map(node =>
        node.id === nodeId ? updatedNode : node
      ));
      
      return updatedNode;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node';
      setError(errorMessage);
      console.error('Failed to update node:', err);
      return null;
    }
  }, [currentWorkspace]);

  // Delete a node
  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      return;
    }

    try {
      setError(null);
      await apiClient.deleteNode(currentWorkspace.id, nodeId);
      
      // Remove from local state
      setNodes(prev => prev.filter(node => node.id !== nodeId));
      setEdges(prev => prev.filter(edge =>
        edge.from_node_id !== nodeId && edge.to_node_id !== nodeId
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete node';
      setError(errorMessage);
      console.error('Failed to delete node:', err);
      throw err;
    }
  }, [currentWorkspace]);

  // Create a new edge
  const createEdge = useCallback(async (data: EdgeCreateRequest): Promise<Edge | null> => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      return null;
    }

    try {
      setError(null);
      const newEdge = await apiClient.createEdge(currentWorkspace.id, data);
      setEdges(prev => [...prev, newEdge]);
      return newEdge;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create edge';
      setError(errorMessage);
      console.error('Failed to create edge:', err);
      return null;
    }
  }, [currentWorkspace]);

  // Delete an edge
  const deleteEdge = useCallback(async (edgeId: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      return;
    }

    try {
      setError(null);
      await apiClient.deleteEdge(currentWorkspace.id, edgeId);
      setEdges(prev => prev.filter(edge => edge.id !== edgeId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete edge';
      setError(errorMessage);
      console.error('Failed to delete edge:', err);
      throw err;
    }
  }, [currentWorkspace]);

  // Refresh map data with force refresh
  const refreshMapData = useCallback(async (): Promise<void> => {
    console.log('=== MANUAL REFRESH TRIGGERED ===');
    await loadMapData(true);
  }, [loadMapData]);

  // Auto-arrange nodes to prevent overlapping
  const autoArrangeNodes = useCallback(async (interactionManager?: any): Promise<void> => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      return;
    }

    // CRITICAL FIX: Check if currently dragging to prevent interference
    if (interactionManager?.isDragging?.()) {
      console.log('🚫 [MapContext] Cannot auto-arrange while dragging nodes');
      setError('Cannot auto-arrange while dragging nodes');
      return;
    }

    try {
      setError(null);
      console.log('🔄 [MapContext] Starting auto-arrange...');
      const response = await apiClient.autoArrangeNodes(currentWorkspace.id);
      console.log('Auto-arrange result:', response);
      
      // Refresh the map data to show the new positions
      await loadMapData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-arrange nodes';
      setError(errorMessage);
      console.error('Failed to auto-arrange nodes:', err);
    }
  }, [currentWorkspace, loadMapData]);

  // PERFORMANCE FIX: Use refs to prevent infinite re-renders
  const lastWorkspaceIdRef = useRef<string | null>(null);
  const lastAuthStateRef = useRef<{ loading: boolean; authenticated: boolean }>({ loading: true, authenticated: false });

  useEffect(() => {
    const currentWorkspaceId = currentWorkspace?.id || null;
    const currentAuthState = { loading: authLoading, authenticated: isAuthenticated };
    
    // Only proceed if there's an actual change
    const workspaceChanged = lastWorkspaceIdRef.current !== currentWorkspaceId;
    const authChanged = lastAuthStateRef.current.loading !== currentAuthState.loading ||
                       lastAuthStateRef.current.authenticated !== currentAuthState.authenticated;
    
    if (!workspaceChanged && !authChanged) {
      return; // No changes, skip execution
    }
    
    // Update refs
    lastWorkspaceIdRef.current = currentWorkspaceId;
    lastAuthStateRef.current = currentAuthState;
    
    if (currentWorkspace && !authLoading && isAuthenticated) {
      console.log('🔄 [MapContext] Workspace or auth state changed, loading map data');
      loadMapData();
    } else if (!currentWorkspace) {
      console.log('🏠 [MapContext] No workspace, clearing map data');
      clearMapData();
    }
  }, [currentWorkspace?.id, authLoading, isAuthenticated, loadMapData, clearMapData]);

  // ERROR HANDLING FIX: Clear error function
  const clearError = useCallback(() => {
    setError(null);
    setErrorState(ErrorStateManager.clearError());
  }, []);

  // ERROR HANDLING FIX: Retry last failed operation
  const retryLastOperation = useCallback(async () => {
    if (lastFailedOperation) {
      console.log('🔄 [MapContext] Retrying last failed operation');
      try {
        await lastFailedOperation();
        setLastFailedOperation(null);
      } catch (err) {
        console.error('❌ [MapContext] Retry failed:', err);
        const errorState = ErrorStateManager.setError(err, 'MapContext');
        setErrorState(errorState);
        setError(errorState.error);
      }
    }
  }, [lastFailedOperation]);

  // ERROR HANDLING FIX: Enhanced context value with error handling
  const value: MapContextType = {
    nodes,
    edges,
    isLoading,
    error,
    errorState,
    loadMapData: () => loadMapData(false),
    createNode,
    updateNode,
    deleteNode,
    createEdge,
    deleteEdge,
    clearMapData,
    refreshMapData,
    autoArrangeNodes,
    clearError,
    retryLastOperation,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
};

// Custom hook to use map context
export const useMap = (): MapContextType => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};

// Export context for advanced usage
export { MapContext };