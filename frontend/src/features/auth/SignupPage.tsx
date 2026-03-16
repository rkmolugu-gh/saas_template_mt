import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', tenant_name: '', tenant_slug: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === 'tenant_name') {
      setForm((f) => ({ ...f, tenant_slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form.email, form.password, form.full_name, form.tenant_name, form.tenant_slug);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30 mb-4">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-50">Create your account</h1>
          <p className="text-surface-200/50 mt-1">Start your free trial today</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Full name</label>
            <input type="text" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="input" placeholder="Jane Doe" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="input" placeholder="you@company.com" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} className="input" placeholder="Min 6 characters" required minLength={6} />
          </div>

          <hr className="border-surface-700/50" />

          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Organization name</label>
            <input type="text" value={form.tenant_name} onChange={(e) => update('tenant_name', e.target.value)} className="input" placeholder="Acme Inc." required />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Organization slug</label>
            <input type="text" value={form.tenant_slug} onChange={(e) => update('tenant_slug', e.target.value)} className="input" placeholder="acme-inc" required pattern="[a-z0-9\-]+" />
            <p className="mt-1 text-xs text-surface-200/40">Lowercase letters, numbers, and hyphens only</p>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-surface-200/50 mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</a>
        </p>
      </div>
    </div>
  );
}
