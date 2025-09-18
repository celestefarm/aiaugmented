import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiClient } from '../lib/api';
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
  full_description: {
    role?: string;
    mission?: string;
    jobDescription?: string;
    tasks?: string[];
    responsibilities?: string;
    humanCollaboration?: string;
    agentCollaboration?: string;
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
  // All 9 agents from Backend-dev-plan.md
  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      agent_id: 'strategist',
      name: 'Strategist Agent',
      ai_role: 'Frame 2-3 strategic options, identify key trade-offs',
      human_role: 'Define success metrics, apply contextual judgment',
      is_custom: false,
      is_active: true,
      full_description: {
        role: 'Strategic Options Architect',
        mission: 'Transform complex business challenges into clear, actionable strategic pathways',
        jobDescription: 'Systematic evaluation of strategic alternatives with focus on feasibility and impact',
        tasks: ['Strategic planning', 'Option analysis', 'Trade-off evaluation'],
        responsibilities: 'Frame strategic options and identify key trade-offs',
        humanCollaboration: 'Define success metrics, apply contextual judgment',
        agentCollaboration: 'Collaborates with all agents to provide strategic framework'
      }
    },
    {
      id: 'agent-2',
      agent_id: 'risk-compliance',
      name: 'Risk & Compliance Agent',
      ai_role: 'Identify regulatory risks, compliance requirements, and mitigation strategies',
      human_role: 'Validate regulatory interpretation, assess risk tolerance',
      is_custom: false,
      is_active: false,
      full_description: {
        role: 'Risk Assessment Specialist',
        mission: 'Ensure strategic decisions account for regulatory and operational risks',
        jobDescription: 'Comprehensive risk analysis with practical mitigation recommendations',
        tasks: ['Regulatory compliance', 'Risk assessment', 'Mitigation planning'],
        responsibilities: 'Identify and mitigate regulatory and operational risks',
        humanCollaboration: 'Validate regulatory interpretation, assess risk tolerance',
        agentCollaboration: 'Works with all agents to ensure risk-aware decision making'
      }
    },
    {
      id: 'agent-3',
      agent_id: 'market-analyst',
      name: 'Market Analyst Agent',
      ai_role: 'Analyze market trends, competitive landscape, and customer insights',
      human_role: 'Provide market context, validate assumptions with local knowledge',
      is_custom: false,
      is_active: false,
      full_description: {
        role: 'Market Intelligence Specialist',
        mission: 'Deliver data-driven market insights to inform strategic decisions',
        jobDescription: 'Evidence-based market analysis with actionable insights',
        tasks: ['Market research', 'Competitive analysis', 'Customer behavior'],
        responsibilities: 'Analyze market trends and competitive landscape',
        humanCollaboration: 'Provide market context, validate assumptions with local knowledge',
        agentCollaboration: 'Supports strategist and customer advocate with market data'
      }
    },
    {
      id: 'agent-4',
      agent_id: 'financial-advisor',
      name: 'Financial Advisor Agent',
      ai_role: 'Evaluate financial implications, ROI projections, and budget requirements',
      human_role: 'Validate financial assumptions, provide budget constraints',
      is_custom: false,
      is_active: false,
      full_description: {
        role: 'Financial Strategy Consultant',
        mission: 'Ensure strategic decisions are financially sound and sustainable',
        jobDescription: 'Rigorous financial analysis with clear cost-benefit evaluation',
        tasks: ['Financial modeling', 'ROI analysis', 'Budget planning'],
        responsibilities: 'Evaluate financial implications and ROI projections',
        humanCollaboration: 'Validate financial assumptions, provide budget constraints',
        agentCollaboration: 'Works with operations expert and strategist on financial viability'
      }
    },
    {
      id: 'agent-5',
      agent_id: 'operations-expert',
      name: 'Operations Expert Agent',
      ai_role: 'Assess operational feasibility, resource requirements, and implementation challenges',
      human_role: 'Validate operational constraints, provide implementation insights',
      is_custom: false,
      is_active: false,
      full_description: {
        role: 'Operational Excellence Advisor',
        mission: 'Ensure strategic plans are operationally viable and executable',
        jobDescription: 'Practical operational assessment with focus on execution readiness',
        tasks: ['Process optimization', 'Resource planning', 'Implementation strategy'],
        responsibilities: 'Assess operational feasibility and resource requirements',
        humanCollaboration: 'Validate operational constraints, provide implementation insights',
        agentCollaboration: 'Coordinates with technology architect and financial advisor'
      }
    },
    {
      id: 'agent-6',
      agent_id: 'technology-architect',
      name: 'Technology Architect Agent',
      ai_role: 'Evaluate technology requirements, digital transformation needs, and tech stack decisions',
      human_role: 'Validate technical feasibility, provide technology constraints',
      is_custom: false,
      is_active: false,
      full_description: {
        role: 'Technology Strategy Specialist',
        mission: 'Align technology capabilities with strategic objectives',
        jobDescription: 'Strategic technology evaluation with focus on scalability and integration',
        tasks: ['Technology assessment', 'Digital transformation', 'Architecture design'],
        responsibilities: 'Evaluate technology requirements and digital transformation needs',
        humanCollaboration: 'Validate technical feasibility, provide technology constraints',
        agentCollaboration: 'Works with operations expert and innovation catalyst'
      }
    },
    {
      id: 'agent-7',
      agent_id: 'customer-advocate',
      name: 'Customer Advocate Agent',
      ai_role: 'Represent customer perspective, analyze user experience impact, and customer value proposition',
      human_role: 'Validate customer insights, provide user feedback and preferences',
      is_custom: false,
      is_active: false,
      full_description: {
        role: 'Customer Experience Champion',
        mission: 'Ensure strategic decisions prioritize customer value and satisfaction',
        jobDescription: 'Customer-centric analysis with focus on user needs and satisfaction',
        tasks: ['Customer experience', 'User research', 'Value proposition design'],
        responsibilities: 'Represent customer perspective and analyze user experience impact',
        humanCollaboration: 'Validate customer insights, provide user feedback and preferences',
        agentCollaboration: 'Works with market analyst and innovation catalyst'
      }
    },
    {
      id: 'agent-8',
      agent_id: 'sustainability-advisor',
      name: 'Sustainability Advisor Agent',
      ai_role: 'Assess environmental impact, sustainability metrics, and ESG considerations',
      human_role: 'Validate sustainability priorities, provide ESG context',
      is_custom: false,
      is_active: false,
      full_description: {
        role: 'ESG Strategy Consultant',
        mission: 'Integrate sustainability and social responsibility into strategic planning',
        jobDescription: 'Comprehensive sustainability assessment with long-term impact focus',
        tasks: ['Environmental impact', 'ESG compliance', 'Sustainable business practices'],
        responsibilities: 'Assess environmental impact and ESG considerations',
        humanCollaboration: 'Validate sustainability priorities, provide ESG context',
        agentCollaboration: 'Advises all agents on sustainability implications'
      }
    },
    {
      id: 'agent-9',
      agent_id: 'innovation-catalyst',
      name: 'Innovation Catalyst Agent',
      ai_role: 'Identify innovation opportunities, emerging trends, and disruptive potential',
      human_role: 'Validate innovation feasibility, provide creative insights',
      is_custom: false,
      is_active: false,
      full_description: {
        role: 'Innovation Strategy Leader',
        mission: 'Drive strategic innovation and identify future growth opportunities',
        jobDescription: 'Forward-thinking innovation analysis with practical implementation pathways',
        tasks: ['Innovation management', 'Trend analysis', 'Disruptive technology'],
        responsibilities: 'Identify innovation opportunities and emerging trends',
        humanCollaboration: 'Validate innovation feasibility, provide creative insights',
        agentCollaboration: 'Works with technology architect and customer advocate'
      }
    }
  ];

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      workspace_id: 'mock-workspace-id',
      author: 'Demo User',
      type: 'human',
      content: 'What are the key strategic considerations for our product launch?',
      created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      added_to_map: false
    },
    {
      id: 'msg-2',
      workspace_id: 'mock-workspace-id',
      author: 'Strategic Analyst',
      type: 'ai',
      content: 'Based on market analysis, key considerations include: 1) Target market validation, 2) Competitive positioning, 3) Resource allocation, and 4) Risk mitigation strategies. I recommend conducting thorough market research before proceeding.',
      created_at: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
      added_to_map: true
    }
  ];

  // Agent state
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [activeAgents, setActiveAgents] = useState<string[]>(['strategist']);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  const { currentWorkspace } = useWorkspace();

  // Load all available agents
  const loadAgents = useCallback(async (): Promise<void> => {
    // TEMPORARY: Use mock data instead of API calls
    setIsLoadingAgents(true);
    setAgentError(null);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setAgents(mockAgents);
    setActiveAgents(['strategist']);
    setIsLoadingAgents(false);
  }, [currentWorkspace]);

  // Activate an agent for the current workspace - LOCAL STATE MANAGEMENT
  const activateAgent = useCallback(async (agentId: string): Promise<void> => {
    try {
      setAgentError(null);
      
      // Update local state directly (no API call due to authentication bypass)
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
      throw err;
    }
  }, []);

  // Deactivate an agent for the current workspace - LOCAL STATE MANAGEMENT
  const deactivateAgent = useCallback(async (agentId: string): Promise<void> => {
    try {
      setAgentError(null);
      
      // Update local state directly (no API call due to authentication bypass)
      setActiveAgents(prev => prev.filter(id => id !== agentId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate agent';
      setAgentError(errorMessage);
      console.error('Failed to deactivate agent:', err);
      throw err;
    }
  }, []);

  // Load chat messages for current workspace
  const loadMessages = useCallback(async (): Promise<void> => {
    if (!currentWorkspace) {
      setMessages([]);
      return;
    }

    // TEMPORARY: Use mock data instead of API calls
    setIsLoadingMessages(true);
    setChatError(null);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setMessages(mockMessages);
    setIsLoadingMessages(false);
  }, [currentWorkspace]);

  // Send a message and get AI responses
  const sendMessage = useCallback(async (content: string): Promise<ChatMessage[]> => {
    if (!currentWorkspace) {
      setChatError('No workspace selected');
      return [];
    }

    try {
      setChatError(null);
      const newMessages = await apiClient.sendMessage(currentWorkspace.id, { content });
      
      // Add new messages to local state
      setMessages(prev => [...prev, ...newMessages]);
      
      return newMessages;
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
    // TEMPORARY: Always load mock data for demo
    setAgents(mockAgents);
    setActiveAgents(['strategist']);
    setMessages(mockMessages);
    setAgentError(null);
    setChatError(null);
  }, [currentWorkspace]);

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