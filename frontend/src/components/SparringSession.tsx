import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Check, MessageSquare, Bot, User, Loader2 } from 'lucide-react';
import { useAgentChat, ChatMessage } from '@/contexts/AgentChatContext';

interface SparringSessionProps {
  onAddToMap?: (messageId: string) => void;
}

const SparringSession: React.FC<SparringSessionProps> = ({ onAddToMap }) => {
  const [chatMessage, setChatMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    activeAgents,
    agents,
    isLoadingMessages,
    chatError,
    sendMessage,
    addMessageToMap,
    clearMessages
  } = useAgentChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage(chatMessage);
      setChatMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddToMap = async (messageId: string) => {
    try {
      // Enhanced debug logging for new implementation
      console.log('=== NEW ADD TO MAP IMPLEMENTATION ===');
      console.log('Message ID:', messageId);
      console.log('Message ID type:', typeof messageId);
      console.log('Is valid ObjectId format?', /^[0-9a-fA-F]{24}$/.test(messageId));
      
      // Find the message in our local state
      const message = messages.find(m => m.id === messageId);
      console.log('Found message in local state:', message);
      
      // Validate message ID format
      if (!messageId || typeof messageId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(messageId)) {
        console.error('Invalid message ID detected:', { messageId, type: typeof messageId });
        alert('Error: Invalid message ID format. Please refresh the page and try again.');
        return;
      }
      
      // Check if message is already added to map
      if (message?.added_to_map) {
        console.log('Message already added to map');
        alert('This message has already been added to the map.');
        return;
      }
      
      console.log('Calling new addMessageToMap implementation...');
      
      // Call the API with enhanced error handling
      const success = await addMessageToMap(messageId, undefined, 'ai');
      console.log('New addMessageToMap result:', success);
      
      if (success) {
        console.log('Successfully added to map with new implementation!');
        // Show success feedback
        alert('Message successfully added to map! Check the canvas to see the new node.');
        
        // Call the callback if provided
        if (onAddToMap) {
          onAddToMap(messageId);
        }
      } else {
        console.error('New addMessageToMap returned false');
        alert('Failed to add message to map. The message may already be added or there was a server error.');
      }
    } catch (error) {
      console.error('Failed to add message to map with new implementation:', error);
      
      // Enhanced error messaging
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error cases
        if (errorMessage.includes('already been added')) {
          errorMessage = 'This message has already been added to the map.';
        } else if (errorMessage.includes('not found')) {
          errorMessage = 'Message not found. Please refresh the page and try again.';
        } else if (errorMessage.includes('workspace')) {
          errorMessage = 'Workspace error. Please check your workspace selection.';
        }
      }
      
      alert(`Error adding to map: ${errorMessage}`);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getActiveAgentNames = () => {
    return activeAgents
      .map(agentId => agents.find(a => a.agent_id === agentId)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-[#6B6B3A]" />
          <h2 className="text-base font-semibold text-[#E5E7EB]">Strategist Chat</h2>
        </div>
        <button
          onClick={() => clearMessages()}
          className="text-xs px-2 py-1 bg-[#6B6B3A]/20 text-[#E5E7EB] rounded hover:bg-[#6B6B3A]/30 transition-colors border border-[#6B6B3A]/30"
          aria-label="Clear chat messages"
        >
          Clear
        </button>
      </div>

      {/* Active Agents Indicator */}
      {activeAgents.length > 0 && (
        <div className="mb-2 p-2 bg-[#6B6B3A]/10 border border-[#6B6B3A]/20 rounded-md">
          <div className="flex items-center space-x-2 text-xs">
            <Bot className="w-3 h-3 text-[#6B6B3A]" />
            <span className="text-[#6B6B3A] font-medium">Active:</span>
            <span className="text-gray-300 truncate">{getActiveAgentNames()}</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {chatError && (
        <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
          <p className="text-xs text-red-400">
            {chatError === 'No workspace selected'
              ? 'Please select or create a workspace to start chatting'
              : chatError
            }
          </p>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 space-y-3 overflow-y-auto mb-3 pr-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-[#6B6B3A]" />
            <span className="ml-2 text-xs text-gray-400">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MessageSquare className="w-6 h-6 text-gray-500 mb-2" />
            <p className="text-xs text-gray-400 mb-1">No messages yet</p>
            <p className="text-xs text-gray-500">Start a conversation with your strategic agents</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'human' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] glass-pane rounded-lg p-2.5 ${
                  message.type === 'human'
                    ? 'border-[#6B6B3A]/30 bg-[#6B6B3A]/5'
                    : 'border-blue-400/30 bg-blue-500/5'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    {message.type === 'human' ? (
                      <User className="w-3 h-3 text-[#6B6B3A]" />
                    ) : (
                      <Bot className="w-3 h-3 text-blue-400" />
                    )}
                    <span className={`text-xs font-medium ${
                      message.type === 'human' ? 'text-[#6B6B3A]' : 'text-blue-300'
                    }`}>
                      {message.author}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(message.created_at)}
                  </span>
                </div>

                {/* Message Content */}
                <p className="text-xs text-[#E5E7EB] mb-1.5 leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                
                {/* New Add to Map Button Implementation */}
                {message.type === 'ai' && (
                  message.added_to_map ? (
                    <div className="flex items-center space-x-1 text-[10px] px-2 py-1 bg-green-500/20 text-green-300 rounded border border-green-500/30">
                      <Check className="w-3 h-3" />
                      <span>Added to Map</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToMap(message.id)}
                      className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors border border-blue-500/30 font-medium"
                      aria-label={`Add message from ${message.author} to exploration map`}
                      title="Convert this AI response into a visual node on the exploration canvas"
                    >
                      ➕ Add to Map
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0">
        <div className="relative">
          <textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeAgents.length === 0 
                ? "Activate an agent to start chatting..." 
                : "Ask your strategic agents anything..."
            }
            disabled={isSending || activeAgents.length === 0}
            className="w-full glass-pane rounded-lg p-2.5 pr-14 text-xs text-[#E5E7EB] placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-[#6B6B3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            rows={2}
            aria-label="Chat message input"
          />
          
          {/* Input Controls */}
          <div className="absolute bottom-2 right-2 flex space-x-1.5">
            <button 
              className="text-gray-400 hover:text-[#6B6B3A] transition-colors disabled:opacity-50"
              disabled={isSending}
              aria-label="Voice input"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button 
              className="text-gray-400 hover:text-[#6B6B3A] transition-colors disabled:opacity-50"
              disabled={isSending}
              aria-label="Upload file"
            >
              <Upload className="w-4 h-4" />
            </button>
            {isSending && (
              <Loader2 className="w-4 h-4 animate-spin text-[#6B6B3A]" />
            )}
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          disabled={!chatMessage.trim() || isSending || activeAgents.length === 0}
          className="w-full mt-2 px-3 py-2 bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-medium text-xs rounded-lg transition-colors"
        >
          {isSending ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </div>
  );
};

export default SparringSession;