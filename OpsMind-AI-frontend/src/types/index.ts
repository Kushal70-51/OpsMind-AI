export type UserRole = 'employee' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// ✅ RAG Source — backend se aane wala source
// ✅ snippet add karo
export interface Source {
  index: number;
  source: string[];
  score: string;
  snippet?: string;  // ✅ ye add karo
}

// ✅ Citation — UI mein dikhane ke liye
export interface Citation {
  id: string;
  sourceId: string;
  title: string;
  snippet: string;    // actual retrieved chunk text from MongoDB
  page?: number;
  score?: string;     // relevance score from vector search
  filename?: string;  // ✅ NEW — PDF filename
}

// ✅ Message — chat ke liye
export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  citations?: Citation[];
  sources?: Source[];     // ✅ NEW — raw sources from backend
  isStreaming?: boolean;
  isWelcome?: boolean;    // marks greeting message — never sent to LLM
}

// ✅ Document — admin panel ke liye
export interface Document {
  id: string;
  filename: string;
  uploadDate: Date;
  status: 'processing' | 'ready' | 'error';
  size: number;
  chunks?: number;        // ✅ NEW — kitne chunks store hue
}

// ✅ API Request/Response types
export interface AskRequest {
  query: string;
  chatHistory?: ChatHistoryItem[];
  file?: string;          // specific PDF filter
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: Source[];
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface UploadResponse {
  success: boolean;
  chunksStored: number;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}