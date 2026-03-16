import { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { FileRecord } from '../../types';

export default function FilesPage() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', original_name: '', mime_type: 'application/octet-stream', size_bytes: 0, storage_path: '', folder: '', description: '' });
  const [creating, setCreating] = useState(false);

  const fetchFiles = async () => {
    try { const res = await api.get('/files'); setFiles(res.data); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, []);

  const createFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/files', { ...form, size_bytes: Number(form.size_bytes), folder: form.folder || undefined, description: form.description || undefined });
      setShowCreate(false);
      setForm({ name: '', original_name: '', mime_type: 'application/octet-stream', size_bytes: 0, storage_path: '', folder: '', description: '' });
      fetchFiles();
    } catch {}
    setCreating(false);
  };

  const deleteFile = async (id: string) => {
    if (!confirm('Delete this file?')) return;
    try { await api.delete(`/files/${id}`); fetchFiles(); } catch {}
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Files</h1>
          <p className="text-surface-200/50 text-sm mt-1">Upload and manage files</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">+ Upload File</button>
      </div>

      {showCreate && (
        <form onSubmit={createFile} className="card mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-200/70 mb-1">File name</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-200/70 mb-1">Original name</label>
              <input value={form.original_name} onChange={(e) => setForm(f => ({ ...f, original_name: e.target.value }))} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-200/70 mb-1">Storage path</label>
              <input value={form.storage_path} onChange={(e) => setForm(f => ({ ...f, storage_path: e.target.value }))} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-200/70 mb-1">Folder</label>
              <input value={form.folder} onChange={(e) => setForm(f => ({ ...f, folder: e.target.value }))} className="input" placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200/70 mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="Optional" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Uploading...' : 'Upload'}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-surface-200/50 text-center py-12">Loading...</div>
      ) : files.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-surface-200/50 text-lg">No files yet</p>
          <p className="text-surface-200/30 text-sm mt-1">Upload your first file to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Folder</th><th>Uploaded</th><th></th></tr></thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td className="font-medium text-surface-50">{f.name}</td>
                  <td><span className="badge bg-surface-700/50 text-surface-200/70">{f.mime_type.split('/')[1] || f.mime_type}</span></td>
                  <td className="text-surface-200/50">{formatSize(f.size_bytes)}</td>
                  <td className="text-surface-200/50">{f.folder || '—'}</td>
                  <td className="text-surface-200/50 text-xs">{new Date(f.created_at).toLocaleDateString()}</td>
                  <td><button onClick={() => deleteFile(f.id)} className="btn-ghost text-red-400 text-xs">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
