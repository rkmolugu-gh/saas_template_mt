import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/items', label: 'Items', icon: '📝' },
  { path: '/files', label: 'Files', icon: '📁' },
  { path: '/members', label: 'Members', icon: '👥' },
  { path: '/billing', label: 'Billing', icon: '💳' },
  { path: '/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
  { path: '/admin', label: 'Admin', icon: '🛡️' },
];

export default function Layout() {
  const { user, currentTenant, tenants, switchTenant, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-900/80 border-r border-surface-700/50 flex flex-col backdrop-blur-sm">
        {/* Tenant Switcher */}
        <div className="p-4 border-b border-surface-700/50">
          <label className="text-xs text-surface-200/50 uppercase tracking-wider font-semibold">Tenant</label>
          <select
            value={currentTenant?.id || ''}
            onChange={(e) => switchTenant(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-surface-800 border border-surface-700/50 rounded-lg text-sm text-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-300 shadow-sm'
                    : 'text-surface-200/60 hover:text-surface-50 hover:bg-surface-800/60'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xs font-bold text-white">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-50 truncate">{user?.full_name}</p>
              <p className="text-xs text-surface-200/50 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="mt-3 w-full btn-ghost text-xs">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
