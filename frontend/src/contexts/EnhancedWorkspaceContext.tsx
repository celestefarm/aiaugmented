import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Workspace, WorkspaceCreateRequest, WorkspaceUpdateRequest, apiClient } from '../lib/api';

// Enhanced Workspace context types with better error handling
interface EnhancedWorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  isWorkspaceReady: boolean; // New flag to indicate workspace is fully loaded and ready
  
  // Actions
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (data: WorkspaceCreateRequest) => Promise<Workspace>;
  updateWorkspace: (workspaceId: string, data: WorkspaceUpdateRequest) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  selectWorkspace: (workspace: Workspace) => Promise<void>; // Made async for better state management
  clearCurrentWorkspace: () => void;
  refreshCurrentWorkspace: () => Promise<void>;
  
  // Enhanced diagnostics
  validateWorkspaceAccess: (workspaceId: string) => Promise<boolean>;
}

// Create context
const EnhancedWorkspaceContext = createContext<EnhancedWorkspaceContextType | undefined>(undefined);

// Workspace provider props
interface EnhancedWorkspaceProviderProps {
  children: ReactNode;
}

// Enhanced Workspace provider component with better error handling
export const EnhancedWorkspaceProvider: React.FC<EnhancedWorkspaceProviderProps> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);

  // Enhanced workspace validation
  const validateWorkspaceAccess = useCallback(async (workspaceId: string): Promise<boolean> => {
    try {
      console.log('🔍 [WORKSPACE VALIDATION] Validating access to workspace:', workspaceId);
      
      // Validate workspace ID format (should be 24-character hex for ObjectId)
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(workspaceId)) {
        console.error('❌ [WORKSPACE VALIDATION] Invalid workspace ID format:', workspaceId);
        return false;
      }
      
      // Test workspace accessibility
      const workspace = await apiClient.getWorkspace(workspaceId);
      console.log('✅ [WORKSPACE VALIDATION] Workspace accessible:', workspace.title);
      return true;
    } catch (error) {
      console.error('❌ [WORKSPACE VALIDATION] Workspace not accessible:', error);
      return false;
    }
  }, []);

  // Load workspaces from API with enhanced error handling
  const loadWorkspaces = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 [ENHANCED WORKSPACE] Loading workspaces...');
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.getWorkspaces();
      console.log('✅ [ENHANCED WORKSPACE] Loaded workspaces:', response.workspaces.length);
      
      setWorkspaces(response.workspaces);
      
      // Validate each workspace ID format
      response.workspaces.forEach(workspace => {
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        if (!objectIdRegex.test(workspace.id)) {
          console.warn('⚠️ [ENHANCED WORKSPACE] Invalid workspace ID format detected:', workspace.id);
        }
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workspaces';
      setError(errorMessage);
      console.error('❌ [ENHANCED WORKSPACE] Failed to load workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new workspace with enhanced state management
  const createWorkspace = useCallback(async (data: WorkspaceCreateRequest): Promise<Workspace> => {
    try {
      console.log('🔄 [ENHANCED WORKSPACE] Creating workspace:', data.title);
      setIsLoading(true);
      setError(null);
      setIsWorkspaceReady(false);
      
      const newWorkspace = await apiClient.createWorkspace(data);
      console.log('✅ [ENHANCED WORKSPACE] Workspace created:', newWorkspace.id);
      
      setWorkspaces(prev => [newWorkspace, ...prev]);
      
      // CRITICAL FIX: Automatically set the new workspace as current with proper state management
      await selectWorkspace(newWorkspace);
      
      return newWorkspace;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(errorMessage);
      console.error('❌ [ENHANCED WORKSPACE] Failed to create workspace:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update an existing workspace
  const updateWorkspace = useCallback(async (workspaceId: string, data: WorkspaceUpdateRequest): Promise<Workspace> => {
    try {
      console.log('🔄 [ENHANCED WORKSPACE] Updating workspace:', workspaceId);
      setIsLoading(true);
      setError(null);
      
      const updatedWorkspace = await apiClient.updateWorkspace(workspaceId, data);
      console.log('✅ [ENHANCED WORKSPACE] Workspace updated:', updatedWorkspace.title);
      
      // Update in workspaces list
      setWorkspaces(prev => prev.map(ws => 
        ws.id === workspaceId ? updatedWorkspace : ws
      ));
      
      // Update current workspace if it's the one being updated
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(updatedWorkspace);
        localStorage.setItem('currentWorkspace', JSON.stringify(updatedWorkspace));
      }
      
      return updatedWorkspace;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update workspace';
      setError(errorMessage);
      console.error('❌ [ENHANCED WORKSPACE] Failed to update workspace:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  // Delete a workspace
  const deleteWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    try {
      console.log('🔄 [ENHANCED WORKSPACE] Deleting workspace:', workspaceId);
      setIsLoading(true);
      setError(null);
      
      await apiClient.deleteWorkspace(workspaceId);
      console.log('✅ [ENHANCED WORKSPACE] Workspace deleted:', workspaceId);
      
      // Remove from workspaces list
      setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
      
      // Clear current workspace if it's the one being deleted
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(null);
        setIsWorkspaceReady(false);
        localStorage.removeItem('currentWorkspace');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete workspace';
      setError(errorMessage);
      console.error('❌ [ENHANCED WORKSPACE] Failed to delete workspace:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  // Enhanced workspace selection with validation and proper state management
  const selectWorkspace = useCallback(async (workspace: Workspace): Promise<void> => {
    try {
      console.log('🔄 [ENHANCED WORKSPACE] Selecting workspace:', workspace.id, workspace.title);
      setError(null);
      setIsWorkspaceReady(false);
      
      // Validate workspace access before setting as current
      const isAccessible = await validateWorkspaceAccess(workspace.id);
      if (!isAccessible) {
        throw new Error(`Workspace "${workspace.title}" is not accessible or does not exist`);
      }
      
      // Set as current workspace
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspace', JSON.stringify(workspace));
      
      // Mark workspace as ready
      setIsWorkspaceReady(true);
      console.log('✅ [ENHANCED WORKSPACE] Workspace selected and ready:', workspace.title);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select workspace';
      setError(errorMessage);
      console.error('❌ [ENHANCED WORKSPACE] Failed to select workspace:', err);
      
      // Clear workspace state on failure
      setCurrentWorkspace(null);
      setIsWorkspaceReady(false);
      localStorage.removeItem('currentWorkspace');
      
      throw err;
    }
  }, [validateWorkspaceAccess]);

  // Clear current workspace
  const clearCurrentWorkspace = useCallback((): void => {
    console.log('🔄 [ENHANCED WORKSPACE] Clearing current workspace');
    setCurrentWorkspace(null);
    setIsWorkspaceReady(false);
    localStorage.removeItem('currentWorkspace');
  }, []);

  // Refresh current workspace data
  const refreshCurrentWorkspace = useCallback(async (): Promise<void> => {
    if (!currentWorkspace) return;
    
    try {
      console.log('🔄 [ENHANCED WORKSPACE] Refreshing current workspace:', currentWorkspace.id);
      setError(null);
      
      const refreshedWorkspace = await apiClient.getWorkspace(currentWorkspace.id);
      console.log('✅ [ENHANCED WORKSPACE] Workspace refreshed:', refreshedWorkspace.title);
      
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
      console.error('❌ [ENHANCED WORKSPACE] Failed to refresh workspace:', err);
    }
  }, [currentWorkspace]);

  // Initialize workspace state on mount with enhanced error handling
  useEffect(() => {
    console.log('🔄 [ENHANCED WORKSPACE] Initializing workspace context...');
    
    // Load workspaces from API first
    loadWorkspaces().then(() => {
      // Try to restore current workspace from localStorage after workspaces are loaded
      const savedWorkspace = localStorage.getItem('currentWorkspace');
      if (savedWorkspace) {
        try {
          const workspace = JSON.parse(savedWorkspace);
          console.log('🔄 [ENHANCED WORKSPACE] Restoring saved workspace:', workspace.id, workspace.title);
          
          // Validate the saved workspace asynchronously
          validateWorkspaceAccess(workspace.id).then(isValid => {
            if (isValid) {
              setCurrentWorkspace(workspace);
              setIsWorkspaceReady(true);
              console.log('✅ [ENHANCED WORKSPACE] Saved workspace restored and validated');
            } else {
              console.warn('⚠️ [ENHANCED WORKSPACE] Saved workspace is no longer accessible, clearing');
              localStorage.removeItem('currentWorkspace');
            }
          }).catch(error => {
            console.error('❌ [ENHANCED WORKSPACE] Failed to validate saved workspace:', error);
            localStorage.removeItem('currentWorkspace');
          });
        } catch (error) {
          console.error('❌ [ENHANCED WORKSPACE] Failed to parse saved workspace:', error);
          localStorage.removeItem('currentWorkspace');
        }
      }
    }).catch(error => {
      console.error('❌ [ENHANCED WORKSPACE] Failed to initialize workspaces:', error);
    });
  }, [loadWorkspaces, validateWorkspaceAccess]);

  // Validate current workspace when workspaces are loaded
  useEffect(() => {
    if (workspaces.length > 0 && currentWorkspace) {
      // Check if current workspace still exists in the user's workspaces
      const workspaceExists = workspaces.some(ws => ws.id === currentWorkspace.id);
      if (!workspaceExists) {
        console.warn('⚠️ [ENHANCED WORKSPACE] Current workspace no longer exists or is not accessible, clearing selection');
        setCurrentWorkspace(null);
        setIsWorkspaceReady(false);
        localStorage.removeItem('currentWorkspace');
      } else if (!isWorkspaceReady) {
        // If workspace exists but not marked as ready, mark it as ready
        setIsWorkspaceReady(true);
        console.log('✅ [ENHANCED WORKSPACE] Current workspace validated and marked as ready');
      }
    }
  }, [workspaces, currentWorkspace, isWorkspaceReady]);

  // Context value
  const value: EnhancedWorkspaceContextType = {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    isWorkspaceReady,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectWorkspace,
    clearCurrentWorkspace,
    refreshCurrentWorkspace,
    validateWorkspaceAccess,
  };

  return (
    <EnhancedWorkspaceContext.Provider value={value}>
      {children}
    </EnhancedWorkspaceContext.Provider>
  );
};

// Custom hook to use enhanced workspace context
export const useEnhancedWorkspace = (): EnhancedWorkspaceContextType => {
  const context = useContext(EnhancedWorkspaceContext);
  if (context === undefined) {
    throw new Error('useEnhancedWorkspace must be used within an EnhancedWorkspaceProvider');
  }
  return context;
};

// Export context for advanced usage
export { EnhancedWorkspaceContext };