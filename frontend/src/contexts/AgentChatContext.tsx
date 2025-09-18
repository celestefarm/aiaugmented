import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiClient, AgentInteractionRequest, AgentInteractionResponse } from '../lib/api';
import { useWorkspace } from './WorkspaceContext';
import { useMap } from './MapContext';

// Agent types
export interface Agent {
  id: string;
  agent_id: string;
  name: string;
  ai_role: string;
  human_role: string;
  is_custom: boolean;
  is_active: boolean;
  model_name?: string;
  full_description: {
    role?: string;
    mission?: string;
    jobDescription?: string;
    tasks?: string[];
    responsibilities?: string;
    humanCollaboration?: string;
    agentCollaboration?: string;
    expertise?: string[];
    approach?: string;
  };
}

// Chat message types
export interface ChatMessage {
  id: string;
  workspace_id: string;
  author: string;
  type: 'human' | 'ai';
  content: string;
  created_at: string;
  added_to_map: boolean;
}

// Agent Chat context types
interface AgentChatContextType {
  // Agent state
  agents: Agent[];
  activeAgents: string[];
  isLoadingAgents: boolean;
  agentError: string | null;
  
  // Chat state
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  chatError: string | null;
  
  // Agent actions
  loadAgents: () => Promise<void>;
  activateAgent: (agentId: string) => Promise<void>;
  deactivateAgent: (agentId: string) => Promise<void>;
  
  // Chat actions
  loadMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<ChatMessage[]>;
  addMessageToMap: (messageId: string, nodeTitle?: string, nodeType?: string) => Promise<boolean>;
  clearMessages: () => void;
  
  // Utility actions
  refreshData: () => Promise<void>;
}

// Create context
const AgentChatContext = createContext<AgentChatContextType | undefined>(undefined);

// Agent Chat provider props
interface AgentChatProviderProps {
  children: ReactNode;
}

// Agent Chat provider component
export const AgentChatProvider: React.FC<AgentChatProviderProps> = ({ children }) => {
  // Agent state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  const { currentWorkspace } = useWorkspace();
  const { refreshMapData } = useMap();

  // Load all available agents
  const loadAgents = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingAgents(true);
      setAgentError(null);
      
      const response = await apiClient.getAgents();
      setAgents(response.agents);
      
      // Get active agents from workspace settings or default to strategist
      if (currentWorkspace) {
        const activeAgentIds = currentWorkspace.settings?.active_agents || ['strategist'];
        setActiveAgents(activeAgentIds);
      } else {
        setActiveAgents([]);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      setAgentError(error instanceof Error ? error.message : 'Failed to load agents');
      setAgents([]);
      setActiveAgents([]);
    } finally {
      setIsLoadingAgents(false);
    }
  }, [currentWorkspace]);

  // Activate an agent for the current workspace
  const activateAgent = useCallback(async (agentId: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      setAgentError('No workspace selected');
      return;
    }

    try {
      setAgentError(null);
      await apiClient.activateAgent(currentWorkspace.id, agentId);
      
      // Update local state
      setActiveAgents(prev => {
        if (!prev.includes(agentId)) {
          return [...prev, agentId];
        }
        return prev;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate agent';
      setAgentError(errorMessage);
      console.error('Failed to activate agent:', err);
    }
  }, [currentWorkspace]);

  // Deactivate an agent for the current workspace
  const deactivateAgent = useCallback(async (agentId: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      setAgentError('No workspace selected');
      return;
    }

    try {
      setAgentError(null);
      await apiClient.deactivateAgent(currentWorkspace.id, agentId);
      
      // Update local state
      setActiveAgents(prev => prev.filter(id => id !== agentId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate agent';
      setAgentError(errorMessage);
      console.error('Failed to deactivate agent:', err);
    }
  }, [currentWorkspace]);

  // Load chat messages for current workspace
  const loadMessages = useCallback(async (): Promise<void> => {
    if (!currentWorkspace?.id) {
      setMessages([]);
      return;
    }

    try {
      setIsLoadingMessages(true);
      setChatError(null);
      
      const response = await apiClient.getMessages(currentWorkspace.id);
      setMessages(response.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setChatError(error instanceof Error ? error.message : 'Failed to load messages');
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentWorkspace]);

  // Send a message and get AI responses
  const sendMessage = useCallback(async (content: string): Promise<ChatMessage[]> => {
    if (!currentWorkspace?.id) {
      setChatError('No workspace selected');
      return [];
    }

    try {
      setChatError(null);
      
      // Send message to backend and get responses
      const responseMessages = await apiClient.sendMessage(currentWorkspace.id, { content });
      
      // Debug logging
      console.log('Received messages from API:', responseMessages);
      responseMessages.forEach((msg, index) => {
        console.log(`Message ${index}:`, { id: msg.id, type: typeof msg.id, content: msg.content.substring(0, 50) });
      });
      
      // Update local state with all messages (human + AI responses)
      setMessages(prev => [...prev, ...responseMessages]);
      
      return responseMessages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setChatError(errorMessage);
      console.error('Failed to send message:', err);
      throw err;
    }
  }, [currentWorkspace]);

  // Add a message to the map - NEW IMPLEMENTATION
  const addMessageToMap = useCallback(async (
    messageId: string,
    nodeTitle?: string,
    nodeType?: string
  ): Promise<boolean> => {
    if (!currentWorkspace?.id) {
      setChatError('No workspace selected');
      return false;
    }

    try {
      setChatError(null);
      
      // Enhanced debug logging for new implementation
      console.log('=== NEW CONTEXT ADD TO MAP DEBUG ===');
      console.log('Current workspace:', currentWorkspace);
      console.log('Workspace ID:', currentWorkspace.id);
      console.log('Message ID:', messageId);
      console.log('Message ID type:', typeof messageId);
      console.log('Node title:', nodeTitle);
      console.log('Node type:', nodeType);
      
      // Find message in local state
      const localMessage = messages.find(m => m.id === messageId);
      console.log('Local message found:', localMessage);
      
      // Check if already added to map locally
      if (localMessage?.added_to_map) {
        console.log('Message already marked as added to map locally');
        setChatError('Message has already been added to map');
        return false;
      }
      
      console.log('Making API call to new addMessageToMap endpoint...');
      const response = await apiClient.addMessageToMap(currentWorkspace.id, messageId, {
        node_title: nodeTitle,
        node_type: nodeType || 'ai'
      });
      
      console.log('New API response:', response);
      
      if (response.success) {
        console.log('New API call successful! Node ID:', response.node_id);
        
        // Update message state to mark as added to map
        setMessages(prev => {
          const updated = prev.map(msg =>
            msg.id === messageId ? { ...msg, added_to_map: true } : msg
          );
          console.log('Updated messages with new implementation:', updated);
          return updated;
        });
        
        // Refresh map data to show the new node
        console.log('Refreshing map data with new implementation...');
        try {
          await refreshMapData();
          console.log('Map data refreshed successfully with new implementation');
        } catch (mapError) {
          console.error('Failed to refresh map data:', mapError);
          // Don't fail the whole operation if map refresh fails
        }
        
        return true;
      } else {
        console.error('New API call returned success: false');
        setChatError('Failed to add message to map');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message to map';
      setChatError(errorMessage);
      console.error('Failed to add message to map with new implementation - full error:', err);
      console.error('Error message:', errorMessage);
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      
      // Handle specific error cases
      if (errorMessage.includes('already been added')) {
        // Update local state to reflect server state
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, added_to_map: true } : msg
          )
        );
      }
      
      return false;
    }
  }, [currentWorkspace, messages, refreshMapData]);

  // Clear chat messages
  const clearMessages = useCallback((): void => {
    setMessages([]);
    setChatError(null);
  }, []);

  // Refresh all data
  const refreshData = useCallback(async (): Promise<void> => {
    await Promise.all([loadAgents(), loadMessages()]);
  }, [loadAgents, loadMessages]);

  // Load data when workspace changes
  useEffect(() => {
    // Always load agents (they're global)
    loadAgents();
    
    if (currentWorkspace) {
      loadMessages();
    } else {
      // Clear workspace-specific data when no workspace is selected
      setMessages([]);
      setChatError(null);
    }
  }, [currentWorkspace, loadAgents, loadMessages]);

  // Context value
  const value: AgentChatContextType = {
    // Agent state
    agents,
    activeAgents,
    isLoadingAgents,
    agentError,
    
    // Chat state
    messages,
    isLoadingMessages,
    chatError,
    
    // Agent actions
    loadAgents,
    activateAgent,
    deactivateAgent,
    
    // Chat actions
    loadMessages,
    sendMessage,
    addMessageToMap,
    clearMessages,
    
    // Utility actions
    refreshData,
  };

  return (
    <AgentChatContext.Provider value={value}>
      {children}
    </AgentChatContext.Provider>
  );
};

// Custom hook to use agent chat context
export const useAgentChat = (): AgentChatContextType => {
  const context = useContext(AgentChatContext);
  if (context === undefined) {
    throw new Error('useAgentChat must be used within an AgentChatProvider');
  }
  return context;
};

// Export context for advanced usage
export { AgentChatContext };