import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, FileText, Image, File, AlertCircle, Check, Loader2 } from 'lucide-react';
import { uploadDocuments, getDocumentContent, DocumentUploadResponse, DocumentProcessingResult } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface FileUploadProps {
  onFileUploaded?: (documents: DocumentUploadResponse[]) => void;
  onFilesStaged?: (files: File[]) => void; // New prop for staging files
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  mode?: 'immediate' | 'staged'; // New prop to control upload behavior
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  documentId?: string;
  processingResult?: DocumentProcessingResult;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  onFilesStaged,
  onError,
  className = '',
  disabled = false,
  mode = 'staged' // Default to staged mode for streamlined workflow
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { currentWorkspace } = useWorkspace();

  // Supported file types
  const SUPPORTED_TYPES = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'image/png': '.png',
    'image/jpeg': '.jpg,.jpeg'
  };

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!Object.keys(SUPPORTED_TYPES).includes(file.type)) {
      return `Unsupported file type: ${file.type}. Supported types: PDF, DOCX, XLSX, PNG, JPG`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 20MB.`;
    }

    return null;
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-400" />;
    } else if (file.type.includes('image/')) {
      return <Image className="w-4 h-4 text-blue-400" />;
    } else if (file.type.includes('document') || file.type.includes('spreadsheet')) {
      return <File className="w-4 h-4 text-green-400" />;
    }
    return <File className="w-4 h-4 text-gray-400" />;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    console.log('=== HANDLE FILES CALLED ===');
    console.log('Files received:', files.length);
    console.log('File names:', Array.from(files).map(f => f.name));
    console.log('Upload mode:', mode);
    
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate all files first
    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors
    if (errors.length > 0) {
      onError?.(errors.join('\n'));
      return;
    }

    if (validFiles.length === 0) {
      return;
    }

    if (mode === 'staged') {
      // NEW STREAMLINED MODE: Just stage files for later upload
      console.log('📎 [STAGED MODE] Staging files for combined submission');
      onFilesStaged?.(validFiles);
      return;
    }

    // LEGACY IMMEDIATE MODE: Upload files immediately
    if (!currentWorkspace) {
      onError?.('No workspace selected');
      return;
    }

    // Prevent multiple simultaneous uploads
    if (isUploading) {
      console.log('Upload already in progress, ignoring this call');
      return;
    }

    console.log('=== STARTING IMMEDIATE UPLOAD PROCESS ===');
    console.log('Valid files to upload:', validFiles.length);
    setIsUploading(true);

    // Initialize uploading files state
    const initialUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploadingFiles(initialUploadingFiles);

    try {
      console.log('=== FILE UPLOAD STARTED ===');
      console.log('Files to upload:', validFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
      console.log('Uploading all files in a single batch...');

      // Upload ALL files in a single API call
      const uploadedDocuments = await uploadDocuments(currentWorkspace.id, validFiles);
      
      console.log('Upload response:', uploadedDocuments);
      console.log('Successfully uploaded', uploadedDocuments.length, 'documents in batch');
      console.log('Expected:', validFiles.length, 'Received:', uploadedDocuments.length);

      // Update status to processing
      setUploadingFiles(prev => prev.map(uf => ({
        ...uf,
        status: 'processing',
        progress: 50,
        documentId: uploadedDocuments.find(doc => doc.filename.includes(uf.file.name))?.id
      })));

      // Wait for processing to complete and get content
      const processedDocuments = await Promise.all(
        uploadedDocuments.map(async (doc) => {
          try {
            // Check if already completed (synchronous processing)
            if (doc.processing_status === 'completed') {
              const content = await getDocumentContent(currentWorkspace.id, doc.id);
              return { doc, content };
            }
            
            // Poll for processing completion with extended timeout for OCR
            let attempts = 0;
            const maxAttempts = 60; // 60 seconds max for OCR processing (Tesseract OCR)
            
            while (attempts < maxAttempts) {
              const content = await getDocumentContent(currentWorkspace.id, doc.id);
              
              if (content.processing_status === 'completed' || content.processing_status === 'completed_with_warnings') {
                return { doc, content };
              } else if (content.processing_status === 'failed') {
                throw new Error(content.processing_error || 'Processing failed');
              }
              
              // Wait 1 second before next attempt
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }
            
            // Check one more time and return partial results if available
            const finalContent = await getDocumentContent(currentWorkspace.id, doc.id);
            if (finalContent.processing_status === 'completed_with_warnings') {
              console.warn(`Document ${doc.id} completed with warnings after timeout`);
              return { doc, content: finalContent };
            }
            
            throw new Error('Processing timeout - document may still be processing');
          } catch (error) {
            console.error(`Failed to get content for document ${doc.id}:`, error);
            return { doc, content: null, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );

      // Update final status
      setUploadingFiles(prev => prev.map(uf => {
        const processed = processedDocuments.find(pd =>
          pd.doc.filename.includes(uf.file.name)
        );
        
        if (processed?.error) {
          return {
            ...uf,
            status: 'error',
            progress: 100,
            error: processed.error
          };
        } else if (processed?.content) {
          return {
            ...uf,
            status: 'completed',
            progress: 100,
            processingResult: processed.content
          };
        } else {
          return {
            ...uf,
            status: 'error',
            progress: 100,
            error: 'Failed to process document'
          };
        }
      }));

      // Call success callback
      onFileUploaded?.(uploadedDocuments);

      console.log('✅ File upload completed successfully');

      // Auto-dismiss after successful completion with smooth fade-out
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
      
      autoDismissTimeoutRef.current = setTimeout(() => {
        console.log('🎭 Starting auto-dismiss fade-out animation');
        setIsHiding(true);
        
        // Remove the panel after fade-out animation completes
        setTimeout(() => {
          console.log('✨ Auto-dismiss completed - clearing upload files');
          setUploadingFiles([]);
          setIsHiding(false);
        }, 400); // Match the fade-out duration
      }, 2000); // Wait 2 seconds before starting fade-out

    } catch (error) {
      console.error('❌ File upload failed:', error);
      
      // Update all files to error status
      setUploadingFiles(prev => prev.map(uf => ({
        ...uf,
        status: 'error',
        progress: 100,
        error: error instanceof Error ? error.message : 'Upload failed'
      })));

      onError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [currentWorkspace, onFileUploaded, onFilesStaged, onError, mode]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || !e.dataTransfer.files.length) return;

    console.log('=== DRAG DROP EVENT ===');
    console.log('Files dropped:', e.dataTransfer.files.length);
    console.log('File names:', Array.from(e.dataTransfer.files).map(f => f.name));

    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log('=== FILE INPUT EVENT ===');
      console.log('Files selected:', e.target.files.length);
      console.log('File names:', Array.from(e.target.files).map(f => f.name));
      
      handleFiles(e.target.files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFiles]);

  const handleUploadClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const removeUploadingFile = useCallback((index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllFiles = useCallback(() => {
    // Clear auto-dismiss timeout when manually clearing
    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
      autoDismissTimeoutRef.current = null;
    }
    setIsHiding(false);
    setUploadingFiles([]);
  }, []);

  // Auto-dismiss effect for completed uploads
  useEffect(() => {
    const allCompleted = uploadingFiles.length > 0 &&
      uploadingFiles.every(file => file.status === 'completed' || file.status === 'error');
    
    if (allCompleted && !isUploading && !isHiding) {
      console.log('🎯 All files completed, starting auto-dismiss timer');
      
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
      
      autoDismissTimeoutRef.current = setTimeout(() => {
        console.log('🎭 Starting auto-dismiss fade-out animation');
        setIsHiding(true);
        
        // Remove the panel after fade-out animation completes
        setTimeout(() => {
          console.log('✨ Auto-dismiss completed - clearing upload files');
          setUploadingFiles([]);
          setIsHiding(false);
        }, 400); // Match the fade-out duration
      }, 2000); // Wait 2 seconds before starting fade-out
    }
    
    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, [uploadingFiles, isUploading, isHiding]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload button */}
      <button
        onClick={handleUploadClick}
        disabled={disabled || isUploading}
        className="text-gray-400 hover:text-[#6B6B3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Upload documents (PDF, DOCX, XLSX, PNG, JPG)"
        aria-label="Upload documents"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
      </button>

      {/* Drag and drop overlay */}
      {isDragOver && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="glass-pane border-2 border-dashed border-[#6B6B3A] p-8 rounded-lg text-center">
            <Upload className="w-12 h-12 text-[#6B6B3A] mx-auto mb-4" />
            <p className="text-white text-lg font-medium mb-2">Drop files here to upload</p>
            <p className="text-gray-300 text-sm">
              Supports PDF, DOCX, XLSX, PNG, JPG (max 20MB each)
            </p>
          </div>
        </div>
      )}

      {/* Upload progress panel with fade-out animation */}
      {uploadingFiles.length > 0 && (
        <div className={`absolute bottom-full right-0 mb-2 w-80 glass-pane border border-gray-600/50 rounded-lg shadow-xl z-40 transition-all duration-400 ease-in-out ${
          isHiding ? 'opacity-0 transform translate-y-2 scale-95' : 'opacity-100 transform translate-y-0 scale-100'
        }`}>
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">
                Uploading Files ({uploadingFiles.length})
              </h3>
              <button
                onClick={clearAllFiles}
                className="text-gray-400 hover:text-white transition-colors"
                title="Clear all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {uploadingFiles.map((uploadingFile, index) => (
                <div key={index} className="glass-pane p-2 rounded border border-gray-600/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileIcon(uploadingFile.file)}
                      <span className="text-xs text-white truncate" title={uploadingFile.file.name}>
                        {uploadingFile.file.name}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        ({(uploadingFile.file.size / 1024 / 1024).toFixed(1)}MB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeUploadingFile(index)}
                      className="text-gray-400 hover:text-white transition-colors ml-2"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        uploadingFile.status === 'error' ? 'bg-red-500' :
                        uploadingFile.status === 'completed' ? 'bg-green-500' :
                        'bg-[#6B6B3A]'
                      }`}
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1">
                    {uploadingFile.status === 'uploading' && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-[#6B6B3A]" />
                        <span className="text-xs text-[#6B6B3A]">Uploading...</span>
                      </>
                    )}
                    {uploadingFile.status === 'processing' && (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                        <span className="text-xs text-blue-400">
                          {uploadingFile.file.type.includes('image/') ? 'OCR Processing...' : 'Processing...'}
                        </span>
                      </>
                    )}
                    {uploadingFile.status === 'completed' && (
                      <>
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400">Completed</span>
                      </>
                    )}
                    {uploadingFile.status === 'error' && (
                      <>
                        <AlertCircle className="w-3 h-3 text-red-400" />
                        <span className="text-xs text-red-400">
                          {uploadingFile.error || 'Upload failed'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;