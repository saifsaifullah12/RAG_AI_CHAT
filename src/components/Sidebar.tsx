'use client';

import React from 'react';
import {
  MessageSquarePlus,
  Clock,
  Settings,
  Moon,
  Sun,
  Trash2,
  LogOut,
} from 'lucide-react';
import { Button } from './ui/button';
import { ChatSession } from '@/types';
import { ScrollArea } from './ui/scroll-area';
import { SignOutButton, useUser } from '@clerk/nextjs';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  darkMode,
  toggleDarkMode,
}: SidebarProps) {
  const { user } = useUser();

  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      {/* User Profile */}
      {user && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            {user.imageUrl && (
              <img
                src={user.imageUrl}
                alt="Profile"
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          AI Assistant
        </h1>
        <Button
          onClick={onNewChat}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <MessageSquarePlus size={18} className="mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
            <Clock size={14} />
            <span>Recent Chats</span>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No chat history yet
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg p-3 cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  currentSessionId === session.id
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800'
                    : 'border border-transparent'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <p className="text-sm font-medium truncate pr-6">
                  {session.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {session.updatedAt.toLocaleDateString()}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={toggleDarkMode}
        >
          {darkMode ? (
            <>
              <Sun size={18} className="mr-2" />
              Light Mode
            </>
          ) : (
            <>
              <Moon size={18} className="mr-2" />
              Dark Mode
            </>
          )}
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          <Settings size={18} className="mr-2" />
          Settings
        </Button>
        <SignOutButton>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}