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
  RefreshCw,
  Home
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
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
  const [newWorkspaceSituation, setNewWorkspaceSituation] = useState('');
  const [newWorkspaceGoal, setNewWorkspaceGoal] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Strategic depth fields (optional)
  const [showStrategicDepth, setShowStrategicDepth] = useState(false);
  const [unspokenDynamics, setUnspokenDynamics] = useState('');
  const [breakthroughPotential, setBreakthroughPotential] = useState('');
  const [whyThisMatters, setWhyThisMatters] = useState('');
  const [enduringValue, setEnduringValue] = useState('');

  // Local state for edit workspace dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [editWorkspaceTitle, setEditWorkspaceTitle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Local state for account dialog
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPosition, setAccountPosition] = useState('');
  const [accountGoal, setAccountGoal] = useState('');
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

  // Local state for workspace status tracking
  const [workspaceStatuses, setWorkspaceStatuses] = useState<{[key: string]: boolean}>({});

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  // Initialize workspace statuses when workspaces load
  useEffect(() => {
    if (workspaces.length > 0) {
      const initialStatuses: {[key: string]: boolean} = {};
      workspaces.forEach(workspace => {
        // Initialize all workspaces as active by default
        initialStatuses[workspace.id] = true;
      });
      setWorkspaceStatuses(initialStatuses);
    }
  }, [workspaces]);

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
    console.log('🏠 HOME BUTTON CLICKED - navigating to landing page');
    
    // Navigate to the landing page (home)
    navigate('/');
    
    console.log('✅ Navigated to landing page');
  };

  // Handle create workspace
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceTitle.trim() || !newWorkspaceSituation.trim() || !newWorkspaceGoal.trim()) {
      console.log('❌ [CREATE-DEBUG] Validation failed - missing required fields');
      console.log('  - title:', newWorkspaceTitle);
      console.log('  - situation:', newWorkspaceSituation);
      console.log('  - goal:', newWorkspaceGoal);
      return;
    }

    try {
      setIsCreating(true);
      const workspace = await createWorkspace({
        title: newWorkspaceTitle.trim(),
        settings: {
          situation: newWorkspaceSituation.trim(),
          goal: newWorkspaceGoal.trim(),
          // Strategic depth fields (optional)
          ...(unspokenDynamics.trim() && { unspokenDynamics: unspokenDynamics.trim() }),
          ...(breakthroughPotential.trim() && { breakthroughPotential: breakthroughPotential.trim() }),
          ...(whyThisMatters.trim() && { whyThisMatters: whyThisMatters.trim() }),
          ...(enduringValue.trim() && { enduringValue: enduringValue.trim() })
        },
        transform: { x: 0, y: 0, scale: 1 }
      });
      
      setShowCreateDialog(false);
      setNewWorkspaceTitle('');
      setNewWorkspaceSituation('');
      setNewWorkspaceGoal('');
      setShowStrategicDepth(false);
      setUnspokenDynamics('');
      setBreakthroughPotential('');
      setWhyThisMatters('');
      setEnduringValue('');
      
      // Navigate to the new workspace (no need to call selectWorkspace since createWorkspace now sets it as current)
      console.log('=== DASHBOARD: WORKSPACE CREATED ===');
      console.log('New workspace ID:', workspace.id);
      console.log('Workspace context:', { situation: newWorkspaceSituation.trim(), goal: newWorkspaceGoal.trim() });
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
    console.log('🔧 [EDIT-DEBUG] Current showEditDialog state:', showEditDialog);
    
    try {
      setEditingWorkspace(workspace);
      setEditWorkspaceTitle(workspace.title);
      setShowEditDialog(true);
      console.log('✅ [EDIT-DEBUG] Edit dialog state set to true');
      console.log('✅ [EDIT-DEBUG] Editing workspace:', workspace);
      console.log('✅ [EDIT-DEBUG] Edit workspace title:', workspace.title);
      
      // Add a small delay to ensure state is updated
      setTimeout(() => {
        console.log('🔧 [EDIT-DEBUG] After timeout - showEditDialog:', showEditDialog);
      }, 100);
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

  // Handle update account
  const handleUpdateAccount = async () => {
    if (!accountName.trim()) {
      console.log('❌ [ACCOUNT-DEBUG] Validation failed - missing name');
      console.log('  - accountName:', accountName);
      return;
    }

    console.log('🔧 [ACCOUNT-DEBUG] Starting account update process...');
    console.log('  - Current name:', user?.name);
    console.log('  - New name:', accountName.trim());

    try {
      setIsUpdatingAccount(true);
      
      // Use the real API call to update user profile
      console.log('🔧 [ACCOUNT-DEBUG] Calling real updateUser API...');
      await updateUser({
        name: accountName.trim()
      });
      
      console.log('✅ [ACCOUNT-DEBUG] API call successful');
      
      // Close dialog and reset state
      setShowAccountDialog(false);
      setAccountName('');
      setAccountEmail('');
      setAccountPosition('');
      setAccountGoal('');
      
      console.log('✅ [ACCOUNT-DEBUG] Account update completed successfully with real API call');
    } catch (error) {
      console.error('❌ [ACCOUNT-DEBUG] Failed to update account:', error);
      console.error('❌ [ACCOUNT-DEBUG] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  // Handle workspace status toggle
  const handleToggleWorkspaceStatus = (workspaceId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent workspace selection when clicking status
    console.log('🔧 [STATUS-DEBUG] Toggling status for workspace:', workspaceId);
    
    setWorkspaceStatuses(prev => {
      const newStatus = !prev[workspaceId];
      console.log('✅ [STATUS-DEBUG] Status changed to:', newStatus ? 'Active' : 'Inactive');
      return {
        ...prev,
        [workspaceId]: newStatus
      };
    });
  };

  // Handle workspace selection
  const handleSelectWorkspace = (workspace: any) => {
    // Check if workspace is active before allowing access
    const isActive = workspaceStatuses[workspace.id] !== false;
    
    if (!isActive) {
      console.log('❌ [ACCESS-DEBUG] Access denied - workspace is inactive:', workspace.id, workspace.title);
      // You could show a toast notification here in the future
      return;
    }
    
    console.log('✅ [ACCESS-DEBUG] Access granted - workspace is active:', workspace.id, workspace.title);
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
              onClick={handleHome}
              className="bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black font-medium"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button
              onClick={() => {
                console.log('🔍 [FORM-DEBUG] New Workspace button clicked - opening dialog');
                setShowCreateDialog(true);
              }}
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
            {/* Account Section */}
            <div className="mb-8">
              <div className="max-w-md">
                <div
                  className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm border border-blue-500/20 p-6 rounded-xl cursor-pointer hover:scale-[1.02] transition-all duration-300 group shadow-lg hover:shadow-blue-500/10"
                  style={{
                    boxShadow: `
                      0 0 20px rgba(59, 130, 246, 0.15),
                      0 0 40px rgba(147, 51, 234, 0.1),
                      0 4px 20px rgba(0, 0, 0, 0.1)
                    `
                  }}
                  onClick={() => {
                    setAccountName(user?.name || '');
                    setAccountEmail(user?.email || '');
                    setAccountPosition(''); // TODO: Get from user profile when available
                    setAccountGoal(''); // TODO: Get from user profile when available
                    setShowAccountDialog(true);
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLDivElement;
                    target.style.boxShadow = `
                      0 0 30px rgba(59, 130, 246, 0.25),
                      0 0 60px rgba(147, 51, 234, 0.15),
                      0 8px 32px rgba(0, 0, 0, 0.15)
                    `;
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLDivElement;
                    target.style.boxShadow = `
                      0 0 20px rgba(59, 130, 246, 0.15),
                      0 0 40px rgba(147, 51, 234, 0.1),
                      0 4px 20px rgba(0, 0, 0, 0.1)
                    `;
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-400/30">
                        <User className="w-7 h-7 text-blue-300" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-300/80 font-medium">Account Settings</p>
                        <p className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors">Premium Plan</p>
                        <p className="text-xs text-gray-400 mt-1">Click to manage your profile</p>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
                {workspaces.map((workspace) => {
                  // Define isActive for this specific workspace
                  const isActive = workspaceStatuses[workspace.id] !== false;
                  
                  return (
                    <div
                      key={workspace.id}
                      onClick={() => handleSelectWorkspace(workspace)}
                      className={`glass-pane p-6 rounded-lg transition-all duration-200 group border border-gray-800/50 relative ${
                        isActive
                          ? 'cursor-pointer hover:scale-105 hover:border-[#6B6B3A]/30'
                          : 'cursor-not-allowed opacity-60'
                      }`}
                    >
                      {/* Main content area */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-4">
                          <h3 className={`text-lg font-semibold mb-2 transition-colors ${
                            isActive
                              ? 'text-white group-hover:text-[#6B6B3A]'
                              : 'text-gray-400'
                          }`}>
                            {workspace.title}
                          </h3>
                          <p className={`text-sm ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                            Created {formatDate(workspace.created_at)}
                          </p>
                          {workspace.updated_at !== workspace.created_at && (
                            <p className={`text-xs ${isActive ? 'text-gray-500' : 'text-gray-600'}`}>
                              Updated {formatDate(workspace.updated_at)}
                            </p>
                          )}
                        </div>
                        
                        <div className={`flex space-x-1 transition-opacity ${
                          isActive ? 'opacity-0 group-hover:opacity-100' : 'opacity-50'
                        }`}>
                          <Button
                            onClick={(e) => handleEditWorkspace(workspace, e)}
                            variant="outline"
                            size="sm"
                            disabled={!isActive}
                            className={`border-gray-600 text-gray-400 ${
                              isActive
                                ? 'hover:text-[#6B6B3A] hover:border-[#6B6B3A]'
                                : 'cursor-not-allowed opacity-50'
                            }`}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                            variant="outline"
                            size="sm"
                            disabled={!isActive}
                            className={`border-gray-600 text-gray-400 ${
                              isActive
                                ? 'hover:text-red-400 hover:border-red-400'
                                : 'cursor-not-allowed opacity-50'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    
                      {/* Fixed position status label at bottom-right */}
                      <div className="absolute bottom-4 right-4">
                        <button
                          onClick={(e) => handleToggleWorkspaceStatus(workspace.id, e)}
                          className={`px-2 py-1 rounded transition-all duration-200 hover:scale-105 cursor-pointer text-xs ${
                            workspaceStatuses[workspace.id] !== false
                              ? 'bg-[#6B6B3A]/20 text-[#6B6B3A] hover:bg-[#6B6B3A]/30'
                              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                          }`}
                        >
                          {workspaceStatuses[workspace.id] !== false ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Workspace Dialog - Node Card Style */}
      {showCreateDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            console.log('🔍 [FORM-DEBUG] Dialog overlay clicked - closing dialog');
            setShowCreateDialog(false);
          }}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(45, 45, 45, 0.75) 0%, rgba(35, 35, 35, 0.85) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(107, 107, 58, 0.25)',
              borderTop: '1px solid rgba(107, 107, 58, 0.35)',
              borderRadius: '16px',
              boxShadow: `
                0 20px 40px rgba(0, 0, 0, 0.4),
                0 8px 16px rgba(0, 0, 0, 0.2),
                inset 0 1px 2px rgba(255, 255, 255, 0.08)
              `,
              width: '100%',
              maxWidth: '800px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => {
              console.log('🔍 [FORM-DEBUG] Dialog content clicked - preventing close');
              e.stopPropagation();
            }}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowCreateDialog(false);
                setNewWorkspaceTitle('');
                setNewWorkspaceSituation('');
                setNewWorkspaceGoal('');
                setShowStrategicDepth(false);
                setUnspokenDynamics('');
                setBreakthroughPotential('');
                setWhyThisMatters('');
                setEnduringValue('');
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(107, 107, 58, 0.15)',
                border: '1px solid rgba(107, 107, 58, 0.25)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = 'rgba(107, 107, 58, 0.25)';
                target.style.color = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = 'rgba(107, 107, 58, 0.15)';
                target.style.color = '#9ca3af';
              }}
            >
              ×
            </button>

            {/* Header with icon */}
            <div
              style={{
                padding: '24px 24px 20px 24px',
                borderBottom: '1px solid rgba(107, 107, 58, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b6b3a'
                }}
              >
                <Plus className="w-5 h-5" />
              </div>
              <h2
                style={{
                  color: '#f3f4f6',
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: 0,
                  letterSpacing: '-0.025em'
                }}
              >
                Create New Workspace
              </h2>
            </div>
            
            {/* Content area */}
            <div
              style={{
                padding: '32px',
                background: 'linear-gradient(145deg, rgba(40, 40, 40, 0.4) 0%, rgba(30, 30, 30, 0.6) 100%)',
                margin: '0',
                minHeight: showStrategicDepth ? '480px' : '280px',
                transition: 'min-height 0.3s ease'
              }}
            >
              {/* Main Fields - Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Left Column */}
                <div>
                  {/* Workspace Title Field */}
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      htmlFor="create-workspace-title"
                      style={{
                        color: '#d1d5db',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px',
                        display: 'block',
                        letterSpacing: '-0.025em'
                      }}
                    >
                      Workspace Title
                    </label>
                    <input
                      id="create-workspace-title"
                      type="text"
                      value={newWorkspaceTitle}
                      onChange={(e) => setNewWorkspaceTitle(e.target.value)}
                      placeholder="Enter workspace title..."
                      autoFocus
                      style={{
                        background: 'rgba(55, 55, 55, 0.6)',
                        border: '1px solid rgba(107, 107, 58, 0.25)',
                        borderRadius: '8px',
                        color: '#f3f4f6',
                        fontSize: '15px',
                        fontWeight: '400',
                        width: '100%',
                        padding: '12px 16px',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
                        pointerEvents: 'auto',
                        userSelect: 'text',
                        zIndex: 1001
                      }}
                      onFocus={(e) => {
                        console.log('🔍 [FORM-DEBUG] Title field focused');
                        const target = e.target as HTMLInputElement;
                        target.style.borderColor = 'rgba(107, 107, 58, 0.4)';
                        target.style.background = 'rgba(60, 60, 60, 0.7)';
                        target.style.boxShadow = `
                          0 0 0 3px rgba(107, 107, 58, 0.12),
                          inset 0 1px 3px rgba(0, 0, 0, 0.15)
                        `;
                      }}
                      onBlur={(e) => {
                        console.log('🔍 [FORM-DEBUG] Title field blurred');
                        const target = e.target as HTMLInputElement;
                        target.style.borderColor = 'rgba(107, 107, 58, 0.25)';
                        target.style.background = 'rgba(55, 55, 55, 0.6)';
                        target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.15)';
                      }}
                      onClick={(e) => {
                        console.log('🔍 [FORM-DEBUG] Title field clicked');
                        e.stopPropagation();
                      }}
                      onInput={(e) => {
                        console.log('🔍 [FORM-DEBUG] Title field input:', (e.target as HTMLInputElement).value);
                      }}
                    />
                  </div>

                  {/* Current Situation / Problem Field */}
                  <div>
                    <label
                      htmlFor="create-workspace-situation"
                      style={{
                        color: '#d1d5db',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px',
                        display: 'block',
                        letterSpacing: '-0.025em'
                      }}
                    >
                      Current Situation / Problem
                    </label>
                    <textarea
                      id="create-workspace-situation"
                      value={newWorkspaceSituation}
                      onChange={(e) => setNewWorkspaceSituation(e.target.value)}
                      placeholder="Describe your current situation or the challenges you're facing..."
                      rows={4}
                      style={{
                        background: 'rgba(55, 55, 55, 0.6)',
                        border: '1px solid rgba(107, 107, 58, 0.25)',
                        borderRadius: '8px',
                        color: '#f3f4f6',
                        fontSize: '15px',
                        fontWeight: '400',
                        width: '100%',
                        padding: '12px 16px',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
                        resize: 'vertical',
                        minHeight: '100px',
                        fontFamily: 'inherit',
                        pointerEvents: 'auto',
                        userSelect: 'text',
                        zIndex: 1001
                      }}
                      onFocus={(e) => {
                        console.log('🔍 [FORM-DEBUG] Situation field focused');
                        const target = e.target as HTMLTextAreaElement;
                        target.style.borderColor = 'rgba(107, 107, 58, 0.4)';
                        target.style.background = 'rgba(60, 60, 60, 0.7)';
                        target.style.boxShadow = `
                          0 0 0 3px rgba(107, 107, 58, 0.12),
                          inset 0 1px 3px rgba(0, 0, 0, 0.15)
                        `;
                      }}
                      onBlur={(e) => {
                        console.log('🔍 [FORM-DEBUG] Situation field blurred');
                        const target = e.target as HTMLTextAreaElement;
                        target.style.borderColor = 'rgba(107, 107, 58, 0.25)';
                        target.style.background = 'rgba(55, 55, 55, 0.6)';
                        target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.15)';
                      }}
                      onClick={(e) => {
                        console.log('🔍 [FORM-DEBUG] Situation field clicked');
                        e.stopPropagation();
                      }}
                      onInput={(e) => {
                        console.log('🔍 [FORM-DEBUG] Situation field input:', (e.target as HTMLTextAreaElement).value);
                      }}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  {/* Goal / Desired Outcome Field */}
                  <div>
                    <label
                      htmlFor="create-workspace-goal"
                      style={{
                        color: '#d1d5db',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px',
                        display: 'block',
                        letterSpacing: '-0.025em'
                      }}
                    >
                      Goal / Desired Outcome
                    </label>
                    <textarea
                      id="create-workspace-goal"
                      value={newWorkspaceGoal}
                      onChange={(e) => setNewWorkspaceGoal(e.target.value)}
                      placeholder="Describe what you want to achieve and your desired outcome..."
                      rows={6}
                      style={{
                        background: 'rgba(55, 55, 55, 0.6)',
                        border: '1px solid rgba(107, 107, 58, 0.25)',
                        borderRadius: '8px',
                        color: '#f3f4f6',
                        fontSize: '15px',
                        fontWeight: '400',
                        width: '100%',
                        padding: '12px 16px',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
                        resize: 'vertical',
                        minHeight: '140px',
                        fontFamily: 'inherit',
                        pointerEvents: 'auto',
                        userSelect: 'text',
                        zIndex: 1001
                      }}
                      onFocus={(e) => {
                        console.log('🔍 [FORM-DEBUG] Goal field focused');
                        const target = e.target as HTMLTextAreaElement;
                        target.style.borderColor = 'rgba(107, 107, 58, 0.4)';
                        target.style.background = 'rgba(60, 60, 60, 0.7)';
                        target.style.boxShadow = `
                          0 0 0 3px rgba(107, 107, 58, 0.12),
                          inset 0 1px 3px rgba(0, 0, 0, 0.15)
                        `;
                      }}
                      onBlur={(e) => {
                        console.log('🔍 [FORM-DEBUG] Goal field blurred');
                        const target = e.target as HTMLTextAreaElement;
                        target.style.borderColor = 'rgba(107, 107, 58, 0.25)';
                        target.style.background = 'rgba(55, 55, 55, 0.6)';
                        target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.15)';
                      }}
                      onClick={(e) => {
                        console.log('🔍 [FORM-DEBUG] Goal field clicked');
                        e.stopPropagation();
                      }}
                      onInput={(e) => {
                        console.log('🔍 [FORM-DEBUG] Goal field input:', (e.target as HTMLTextAreaElement).value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey && !isCreating) {
                          handleCreateWorkspace();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Expandable Strategic Depth Section */}
              <div style={{ marginTop: '24px', borderTop: '1px solid rgba(107, 107, 58, 0.15)', paddingTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowStrategicDepth(!showStrategicDepth)}
                  style={{
                    background: 'rgba(107, 107, 58, 0.1)',
                    border: '1px solid rgba(107, 107, 58, 0.2)',
                    borderRadius: '8px',
                    color: '#d1d5db',
                    fontSize: '14px',
                    fontWeight: '500',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '-0.025em',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.background = 'rgba(107, 107, 58, 0.15)';
                    target.style.color = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.background = 'rgba(107, 107, 58, 0.1)';
                    target.style.color = '#d1d5db';
                  }}
                >
                  <span>Add Strategic Depth</span>
                  <span style={{
                    transform: showStrategicDepth ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    fontSize: '12px'
                  }}>
                    ▼
                  </span>
                </button>

                {/* Collapsible Strategic Depth Fields */}
                {showStrategicDepth && (
                  <div style={{
                    marginTop: '16px',
                    padding: '20px',
                    background: 'rgba(30, 30, 30, 0.3)',
                    borderRadius: '8px',
                    border: '1px solid rgba(107, 107, 58, 0.1)'
                  }}>
                    {/* Strategic Depth Fields - Two Column Layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {/* Left Column */}
                      <div>
                        {/* Unspoken Dynamics Field */}
                        <div style={{ marginBottom: '16px' }}>
                          <label
                            htmlFor="create-workspace-dynamics"
                            style={{
                              color: '#d1d5db',
                              fontSize: '13px',
                              fontWeight: '500',
                              marginBottom: '6px',
                              display: 'block',
                              letterSpacing: '-0.025em'
                            }}
                          >
                            Unspoken Dynamics
                          </label>
                          <textarea
                            id="create-workspace-dynamics"
                            value={unspokenDynamics}
                            onChange={(e) => setUnspokenDynamics(e.target.value)}
                            placeholder="What underlying forces or hidden patterns might influence this situation?"
                            rows={3}
                            style={{
                              background: 'rgba(45, 45, 45, 0.6)',
                              border: '1px solid rgba(107, 107, 58, 0.2)',
                              borderRadius: '6px',
                              color: '#f3f4f6',
                              fontSize: '14px',
                              fontWeight: '400',
                              width: '100%',
                              padding: '10px 12px',
                              outline: 'none',
                              transition: 'all 0.2s ease',
                              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                              resize: 'vertical',
                              minHeight: '80px',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.borderColor = 'rgba(107, 107, 58, 0.35)';
                              target.style.background = 'rgba(50, 50, 50, 0.7)';
                            }}
                            onBlur={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.borderColor = 'rgba(107, 107, 58, 0.2)';
                              target.style.background = 'rgba(45, 45, 45, 0.6)';
                            }}
                          />
                        </div>

                        {/* Why This Truly Matters Field */}
                        <div>
                          <label
                            htmlFor="create-workspace-matters"
                            style={{
                              color: '#d1d5db',
                              fontSize: '13px',
                              fontWeight: '500',
                              marginBottom: '6px',
                              display: 'block',
                              letterSpacing: '-0.025em'
                            }}
                          >
                            Why This Truly Matters
                          </label>
                          <textarea
                            id="create-workspace-matters"
                            value={whyThisMatters}
                            onChange={(e) => setWhyThisMatters(e.target.value)}
                            placeholder="What deeper significance or profound impact makes this worth pursuing?"
                            rows={3}
                            style={{
                              background: 'rgba(45, 45, 45, 0.6)',
                              border: '1px solid rgba(107, 107, 58, 0.2)',
                              borderRadius: '6px',
                              color: '#f3f4f6',
                              fontSize: '14px',
                              fontWeight: '400',
                              width: '100%',
                              padding: '10px 12px',
                              outline: 'none',
                              transition: 'all 0.2s ease',
                              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                              resize: 'vertical',
                              minHeight: '80px',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.borderColor = 'rgba(107, 107, 58, 0.35)';
                              target.style.background = 'rgba(50, 50, 50, 0.7)';
                            }}
                            onBlur={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.borderColor = 'rgba(107, 107, 58, 0.2)';
                              target.style.background = 'rgba(45, 45, 45, 0.6)';
                            }}
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div>
                        {/* Breakthrough Potential Field */}
                        <div style={{ marginBottom: '16px' }}>
                          <label
                            htmlFor="create-workspace-breakthrough"
                            style={{
                              color: '#d1d5db',
                              fontSize: '13px',
                              fontWeight: '500',
                              marginBottom: '6px',
                              display: 'block',
                              letterSpacing: '-0.025em'
                            }}
                          >
                            Breakthrough Potential
                          </label>
                          <textarea
                            id="create-workspace-breakthrough"
                            value={breakthroughPotential}
                            onChange={(e) => setBreakthroughPotential(e.target.value)}
                            placeholder="What transformative opportunities or game-changing possibilities exist here?"
                            rows={3}
                            style={{
                              background: 'rgba(45, 45, 45, 0.6)',
                              border: '1px solid rgba(107, 107, 58, 0.2)',
                              borderRadius: '6px',
                              color: '#f3f4f6',
                              fontSize: '14px',
                              fontWeight: '400',
                              width: '100%',
                              padding: '10px 12px',
                              outline: 'none',
                              transition: 'all 0.2s ease',
                              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                              resize: 'vertical',
                              minHeight: '80px',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.borderColor = 'rgba(107, 107, 58, 0.35)';
                              target.style.background = 'rgba(50, 50, 50, 0.7)';
                            }}
                            onBlur={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.borderColor = 'rgba(107, 107, 58, 0.2)';
                              target.style.background = 'rgba(45, 45, 45, 0.6)';
                            }}
                          />
                        </div>

                        {/* Enduring Value Field */}
                        <div>
                          <label
                            htmlFor="create-workspace-value"
                            style={{
                              color: '#d1d5db',
                              fontSize: '13px',
                              fontWeight: '500',
                              marginBottom: '6px',
                              display: 'block',
                              letterSpacing: '-0.025em'
                            }}
                          >
                            Enduring Value
                          </label>
                          <textarea
                            id="create-workspace-value"
                            value={enduringValue}
                            onChange={(e) => setEnduringValue(e.target.value)}
                            placeholder="What lasting benefits or timeless value will this create beyond immediate results?"
                            rows={3}
                            style={{
                              background: 'rgba(45, 45, 45, 0.6)',
                              border: '1px solid rgba(107, 107, 58, 0.2)',
                              borderRadius: '6px',
                              color: '#f3f4f6',
                              fontSize: '14px',
                              fontWeight: '400',
                              width: '100%',
                              padding: '10px 12px',
                              outline: 'none',
                              transition: 'all 0.2s ease',
                              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                              resize: 'vertical',
                              minHeight: '80px',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.borderColor = 'rgba(107, 107, 58, 0.35)';
                              target.style.background = 'rgba(50, 50, 50, 0.7)';
                            }}
                            onBlur={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.borderColor = 'rgba(107, 107, 58, 0.2)';
                              target.style.background = 'rgba(45, 45, 45, 0.6)';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer with action buttons */}
            <div
              style={{
                padding: '20px 24px 24px 24px',
                borderTop: '1px solid rgba(107, 107, 58, 0.15)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'linear-gradient(145deg, rgba(45, 45, 45, 0.6) 0%, rgba(35, 35, 35, 0.7) 100%)'
              }}
            >
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewWorkspaceTitle('');
                  setNewWorkspaceSituation('');
                  setNewWorkspaceGoal('');
                  setShowStrategicDepth(false);
                  setUnspokenDynamics('');
                  setBreakthroughPotential('');
                  setWhyThisMatters('');
                  setEnduringValue('');
                }}
                disabled={isCreating}
                style={{
                  background: 'rgba(107, 107, 58, 0.12)',
                  border: '1px solid rgba(107, 107, 58, 0.2)',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.025em'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'rgba(107, 107, 58, 0.2)';
                  target.style.color = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'rgba(107, 107, 58, 0.12)';
                  target.style.color = '#d1d5db';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceTitle.trim() || !newWorkspaceSituation.trim() || !newWorkspaceGoal.trim() || isCreating}
                style={{
                  background: 'linear-gradient(145deg, rgba(107, 107, 58, 0.6) 0%, rgba(107, 107, 58, 0.4) 100%)',
                  border: '1px solid rgba(107, 107, 58, 0.3)',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.025em',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'linear-gradient(145deg, rgba(107, 107, 58, 0.7) 0%, rgba(107, 107, 58, 0.5) 100%)';
                  target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.25)';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'linear-gradient(145deg, rgba(107, 107, 58, 0.6) 0%, rgba(107, 107, 58, 0.4) 100%)';
                  target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
                }}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Workspace Dialog - Node Card Style */}
      {showEditDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowEditDialog(false)}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(45, 45, 45, 0.75) 0%, rgba(35, 35, 35, 0.85) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(107, 107, 58, 0.25)',
              borderTop: '1px solid rgba(107, 107, 58, 0.35)',
              borderRadius: '16px',
              boxShadow: `
                0 20px 40px rgba(0, 0, 0, 0.4),
                0 8px 16px rgba(0, 0, 0, 0.2),
                inset 0 1px 2px rgba(255, 255, 255, 0.08)
              `,
              width: '100%',
              maxWidth: '420px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                console.log('🔧 [EDIT-DEBUG] Close button clicked');
                setShowEditDialog(false);
                setEditingWorkspace(null);
                setEditWorkspaceTitle('');
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(107, 107, 58, 0.15)',
                border: '1px solid rgba(107, 107, 58, 0.25)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = 'rgba(107, 107, 58, 0.25)';
                target.style.color = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = 'rgba(107, 107, 58, 0.15)';
                target.style.color = '#9ca3af';
              }}
            >
              ×
            </button>

            {/* Header with icon */}
            <div
              style={{
                padding: '24px 24px 20px 24px',
                borderBottom: '1px solid rgba(107, 107, 58, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b6b3a'
                }}
              >
                <Edit className="w-5 h-5" />
              </div>
              <h2
                style={{
                  color: '#f3f4f6',
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: 0,
                  letterSpacing: '-0.025em'
                }}
              >
                Edit Workspace
              </h2>
            </div>
            
            {/* Content area */}
            <div
              style={{
                padding: '24px',
                background: 'linear-gradient(145deg, rgba(40, 40, 40, 0.4) 0%, rgba(30, 30, 30, 0.6) 100%)',
                margin: '0',
                minHeight: '120px'
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="edit-workspace-title"
                  style={{
                    color: '#d1d5db',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    display: 'block',
                    letterSpacing: '-0.025em'
                  }}
                >
                  Workspace Title
                </label>
                <input
                  id="edit-workspace-title"
                  type="text"
                  value={editWorkspaceTitle}
                  onChange={(e) => setEditWorkspaceTitle(e.target.value)}
                  placeholder="Enter workspace title..."
                  style={{
                    background: 'rgba(55, 55, 55, 0.6)',
                    border: '1px solid rgba(107, 107, 58, 0.25)',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                    fontSize: '15px',
                    fontWeight: '400',
                    width: '100%',
                    padding: '12px 16px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)'
                  }}
                  onFocus={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.4)';
                    target.style.background = 'rgba(60, 60, 60, 0.7)';
                    target.style.boxShadow = `
                      0 0 0 3px rgba(107, 107, 58, 0.12),
                      inset 0 1px 3px rgba(0, 0, 0, 0.15)
                    `;
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.25)';
                    target.style.background = 'rgba(55, 55, 55, 0.6)';
                    target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.15)';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUpdating) {
                      handleUpdateWorkspace();
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Footer with action buttons */}
            <div
              style={{
                padding: '20px 24px 24px 24px',
                borderTop: '1px solid rgba(107, 107, 58, 0.15)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'linear-gradient(145deg, rgba(45, 45, 45, 0.6) 0%, rgba(35, 35, 35, 0.7) 100%)'
              }}
            >
              <button
                onClick={() => {
                  console.log('🔧 [EDIT-DEBUG] Cancel button clicked');
                  setShowEditDialog(false);
                  setEditingWorkspace(null);
                  setEditWorkspaceTitle('');
                }}
                disabled={isUpdating}
                style={{
                  background: 'rgba(107, 107, 58, 0.12)',
                  border: '1px solid rgba(107, 107, 58, 0.2)',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.025em'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'rgba(107, 107, 58, 0.2)';
                  target.style.color = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'rgba(107, 107, 58, 0.12)';
                  target.style.color = '#d1d5db';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateWorkspace}
                disabled={!editWorkspaceTitle.trim() || isUpdating}
                style={{
                  background: 'linear-gradient(145deg, rgba(107, 107, 58, 0.6) 0%, rgba(107, 107, 58, 0.4) 100%)',
                  border: '1px solid rgba(107, 107, 58, 0.3)',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.025em',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'linear-gradient(145deg, rgba(107, 107, 58, 0.7) 0%, rgba(107, 107, 58, 0.5) 100%)';
                  target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.25)';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'linear-gradient(145deg, rgba(107, 107, 58, 0.6) 0%, rgba(107, 107, 58, 0.4) 100%)';
                  target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
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
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Dialog - Node Card Style */}
      {showAccountDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowAccountDialog(false)}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, rgba(45, 45, 45, 0.75) 0%, rgba(35, 35, 35, 0.85) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(107, 107, 58, 0.25)',
              borderTop: '1px solid rgba(107, 107, 58, 0.35)',
              borderRadius: '16px',
              boxShadow: `
                0 20px 40px rgba(0, 0, 0, 0.4),
                0 8px 16px rgba(0, 0, 0, 0.2),
                inset 0 1px 2px rgba(255, 255, 255, 0.08)
              `,
              width: '100%',
              maxWidth: '420px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowAccountDialog(false);
                setAccountName('');
                setAccountEmail('');
                setAccountPosition('');
                setAccountGoal('');
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(107, 107, 58, 0.15)',
                border: '1px solid rgba(107, 107, 58, 0.25)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = 'rgba(107, 107, 58, 0.25)';
                target.style.color = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.background = 'rgba(107, 107, 58, 0.15)';
                target.style.color = '#9ca3af';
              }}
            >
              ×
            </button>

            {/* Header with icon */}
            <div
              style={{
                padding: '24px 24px 20px 24px',
                borderBottom: '1px solid rgba(107, 107, 58, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b6b3a'
                }}
              >
                <User className="w-5 h-5" />
              </div>
              <h2
                style={{
                  color: '#f3f4f6',
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: 0,
                  letterSpacing: '-0.025em'
                }}
              >
                Account Settings
              </h2>
            </div>
            
            {/* Content area */}
            <div
              style={{
                padding: '24px',
                background: 'linear-gradient(145deg, rgba(40, 40, 40, 0.4) 0%, rgba(30, 30, 30, 0.6) 100%)',
                margin: '0',
                minHeight: '280px'
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                {/* Full Name Field */}
                <label
                  htmlFor="account-name"
                  style={{
                    color: '#d1d5db',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    display: 'block',
                    letterSpacing: '-0.025em'
                  }}
                >
                  Full Name
                </label>
                <input
                  id="account-name"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter your full name..."
                  style={{
                    background: 'rgba(55, 55, 55, 0.6)',
                    border: '1px solid rgba(107, 107, 58, 0.25)',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                    fontSize: '15px',
                    fontWeight: '400',
                    width: '100%',
                    padding: '12px 16px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
                    marginBottom: '16px'
                  }}
                  onFocus={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.4)';
                    target.style.background = 'rgba(60, 60, 60, 0.7)';
                    target.style.boxShadow = `
                      0 0 0 3px rgba(107, 107, 58, 0.12),
                      inset 0 1px 3px rgba(0, 0, 0, 0.15)
                    `;
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.25)';
                    target.style.background = 'rgba(55, 55, 55, 0.6)';
                    target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.15)';
                  }}
                />
                
                {/* Email Field */}
                <label
                  htmlFor="account-email"
                  style={{
                    color: '#d1d5db',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    display: 'block',
                    letterSpacing: '-0.025em'
                  }}
                >
                  Email Address
                </label>
                <input
                  id="account-email"
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  style={{
                    background: 'rgba(55, 55, 55, 0.6)',
                    border: '1px solid rgba(107, 107, 58, 0.25)',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                    fontSize: '15px',
                    fontWeight: '400',
                    width: '100%',
                    padding: '12px 16px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
                    marginBottom: '16px'
                  }}
                  onFocus={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.4)';
                    target.style.background = 'rgba(60, 60, 60, 0.7)';
                    target.style.boxShadow = `
                      0 0 0 3px rgba(107, 107, 58, 0.12),
                      inset 0 1px 3px rgba(0, 0, 0, 0.15)
                    `;
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.25)';
                    target.style.background = 'rgba(55, 55, 55, 0.6)';
                    target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.15)';
                  }}
                />

                {/* Position Field */}
                <label
                  htmlFor="account-position"
                  style={{
                    color: '#d1d5db',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    display: 'block',
                    letterSpacing: '-0.025em'
                  }}
                >
                  Position/Title
                </label>
                <input
                  id="account-position"
                  type="text"
                  value={accountPosition}
                  onChange={(e) => setAccountPosition(e.target.value)}
                  placeholder="Enter your position or job title..."
                  style={{
                    background: 'rgba(55, 55, 55, 0.6)',
                    border: '1px solid rgba(107, 107, 58, 0.25)',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                    fontSize: '15px',
                    fontWeight: '400',
                    width: '100%',
                    padding: '12px 16px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
                    marginBottom: '16px'
                  }}
                  onFocus={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.4)';
                    target.style.background = 'rgba(60, 60, 60, 0.7)';
                    target.style.boxShadow = `
                      0 0 0 3px rgba(107, 107, 58, 0.12),
                      inset 0 1px 3px rgba(0, 0, 0, 0.15)
                    `;
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.25)';
                    target.style.background = 'rgba(55, 55, 55, 0.6)';
                    target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.15)';
                  }}
                />

                {/* Goal Field */}
                <label
                  htmlFor="account-goal"
                  style={{
                    color: '#d1d5db',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    display: 'block',
                    letterSpacing: '-0.025em'
                  }}
                >
                  Professional Goal
                </label>
                <textarea
                  id="account-goal"
                  value={accountGoal}
                  onChange={(e) => setAccountGoal(e.target.value)}
                  placeholder="Describe your professional goals or objectives..."
                  rows={3}
                  style={{
                    background: 'rgba(55, 55, 55, 0.6)',
                    border: '1px solid rgba(107, 107, 58, 0.25)',
                    borderRadius: '8px',
                    color: '#f3f4f6',
                    fontSize: '15px',
                    fontWeight: '400',
                    width: '100%',
                    padding: '12px 16px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
                    resize: 'vertical',
                    minHeight: '80px',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.4)';
                    target.style.background = 'rgba(60, 60, 60, 0.7)';
                    target.style.boxShadow = `
                      0 0 0 3px rgba(107, 107, 58, 0.12),
                      inset 0 1px 3px rgba(0, 0, 0, 0.15)
                    `;
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.borderColor = 'rgba(107, 107, 58, 0.25)';
                    target.style.background = 'rgba(55, 55, 55, 0.6)';
                    target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.15)';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey && !isUpdatingAccount) {
                      handleUpdateAccount();
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Footer with action buttons */}
            <div
              style={{
                padding: '20px 24px 24px 24px',
                borderTop: '1px solid rgba(107, 107, 58, 0.15)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'linear-gradient(145deg, rgba(45, 45, 45, 0.6) 0%, rgba(35, 35, 35, 0.7) 100%)'
              }}
            >
              <button
                onClick={() => {
                  setShowAccountDialog(false);
                  setAccountName('');
                  setAccountEmail('');
                  setAccountPosition('');
                  setAccountGoal('');
                }}
                disabled={isUpdatingAccount}
                style={{
                  background: 'rgba(107, 107, 58, 0.12)',
                  border: '1px solid rgba(107, 107, 58, 0.2)',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.025em'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'rgba(107, 107, 58, 0.2)';
                  target.style.color = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'rgba(107, 107, 58, 0.12)';
                  target.style.color = '#d1d5db';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAccount}
                disabled={!accountName.trim() || isUpdatingAccount}
                style={{
                  background: 'linear-gradient(145deg, rgba(107, 107, 58, 0.6) 0%, rgba(107, 107, 58, 0.4) 100%)',
                  border: '1px solid rgba(107, 107, 58, 0.3)',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.025em',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'linear-gradient(145deg, rgba(107, 107, 58, 0.7) 0%, rgba(107, 107, 58, 0.5) 100%)';
                  target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.25)';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = 'linear-gradient(145deg, rgba(107, 107, 58, 0.6) 0%, rgba(107, 107, 58, 0.4) 100%)';
                  target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
                }}
              >
                {isUpdatingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Update Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;