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

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.detail);
      }

      // Handle empty responses (like logout)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return {} as T;
    } catch (error) {
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
    return await this.request<NodeListResponse>(`/workspaces/${workspaceId}/nodes`);
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

  // Edge methods
  async getEdges(workspaceId: string): Promise<EdgeListResponse> {
    return await this.request<EdgeListResponse>(`/workspaces/${workspaceId}/edges`);
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
    return await this.request<GenerateBriefResponse>(`/workspaces/${workspaceId}/generate-brief`, {
      method: 'POST',
    });
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
  generateBrief,
  exportWorkspace,
  isAuthenticated,
  clearAuth,
} = apiClient;