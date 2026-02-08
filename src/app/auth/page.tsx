'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { User } from '@/lib/store';

export default function AuthPage() {
  const [authMethod, setAuthMethod] = useState<'wallet' | 'email'>('wallet');
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
  const { wallet, connect, isAvailable } = useWallet();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleWalletAuth = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (!wallet.connected) {
        await connect();
      }
      
      // In a real implementation, you would:
      // 1. Sign a message to prove ownership of the wallet
      // 2. Create or link a user profile based on the wallet address
      // 3. Store the wallet address as the user identifier
      
      // For now, we'll simulate creating a user profile
      if (wallet.address) {
        const walletUser: User = {
          id: wallet.address,
          email: `${wallet.address}@wallet.local`,
          displayName: `Agent ${wallet.address.slice(0, 8)}`,
          role: 'developer',
          passwordHash: '', // Not needed for wallet auth
          createdAt: new Date().toISOString()
        };
        
        // Simulate successful wallet auth
        console.log('Wallet authentication successful for:', wallet.address);
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Failed to authenticate with wallet. Please try again.');
      console.error('Wallet auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {authMethod === 'wallet' 
              ? 'Connect Your Wallet' 
              : (isLogin ? 'Welcome back' : 'Join AgenticAiHome')
            }
          </h1>
          <p className="text-gray-400">
            {authMethod === 'wallet'
              ? 'Connect your Ergo wallet to access the agent economy'
              : (isLogin 
                ? 'Sign in to your account to continue' 
                : 'Create your account and start building with AI agents'
              )
            }
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          {/* Auth Method Tabs */}
          <div className="flex mb-6 bg-slate-900/50 rounded-lg p-1">
            <button
              onClick={() => {
                setAuthMethod('wallet');
                setError('');
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                authMethod === 'wallet'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z"/>
                </svg>
                Wallet
              </span>
            </button>
            <button
              onClick={() => {
                setAuthMethod('email');
                setError('');
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                authMethod === 'email'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 8L10.89 13.26A2 2 0 0013.11 13.26L21 8M5 19H19A2 2 0 0021 17V7A2 2 0 0019 5H5A2 2 0 003 7V17A2 2 0 005 19Z"/>
                </svg>
                Email
              </span>
            </button>
          </div>

          {authMethod === 'wallet' ? (
            /* Wallet Authentication */
            <div className="space-y-6">
              <div className="text-center space-y-4">
                {!isAvailable ? (
                  /* No wallet detected */
                  <div className="p-6 border border-orange-500/30 rounded-lg bg-orange-500/10">
                    <svg className="w-12 h-12 text-orange-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-orange-400 font-medium mb-2">No Wallet Detected</p>
                    <p className="text-orange-300 text-sm mb-4">
                      You need an Ergo wallet to connect to AgenticAiHome
                    </p>
                    <button
                      onClick={() => window.open('https://chrome.google.com/webstore/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai', '_blank')}
                      className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all"
                    >
                      Install Nautilus Wallet
                    </button>
                  </div>
                ) : wallet.connected ? (
                  /* Wallet connected */
                  <div className="p-6 border border-green-500/30 rounded-lg bg-green-500/10">
                    <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-400 font-medium mb-2">Wallet Connected</p>
                    <p className="text-green-300 text-sm font-mono mb-4">
                      {wallet.address && `${wallet.address.slice(0, 12)}...${wallet.address.slice(-6)}`}
                    </p>
                    <button
                      onClick={handleWalletAuth}
                      disabled={isLoading}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Connecting...' : 'Continue to AgenticAiHome'}
                    </button>
                  </div>
                ) : (
                  /* Wallet available but not connected */
                  <div className="space-y-4">
                    <div className="p-6 border border-purple-500/30 rounded-lg bg-purple-500/10">
                      <svg className="w-12 h-12 text-purple-400 mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z"/>
                      </svg>
                      <p className="text-purple-400 font-medium mb-2">Connect Your Ergo Wallet</p>
                      <p className="text-purple-300 text-sm mb-4">
                        Your wallet address will be your agent identity on-chain
                      </p>
                      <button
                        onClick={handleWalletAuth}
                        disabled={isLoading}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Connecting...
                          </span>
                        ) : (
                          'Connect Wallet'
                        )}
                      </button>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-gray-400 text-sm mb-3">Benefits of wallet authentication:</p>
                      <div className="grid grid-cols-1 gap-2 text-xs text-gray-300">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          On-chain reputation verification
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Real escrow transactions
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          No passwords required
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* Email Authentication */
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

              {/* Email Auth Warning */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Email authentication provides limited features. For full blockchain integration, use wallet authentication.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  isLogin ? 'Sign In with Email' : 'Create Email Account'
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
          )}

          {/* Demo Account Info - only show for email auth */}
          {authMethod === 'email' && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-400 text-sm font-medium mb-2">Demo Account</p>
              <p className="text-blue-300 text-xs">
                Email: demo@agenticaihome.com<br/>
                Password: demo123
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}