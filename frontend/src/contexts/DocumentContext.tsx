import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GenerateBriefResponse, generateBrief } from '../lib/api';

interface DocumentState {
  briefContent: string | null;
  isGenerating: boolean;
  lastGenerated: string | null;
  nodeCount: number;
  edgeCount: number;
  error: string | null;
}

interface DocumentContextType {
  documentState: DocumentState;
  generateBriefForWorkspace: (workspaceId: string) => Promise<void>;
  clearBrief: () => void;
  setBriefContent: (content: string) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

interface DocumentProviderProps {
  children: ReactNode;
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ children }) => {
  const [documentState, setDocumentState] = useState<DocumentState>({
    briefContent: null,
    isGenerating: false,
    lastGenerated: null,
    nodeCount: 0,
    edgeCount: 0,
    error: null,
  });

  const generateBriefForWorkspace = async (workspaceId: string): Promise<void> => {
    setDocumentState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    try {
      const response: GenerateBriefResponse = await generateBrief(workspaceId);
      
      setDocumentState(prev => ({
        ...prev,
        briefContent: response.content,
        lastGenerated: response.generated_at,
        nodeCount: response.node_count,
        edgeCount: response.edge_count,
        isGenerating: false,
        error: null,
      }));
    } catch (error) {
      setDocumentState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate brief',
      }));
    }
  };

  const clearBrief = (): void => {
    setDocumentState(prev => ({
      ...prev,
      briefContent: null,
      lastGenerated: null,
      nodeCount: 0,
      edgeCount: 0,
      error: null,
    }));
  };

  const setBriefContent = (content: string): void => {
    setDocumentState(prev => ({
      ...prev,
      briefContent: content,
    }));
  };

  const value: DocumentContextType = {
    documentState,
    generateBriefForWorkspace,
    clearBrief,
    setBriefContent,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = (): DocumentContextType => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};