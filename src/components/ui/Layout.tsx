import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Database, LogOut, Menu, X, BrainCircuit } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', icon: MessageSquare, label: 'Chat', roles: ['employee', 'admin'] },
    { to: '/admin', icon: Database, label: 'Knowledge Base', roles: ['admin'] },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden font-sans text-zinc-50">
      {/* Mobile nav header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-zinc-900 border-b border-white/10 fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-2 font-semibold">
          <BrainCircuit className="w-5 h-5 text-blue-500" />
          <span>OpsMind AI</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-zinc-400">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-[240px] bg-zinc-900 border-r border-white/10 text-zinc-300 md:static md:flex flex-col transition-transform duration-300 ease-in-out font-medium shadow-2xl md:shadow-none",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-14 flex items-center px-5 gap-2 text-zinc-50 font-bold text-lg border-b border-white/10">
          <BrainCircuit className="w-6 h-6 text-blue-500 rounded bg-blue-500/10 p-1" />
          <span className="tracking-tight">OpsMind AI</span>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navLinks.filter(link => user?.role && link.roles.includes(user.role)).map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-[13px]",
                isActive ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-50"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-zinc-900">
          <div className="flex flex-col truncate pr-2">
            <span className="text-sm text-zinc-50 font-medium truncate">{user?.name}</span>
            <span className="text-xs text-zinc-400 capitalize">{user?.role}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-md transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-20 md:hidden" 
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
