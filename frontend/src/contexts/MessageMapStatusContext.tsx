import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface MessageMapStatusContextType {
  messageMapStatus: Record<string, boolean>;
  setMessageStatus: (messageId: string, status: boolean) => void;
  initializeStatus: (messages: { id: string; added_to_map: boolean }[]) => void;
  resetDocumentStatus: (documentId: string) => void;
  resetStatusByNodeId: (nodeId: string, documents: { id: string; added_to_map_node_id?: string }[]) => void;
  resetDocumentStatusByNodeId: (nodeId: string, documentId: string) => void;
  syncWithCanvasState: (nodes: any[], messages: any[]) => void;
}

const MessageMapStatusContext = createContext<MessageMapStatusContextType | undefined>(undefined);

export const MessageMapStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messageMapStatus, setMessageMapStatus] = useState<Record<string, boolean>>({});
  const lastSyncRef = useRef<string>('');

  const setMessageStatus = useCallback((messageId: string, status: boolean) => {
    console.log('=== MESSAGE MAP STATUS UPDATE ===');
    console.log('Message ID:', messageId);
    console.log('Status:', status);
    
    setMessageMapStatus(prev => ({
      ...prev,
      [messageId]: status
    }));
  }, []);

  const initializeStatus = useCallback((messages: { id: string; added_to_map: boolean }[]) => {
    const newStatus: Record<string, boolean> = {};
    messages.forEach(msg => {
      newStatus[msg.id] = msg.added_to_map || false;
    });
    setMessageMapStatus(newStatus);
  }, []);

  const resetDocumentStatus = useCallback((documentId: string) => {
    console.log('=== RESET DOCUMENT STATUS ===');
    console.log('Document ID:', documentId);
    
    setMessageMapStatus(prev => ({
      ...prev,
      [documentId]: false
    }));
  }, []);

  const resetStatusByNodeId = useCallback((nodeId: string, documents: { id: string; added_to_map_node_id?: string }[]) => {
    console.log('=== RESET STATUS BY NODE ID ===');
    console.log('Node ID:', nodeId);
    console.log('Documents to check:', documents.length);
    
    // Find documents that had this node and reset their status
    const documentsToReset = documents.filter(doc => doc.added_to_map_node_id === nodeId);
    
    if (documentsToReset.length > 0) {
      console.log('Resetting status for documents:', documentsToReset.map(d => d.id));
      
      setMessageMapStatus(prev => {
        const updated = { ...prev };
        documentsToReset.forEach(doc => {
          updated[doc.id] = false;
        });
        return updated;
      });
    } else {
      console.log('No documents found with matching node ID, checking all message statuses...');
      
      // ENHANCED FIX: Also reset any message status that might be associated with this node
      // This handles cases where the document ID is used as the key in messageMapStatus
      setMessageMapStatus(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        // Check if any of the current documents should be reset based on the deleted node
        documents.forEach(doc => {
          if (prev[doc.id] === true) {
            console.log('Resetting status for document (fallback):', doc.id);
            updated[doc.id] = false;
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }
  }, []);

  const resetDocumentStatusByNodeId = useCallback((nodeId: string, documentId: string) => {
    console.log('=== RESET DOCUMENT STATUS BY NODE ID ===');
    console.log('Node ID:', nodeId);
    console.log('Document ID:', documentId);
    
    setMessageMapStatus(prev => ({
      ...prev,
      [documentId]: false
    }));
  }, []);

  // FIXED: Sync button states with actual canvas state - preserve document button states
  const syncWithCanvasState = useCallback((nodes: any[], messages: any[]) => {
    // Create a hash of the current state to prevent unnecessary syncs
    const stateHash = `${nodes.length}-${messages.length}-${nodes.map(n => n.id).join(',')}-${messages.map(m => m.id).join(',')}`;
    
    if (lastSyncRef.current === stateHash) {
      console.log('🔄 [MESSAGE MAP STATUS] State unchanged, skipping sync');
      return;
    }
    
    console.log('🔄 [MESSAGE MAP STATUS] Syncing with canvas state...');
    console.log('Canvas nodes:', nodes.length, 'Messages:', messages.length);
    
    const newStatus: Record<string, boolean> = { ...messageMapStatus }; // CRITICAL FIX: Start with current status
    
    // Process each message to determine its correct status
    messages.forEach(message => {
      if (message.type === 'document' && message.documents) {
        // For document messages, check if any document has a corresponding node
        message.documents.forEach((doc: any) => {
          // Check if there's a node that corresponds to this document
          const matchingNode = nodes.find(node => {
            // Check multiple ways a document might be linked to a node:
            const matchesDocumentId = node.source_document_id === doc.id;
            const matchesSourceName = node.source_document_name === doc.filename;
            
            const baseFilename = doc.filename.replace(/\.[^/.]+$/, '');
            const titleContainsFilename = node.title &&
              node.title.toLowerCase().includes(baseFilename.toLowerCase());
            const isDocumentNodeWithName = node.title &&
              node.title.startsWith('Document:') &&
              node.title.toLowerCase().includes(baseFilename.toLowerCase());
            
            return matchesDocumentId || matchesSourceName || titleContainsFilename || isDocumentNodeWithName;
          });
          
          const hasNode = !!matchingNode;
          
          // CRITICAL FIX: Only update status if there's a definitive change
          // If we currently think it's added (true) but can't find the node, only reset if we're sure
          // If we currently think it's not added (false) but found a node, set to true
          if (messageMapStatus[doc.id] === true && !hasNode) {
            // Node was removed - set to false
            console.log('🔄 [MESSAGE MAP STATUS] Document node removed:', doc.id);
            newStatus[doc.id] = false;
          } else if (messageMapStatus[doc.id] !== true && hasNode) {
            // Node was added - set to true
            console.log('🔄 [MESSAGE MAP STATUS] Document node found:', doc.id);
            newStatus[doc.id] = true;
          }
          // If status matches reality, don't change it
        });
      } else {
        // For chat messages, check if there's a corresponding node
        const hasCorrespondingNode = nodes.some(node => {
          return node.title && node.title.startsWith('Chat:') &&
            (node.title.includes(message.content.substring(0, 30)) ||
             message.added_to_map === true);
        });
        
        newStatus[message.id] = hasCorrespondingNode || message.added_to_map || false;
      }
    });
    
    // Only update if there are actual changes to prevent unnecessary re-renders
    const hasChanges = Object.keys(newStatus).some(key => newStatus[key] !== messageMapStatus[key]);
    
    if (hasChanges) {
      console.log('🔄 [MESSAGE MAP STATUS] Status changes detected, updating...');
      console.log('🔄 [MESSAGE MAP STATUS] Changes:', Object.keys(newStatus).filter(key => newStatus[key] !== messageMapStatus[key]));
      setMessageMapStatus(newStatus);
      lastSyncRef.current = stateHash;
    } else {
      console.log('🔄 [MESSAGE MAP STATUS] No changes detected, skipping update');
      lastSyncRef.current = stateHash;
    }
  }, [messageMapStatus]);

  // Enhanced setMessageStatus with immediate UI feedback
  const setMessageStatusEnhanced = useCallback((messageId: string, status: boolean) => {
    console.log('=== ENHANCED MESSAGE MAP STATUS UPDATE ===');
    console.log('Message ID:', messageId);
    console.log('Status:', status);
    console.log('Previous status:', messageMapStatus[messageId]);
    
    // Force immediate update for better UI responsiveness
    setMessageMapStatus(prev => {
      const newStatus = {
        ...prev,
        [messageId]: status
      };
      console.log('Updated status map:', newStatus);
      return newStatus;
    });
  }, [messageMapStatus]);

  return (
    <MessageMapStatusContext.Provider value={{
      messageMapStatus,
      setMessageStatus: setMessageStatusEnhanced,
      initializeStatus,
      resetDocumentStatus,
      resetStatusByNodeId,
      resetDocumentStatusByNodeId,
      syncWithCanvasState
    }}>
      {children}
    </MessageMapStatusContext.Provider>
  );
};

export const useMessageMapStatus = (): MessageMapStatusContextType => {
  const context = useContext(MessageMapStatusContext);
  if (context === undefined) {
    throw new Error('useMessageMapStatus must be used within a MessageMapStatusProvider');
  }
  return context;
};