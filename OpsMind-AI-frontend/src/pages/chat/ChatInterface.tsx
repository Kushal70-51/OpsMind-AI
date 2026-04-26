import { useState, useRef, useEffect, FormEvent } from 'react';
import { useChat } from '../../context/ChatContext';
import { 
  Send, Bot, User, FileText, Plus, X, 
  ChevronLeft, ChevronRight, Copy, Check, BrainCircuit 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Citation } from '../../types';

// ── Citation Drawer ───────────────────────────────────────────────────────────
function CitationDrawer({
  citations,
  initialIndex,
  onClose
}: {
  citations: Citation[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const [copied, setCopied] = useState(false);
  const citation = citations[idx];

  useEffect(() => { setIdx(initialIndex); }, [initialIndex]);

  const copy = async () => {
    await navigator.clipboard.writeText(citation.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreNum = citation.score ? Math.round(parseFloat(citation.score) * 100) : null;
  const scoreAccent =
    scoreNum === null ? 'accent-zinc-600' :
    scoreNum >= 80    ? 'accent-emerald-500' :
    scoreNum >= 60    ? 'accent-blue-500' :
    scoreNum >= 40    ? 'accent-yellow-500' : 'accent-red-500';

  return (
    <div className="w-80 xl:w-96 border-l border-white/10 bg-zinc-900 flex flex-col shadow-2xl absolute inset-y-0 right-0 z-20 lg:static">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-[13px] font-semibold text-zinc-50 truncate" title={citation.title}>
            {citation.title}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {citations.length > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-zinc-800/50 shrink-0">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="p-1 text-zinc-400 hover:text-zinc-50 disabled:opacity-30 transition-all font-bold">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">
            Source {idx + 1} of {citations.length}
          </span>
          <button onClick={() => setIdx(i => Math.min(citations.length - 1, i + 1))} disabled={idx === citations.length - 1} className="p-1 text-zinc-400 hover:text-zinc-50 disabled:opacity-30 transition-all font-bold">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          {citation.page && <span>Page <span className="text-zinc-200 font-bold">{citation.page}</span></span>}
          <span className="truncate max-w-[180px] font-medium">{citation.title}</span>
        </div>

        {scoreNum !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              <span>Relevance</span>
              <span className="text-zinc-300">{scoreNum}%</span>
            </div>
            <progress value={scoreNum} max={100} className={cn('h-1 w-full bg-zinc-700 rounded-full overflow-hidden', scoreAccent)} />
          </div>
        )}

        <div className="relative group">
          <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap font-medium">
            {citation.snippet || 'No source text available.'}
          </div>
          {citation.snippet && (
            <button onClick={copy} className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-all shadow-xl">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Chat Interface ───────────────────────────────────────────────────────
export function ChatInterface() {
  const { 
    activeConversation, sendMessage, isTyping, activeCitation, 
    setActiveCitation 
  } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = activeConversation?.messages || [];

  const [activeCitationIndex, setActiveCitationIndex] = useState(0);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    
    sendMessage(input);
    setInput('');
  };

  const handleOpenCitation = (citations: Citation[], index: number) => {
    setActiveCitations(citations);
    setActiveCitationIndex(index);
    setActiveCitation(citations[index]);
  };

  const closeCitation = () => setActiveCitation(null);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0d0d0d]">
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
             <div className="mb-8 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
                   <BrainCircuit className="w-10 h-10 text-blue-500" />
                </div>
                <h1 className="text-3xl font-bold text-zinc-100 tracking-tight text-center">
                  What are you working on?
                </h1>
                <p className="text-zinc-500 mt-2 text-center text-[15px]">
                  OpsMind AI is here to help with your projects and queries.
                </p>
             </div>

             <div className="w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <form 
                  onSubmit={handleSubmit}
                  className="bg-zinc-900/50 border border-white/10 rounded-[26px] p-2 pr-3 flex items-end shadow-2xl focus-within:border-white/20 transition-all duration-300"
                >
                    <button type="button" className="p-3 text-zinc-500 hover:text-zinc-300 transition-colors">
                      <Plus className="w-4 h-4 bg-zinc-800 rounded-full p-0.5" />
                    </button>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything"
                      className="flex-1 max-h-48 min-h-[44px] resize-none bg-transparent border-none px-2 py-3 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-0 leading-relaxed font-medium"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (input.trim() && !isTyping) handleSubmit(e);
                        }
                      }}
                      rows={1}
                    />
                    <div className="flex items-center gap-2 pb-1.5">
                      <Button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="h-9 w-9 p-0 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-full flex items-center justify-center transition-all disabled:opacity-30 shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                </form>
                
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                   {['Summarize document', 'Analyze code', 'Plan a project', 'Answer questions'].map(hint => (
                      <button 
                        key={hint}
                        type="button"
                        onClick={() => setInput(hint)}
                        className="px-4 py-2 rounded-full border border-white/5 bg-zinc-900/30 text-zinc-500 text-[12px] hover:border-white/20 hover:bg-zinc-900/50 hover:text-zinc-300 transition-all"
                      >
                        {hint}
                      </button>
                   ))}
                </div>
             </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pt-10 custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex max-w-3xl mx-auto gap-5', msg.role === 'user' ? 'opacity-95' : 'animate-in fade-in slide-in-from-bottom-2 duration-300')}>
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 border shadow-sm',
                    msg.role === 'user' ? 'bg-zinc-900 border-white/5 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-900'
                  )}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <BrainCircuit className="w-5 h-5" />}
                  </div>

                  <div className={cn('flex-1 space-y-3 min-w-0')}>
                    <div className="font-bold text-zinc-100 text-[14px]">
                      {msg.role === 'user' ? 'You' : 'OpsMind AI'}
                    </div>
                    <div className={cn(
                      'text-[15px] text-zinc-200 leading-[1.6] whitespace-pre-wrap',
                      msg.role === 'user' ? 'font-medium' : ''
                    )}>
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-zinc-500 animate-pulse align-middle" />
                      )}
                    </div>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {msg.citations.map((citation, i) => (
                          <button
                            key={citation.id}
                            onClick={() => handleOpenCitation(msg.citations!, i)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border shadow-sm',
                              activeCitation?.id === citation.id
                                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                                : 'bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/20 hover:text-zinc-300'
                            )}
                          >
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">
                              Source {i + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex max-w-3xl mx-auto gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200">
                      <BrainCircuit className="w-5 h-5 text-zinc-900" />
                   </div>
                   <div className="flex items-center gap-1 py-3">
                      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-32" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] to-transparent pb-8 pt-10 px-6">
              <div className="max-w-3xl mx-auto">
                <form 
                  onSubmit={handleSubmit}
                  className="bg-zinc-900 border border-white/10 rounded-[26px] p-2 pr-3 flex items-end shadow-2xl focus-within:border-white/20 transition-all duration-300 text-zinc-300"
                >
                    <button type="button" className="p-3 text-zinc-500 hover:text-zinc-300 transition-colors">
                      <Plus className="w-4 h-4 bg-zinc-800 rounded-full p-0.5" />
                    </button>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Message OpsMind AI..."
                      className="flex-1 max-h-48 min-h-[44px] resize-none bg-transparent border-none px-2 py-3 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-0 leading-relaxed font-medium"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (input.trim() && !isTyping) handleSubmit(e);
                        }
                      }}
                      rows={1}
                    />
                    <div className="flex items-center gap-2 pb-1.5">
                      <Button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="h-9 w-9 p-0 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-full flex items-center justify-center transition-all disabled:opacity-30 self-end m-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                </form>
                <p className="text-[11px] text-zinc-600 text-center mt-3 font-medium">
                  OpsMind AI may produce inaccurate information about people, places, or facts.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {activeCitation && activeCitations.length > 0 && (
        <CitationDrawer
          citations={activeCitations}
          initialIndex={activeCitationIndex}
          onClose={closeCitation}
        />
      )}
    </div>
  );
}
