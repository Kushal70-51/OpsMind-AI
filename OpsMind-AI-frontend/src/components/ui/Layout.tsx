import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { 
  LogOut, Menu, X, BrainCircuit, Plus, Search, 
  Folder, Share2, User as UserIcon,
  MessageSquare as MessageSquareIcon, Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { API_BASE } from '../../lib/api';

export function Layout() {
  const { user, logout, getToken } = useAuth();
  const { 
    conversations, activeId, createNewChat, switchChat, deleteChat 
  } = useChat();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [projects, setProjects] = useState<{name: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_BASE}/documents`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await res.json();
        setProjects(data.map((d: any) => ({ name: d.filename })));
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, [getToken]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleInvite = () => {
    const inviteLink = `${window.location.origin}/invite/opsmind-${Math.random().toString(36).substring(7)}`;
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#0d0d0d] overflow-hidden font-sans text-zinc-300">
      {/* Mobile nav header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0d0d0d] border-b border-white/5 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-2 font-semibold text-zinc-100">
          <BrainCircuit className="w-5 h-5 text-blue-500" />
          <span>OpsMind AI</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-zinc-400">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] bg-[#000000] text-zinc-300 md:static md:flex flex-col transition-transform duration-300 ease-in-out border-r border-white/5",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-3 space-y-2 border-b border-white/5">
          <div className="flex items-center justify-between mb-4 group px-1">
             <div 
               onClick={() => navigate('/')}
               className="flex items-center gap-2 text-zinc-100 font-semibold group-hover:text-zinc-50 transition-colors cursor-pointer"
             >
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                   <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                <span>OpsMind AI</span>
             </div>
             <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <Share2 className="w-4 h-4" />
             </button>
          </div>

          <Button
            onClick={() => {
               createNewChat();
               if (mobileMenuOpen) setMobileMenuOpen(false);
               navigate('/');
            }}
            className="w-full justify-start gap-3 bg-zinc-900 border border-white/5 text-zinc-100 hover:bg-zinc-800 rounded-xl h-11 px-4 font-medium transition-all group"
          >
            <Plus className="w-4 h-4 text-zinc-400 group-hover:text-zinc-100" />
            <span>New chat</span>
          </Button>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
            <input 
              type="text" 
              placeholder="Search chats" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border border-white/5 text-[13px] pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-white/20 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Sidebar Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar space-y-6">
          {/* Documents Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Documents</span>
              <Plus className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-300 cursor-pointer" onClick={() => navigate('/admin')} />
            </div>
            <div className="space-y-0.5">
              {filteredProjects.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-zinc-600 italic">No documents</div>
              ) : (
                filteredProjects.map((project) => (
                  <button 
                    key={project.name}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-all text-[13px] group"
                  >
                    <Folder className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                    <span className="truncate">{project.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Recents Section */}
          <div>
            <div className="px-3 mb-2">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Recent</span>
            </div>
            <div className="space-y-0.5">
              {filteredConversations.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-zinc-600 italic">No recent chats</div>
              ) : (
                filteredConversations.map((chat) => (
                  <div key={chat.id} className="group relative flex items-center">
                    <button 
                      onClick={() => {
                        switchChat(chat.id);
                        if (mobileMenuOpen) setMobileMenuOpen(false);
                        navigate('/');
                      }}
                      className={cn(
                        "flex-1 flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-[13px] group relative min-w-0 border border-transparent",
                        activeId === chat.id ? "bg-zinc-900 text-zinc-100 border-white/5" : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-100"
                      )}
                    >
                      <MessageSquareIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate flex-1 text-left">{chat.title}</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                      className="absolute right-2 p-1.5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 space-y-2 mt-auto border-t border-white/5">
          <button 
            onClick={handleInvite}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-xl transition-all text-sm font-medium border border-blue-500/10"
          >
            <Share2 className="w-4 h-4" />
            <span>{inviteCopied ? 'Link copied!' : 'Invite via link'}</span>
          </button>

          <div className="group relative">
            <div className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900 transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-100 font-bold text-xs ring-offset-2 ring-offset-black group-hover:ring-1 ring-white/20">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[13px] font-medium text-zinc-100 truncate">{user?.name}</div>
                <div className="text-[11px] text-zinc-500 truncate">{user?.role}</div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-all"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 md:pt-0 pt-[61px] relative h-full">
        <Outlet />
      </main>
    </div>
  );
}
