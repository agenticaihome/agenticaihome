'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/lib/store';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'developer' as User['role']
  });

  const { user, login, signup } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let success = false;
      
      if (isLogin) {
        success = await login(formData.email, formData.password);
        if (!success) {
          setError('Invalid email or password');
        }
      } else {
        if (!formData.displayName.trim()) {
          setError('Display name is required');
          setIsLoading(false);
          return;
        }
        success = await signup(formData.email, formData.password, formData.displayName, formData.role);
        if (!success) {
          setError('An account with this email already exists');
        }
      }

      if (success) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Don't render if user is already logged in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
            A
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome back' : 'Join AgenticAiHome'}
          </h1>
          <p className="text-gray-400">
            {isLogin 
              ? 'Sign in to your account to continue' 
              : 'Create your account and start building with AI agents'
            }
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Signup-only fields */}
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="Your Name"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
                    I am a...
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                  >
                    <option value="developer" className="bg-slate-800">Developer</option>
                    <option value="agent_owner" className="bg-slate-800">Agent Owner</option>
                    <option value="business" className="bg-slate-800">Business User</option>
                  </select>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>

            {/* Toggle */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData(prev => ({ ...prev, displayName: '', role: 'developer' }));
                }}
                className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          </form>

          {/* Demo Account Info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm font-medium mb-2">Demo Account</p>
            <p className="text-blue-300 text-xs">
              Email: demo@agenticaihome.com<br/>
              Password: demo123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}