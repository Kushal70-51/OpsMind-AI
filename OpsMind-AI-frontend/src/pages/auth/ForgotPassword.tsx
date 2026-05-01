import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { API_BASE } from '../../lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      setMessage(data.message || 'Reset link sent.');
      setStatus('sent');
    } catch {
      setMessage('Could not connect to server. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-950 text-zinc-50 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl aspect-[1/0.5] bg-gradient-to-b from-blue-500/20 to-transparent opacity-50 blur-3xl rounded-full" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-4 ring-zinc-950">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">Forgot Password</h2>
        <p className="mt-2 text-center text-sm text-zinc-400">Enter your work email and we'll send a reset link.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-zinc-900 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-white/10">
          {status === 'sent' ? (
            <div className="text-center space-y-4">
              <p className="text-emerald-400 font-medium">{message}</p>
              <p className="text-zinc-500 text-sm">Check your inbox and follow the link to reset your password.</p>
              <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="email" className="text-zinc-300">Work Email</Label>
                <div className="mt-2">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="bg-zinc-950 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-500 font-medium bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {message}
                </p>
              )}

              <Button
                type="submit"
                disabled={status === 'loading' || !email}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-base h-11"
              >
                {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
