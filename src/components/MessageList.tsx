'use client';

import React, { useEffect, useRef } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';

interface MessageListProps {
  messages: Message[];
}

// Typing animation component - ChatGPT style
function TypingIndicator() {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '●●●') return '';
        return prev + '●';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-1 text-gray-600 dark:text-gray-400 font-medium">
      <span className="inline-block min-w-[24px]">{dots}</span>
    </div>
  );
}

// Streaming text with cursor animation
function StreamingText({ text }: { text: string }) {
  return (
    <div className="relative">
      <span>{text}</span>
      <span className="inline-block w-0.5 h-4 bg-blue-600 dark:bg-blue-400 ml-0.5 animate-pulse"></span>
    </div>
  );
}

export default function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-6 mb-6 shadow-lg">
          <Bot size={48} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to AI Assistant
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
          Upload documents, share images, or just start chatting. I'm here to help with RAG-powered responses!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          {[
            '📄 Analyze documents',
            '🖼️ Understand images',
            '💡 Answer questions',
            '🔍 Search knowledge base',
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
            >
              <p className="font-medium">{feature}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
              } shadow-lg`}
            >
              {msg.role === 'user' ? (
                <User size={20} className="text-white" />
              ) : (
                <Bot size={20} className="text-white" />
              )}
            </div>

            <div
              className={`flex-1 space-y-2 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-sm'
                }`}
              >
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {msg.attachments.map((att, i) => (
                      <div key={i}>
                        {att.base64 ? (
                          <img
                            src={att.base64}
                            alt={att.name}
                            className="rounded-lg max-w-full h-auto"
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                            <span>📄</span>
                            <span>{att.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Show typing indicator if message is typing */}
                {msg.isTyping ? (
                  <TypingIndicator />
                ) : (
                  <div
                    className={`prose prose-sm max-w-none ${
                      msg.role === 'user'
                        ? 'prose-invert'
                        : 'dark:prose-invert'
                    }`}
                  >
                    {msg.isStreaming ? (
                      <StreamingText text={msg.content} />
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                )}
              </div>

              {!msg.isTyping && (
                <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
                  <span>
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.role === 'assistant' && !msg.isStreaming && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="h-6 px-2"
                    >
                      {copiedId === msg.id ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}