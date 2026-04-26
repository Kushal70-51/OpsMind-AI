import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Message, Citation, Conversation } from '../types';
import { useAuth } from './AuthContext';
import { API_BASE } from '../lib/api';

interface ChatContextType {
  conversations: Conversation[];
  activeId: string | null;
  activeConversation: Conversation | null;
  isTyping: boolean;
  activeCitation: Citation | null;
  sendMessage: (content: string) => Promise<void>;
  createNewChat: () => void;
  switchChat: (id: string) => void;
  deleteChat: (id: string) => void;
  setActiveCitation: (citation: Citation | null) => void;
  clearAllChats: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'opsmind_conversations';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return (JSON.parse(raw) as Conversation[]).map(c => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        messages: c.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
      }));
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    return localStorage.getItem('opsmind_active_chat_id');
  });

  const [isTyping, setIsTyping] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find(c => c.id === activeId) || null;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeId) localStorage.setItem('opsmind_active_chat_id', activeId);
    else localStorage.removeItem('opsmind_active_chat_id');
  }, [activeId]);

  const createNewChat = useCallback(() => {
    const newChat: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations(prev => [newChat, ...prev]);
    setActiveId(newChat.id);
  }, []);

  const switchChat = useCallback((id: string) => {
    setActiveId(id);
    setActiveCitation(null);
  }, []);

  const deleteChat = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const clearAllChats = useCallback(() => {
    setConversations([]);
    setActiveId(null);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    let currentId = activeId;
    
    // 1️⃣ Create new chat if none is active
    if (!currentId) {
      currentId = crypto.randomUUID();
      const newChat: Conversation = {
        id: currentId,
        title: content.length > 30 ? content.substring(0, 30) + '...' : content,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversations(prev => [newChat, ...prev]);
      setActiveId(currentId);
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    // Update conversation with user message and title
    setConversations(prev => prev.map(c => {
      if (c.id === currentId) {
        const isFirst = c.messages.length === 0;
        return {
          ...c,
          title: isFirst ? (content.length > 30 ? content.substring(0, 30) + '...' : content) : c.title,
          messages: [...c.messages, userMsg],
          updatedAt: new Date()
        };
      }
      return c;
    }));

    setIsTyping(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const aiId = crypto.randomUUID();
    setConversations(prev => prev.map(c => {
      if (c.id === currentId) {
        return {
          ...c,
          messages: [...c.messages, {
            id: aiId,
            role: 'ai',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
            citations: []
          }]
        };
      }
      return c;
    }));

    try {
      // 2️⃣ Get history from the most up-to-date state (passed via deps or found in current tick)
      const currentConvo = conversations.find(c => c.id === currentId);
      const history = (currentConvo?.messages || []).map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user' as const,
        content: m.content
      }));

      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          query: content,
          chatHistory: history
        }),
        signal: abortRef.current.signal
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part.split('\n').find(l => l.startsWith('data:'));
          if (!dataLine) continue;

          try {
            const payload = JSON.parse(dataLine.slice(5).trim());

            if (payload.type === 'token' && payload.token) {
              setConversations(prev => prev.map(c => {
                if (c.id === currentId) {
                   return {
                     ...c,
                     messages: c.messages.map(m => m.id === aiId ? { ...m, content: m.content + payload.token } : m)
                   };
                }
                return c;
              }));
            }

            if (payload.type === 'done') {
              const citations: Citation[] = (payload.sources ?? []).map((s: any, i: number) => {
                const srcStr = Array.isArray(s.source) ? s.source[0] : s.source;
                const pageMatch = srcStr?.match(/Page (\d+)/);
                const filename = srcStr?.split(' Page ')[0] ?? 'Document';
                return {
                  id: `c${i}`,
                  sourceId: `src_${i}`,
                  title: filename,
                  filename,
                  snippet: s.snippet ?? '',
                  page: pageMatch ? parseInt(pageMatch[1]) : undefined,
                  score: s.score
                };
              });

              setConversations(prev => prev.map(c => {
                 if (c.id === currentId) {
                    return {
                      ...c,
                      messages: c.messages.map(m => m.id === aiId ? { ...m, isStreaming: false, citations } : m)
                    };
                 }
                 return c;
              }));
              setIsTyping(false);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setIsTyping(false);
    }
  }, [activeId, conversations, getToken]);

  return (
    <ChatContext.Provider value={{
      conversations,
      activeId,
      activeConversation,
      isTyping,
      activeCitation,
      sendMessage,
      createNewChat,
      switchChat,
      deleteChat,
      setActiveCitation,
      clearAllChats
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
