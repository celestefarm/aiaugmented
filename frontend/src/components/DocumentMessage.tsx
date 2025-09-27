import React, { useState, useCallback } from 'react';
import { FileText, Image, File, Eye, Download, Plus, Check, Loader2, AlertCircle } from 'lucide-react';
import { DocumentUploadResponse, DocumentProcessingResult, getDocumentContent, createNode } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMap } from '@/contexts/MapContext';

interface DocumentMessageProps {
  documents: DocumentUploadResponse[];
  onAddToMap?: (documentId: string, nodeId: string) => void;
  className?: string;
}

interface DocumentWithContent extends DocumentUploadResponse {
  content?: DocumentProcessingResult;
  isLoadingContent?: boolean;
  contentError?: string;
  isAddingToMap?: boolean;
  addedToMapNodeId?: string;
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
  const { createNode: createNodeAPI } = useMap();

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

    // Load content if not already loaded
    if (!document.content && !document.isLoadingContent) {
      await loadDocumentContent(document.id);
      // Get updated document with content
      const updatedDoc = documentsWithContent.find(d => d.id === document.id);
      if (!updatedDoc?.content) {
        return;
      }
      document = updatedDoc;
    }

    if (!document.content) return;

    setDocumentsWithContent(prev => prev.map(doc => 
      doc.id === document.id 
        ? { ...doc, isAddingToMap: true }
        : doc
    ));

    try {
      // Create a node from the document
      const nodeData = {
        title: document.filename.replace(/\.[^/.]+$/, ''), // Remove file extension
        description: document.content.extracted_text?.substring(0, 500) + '...' || 'Uploaded document',
        type: 'human' as const,
        x: Math.random() * 400 + 100, // Random position
        y: Math.random() * 400 + 100,
        source_document_id: document.id,
        source_document_name: document.filename,
        source_document_page: 1
      };

      const newNode = await createNodeAPI(nodeData);
      
      if (newNode) {
        setDocumentsWithContent(prev => prev.map(doc => 
          doc.id === document.id 
            ? { ...doc, isAddingToMap: false, addedToMapNodeId: newNode.id }
            : doc
        ));

        onAddToMap?.(document.id, newNode.id);
      }
    } catch (error) {
      console.error('Failed to add document to map:', error);
      
      setDocumentsWithContent(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, isAddingToMap: false }
          : doc
      ));
    }
  }, [currentWorkspace, createNodeAPI, loadDocumentContent, documentsWithContent, onAddToMap]);

  const handlePreview = useCallback(async (document: DocumentWithContent) => {
    if (!document.content && !document.isLoadingContent) {
      await loadDocumentContent(document.id);
    }
  }, [loadDocumentContent]);

  return (
    <div className={`space-y-2 ${className}`}>
      {documentsWithContent.map((document) => (
        <div
          key={document.id}
          className="glass-pane border border-gray-600/30 rounded-lg p-3"
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

                {/* Add to Map Button */}
                {document.processing_status === 'completed' && (
                  document.addedToMapNodeId ? (
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