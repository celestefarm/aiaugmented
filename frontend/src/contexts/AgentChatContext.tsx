import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiClient, AgentInteractionRequest, AgentInteractionResponse } from '../lib/api';
import { useWorkspace } from './WorkspaceContext';

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

  // Load all available agents
  const loadAgents = useCallback(async (): Promise<void> => {
    if (!currentWorkspace) {
      setAgents([]);
      setActiveAgents([]);
      return;
    }

    try {
      setIsLoadingAgents(true);
      setAgentError(null);
      
      const response = await apiClient.getAgents();
      setAgents(response.agents);
      
      // Get active agents from workspace settings or default to strategist
      const activeAgentIds = currentWorkspace.settings?.active_agents || ['strategist'];
      setActiveAgents(activeAgentIds);
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
    if (!currentWorkspace) {
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
    if (!currentWorkspace) {
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
    if (!currentWorkspace) {
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
    if (!currentWorkspace) {
      setChatError('No workspace selected');
      return [];
    }

    try {
      setChatError(null);
      
      // Send message to backend and get responses
      const responseMessages = await apiClient.sendMessage(currentWorkspace.id, { content });
      
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

  // Add a message to the map
  const addMessageToMap = useCallback(async (
    messageId: string,
    nodeTitle?: string,
    nodeType?: string
  ): Promise<boolean> => {
    if (!currentWorkspace) {
      setChatError('No workspace selected');
      return false;
    }

    try {
      setChatError(null);
      
      const response = await apiClient.addMessageToMap(currentWorkspace.id, messageId, {
        node_title: nodeTitle,
        node_type: nodeType
      });
      
      if (response.success) {
        // Update message state to mark as added to map
        setMessages(prev => prev.map(msg =>
          msg.id === messageId ? { ...msg, added_to_map: true } : msg
        ));
        return true;
      }
      
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message to map';
      setChatError(errorMessage);
      console.error('Failed to add message to map:', err);
      return false;
    }
  }, [currentWorkspace]);

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
    if (currentWorkspace) {
      loadAgents();
      loadMessages();
    } else {
      // Clear data when no workspace is selected
      setAgents([]);
      setActiveAgents([]);
      setMessages([]);
      setAgentError(null);
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