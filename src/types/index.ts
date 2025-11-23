export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  isTyping?: boolean;      
  isStreaming?: boolean; 
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  url?: string;
  base64?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    uploadedAt: Date;
    chunkIndex: number;
  };
}