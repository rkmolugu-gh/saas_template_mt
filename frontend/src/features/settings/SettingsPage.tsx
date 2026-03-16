import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import type { Tenant } from '../../types';

export default function SettingsPage() {
  const { currentTenant } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: '', logo_url: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      api.get(`/tenants/${currentTenant.id}`).then((res) => {
        setTenant(res.data);
        setForm({ name: res.data.name, logo_url: res.data.logo_url || '' });
      });
    }
  }, [currentTenant]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/tenants/${currentTenant?.id}`, { name: form.name, logo_url: form.logo_url || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-50">Settings</h1>
        <p className="text-surface-200/50 text-sm mt-1">Manage tenant settings</p>
      </div>

      <form onSubmit={save} className="card max-w-lg space-y-5">
        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Organization name</label>
          <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="input" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Logo URL</label>
          <input value={form.logo_url} onChange={(e) => setForm(f => ({ ...f, logo_url: e.target.value }))} className="input" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-1.5">Slug</label>
          <input value={tenant?.slug || ''} className="input opacity-50" disabled />
          <p className="text-xs text-surface-200/30 mt-1">Slug cannot be changed</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
          {saved && <span className="text-emerald-400 text-sm">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
