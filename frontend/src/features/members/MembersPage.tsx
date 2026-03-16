import { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { Member } from '../../types';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });

  const fetchMembers = async () => {
    try { const res = await api.get('/members'); setMembers(res.data); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/members/invite', inviteForm);
      setShowInvite(false);
      setInviteForm({ email: '', role: 'member' });
      alert('Invitation sent!');
    } catch {}
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this member?')) return;
    try { await api.delete(`/members/${id}`); fetchMembers(); } catch {}
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'badge bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300';
      case 'admin': return 'badge-primary';
      case 'member': return 'badge-green';
      case 'viewer': return 'badge bg-surface-700/50 text-surface-200/70';
      default: return 'badge-primary';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Members</h1>
          <p className="text-surface-200/50 text-sm mt-1">Manage team members and invitations</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)} className="btn-primary">+ Invite Member</button>
      </div>

      {showInvite && (
        <form onSubmit={invite} className="card mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-200/70 mb-1">Email</label>
              <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-200/70 mb-1">Role</label>
              <select value={inviteForm.role} onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value }))} className="input">
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">Send Invitation</button>
            <button type="button" onClick={() => setShowInvite(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-surface-200/50 text-center py-12">Loading...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xs font-bold text-white">
                        {m.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-surface-50">{m.full_name}</span>
                    </div>
                  </td>
                  <td className="text-surface-200/50">{m.email}</td>
                  <td><span className={roleColor(m.role)}>{m.role}</span></td>
                  <td className="text-surface-200/50 text-xs">{new Date(m.joined_at).toLocaleDateString()}</td>
                  <td>{m.role !== 'owner' && <button onClick={() => remove(m.id)} className="btn-ghost text-red-400 text-xs">Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
