'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';
import FileUpload from './FileUpload';
import { Attachment } from '@/types';

interface MessageInputProps {
  onSendMessage: (message: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  userId?: string;
}

export default function MessageInput({
  onSendMessage,
  isLoading,
  userId,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachments.length > 0) && !isLoading) {
      console.log('Submitting message:', {
        message,
        attachmentCount: attachments.length,
        attachments: attachments.map(a => ({
          name: a.name,
          hasBase64: !!a.base64
        }))
      });
      
      onSendMessage(message, attachments);
      setMessage('');
      setAttachments([]);
      setShowFileUpload(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (file: File, attachment: Attachment) => {
    console.log('File selected:', { 
      name: file.name, 
      hasBase64: !!attachment.base64,
      base64Length: attachment.base64?.length 
    });
    setAttachments((prev) => [...prev, attachment]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Show attachments preview above input */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="relative group"
              >
                {attachment.base64 ? (
                  <div className="relative">
                    <img
                      src={attachment.base64}
                      alt={attachment.name}
                      className="h-20 w-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                    />
                    <button
                      onClick={() => handleRemoveAttachment(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                    <span>📄</span>
                    <span className="max-w-[150px] truncate">{attachment.name}</span>
                    <button
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showFileUpload && (
          <div className="mb-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              onRemove={handleRemoveAttachment}
              attachments={attachments}
              userId={userId}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              disabled={isLoading}
            >
              <Paperclip 
                size={20} 
                className={showFileUpload || attachments.length > 0 ? 'text-blue-600' : ''} 
              />
            </Button>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachments.length > 0 ? "Add a message (optional)..." : "Ask me anything..."}
              className="flex-1 bg-transparent resize-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 max-h-32 min-h-[24px]"
              rows={1}
              disabled={isLoading}
            />

            <Button
              type="submit"
              size="icon"
              disabled={isLoading || (!message.trim() && attachments.length === 0)}
              className="shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Sparkles size={20} className="animate-pulse" />
              ) : (
                <Send size={20} />
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">
            {attachments.length > 0 
              ? `${attachments.length} file${attachments.length > 1 ? 's' : ''} attached • AI can make mistakes. Check important info.`
              : 'AI can make mistakes. Check important info.'
            }
          </p>
        </form>
      </div>
    </div>
  );
}