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
import { streamingClient, StreamingOptions } from '../lib/streamingClient';
import { useWorkspace } from './WorkspaceContext';
import { useMap } from './MapContext';
import { useMessageMapStatus } from './MessageMapStatusContext';

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
  type: 'human' | 'ai' | 'document';
  content: string;
  created_at: string;
  added_to_map: boolean;
  // Document-specific fields (optional)
  documents?: DocumentAttachment[];
}

// Import document types
import { DocumentUploadResponse, DocumentAttachment, createDocumentMessage } from '../lib/api';

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
  isInitialLoad: boolean;
  
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
  sendStreamingMessage: (content: string) => Promise<ChatMessage[]>;
  addDocumentMessage: (documents: DocumentUploadResponse[]) => Promise<void>;
  addMessageToMap: (messageId: string, nodeTitle?: string, nodeType?: string) => Promise<boolean>;
  removeMessageFromMap: (nodeId: string) => Promise<ChatMessage | null>;
  clearMessages: () => void;
  refreshMessages: () => Promise<void>;
  
  // Streaming state
  isStreaming: boolean;
  streamingStatus: string | null;
  cancelStream: () => void;
  
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // STATE MANAGEMENT FIX: Loading state for add-to-map operations
  const [addToMapLoading, setAddToMapLoading] = useState<Record<string, boolean>>({});
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
  // Strategic interaction state
  const [currentStrategicSession, setCurrentStrategicSession] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [lightningBrief, setLightningBrief] = useState<LightningBrief | null>(null);
  const [currentRedTeamChallenge, setCurrentRedTeamChallenge] = useState<RedTeamChallenge | null>(null);
  const [strategicSessionStatus, setStrategicSessionStatus] = useState<StrategicSessionStatus | null>(null);
  const [isStrategicMode, setIsStrategicMode] = useState(false);
  
  const { currentWorkspace } = useWorkspace();
  const { refreshMapData, nodes } = useMap();
  const { syncWithCanvasState } = useMessageMapStatus();

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

  // CRITICAL FIX: Simplified message loading logic to fix retrieval issues
  const loadMessages = useCallback(async (): Promise<void> => {
    if (!currentWorkspace?.id) {
      setMessages([]);
      setIsInitialLoad(false);
      return;
    }

    try {
      // SIMPLIFIED: Always show loading state when fetching messages
      setIsLoadingMessages(true);
      setChatError(null);
      
      console.log('🔄 [LOAD MESSAGES] Fetching messages for workspace:', currentWorkspace.id);
      
      const response = await apiClient.getMessages(currentWorkspace.id);
      
      console.log('✅ [LOAD MESSAGES] Messages retrieved:', response.messages.length);
      setMessages(response.messages);
      
      // Sync with canvas state if needed (only when not in streaming mode)
      if (nodes && nodes.length >= 0 && response.messages.length > 0 && !isStreaming) {
        setTimeout(() => {
          console.log('🔄 [LOAD MESSAGES] Syncing with canvas state');
          syncWithCanvasState(nodes, response.messages);
        }, 1000);
      }
      
      // Mark initial load as complete
      if (isInitialLoad) {
        setTimeout(() => {
          console.log('🔄 [LOAD MESSAGES] Marking initial load as complete');
          setIsInitialLoad(false);
        }, 300);
      }
      
    } catch (error) {
      console.error('❌ [LOAD MESSAGES] Failed to load messages:', error);
      setChatError(error instanceof Error ? error.message : 'Failed to load messages');
      setMessages([]);
      setIsInitialLoad(false);
    } finally {
      // CRITICAL: Always clear loading state
      setIsLoadingMessages(false);
    }
  }, [currentWorkspace?.id, isInitialLoad]);

  // Send a message and get AI responses
  const sendMessage = useCallback(async (content: string): Promise<ChatMessage[]> => {
    if (!currentWorkspace?.id) {
      setChatError('No workspace selected');
      return [];
    }

    try {
      setChatError(null);
      
      // IMMEDIATE FEEDBACK: Add user message to UI immediately
      const tempUserMessage: ChatMessage = {
        id: `temp_${Date.now()}`,
        workspace_id: currentWorkspace.id,
        author: 'You',
        type: 'human',
        content,
        created_at: new Date().toISOString(),
        added_to_map: false
      };
      
      // Add user message immediately for responsive feel
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Get the actual agent name for consistent display
      const currentActiveAgent = agents.find(agent => activeAgents.includes(agent.agent_id));
      const currentAgentDisplayName = currentActiveAgent?.name || 'Strategic Co-Pilot';
      
      // IMMEDIATE FEEDBACK: Add "AI is thinking..." placeholder
      const tempAiMessage: ChatMessage = {
        id: `temp_ai_${Date.now()}`,
        workspace_id: currentWorkspace.id,
        author: currentAgentDisplayName,
        type: 'ai',
        content: '🤔 Analyzing your message and preparing a response...',
        created_at: new Date().toISOString(),
        added_to_map: false
      };
      
      setMessages(prev => [...prev, tempAiMessage]);
      
      // Send message to backend and get responses
      const responseMessages = await apiClient.sendMessage(currentWorkspace.id, { content });
      
      // Debug logging
      console.log('Received messages from API:', responseMessages);
      responseMessages.forEach((msg, index) => {
        console.log(`Message ${index}:`, { id: msg.id, type: typeof msg.id, content: msg.content.substring(0, 50) });
      });
      
      // Replace temporary messages with real ones from backend
      setMessages(prev => {
        // Remove temporary messages
        const withoutTemp = prev.filter(msg => !msg.id.startsWith('temp_'));
        // Add real messages from backend
        return [...withoutTemp, ...responseMessages];
      });
      
      return responseMessages;
    } catch (err) {
      // Remove temporary messages on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp_')));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setChatError(errorMessage);
      console.error('Failed to send message:', err);
      throw err;
    }
  }, [currentWorkspace]);

  // Send a streaming message with real-time response
  const sendStreamingMessage = useCallback(async (content: string): Promise<ChatMessage[]> => {
    if (!currentWorkspace?.id) {
      setChatError('No workspace selected');
      return [];
    }

    if (isStreaming) {
      setChatError('Another message is currently being processed');
      return [];
    }

    try {
      setChatError(null);
      setIsStreaming(true);
      setStreamingStatus('AI is typing...');
      
      // IMMEDIATE FEEDBACK: Add user message to UI immediately with persistent ID
      const userMessageId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userMessage: ChatMessage = {
        id: userMessageId,
        workspace_id: currentWorkspace.id,
        author: 'You',
        type: 'human',
        content,
        created_at: new Date().toISOString(),
        added_to_map: false
      };
      
      // Add user message immediately for responsive feel
      setMessages(prev => [...prev, userMessage]);
      
      // Get the actual agent name for consistent display
      const streamingActiveAgent = agents.find(agent => activeAgents.includes(agent.agent_id));
      const streamingAgentDisplayName = streamingActiveAgent?.name || 'Strategic Co-Pilot';
      
      // STREAMING: Add placeholder AI message that will be updated in real-time
      // Use a more persistent ID format that won't conflict with backend IDs
      const streamingAiMessageId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const streamingAiMessage: ChatMessage = {
        id: streamingAiMessageId,
        workspace_id: currentWorkspace.id,
        author: streamingAgentDisplayName,
        type: 'ai',
        content: '',
        created_at: new Date().toISOString(),
        added_to_map: false
      };
      
      setMessages(prev => [...prev, streamingAiMessage]);
      setStreamingMessageId(streamingAiMessageId);
      
      let fullAiResponse = '';
      
      // Stream the AI response
      const streamingOptions: StreamingOptions = {
        onStatus: (status: string) => {
          console.log('📡 [STREAMING] Status:', status);
          // Keep showing "AI is typing..." during streaming, ignore backend status updates
          setStreamingStatus('AI is typing...');
        },
        
        onContent: (chunk: string) => {
          console.log('📝 [STREAMING] Content chunk:', chunk.length, 'chars');
          fullAiResponse += chunk;
          
          // DIAGNOSTIC: Log streaming content updates for auto-scroll debugging (development only)
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [STREAMING] Updating message content:', {
              messageId: streamingAiMessageId,
              contentLength: fullAiResponse.length,
              chunk: chunk.substring(0, 20) + '...',
              totalContent: fullAiResponse.substring(0, 50) + '...'
            });
          }
          
          // Ensure status shows "AI is typing..." while content is being received
          setStreamingStatus('AI is typing...');
          
          // Update the streaming message in real-time
          setMessages(prev => prev.map(msg =>
            msg.id === streamingAiMessageId
              ? { ...msg, content: fullAiResponse }
              : msg
          ));
        },
        
        onComplete: (totalLength: number, duration: number) => {
          const completionTime = new Date().toISOString();
          console.log('✅ [STREAMING] Complete received at:', completionTime, { totalLength, duration });
          
          // PERSISTENCE FIX: Update the streaming message with final timestamp and ensure it's marked as complete
          setMessages(prev => prev.map(msg =>
            msg.id === streamingAiMessageId
              ? { ...msg, created_at: completionTime }
              : msg
          ));
          
          // IMMEDIATE FIX: Clear streaming indicators immediately when AI completes
          console.log('🔄 [STREAMING] Clearing status immediately at:', new Date().toISOString());
          setStreamingStatus(null);
          setIsStreaming(false);
          
          // DIAGNOSTIC: Verify status is actually cleared
          setTimeout(() => {
            console.log('🔍 [STREAMING] Status check 100ms after completion:', {
              isStreaming,
              streamingStatus,
              timestamp: new Date().toISOString()
            });
          }, 100);
        },
        
        onError: (error: string) => {
          console.error('❌ [STREAMING] Error:', error);
          setChatError(`Streaming error: ${error}`);
          setStreamingStatus(null);
          setIsStreaming(false); // CRITICAL FIX: Clear streaming state on error
          
          // Remove the failed streaming message
          setMessages(prev => prev.filter(msg => msg.id !== streamingAiMessageId));
        }
      };
      
      // Start streaming with timeout safety
      const streamingPromise = streamingClient.streamMessage(
        currentWorkspace.id,
        content,
        'strategist', // Default to strategist agent
        streamingOptions
      );

      // SAFETY: Add timeout to ensure streaming state is cleared even if something goes wrong
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => {
          console.warn('⚠️ [STREAMING] Timeout reached, forcing cleanup');
          setIsStreaming(false);
          setStreamingStatus(null);
          reject(new Error('Streaming timeout'));
        }, 60000); // 60 second timeout
      });

      await Promise.race([streamingPromise, timeoutPromise]);
      
      // PERSISTENCE FIX: After streaming completes, reload messages from backend to ensure persistence
      console.log('✅ [STREAMING] Streaming complete, reloading messages from backend for persistence...');
      
      // Small delay to ensure backend has processed and saved the messages
      setTimeout(async () => {
        try {
          console.log('🔄 [STREAMING] Reloading messages from backend after streaming...');
          await loadMessages();
          console.log('✅ [STREAMING] Messages reloaded successfully after streaming');
        } catch (error) {
          console.error('❌ [STREAMING] Failed to reload messages after streaming:', error);
        }
      }, 2000); // Longer delay to ensure backend persistence
      
      // Return the current messages to maintain immediate UI state
      return messages;
      
    } catch (err) {
      // Remove streaming message on error, but keep user message
      setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to send streaming message';
      setChatError(errorMessage);
      console.error('Failed to send streaming message:', err);
      throw err;
    } finally {
      // ENHANCED: Ensure streaming state is always cleared with additional safety
      console.log('🔄 [STREAMING] Cleaning up streaming state in finally block');
      setIsStreaming(false);
      setStreamingStatus(null);
      setStreamingMessageId(null);
      
      // ADDITIONAL SAFETY: Force clear after a short delay to handle any race conditions
      setTimeout(() => {
        console.log('🔄 [STREAMING] Final safety cleanup');
        setIsStreaming(false);
        setStreamingStatus(null);
      }, 100);
    }
  }, [currentWorkspace, isStreaming, streamingMessageId]);

  // Cancel streaming
  const cancelStream = useCallback(() => {
    if (isStreaming) {
      console.log('🛑 [STREAMING] Cancelling stream...');
      streamingClient.cancelStream();
      setIsStreaming(false);
      setStreamingStatus(null);
      
      // Remove streaming message
      if (streamingMessageId) {
        setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId));
        setStreamingMessageId(null);
      }
    }
  }, [isStreaming, streamingMessageId]);

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

  // OPTIMIZED: Remove message from map - reverts "Added to map" state without loading flicker
  const refreshMessages = useCallback(async (): Promise<void> => {
    if (currentWorkspace?.id) {
      try {
        console.log('🔄 [AGENT CHAT CONTEXT] Refreshing messages for workspace:', currentWorkspace.id);
        // FLICKER FIX: Don't show loading indicator for refresh operations
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

  // Add document message to timeline - now persists to database
  const addDocumentMessage = useCallback(async (documents: DocumentUploadResponse[]): Promise<void> => {
    if (!currentWorkspace?.id) {
      setChatError('No workspace selected');
      return;
    }

    try {
      setChatError(null);
      
      // Create persistent document message in database
      const documentIds = documents.map(doc => doc.id);
      const documentMessage = await createDocumentMessage(currentWorkspace.id, documentIds);
      
      // Add to local messages state
      setMessages(prev => [...prev, documentMessage]);
      
      console.log('✅ Document message created and persisted:', documentMessage.id);
    } catch (error) {
      console.error('Failed to create document message:', error);
      setChatError(error instanceof Error ? error.message : 'Failed to create document message');
    }
  }, [currentWorkspace]);

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

  // OPTIMIZED: Load data when workspace changes or authentication state changes - prevent excessive calls
  useEffect(() => {
    const authStatus = isAuthenticated();
    console.log('🔄 [AGENT CHAT CONTEXT] useEffect triggered:', {
      isAuthenticated: authStatus,
      hasCurrentWorkspace: !!currentWorkspace,
      workspaceId: currentWorkspace?.id,
      workspaceTitle: currentWorkspace?.title,
      timestamp: new Date().toISOString()
    });
    
    // Only load data if user is authenticated
    if (authStatus) {
      console.log('🔐 [AGENT CHAT CONTEXT] User is authenticated, loading agents...');
      // Always load agents (they're global)
      loadAgents();
      
      if (currentWorkspace) {
        console.log('🔐 [AGENT CHAT CONTEXT] Loading messages for workspace:', {
          id: currentWorkspace.id,
          title: currentWorkspace.title,
          timestamp: new Date().toISOString()
        });
        
        // AUTO-SCROLL FIX: Always set initial load to true when workspace changes or page loads
        // This ensures auto-scroll works on refresh, revisit, and login
        console.log('🔄 [AUTO-SCROLL FIX] Setting isInitialLoad to true for workspace load');
        setIsInitialLoad(true);
        
        // FLICKER FIX: Debounce message loading to prevent rapid calls
        const loadTimer = setTimeout(() => {
          loadMessages();
        }, 100);
        
        return () => clearTimeout(loadTimer);
      } else {
        console.log('🔐 [AGENT CHAT CONTEXT] No workspace selected, clearing workspace-specific data');
        // Clear workspace-specific data when no workspace is selected
        setMessages([]);
        setChatError(null);
        setIsInitialLoad(false);
      }
    } else {
      console.log('🔐 [AGENT CHAT CONTEXT] User not authenticated, clearing all data');
      // Clear all data when not authenticated
      setAgents([]);
      setActiveAgents([]);
      setMessages([]);
      setAgentError(null);
      setChatError(null);
      setIsInitialLoad(false);
    }
  }, [currentWorkspace?.id]); // CRITICAL FIX: Remove loadAgents dependency to prevent loops



  // CONSERVATIVE SYNC: Only sync when absolutely necessary and after sufficient delay
  useEffect(() => {
    // Only sync when workspace is fully loaded and stable
    if (currentWorkspace && messages.length > 0 && nodes && !isLoadingMessages && !isInitialLoad) {
      console.log('🔄 [AGENT CHAT CONTEXT] Scheduling conservative stable state sync');
      
      // Much longer debounce to ensure document nodes are established
      const syncTimer = setTimeout(() => {
        console.log('🔄 [AGENT CHAT CONTEXT] Executing conservative stable state sync');
        syncWithCanvasState(nodes, messages);
      }, 3000); // Increased delay to prevent interference with document button states

      return () => clearTimeout(syncTimer);
    }
  }, [currentWorkspace?.id, messages.length, nodes?.length, isLoadingMessages, isInitialLoad, syncWithCanvasState]);

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
    isInitialLoad,
    
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
    sendStreamingMessage,
    addDocumentMessage,
    addMessageToMap,
    removeMessageFromMap,
    clearMessages,
    refreshMessages,
    
    // Streaming state
    isStreaming,
    streamingStatus,
    cancelStream,
    
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