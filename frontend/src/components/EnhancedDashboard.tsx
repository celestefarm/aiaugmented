import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEnhancedWorkspace } from '../contexts/EnhancedWorkspaceContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Plus,
  Calendar,
  Settings,
  Trash2,
  Edit,
  LogOut,
  User,
  Loader2,
  AlertCircle,
  RefreshCw,
  Home,
  CheckCircle,
  Clock
} from 'lucide-react';

const EnhancedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const {
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
    validateWorkspaceAccess
  } = useEnhancedWorkspace();

  // Local state for create workspace dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkspaceTitle, setNewWorkspaceTitle] = useState('');
  const [newWorkspaceSituation, setNewWorkspaceSituation] = useState('');
  const [newWorkspaceGoal, setNewWorkspaceGoal] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Local state for edit workspace dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [editWorkspaceTitle, setEditWorkspaceTitle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Local state for workspace selection
  const [selectingWorkspace, setSelectingWorkspace] = useState<string | null>(null);

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Handle home navigation
  const handleHome = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    navigate('/');
  };

  // Handle create workspace with enhanced error handling
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceTitle.trim() || !newWorkspaceSituation.trim() || !newWorkspaceGoal.trim()) {
      return;
    }

    try {
      setIsCreating(true);
      console.log('🔄 [ENHANCED DASHBOARD] Creating workspace:', newWorkspaceTitle);
      
      const workspace = await createWorkspace({
        title: newWorkspaceTitle.trim(),
        settings: {
          situation: newWorkspaceSituation.trim(),
          goal: newWorkspaceGoal.trim(),
        },
        transform: { x: 0, y: 0, scale: 1 }
      });
      
      console.log('✅ [ENHANCED DASHBOARD] Workspace created successfully:', workspace.id);
      
      setShowCreateDialog(false);
      setNewWorkspaceTitle('');
      setNewWorkspaceSituation('');
      setNewWorkspaceGoal('');
      
      // Navigate to the new workspace after it's fully ready
      console.log('🔄 [ENHANCED DASHBOARD] Navigating to new workspace...');
      navigate('/workspace');
      
    } catch (error) {
      console.error('❌ [ENHANCED DASHBOARD] Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle edit workspace
  const handleEditWorkspace = async (workspace: any, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      setEditingWorkspace(workspace);
      setEditWorkspaceTitle(workspace.title);
      setShowEditDialog(true);
    } catch (error) {
      console.error('Error opening edit dialog:', error);
    }
  };

  // Handle update workspace
  const handleUpdateWorkspace = async () => {
    if (!editWorkspaceTitle.trim() || !editingWorkspace) {
      return;
    }

    try {
      setIsUpdating(true);
      
      const updatedWorkspace = await updateWorkspace(editingWorkspace.id, {
        title: editWorkspaceTitle.trim()
      });
      
      // Close dialog and reset state
      setShowEditDialog(false);
      setEditingWorkspace(null);
      setEditWorkspaceTitle('');
    } catch (error) {
      console.error('Failed to update workspace:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Enhanced workspace selection with proper state management
  const handleSelectWorkspace = async (workspace: any) => {
    try {
      console.log('🔄 [ENHANCED DASHBOARD] Selecting workspace:', workspace.id, workspace.title);
      setSelectingWorkspace(workspace.id);
      
      // Validate workspace access first
      const isAccessible = await validateWorkspaceAccess(workspace.id);
      if (!isAccessible) {
        throw new Error(`Workspace "${workspace.title}" is not accessible`);
      }
      
      // Select the workspace
      await selectWorkspace(workspace);
      
      console.log('✅ [ENHANCED DASHBOARD] Workspace selected, navigating...');
      navigate('/workspace');
      
    } catch (error) {
      console.error('❌ [ENHANCED DASHBOARD] Failed to select workspace:', error);
      // Show user-friendly error message
      alert(`Failed to access workspace "${workspace.title}". It may have been deleted or you may not have permission to access it.`);
    } finally {
      setSelectingWorkspace(null);
    }
  };

  // Handle delete workspace
  const handleDeleteWorkspace = async (workspaceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteWorkspace(workspaceId);
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen dashboard-background text-[#E5E7EB]">
      {/* Header */}
      <header className="glass-pane sticky top-0 z-50 w-full px-6 py-4 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <svg width="32" height="32" viewBox="0 0 24 24" className="text-[#6B6B3A]">
              <path
                d="M12 2 L20 12 L12 22 L4 12 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.8"
              />
              <path
                d="M12 5 L17 12 L12 19 L7 12 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            
            <div>
              <h1 className="text-2xl font-bold text-white">Enhanced Workspaces</h1>
              <p className="text-sm text-gray-400">Manage your strategic exploration spaces</p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleHome}
              className="bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black font-medium"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </Button>

            {/* User Info and Logout */}
            {user && (
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#6B6B3A]/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#6B6B3A]" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm text-white font-medium">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 glass-pane border border-red-500/30 bg-red-500/10 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300">{error}</span>
              <Button
                onClick={loadWorkspaces}
                variant="outline"
                size="sm"
                className="ml-auto border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Current Workspace Status */}
        {currentWorkspace && (
          <div className="mb-6 glass-pane border border-[#6B6B3A]/30 bg-[#6B6B3A]/10 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              {isWorkspaceReady ? (
                <CheckCircle className="w-5 h-5 text-[#6B6B3A]" />
              ) : (
                <Clock className="w-5 h-5 text-yellow-400" />
              )}
              <span className="text-[#6B6B3A] font-medium">
                Current Workspace: {currentWorkspace.title}
              </span>
              <span className="text-sm text-gray-400">
                ({isWorkspaceReady ? 'Ready' : 'Loading...'})
              </span>
              {isWorkspaceReady && (
                <Button
                  onClick={() => navigate('/workspace')}
                  size="sm"
                  className="ml-auto bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black"
                >
                  Open Workspace
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && workspaces.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#6B6B3A]" />
              <span className="text-gray-400">Loading workspaces...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Workspaces Grid */}
            {workspaces.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#6B6B3A]/20 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-[#6B6B3A]" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No workspaces yet</h3>
                <p className="text-gray-400 mb-6">Create your first workspace to start exploring strategic insights</p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workspace
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workspaces.map((workspace) => {
                  const isSelecting = selectingWorkspace === workspace.id;
                  const isCurrent = currentWorkspace?.id === workspace.id;
                  
                  return (
                    <div
                      key={workspace.id}
                      onClick={() => !isSelecting && handleSelectWorkspace(workspace)}
                      className={`glass-pane p-6 rounded-lg transition-all duration-200 group border border-gray-800/50 relative ${
                        isSelecting
                          ? 'cursor-wait opacity-75'
                          : 'cursor-pointer hover:scale-105 hover:border-[#6B6B3A]/30'
                      } ${
                        isCurrent ? 'ring-2 ring-[#6B6B3A]/50 bg-[#6B6B3A]/5' : ''
                      }`}
                    >
                      {/* Main content area */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-white group-hover:text-[#6B6B3A] transition-colors">
                              {workspace.title}
                            </h3>
                            {isCurrent && (
                              <span className="px-2 py-1 text-xs bg-[#6B6B3A]/20 text-[#6B6B3A] rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            Created {formatDate(workspace.created_at)}
                          </p>
                          {workspace.updated_at !== workspace.created_at && (
                            <p className="text-xs text-gray-500">
                              Updated {formatDate(workspace.updated_at)}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={(e) => handleEditWorkspace(workspace, e)}
                            variant="outline"
                            size="sm"
                            disabled={isSelecting}
                            className="border-gray-600 text-gray-400 hover:text-[#6B6B3A] hover:border-[#6B6B3A]"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                            variant="outline"
                            size="sm"
                            disabled={isSelecting}
                            className="border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Loading indicator for workspace selection */}
                      {isSelecting && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                          <div className="flex items-center space-x-2 text-[#6B6B3A]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Loading workspace...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Workspace Dialog */}
      {showCreateDialog && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="glass-pane border-gray-600/50 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#6B6B3A]" />
                Create New Workspace
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="workspace-title" className="text-gray-300">
                  Workspace Title
                </Label>
                <Input
                  id="workspace-title"
                  value={newWorkspaceTitle}
                  onChange={(e) => setNewWorkspaceTitle(e.target.value)}
                  placeholder="Enter workspace title..."
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="workspace-situation" className="text-gray-300">
                  Current Situation / Problem
                </Label>
                <textarea
                  id="workspace-situation"
                  value={newWorkspaceSituation}
                  onChange={(e) => setNewWorkspaceSituation(e.target.value)}
                  placeholder="Describe your current situation or challenges..."
                  rows={3}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 resize-vertical"
                />
              </div>
              
              <div>
                <Label htmlFor="workspace-goal" className="text-gray-300">
                  Goal / Desired Outcome
                </Label>
                <textarea
                  id="workspace-goal"
                  value={newWorkspaceGoal}
                  onChange={(e) => setNewWorkspaceGoal(e.target.value)}
                  placeholder="Describe what you want to achieve..."
                  rows={3}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 resize-vertical"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
                disabled={isCreating}
                className="border-gray-600 text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceTitle.trim() || !newWorkspaceSituation.trim() || !newWorkspaceGoal.trim() || isCreating}
                className="bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Workspace Dialog */}
      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="glass-pane border-gray-600/50">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#6B6B3A]" />
                Edit Workspace
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-workspace-title" className="text-gray-300">
                  Workspace Title
                </Label>
                <Input
                  id="edit-workspace-title"
                  value={editWorkspaceTitle}
                  onChange={(e) => setEditWorkspaceTitle(e.target.value)}
                  placeholder="Enter workspace title..."
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowEditDialog(false)}
                variant="outline"
                disabled={isUpdating}
                className="border-gray-600 text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateWorkspace}
                disabled={!editWorkspaceTitle.trim() || isUpdating}
                className="bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Update
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EnhancedDashboard;