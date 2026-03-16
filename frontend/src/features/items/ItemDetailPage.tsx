import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import type { Item, ItemRevision } from '../../types';

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [revisions, setRevisions] = useState<ItemRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', change_summary: '' });

  const fetchItem = async () => {
    try {
      const [itemRes, revRes] = await Promise.all([
        api.get(`/items/${id}`),
        api.get(`/items/${id}/revisions`),
      ]);
      setItem(itemRes.data);
      setRevisions(revRes.data);
      setForm({ title: itemRes.data.title, body: itemRes.data.current_revision?.body || '', change_summary: '' });
    } catch (err) { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchItem(); }, [id]);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/items/${id}`, { title: form.title, body: form.body, change_summary: form.change_summary || undefined });
      setEditing(false);
      fetchItem();
    } catch (err) { /* empty */ }
  };

  const rollback = async (revisionId: string) => {
    try {
      await api.post(`/items/${id}/rollback/${revisionId}`);
      fetchItem();
    } catch (err) { /* empty */ }
  };

  const deleteItem = async () => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/items/${id}`);
      navigate('/items');
    } catch (err) { /* empty */ }
  };

  if (loading) return <div className="text-surface-200/50 text-center py-12">Loading...</div>;
  if (!item) return <div className="text-surface-200/50 text-center py-12">Item not found</div>;

  return (
    <div>
      <button onClick={() => navigate('/items')} className="btn-ghost mb-4 text-sm">← Back to Items</button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          {editing ? (
            <form onSubmit={saveItem} className="card space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-200/70 mb-1">Title</label>
                <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-200/70 mb-1">Content</label>
                <textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} className="input min-h-[200px]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-200/70 mb-1">Change summary</label>
                <input value={form.change_summary} onChange={(e) => setForm(f => ({ ...f, change_summary: e.target.value }))} className="input" placeholder="What changed?" />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary">Save Revision</button>
                <button type="button" onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-surface-50">{item.title}</h1>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit</button>
                  <button onClick={deleteItem} className="btn-danger text-sm">Delete</button>
                </div>
              </div>
              <div className="flex gap-3 mb-4">
                <span className={`badge ${item.status === 'published' ? 'badge-green' : item.status === 'draft' ? 'badge-yellow' : 'badge-red'}`}>{item.status}</span>
                {item.category && <span className="badge-primary">{item.category}</span>}
                {item.tags?.map((tag) => <span key={tag} className="badge bg-surface-700/50 text-surface-200/70">{tag}</span>)}
              </div>
              <div className="prose prose-invert max-w-none text-surface-200/80 whitespace-pre-wrap">
                {item.current_revision?.body || <span className="text-surface-200/30 italic">No content</span>}
              </div>
            </div>
          )}
        </div>

        {/* Revision timeline */}
        <div>
          <div className="card">
            <h2 className="text-lg font-semibold text-surface-50 mb-4">Revision History</h2>
            <div className="space-y-3">
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className={`p-3 rounded-lg border transition-all ${
                    rev.id === item.current_revision_id
                      ? 'border-primary-500/50 bg-primary-500/5'
                      : 'border-surface-700/30 hover:border-surface-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-50">v{rev.revision_number}</span>
                    {rev.id === item.current_revision_id && <span className="badge-green text-xs">Current</span>}
                  </div>
                  <p className="text-xs text-surface-200/50 mt-1">{rev.change_summary || 'No summary'}</p>
                  <p className="text-xs text-surface-200/30 mt-1">{new Date(rev.created_at).toLocaleString()}</p>
                  {rev.id !== item.current_revision_id && (
                    <button onClick={() => rollback(rev.id)} className="btn-ghost text-xs mt-2 px-2 py-1">Rollback</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
