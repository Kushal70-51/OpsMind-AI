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
  role: z.enum(['employee', 'admin']),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'employee', email: 'demo@company.com', password: 'password123' }
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    await login(data.email, data.role);
    setIsSubmitting(false);
    
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-950 text-zinc-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl aspect-[1/0.5] bg-gradient-to-b from-blue-500/20 to-transparent opacity-50 blur-3xl rounded-full" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 w-full px-4 sm:px-0">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-4 ring-zinc-950">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
          OpsMind AI
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400 font-medium">
          Corporate RAG Knowledge Base
        </p>
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

            <div>
              <Label htmlFor="role" className="text-zinc-300">Demo Role</Label>
              <div className="mt-2">
                <select
                  id="role"
                  className="mt-1 block w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-white appearance-none"
                  {...register('role')}
                >
                  <option value="employee">Employee (Chat Access)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 focus-visible:ring-blue-500 text-white text-base h-11" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in to Workspace'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
             <span className="inline-flex items-center rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">
               Demo Mode Active
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}
