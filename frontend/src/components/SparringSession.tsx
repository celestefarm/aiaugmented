import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Upload, Check, MessageSquare, Bot, User, Loader2, Zap, Shield, Target, Eye, X, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAgentChat, ChatMessage } from '@/contexts/AgentChatContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMessageMapStatus } from '@/contexts/MessageMapStatusContext';
import { DocumentUploadResponse, uploadDocuments } from '@/lib/api';
import LightningBriefDisplay from './LightningBriefDisplay';
import RedTeamInterface from './RedTeamInterface';
import EvidenceQualityDashboard from './EvidenceQualityDashboard';
import FileUpload from './FileUpload';
import DocumentMessage from './DocumentMessage';

interface SparringSessionProps {
  onAddToMap?: (messageId: string) => void;
  onNodeDeleted?: (messageId: string) => void;
  onRegisterNodeDeletedHandler?: (handler: (nodeId: string) => void) => void;
}

const SparringSession: React.FC<SparringSessionProps> = ({ onAddToMap, onNodeDeleted, onRegisterNodeDeletedHandler }) => {
  const [chatMessage, setChatMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [addingToMap, setAddingToMap] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'chat' | 'lightning' | 'redteam' | 'evidence'>('chat');
  const [uploadError, setUploadError] = useState<string | null>(null);
  // New state for staged file attachments
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const intersectionObserver = useRef<IntersectionObserver | null>(null);
  const { messageMapStatus, initializeStatus, resetStatusByNodeId } = useMessageMapStatus();
  
  const {
    messages,
    activeAgents,
    agents,
    isLoadingMessages,
    chatError,
    isInitialLoad,
    sendMessage,
    sendStreamingMessage,
    addDocumentMessage,
    addMessageToMap,
    clearMessages,
    refreshMessages,
    // Streaming state
    isStreaming,
    streamingStatus,
    cancelStream,
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

  // Local error state for UI-specific errors
  const [localError, setLocalError] = useState<string | null>(null);

  // Get workspace ID for localStorage key
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

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

  // Check if user is at bottom of chat
  const checkIfUserAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold
    setIsUserAtBottom(isAtBottom);
    return isAtBottom;
  }, []);

  // Monitor scroll position to track if user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const wasAtBottom = isUserAtBottom;
      const nowAtBottom = checkIfUserAtBottom();
      
      // STREAMING AUTO-SCROLL: If user scrolled back to bottom during streaming, resume auto-scroll
      if (!wasAtBottom && nowAtBottom && isStreaming) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🌊 [STREAMING AUTO-SCROLL] User returned to bottom during streaming - resuming auto-scroll');
        }
        
        const scrollToBottom = () => {
          messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
          });
        };
        
        // Small delay to ensure smooth transition
        setTimeout(() => {
          requestAnimationFrame(scrollToBottom);
        }, 100);
      }
    };

    container.addEventListener('scroll', handleScroll);
    
    // Check initial state
    checkIfUserAtBottom();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIfUserAtBottom, isUserAtBottom, isStreaming]);

  // CONSOLIDATED AUTO-SCROLL: Single effect to handle all scroll scenarios
  useEffect(() => {
    const hasNewMessages = messages.length > previousMessageCount;
    setPreviousMessageCount(messages.length);

    if (messages.length === 0) return;

    // DIAGNOSTIC: Log auto-scroll decisions for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [CONSOLIDATED-SCROLL] Auto-scroll effect triggered:', {
        messagesLength: messages.length,
        previousMessageCount,
        hasNewMessages,
        isInitialLoad,
        isUserAtBottom,
        isStreaming,
        isLoadingMessages
      });
    }

    const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📜 [CONSOLIDATED-SCROLL] Executing scroll to bottom with behavior:', behavior);
      }
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: 'end'
      });
    };

    // PRIORITY 1: Initial load - always scroll immediately with no animation
    if (isInitialLoad && !isLoadingMessages) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📜 [CONSOLIDATED-SCROLL] Initial load complete - scrolling immediately');
      }
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => scrollToBottom('auto'), 100);
      return;
    }

    // PRIORITY 2: Streaming content - smooth scroll if user is at bottom
    if (isStreaming && isUserAtBottom) {
      const streamingMessage = messages.find(msg =>
        msg.id.startsWith('streaming_ai_') || msg.id.startsWith('temp_ai_')
      );
      
      if (streamingMessage) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🌊 [CONSOLIDATED-SCROLL] Streaming content update - smooth scroll');
        }
        // Debounced scroll for streaming
        const timeoutId = setTimeout(() => scrollToBottom('smooth'), 50);
        return () => clearTimeout(timeoutId);
      }
    }

    // PRIORITY 3: New messages - only scroll if user is at bottom
    if (hasNewMessages && isUserAtBottom && !isInitialLoad && !isLoadingMessages) {
      if (process.env.NODE_ENV === 'development') {
        console.log('📜 [CONSOLIDATED-SCROLL] New messages and user at bottom - smooth scroll');
      }
      const timeoutId = setTimeout(() => scrollToBottom('smooth'), 100);
      return () => clearTimeout(timeoutId);
    }

    // DIAGNOSTIC: Log when auto-scroll is skipped (development only)
    if (process.env.NODE_ENV === 'development' && hasNewMessages && !isUserAtBottom) {
      console.log('📜 [CONSOLIDATED-SCROLL] New messages but user not at bottom - skipping scroll');
    }
  }, [messages, isInitialLoad, isUserAtBottom, previousMessageCount, isStreaming, isLoadingMessages]);

  // Load last read message ID from localStorage
  useEffect(() => {
    if (workspaceId) {
      const savedLastRead = localStorage.getItem(`lastReadMessage_${workspaceId}`);
      if (savedLastRead) {
        setLastReadMessageId(savedLastRead);
      }
    }
  }, [workspaceId]);

  // Set up intersection observer for message visibility tracking
  useEffect(() => {
    if (!messagesContainerRef.current) return;

    intersectionObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              markMessageAsRead(messageId);
            }
          }
        });
      },
      {
        root: messagesContainerRef.current,
        rootMargin: '0px',
        threshold: 0.5
      }
    );

    return () => {
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect();
      }
    };
  }, []);

  // Mark message as read and update localStorage
  const markMessageAsRead = useCallback((messageId: string) => {
    setLastReadMessageId(prev => {
      // Only update if this message is newer than the current last read
      const messageIndex = messages.findIndex(m => m.id === messageId);
      const currentLastReadIndex = prev ? messages.findIndex(m => m.id === prev) : -1;
      
      if (messageIndex > currentLastReadIndex) {
        if (workspaceId) {
          localStorage.setItem(`lastReadMessage_${workspaceId}`, messageId);
        }
        return messageId;
      }
      return prev;
    });
  }, [messages, workspaceId]);

  // Calculate unread messages count
  useEffect(() => {
    if (!lastReadMessageId || messages.length === 0) {
      setUnreadCount(0);
      return;
    }

    const lastReadIndex = messages.findIndex(m => m.id === lastReadMessageId);
    if (lastReadIndex === -1) {
      // Last read message not found, consider all messages as unread
      setUnreadCount(messages.length);
    } else {
      // Count messages after the last read message
      const unreadMessages = messages.slice(lastReadIndex + 1);
      setUnreadCount(unreadMessages.length);
    }
  }, [messages, lastReadMessageId]);

  // Observe new messages for visibility tracking
  useEffect(() => {
    if (!intersectionObserver.current) return;

    // Observe all message elements
    messageRefs.current.forEach((element, messageId) => {
      if (element) {
        intersectionObserver.current?.observe(element);
      }
    });

    return () => {
      if (intersectionObserver.current) {
        messageRefs.current.forEach((element) => {
          if (element) {
            intersectionObserver.current?.unobserve(element);
          }
        });
      }
    };
  }, [messages]);

  // Auto-mark messages as read when user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      if (isAtBottom && messages.length > 0) {
        // Mark the last message as read when user is at bottom
        const lastMessage = messages[messages.length - 1];
        markMessageAsRead(lastMessage.id);
      }
    };

    container.addEventListener('scroll', handleScroll);
    
    // Check initial state
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages, markMessageAsRead]);

  // Function to manually scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    });
    
    // Mark all messages as read when manually scrolling to bottom
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markMessageAsRead(lastMessage.id);
    }
  }, [messages, markMessageAsRead]);

  // Set message ref for intersection observer
  const setMessageRef = useCallback((messageId: string, element: HTMLDivElement | null) => {
    if (element) {
      messageRefs.current.set(messageId, element);
    } else {
      messageRefs.current.delete(messageId);
    }
  }, []);

  const handleSendMessage = async () => {
    // Check if we have either text message or staged files
    if ((!chatMessage.trim() && stagedFiles.length === 0) || isSending || isStreaming) return;
    
    setIsSending(true);
    setIsUploadingFiles(stagedFiles.length > 0);
    
    try {
      // If we have staged files, upload them first and create document message
      if (stagedFiles.length > 0) {
        console.log('🚀 [STREAMLINED WORKFLOW] Uploading files with message:', chatMessage);
        showToast(`Uploading ${stagedFiles.length} file(s) and sending message...`, 'success');
        
        if (!currentWorkspace) {
          throw new Error('No workspace selected');
        }

        // Upload files
        const uploadedDocuments = await uploadDocuments(currentWorkspace.id, stagedFiles);
        console.log('📁 Files uploaded successfully:', uploadedDocuments.length);

        // Create document message with the uploaded files
        await addDocumentMessage(uploadedDocuments);
        
        // Clear staged files
        setStagedFiles([]);
        
        // If there's also a text message, send it as a follow-up
        if (chatMessage.trim()) {
          console.log('💬 Sending follow-up text message:', chatMessage);
          
          if (isStrategicMode && currentStrategicSession) {
            await sendStrategicMessage(chatMessage, false);
          } else if (isStrategicMode && !currentStrategicSession) {
            await startStrategicSession('strategist');
            await sendStrategicMessage(chatMessage, false);
          } else {
            await sendStreamingMessage(chatMessage);
          }
        }
        
        setChatMessage('');
        showToast('Files uploaded and message sent successfully!', 'success');
      } else {
        // No files, just send text message
        console.log('💬 [STREAMLINED WORKFLOW] Sending text-only message');
        showToast('Message sent! AI is processing your request...', 'success');
        
        if (isStrategicMode && currentStrategicSession) {
          await sendStrategicMessage(chatMessage, false);
        } else if (isStrategicMode && !currentStrategicSession) {
          await startStrategicSession('strategist');
          await sendStrategicMessage(chatMessage, false);
        } else {
          await sendStreamingMessage(chatMessage);
        }
        
        setChatMessage('');
        showToast('Response received!', 'success');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message. Please try again.', 'error');
    } finally {
      setIsSending(false);
      setIsUploadingFiles(false);
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
      
      // CRITICAL FIX: Skip document messages - they have their own Add to Map system
      if (message?.type === 'document') {
        console.log('🚫 [SPARRING SESSION] Skipping document message - handled by DocumentMessage component');
        return;
      }
      
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

  // Placeholder functions for thumbs up/down buttons
  const handleThumbsUp = useCallback((messageId: string) => {
    console.log('👍 Thumbs up clicked for message:', messageId);
    showToast('Thanks for your feedback! 👍', 'success');
  }, []);

  const handleThumbsDown = useCallback((messageId: string) => {
    console.log('👎 Thumbs down clicked for message:', messageId);
    showToast('Thanks for your feedback! 👎', 'success');
  }, []);

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

  // New streamlined file staging handlers
  const handleFilesStaged = useCallback((files: File[]) => {
    console.log('=== FILES STAGED FOR COMBINED SUBMISSION ===');
    console.log('Number of files staged:', files.length);
    console.log('File names:', files.map(f => f.name));
    
    setStagedFiles(prev => [...prev, ...files]);
    setUploadError(null);
    showToast(`${files.length} file(s) ready to send with your message`, 'success');
  }, []);

  // Legacy handler for backward compatibility (if needed)
  const handleFileUploaded = useCallback(async (documents: DocumentUploadResponse[]) => {
    console.log('=== LEGACY FILES UPLOADED CALLBACK ===');
    console.log('Number of documents received:', documents.length);
    
    try {
      await addDocumentMessage(documents);
      setUploadError(null);
      showToast(`Successfully uploaded ${documents.length} document(s)!`, 'success');
    } catch (error) {
      console.error('Failed to create document message:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to create document message');
      showToast('Failed to create document message', 'error');
    }
  }, [addDocumentMessage]);

  const handleUploadError = useCallback((error: string) => {
    console.error('=== FILE UPLOAD ERROR ===');
    console.error('Upload error:', error);
    
    setUploadError(error);
    showToast(`Upload failed: ${error}`, 'error');
  }, []);

  // Remove staged file
  const removeStagedFile = useCallback((index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all staged files
  const clearStagedFiles = useCallback(() => {
    setStagedFiles([]);
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

  // Handle node deletion callback to reset document button states
  const handleNodeDeleted = useCallback((nodeId: string) => {
    console.log('=== NODE DELETED CALLBACK ===');
    console.log('Deleted Node ID:', nodeId);
    
    // Collect all documents from all document messages
    const allDocuments: { id: string; added_to_map_node_id?: string }[] = [];
    
    messages.forEach(message => {
      if (message.type === 'document' && message.documents) {
        message.documents.forEach(doc => {
          allDocuments.push({
            id: doc.id,
            added_to_map_node_id: doc.added_to_map_node_id
          });
        });
      }
    });
    
    // Reset status for any documents that had this node
    resetStatusByNodeId(nodeId, allDocuments);
    
    // Call the parent callback if provided
    if (onNodeDeleted) {
      onNodeDeleted(nodeId);
    }
  }, [messages, onNodeDeleted, resetStatusByNodeId]);

  // Register the node deletion handler with the parent component
  useEffect(() => {
    if (onRegisterNodeDeletedHandler) {
      onRegisterNodeDeletedHandler(handleNodeDeleted);
    }
  }, [onRegisterNodeDeletedHandler, handleNodeDeleted]);

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

      {/* Enhanced Error Display with Streaming Error Handling */}
      {chatError && (
        <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <X className="w-3 h-3 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">
                {chatError === 'No workspace selected'
                  ? 'Please select or create a workspace to start chatting'
                  : chatError.includes('Streaming error')
                  ? 'Streaming failed. You can retry your message.'
                  : chatError.includes('Stream cancelled')
                  ? 'Response was cancelled. You can send your message again.'
                  : chatError
                }
              </p>
            </div>
            <button
              onClick={() => {
                // Clear local error if it exists, otherwise try to clear chat by refreshing
                if (localError) {
                  setLocalError(null);
                } else {
                  // Trigger a refresh to clear the error state
                  refreshMessages();
                }
              }}
              className="text-xs text-red-300 hover:text-red-200 transition-colors ml-2"
              title="Dismiss error"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
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
      <div
        ref={messagesContainerRef}
        className="flex-1 space-y-3 overflow-y-auto mb-3 pr-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600"
      >
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
              className={`flex ${message.type === 'human' || message.type === 'document' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'document' ? (
                // Document Message Display
                <div className="max-w-[90%] rounded-lg p-2.5 border border-[#6B6B3A]/30 bg-transparent">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-4 h-4 text-[#6B6B3A]" />
                    <span className="text-xs font-medium text-[#6B6B3A]">Document Upload</span>
                    <span className="text-xs text-gray-400">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {message.documents && (
                    <DocumentMessage
                      documents={message.documents}
                      onAddToMap={handleDocumentAddToMap}
                    />
                  )}
                </div>
              ) : (
                // Regular Text Message Display
                <div
                  className={`max-w-[90%] p-2.5 ${
                    message.type === 'human'
                      ? 'rounded-2xl border border-gray-600/30 bg-transparent shadow-lg shadow-gray-600/20 backdrop-blur-sm'
                      : 'bg-transparent rounded-lg'
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

                  {/* Message Content with Enhanced Loading States */}
                  <div className="text-xs text-[#E5E7EB] mb-1.5 leading-relaxed whitespace-pre-wrap">
                    {message.id.startsWith('temp_ai_') ? (
                      // Show typing indicator for temporary AI messages
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-blue-300 italic">{message.content}</span>
                      </div>
                    ) : (
                      <span>{message.content}</span>
                    )}
                  </div>
                  
                  {/* Bottom section with Add to Map button and Thumbs Up/Down for AI messages */}
                  <div className="space-y-2">
                    {/* Enhanced Add to Map Button Implementation - Now supports both AI and Human messages */}
                    <div>
                      {(message.type === 'ai' || message.type === 'human') && (
                        messageMapStatus[message.id] ? (
                          <div className={`inline-flex items-center space-x-1 text-[10px] px-2 py-1 rounded-md border shadow-sm backdrop-blur-sm ${
                            message.type === 'human'
                              ? 'bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 text-emerald-200 border-emerald-700/40'
                              : 'bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 text-emerald-200 border-emerald-700/40'
                          }`}>
                            <Check className="w-3 h-3" />
                            <span>Added to Map</span>
                          </div>
                        ) : addingToMap.has(message.id) ? (
                          <div className={`inline-flex items-center space-x-1 text-[10px] px-2 py-1 rounded border ${
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
                    
                    {/* Thumbs Up/Down buttons for AI messages only - moved below Add to Map */}
                    {message.type === 'ai' && !message.id.startsWith('temp_ai_') && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleThumbsUp(message.id)}
                          className="p-1 rounded hover:bg-green-500/20 transition-colors group"
                          title="Good response"
                          aria-label="Rate response as helpful"
                        >
                          <ThumbsUp className="w-3 h-3 text-gray-400 group-hover:text-green-400 transition-colors" />
                        </button>
                        <button
                          onClick={() => handleThumbsDown(message.id)}
                          className="p-1 rounded hover:bg-red-500/20 transition-colors group"
                          title="Poor response"
                          aria-label="Rate response as unhelpful"
                        >
                          <ThumbsDown className="w-3 h-3 text-gray-400 group-hover:text-red-400 transition-colors" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Unread Messages Indicator */}
      {unreadCount > 0 && (
        <div className="absolute bottom-20 right-4 z-10 animate-in fade-in duration-300">
          <button
            onClick={scrollToBottom}
            className="bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-white px-3 py-2 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 text-xs font-medium"
            title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
          >
            <span>↓</span>
            <span>{unreadCount} new message{unreadCount > 1 ? 's' : ''}</span>
          </button>
        </div>
      )}

      {/* Input Area with Enhanced States */}
      <div className="flex-shrink-0">
        {/* Enhanced AI Processing Indicator with Streaming Status and Smooth Transitions */}
        {(isSending || isStreaming) && (
          <div className="mb-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-md transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-blue-300 font-medium transition-all duration-200">
                  {streamingStatus || 'AI is typing...'}
                </span>
              </div>
              {isStreaming && (
                <button
                  onClick={cancelStream}
                  className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors border border-red-500/30"
                  title="Cancel streaming response"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="mt-1 text-xs text-blue-200/70 transition-all duration-200">
              {isStreaming
                ? 'Streaming response in real-time...'
                : 'This may take 10-30 seconds for complex requests'
              }
            </div>
          </div>
        )}

        
        {/* Staged Files Display */}
        {stagedFiles.length > 0 && (
          <div className="mb-2 p-2 bg-[#6B6B3A]/10 border border-[#6B6B3A]/20 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Upload className="w-3 h-3 text-[#6B6B3A]" />
                <span className="text-xs font-medium text-[#6B6B3A]">
                  {stagedFiles.length} file(s) ready to send
                </span>
              </div>
              <button
                onClick={clearStagedFiles}
                className="text-xs text-gray-400 hover:text-white transition-colors"
                title="Clear all files"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {stagedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-gray-700/50 px-2 py-1 rounded text-xs"
                >
                  <span className="text-gray-300 truncate max-w-24" title={file.name}>
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeStagedFile(index)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="relative">
          <textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isSending || isStreaming
                ? "Please wait for the current response..."
                : activeAgents.length === 0
                ? "Activate an agent to start chatting..."
                : stagedFiles.length > 0
                ? "Type your message about the attached files..."
                : "Ask your strategic agents anything..."
            }
            disabled={isSending || isStreaming || activeAgents.length === 0}
            className={`w-full glass-pane-no-glow rounded-lg p-2.5 pr-14 text-xs text-[#E5E7EB] placeholder-gray-400 resize-none focus:outline-none focus:ring-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isSending || isStreaming
                ? 'focus:ring-blue-400 border-blue-400/30'
                : 'focus:ring-[#6B6B3A]'
            }`}
            rows={2}
            aria-label="Chat message input"
          />
          
          {/* Input Controls */}
          <div className="absolute bottom-2 right-2 flex space-x-1.5">
            <button
              className="text-gray-400 hover:text-[#6B6B3A] transition-colors disabled:opacity-50"
              disabled={isSending || isStreaming}
              aria-label="Voice input"
            >
              <Mic className="w-4 h-4" />
            </button>
            <FileUpload
              onFilesStaged={handleFilesStaged}
              onError={handleUploadError}
              disabled={isSending || isStreaming}
              mode="staged"
            />
            {(isSending || isStreaming) && (
              <Loader2 className="w-4 h-4 animate-spin text-[#6B6B3A]" />
            )}
          </div>
        </div>

        {/* Enhanced Send Button with File Upload Support */}
        <button
          onClick={handleSendMessage}
          disabled={(!chatMessage.trim() && stagedFiles.length === 0) || isSending || isStreaming || activeAgents.length === 0}
          className={`w-full mt-2 px-3 py-2 font-medium text-xs rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            isSending || isStreaming
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 cursor-wait'
              : chatError && chatError.includes('Streaming error')
              ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
              : (!chatMessage.trim() && stagedFiles.length === 0) || activeAgents.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-[#6B6B3A] hover:bg-[#6B6B3A]/80 text-black hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isSending || isStreaming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {isUploadingFiles ? 'Uploading files...' :
                 isStreaming ? 'Streaming...' : 'AI Processing...'}
              </span>
            </>
          ) : chatError && chatError.includes('Streaming error') ? (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Retry Message</span>
            </>
          ) : (
            <>
              {stagedFiles.length > 0 ? (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Send Files & Message</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Message</span>
                </>
              )}
            </>
          )}
        </button>
        
        {/* AI Disclaimer for Responsible Usage */}
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-400 italic leading-relaxed">
            AI Agents can make mistakes. Please double-check responses.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SparringSession;