import { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { Notification } from '../../types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try { const res = await api.get('/notifications'); setNotifications(res.data); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const markRead = async (id: string) => {
    try { await api.put(`/notifications/${id}/read`); fetch(); } catch {}
  };

  const markAllRead = async () => {
    try { await api.put('/notifications/read-all'); fetch(); } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Notifications</h1>
          <p className="text-surface-200/50 text-sm mt-1">Stay up to date</p>
        </div>
        <button onClick={markAllRead} className="btn-secondary text-sm">Mark all read</button>
      </div>

      {loading ? (
        <div className="text-surface-200/50 text-center py-12">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-surface-200/50 text-lg">No notifications</p>
          <p className="text-surface-200/30 text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start gap-4 cursor-pointer ${!n.read_at ? 'border-primary-500/30' : 'opacity-60'}`}
              onClick={() => !n.read_at && markRead(n.id)}
            >
              <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!n.read_at ? 'bg-primary-500' : 'bg-surface-700'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-50">{n.title}</p>
                <p className="text-sm text-surface-200/50 mt-0.5">{n.body}</p>
                <p className="text-xs text-surface-200/30 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              <span className="badge bg-surface-700/50 text-surface-200/50 text-xs flex-shrink-0">{n.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
