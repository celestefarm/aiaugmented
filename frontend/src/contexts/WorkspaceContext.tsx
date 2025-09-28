import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Workspace, WorkspaceCreateRequest, WorkspaceUpdateRequest, apiClient, isAuthenticated } from '../lib/api';

// Workspace context types
interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (data: WorkspaceCreateRequest) => Promise<Workspace>;
  updateWorkspace: (workspaceId: string, data: WorkspaceUpdateRequest) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  selectWorkspace: (workspace: Workspace) => void;
  clearCurrentWorkspace: () => void;
  refreshCurrentWorkspace: () => Promise<void>;
}

// Create context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Workspace provider props
interface WorkspaceProviderProps {
  children: ReactNode;
}

// Workspace provider component
export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load workspaces from API
  const loadWorkspaces = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getWorkspaces();
      setWorkspaces(response.workspaces);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workspaces';
      setError(errorMessage);
      console.error('Failed to load workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new workspace
  const createWorkspace = async (data: WorkspaceCreateRequest): Promise<Workspace> => {
    try {
      setIsLoading(true);
      setError(null);
      const newWorkspace = await apiClient.createWorkspace(data);
      setWorkspaces(prev => [newWorkspace, ...prev]);
      
      // CRITICAL FIX: Automatically set the new workspace as the current workspace
      setCurrentWorkspace(newWorkspace);
      // Persist to localStorage
      localStorage.setItem('currentWorkspace', JSON.stringify(newWorkspace));
      
      return newWorkspace;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(errorMessage);
      console.error('Failed to create workspace:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing workspace
  const updateWorkspace = async (workspaceId: string, data: WorkspaceUpdateRequest): Promise<Workspace> => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedWorkspace = await apiClient.updateWorkspace(workspaceId, data);
      
      // Update in workspaces list
      setWorkspaces(prev => prev.map(ws => 
        ws.id === workspaceId ? updatedWorkspace : ws
      ));
      
      // Update current workspace if it's the one being updated
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(updatedWorkspace);
      }
      
      return updatedWorkspace;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update workspace';
      setError(errorMessage);
      console.error('Failed to update workspace:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a workspace
  const deleteWorkspace = async (workspaceId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.deleteWorkspace(workspaceId);
      
      // Remove from workspaces list
      setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
      
      // Clear current workspace if it's the one being deleted
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(null);
        // Clear from localStorage
        localStorage.removeItem('currentWorkspace');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete workspace';
      setError(errorMessage);
      console.error('Failed to delete workspace:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Select a workspace as current
  const selectWorkspace = (workspace: Workspace): void => {
    console.log('🏠 [WORKSPACE CONTEXT] selectWorkspace called:', {
      workspaceId: workspace.id,
      workspaceTitle: workspace.title,
      timestamp: new Date().toISOString()
    });
    
    // Validate workspace object
    if (!workspace || !workspace.id || !workspace.title) {
      console.error('❌ [WORKSPACE CONTEXT] Invalid workspace object:', workspace);
      setError('Invalid workspace data - please try again');
      throw new Error('Invalid workspace object provided');
    }
    
    // Check authentication before selecting workspace
    const token = localStorage.getItem('auth_token');
    const isAuth = isAuthenticated();
    
    console.log('🔐 [WORKSPACE CONTEXT] Authentication check before workspace selection:', {
      hasToken: !!token,
      isAuthenticated: isAuth,
      tokenLength: token ? token.length : 0
    });
    
    if (!token || !isAuth) {
      console.error('❌ [WORKSPACE CONTEXT] Authentication required for workspace selection');
      setError('Authentication required - please log in');
      throw new Error('Authentication required for workspace selection');
    }
    
    try {
      console.log('🔄 [WORKSPACE CONTEXT] Setting current workspace...');
      setCurrentWorkspace(workspace);
      
      console.log('💾 [WORKSPACE CONTEXT] Persisting to localStorage...');
      localStorage.setItem('currentWorkspace', JSON.stringify(workspace));
      
      // Clear any existing errors
      setError(null);
      
      console.log('✅ [WORKSPACE CONTEXT] Workspace selection completed successfully');
    } catch (error) {
      console.error('❌ [WORKSPACE CONTEXT] Error during workspace selection:', error);
      setError('Failed to select workspace - please try again');
      throw error;
    }
  };

  // Clear current workspace
  const clearCurrentWorkspace = (): void => {
    setCurrentWorkspace(null);
    localStorage.removeItem('currentWorkspace');
  };

  // Refresh current workspace data
  const refreshCurrentWorkspace = async (): Promise<void> => {
    if (!currentWorkspace) return;
    
    try {
      setError(null);
      const refreshedWorkspace = await apiClient.getWorkspace(currentWorkspace.id);
      setCurrentWorkspace(refreshedWorkspace);
      
      // Update in workspaces list as well
      setWorkspaces(prev => prev.map(ws => 
        ws.id === refreshedWorkspace.id ? refreshedWorkspace : ws
      ));
      
      // Update localStorage
      localStorage.setItem('currentWorkspace', JSON.stringify(refreshedWorkspace));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh workspace';
      setError(errorMessage);
      console.error('Failed to refresh workspace:', err);
    }
  };

  // Initialize workspace state on mount
  useEffect(() => {
    // Only load workspaces if user is authenticated
    if (isAuthenticated()) {
      console.log('🔐 [WORKSPACE CONTEXT] User is authenticated, loading workspaces...');
      
      // Try to restore current workspace from localStorage first
      const savedWorkspace = localStorage.getItem('currentWorkspace');
      let savedWorkspaceData = null;
      
      if (savedWorkspace) {
        try {
          savedWorkspaceData = JSON.parse(savedWorkspace);
          console.log('🔄 [WORKSPACE CONTEXT] Found saved workspace in localStorage:', savedWorkspaceData.id);
        } catch (error) {
          console.error('Failed to parse saved workspace:', error);
          localStorage.removeItem('currentWorkspace');
        }
      }
      
      // Load workspaces from API
      loadWorkspaces().then(() => {
        // After workspaces are loaded, restore the saved workspace if it exists and is valid
        if (savedWorkspaceData) {
          console.log('🔄 [WORKSPACE CONTEXT] Attempting to restore saved workspace...');
          // This will trigger the validation in the next useEffect
          setCurrentWorkspace(savedWorkspaceData);
        }
      });
    } else {
      console.log('🔐 [WORKSPACE CONTEXT] User not authenticated, skipping workspace loading');
      // Clear any existing data when not authenticated
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setError(null);
    }
  }, []);

  // Validate current workspace when workspaces are loaded
  useEffect(() => {
    if (workspaces.length > 0 && currentWorkspace) {
      // Check if current workspace still exists in the user's workspaces
      const workspaceExists = workspaces.some(ws => ws.id === currentWorkspace.id);
      if (!workspaceExists) {
        console.warn('Current workspace no longer exists or is not accessible, clearing selection');
        setCurrentWorkspace(null);
        localStorage.removeItem('currentWorkspace');
      }
    }
  }, [workspaces, currentWorkspace]);

  // Context value
  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectWorkspace,
    clearCurrentWorkspace,
    refreshCurrentWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

// Custom hook to use workspace context
export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

// Export context for advanced usage
export { WorkspaceContext };