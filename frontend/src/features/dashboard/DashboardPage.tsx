import { useAuth } from '../../hooks/useAuth';

export default function DashboardPage() {
  const { user, currentTenant } = useAuth();

  const stats = [
    { label: 'Items', value: '—', icon: '📝', color: 'from-indigo-500 to-purple-600' },
    { label: 'Files', value: '—', icon: '📁', color: 'from-emerald-500 to-teal-600' },
    { label: 'Members', value: '—', icon: '👥', color: 'from-amber-500 to-orange-600' },
    { label: 'Storage Used', value: '—', icon: '💾', color: 'from-pink-500 to-rose-600' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-50">
          Welcome back, <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">{user?.full_name}</span>
        </h1>
        <p className="text-surface-200/50 mt-1">{currentTenant?.name} — Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-200/50">{stat.label}</p>
                <p className="text-2xl font-bold text-surface-50 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-surface-50 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a href="/items" className="btn-secondary justify-start">📝 Create New Item</a>
          <a href="/files" className="btn-secondary justify-start">📁 Upload File</a>
          <a href="/members" className="btn-secondary justify-start">👥 Invite Member</a>
        </div>
      </div>
    </div>
  );
}
