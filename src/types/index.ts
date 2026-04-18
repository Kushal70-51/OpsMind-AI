export type UserRole = 'employee' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Citation {
  id: string;
  sourceId: string;
  title: string;
  snippet: string;
  page?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  citations?: Citation[];
  isStreaming?: boolean;
}

export interface Document {
  id: string;
  filename: string;
  uploadDate: Date;
  status: 'processing' | 'ready' | 'error';
  size: number;
}
