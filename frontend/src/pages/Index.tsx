import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import Header from '../components/Header';
import OptimizedExplorationMap from '../components/OptimizedExplorationMap';
import LastMileBrief from '../components/LastMileBrief';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, updateWorkspace, workspaces, isLoading, createWorkspace, selectWorkspace } = useWorkspace();
  const [currentView, setCurrentView] = useState<'exploration' | 'brief'>('exploration');
  const [isCreatingDefaultWorkspace, setIsCreatingDefaultWorkspace] = useState(false);

  // Handle workspace initialization
  useEffect(() => {
    const initializeWorkspace = async () => {
      // If we have a current workspace, we're good
      if (currentWorkspace?.id) {
        return;
      }

      // If we're still loading, wait
      if (isLoading) {
        return;
      }

      // If we have existing workspaces but no current one selected, select the first one
      if (workspaces.length > 0) {
        selectWorkspace(workspaces[0]);
        return;
      }

      // If no workspaces exist, create a default one
      if (workspaces.length === 0 && !isCreatingDefaultWorkspace) {
        setIsCreatingDefaultWorkspace(true);
        try {
          const defaultWorkspace = await createWorkspace({
            title: 'My First Workspace',
            settings: { active_agents: ['strategist'] },
            transform: { x: 0, y: 0, scale: 1 }
          });
          selectWorkspace(defaultWorkspace);
        } catch (error) {
          console.error('Failed to create default workspace:', error);
          navigate('/dashboard');
        } finally {
          setIsCreatingDefaultWorkspace(false);
        }
      }
    };

    initializeWorkspace();
  }, [currentWorkspace, workspaces, isLoading, navigate, createWorkspace, selectWorkspace, isCreatingDefaultWorkspace]);

  // Handle workspace title change
  const handleTitleChange = async (newTitle: string) => {
    if (!currentWorkspace || !newTitle.trim()) return;
    
    try {
      await updateWorkspace(currentWorkspace.id, { title: newTitle.trim() });
    } catch (error) {
      console.error('Failed to update workspace title:', error);
    }
  };

  // Show loading or redirect if no workspace
  if (!currentWorkspace) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0A0A0A] text-[#E5E7EB]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#6B6B3A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">
            {isCreatingDefaultWorkspace ? 'Creating your workspace...' : 'Loading workspace...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0A0A0A] text-[#E5E7EB] overflow-hidden">
      <Header
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          }}
        title={currentWorkspace.title}
        onTitleChange={handleTitleChange}
      />
      
      <main className="flex-1 overflow-hidden relative" style={{ height: 'calc(100vh - 80px)' }}>
        {(() => {
          if (currentView === 'exploration') {
            // Use the new optimized canvas implementation
            return <OptimizedExplorationMap key="exploration" />;
          } else {
            return <LastMileBrief key="brief" />;
          }
        })()}
      </main>
    </div>
  );
};

export default Index;