import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBypassLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // Create mock user and token for bypass
      const mockToken = 'bypass-token-' + Date.now();
      
      // Manually set auth state (bypassing API call)
      localStorage.setItem('token', mockToken);
      localStorage.setItem('tenantId', 'bypass-tenant');
      
      // Navigate to dashboard directly
      navigate('/dashboard');
    } catch (err: any) {
      setError('Bypass login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30 mb-4">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-50">Welcome back</h1>
          <p className="text-surface-200/50 mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@company.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="mt-4 pt-4 border-t border-surface-200/20">
            <button
              type="button"
              onClick={handleBypassLogin}
              disabled={loading}
              className="w-full btn-secondary"
            >
              {loading ? 'Bypassing...' : '🚀 Bypass Login (No Email/Password)'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-surface-200/50 mt-6">
          Don't have an account?{' '}
          <a href="/signup" className="text-primary-400 hover:text-primary-300 font-medium">Sign up</a>
        </p>
      </div>
    </div>
  );
}
