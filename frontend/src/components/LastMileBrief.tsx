import React, { useState } from 'react';
import { LastMileBriefCanvas } from './LastMileBrief/index';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { apiClient } from '../lib/api';

const LastMileBrief: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleExport = async () => {
    if (currentWorkspace) {
      try {
        await apiClient.exportWorkspace(currentWorkspace.id);
      } catch (error) {
        console.error('Export failed:', error);
      }
    }
  };

  const handleShare = () => {
    // Implement share functionality
    console.log('Share functionality not implemented yet');
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2 text-[#EAE0D5]">
            No Workspace Selected
          </h3>
          <p className="text-[#C6AC8E]">
            Please select a workspace to generate a strategic brief.
          </p>
        </div>
      </div>
    );
  }

  return (
    <LastMileBriefCanvas
      workspaceId={currentWorkspace.id}
      refreshTrigger={refreshTrigger}
      onExport={handleExport}
      onShare={handleShare}
    />
  );
};

export default LastMileBrief;