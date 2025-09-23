import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, apiClient } from '../lib/api';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from './AuthContext';

// Map context types
interface MapContextType {
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
  
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
}

// Create context
const MapContext = createContext<MapContextType | undefined>(undefined);

// Map provider props
interface MapProviderProps {
  children: ReactNode;
}

// Map provider component
export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentWorkspace } = useWorkspace();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Load map data (nodes and edges) for current workspace
  const loadMapData = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
    if (!currentWorkspace?.id) {
      console.log('=== MAP CONTEXT DEBUG ===');
      console.log('No current workspace, clearing map data');
      clearMapData();
      return;
    }

    // Wait for authentication to be initialized before loading map data
    if (authLoading) {
      console.log('=== MAP CONTEXT DEBUG ===');
      console.log('Authentication still loading, waiting...');
      return;
    }

    // CRITICAL FIX: Check if we have a valid token instead of relying on auth context state
    const hasValidToken = apiClient.isAuthenticated();
    if (!hasValidToken) {
      console.log('=== MAP CONTEXT DEBUG ===');
      console.log('No valid authentication token, cannot load map data');
      console.log('Auth context authenticated:', isAuthenticated);
      console.log('API client authenticated:', hasValidToken);
      setError('Not authenticated');
      clearMapData();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('=== MAP CONTEXT DEBUG ===');
      console.log('Loading map data for workspace:', currentWorkspace.id);
      console.log('Force refresh:', forceRefresh);
      console.log('Auth token exists:', !!localStorage.getItem('auth_token'));
      console.log('API client authenticated:', apiClient.isAuthenticated());
      console.log('Auth context authenticated:', isAuthenticated);
      console.log('Auth loading:', authLoading);
      
      // Load nodes and edges from API (cache-busting is handled in API client)
      const [nodesResponse, edgesResponse] = await Promise.all([
        apiClient.getNodes(currentWorkspace.id),
        apiClient.getEdges(currentWorkspace.id)
      ]);
      
      console.log('=== MAP DATA LOADED SUCCESSFULLY ===');
      console.log('Node count:', nodesResponse.nodes.length);
      console.log('Edge count:', edgesResponse.edges.length);
      
      // Log key_message data verification
      const nodesWithKeyMessage = nodesResponse.nodes.filter(node => node.key_message);
      console.log(`Nodes with key_message: ${nodesWithKeyMessage.length}/${nodesResponse.nodes.length}`);
      
      if (nodesWithKeyMessage.length > 0) {
        console.log('=== KEY MESSAGE VERIFICATION ===');
        nodesWithKeyMessage.forEach((node, index) => {
          console.log(`Node ${index + 1}: "${node.title}" -> Key Message: "${node.key_message}"`);
        });
      }
      
      // Force component re-render by creating new array references
      setNodes([...nodesResponse.nodes]);
      setEdges([...edgesResponse.edges]);
      
      console.log('✅ Map data state updated, components should re-render');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load map data';
      console.error('=== MAP LOADING ERROR ===');
      console.error('Error message:', errorMessage);
      console.error('Full error:', err);
      console.error('Workspace ID:', currentWorkspace.id);
      console.error('Auth token exists:', !!localStorage.getItem('auth_token'));
      console.error('API client authenticated:', apiClient.isAuthenticated());
      console.error('Auth context authenticated:', isAuthenticated);
      console.error('Auth loading:', authLoading);
      
      setError(errorMessage);
      // Set empty arrays on error
      setNodes([]);
      setEdges([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, isAuthenticated, authLoading]);

  // Create a new node
  const createNode = useCallback(async (data: NodeCreateRequest): Promise<Node | null> => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected');
      return null;
    }

    try {
      setError(null);
      const newNode = await apiClient.createNode(currentWorkspace.id, data);
      setNodes(prev => [...prev, newNode]);
      return newNode;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node';
      setError(errorMessage);
      console.error('Failed to create node:', err);
      return null;
    }
  }, [currentWorkspace]);

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

  // Clear map data
  const clearMapData = useCallback((): void => {
    setNodes([]);
    setEdges([]);
    setError(null);
  }, []);

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

  // Load map data when workspace changes or authentication state changes
  useEffect(() => {
    if (currentWorkspace && !authLoading) {
      loadMapData();
    } else if (!currentWorkspace) {
      clearMapData();
    }
  }, [currentWorkspace, loadMapData, authLoading, isAuthenticated]);

  // Context value
  const value: MapContextType = {
    nodes,
    edges,
    isLoading,
    error,
    loadMapData: () => loadMapData(false),
    createNode,
    updateNode,
    deleteNode,
    createEdge,
    deleteEdge,
    clearMapData,
    refreshMapData,
    autoArrangeNodes,
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