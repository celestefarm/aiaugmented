import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, Image, File, Eye, Download, Plus, Check, Loader2, AlertCircle, Zap } from 'lucide-react';
import { DocumentAttachment, DocumentProcessingResult, getDocumentContent, createNode } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMap } from '@/contexts/MapContext';
import { useMessageMapStatus } from '@/contexts/MessageMapStatusContext';
import OCRResultsDisplay from './OCRResultsDisplay';

interface DocumentMessageProps {
  documents: DocumentAttachment[];
  onAddToMap?: (documentId: string, nodeId: string) => void;
  className?: string;
}

interface DocumentWithContent extends DocumentAttachment {
  content?: DocumentProcessingResult;
  isLoadingContent?: boolean;
  contentError?: string;
  isAddingToMap?: boolean;
  showOCRResults?: boolean;
}

const DocumentMessage: React.FC<DocumentMessageProps> = ({
  documents,
  onAddToMap,
  className = ''
}) => {
  const [documentsWithContent, setDocumentsWithContent] = useState<DocumentWithContent[]>(
    documents.map(doc => ({ ...doc }))
  );
  const { currentWorkspace } = useWorkspace();
  const { createNode: createNodeAPI, nodes } = useMap();
  const { messageMapStatus, setMessageStatus, resetDocumentStatus, resetDocumentStatusByNodeId } = useMessageMapStatus();
  
  // Debouncing ref to prevent rapid clicks
  const lastClickTimeRef = useRef<Record<string, number>>({});

  // Update documentsWithContent when documents prop changes
  useEffect(() => {
    console.log('=== DOCUMENT MESSAGE PROP UPDATE ===');
    console.log('New documents received:', documents.length);
    console.log('Document names:', documents.map(d => d.filename));
    console.log('Current documentsWithContent count:', documentsWithContent.length);
    
    // Update state to include new documents while preserving existing state
    setDocumentsWithContent(prev => {
      const existingIds = new Set(prev.map(doc => doc.id));
      const newDocuments = documents.filter(doc => !existingIds.has(doc.id));
      
      console.log('New documents to add:', newDocuments.length);
      console.log('New document names:', newDocuments.map(d => d.filename));
      
      if (newDocuments.length > 0) {
        const updatedDocuments = [...prev, ...newDocuments.map(doc => ({ ...doc }))];
        console.log('Updated documentsWithContent count:', updatedDocuments.length);
        return updatedDocuments;
      }
      
      return prev;
    });
  }, [documents]);

  // ENHANCED: Listen for status changes and handle node deletion properly
  useEffect(() => {
    setDocumentsWithContent(prev => prev.map(doc => {
      // CRITICAL FIX: Clear local node ID when message status is explicitly false
      // This handles the case when a node is deleted from the map
      if (messageMapStatus[doc.id] === false && doc.added_to_map_node_id) {
        console.log('🔄 [DOCUMENT MESSAGE] Node deleted, clearing local node ID for document:', doc.id);
        
        // PERSISTENCE FIX: Also clear the database relationship when node is deleted
        if (currentWorkspace && doc.added_to_map_node_id) {
          // Async operation to clear database relationship
          (async () => {
            try {
              console.log('💾 Clearing document-to-node relationship in database...');
              
              // Find the document message containing this document
              const messagesResponse = await fetch(
                `/api/v1/workspaces/${currentWorkspace.id}/messages`,
                {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (messagesResponse.ok) {
                const messagesData = await messagesResponse.json();
                const documentMessage = messagesData.messages.find((msg: any) =>
                  msg.type === 'document' &&
                  msg.documents?.some((d: any) => d.id === doc.id)
                );
                
                if (documentMessage) {
                  // Clear the relationship in database
                  const response = await fetch(
                    `/api/v1/workspaces/${currentWorkspace.id}/messages/${documentMessage.id}/document/${doc.id}/add-to-map?node_id=`,
                    {
                      method: 'PUT',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                  
                  if (response.ok) {
                    console.log('✅ Document-to-node relationship cleared in database');
                  } else {
                    console.error('❌ Failed to clear document-to-node relationship in database');
                  }
                }
              }
            } catch (error) {
              console.error('❌ Error clearing document-to-node relationship:', error);
            }
          })();
        }
        
        return { ...doc, added_to_map_node_id: null };
      }
      return doc;
    }));
  }, [messageMapStatus, currentWorkspace]);

  const getFileIcon = (contentType: string, size: 'sm' | 'md' = 'md') => {
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
    
    if (contentType === 'application/pdf') {
      return <FileText className={`${iconSize} text-red-400`} />;
    } else if (contentType.includes('image/')) {
      return <Image className={`${iconSize} text-blue-400`} />;
    } else if (contentType.includes('document') || contentType.includes('spreadsheet')) {
      return <File className={`${iconSize} text-green-400`} />;
    }
    return <File className={`${iconSize} text-gray-400`} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const loadDocumentContent = useCallback(async (documentId: string) => {
    if (!currentWorkspace) return;

    setDocumentsWithContent(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, isLoadingContent: true, contentError: undefined }
        : doc
    ));

    try {
      const content = await getDocumentContent(currentWorkspace.id, documentId);
      
      setDocumentsWithContent(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, content, isLoadingContent: false }
          : doc
      ));
    } catch (error) {
      console.error('Failed to load document content:', error);
      
      setDocumentsWithContent(prev => prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              isLoadingContent: false, 
              contentError: error instanceof Error ? error.message : 'Failed to load content'
            }
          : doc
      ));
    }
  }, [currentWorkspace]);

  const handleAddToMap = useCallback(async (document: DocumentWithContent) => {
    if (!currentWorkspace || !createNodeAPI) return;

    console.log('=== DOCUMENT ADD TO MAP - SINGLE CLICK FIX ===');
    console.log('Document ID:', document.id);
    console.log('Document filename:', document.filename);
    console.log('Current nodes count:', nodes.length);
    
    // DEBOUNCE FIX: Prevent rapid clicks (500ms debounce)
    const now = Date.now();
    const lastClickTime = lastClickTimeRef.current[document.id] || 0;
    const timeSinceLastClick = now - lastClickTime;
    
    if (timeSinceLastClick < 500) {
      console.log('🚫 DEBOUNCE: Click too soon after last click, ignoring');
      return;
    }
    
    // Update last click time
    lastClickTimeRef.current[document.id] = now;
    
    // SINGLE CLICK FIX: Only check if already processing (not messageMapStatus)
    if (document.isAddingToMap) {
      console.log('🚫 Already processing this document, skipping');
      return;
    }
    
    // SINGLE CLICK FIX: Check for existing nodes but don't auto-update status
    // This is just for logging/debugging, not for blocking the action
    const existingNode = nodes.find(node => {
      const matchesDocumentId = node.source_document_id === document.id;
      const matchesFilename = node.source_document_name === document.filename && node.type === 'human';
      const matchesTitle = node.title === document.filename.replace(/\.[^/.]+$/, '') && node.type === 'human';
      
      return matchesDocumentId || matchesFilename || matchesTitle;
    });
    
    if (existingNode) {
      console.log('ℹ️ Found existing node, but allowing user action:', existingNode.id);
      // Don't return here - let the user proceed if they want to try again
    }

    console.log('✅ Proceeding with node creation');

    console.log('🔄 Setting loading state...');
    setDocumentsWithContent(prev => prev.map(doc =>
      doc.id === document.id
        ? { ...doc, isAddingToMap: true }
        : doc
    ));

    try {
      // SINGLE CLICK FIX: Create node immediately without requiring content loading
      // Use basic document info for node creation
      
      // Create document title with "Document:" prefix and handle edge cases
      const baseTitle = document.filename.replace(/\.[^/.]+$/, ''); // Remove file extension
      let documentTitle: string;
      
      // Edge case: Don't duplicate "Document" if it's already in the filename
      if (baseTitle.toLowerCase().startsWith('document')) {
        documentTitle = baseTitle;
      } else {
        documentTitle = `Document: ${baseTitle}`;
      }
      
      // Handle long filenames - truncate but keep "Document:" visible
      if (documentTitle.length > 25) {
        if (documentTitle.startsWith('Document: ')) {
          // Keep "Document: " and truncate the rest
          const remainingSpace = 25 - 'Document: '.length - 3; // 3 for "..."
          const truncatedName = baseTitle.substring(0, remainingSpace);
          documentTitle = `Document: ${truncatedName}...`;
        } else {
          // Just truncate normally
          documentTitle = documentTitle.substring(0, 22) + '...';
        }
      }
      
      const nodeData = {
        title: documentTitle,
        description: `Document: ${document.filename} (${formatFileSize(document.file_size)})`,
        type: 'human' as const,
        x: Math.random() * 400 + 100, // Random position
        y: Math.random() * 400 + 100,
        source_document_id: document.id,
        source_document_name: document.filename,
        source_document_page: 1
      };

      console.log('🏗️ Creating node with data:', nodeData);
      const newNode = await createNodeAPI(nodeData);
      
      if (newNode) {
        console.log('✅ Node created successfully:', newNode.id);
        console.log('Node details:', {
          id: newNode.id,
          title: newNode.title,
          source_document_id: newNode.source_document_id,
          source_document_name: newNode.source_document_name
        });
        
        // CRITICAL FIX: Persist document-to-node relationship to database
        try {
          console.log('💾 Persisting document-to-node relationship to database...');
          
          // We need to find the document message ID that contains this document
          // Since we don't have direct access to messages here, we'll use the API to get messages
          // and find the one containing this document
          const messagesResponse = await fetch(
            `/api/v1/workspaces/${currentWorkspace.id}/messages`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            const documentMessage = messagesData.messages.find((msg: any) =>
              msg.type === 'document' &&
              msg.documents?.some((doc: any) => doc.id === document.id)
            );
            
            if (documentMessage) {
              console.log('📄 Found document message:', documentMessage.id);
              
              // Call backend API to persist the relationship
              const response = await fetch(
                `/api/v1/workspaces/${currentWorkspace.id}/messages/${documentMessage.id}/document/${document.id}/add-to-map?node_id=${newNode.id}`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (response.ok) {
                console.log('✅ Document-to-node relationship persisted to database');
              } else {
                console.error('❌ Failed to persist document-to-node relationship:', response.status);
                // Continue anyway - local state is updated
              }
            } else {
              console.error('❌ Could not find document message to update');
              // Continue anyway - local state is updated
            }
          } else {
            console.error('❌ Failed to fetch messages for document message lookup');
            // Continue anyway - local state is updated
          }
        } catch (error) {
          console.error('❌ Error persisting document-to-node relationship:', error);
          // Continue anyway - local state is updated
        }
        
        // Update local state with the new node ID
        setDocumentsWithContent(prev => prev.map(doc =>
          doc.id === document.id
            ? { ...doc, isAddingToMap: false, added_to_map_node_id: newNode.id }
            : doc
        ));

        // Update global message status with force refresh
        setMessageStatus(document.id, true);
        console.log('✅ Updated global message status');
        
        // Force component re-render to ensure button state updates immediately
        setDocumentsWithContent(prev => prev.map(doc =>
          doc.id === document.id
            ? { ...doc, added_to_map_node_id: newNode.id }
            : doc
        ));

        // CRITICAL FIX: Don't call parent callback for documents
        // This prevents the creation of the unwanted "New Message" node
        // onAddToMap?.(document.id, newNode.id); // REMOVED
        console.log('✅ Document successfully added to map (with database persistence)');
      } else {
        console.log('❌ Node creation returned null');
      }
    } catch (error) {
      console.error('❌ Failed to add document to map:', error);
      
      // CRITICAL FIX: Reset both loading state AND message status on error
      setDocumentsWithContent(prev => prev.map(doc =>
        doc.id === document.id
          ? { ...doc, isAddingToMap: false }
          : doc
      ));
      
      // Reset message status so user can retry
      setMessageStatus(document.id, false);
      
      // Reset debounce timer so user can click again immediately after error
      if (lastClickTimeRef.current[document.id]) {
        delete lastClickTimeRef.current[document.id];
      }
    }
  }, [currentWorkspace, createNodeAPI, loadDocumentContent, documentsWithContent, onAddToMap, nodes, setMessageStatus]);

  const handlePreview = useCallback(async (document: DocumentWithContent) => {
    if (!document.content && !document.isLoadingContent) {
      await loadDocumentContent(document.id);
    }
  }, [loadDocumentContent]);

  const toggleOCRResults = useCallback((documentId: string) => {
    setDocumentsWithContent(prev => prev.map(doc =>
      doc.id === documentId
        ? { ...doc, showOCRResults: !doc.showOCRResults }
        : doc
    ));
  }, []);

  const isImageFile = (contentType: string): boolean => {
    return contentType.includes('image/');
  };

  const hasOCRMetadata = (content?: DocumentProcessingResult): boolean => {
    return !!(content?.ocr_metadata || content?.extracted_data?.regions || content?.extracted_data?.tables || content?.extracted_data?.chart_elements);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {documentsWithContent.map((document) => (
        <div
          key={document.id}
          className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-3 backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            {/* File Icon */}
            <div className="flex-shrink-0 mt-1">
              {getFileIcon(document.content_type)}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-white truncate" title={document.filename}>
                  {document.filename}
                </h4>
                <div className="flex items-center gap-1 ml-2">
                  {/* Processing Status */}
                  {document.processing_status === 'pending' && (
                    <span className="text-xs text-yellow-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Pending
                    </span>
                  )}
                  {document.processing_status === 'processing' && (
                    <span className="text-xs text-blue-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Processing
                    </span>
                  )}
                  {document.processing_status === 'completed' && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Ready
                    </span>
                  )}
                  {document.processing_status === 'failed' && (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>{formatFileSize(document.file_size)}</span>
                <span>{document.content_type}</span>
              </div>

              {/* Content Preview */}
              {document.content && document.content.extracted_text && (
                <div className="bg-gray-800/50 rounded p-2 mb-2">
                  <p className="text-xs text-gray-300 line-clamp-3">
                    {document.content.extracted_text.substring(0, 200)}
                    {document.content.extracted_text.length > 200 && '...'}
                  </p>
                </div>
              )}

              {/* OCR Results Display for Images */}
              {document.content && isImageFile(document.content_type) && hasOCRMetadata(document.content) && document.showOCRResults && (
                <div className="mb-3">
                  <OCRResultsDisplay
                    extractedText={document.content.extracted_text || ''}
                    ocrMetadata={document.content.ocr_metadata}
                    extractedData={document.content.extracted_data}
                    filename={document.filename}
                  />
                </div>
              )}

              {/* Key Insights */}
              {document.content?.key_insights && document.content.key_insights.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-[#6B6B3A] mb-1">Key Insights:</p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    {document.content.key_insights.slice(0, 3).map((insight, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-[#6B6B3A] mt-0.5">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error Display */}
              {document.contentError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-2 mb-2">
                  <p className="text-xs text-red-400">{document.contentError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Preview Button */}
                <button
                  onClick={() => handlePreview(document)}
                  disabled={document.isLoadingContent}
                  className="text-xs px-2 py-1 bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded hover:bg-gray-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                  title="Preview document content"
                >
                  {document.isLoadingContent ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                  Preview
                </button>

                {/* OCR Results Button for Images */}
                {document.content && isImageFile(document.content_type) && hasOCRMetadata(document.content) && (
                  <button
                    onClick={() => toggleOCRResults(document.id)}
                    className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                    title="View detailed OCR analysis"
                  >
                    <Zap className="w-3 h-3" />
                    {document.showOCRResults ? 'Hide OCR' : 'Show OCR'}
                  </button>
                )}

                {/* Add to Map Button - Enhanced with Global State Integration */}
                {document.processing_status === 'completed' && (
                  // Check both global status and local node ID for comprehensive state tracking
                  (messageMapStatus[document.id] || document.added_to_map_node_id) ? (
                    <div className="text-xs px-2 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Added to Map
                    </div>
                  ) : document.isAddingToMap ? (
                    <div className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Adding...
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToMap(document)}
                      className="text-xs px-2 py-1 bg-[#6B6B3A]/20 text-[#6B6B3A] border border-[#6B6B3A]/30 rounded hover:bg-[#6B6B3A]/30 transition-colors flex items-center gap-1"
                      title="Add document to exploration map"
                    >
                      <Plus className="w-3 h-3" />
                      Add to Map
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentMessage;