import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  apiClient,
  AgentInteractionRequest,
  AgentInteractionResponse,
  StrategicInteractionRequest,
  StrategicInteractionResponse,
  LightningBrief,
  RedTeamChallenge,
  RedTeamChallengeRequest,
  RedTeamResponseRequest,
  RedTeamEvaluationResponse,
  StrategicSessionStatus,
  isAuthenticated
} from '../lib/api';
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
  
  // STATE MANAGEMENT FIX: Add-to-map loading state
  addToMapLoading: Record<string, boolean>;
  
  // Strategic interaction state
  currentStrategicSession: string | null;
  currentPhase: string | null;
  lightningBrief: LightningBrief | null;
  currentRedTeamChallenge: RedTeamChallenge | null;
  strategicSessionStatus: StrategicSessionStatus | null;
  isStrategicMode: boolean;
  
  // Agent actions
  loadAgents: () => Promise<void>;
  activateAgent: (agentId: string) => Promise<void>;
  deactivateAgent: (agentId: string) => Promise<void>;
  
  // Chat actions
  loadMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<ChatMessage[]>;
  addMessageToMap: (messageId: string, nodeTitle?: string, nodeType?: string) => Promise<boolean>;
  removeMessageFromMap: (nodeId: string) => Promise<ChatMessage | null>;
  clearMessages: () => void;
  refreshMessages: () => Promise<void>;
  
  // Strategic interaction actions
  startStrategicSession: (agentId: string) => Promise<void>;
  sendStrategicMessage: (content: string, enableRedTeam?: boolean) => Promise<StrategicInteractionResponse>;
  generateRedTeamChallenge: (challengeType?: string, targetContent?: string, difficulty?: string) => Promise<RedTeamChallenge & { challenge_id: string }>;
  respondToRedTeamChallenge: (challengeId: string, response: string) => Promise<RedTeamEvaluationResponse>;
  getSessionStatus: () => Promise<StrategicSessionStatus | null>;
  toggleStrategicMode: () => void;
  resetStrategicSession: () => void;
  
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
  
  // STATE MANAGEMENT FIX: Loading state for add-to-map operations
  const [addToMapLoading, setAddToMapLoading] = useState<Record<string, boolean>>({});
  
  // Strategic interaction state
  const [currentStrategicSession, setCurrentStrategicSession] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [lightningBrief, setLightningBrief] = useState<LightningBrief | null>(null);
  const [currentRedTeamChallenge, setCurrentRedTeamChallenge] = useState<RedTeamChallenge | null>(null);
  const [strategicSessionStatus, setStrategicSessionStatus] = useState<StrategicSessionStatus | null>(null);
  const [isStrategicMode, setIsStrategicMode] = useState(false);
  
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
        const activeAgentIds = currentWorkspace.settings?.active_agents as string[] || ['strategist'];
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

  // STATE MANAGEMENT FIX: Simplified message-to-map with proper error handling
  const addMessageToMap = useCallback(async (
    messageId: string,
    nodeTitle?: string,
    nodeType?: string
  ): Promise<boolean> => {
    console.log('🔄 [ADD-TO-MAP] Starting process for message:', messageId);
    
    if (!currentWorkspace?.id) {
      console.error('🔄 [ADD-TO-MAP] No workspace selected');
      setChatError('No workspace selected');
      return false;
    }

    // STATE MANAGEMENT FIX: Check for duplicate requests
    const localMessage = messages.find(m => m.id === messageId);
    
    if (localMessage?.added_to_map) {
      console.log('🔄 [ADD-TO-MAP] Message already added to map, skipping');
      setChatError('Message has already been added to map');
      return false;
    }

    // STATE MANAGEMENT FIX: Check if already loading
    const loadingStateKey = `adding-${messageId}`;
    if (addToMapLoading[loadingStateKey]) {
      console.log('🔄 [ADD-TO-MAP] Already in progress, skipping');
      return false;
    }
    
    try {
      setChatError(null);
      console.log('🔄 [ADD-TO-MAP] Adding message to map:', messageId);
      
      // Set loading state
      setAddToMapLoading(prev => ({ ...prev, [loadingStateKey]: true }));
      const response = await apiClient.addMessageToMap(currentWorkspace.id, messageId, {
        node_title: nodeTitle,
        node_type: nodeType || 'ai'
      });
      
      if (response.success) {
        console.log('🔄 [ADD-TO-MAP] ✅ Success! Node created:', response.node_id);
        
        // Refresh both messages and map data
        await Promise.all([
          loadMessages(),
          refreshMapData()
        ]);
        
        return true;
      } else {
        console.error('🔄 [ADD-TO-MAP] ❌ API failed:', response.message);
        setChatError(response.message || 'Failed to add message to map');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message to map';
      console.error('🔄 [ADD-TO-MAP] ❌ Error:', errorMessage);
      
      // Handle specific error cases
      if (errorMessage.includes('already been added')) {
        await loadMessages();
        setChatError('Message has already been added to map');
      } else {
        setChatError(errorMessage);
      }
      
      return false;
    } finally {
      // Clear loading state
      setAddToMapLoading(prev => {
        const updated = { ...prev };
        delete updated[loadingStateKey];
        return updated;
      });
    }
  }, [currentWorkspace, messages, loadMessages, refreshMapData, addToMapLoading]);

  // Remove message from map - reverts "Added to map" state
  const refreshMessages = useCallback(async (): Promise<void> => {
    if (currentWorkspace?.id) {
      try {
        console.log('🔄 [AGENT CHAT CONTEXT] Refreshing messages for workspace:', currentWorkspace.id);
        const response = await apiClient.getMessages(currentWorkspace.id);
        setMessages(response.messages);
      } catch (error) {
        console.error('Failed to refresh messages:', error);
        setChatError(error instanceof Error ? error.message : 'Failed to refresh messages');
      }
    }
  }, [currentWorkspace]);

  const removeMessageFromMap = useCallback(async (nodeId: string): Promise<ChatMessage | null> => {
    if (!currentWorkspace?.id) {
      setChatError('No workspace selected');
      return null;
    }
  
    try {
      setChatError(null);
  
      const response = await apiClient.removeMessageFromMap(currentWorkspace.id, { node_id: nodeId });
  
      if (response.success && response.message_id) {
        let updatedMessage: ChatMessage | null = null;
        setMessages(prevMessages =>
          prevMessages.map(msg => {
            if (msg.id === response.message_id) {
              updatedMessage = { ...msg, added_to_map: false };
              return updatedMessage;
            }
            return msg;
          })
        );
        return updatedMessage;
      } else {
        setChatError(response.message || 'Failed to remove message from map');
        await refreshMessages();
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove message from map';
      setChatError(errorMessage);
      await refreshMessages();
      return null;
    }
  }, [currentWorkspace, refreshMessages]);

  // Clear chat messages
  const clearMessages = useCallback((): void => {
    setMessages([]);
    setChatError(null);
  }, []);

  // Strategic interaction methods
  const startStrategicSession = useCallback(async (agentId: string): Promise<void> => {
    try {
      setChatError(null);
      setIsStrategicMode(true);
      
      // Initialize strategic session with first interaction
      const response = await apiClient.strategicInteractWithAgent({
        agent_id: agentId,
        prompt: "I'd like to start a strategic analysis session.",
        context: { session_type: 'strategic_analysis' }
      });
      
      setCurrentStrategicSession(response.session_id);
      setCurrentPhase(response.current_phase);
      
      if (response.lightning_brief) {
        setLightningBrief(response.lightning_brief);
      }
      
      if (response.red_team_challenge) {
        setCurrentRedTeamChallenge(response.red_team_challenge);
      }
      
      console.log('Strategic session started:', response);
    } catch (error) {
      console.error('Failed to start strategic session:', error);
      setChatError(error instanceof Error ? error.message : 'Failed to start strategic session');
      setIsStrategicMode(false);
    }
  }, []);

  const sendStrategicMessage = useCallback(async (content: string, enableRedTeam: boolean = false): Promise<StrategicInteractionResponse> => {
    if (!currentStrategicSession) {
      throw new Error('No active strategic session');
    }

    try {
      setChatError(null);
      
      const response = await apiClient.strategicInteractWithAgent({
        agent_id: 'strategist',
        prompt: content,
        session_id: currentStrategicSession,
        enable_red_team: enableRedTeam,
        context: { strategic_mode: true }
      });
      
      // Update session state
      setCurrentPhase(response.current_phase);
      
      if (response.lightning_brief) {
        setLightningBrief(response.lightning_brief);
      }
      
      if (response.red_team_challenge) {
        setCurrentRedTeamChallenge(response.red_team_challenge);
      }
      
      console.log('Strategic message sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send strategic message:', error);
      setChatError(error instanceof Error ? error.message : 'Failed to send strategic message');
      throw error;
    }
  }, [currentStrategicSession]);

  const generateRedTeamChallenge = useCallback(async (
    challengeType?: string,
    targetContent?: string,
    difficulty?: string
  ): Promise<RedTeamChallenge & { challenge_id: string }> => {
    if (!currentStrategicSession) {
      throw new Error('No active strategic session');
    }

    try {
      setChatError(null);
      
      const response = await apiClient.generateRedTeamChallenge({
        session_id: currentStrategicSession,
        challenge_type: challengeType,
        target_content: targetContent || 'Current strategic analysis',
        difficulty: difficulty
      });
      
      setCurrentRedTeamChallenge(response);
      console.log('Red team challenge generated:', response);
      return response;
    } catch (error) {
      console.error('Failed to generate red team challenge:', error);
      setChatError(error instanceof Error ? error.message : 'Failed to generate red team challenge');
      throw error;
    }
  }, [currentStrategicSession]);

  const respondToRedTeamChallenge = useCallback(async (
    challengeId: string,
    response: string
  ): Promise<RedTeamEvaluationResponse> => {
    if (!currentStrategicSession) {
      throw new Error('No active strategic session');
    }

    try {
      setChatError(null);
      
      const evaluation = await apiClient.evaluateRedTeamResponse({
        session_id: currentStrategicSession,
        challenge_id: challengeId,
        user_response: response
      });
      
      // Clear current challenge if resolved
      if (evaluation.challenge_resolved) {
        setCurrentRedTeamChallenge(null);
      }
      
      console.log('Red team response evaluated:', evaluation);
      return evaluation;
    } catch (error) {
      console.error('Failed to evaluate red team response:', error);
      setChatError(error instanceof Error ? error.message : 'Failed to evaluate red team response');
      throw error;
    }
  }, [currentStrategicSession]);

  const getSessionStatus = useCallback(async (): Promise<StrategicSessionStatus | null> => {
    if (!currentStrategicSession) {
      return null;
    }

    try {
      const status = await apiClient.getStrategicSessionStatus(currentStrategicSession);
      setStrategicSessionStatus(status);
      return status;
    } catch (error) {
      console.error('Failed to get session status:', error);
      return null;
    }
  }, [currentStrategicSession]);

  const toggleStrategicMode = useCallback((): void => {
    setIsStrategicMode(prev => !prev);
    if (!isStrategicMode) {
      // Reset strategic state when entering strategic mode
      resetStrategicSession();
    }
  }, [isStrategicMode]);

  const resetStrategicSession = useCallback((): void => {
    setCurrentStrategicSession(null);
    setCurrentPhase(null);
    setLightningBrief(null);
    setCurrentRedTeamChallenge(null);
    setStrategicSessionStatus(null);
    setIsStrategicMode(false);
  }, []);

  // Refresh all data
  const refreshData = useCallback(async (): Promise<void> => {
    await Promise.all([loadAgents(), loadMessages()]);
    
    // Refresh strategic session status if active
    if (currentStrategicSession) {
      await getSessionStatus();
    }
  }, [loadAgents, loadMessages, currentStrategicSession, getSessionStatus]);

  // Load data when workspace changes
  useEffect(() => {
    // Only load data if user is authenticated
    if (isAuthenticated()) {
      console.log('🔐 [AGENT CHAT CONTEXT] User is authenticated, loading agents...');
      // Always load agents (they're global)
      loadAgents();
      
      if (currentWorkspace) {
        console.log('🔐 [AGENT CHAT CONTEXT] Loading messages for workspace:', currentWorkspace.id);
        loadMessages();
      } else {
        // Clear workspace-specific data when no workspace is selected
        setMessages([]);
        setChatError(null);
      }
    } else {
      console.log('🔐 [AGENT CHAT CONTEXT] User not authenticated, clearing data');
      // Clear all data when not authenticated
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
    
    // STATE MANAGEMENT FIX: Add-to-map loading state
    addToMapLoading,
    
    // Strategic interaction state
    currentStrategicSession,
    currentPhase,
    lightningBrief,
    currentRedTeamChallenge,
    strategicSessionStatus,
    isStrategicMode,
    
    // Agent actions
    loadAgents,
    activateAgent,
    deactivateAgent,
    
    // Chat actions
    loadMessages,
    sendMessage,
    addMessageToMap,
    removeMessageFromMap,
    clearMessages,
    refreshMessages,
    
    // Strategic interaction actions
    startStrategicSession,
    sendStrategicMessage,
    generateRedTeamChallenge,
    respondToRedTeamChallenge,
    getSessionStatus,
    toggleStrategicMode,
    resetStrategicSession,
    
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