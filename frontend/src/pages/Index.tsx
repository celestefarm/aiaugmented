import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import Header from '../components/Header';
import ExplorationMap from '../components/ExplorationMap';
import LastMileBrief from '../components/LastMileBrief';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, updateWorkspace } = useWorkspace();
  const [currentView, setCurrentView] = useState<'exploration' | 'brief'>('exploration');

  // Redirect to dashboard if no workspace is selected
  useEffect(() => {
    if (!currentWorkspace) {
      navigate('/');
    }
  }, [currentWorkspace, navigate]);

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
          <p className="text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0A0A0A] text-[#E5E7EB] overflow-hidden">
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        title={currentWorkspace.title}
        onTitleChange={handleTitleChange}
      />
      
      <main className="flex-1 overflow-hidden">
        {currentView === 'exploration' ? (
          <ExplorationMap />
        ) : (
          <LastMileBrief />
        )}
      </main>
    </div>
  );
};

export default Index;