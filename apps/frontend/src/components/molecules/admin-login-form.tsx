'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { loginAdmin } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

interface AdminLoginFormProps {
  onSubmit?: (email: string, password: string) => void;
}

export function AdminLoginForm({ onSubmit }: AdminLoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (onSubmit) {
        await onSubmit(email, password);
      }
      const response = await loginAdmin({ email, password });
      if (
        !response?.user ||
        (response.user.role !== 'admin' && response.user.role !== 'super_admin')
      ) {
        throw new Error('Admin access required');
      }
      // Set auth context so private layout recognizes authentication
      login(response.user);
      router.push(ROUTES.ADMIN.DASHBOARD);
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-2 border-blue-100">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-2">
          <Shield className="h-8 w-8 text-blue-600 mr-2" />
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            Admin Portal
          </CardTitle>
        </div>
        <p className="text-sm text-center text-gray-600">
          Sign in to access administrative functions
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="admin-email"
              className="text-sm font-medium text-gray-700"
            >
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="admin-email"
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="admin-password"
              className="text-sm font-medium text-gray-700"
            >
              Admin Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => router.push(ROUTES.HOME)}
              className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
            >
              Back to main site
            </button>
          </div>

          <Button
            type="submit"
            className="w-full bg-black hover:bg-slate-900 text-white font-semibold"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In as Admin'}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              This portal is restricted to authorized administrators only.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
