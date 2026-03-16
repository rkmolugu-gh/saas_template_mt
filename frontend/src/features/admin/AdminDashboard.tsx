import { useState, useEffect } from 'react';
import api from '../../lib/api';

interface TenantStat {
  id: string; name: string; slug: string; status: string;
  member_count: number; plan_name: string; subscription_status: string;
  created_at: string;
}

interface PlatformStats {
  totalTenants: number; totalUsers: number; activeSubscriptions: number;
}

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<TenantStat[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/tenants').then((r) => setTenants(r.data)),
      api.get('/admin/stats').then((r) => setStats(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-surface-200/50 text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-50">🛡️ Admin Dashboard</h1>
        <p className="text-surface-200/50 text-sm mt-1">Platform-wide overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Tenants', value: stats?.totalTenants, icon: '🏢' },
          { label: 'Total Users', value: stats?.totalUsers, icon: '👤' },
          { label: 'Active Subscriptions', value: stats?.activeSubscriptions, icon: '💳' },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-surface-200/50">{s.label}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-3xl font-bold text-surface-50">{s.value ?? '—'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tenants table */}
      <div className="table-container">
        <table>
          <thead><tr><th>Tenant</th><th>Slug</th><th>Status</th><th>Plan</th><th>Members</th><th>Created</th></tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td className="font-medium text-surface-50">{t.name}</td>
                <td className="text-surface-200/50">{t.slug}</td>
                <td><span className={`badge ${t.status === 'active' ? 'badge-green' : 'badge-red'}`}>{t.status}</span></td>
                <td className="text-surface-200/50">{t.plan_name}</td>
                <td className="text-surface-200/50">{t.member_count}</td>
                <td className="text-surface-200/50 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
