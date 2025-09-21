
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
    updateWorkspace,
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
    if (!editWorkspaceTitle.trim() || !editingWorkspace) {
      console.log('❌ [EDIT-DEBUG] Validation failed - missing title or workspace');
      console.log('  - editWorkspaceTitle:', editWorkspaceTitle);
      console.log('  - editingWorkspace:', editingWorkspace);
      return;
    }

    console.log('🔧 [EDIT-DEBUG] Starting workspace update process...');
    console.log('  - Workspace ID:', editingWorkspace.id);
    console.log('  - Current title:', editingWorkspace.title);
    console.log('  - New title:', editWorkspaceTitle.trim());
    console.log('  - updateWorkspace function available:', typeof updateWorkspace);

    try {
      setIsUpdating(true);
      
      console.log('🔧 [EDIT-DEBUG] CRITICAL ISSUE IDENTIFIED: Currently only simulating update!');
      console.log('🔧 [EDIT-DEBUG] The actual updateWorkspace API call is commented out as TODO');
      console.log('🔧 [EDIT-DEBUG] This is why changes are not persisted to the database');
      
      // ACTUAL API CALL - Replace the simulation with real API call
      console.log('🔧 [EDIT-DEBUG] Calling actual updateWorkspace API...');
      const updatedWorkspace = await updateWorkspace(editingWorkspace.id, {
        title: editWorkspaceTitle.trim()
      });
      
      console.log('✅ [EDIT-DEBUG] API call successful, updated workspace:', updatedWorkspace);
      
      // Close dialog and reset state
      setShowEditDialog(false);
      setEditingWorkspace(null);
      setEditWorkspaceTitle('');
      
      console.log('✅ [EDIT-DEBUG] Workspace update completed successfully with real API call');
    } catch (error) {
      console.error('❌ [EDIT-DEBUG] Failed to update workspace:', error);
      console.error('❌ [EDIT-DEBUG] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
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

      {/* Edit Workspace Dialog - Enhanced Glass Effect */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent
          className="max-w-md"
          style={{
            background: 'rgba(10, 10, 10, 0.3)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            border: '1px solid rgba(107, 107, 58, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#f3f4f6',
            boxShadow: `
              0 32px 64px -12px rgba(0, 0, 0, 0.8),
              0 0 0 1px rgba(107, 107, 58, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.15),
              inset 0 -1px 0 rgba(0, 0, 0, 0.3)
            `,
            borderRadius: '20px',
            padding: '2.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Glass reflection overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '60%',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 50%, transparent 100%)',
              pointerEvents: 'none',
              borderRadius: '20px 20px 0 0',
              zIndex: 1
            }}
          />
          
          {/* Content wrapper */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <DialogHeader
              className="pb-4"
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <DialogTitle
                className="text-xl font-semibold"
                style={{
                  background: 'linear-gradient(to right, #facc15, #fde047, #eab308)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}
              >
                Edit Workspace
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div>
                <Label
                  htmlFor="edit-workspace-title"
                  className="text-sm font-medium mb-3 block"
                  style={{
                    color: '#e5e7eb',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.75rem',
                    display: 'block'
                  }}
                >
                  Workspace Title
                </Label>
                <Input
                  id="edit-workspace-title"
                  value={editWorkspaceTitle}
                  onChange={(e) => setEditWorkspaceTitle(e.target.value)}
                  placeholder="Enter workspace title..."
                  className="rounded-lg px-4 py-3 transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#f3f4f6',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  onFocus={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.6)';
                    target.style.boxShadow = `
                      0 0 0 3px rgba(107, 107, 58, 0.15),
                      inset 0 1px 2px rgba(0, 0, 0, 0.1),
                      0 4px 12px rgba(107, 107, 58, 0.1)
                    `;
                    target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)';
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    target.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1)';
                    target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUpdating) {
                      handleUpdateWorkspace();
                    }
                  }}
                />
              </div>
            </div>
            
            <div
              className="flex justify-end space-x-3 pt-4"
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '1rem'
              }}
            >
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingWorkspace(null);
                  setEditWorkspaceTitle('');
                }}
                disabled={isUpdating}
                className="px-5 py-2.5 rounded-lg transition-all duration-300 font-medium"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#d1d5db',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)';
                  target.style.color = '#ffffff';
                  target.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  target.style.transform = 'translateY(-1px)';
                  target.style.boxShadow = 'inset 0 1px 2px rgba(255, 255, 255, 0.15), 0 4px 8px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)';
                  target.style.color = '#d1d5db';
                  target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  target.style.transform = 'translateY(0)';
                  target.style.boxShadow = 'inset 0 1px 2px rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1)';
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateWorkspace}
                disabled={!editWorkspaceTitle.trim() || isUpdating}
                className="px-5 py-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium"
                style={{
                  background: 'linear-gradient(135deg, #ca8a04 0%, #eab308 50%, #facc15 100%)',
                  color: '#000000',
                  fontWeight: '600',
                  boxShadow: `
                    0 0 0 1px rgba(107, 107, 58, 0.3),
                    0 4px 12px rgba(107, 107, 58, 0.3),
                    inset 0 1px 2px rgba(255, 255, 255, 0.2)
                  `,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(107, 107, 58, 0.4)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'linear-gradient(135deg, #eab308 0%, #facc15 50%, #fde047 100%)';
                  target.style.transform = 'translateY(-1px)';
                  target.style.boxShadow = `
                    0 0 0 1px rgba(107, 107, 58, 0.4),
                    0 6px 16px rgba(107, 107, 58, 0.4),
                    inset 0 1px 2px rgba(255, 255, 255, 0.3)
                  `;
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.background = 'linear-gradient(135deg, #ca8a04 0%, #eab308 50%, #facc15 100%)';
                  target.style.transform = 'translateY(0)';
                  target.style.boxShadow = `
                    0 0 0 1px rgba(107, 107, 58, 0.3),
                    0 4px 12px rgba(107, 107, 58, 0.3),
                    inset 0 1px 2px rgba(255, 255, 255, 0.2)
                  `;
                }}
              
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;