import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Upload, Check, MessageSquare, Bot, User, Loader2, Zap, Shield, Target, Eye } from 'lucide-react';
import { useAgentChat, ChatMessage } from '@/contexts/AgentChatContext';
import { useMessageMapStatus } from '@/contexts/MessageMapStatusContext';
import { DocumentUploadResponse } from '@/lib/api';
import LightningBriefDisplay from './LightningBriefDisplay';
import RedTeamInterface from './RedTeamInterface';
import EvidenceQualityDashboard from './EvidenceQualityDashboard';
import FileUpload from './FileUpload';
import DocumentMessage from './DocumentMessage';

interface SparringSessionProps {
  onAddToMap?: (messageId: string) => void;
  onNodeDeleted?: (messageId: string) => void;
}

const SparringSession: React.FC<SparringSessionProps> = ({ onAddToMap, onNodeDeleted }) => {
  const [chatMessage, setChatMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [addingToMap, setAddingToMap] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'chat' | 'lightning' | 'redteam' | 'evidence'>('chat');
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentUploadResponse[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messageMapStatus, initializeStatus } = useMessageMapStatus();
  
  const {
    messages,
    activeAgents,
    agents,
    isLoadingMessages,
    chatError,
    sendMessage,
    addMessageToMap,
    clearMessages,
    refreshMessages,
    // Strategic functionality
    isStrategicMode,
    currentStrategicSession,
    currentPhase,
    lightningBrief,
    currentRedTeamChallenge,
    strategicSessionStatus,
    startStrategicSession,
    sendStrategicMessage,
    generateRedTeamChallenge,
    respondToRedTeamChallenge,
    toggleStrategicMode,
    resetStrategicSession
  } = useAgentChat();

  useEffect(() => {
    console.log('🔄 [SPARRING SESSION] Messages updated, reinitializing status:', messages.map(m => ({
      id: m.id,
      content: m.content.substring(0, 30) + '...',
      added_to_map: m.added_to_map
    })));
    
    if (messages.length > 0) {
      initializeStatus(messages);
    }
  }, [messages, initializeStatus]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isSending) return;
    
    setIsSending(true);
    try {
      if (isStrategicMode && currentStrategicSession) {
        // Use strategic interaction for strategist agent
        await sendStrategicMessage(chatMessage, false);
      } else if (isStrategicMode && !currentStrategicSession) {
        // Start strategic session
        await startStrategicSession('strategist');
        await sendStrategicMessage(chatMessage, false);
      } else {
        // Use regular chat
        await sendMessage(chatMessage);
      }
      setChatMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartStrategicSession = async () => {
    try {
      await startStrategicSession('strategist');
      setActiveTab('chat');
    } catch (error) {
      console.error('Failed to start strategic session:', error);
    }
  };

  const handleRedTeamChallenge = async (challengeType?: string, targetContent?: string) => {
    try {
      await generateRedTeamChallenge(challengeType, targetContent, 'moderate');
      setActiveTab('redteam');
    } catch (error) {
      console.error('Failed to generate red team challenge:', error);
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
      console.log('=== ENHANCED ADD TO MAP IMPLEMENTATION ===');
      console.log('Message ID:', messageId);
      console.log('Message ID type:', typeof messageId);
      console.log('Is valid ObjectId format?', /^[0-9a-fA-F]{24}$/.test(messageId));
      
      // Find the message in our local state
      const message = messages.find(m => m.id === messageId);
      console.log('Found message in local state:', message);
      console.log('Current messages state:', messages.map(m => ({ id: m.id, type: m.type, added_to_map: m.added_to_map })));
      
      // Validate message ID format
      if (!messageId || typeof messageId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(messageId)) {
        console.error('Invalid message ID detected:', { messageId, type: typeof messageId });
        showToast('Error: Invalid message ID format. Please refresh the page and try again.', 'error');
        return;
      }
      
      // Check if message is already added to map
      if (message?.added_to_map) {
        console.log('Message already added to map - preventing duplicate addition');
        showToast('This message has already been added to the map.', 'warning');
        return;
      }
      
      // Prevent multiple simultaneous requests for the same message
      if (addingToMap.has(messageId)) {
        console.log('Already processing this message - preventing duplicate request');
        showToast('This message is already being added to the map. Please wait...', 'warning');
        return;
      }
      
      // Mark message as being processed
      setAddingToMap(prev => new Set(prev).add(messageId));
      
      console.log('Calling enhanced addMessageToMap implementation...');
      
      try {
        // Determine the correct node type based on message type
        const nodeType = message?.type === 'human' ? 'human' : 'ai';
        console.log('Using node type:', nodeType, 'for message type:', message?.type);
        
        // Call the API with the correct node type
        const success = await addMessageToMap(messageId, undefined, nodeType);
        console.log('Enhanced addMessageToMap result:', success);
        
        if (success) {
          console.log('Successfully added to map with enhanced implementation!');
          // Show success feedback with toast
          const messageTypeText = message?.type === 'human' ? 'Human input' : 'AI response';
          showToast(`${messageTypeText} successfully added to map! Check the canvas to see the new node.`, 'success');
          
          // Call the callback if provided
          if (onAddToMap) {
            onAddToMap(messageId);
          }
        } else {
          console.error('Enhanced addMessageToMap returned false');
          showToast('Failed to add message to map. The message may already be added or there was a server error.', 'error');
        }
      } finally {
        // Always remove from processing set
        setAddingToMap(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to add message to map with enhanced implementation:', error);
      
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
      
      showToast(`Error adding to map: ${errorMessage}`, 'error');
      
      // Remove from processing set on error
      setAddingToMap(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-600' :
      type === 'error' ? 'bg-red-600' :
      'bg-yellow-600'
    }`;
    toast.textContent = message;
    toast.style.transform = 'translateX(100%)';
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  // File upload handlers
  const handleFileUploaded = useCallback((documents: DocumentUploadResponse[]) => {
    console.log('=== FILES UPLOADED CALLBACK CALLED ===');
    console.log('Number of documents received:', documents.length);
    console.log('Document names:', documents.map(d => d.filename));
    console.log('Full documents array:', documents);
    
    // Ensure we're appending to existing documents, not replacing them
    setUploadedDocuments(prev => {
      console.log('Previous uploaded documents count:', prev.length);
      console.log('Previous document names:', prev.map(d => d.filename));
      const newDocuments = [...prev, ...documents];
      console.log('Updated uploaded documents (total count):', newDocuments.length);
      console.log('All document names after update:', newDocuments.map(d => d.filename));
      return newDocuments;
    });
    setUploadError(null);
    
    // Show success message
    showToast(`Successfully uploaded ${documents.length} document(s)!`, 'success');
  }, []);

  const handleUploadError = useCallback((error: string) => {
    console.error('=== FILE UPLOAD ERROR ===');
    console.error('Upload error:', error);
    
    setUploadError(error);
    showToast(`Upload failed: ${error}`, 'error');
  }, []);

  const handleDocumentAddToMap = useCallback((documentId: string, nodeId: string) => {
    console.log('=== DOCUMENT ADDED TO MAP ===');
    console.log('Document ID:', documentId);
    console.log('Node ID:', nodeId);
    
    showToast('Document successfully added to exploration map!', 'success');
    
    // Call the parent callback if provided
    if (onAddToMap) {
      onAddToMap(nodeId);
    }
  }, [onAddToMap]);

  const getActiveAgentNames = () => {
    return activeAgents
      .map(agentId => agents.find(a => a.agent_id === agentId)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <div className="flex items-center space-x-2">
          {isStrategicMode ? (
            <Zap className="w-4 h-4 text-blue-400" />
          ) : (
            <MessageSquare className="w-4 h-4 text-[#6B6B3A]" />
          )}
          <h2 className="text-base font-semibold text-[#E5E7EB]">
            {isStrategicMode ? 'Strategic Analysis' : 'Strategist Chat'}
          </h2>
          {currentPhase && (
            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
              {currentPhase.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleStrategicMode}
            className={`text-xs px-2 py-1 rounded transition-colors border ${
              isStrategicMode
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                : 'bg-[#6B6B3A]/20 text-[#E5E7EB] border-[#6B6B3A]/30 hover:bg-[#6B6B3A]/30'
            }`}
            aria-label="Toggle strategic mode"
          >
            {isStrategicMode ? '⚡ Strategic' : '💬 Chat'}
          </button>
          {isStrategicMode && (
            <button
              onClick={resetStrategicSession}
              className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors border border-red-500/30"
              aria-label="Reset strategic session"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => clearMessages()}
            className="text-xs px-2 py-1 bg-[#6B6B3A]/20 text-[#E5E7EB] rounded hover:bg-[#6B6B3A]/30 transition-colors border border-[#6B6B3A]/30"
            aria-label="Clear chat messages"
          >
            Clear
          </button>
          <button
            onClick={() => refreshMessages()}
            className="text-xs px-2 py-1 bg-[#6B6B3A]/20 text-[#E5E7EB] rounded hover:bg-[#6B6B3A]/30 transition-colors border border-[#6B6B3A]/30"
            aria-label="Refresh chat messages"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Strategic Mode Tabs */}
      {isStrategicMode && (
        <div className="flex space-x-1 mb-3 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-blue-300 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('lightning')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'lightning'
                ? 'text-blue-300 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            disabled={!lightningBrief}
          >
            ⚡ Lightning Brief
            {lightningBrief && <span className="ml-1 w-2 h-2 bg-blue-400 rounded-full inline-block"></span>}
          </button>
          <button
            onClick={() => setActiveTab('redteam')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'redteam'
                ? 'text-blue-300 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🛡️ Red Team
            {currentRedTeamChallenge && <span className="ml-1 w-2 h-2 bg-red-400 rounded-full inline-block"></span>}
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'evidence'
                ? 'text-blue-300 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📊 Evidence
          </button>
        </div>
      )}

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

      {/* Upload Error Display */}
      {uploadError && (
        <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
          <p className="text-xs text-red-400">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="text-xs text-red-300 hover:text-red-200 mt-1"
          >
            Dismiss
          </button>
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
                </div>

                {/* Message Content */}
                <p className="text-xs text-[#E5E7EB] mb-1.5 leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                
                {/* Enhanced Add to Map Button Implementation - Now supports both AI and Human messages */}
                {(message.type === 'ai' || message.type === 'human') && (
                  messageMapStatus[message.id] ? (
                    <div className={`flex items-center space-x-1 text-[10px] px-2 py-1 rounded border ${
                      message.type === 'human'
                        ? 'bg-green-500/20 text-green-300 border-green-500/30'
                        : 'bg-green-500/20 text-green-300 border-green-500/30'
                    }`}>
                      <Check className="w-3 h-3" />
                      <span>Added to Map</span>
                    </div>
                  ) : addingToMap.has(message.id) ? (
                    <div className={`flex items-center space-x-1 text-[10px] px-2 py-1 rounded border ${
                      message.type === 'human'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                    }`}>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Adding...</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToMap(message.id)}
                      className={`text-[10px] px-2 py-1 rounded hover:opacity-80 transition-colors border font-medium ${
                        message.type === 'human'
                          ? 'bg-[#6B6B3A]/20 text-[#6B6B3A] border-[#6B6B3A]/30 hover:bg-[#6B6B3A]/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                      }`}
                      aria-label={`Add ${message.type} message from ${message.author} to exploration map`}
                      title={`Convert this ${message.type === 'human' ? 'human input' : 'AI response'} into a visual node on the exploration canvas`}
                    >
                      ➕ Add to Map
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}

        {/* Uploaded Documents Display */}
        {uploadedDocuments.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-4 h-4 text-[#6B6B3A]" />
              <span className="text-xs font-medium text-[#6B6B3A]">Uploaded Documents</span>
            </div>
            <DocumentMessage
              documents={uploadedDocuments}
              onAddToMap={handleDocumentAddToMap}
            />
          </div>
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
            <FileUpload
              onFileUploaded={handleFileUploaded}
              onError={handleUploadError}
              disabled={isSending}
            />
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