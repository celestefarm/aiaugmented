import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, apiClient } from '../lib/api';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from './AuthContext';
import { createErrorHandler, ErrorStateManager, ErrorState } from '../lib/errorHandler';

// Enhanced Map context types with comprehensive error handling
interface EnhancedMapContextType {
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
  errorState: ErrorState;
  diagnosticInfo: DiagnosticInfo;
  
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
  
  // Enhanced error management actions
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
  runDiagnostics: () => Promise<DiagnosticInfo>;
}

// Diagnostic information interface
interface DiagnosticInfo {
  timestamp: string;
  authStatus: {
    hasToken: boolean;
    tokenValid: boolean;
    tokenExpired: boolean;
    userId: string | null;
  };
  apiStatus: {
    baseUrl: string;
    healthCheck: boolean;
    healthResponse: any;
  };
  workspaceStatus: {
    currentWorkspaceId: string | null;
    workspaceAccessible: boolean;
    workspaceFormat: 'valid' | 'invalid' | 'unknown';
  };
  networkStatus: {
    online: boolean;
    corsEnabled: boolean;
  };
  errors: string[];
}

// Create context
const EnhancedMapContext = createContext<EnhancedMapContextType | undefined>(undefined);

// Map provider props
interface EnhancedMapProviderProps {
  children: ReactNode;
}

// Enhanced Map provider with comprehensive error handling and diagnostics
export const EnhancedMapProvider: React.FC<EnhancedMapProviderProps> = ({ children }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<ErrorState>(ErrorStateManager.createInitialState());
  const [lastFailedOperation, setLastFailedOperation] = useState<(() => Promise<void>) | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo>({
    timestamp: new Date().toISOString(),
    authStatus: { hasToken: false, tokenValid: false, tokenExpired: false, userId: null },
    apiStatus: { baseUrl: '', healthCheck: false, healthResponse: null },
    workspaceStatus: { currentWorkspaceId: null, workspaceAccessible: false, workspaceFormat: 'unknown' },
    networkStatus: { online: navigator.onLine, corsEnabled: false },
    errors: []
  });
  
  const { currentWorkspace } = useWorkspace();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Enhanced error handler with better retry logic
  const errorHandler = useMemo(() => createErrorHandler('EnhancedMapContext', {
    maxRetries: 3,
    baseDelay: 2000,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  }), []);

  // Request deduplication
  const [isLoadingRef, setIsLoadingRef] = useState(false);

  // Comprehensive diagnostic function
  const runDiagnostics = useCallback(async (): Promise<DiagnosticInfo> => {
    console.log('🔍 [ENHANCED MAP CONTEXT] Running comprehensive diagnostics...');
    
    const diagnostic: DiagnosticInfo = {
      timestamp: new Date().toISOString(),
      authStatus: { hasToken: false, tokenValid: false, tokenExpired: false, userId: null },
      apiStatus: { baseUrl: '', healthCheck: false, healthResponse: null },
      workspaceStatus: { currentWorkspaceId: null, workspaceAccessible: false, workspaceFormat: 'unknown' },
      networkStatus: { online: navigator.onLine, corsEnabled: false },
      errors: []
    };

    try {
      // 1. Check authentication status
      const token = localStorage.getItem('auth_token');
      diagnostic.authStatus.hasToken = !!token;
      
      if (token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            diagnostic.authStatus.tokenValid = true;
            diagnostic.authStatus.tokenExpired = Date.now() > payload.exp * 1000;
            diagnostic.authStatus.userId = payload.sub || payload.user_id || null;
            
            console.log('🔐 [DIAGNOSTICS] Token analysis:', {
              valid: diagnostic.authStatus.tokenValid,
              expired: diagnostic.authStatus.tokenExpired,
              userId: diagnostic.authStatus.userId,
              expiresAt: new Date(payload.exp * 1000)
            });
          }
        } catch (e) {
          diagnostic.errors.push(`Invalid token format: ${e instanceof Error ? e.message : 'Unknown error'}`);
          console.error('🔐 [DIAGNOSTICS] Token parsing failed:', e);
        }
      } else {
        diagnostic.errors.push('No authentication token found');
        console.error('🔐 [DIAGNOSTICS] No authentication token');
      }

      // 2. Check API connectivity
      const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      diagnostic.apiStatus.baseUrl = API_BASE_URL;
      
      try {
        console.log('🌐 [DIAGNOSTICS] Testing API health endpoint...');
        const healthResponse = await fetch(`${API_BASE_URL}/healthz`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        diagnostic.apiStatus.healthCheck = healthResponse.ok;
        
        if (healthResponse.ok) {
          diagnostic.apiStatus.healthResponse = await healthResponse.json();
          console.log('✅ [DIAGNOSTICS] API health check passed:', diagnostic.apiStatus.healthResponse);
        } else {
          diagnostic.errors.push(`API health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
          console.error('❌ [DIAGNOSTICS] API health check failed:', healthResponse.status);
        }
      } catch (e) {
        diagnostic.errors.push(`API connectivity failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        console.error('❌ [DIAGNOSTICS] API connectivity test failed:', e);
      }

      // 3. Check workspace status
      if (currentWorkspace?.id) {
        diagnostic.workspaceStatus.currentWorkspaceId = currentWorkspace.id;
        
        // Validate workspace ID format (should be valid ObjectId)
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        diagnostic.workspaceStatus.workspaceFormat = objectIdRegex.test(currentWorkspace.id) ? 'valid' : 'invalid';
        
        if (diagnostic.workspaceStatus.workspaceFormat === 'invalid') {
          diagnostic.errors.push(`Invalid workspace ID format: ${currentWorkspace.id} (expected 24-character hex string)`);
          console.error('❌ [DIAGNOSTICS] Invalid workspace ID format:', currentWorkspace.id);
        }

        // Test workspace accessibility
        if (token && diagnostic.apiStatus.healthCheck) {
          try {
            console.log('🏠 [DIAGNOSTICS] Testing workspace accessibility...');
            const workspaceResponse = await fetch(`${API_BASE_URL}/workspaces/${currentWorkspace.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            diagnostic.workspaceStatus.workspaceAccessible = workspaceResponse.ok;
            
            if (!workspaceResponse.ok) {
              const errorText = await workspaceResponse.text();
              diagnostic.errors.push(`Workspace not accessible: ${workspaceResponse.status} ${errorText}`);
              console.error('❌ [DIAGNOSTICS] Workspace not accessible:', workspaceResponse.status, errorText);
            } else {
              console.log('✅ [DIAGNOSTICS] Workspace accessible');
            }
          } catch (e) {
            diagnostic.errors.push(`Workspace accessibility test failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
            console.error('❌ [DIAGNOSTICS] Workspace accessibility test failed:', e);
          }
        }
      } else {
        diagnostic.errors.push('No current workspace selected');
        console.error('❌ [DIAGNOSTICS] No current workspace');
      }

      // 4. Test CORS
      try {
        const corsResponse = await fetch(`${API_BASE_URL}/healthz`, {
          method: 'OPTIONS'
        });
        diagnostic.networkStatus.corsEnabled = corsResponse.ok;
        console.log('🌐 [DIAGNOSTICS] CORS test:', diagnostic.networkStatus.corsEnabled ? 'Enabled' : 'Disabled');
      } catch (e) {
        diagnostic.errors.push(`CORS test failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        console.error('❌ [DIAGNOSTICS] CORS test failed:', e);
      }

    } catch (e) {
      diagnostic.errors.push(`Diagnostic test failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.error('❌ [DIAGNOSTICS] General diagnostic failure:', e);
    }

    console.log('🔍 [DIAGNOSTICS] Complete diagnostic report:', diagnostic);
    setDiagnosticInfo(diagnostic);
    return diagnostic;
  }, [currentWorkspace?.id]);

  // Clear map data function
  const clearMapData = useCallback((): void => {
    setNodes([]);
    setEdges([]);
    setError(null);
  }, []);

  // Enhanced load map data with comprehensive error handling
  const loadMapData = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    // Request deduplication
    if (isLoadingRef && !forceRefresh) {
      console.log('🔄 [ENHANCED MAP CONTEXT] Request already in progress, skipping duplicate');
      return;
    }

    if (!currentWorkspace?.id) {
      console.log('🏠 [ENHANCED MAP CONTEXT] No current workspace, clearing map data');
      clearMapData();
      return;
    }

    if (authLoading) {
      console.log('🔐 [ENHANCED MAP CONTEXT] Authentication still loading, waiting...');
      return;
    }

    // Run diagnostics before attempting to load data
    const diagnostics = await runDiagnostics();
    
    // Check if we have critical issues that prevent loading
    if (!diagnostics.authStatus.hasToken) {
      const authError = ErrorStateManager.setError(new Error('Authentication required - no token found'), 'EnhancedMapContext');
      setErrorState(authError);
      setError('Not authenticated - please log in again');
      clearMapData();
      return;
    }

    if (diagnostics.authStatus.tokenExpired) {
      const authError = ErrorStateManager.setError(new Error('Authentication token expired'), 'EnhancedMapContext');
      setErrorState(authError);
      setError('Session expired - please log in again');
      apiClient.clearAuth();
      clearMapData();
      // Trigger page reload for re-authentication
      setTimeout(() => window.location.reload(), 1000);
      return;
    }

    if (!diagnostics.apiStatus.healthCheck) {
      const apiError = ErrorStateManager.setError(new Error('Backend server not accessible'), 'EnhancedMapContext');
      setErrorState(apiError);
      setError('Backend server is not running or not accessible');
      clearMapData();
      return;
    }

    if (diagnostics.workspaceStatus.workspaceFormat === 'invalid') {
      const formatError = ErrorStateManager.setError(new Error('Invalid workspace ID format'), 'EnhancedMapContext');
      setErrorState(formatError);
      setError('Invalid workspace - please select a different workspace');
      clearMapData();
      return;
    }

    if (!diagnostics.workspaceStatus.workspaceAccessible) {
      const accessError = ErrorStateManager.setError(new Error('Workspace not accessible'), 'EnhancedMapContext');
      setErrorState(accessError);
      setError('Workspace not found or access denied');
      clearMapData();
      return;
    }

    const operation = async () => {
      setIsLoadingRef(true);
      setIsLoading(true);
      setError(null);
      setErrorState(ErrorStateManager.clearError());
      
      console.log('🔄 [ENHANCED MAP CONTEXT] Loading map data for workspace:', currentWorkspace.id);
      
      // Load nodes and edges with enhanced error handling
      console.log('🔍 [ENHANCED MAP CONTEXT] Starting nodes API call...');
      const nodesResponse = await apiClient.getNodes(currentWorkspace.id);
      console.log('✅ [ENHANCED MAP CONTEXT] Nodes API call successful:', nodesResponse.nodes.length, 'nodes');
      
      console.log('🔍 [ENHANCED MAP CONTEXT] Starting edges API call...');
      const edgesResponse = await apiClient.getEdges(currentWorkspace.id);
      console.log('✅ [ENHANCED MAP CONTEXT] Edges API call successful:', edgesResponse.edges.length, 'edges');
      
      console.log('✅ [ENHANCED MAP CONTEXT] Map data loaded successfully:', {
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
        context: 'EnhancedMapContext',
        operation: 'loadMapData',
        showUserMessage: true
      });
    } catch (err) {
      console.error('❌ [ENHANCED MAP CONTEXT] Failed to load map data:', err);
      const errorState = ErrorStateManager.setError(err, 'EnhancedMapContext');
      setErrorState(errorState);
      setError(errorState.error);
      setNodes([]);
      setEdges([]);
      
      // Run diagnostics again to capture the failure state
      await runDiagnostics();
    } finally {
      setIsLoadingRef(false);
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, isAuthenticated, authLoading, errorHandler, runDiagnostics, clearMapData]);

  // Enhanced create node with error handling
  const createNode = useCallback(async (data: NodeCreateRequest): Promise<Node | null> => {
    if (!currentWorkspace?.id) {
      const error = 'No workspace selected';
      setError(error);
      setErrorState(ErrorStateManager.setError(new Error(error), 'EnhancedMapContext'));
      return null;
    }

    try {
      setError(null);
      setErrorState(ErrorStateManager.clearError());
      
      const newNode = await errorHandler.handleOperation(
        () => apiClient.createNode(currentWorkspace.id, data),
        {
          context: 'EnhancedMapContext',
          operation: 'createNode',
          showUserMessage: true
        }
      );
      
      setNodes(prev => [...prev, newNode]);
      console.log('✅ [ENHANCED MAP CONTEXT] Node created successfully:', newNode.id);
      return newNode;
    } catch (err) {
      console.error('❌ [ENHANCED MAP CONTEXT] Failed to create node:', err);
      const errorState = ErrorStateManager.setError(err, 'EnhancedMapContext');
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

    const nodeExists = nodes.find(node => node.id === nodeId);
    if (!nodeExists) {
      console.warn(`🚫 [ENHANCED MAP CONTEXT] Node ${nodeId} not found in local state, skipping deletion`);
      return;
    }

    console.log(`🗑️ [ENHANCED MAP CONTEXT] Starting deletion of node: ${nodeId}`);

    try {
      setError(null);
      
      // Remove from local state BEFORE API call to prevent multiple attempts
      setNodes(prev => prev.filter(node => node.id !== nodeId));
      setEdges(prev => prev.filter(edge =>
        edge.from_node_id !== nodeId && edge.to_node_id !== nodeId
      ));
      
      console.log(`📡 [ENHANCED MAP CONTEXT] Making DELETE API call for node: ${nodeId}`);
      await apiClient.deleteNode(currentWorkspace.id, nodeId);
      console.log(`✅ [ENHANCED MAP CONTEXT] Node deletion successful: ${nodeId}`);
      
    } catch (err) {
      console.error(`❌ [ENHANCED MAP CONTEXT] Node deletion failed for ${nodeId}:`, err);
      
      // Restore node to local state if API call failed
      console.log(`🔄 [ENHANCED MAP CONTEXT] Restoring node to local state due to deletion failure`);
      setNodes(prev => {
        const alreadyExists = prev.find(node => node.id === nodeId);
        if (!alreadyExists) {
          return [...prev, nodeExists];
        }
        return prev;
      });
      
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
    console.log('=== ENHANCED MANUAL REFRESH TRIGGERED ===');
    await loadMapData(true);
  }, [loadMapData]);

  // Auto-arrange nodes
  const autoArrangeNodes = useCallback(async (): Promise<void> => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      return;
    }

    try {
      setError(null);
      console.log('🔄 [ENHANCED MAP CONTEXT] Starting auto-arrange...');
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

  // Load map data when workspace or auth state changes
  useEffect(() => {
    if (currentWorkspace && !authLoading && isAuthenticated) {
      console.log('🔄 [ENHANCED MAP CONTEXT] Workspace or auth state changed, loading map data');
      loadMapData();
    } else if (!currentWorkspace) {
      console.log('🏠 [ENHANCED MAP CONTEXT] No workspace, clearing map data');
      clearMapData();
    }
  }, [currentWorkspace?.id, authLoading, isAuthenticated, loadMapData, clearMapData]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
    setErrorState(ErrorStateManager.clearError());
  }, []);

  // Retry last failed operation
  const retryLastOperation = useCallback(async () => {
    if (lastFailedOperation) {
      console.log('🔄 [ENHANCED MAP CONTEXT] Retrying last failed operation');
      try {
        await lastFailedOperation();
        setLastFailedOperation(null);
      } catch (err) {
        console.error('❌ [ENHANCED MAP CONTEXT] Retry failed:', err);
        const errorState = ErrorStateManager.setError(err, 'EnhancedMapContext');
        setErrorState(errorState);
        setError(errorState.error);
      }
    }
  }, [lastFailedOperation]);

  // Context value
  const value: EnhancedMapContextType = {
    nodes,
    edges,
    isLoading,
    error,
    errorState,
    diagnosticInfo,
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
    runDiagnostics,
  };

  return (
    <EnhancedMapContext.Provider value={value}>
      {children}
    </EnhancedMapContext.Provider>
  );
};

// Custom hook to use enhanced map context
export const useEnhancedMap = (): EnhancedMapContextType => {
  const context = useContext(EnhancedMapContext);
  if (context === undefined) {
    throw new Error('useEnhancedMap must be used within an EnhancedMapProvider');
  }
  return context;
};

// Export context for advanced usage
export { EnhancedMapContext };