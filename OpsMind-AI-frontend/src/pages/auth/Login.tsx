import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { BrainCircuit } from 'lucide-react';
import { useState } from 'react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'demo@company.com', password: 'password123' }
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    setServerError('');

    const result = await login(data.email, data.password);

    setIsSubmitting(false);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setServerError('');
    const result = await loginWithGoogle();
    setIsSubmitting(false);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-950 text-zinc-50 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl aspect-[1/0.5] bg-gradient-to-b from-blue-500/20 to-transparent opacity-50 blur-3xl rounded-full" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 w-full px-4 sm:px-0">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-4 ring-zinc-950">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">OpsMind AI</h2>
        <p className="mt-2 text-center text-sm text-zinc-400 font-medium">Corporate RAG Knowledge Base</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 w-full px-4 sm:px-0">
        <div className="bg-zinc-900 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-white/10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="email" className="text-zinc-300">Work Email</Label>
              <div className="mt-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="bg-zinc-950 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500"
                  {...register('email')}
                />
                {errors.email && <p className="mt-1 text-sm text-red-500 font-medium">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="mt-2">
                <Input
                  id="password"
                  type="password"
                  className="bg-zinc-950 border-white/10 text-white focus-visible:ring-blue-500"
                  {...register('password')}
                />
                {errors.password && <p className="mt-1 text-sm text-red-500 font-medium">{errors.password.message}</p>}
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-red-500 font-medium bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 focus-visible:ring-blue-500 text-white text-base h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in to Workspace'}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <span className="border-b border-zinc-800 w-1/5 lg:w-1/4"></span>
            <span className="text-xs text-center text-zinc-500 uppercase">Or sign in with</span>
            <span className="border-b border-zinc-800 w-1/5 lg:w-1/4"></span>
          </div>

          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full mt-4 bg-white text-zinc-900 hover:bg-zinc-200 focus-visible:ring-blue-500 text-base h-11 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>

          <div className="mt-6 text-center text-xs text-zinc-500 space-y-1">
            <p>Demo: <span className="text-zinc-400">admin@company.com</span> / password123</p>
            <p>Demo: <span className="text-zinc-400">demo@company.com</span> / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
