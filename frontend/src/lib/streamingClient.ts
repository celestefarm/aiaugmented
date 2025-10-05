// Streaming client for real-time AI responses
import { apiClient } from './api';

export interface StreamingMessage {
  type: 'status' | 'content' | 'complete' | 'error';
  message?: string;
  content?: string;
  total_length?: number;
  duration?: number;
}

export interface StreamingOptions {
  onStatus?: (message: string) => void;
  onContent?: (content: string) => void;
  onComplete?: (totalLength: number, duration: number) => void;
  onError?: (error: string) => void;
}

export class StreamingChatClient {
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  async streamMessage(
    workspaceId: string,
    content: string,
    agentId: string = 'strategist',
    options: StreamingOptions = {}
  ): Promise<string> {
    console.log('🌊 [STREAMING] Starting streaming request:', {
      workspaceId,
      contentLength: content.length,
      agentId
    });

    // Cancel any existing stream
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    const token = this.getToken();

    if (!token) {
      const error = 'No authentication token available';
      options.onError?.(error);
      throw new Error(error);
    }

    const url = `${this.baseUrl}/workspaces/${workspaceId}/messages/stream`;
    
    try {
      console.log('🚀 [STREAMING] Initiating EventSource connection to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          content,
          agent_id: agentId
        }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [STREAMING] HTTP error:', response.status, errorText);
        const error = `HTTP ${response.status}: ${errorText}`;
        options.onError?.(error);
        throw new Error(error);
      }

      if (!response.body) {
        const error = 'No response body available for streaming';
        options.onError?.(error);
        throw new Error(error);
      }

      console.log('✅ [STREAMING] Successfully connected to stream');
      options.onStatus?.('Connected to AI model...');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('🏁 [STREAMING] Stream completed');
            break;
          }

          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Remove 'data: ' prefix
              
              if (data.trim() === '') continue;

              try {
                const parsed: StreamingMessage = JSON.parse(data);
                console.log('📦 [STREAMING] Received chunk:', parsed.type, parsed.content?.length || 0);

                switch (parsed.type) {
                  case 'status':
                    if (parsed.message) {
                      options.onStatus?.(parsed.message);
                    }
                    break;
                  
                  case 'content':
                    if (parsed.content) {
                      fullResponse += parsed.content;
                      options.onContent?.(parsed.content);
                    }
                    break;
                  
                  case 'complete':
                    console.log('✅ [STREAMING] Stream completed successfully:', {
                      totalLength: parsed.total_length,
                      duration: parsed.duration,
                      actualLength: fullResponse.length
                    });
                    options.onComplete?.(parsed.total_length || fullResponse.length, parsed.duration || 0);
                    return fullResponse;
                  
                  case 'error':
                    const error = parsed.message || 'Unknown streaming error';
                    console.error('❌ [STREAMING] Stream error:', error);
                    
                    // Provide user-friendly error messages
                    let userFriendlyError = error;
                    if (error.includes('429') || error.toLowerCase().includes('rate limit')) {
                      userFriendlyError = '⏱️ Rate limit reached. OpenAI API is temporarily limiting requests. Please wait 60 seconds and try again, or check your OpenAI API quota at platform.openai.com.';
                    } else if (error.includes('401') || error.toLowerCase().includes('unauthorized')) {
                      userFriendlyError = '🔑 OpenAI API key is invalid or missing. Please check your API configuration.';
                    } else if (error.includes('500') || error.includes('502') || error.includes('503')) {
                      userFriendlyError = '🔥 OpenAI service is experiencing issues. Please try again in a moment.';
                    }
                    
                    options.onError?.(userFriendlyError);
                    throw new Error(userFriendlyError);
                }
              } catch (parseError) {
                console.warn('⚠️ [STREAMING] Failed to parse chunk:', data, parseError);
                // Continue processing other chunks
              }
            }
          }
        }

        // If we reach here without a complete signal, return what we have
        console.log('⚠️ [STREAMING] Stream ended without completion signal');
        // CRITICAL FIX: Call onComplete even if backend doesn't send completion signal
        options.onComplete?.(fullResponse.length, 0);
        return fullResponse;

      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('🛑 [STREAMING] Stream aborted by user');
          options.onError?.('Stream cancelled');
          throw new Error('Stream cancelled');
        }
        
        console.error('❌ [STREAMING] Stream error:', error.message);
        options.onError?.(error.message);
        throw error;
      }
      
      const unknownError = 'Unknown streaming error occurred';
      console.error('❌ [STREAMING] Unknown error:', error);
      options.onError?.(unknownError);
      throw new Error(unknownError);
    }
  }

  cancelStream(): void {
    if (this.abortController) {
      console.log('🛑 [STREAMING] Cancelling active stream');
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isStreaming(): boolean {
    return this.abortController !== null && !this.abortController.signal.aborted;
  }
}

// Export singleton instance
export const streamingClient = new StreamingChatClient();

// Convenience function for one-off streaming requests
export async function streamChatMessage(
  workspaceId: string,
  content: string,
  options: StreamingOptions & { agentId?: string } = {}
): Promise<string> {
  const { agentId = 'strategist', ...streamOptions } = options;
  return streamingClient.streamMessage(workspaceId, content, agentId, streamOptions);
}