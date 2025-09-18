import React, { useState, useEffect } from 'react';
import { Edit, Save, FileText, Loader2 } from 'lucide-react';
import { useDocument } from '../contexts/DocumentContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const LastMileBrief: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { documentState, generateBriefForWorkspace, setBriefContent } = useDocument();
  const { currentWorkspace } = useWorkspace();
  const [briefTitle, setBriefTitle] = useState('Strategic Brief');

  // Generate brief when component mounts if no content exists
  useEffect(() => {
    if (currentWorkspace && !documentState.briefContent && !documentState.isGenerating) {
      generateBriefForWorkspace(currentWorkspace.id);
    }
  }, [currentWorkspace, documentState.briefContent, documentState.isGenerating, generateBriefForWorkspace]);

  // Update title when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      setBriefTitle(`Strategic Brief: ${currentWorkspace.title}`);
    }
  }, [currentWorkspace]);

  const handleGenerateBrief = async () => {
    if (currentWorkspace) {
      await generateBriefForWorkspace(currentWorkspace.id);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const getEditableStyles = () => {
    return isEditing 
      ? 'border border-dashed border-[#C6AC8E]/50 rounded px-2 py-1 hover:border-[#C6AC8E]/70 focus:border-[#C6AC8E] focus:outline-none transition-colors' 
      : '';
  };

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    if (isEditing) {
      setBriefContent(e.currentTarget.textContent || '');
    }
  };

  // Convert markdown to basic HTML for display
  const formatContent = (content: string) => {
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 text-[#C6AC8E]">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mb-3 text-[#C6AC8E] mt-6">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mb-2 text-[#EAE0D5] mt-4">$1</h3>')
      .replace(/^\*\*(.*)\*\*/gim, '<strong class="font-semibold text-[#EAE0D5]">$1</strong>')
      .replace(/^\*(.*)\*/gim, '<em class="italic text-[#C6AC8E]">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 text-[#EAE0D5]">• $1</li>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div 
      className={`flex-1 p-8 overflow-y-auto max-h-screen pb-8 ${isEditing ? 'is-editing' : ''}`} 
      style={{ 
        scrollBehavior: 'smooth',
        background: 'linear-gradient(135deg, #0A0908 0%, #22333B 100%)'
      }}
    >
      {/* Report Header */}
      <div 
        className="p-8 mb-6 rounded-2xl border shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 51, 59, 0.8) 0%, rgba(34, 51, 59, 0.6) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(198, 172, 142, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(234, 224, 213, 0.1)'
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1
              className={`text-4xl font-bold mb-3 ${getEditableStyles()}`}
              style={{ color: '#EAE0D5' }}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={(e) => setBriefTitle(e.currentTarget.textContent || '')}
            >
              {briefTitle}
            </h1>
            <div className="flex items-center space-x-4 text-sm mb-4" style={{ color: '#C6AC8E' }}>
              {documentState.lastGenerated && (
                <>
                  <span>Generated: {new Date(documentState.lastGenerated).toLocaleDateString()}</span>
                  <span>•</span>
                </>
              )}
              <span>Nodes: {documentState.nodeCount}</span>
              <span>•</span>
              <span>Connections: {documentState.edgeCount}</span>
            </div>
            {documentState.error && (
              <div className="text-red-400 text-sm mb-4">
                Error: {documentState.error}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGenerateBrief}
              disabled={documentState.isGenerating || !currentWorkspace}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(94, 80, 63, 0.3) 0%, rgba(94, 80, 63, 0.2) 100%)',
                color: '#5E503F',
                border: '1px solid rgba(94, 80, 63, 0.4)',
                boxShadow: '0 4px 15px rgba(94, 80, 63, 0.1)'
              }}
            >
              {documentState.isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{documentState.isGenerating ? 'Generating...' : 'Generate Brief'}</span>
            </button>
            <button
              onClick={handleEditToggle}
              disabled={!documentState.briefContent}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(198, 172, 142, 0.2) 0%, rgba(198, 172, 142, 0.1) 100%)',
                color: '#C6AC8E',
                border: '1px solid rgba(198, 172, 142, 0.3)',
                boxShadow: '0 4px 15px rgba(198, 172, 142, 0.1)'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(198, 172, 142, 0.3) 0%, rgba(198, 172, 142, 0.2) 100%)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(198, 172, 142, 0.2) 0%, rgba(198, 172, 142, 0.1) 100%)';
                }
              }}
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              <span>{isEditing ? 'Save Changes' : 'Edit Brief'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="p-8 rounded-2xl border shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 51, 59, 0.6) 0%, rgba(34, 51, 59, 0.4) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(198, 172, 142, 0.15)',
          boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(234, 224, 213, 0.05)'
        }}
      >
        {documentState.isGenerating ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#C6AC8E' }} />
              <p style={{ color: '#EAE0D5' }}>Generating strategic brief from workspace data...</p>
              <p className="text-sm mt-2" style={{ color: '#C6AC8E' }}>
                Processing {documentState.nodeCount} nodes and {documentState.edgeCount} connections
              </p>
            </div>
          </div>
        ) : documentState.briefContent ? (
          <div
            className={`prose prose-invert max-w-none ${isEditing ? getEditableStyles() : ''}`}
            style={{ 
              color: '#EAE0D5',
              lineHeight: '1.7'
            }}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onInput={handleContentChange}
            dangerouslySetInnerHTML={{
              __html: isEditing ? documentState.briefContent : formatContent(documentState.briefContent)
            }}
          />
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: '#C6AC8E' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#EAE0D5' }}>
              No Brief Generated Yet
            </h3>
            <p className="mb-6" style={{ color: '#C6AC8E' }}>
              Click "Generate Brief" to create a strategic summary from your workspace data.
            </p>
            <button
              onClick={handleGenerateBrief}
              disabled={!currentWorkspace}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
              style={{
                background: 'linear-gradient(135deg, rgba(94, 80, 63, 0.3) 0%, rgba(94, 80, 63, 0.2) 100%)',
                color: '#5E503F',
                border: '1px solid rgba(94, 80, 63, 0.4)',
                boxShadow: '0 4px 15px rgba(94, 80, 63, 0.1)'
              }}
            >
              <FileText className="w-4 h-4" />
              <span>Generate Brief</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LastMileBrief;