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

    // Enhanced token validation with detailed logging
    const token = localStorage.getItem('auth_token');
    const hasValidToken = apiClient.isAuthenticated();
    
    console.log('🔐 [MapContext] Enhanced authentication check:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
      apiClientAuthenticated: hasValidToken,
      isAuthenticatedFlag: isAuthenticated,
      authLoadingFlag: authLoading
    });
    
    // Check multiple authentication indicators
    if (!hasValidToken || !token || !isAuthenticated) {
      console.log('🚫 [MapContext] Authentication validation failed:', {
        hasValidToken,
        hasToken: !!token,
        isAuthenticated,
        reason: !hasValidToken ? 'apiClient.isAuthenticated() failed' :
                !token ? 'no token in localStorage' :
                !isAuthenticated ? 'isAuthenticated flag is false' : 'unknown'
      });
      
      const authError = ErrorStateManager.setError(new Error('Authentication expired - please log in again'), 'MapContext');
      setErrorState(authError);
      setError('Authentication expired - please log in again');
      clearMapData();
      
      // Clear any stale workspace data
      localStorage.removeItem('currentWorkspace');
      
      // Force redirect to login for expired authentication
      console.log('🔐 [MapContext] Forcing redirect to login due to authentication failure');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
      return;
    }
    
    console.log('✅ [MapContext] Authentication validation passed');

    const operation = async () => {
      setIsLoadingRef(true);
      setIsLoading(true);
      setError(null);
      setErrorState(ErrorStateManager.clearError());
      
      console.log('🔄 [MapContext] Loading map data for workspace:', currentWorkspace.id);
      console.log('🔍 [MapContext DIAGNOSTIC] Workspace details:', {
        id: currentWorkspace.id,
        title: currentWorkspace.title,
        owner_id: currentWorkspace.owner_id
      });
      
      // ENHANCED DIAGNOSTIC: Check authentication status
      const hasToken = apiClient.isAuthenticated();
      const token = localStorage.getItem('auth_token');
      console.log('🔍 [MapContext DIAGNOSTIC] Authentication status:', {
        hasToken,
        tokenExists: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
      });
      
      // ENHANCED DIAGNOSTIC: Test API base URL and connectivity
      console.log('🔍 [MapContext DIAGNOSTIC] API Configuration:', {
        baseUrl: (apiClient as any).baseUrl || 'unknown',
        workspaceEndpoint: `/workspaces/${currentWorkspace.id}/nodes`,
        fullUrl: `${(apiClient as any).baseUrl || 'http://localhost:8000/api/v1'}/workspaces/${currentWorkspace.id}/nodes`
      });
      
      // DIAGNOSTIC LOGGING: Test individual API calls to identify which one fails
      console.log('🔍 [MapContext DIAGNOSTIC] Starting nodes API call...');
      let nodesResponse;
      try {
        nodesResponse = await apiClient.getNodes(currentWorkspace.id);
        console.log('✅ [MapContext DIAGNOSTIC] Nodes API call successful:', nodesResponse.nodes.length, 'nodes');
      } catch (nodesError) {
        console.error('❌ [MapContext DIAGNOSTIC] Nodes API call failed:', nodesError);
        console.error('❌ [MapContext DIAGNOSTIC] Error details:', {
          message: nodesError instanceof Error ? nodesError.message : 'Unknown error',
          stack: nodesError instanceof Error ? nodesError.stack : 'No stack trace',
          type: typeof nodesError,
          errorObject: nodesError
        });
        throw nodesError;
      }
      
      console.log('🔍 [MapContext DIAGNOSTIC] Starting edges API call...');
      let edgesResponse;
      try {
        edgesResponse = await apiClient.getEdges(currentWorkspace.id);
        console.log('✅ [MapContext DIAGNOSTIC] Edges API call successful:', edgesResponse.edges.length, 'edges');
      } catch (edgesError) {
        console.error('❌ [MapContext DIAGNOSTIC] Edges API call failed:', edgesError);
        console.error('❌ [MapContext DIAGNOSTIC] Error details:', {
          message: edgesError instanceof Error ? edgesError.message : 'Unknown error',
          stack: edgesError instanceof Error ? edgesError.stack : 'No stack trace',
          type: typeof edgesError,
          errorObject: edgesError
        });
        throw edgesError;
      }
      
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

  // Delete a node with race condition protection
  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      return;
    }

    // RACE CONDITION FIX: Check if node exists in local state before attempting deletion
    const nodeExists = nodes.find(node => node.id === nodeId);
    if (!nodeExists) {
      console.warn(`🚫 [MapContext] Node ${nodeId} not found in local state, skipping deletion`);
      return;
    }

    console.log(`🗑️ [MapContext] Starting deletion of node: ${nodeId}`);
    console.log(`   Workspace: ${currentWorkspace.id}`);
    console.log(`   Node title: "${nodeExists.title}"`);

    try {
      setError(null);
      
      // RACE CONDITION FIX: Remove from local state BEFORE API call to prevent multiple attempts
      setNodes(prev => prev.filter(node => node.id !== nodeId));
      setEdges(prev => prev.filter(edge =>
        edge.from_node_id !== nodeId && edge.to_node_id !== nodeId
      ));
      
      console.log(`📡 [MapContext] Making DELETE API call for node: ${nodeId}`);
      await apiClient.deleteNode(currentWorkspace.id, nodeId);
      console.log(`✅ [MapContext] Node deletion successful: ${nodeId}`);
      
    } catch (err) {
      console.error(`❌ [MapContext] Node deletion failed for ${nodeId}:`, err);
      
      // RACE CONDITION FIX: Restore node to local state if API call failed
      console.log(`🔄 [MapContext] Restoring node to local state due to deletion failure`);
      setNodes(prev => {
        // Only restore if not already present
        const alreadyExists = prev.find(node => node.id === nodeId);
        if (!alreadyExists) {
          return [...prev, nodeExists];
        }
        return prev;
      });
      
      // Also restore connected edges
      const connectedEdges = edges.filter(edge =>
        edge.from_node_id === nodeId || edge.to_node_id === nodeId
      );
      if (connectedEdges.length > 0) {
        setEdges(prev => {
          const existingEdgeIds = new Set(prev.map(e => e.id));
          const edgesToRestore = connectedEdges.filter(e => !existingEdgeIds.has(e.id));
          return [...prev, ...edgesToRestore];
        });
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete node';
      setError(errorMessage);
      throw err;
    }
  }, [currentWorkspace, nodes, edges]);

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

  // Delete an edge with real-time AI summary updates
  const deleteEdge = useCallback(async (edgeId: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      return;
    }

    try {
      setError(null);
      
      // Find the edge before deletion for AI summary updates
      const edgeToDelete = edges.find(e => e.id === edgeId);
      console.log('🔗 [DELETE EDGE] Starting deletion process for edge:', edgeId);
      
      await apiClient.deleteEdge(currentWorkspace.id, edgeId);
      setEdges(prev => prev.filter(edge => edge.id !== edgeId));
      
      // CRITICAL: Trigger real-time AI summary updates for connected nodes
      if (edgeToDelete) {
        console.log('🤖 [DELETE EDGE] Triggering AI summary updates for connected nodes...');
        try {
          // Find connected nodes
          const fromNode = nodes.find(n => n.id === edgeToDelete.from_node_id);
          const toNode = nodes.find(n => n.id === edgeToDelete.to_node_id);
          
          if (fromNode || toNode) {
            console.log('🔄 [DELETE EDGE] Refreshing map data to update AI summaries...');
            // Refresh map data to get updated AI summaries
            await loadMapData(true);
            console.log('✅ [DELETE EDGE] AI summaries updated successfully');
          }
        } catch (summaryError) {
          console.warn('⚠️ [DELETE EDGE] Failed to update AI summaries:', summaryError);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete edge';
      setError(errorMessage);
      console.error('❌ [DELETE EDGE] Failed to delete edge:', err);
      throw err;
    }
  }, [currentWorkspace, edges, nodes, loadMapData]);

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
    
    console.log('🔄 [MapContext] Effect triggered with state:', {
      currentWorkspaceId,
      currentWorkspaceTitle: currentWorkspace?.title,
      authLoading,
      isAuthenticated,
      previousWorkspaceId: lastWorkspaceIdRef.current,
      previousAuthState: lastAuthStateRef.current,
      timestamp: new Date().toISOString()
    });
    
    // Only proceed if there's an actual change
    const workspaceChanged = lastWorkspaceIdRef.current !== currentWorkspaceId;
    const authChanged = lastAuthStateRef.current.loading !== currentAuthState.loading ||
                       lastAuthStateRef.current.authenticated !== currentAuthState.authenticated;
    
    console.log('🔍 [MapContext] Change detection:', {
      workspaceChanged,
      authChanged,
      shouldProceed: workspaceChanged || authChanged
    });
    
    if (!workspaceChanged && !authChanged) {
      console.log('⏭️ [MapContext] No changes detected, skipping execution');
      return; // No changes, skip execution
    }
    
    // Update refs
    lastWorkspaceIdRef.current = currentWorkspaceId;
    lastAuthStateRef.current = currentAuthState;
    
    if (currentWorkspace && !authLoading && isAuthenticated) {
      console.log('✅ [MapContext] Conditions met for loading map data:', {
        hasWorkspace: !!currentWorkspace,
        authNotLoading: !authLoading,
        isAuthenticated
      });
      console.log('🔄 [MapContext] Workspace or auth state changed, loading map data');
      loadMapData();
    } else if (!currentWorkspace) {
      console.log('🏠 [MapContext] No workspace, clearing map data');
      clearMapData();
    } else {
      console.log('⏳ [MapContext] Conditions not met for loading map data:', {
        hasWorkspace: !!currentWorkspace,
        authNotLoading: !authLoading,
        isAuthenticated
      });
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