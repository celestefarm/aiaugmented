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
  // TEMPORARY: Mock data for demo mode
  const mockNodes: Node[] = [
    {
      id: 'node-1',
      workspace_id: 'mock-workspace-id',
      title: 'Market Research',
      description: 'Analyze target market and customer needs',
      type: 'human',
      x: 200,
      y: 150,
      confidence: 0.8,
      feasibility: 'high',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'node-2',
      workspace_id: 'mock-workspace-id',
      title: 'Product Development',
      description: 'Build MVP based on research findings',
      type: 'ai',
      x: 400,
      y: 200,
      confidence: 0.7,
      feasibility: 'medium',
      source_agent: 'Product Manager',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'node-3',
      workspace_id: 'mock-workspace-id',
      title: 'Launch Strategy',
      description: 'Plan go-to-market strategy',
      type: 'decision',
      x: 600,
      y: 150,
      confidence: 0.6,
      feasibility: 'high',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const mockEdges: Edge[] = [
    {
      id: 'edge-1',
      workspace_id: 'mock-workspace-id',
      from_node_id: 'node-1',
      to_node_id: 'node-2',
      type: 'support',
      description: 'Research informs product development',
      created_at: new Date().toISOString()
    },
    {
      id: 'edge-2',
      workspace_id: 'mock-workspace-id',
      from_node_id: 'node-2',
      to_node_id: 'node-3',
      type: 'dependency',
      description: 'Product must be ready before launch',
      created_at: new Date().toISOString()
    }
  ];

  const [nodes, setNodes] = useState<Node[]>(mockNodes);
  const [edges, setEdges] = useState<Edge[]>(mockEdges);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentWorkspace } = useWorkspace();

  // Load map data (nodes and edges) for current workspace
  const loadMapData = useCallback(async (): Promise<void> => {
    if (!currentWorkspace) {
      clearMapData();
      return;
    }

    // TEMPORARY: Use mock data instead of API calls
    setIsLoading(true);
    setError(null);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setNodes(mockNodes);
    setEdges(mockEdges);
    setIsLoading(false);
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
      
      // Update in local state
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
      
      // Remove from local state (also removes connected edges on backend)
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
      
      // Remove from local state
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
    // TEMPORARY: Always load mock data for demo
    setNodes(mockNodes);
    setEdges(mockEdges);
  }, [currentWorkspace]);

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