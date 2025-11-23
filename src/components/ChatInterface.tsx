'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser, SignOutButton, SignInButton, SignUpButton } from '@clerk/nextjs';
import { ArrowLeft, LogOut, LogIn, UserPlus } from 'lucide-react';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message, ChatSession, Attachment } from '@/types';
import { Button } from './ui/button';

export default function ChatInterface() {
  const { user, isLoaded } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved) {
      setDarkMode(JSON.parse(saved));
    }
    
    // Load sessions from localStorage
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(
        parsed.map((s: ChatSession) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }))
      );
    }
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setMessageHistory([]);
  };

  const selectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessageHistory(session.messages);
    }
  };

  const deleteSession = (sessionId: string) => {
    const filtered = sessions.filter((s) => s.id !== sessionId);
    setSessions(filtered);
    localStorage.setItem('chatSessions', JSON.stringify(filtered));
    
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessageHistory([]);
    }
  };

  const updateSession = (sessionId: string, newMessages: Message[]) => {
    const updated = sessions.map((s) => {
      if (s.id === sessionId) {
        const title = newMessages[0]?.content.substring(0, 50) || 'New Chat';
        return {
          ...s,
          title,
          messages: newMessages,
          updatedAt: new Date(),
        };
      }
      return s;
    });
    setSessions(updated);
    localStorage.setItem('chatSessions', JSON.stringify(updated));
  };

  const handleSendMessage = useCallback(async (content: string, attachments: Attachment[]) => {
    if (!content.trim() && attachments.length === 0) return;
    
    // Check if user is loaded and authenticated
    if (!isLoaded || !user?.id) {
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: 'Please sign in to use the chat.',
        timestamp: new Date(),
      };
      setMessageHistory([errorMessage]);
      return;
    }

    let sessionId = currentSessionId;
    
    // Create new session if needed
    if (!sessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: content.substring(0, 50) || 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSessions([newSession, ...sessions]);
      sessionId = newSession.id;
      setCurrentSessionId(newSession.id);
    }

    // Add user message to history WITH attachments
    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: content,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    const newMessages = [...messageHistory, userMessage];
    setMessageHistory(newMessages);
    updateSession(sessionId, newMessages);

    setIsLoading(true);

    // Add typing indicator message
    const typingMessageId = `${Date.now()}-typing`;
    const typingMessage: Message = {
      id: typingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessageHistory([...newMessages, typingMessage]);

    try {
      // Extract images from attachments (base64 format)
      const images = attachments
        .filter((a) => a.base64)
        .map((a) => a.base64!);

      console.log('Sending to API:', {
        messageCount: newMessages.length,
        hasImages: images.length > 0,
        imageCount: images.length
      });

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          images: images.length > 0 ? images : undefined,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let assistantContent = '';
      const decoder = new TextDecoder();
      const assistantMessageId = `${Date.now()}-assistant`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'text-delta' && data.delta?.text) {
                assistantContent += data.delta.text;
                // Update UI with streaming content
                const assistantMessage: Message = {
                  id: assistantMessageId,
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: new Date(),
                  isStreaming: true,
                };
                const updatedMessages = [...newMessages, assistantMessage];
                setMessageHistory(updatedMessages);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Finalize the message
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: assistantContent || 'I received your message.',
        timestamp: new Date(),
      };
      const finalMessages = [...newMessages, assistantMessage];
      setMessageHistory(finalMessages);
      updateSession(sessionId, finalMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
      };
      const errorMessages = [...newMessages, errorMessage];
      setMessageHistory(errorMessages);
      updateSession(sessionId, errorMessages);
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, sessions, messageHistory, user, isLoaded]);

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewChat}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <div className="flex-1 flex flex-col">
        {/* Header with Back and Auth buttons */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </Button>

          <div className="flex items-center gap-2">
            {isLoaded && user ? (
              <SignOutButton>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </Button>
              </SignOutButton>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <LogIn size={16} />
                    <span>Sign In</span>
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="default" size="sm" className="flex items-center gap-2">
                    <UserPlus size={16} />
                    <span>Sign Up</span>
                  </Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>

        <MessageList messages={messageHistory} />
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} userId={user?.id} />
      </div>
    </div>
  );
}