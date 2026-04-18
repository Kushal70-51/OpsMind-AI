import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, Citation } from '../types';

const MOCK_CITATION: Citation = {
  id: 'c1',
  sourceId: 'doc_1',
  title: 'Employee Handbook 2026',
  snippet: 'All employees must complete mandatory security training by the end of Q1. Failure to do so will result in restricted network access.',
  page: 12
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      role: 'ai',
      content: 'Hello! I am OpsMind AI. How can I help you with our corporate knowledge base today?',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);
    
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Simulate AI response with streaming effect
    setTimeout(() => {
      if (abortControllerRef.current?.signal.aborted) return;
        
      const aiId = Math.random().toString(36).substring(7);
      const fullResponse = `Based on the latest SOP, the policy is strictly enforced. You can refer to the document for more details. If you have questions about specific sections, let me know.`;
      
      setMessages(prev => [...prev, {
        id: aiId,
        role: 'ai',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        citations: []
      }]);

      let charIndex = 0;
      const interval = setInterval(() => {
        if (abortControllerRef.current?.signal.aborted) {
            clearInterval(interval);
            return;
        }

        setMessages(prev => prev.map(m => {
          if (m.id === aiId) {
            return {
              ...m,
              content: fullResponse.substring(0, charIndex + 1),
            };
          }
          return m;
        }));
        charIndex++;
        
        if (charIndex >= fullResponse.length) {
          clearInterval(interval);
          setMessages(prev => prev.map(m => {
            if (m.id === aiId) {
              return {
                ...m,
                isStreaming: false,
                citations: [MOCK_CITATION] // Attach citation after completion
              };
            }
            return m;
          }));
          setIsTyping(false);
        }
      }, 15); // streaming typing speed
    }, 600);
  }, []);

  const openCitation = useCallback((citation: Citation) => {
    setActiveCitation(citation);
  }, []);

  const closeCitation = useCallback(() => {
    setActiveCitation(null);
  }, []);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setMessages([{
      id: Math.random().toString(36).substring(7),
      role: 'ai',
      content: 'Hello! I am OpsMind AI. How can I help you with our corporate knowledge base today?',
      timestamp: new Date()
    }]);
    setActiveCitation(null);
    setIsTyping(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    sendMessage,
    isTyping,
    activeCitation,
    openCitation,
    closeCitation,
    clearChat
  };
}
