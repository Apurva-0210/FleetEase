import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useRouteRefresh from '../../hooks/useRouteRefresh';
import { toast } from '../../components/Toast';
import { resolveMediaUrl } from '../../utils/mediaUrl';

export default function AdminGallery() {
  const nav = useNavigate();
  const [files, setFiles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [file, setFile] = React.useState(null);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/gallery/admin');
      setFiles(Array.isArray(res.data?.files) ? res.data.files : []);
    } catch {
      setError('Could not load gallery. Check that the backend is running.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useRouteRefresh(() => {
    const t = localStorage.getItem('token');
    let role = null;
    try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch {}
    if (role !== 'admin') { nav('/'); return; }
    load();
  }, [load, nav]);

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Choose an image file first.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('image', file);
      if (title.trim()) form.append('title', title.trim());
      const res = await api.post('/gallery/admin/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.file) {
        setFiles((prev) => [...prev, res.data.file]);
        setTitle('');
        setFile(null);
        e.target.reset?.();
        toast('Image uploaded', 'success');
      }
    } catch {
      setError('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const seedAssets = async () => {
    setSeeding(true);
    setError('');
    try {
      const res = await api.post('/gallery/admin/seed-assets');
      setFiles(Array.isArray(res.data?.files) ? res.data.files : []);
      toast('Default fleet images added', 'success');
    } catch {
      setError('Could not load default images.');
    } finally {
      setSeeding(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const res = await api.patch(`/gallery/admin/${encodeURIComponent(editing.name)}`, {
        title: editing.title,
        description: editing.description,
      });
      const updated = res.data?.file;
      if (updated) {
        setFiles((prev) => prev.map((f) => (f.name === updated.name ? { ...f, ...updated } : f)));
      }
      setEditing(null);
      toast('Saved', 'success');
    } catch {
      toast('Failed to save', 'error');
    }
  };

  const onDelete = async (item) => {
    if (!window.confirm(`Remove "${item.title || item.name}" from the gallery?`)) return;
    try {
      await api.delete(`/gallery/admin/${encodeURIComponent(item.name)}`);
      setFiles((prev) => prev.filter((f) => f.name !== item.name));
      toast('Removed', 'success');
    } catch {
      setError('Failed to remove image.');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h3 className="mb-1">Gallery Manager</h3>
          <p className="text-muted small mb-0">Upload photos or use built-in fleet images from Assets. Changes appear on the public Gallery page.</p>
        </div>
        <button type="button" className="btn btn-outline-primary" onClick={seedAssets} disabled={seeding}>
          {seeding ? 'Loading…' : 'Load default fleet images'}
        </button>
      </div>

      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">Upload new image</h5>
          <form className="row g-3 align-items-end" onSubmit={onUpload}>
            <div className="col-md-4">
              <label className="form-label">Caption</label>
              <input
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AC sleeper interior"
              />
            </div>
            <div className="col-md-5">
              <label className="form-label">Image file</label>
              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-accent w-100" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload image'}
              </button>
            </div>
          </form>
          {error && <div className="alert alert-warning mt-3 mb-0 py-2 small">{error}</div>}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">Gallery ({files.length})</h5>
            {loading && <span className="badge bg-secondary">Loading…</span>}
          </div>

          {!loading && files.length === 0 && (
            <div className="text-center py-5 text-muted">
              <p className="mb-2">No images yet.</p>
              <button type="button" className="btn btn-accent btn-sm" onClick={seedAssets}>Load default fleet images</button>
            </div>
          )}

          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-2">
            {files.map((f) => (
              <div className="col" key={f.name}>
                <figure className="gallery-card mb-0 h-100 d-flex flex-column">
                  <div className="gallery-card-img">
                    <img
                      src={resolveMediaUrl(f)}
                      alt={f.title || f.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = '/assets/Sameer1.jpg'; }}
                    />
                  </div>
                  <figcaption className="gallery-card-caption px-2 pt-1 pb-0" title={f.title}>
                    {f.title || f.name}
                  </figcaption>
                  <div className="px-2 pb-2 mt-auto d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary py-0 px-2"
                      onClick={() => setEditing({ name: f.name, title: f.title || '', description: f.description || '' })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger py-0 px-2"
                      onClick={() => onDelete(f)}
                    >
                      Remove
                    </button>
                  </div>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,.45)', zIndex: 1060 }}>
          <div className="bg-white rounded-3 p-4 shadow" style={{ width: 'min(92vw, 420px)' }}>
            <h5 className="mb-3">Edit caption</h5>
            <label className="form-label">Title</label>
            <input className="form-control mb-2" value={editing.title} onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))} />
            <label className="form-label">Description (optional)</label>
            <textarea className="form-control mb-3" rows={2} value={editing.description} onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))} />
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="btn btn-accent" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
