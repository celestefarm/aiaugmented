// API client for backend communication
import { createErrorHandler, withRetry, ErrorStateManager } from './errorHandler';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// DIAGNOSTIC LOGGING: Log API configuration on startup
console.log('🔧 [API CLIENT DIAGNOSTIC] Configuration loaded:');
console.log('  - API Base URL:', API_BASE_URL);
console.log('  - Environment:', (import.meta as any).env?.MODE || 'unknown');
console.log('  - VITE_API_BASE_URL:', (import.meta as any).env?.VITE_API_BASE_URL || 'not set');

// DIAGNOSTIC LOGGING: Test API connectivity on startup
const testApiConnectivity = async () => {
  try {
    console.log('🔍 [API DIAGNOSTIC] Testing API connectivity...');
    const response = await fetch(`${API_BASE_URL}/healthz`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('🔍 [API DIAGNOSTIC] Health check response:', {
      status: response.status,
      ok: response.ok,
      url: response.url
    });
    
    if (response.ok) {
      const healthData = await response.json();
      console.log('🔍 [API DIAGNOSTIC] Backend health status:', healthData);
    }
  } catch (error) {
    console.error('🔍 [API DIAGNOSTIC] Health check failed:', error);
    console.error('🔍 [API DIAGNOSTIC] This indicates the backend server is not running or not accessible');
  }
};

// Run connectivity test after a short delay to avoid blocking app startup
setTimeout(testApiConnectivity, 1000);

// Types for API responses
export interface User {
  id: string;
  _id?: string; // Backend returns _id, frontend uses id
  email: string;
  name: string;
  position?: string;
  goal?: string;
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
  summarized_titles?: Record<string, string>;
  key_message?: string;
  keynote_points?: string[];
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

// Edge types - Enhanced for comprehensive connector system
export interface Edge {
  id: string;
  workspace_id: string;
  from_node_id: string;
  to_node_id: string;
  type: 'support' | 'contradiction' | 'dependency' | 'ai-relationship';
  description: string;
  created_at: string;
  // Enhanced connector properties
  ai_summary?: string;
  relationship_strength?: number;
  confidence_score?: number;
  tags?: string[];
  user_edited?: boolean;
  last_ai_update?: string;
  metadata?: Record<string, any>;
}

export interface EdgeCreateRequest {
  from_node_id: string;
  to_node_id: string;
  type: 'support' | 'contradiction' | 'dependency' | 'ai-relationship';
  description?: string;
  // Enhanced connector creation properties
  ai_summary?: string;
  relationship_strength?: number;
  confidence_score?: number;
  tags?: string[];
}

export interface EdgeUpdateRequest {
  type?: 'support' | 'contradiction' | 'dependency' | 'ai-relationship';
  description?: string;
  ai_summary?: string;
  relationship_strength?: number;
  confidence_score?: number;
  tags?: string[];
  user_edited?: boolean;
}

// AI Relationship Summarization types
export interface RelationshipSummarizationRequest {
  from_node_id: string;
  to_node_id: string;
  context?: Record<string, any>;
}

export interface RelationshipSummarizationResponse {
  edge_id: string;
  ai_summary: string;
  relationship_type: 'support' | 'contradiction' | 'dependency' | 'ai-relationship';
  relationship_strength: number;
  confidence_score: number;
  key_insights: string[];
  tags: string[];
  reasoning: string;
  generated_at: string;
}

// Connector Card types
export interface ConnectorCardData {
  edge: Edge;
  from_node: Node;
  to_node: Node;
  ai_insights?: {
    summary: string;
    strength: number;
    confidence: number;
    tags: string[];
    reasoning: string;
  };
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

export interface RemoveFromMapRequest {
  node_id: string;
}

export interface RemoveFromMapResponse {
  success: boolean;
  message_id?: string;
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

// Strategic agent interaction types
export interface StrategicInteractionRequest {
  agent_id: string;
  prompt: string;
  context?: Record<string, any>;
  session_id?: string;
  force_phase?: string;
  enable_red_team?: boolean;
}

export interface StrategicOption {
  title: string;
  description: string;
  confidence_score: number;
  risk_factors?: string[];
  opportunity_factors?: string[];
  success_criteria?: string[];
}

export interface LightningBrief {
  situation_summary: string;
  key_insights: string[];
  strategic_options: StrategicOption[];
  critical_assumptions: string[];
  next_actions: string[];
  confidence_level: string;
  generated_at: string;
}

export interface RedTeamChallenge {
  challenge_type: string;
  question: string;
  target: string;
  difficulty: string;
  expected_elements: string[];
  follow_up_questions: string[];
}

export interface StrategicInteractionResponse {
  agent_id: string;
  agent_name: string;
  response: string;
  session_id: string;
  current_phase: string;
  strategic_data: Record<string, any>;
  lightning_brief?: LightningBrief;
  red_team_challenge?: RedTeamChallenge;
  phase_transition?: Record<string, any>;
  model_used?: string;
}

// Red team challenge types
export interface RedTeamChallengeRequest {
  session_id: string;
  challenge_type?: string;
  target_content: string;
  difficulty?: string;
}

export interface RedTeamResponseRequest {
  session_id: string;
  challenge_id: string;
  user_response: string;
}

export interface ChallengeEvaluation {
  response_quality: number;
  addresses_challenge: boolean;
  provides_evidence: boolean;
  acknowledges_limitations: boolean;
  suggests_mitigations: boolean;
  strengthens_position: boolean;
  areas_for_improvement: string[];
  follow_up_needed: boolean;
}

export interface RedTeamEvaluationResponse {
  evaluation: ChallengeEvaluation;
  follow_up_question?: string;
  challenge_resolved: boolean;
  strategic_strength_assessment: string;
}

// Strategic session status types
export interface StrategicSessionStatus {
  session_id: string;
  current_phase: string;
  evidence_count: number;
  strategic_options_count: number;
  assumptions_count: number;
  evidence_quality_summary: string;
  phase_completion_status: Record<string, boolean>;
}

// Evidence classification types
export interface EvidencePiece {
  content: string;
  type: string;
  quality: string;
  confidence: number;
}

export interface EvidenceClassification {
  primary_quality: string;
  quality_scores: Record<string, number>;
  evidence_types: string[];
  confidence_score: number;
  evidence_pieces: EvidencePiece[];
  source_reliability: number;
  recency_score: number;
  verification_level: number;
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
    strategic_blueprint?: boolean;
    multi_phase_analysis?: boolean;
    lightning_brief_generation?: boolean;
    red_team_protocols?: boolean;
    evidence_classification?: boolean;
    supported_phases?: string[];
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

// Node summarization types
export interface SummarizeRequest {
  context: string;
  max_length?: number;
}

export interface SummarizeResponse {
  node_id: string;
  original_title: string;
  summarized_title: string;
  method_used: string;
  confidence?: number;
}

// Executive Summary types
export interface ExecutiveSummaryRequest {
  node_id: string;
  conversation_context?: string;
  include_related_messages?: boolean;
}

export interface ExecutiveSummaryResponse {
  executive_summary: string[];
  confidence: number;
  method_used: string;
  sources_analyzed: number;
  related_messages_count: number;
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

  // ERROR HANDLING FIX: Enhanced request method with comprehensive error handling
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const errorHandler = createErrorHandler('ApiClient', {
      maxRetries: 2,
      baseDelay: 1000,
      retryableStatuses: [408, 429, 500, 502, 503, 504]
    });

    return await errorHandler.handleOperation(
      async () => {
        const url = `${this.baseUrl}${endpoint}`;
        const token = this.getToken();

        // Reduced logging - only log important requests
        if (endpoint.includes('/add-to-map') || endpoint.includes('/messages')) {
          console.log('🌐 [ApiClient] Making request:', { endpoint, hasToken: !!token });
        }

        const config: RequestInit = {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
          },
          ...options,
        };

        const response = await fetch(url, config);
        
        // DIAGNOSTIC LOGGING: Enhanced response logging for debugging
        if (!response.ok) {
          console.error('🚨 [API DIAGNOSTIC] Request failed:', {
            url,
            method: options.method || 'GET',
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            endpoint,
            hasToken: !!token
          });
          
          // Log response headers for debugging
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          console.error('🚨 [API DIAGNOSTIC] Response headers:', headers);
        } else if (endpoint.includes('/add-to-map') || endpoint.includes('/messages') || endpoint.includes('/nodes') || endpoint.includes('/edges')) {
          console.log('📡 [ApiClient] Response received:', {
            status: response.status,
            ok: response.ok,
            endpoint
          });
        }
        
        if (!response.ok) {
          const errorData: ApiError = await response.json().catch(() => ({
            detail: `HTTP ${response.status}: ${response.statusText}`,
          }));
          
          // ENHANCED ERROR HANDLING: Better error classification and logging
          console.error('🚨 [API ERROR] Request failed:', {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            errorDetail: errorData.detail,
            url: response.url,
            hasToken: !!token
          });
          
          // Enhanced error context with more specific messages
          let errorMessage = errorData.detail;
          
          // Special handling for different error types
          if (response.status === 401 || (response.status === 403 && errorData.detail === 'Not authenticated') || errorData.detail === 'Not authenticated') {
            console.log('🔐 [ApiClient] Authentication failed - clearing token and redirecting to login');
            console.log('🔐 [ApiClient] Token appears to be expired or invalid');
            errorMessage = `Authentication expired - please log in again: ${errorData.detail}`;
            
            // Clear the invalid token
            this.clearAuth();
            
            // Clear any workspace data that might be stale
            localStorage.removeItem('currentWorkspace');
            
            // Force redirect to login immediately
            if (typeof window !== 'undefined') {
              console.log('🔐 [ApiClient] Forcing immediate redirect to login');
              window.location.href = '/auth';
            }
          } else if (response.status === 403) {
            console.log('🚫 [ApiClient] Access forbidden');
            errorMessage = `Access denied: ${errorData.detail}`;
          } else if (response.status === 404) {
            console.log('❌ [ApiClient] Resource not found');
            
            // Special handling for workspace not found errors
            if (endpoint.includes('/workspaces/') && errorData.detail === 'Workspace not found or access denied') {
              console.log('🗑️ [ApiClient] Workspace not found - clearing stale workspace data');
              
              // Clear the invalid workspace from localStorage
              localStorage.removeItem('currentWorkspace');
              
              // Redirect to dashboard to select a valid workspace
              if (typeof window !== 'undefined') {
                console.log('🧭 [ApiClient] Redirecting to dashboard due to invalid workspace');
                setTimeout(() => {
                  window.location.href = '/dashboard';
                }, 1000);
              }
              
              errorMessage = `Workspace not found - redirecting to dashboard to select a valid workspace`;
            } else {
              errorMessage = `Resource not found: ${errorData.detail} (${endpoint})`;
            }
          } else if (response.status >= 500) {
            console.log('🔥 [ApiClient] Server error');
            errorMessage = `Server error: ${errorData.detail}`;
          }
          
          throw new Error(errorMessage);
        }

        // Handle different response types
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        // Handle 204 No Content responses
        if (response.status === 204) {
          console.log('✅ [ApiClient] 204 No Content response');
          return {} as T;
        }
        
        // Handle empty content
        if (contentLength === '0' || contentLength === null) {
          console.log('✅ [ApiClient] Empty content response');
          return {} as T;
        }
        
        // Parse JSON responses
        if (contentType && contentType.includes('application/json')) {
          const responseText = await response.text();
          
          if (!responseText || responseText.trim() === '') {
            console.log('✅ [ApiClient] Empty JSON response');
            return {} as T;
          }
          
          try {
            const jsonResponse = JSON.parse(responseText);
            
            // Validate response data
            if (jsonResponse === null || jsonResponse === undefined) {
              throw new Error('API returned null/undefined response data');
            }
            
            // Only log successful parsing for important endpoints
            if (endpoint.includes('/add-to-map') || endpoint.includes('/messages')) {
              console.log('✅ [ApiClient] JSON response parsed successfully');
            }
            return jsonResponse;
          } catch (parseError) {
            // For successful responses with JSON parsing issues, return empty object
            if (response.status >= 200 && response.status < 300) {
              console.log('⚠️ [ApiClient] JSON parsing failed but response successful');
              return {} as T;
            }
            throw new Error(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }
        }
        
        console.log('✅ [ApiClient] Non-JSON response handled');
        return {} as T;
      },
      {
        context: 'ApiClient',
        operation: `${options.method || 'GET'} ${endpoint}`,
        showUserMessage: true
      }
    );
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
    console.log('=== API CLIENT LOGIN DEBUG ===');
    console.log('Login data:', data);
    console.log('API Base URL:', this.baseUrl);
    
    const response = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    console.log('Raw login response:', response);
    
    // Fix user data structure mismatch: backend returns "_id" but frontend expects "id"
    if (response.user && response.user._id) {
      console.log('Fixing user ID field from _id to id');
      console.log('Original user._id:', response.user._id);
      (response.user as any).id = response.user._id;
      console.log('Fixed user.id:', (response.user as any).id);
    }
    
    console.log('Final response user:', response.user);
    
    this.setToken(response.access_token);
    console.log('Token set successfully');
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
    const user = await this.request<User>('/auth/me');
    
    // Fix user data structure mismatch: backend returns "_id" but frontend expects "id"
    if (user && user._id && !user.id) {
      (user as any).id = user._id;
    }
    
    return user;
  }

  async updateProfile(data: { name?: string; position?: string; goal?: string }): Promise<User> {
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
    
    // Add cache-busting timestamp to ensure fresh data
    const cacheBuster = Date.now();
    const endpoint = `/workspaces/${workspaceId}/nodes?_t=${cacheBuster}`;
    console.log('Cache-busting endpoint:', endpoint);
    
    try {
      const response = await this.request<NodeListResponse>(endpoint);
      
      console.log('=== NODE DATA RECEIVED ===');
      console.log('Raw response:', response);
      console.log('Response type:', typeof response);
      
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
      
      console.log('=== NODE DATA VALIDATION ===');
      console.log('Total nodes found:', response.nodes.length);
      
      // Log key_message data for each node to verify it's being received
      response.nodes.forEach((node, index) => {
        console.log(`Node ${index + 1} (${node.id}):`);
        console.log(`  Title: "${node.title}"`);
        console.log(`  Key Message: ${node.key_message ? `"${node.key_message}"` : 'NOT PRESENT'}`);
        console.log(`  Summarized Titles:`, node.summarized_titles || 'NOT PRESENT');
        console.log(`  Description length: ${node.description?.length || 0} chars`);
        console.log('  ---');
      });
      
      console.log('✅ Get nodes validation passed with cache-busting');
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

  async clearAllNodes(workspaceId: string): Promise<{ message: string; deleted_nodes: number; deleted_edges: number }> {
    console.log('=== CLEAR ALL NODES API CALL ===');
    console.log('Workspace ID:', workspaceId);
    console.log('API endpoint:', `/workspaces/${workspaceId}/nodes`);
    console.log('Method: DELETE');
    
    try {
      const response = await this.request<{ message: string; deleted_nodes: number; deleted_edges: number }>(`/workspaces/${workspaceId}/nodes`, {
        method: 'DELETE',
      });
      
      console.log('=== CLEAR ALL NODES API RESPONSE ===');
      console.log('Response:', response);
      console.log('Response type:', typeof response);
      
      // Validate response structure
      if (!response) {
        console.error('CRITICAL: clearAllNodes returned null/undefined');
        throw new Error('Clear all nodes failed - API returned no data');
      }
      
      if (typeof response !== 'object') {
        console.error('CRITICAL: clearAllNodes returned non-object:', typeof response, response);
        throw new Error('Clear all nodes failed - API returned invalid data type');
      }
      
      // Validate required properties
      const requiredProps = ['message', 'deleted_nodes', 'deleted_edges'];
      for (const prop of requiredProps) {
        if (!(prop in response)) {
          console.error(`CRITICAL: clearAllNodes missing required property: ${prop}`);
          throw new Error(`Clear all nodes failed - missing ${prop} in response`);
        }
      }
      
      console.log('✅ Clear all nodes validation passed');
      return response;
    } catch (error) {
      console.error('=== CLEAR ALL NODES API ERROR ===');
      console.error('Error in clearAllNodes:', error);
      throw error;
    }
  }

  async summarizeNodeTitle(nodeId: string, context: string = 'card', maxLength?: number): Promise<SummarizeResponse> {
    console.log('=== SUMMARIZE NODE TITLE API CALL ===');
    console.log('Node ID:', nodeId);
    console.log('Context:', context);
    console.log('Max Length:', maxLength);
    
    const requestData: SummarizeRequest = {
      context,
      ...(maxLength && { max_length: maxLength })
    };
    
    console.log('Request data:', requestData);
    
    try {
      const response = await this.request<SummarizeResponse>(`/nodes/${nodeId}/summarize`, {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
      
      console.log('Summarization response:', response);
      return response;
    } catch (error) {
      console.error('=== SUMMARIZATION API ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  // Conversation summarization method
  async summarizeConversation(nodeId: string, data: { conversation_text: string }): Promise<Node> {
    console.log('=== SUMMARIZE CONVERSATION API CALL ===');
    console.log('Node ID:', nodeId);
    console.log('Conversation text length:', data.conversation_text.length);
    
    try {
      const response = await this.request<Node>(`/nodes/${nodeId}/summarize-conversation`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('Conversation summarization response:', response);
      return response;
    } catch (error) {
      console.error('=== CONVERSATION SUMMARIZATION API ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  // AI Executive Summary method
  async generateExecutiveSummary(nodeId: string, data: Partial<ExecutiveSummaryRequest> = {}): Promise<ExecutiveSummaryResponse> {
    console.log('=== GENERATE EXECUTIVE SUMMARY API CALL ===');
    console.log('Node ID:', nodeId);
    console.log('Request data:', data);
    
    const requestData: ExecutiveSummaryRequest = {
      node_id: nodeId,
      conversation_context: data.conversation_context,
      include_related_messages: data.include_related_messages ?? true
    };
    
    try {
      const response = await this.request<ExecutiveSummaryResponse>(`/nodes/${nodeId}/executive-summary`, {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
      
      console.log('Executive summary response:', response);
      
      // Validate response structure
      if (!response) {
        console.error('CRITICAL: generateExecutiveSummary returned null/undefined');
        throw new Error('Executive summary generation failed - API returned no data');
      }
      
      if (!Array.isArray(response.executive_summary)) {
        console.error('CRITICAL: executive_summary is not an array:', typeof response.executive_summary);
        throw new Error('Executive summary generation failed - invalid summary format');
      }
      
      console.log('✅ Executive summary generation successful');
      return response;
    } catch (error) {
      console.error('=== EXECUTIVE SUMMARY API ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  // Edge methods
  async getEdges(workspaceId: string): Promise<EdgeListResponse> {
    console.log('=== GET EDGES API CALL ===');
    console.log('Workspace ID:', workspaceId);
    
    // Add cache-busting timestamp to ensure fresh data
    const cacheBuster = Date.now();
    const endpoint = `/workspaces/${workspaceId}/edges?_t=${cacheBuster}`;
    console.log('Cache-busting endpoint:', endpoint);
    
    try {
      const response = await this.request<EdgeListResponse>(endpoint);
      
      console.log('=== EDGE DATA RECEIVED ===');
      console.log('Raw response:', response);
      
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
      
      console.log('✅ Get edges validation passed with cache-busting, found', response.edges.length, 'edges');
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

  async updateEdge(workspaceId: string, edgeId: string, data: EdgeUpdateRequest): Promise<Edge> {
    return await this.request<Edge>(`/workspaces/${workspaceId}/edges/${edgeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEdge(workspaceId: string, edgeId: string): Promise<void> {
    return await this.request<void>(`/workspaces/${workspaceId}/edges/${edgeId}`, {
      method: 'DELETE',
    });
  }

  // AI Relationship Summarization methods
  async summarizeRelationship(workspaceId: string, data: RelationshipSummarizationRequest): Promise<RelationshipSummarizationResponse> {
    console.log('=== SUMMARIZE RELATIONSHIP API CALL ===');
    console.log('Workspace ID:', workspaceId);
    console.log('Request data:', data);
    
    try {
      const response = await this.request<RelationshipSummarizationResponse>(`/workspaces/${workspaceId}/relationships/summarize`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('Relationship summarization response:', response);
      return response;
    } catch (error) {
      console.error('=== RELATIONSHIP SUMMARIZATION API ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  async updateRelationshipSummary(workspaceId: string, edgeId: string, summary: string, userEdited: boolean = true): Promise<Edge> {
    console.log('=== UPDATE RELATIONSHIP SUMMARY API CALL ===');
    console.log('Workspace ID:', workspaceId);
    console.log('Edge ID:', edgeId);
    console.log('User edited:', userEdited);
    
    try {
      const response = await this.request<Edge>(`/workspaces/${workspaceId}/edges/${edgeId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ai_summary: summary,
          user_edited: userEdited,
          last_ai_update: new Date().toISOString()
        }),
      });
      
      console.log('Update relationship summary response:', response);
      return response;
    } catch (error) {
      console.error('=== UPDATE RELATIONSHIP SUMMARY API ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
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

  // Strategic agent interaction methods
  async strategicInteractWithAgent(data: StrategicInteractionRequest): Promise<StrategicInteractionResponse> {
    console.log('=== STRATEGIC INTERACT API CALL ===');
    console.log('Request data:', data);
    
    try {
      const response = await this.request<StrategicInteractionResponse>('/agents/strategic-interact', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('Strategic interaction response:', response);
      return response;
    } catch (error) {
      console.error('=== STRATEGIC INTERACT ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  // Red team challenge methods
  async generateRedTeamChallenge(data: RedTeamChallengeRequest): Promise<RedTeamChallenge & { challenge_id: string }> {
    console.log('=== GENERATE RED TEAM CHALLENGE API CALL ===');
    console.log('Request data:', data);
    
    try {
      const response = await this.request<RedTeamChallenge & { challenge_id: string }>('/agents/red-team-challenge', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('Red team challenge response:', response);
      return response;
    } catch (error) {
      console.error('=== RED TEAM CHALLENGE ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  async evaluateRedTeamResponse(data: RedTeamResponseRequest): Promise<RedTeamEvaluationResponse> {
    console.log('=== EVALUATE RED TEAM RESPONSE API CALL ===');
    console.log('Request data:', data);
    
    try {
      const response = await this.request<RedTeamEvaluationResponse>('/agents/red-team-response', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('Red team evaluation response:', response);
      return response;
    } catch (error) {
      console.error('=== RED TEAM EVALUATION ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  // Strategic session status methods
  async getStrategicSessionStatus(sessionId: string): Promise<StrategicSessionStatus> {
    console.log('=== GET STRATEGIC SESSION STATUS API CALL ===');
    console.log('Session ID:', sessionId);
    
    try {
      const response = await this.request<StrategicSessionStatus>(`/agents/strategic-session/${sessionId}`);
      
      console.log('Strategic session status response:', response);
      return response;
    } catch (error) {
      console.error('=== STRATEGIC SESSION STATUS ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
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

  async removeMessageFromMap(workspaceId: string, data: RemoveFromMapRequest): Promise<RemoveFromMapResponse> {
    console.log('🗑️ [REMOVE FROM MAP] API call:', { workspaceId, nodeId: data.node_id });
    return await this.request<RemoveFromMapResponse>(`/workspaces/${workspaceId}/messages/remove-from-map`, {
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

// Export individual methods for convenience with proper context binding
export const signup = apiClient.signup.bind(apiClient);
export const login = apiClient.login.bind(apiClient);
export const logout = apiClient.logout.bind(apiClient);
export const getCurrentUser = apiClient.getCurrentUser.bind(apiClient);
export const updateProfile = apiClient.updateProfile.bind(apiClient);
export const getWorkspaces = apiClient.getWorkspaces.bind(apiClient);
export const getWorkspace = apiClient.getWorkspace.bind(apiClient);
export const createWorkspace = apiClient.createWorkspace.bind(apiClient);
export const updateWorkspace = apiClient.updateWorkspace.bind(apiClient);
export const deleteWorkspace = apiClient.deleteWorkspace.bind(apiClient);
export const getNodes = apiClient.getNodes.bind(apiClient);
export const createNode = apiClient.createNode.bind(apiClient);
export const updateNode = apiClient.updateNode.bind(apiClient);
export const deleteNode = apiClient.deleteNode.bind(apiClient);
export const clearAllNodes = apiClient.clearAllNodes.bind(apiClient);
export const getEdges = apiClient.getEdges.bind(apiClient);
export const createEdge = apiClient.createEdge.bind(apiClient);
export const updateEdge = apiClient.updateEdge.bind(apiClient);
export const deleteEdge = apiClient.deleteEdge.bind(apiClient);
export const summarizeRelationship = apiClient.summarizeRelationship.bind(apiClient);
export const updateRelationshipSummary = apiClient.updateRelationshipSummary.bind(apiClient);
export const getAgents = apiClient.getAgents.bind(apiClient);
export const activateAgent = apiClient.activateAgent.bind(apiClient);
export const deactivateAgent = apiClient.deactivateAgent.bind(apiClient);
export const interactWithAgent = apiClient.interactWithAgent.bind(apiClient);
export const getAgentInfo = apiClient.getAgentInfo.bind(apiClient);
export const getMessages = apiClient.getMessages.bind(apiClient);
export const sendMessage = apiClient.sendMessage.bind(apiClient);
export const addMessageToMap = apiClient.addMessageToMap.bind(apiClient);
export const autoArrangeNodes = apiClient.autoArrangeNodes.bind(apiClient);
export const generateBrief = apiClient.generateBrief.bind(apiClient);
export const exportWorkspace = apiClient.exportWorkspace.bind(apiClient);
export const isAuthenticated = apiClient.isAuthenticated.bind(apiClient);
export const clearAuth = apiClient.clearAuth.bind(apiClient);
export const analyzeCognitiveRelationships = apiClient.analyzeCognitiveRelationships.bind(apiClient);
export const autoConnectNodes = apiClient.autoConnectNodes.bind(apiClient);
export const summarizeNodeTitle = apiClient.summarizeNodeTitle.bind(apiClient);
export const summarizeConversation = apiClient.summarizeConversation.bind(apiClient);
export const generateExecutiveSummary = apiClient.generateExecutiveSummary.bind(apiClient);
export const strategicInteractWithAgent = apiClient.strategicInteractWithAgent.bind(apiClient);
export const generateRedTeamChallenge = apiClient.generateRedTeamChallenge.bind(apiClient);
export const evaluateRedTeamResponse = apiClient.evaluateRedTeamResponse.bind(apiClient);
export const getStrategicSessionStatus = apiClient.getStrategicSessionStatus.bind(apiClient);
export const removeMessageFromMap = apiClient.removeMessageFromMap.bind(apiClient);