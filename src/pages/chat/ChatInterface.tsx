import { useState, useRef, useEffect, FormEvent } from 'react';
import { useChat } from '../../hooks/useChat';
import { Send, Bot, User, FileText, Plus, MessageSquare, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';

export function ChatInterface() {
  const { messages, sendMessage, isTyping, activeCitation, openCitation, closeCitation, clearChat } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-950">
      {/* Chat History Sidebar */}
      <div className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-zinc-900">
        <div className="p-4 border-b border-white/10">
          <Button 
            onClick={clearChat} 
            className="w-full justify-start gap-2 bg-zinc-50 border-none text-zinc-950 hover:bg-zinc-200 shadow-sm font-semibold py-2.5 rounded-md"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest px-2 pt-2 pb-2">Recent</div>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-zinc-50 bg-zinc-800 rounded-md text-left font-medium">
            <MessageSquare className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="truncate">Knowledge base queries</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex max-w-4xl mx-auto gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-1",
                msg.role === 'user' ? "bg-zinc-800 text-zinc-400" : "bg-blue-500 text-white"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={cn(
                "flex-1 space-y-2 max-w-[85%]",
                msg.role === 'user' ? "text-right" : "text-left"
              )}>
                {msg.role === 'ai' && <div className="font-semibold mb-1 text-zinc-50 text-sm">OpsMind AI</div>}
                <div className={cn(
                  "inline-block rounded-2xl px-5 py-3 text-[14px] text-left leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-zinc-800 text-zinc-50 rounded-br-none" 
                    : "bg-transparent text-zinc-50 px-0 py-0"
                )}>
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-[15px] ml-1 bg-blue-500 animate-pulse align-middle" />
                  )}
                </div>
                
                {/* Citations Footer */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className={cn("flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/10", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    {msg.citations.map(citation => (
                      <button
                        key={citation.id}
                        onClick={() => openCitation(citation)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 text-[11px] font-medium text-zinc-400 hover:text-zinc-50 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        [{citation.page ? `Pg ${citation.page}` : citation.title}]
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="px-6 py-8 bg-zinc-950">
          <div className="max-w-4xl mx-auto relative bg-zinc-900 border border-white/10 rounded-xl p-1.5 flex items-center">
            <form onSubmit={handleSubmit} className="flex-1 relative flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask OpsMind AI..."
                className="w-full max-h-32 min-h-[44px] resize-none bg-transparent border-none px-4 py-3 text-[14px] text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isTyping) handleSubmit(e);
                  }
                }}
                rows={1}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || isTyping}
                className="h-9 w-9 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors shrink-0 m-1"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Citation Drawer / Sidebar */}
      {activeCitation && (
        <div className="w-80 xl:w-96 border-l border-white/10 bg-zinc-900 flex flex-col shadow-2xl absolute inset-y-0 right-0 z-20 lg:static">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-transparent">
            <h3 className="font-semibold text-zinc-50 flex items-center gap-2 text-[14px]">
              Source Context
              <span className="text-[10px] bg-zinc-700 px-1.5 py-0.5 rounded-full ml-2 text-zinc-300">SOP</span>
            </h3>
            <button onClick={closeCitation} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto flex-1">
            <div className="mb-4 text-[11px] text-zinc-400 leading-snug">
              Document: <span className="text-zinc-300">{activeCitation.title}</span><br/>
              {activeCitation.page && (
                <>Page: {activeCitation.page} | Section: Auto</>
              )}
            </div>
            
            <div className="bg-zinc-950 border border-white/10 p-4 rounded-lg font-mono text-xs text-zinc-400 leading-relaxed">
              {activeCitation.snippet}
            </div>
            
            <div className="mt-5 text-[11px] text-zinc-500">
              Confidence Score: <span className="text-zinc-400">98.4%</span><br/>
              Relevance: <span className="text-zinc-400">Primary Match</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
