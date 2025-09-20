import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
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
  RefreshCw
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { 
    workspaces, 
    isLoading, 
    error, 
    loadWorkspaces, 
    createWorkspace, 
    deleteWorkspace,
    selectWorkspace 
  } = useWorkspace();

  // Local state for create workspace dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkspaceTitle, setNewWorkspaceTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Local state for edit workspace dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [editWorkspaceTitle, setEditWorkspaceTitle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Handle create workspace
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceTitle.trim()) return;

    try {
      setIsCreating(true);
      const workspace = await createWorkspace({
        title: newWorkspaceTitle.trim(),
        settings: {},
        transform: { x: 0, y: 0, scale: 1 }
      });
      
      setShowCreateDialog(false);
      setNewWorkspaceTitle('');
      
      // Navigate to the new workspace (no need to call selectWorkspace since createWorkspace now sets it as current)
      console.log('=== DASHBOARD: WORKSPACE CREATED ===');
      console.log('New workspace ID:', workspace.id);
      console.log('Navigating to workspace...');
      navigate('/workspace');
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle edit workspace
  const handleEditWorkspace = async (workspace: any, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('🔧 [EDIT-DEBUG] Edit button clicked for workspace:', workspace.id, workspace.title);
    
    try {
      setEditingWorkspace(workspace);
      setEditWorkspaceTitle(workspace.title);
      setShowEditDialog(true);
      console.log('✅ [EDIT-DEBUG] Edit dialog opened successfully');
    } catch (error) {
      console.error('❌ [EDIT-DEBUG] Error opening edit dialog:', error);
    }
  };

  // Handle update workspace
  const handleUpdateWorkspace = async () => {
    if (!editWorkspaceTitle.trim() || !editingWorkspace) return;

    console.log('🔧 [EDIT-DEBUG] Updating workspace:', editingWorkspace.id, 'to:', editWorkspaceTitle.trim());

    try {
      setIsUpdating(true);
      
      // TODO: Implement actual workspace update API call
      // For now, we'll just simulate the update
      console.log('🔧 [EDIT-DEBUG] Simulating workspace update...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Close dialog and reset state
      setShowEditDialog(false);
      setEditingWorkspace(null);
      setEditWorkspaceTitle('');
      
      // Refresh workspaces to show updated data
      await loadWorkspaces();
      
      console.log('✅ [EDIT-DEBUG] Workspace update completed successfully');
    } catch (error) {
      console.error('❌ [EDIT-DEBUG] Failed to update workspace:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle workspace selection
  const handleSelectWorkspace = (workspace: any) => {
    selectWorkspace(workspace);
    navigate('/workspace');
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
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E7EB]">
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
              <h1 className="text-2xl font-bold text-white">Workspaces</h1>
              <p className="text-sm text-gray-400">Manage your strategic exploration spaces</p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
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
            {/* Stats */}
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-pane p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Workspaces</p>
                      <p className="text-2xl font-bold text-white">{workspaces.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#6B6B3A]/20 flex items-center justify-center">
                      <Settings className="w-6 h-6 text-[#6B6B3A]" />
                    </div>
                  </div>
                </div>
                
                <div className="glass-pane p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Recent Activity</p>
                      <p className="text-2xl font-bold text-white">
                        {workspaces.length > 0 ? 'Active' : 'None'}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </div>
                
                <div className="glass-pane p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Account</p>
                      <p className="text-lg font-semibold text-white">Premium</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                {workspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    onClick={() => handleSelectWorkspace(workspace)}
                    className="glass-pane p-6 rounded-lg cursor-pointer hover:scale-105 transition-all duration-200 group border border-gray-800/50 hover:border-[#6B6B3A]/30"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#6B6B3A] transition-colors">
                          {workspace.title}
                        </h3>
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
                          className="border-gray-600 text-gray-400 hover:text-[#6B6B3A] hover:border-[#6B6B3A]"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Scale: {Math.round(workspace.transform.scale * 100)}%</span>
                      <span className="px-2 py-1 bg-[#6B6B3A]/20 text-[#6B6B3A] rounded">
                        Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Workspace Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md glass-pane border border-gray-800/50 text-gray-100">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#6B6B3A]">Create New Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="workspace-title" className="text-sm font-medium text-[#E5E7EB] mb-2 block">
                Workspace Title
              </Label>
              <Input
                id="workspace-title"
                value={newWorkspaceTitle}
                onChange={(e) => setNewWorkspaceTitle(e.target.value)}
                placeholder="Enter workspace title..."
                className="glass-pane text-[#E5E7EB] border-gray-600/50 focus:border-[#6B6B3A]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreating) {
                    handleCreateWorkspace();
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewWorkspaceTitle('');
                }}
                disabled={isCreating}
                className="border-gray-600/50 text-[#E5E7EB] hover:bg-gray-800/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceTitle.trim() || isCreating}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Workspace Dialog - Glass Effect */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="!bg-black/40 !backdrop-blur-xl !border-white/10 !text-gray-100 !shadow-2xl max-w-md fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
          <DialogHeader className="pb-4 border-b border-white/10">
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              Edit Workspace
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="edit-workspace-title" className="text-sm font-medium text-gray-200 mb-3 block">
                Workspace Title
              </Label>
              <Input
                id="edit-workspace-title"
                value={editWorkspaceTitle}
                onChange={(e) => setEditWorkspaceTitle(e.target.value)}
                placeholder="Enter workspace title..."
                className="!bg-white/5 !backdrop-blur-sm !border-white/20 !text-gray-100 placeholder:text-gray-400 focus:!border-yellow-500/50 focus:!ring-2 focus:!ring-yellow-500/20 !outline-none !transition-all rounded-md px-3 py-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isUpdating) {
                    handleUpdateWorkspace();
                  }
                }}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingWorkspace(null);
                setEditWorkspaceTitle('');
              }}
              disabled={isUpdating}
              className="!bg-white/5 !border-white/20 !text-gray-300 hover:!bg-white/10 hover:!text-white !backdrop-blur-sm px-4 py-2 rounded-md transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateWorkspace}
              disabled={!editWorkspaceTitle.trim() || isUpdating}
              className="!bg-gradient-to-r !from-yellow-600 !to-yellow-500 hover:!from-yellow-500 hover:!to-yellow-400 !text-black !font-medium !shadow-lg !backdrop-blur-sm !border-0 px-4 py-2 rounded-md transition-all flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Update
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;