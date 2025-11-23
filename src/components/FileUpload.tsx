'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn, formatFileSize, getFileIcon } from '@/lib/utils';
import { Attachment } from '@/types';

interface FileUploadProps {
  onFileSelect: (file: File, attachment: Attachment) => void;
  onRemove: (index: number) => void;
  attachments: Attachment[];
  userId?: string;
}

export default function FileUpload({
  onFileSelect,
  onRemove,
  attachments,
  userId,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('📤 Starting file upload:', { 
        fileName: file.name, 
        fileSize: file.size,
        fileType: file.type,
        userId 
      });

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${formatFileSize(maxSize)}`);
      }

      const formData = new FormData();
      formData.append('file', file);
      
      if (userId) {
        formData.append('userId', userId);
      } else {
        console.warn('⚠️ userId is undefined in FileUpload');
      }

      console.log('📤 Uploading to /api/upload...');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      console.log('📥 Upload response:', { 
        status: response.status, 
        success: result.success,
        isImage: result.isImage,
        error: result.error
      });

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || `Upload failed with status ${response.status}`);
      }

      if (result.success) {
        const attachment: Attachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          base64: result.isImage ? result.base64 : undefined,
        };
        
        onFileSelect(file, attachment);
        
        const successMsg = result.isImage 
          ? `Image "${file.name}" uploaded successfully!`
          : `Document "${file.name}" processed (${result.chunksProcessed || 0} chunks created)`;
        
        setSuccess(successMsg);
        console.log('✅', successMsg);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(errorMsg);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-800 dark:text-red-200">
          <AlertCircle size={18} className="shrink-0" />
          <p className="flex-1">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-800 dark:text-green-200">
          <CheckCircle size={18} className="shrink-0" />
          <p className="flex-1">{success}</p>
          <button 
            onClick={() => setSuccess(null)}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-700"
            >
              <span className="text-lg">{getFileIcon(attachment.name)}</span>
              <div className="flex flex-col">
                <span className="font-medium truncate max-w-[150px]">
                  {attachment.name}
                </span>
                <span className="text-xs text-gray-500">
                  {formatFileSize(attachment.size)}
                </span>
              </div>
              <button
                onClick={() => onRemove(index)}
                className="ml-2 text-gray-500 hover:text-red-600 transition-colors"
                disabled={uploading}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer',
          dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50' 
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800',
          uploading && 'opacity-50 pointer-events-none'
        )}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt,image/*"
          className="hidden"
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-blue-600">
            <Loader2 className="animate-spin" size={32} />
            <div>
              <p className="font-medium">Uploading and processing...</p>
              <p className="text-xs text-gray-500 mt-1">
                This may take a moment for large documents
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-400">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 p-4 rounded-full">
              <Upload size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Drop files here or <span className="text-blue-600 dark:text-blue-400 font-semibold">browse</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Supports: PDF, DOC, DOCX, TXT, Images
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                Maximum file size: 10MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}