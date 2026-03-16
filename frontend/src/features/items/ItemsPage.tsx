import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import type { Item } from '../../types';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: '' });
  const [creating, setCreating] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await api.get('/items');
      setItems(res.data);
    } catch (err) { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/items', { title: form.title, body: form.body, category: form.category || undefined });
      setShowCreate(false);
      setForm({ title: '', body: '', category: '' });
      fetchItems();
    } catch (err) { /* empty */ }
    setCreating(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'published': return 'badge-green';
      case 'draft': return 'badge-yellow';
      case 'archived': return 'badge-red';
      default: return 'badge-primary';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Items</h1>
          <p className="text-surface-200/50 text-sm mt-1">Manage revisable items</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">+ New Item</button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createItem} className="card mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1">Title</label>
            <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="Item title" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1">Content</label>
            <textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} className="input min-h-[100px]" placeholder="Item content..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1">Category</label>
            <input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="input" placeholder="Optional category" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create Item'}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {/* Items list */}
      {loading ? (
        <div className="text-surface-200/50 text-center py-12">Loading...</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-surface-200/50 text-lg">No items yet</p>
          <p className="text-surface-200/30 text-sm mt-1">Create your first item to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Category</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/items/${item.id}`} className="text-primary-400 hover:text-primary-300 font-medium">
                      {item.title}
                    </Link>
                  </td>
                  <td><span className={statusColor(item.status)}>{item.status}</span></td>
                  <td className="text-surface-200/50">{item.category || '—'}</td>
                  <td className="text-surface-200/50 text-xs">{new Date(item.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
