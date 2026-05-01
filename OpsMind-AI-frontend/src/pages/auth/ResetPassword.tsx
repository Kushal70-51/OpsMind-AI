import { useState, FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { API_BASE } from '../../lib/api';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Reset failed.');
        setStatus('error');
        return;
      }
      setMessage(data.message);
      setStatus('done');
      setTimeout(() => navigate('/login'), 3000);
    } catch {
      setMessage('Could not connect to server. Please try again.');
      setStatus('error');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <p>Invalid or missing reset token. <Link to="/forgot-password" className="text-blue-400">Request a new one.</Link></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-950 text-zinc-50 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl aspect-[1/0.5] bg-gradient-to-b from-blue-500/20 to-transparent opacity-50 blur-3xl rounded-full" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-4 ring-zinc-950">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">Set New Password</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-zinc-900 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-white/10">
          {status === 'done' ? (
            <div className="text-center space-y-3">
              <p className="text-emerald-400 font-medium">{message}</p>
              <p className="text-zinc-500 text-sm">Redirecting to login...</p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="password" className="text-zinc-300">New Password</Label>
                <div className="mt-2">
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-zinc-950 border-white/10 text-white focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirm" className="text-zinc-300">Confirm Password</Label>
                <div className="mt-2">
                  <Input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="bg-zinc-950 border-white/10 text-white focus-visible:ring-blue-500"
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
                disabled={status === 'loading'}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-base h-11"
              >
                {status === 'loading' ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
