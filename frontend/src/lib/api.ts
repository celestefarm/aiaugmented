// API client for backend communication
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Types for API responses
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface ApiError {
  detail: string;
}

// Workspace types
export interface Workspace {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, any>;
  transform: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface WorkspaceCreateRequest {
  title: string;
  settings?: Record<string, any>;
  transform?: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface WorkspaceUpdateRequest {
  title?: string;
  settings?: Record<string, any>;
  transform?: {
    x: number;
    y: number;
    scale: number;
  };
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
  total: number;
}

// Node types
export interface Node {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  type: 'human' | 'ai' | 'decision' | 'risk' | 'dependency';
  x: number;
  y: number;
  confidence?: number;
  feasibility?: string;
  source_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface NodeCreateRequest {
  title: string;
  description?: string;
  type: 'human' | 'ai' | 'decision' | 'risk' | 'dependency';
  x: number;
  y: number;
  confidence?: number;
  feasibility?: string;
  source_agent?: string;
}

export interface NodeUpdateRequest {
  title?: string;
  description?: string;
  type?: 'human' | 'ai' | 'decision' | 'risk' | 'dependency';
  x?: number;
  y?: number;
  confidence?: number;
  feasibility?: string;
  source_agent?: string;
}

export interface NodeListResponse {
  nodes: Node[];
  total: number;
}

// Edge types
export interface Edge {
  id: string;
  workspace_id: string;
  from_node_id: string;
  to_node_id: string;
  type: 'support' | 'contradiction' | 'dependency' | 'ai-relationship';
  description: string;
  created_at: string;
}

export interface EdgeCreateRequest {
  from_node_id: string;
  to_node_id: string;
  type: 'support' | 'contradiction' | 'dependency' | 'ai-relationship';
  description?: string;
}

export interface EdgeListResponse {
  edges: Edge[];
  total: number;
}

// Agent types
export interface Agent {
  id: string;
  agent_id: string;
  name: string;
  ai_role: string;
  human_role: string;
  is_custom: boolean;
  is_active: boolean;
  full_description: Record<string, any>;
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
}

// Message types
export interface ChatMessage {
  id: string;
  workspace_id: string;
  author: string;
  type: 'human' | 'ai';
  content: string;
  created_at: string;
  added_to_map: boolean;
}

export interface MessageCreateRequest {
  content: string;
}

export interface MessageListResponse {
  messages: ChatMessage[];
  total: number;
}

export interface AddToMapRequest {
  node_title?: string;
  node_type?: string;
}

export interface AddToMapResponse {
  success: boolean;
  node_id?: string;
  message: string;
}

// Agent interaction types
export interface AgentInteractionRequest {
  agent_id: string;
  prompt: string;
  context?: Record<string, any>;
}

export interface AgentInteractionResponse {
  agent_id: string;
  agent_name: string;
  response: string;
  model_used?: string;
}

export interface AgentInfoResponse {
  agent_id: string;
  name: string;
  ai_role: string;
  human_role: string;
  model_name?: string;
  is_active: boolean;
  is_custom: boolean;
  full_description: Record<string, any>;
  capabilities: {
    can_interact: boolean;
    supported_models: string[];
  };
}

// Cognitive Analysis types
export interface RelationshipSuggestion {
  from_node_id: string;
  to_node_id: string;
  relationship_type: 'support' | 'contradiction' | 'dependency' | 'ai-relationship';
  strength: number;
  reasoning: string;
  keywords: string[];
}

export interface CognitiveCluster {
  type: string;
  name: string;
  nodes: string[];
  description: string;
}

export interface CognitiveAnalysisResponse {
  suggestions: RelationshipSuggestion[];
  clusters: CognitiveCluster[];
  insights: string[];
}

export interface NodeRelationshipRequest {
  workspace_id: string;
  node_ids?: string[];
}

export interface AutoConnectResponse {
  success: boolean;
  connections_created: number;
  connections: Array<{
    id: string;
    from_node_id: string;
    to_node_id: string;
    type: string;
    reasoning: string;
  }>;
  message: string;
}

// Document generation types
export interface GenerateBriefResponse {
  content: string;
  generated_at: string;
  node_count: number;
  edge_count: number;
}

export interface WorkspaceExportResponse {
  workspace: Record<string, any>;
  nodes: Record<string, any>[];
  edges: Record<string, any>[];
  exported_at: string;
}

// API client class
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Get stored token from localStorage
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Set token in localStorage
  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  // Remove token from localStorage
  private removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    // Enhanced logging for debugging authentication issues
    console.log('=== API REQUEST DEBUG ===');
    console.log('Endpoint:', endpoint);
    console.log('Token exists:', !!token);
    console.log('Token value:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('Is authenticated:', this.isAuthenticated());

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    console.log('Request headers:', config.headers);

    try {
      const response = await fetch(url, config);
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response object:', response);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`,
        }));
        console.log('API Error:', errorData);
        
        // Special handling for authentication errors
        if (response.status === 401) {
          console.log('Authentication failed - clearing token');
          this.clearAuth();
        }
        
        throw new Error(errorData.detail);
      }

      // Handle empty responses (like logout)
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json();
        console.log('JSON Response:', jsonResponse);
        
        // CRITICAL: Add null/undefined check for response data
        if (jsonResponse === null || jsonResponse === undefined) {
          console.error('CRITICAL: API returned null/undefined response');
          throw new Error('API returned invalid response data');
        }
        
        return jsonResponse;
      }
      
      console.log('Returning empty object for non-JSON response');
      return {} as T;
    } catch (error) {
      console.error('=== API REQUEST ERROR ===');
      console.error('Request failed for endpoint:', endpoint);
      console.error('Error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // Authentication methods
  async signup(data: SignupRequest): Promise<TokenResponse> {
    const response = await this.request<TokenResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    this.setToken(response.access_token);
    return response;
  }

  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    this.setToken(response.access_token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      // Always remove token, even if request fails
      this.removeToken();
    }
  }

  async getCurrentUser(): Promise<User> {
    return await this.request<User>('/auth/me');
  }

  async updateProfile(data: { name?: string }): Promise<User> {
    return await this.request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Workspace methods
  async getWorkspaces(): Promise<WorkspaceListResponse> {
    return await this.request<WorkspaceListResponse>('/workspaces');
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    return await this.request<Workspace>(`/workspaces/${workspaceId}`);
  }

  async createWorkspace(data: WorkspaceCreateRequest): Promise<Workspace> {
    return await this.request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkspace(workspaceId: string, data: WorkspaceUpdateRequest): Promise<Workspace> {
    return await this.request<Workspace>(`/workspaces/${workspaceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    return await this.request<void>(`/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });
  }

  // Node methods
  async getNodes(workspaceId: string): Promise<NodeListResponse> {
    console.log('=== GET NODES API CALL ===');
    console.log('Workspace ID:', workspaceId);
    
    try {
      const response = await this.request<NodeListResponse>(`/workspaces/${workspaceId}/nodes`);
      
      console.log('Get nodes response:', response);
      
      // CRITICAL: Validate response structure
      if (!response) {
        console.error('CRITICAL: getNodes returned null/undefined');
        throw new Error('Failed to fetch nodes - API returned no data');
      }
      
      if (typeof response !== 'object') {
        console.error('CRITICAL: getNodes returned non-object:', typeof response, response);
        throw new Error('Failed to fetch nodes - API returned invalid data type');
      }
      
      // Validate nodes property exists
      if (!('nodes' in response)) {
        console.error('CRITICAL: getNodes missing nodes property');
        throw new Error('Failed to fetch nodes - missing nodes in response');
      }
      
      if (!Array.isArray(response.nodes)) {
        console.error('CRITICAL: getNodes nodes property is not an array:', typeof response.nodes);
        throw new Error('Failed to fetch nodes - nodes is not an array');
      }
      
      console.log('Get nodes validation passed, found', response.nodes.length, 'nodes');
      return response;
    } catch (error) {
      console.error('=== GET NODES ERROR ===');
      console.error('Error in getNodes:', error);
      throw error;
    }
  }

  async createNode(workspaceId: string, data: NodeCreateRequest): Promise<Node> {
    return await this.request<Node>(`/workspaces/${workspaceId}/nodes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNode(workspaceId: string, nodeId: string, data: NodeUpdateRequest): Promise<Node> {
    return await this.request<Node>(`/workspaces/${workspaceId}/nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNode(workspaceId: string, nodeId: string): Promise<void> {
    return await this.request<void>(`/workspaces/${workspaceId}/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  }

  async autoArrangeNodes(workspaceId: string): Promise<{ message: string; arranged_count: number }> {
    return await this.request<{ message: string; arranged_count: number }>(`/workspaces/${workspaceId}/nodes/auto-arrange`, {
      method: 'POST',
    });
  }

  // Edge methods
  async getEdges(workspaceId: string): Promise<EdgeListResponse> {
    console.log('=== GET EDGES API CALL ===');
    console.log('Workspace ID:', workspaceId);
    
    try {
      const response = await this.request<EdgeListResponse>(`/workspaces/${workspaceId}/edges`);
      
      console.log('Get edges response:', response);
      
      // CRITICAL: Validate response structure
      if (!response) {
        console.error('CRITICAL: getEdges returned null/undefined');
        throw new Error('Failed to fetch edges - API returned no data');
      }
      
      if (typeof response !== 'object') {
        console.error('CRITICAL: getEdges returned non-object:', typeof response, response);
        throw new Error('Failed to fetch edges - API returned invalid data type');
      }
      
      // Validate edges property exists
      if (!('edges' in response)) {
        console.error('CRITICAL: getEdges missing edges property');
        throw new Error('Failed to fetch edges - missing edges in response');
      }
      
      if (!Array.isArray(response.edges)) {
        console.error('CRITICAL: getEdges edges property is not an array:', typeof response.edges);
        throw new Error('Failed to fetch edges - edges is not an array');
      }
      
      console.log('Get edges validation passed, found', response.edges.length, 'edges');
      return response;
    } catch (error) {
      console.error('=== GET EDGES ERROR ===');
      console.error('Error in getEdges:', error);
      throw error;
    }
  }

  async createEdge(workspaceId: string, data: EdgeCreateRequest): Promise<Edge> {
    return await this.request<Edge>(`/workspaces/${workspaceId}/edges`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteEdge(workspaceId: string, edgeId: string): Promise<void> {
    return await this.request<void>(`/workspaces/${workspaceId}/edges/${edgeId}`, {
      method: 'DELETE',
    });
  }

  // Agent methods
  async getAgents(): Promise<AgentListResponse> {
    return await this.request<AgentListResponse>('/agents');
  }

  async activateAgent(workspaceId: string, agentId: string): Promise<void> {
    return await this.request<void>(`/workspaces/${workspaceId}/agents/${agentId}/activate`, {
      method: 'POST',
    });
  }

  async deactivateAgent(workspaceId: string, agentId: string): Promise<void> {
    return await this.request<void>(`/workspaces/${workspaceId}/agents/${agentId}/activate`, {
      method: 'DELETE',
    });
  }

  // Agent interaction methods
  async interactWithAgent(data: AgentInteractionRequest): Promise<AgentInteractionResponse> {
    return await this.request<AgentInteractionResponse>('/agents/interact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAgentInfo(agentId: string): Promise<AgentInfoResponse> {
    return await this.request<AgentInfoResponse>(`/agents/${agentId}/info`);
  }

  // Message methods
  async getMessages(workspaceId: string): Promise<MessageListResponse> {
    return await this.request<MessageListResponse>(`/workspaces/${workspaceId}/messages`);
  }

  async sendMessage(workspaceId: string, data: MessageCreateRequest): Promise<ChatMessage[]> {
    return await this.request<ChatMessage[]>(`/workspaces/${workspaceId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addMessageToMap(workspaceId: string, messageId: string, data: AddToMapRequest): Promise<AddToMapResponse> {
    return await this.request<AddToMapResponse>(`/workspaces/${workspaceId}/messages/${messageId}/add-to-map`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Document generation methods
  async generateBrief(workspaceId: string): Promise<GenerateBriefResponse> {
    console.log('=== GENERATE BRIEF API CALL ===');
    console.log('Workspace ID:', workspaceId);
    
    if (!workspaceId || workspaceId.trim() === '') {
      console.error('CRITICAL: No workspace ID provided to generateBrief');
      throw new Error('No workspace ID provided - please select a valid workspace');
    }
    
    try {
      const response = await this.request<GenerateBriefResponse>(`/workspaces/${workspaceId}/generate-brief`, {
        method: 'POST',
      });
      
      console.log('Generate brief response:', response);
      
      // CRITICAL: Validate response structure
      if (!response) {
        console.error('CRITICAL: generateBrief returned null/undefined');
        throw new Error('Brief generation failed - API returned no data');
      }
      
      if (typeof response !== 'object') {
        console.error('CRITICAL: generateBrief returned non-object:', typeof response, response);
        throw new Error('Brief generation failed - API returned invalid data type');
      }
      
      // Validate required properties
      const requiredProps = ['content', 'generated_at', 'node_count', 'edge_count'];
      for (const prop of requiredProps) {
        if (!(prop in response)) {
          console.error(`CRITICAL: generateBrief missing required property: ${prop}`);
          throw new Error(`Brief generation failed - missing ${prop} in response`);
        }
      }
      
      console.log('Generate brief validation passed');
      return response;
    } catch (error) {
      console.error('=== GENERATE BRIEF ERROR ===');
      console.error('Error in generateBrief:', error);
      
      // Provide more user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('Access denied') || error.message.includes('403')) {
          throw new Error('Access denied: This workspace belongs to another user or you don\'t have permission to access it');
        }
        if (error.message.includes('Workspace not found') || error.message.includes('404')) {
          throw new Error('Workspace not found: The selected workspace may have been deleted or is no longer accessible');
        }
      }
      
      throw error;
    }
  }

  async exportWorkspace(workspaceId: string): Promise<void> {
    const url = `${this.baseUrl}/workspaces/${workspaceId}/export`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.detail);
      }

      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'workspace_export.json';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during export');
    }
  }

  // Cognitive analysis methods
  async analyzeCognitiveRelationships(workspaceId: string, nodeIds?: string[]): Promise<CognitiveAnalysisResponse> {
    const requestData: NodeRelationshipRequest = {
      workspace_id: workspaceId,
      ...(nodeIds && { node_ids: nodeIds })
    };
    
    return await this.request<CognitiveAnalysisResponse>(
      `/workspaces/${workspaceId}/cognitive-analysis`,
      {
        method: 'POST',
        body: JSON.stringify(requestData),
      }
    );
  }

  async autoConnectNodes(workspaceId: string): Promise<AutoConnectResponse> {
    return await this.request<AutoConnectResponse>(
      `/workspaces/${workspaceId}/auto-connect`,
      {
        method: 'POST',
      }
    );
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && token !== '';
  }

  // Clear authentication state
  clearAuth(): void {
    this.removeToken();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export individual methods for convenience
export const {
  signup,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getNodes,
  createNode,
  updateNode,
  deleteNode,
  getEdges,
  createEdge,
  deleteEdge,
  getAgents,
  activateAgent,
  deactivateAgent,
  interactWithAgent,
  getAgentInfo,
  getMessages,
  sendMessage,
  addMessageToMap,
  autoArrangeNodes,
  generateBrief,
  exportWorkspace,
  isAuthenticated,
  clearAuth,
  analyzeCognitiveRelationships,
  autoConnectNodes,
} = apiClient;