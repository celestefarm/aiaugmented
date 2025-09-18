import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Node, Edge, NodeCreateRequest, NodeUpdateRequest, EdgeCreateRequest, apiClient } from '../lib/api';
import { useWorkspace } from './WorkspaceContext';

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

  // Load map data (nodes and edges) for current workspace
  const loadMapData = useCallback(async (): Promise<void> => {
    if (!currentWorkspace) {
      clearMapData();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Load nodes and edges from API
      const [nodesResponse, edgesResponse] = await Promise.all([
        apiClient.getNodes(currentWorkspace.id),
        apiClient.getEdges(currentWorkspace.id)
      ]);
      
      setNodes(nodesResponse.nodes);
      setEdges(edgesResponse.edges);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load map data';
      setError(errorMessage);
      console.error('Failed to load map data:', err);
      // Set empty arrays on error
      setNodes([]);
      setEdges([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  // Create a new node
  const createNode = useCallback(async (data: NodeCreateRequest): Promise<Node | null> => {
    if (!currentWorkspace) {
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
    if (!currentWorkspace) {
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
    if (!currentWorkspace) {
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
    if (!currentWorkspace) {
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
    if (!currentWorkspace) {
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

  // Refresh map data
  const refreshMapData = useCallback(async (): Promise<void> => {
    await loadMapData();
  }, [loadMapData]);

  // Load map data when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      loadMapData();
    } else {
      clearMapData();
    }
  }, [currentWorkspace, loadMapData]);

  // Context value
  const value: MapContextType = {
    nodes,
    edges,
    isLoading,
    error,
    loadMapData,
    createNode,
    updateNode,
    deleteNode,
    createEdge,
    deleteEdge,
    clearMapData,
    refreshMapData,
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