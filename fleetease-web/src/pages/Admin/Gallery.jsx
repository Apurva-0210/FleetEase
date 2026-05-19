import React from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminGallery() {
  const location = useLocation();
  const [files, setFiles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [file, setFile] = React.useState(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/gallery/admin');
      setFiles(Array.isArray(res.data?.files) ? res.data.files : []);
    } catch (e) {
      console.error('Failed to load gallery', e);
      setError('Failed to load gallery images');
    } finally {
      setLoading(false);
    }
  }, [location]);

  React.useEffect(() => { load(); }, [load]);

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose an image file');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('image', file);
      if (title.trim()) form.append('title', title.trim());
      const res = await api.post('/gallery/admin/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.file) {
        setFiles((prev) => [...prev, res.data.file]);
        setTitle('');
        setFile(null);
        if (e.target && e.target.reset) e.target.reset();
      }
    } catch (err) {
      console.error('Upload failed', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (name) => {
    if (!window.confirm('Remove this image from gallery?')) return;
    try {
      await api.delete(`/gallery/admin/${encodeURIComponent(name)}`);
      setFiles((prev) => prev.filter((f) => f.name !== name));
    } catch (err) {
      console.error('Delete failed', err);
      setError('Failed to delete image');
    }
  };

  return (
    <div className="container py-4">
      <h3 className="mb-3">Admin  Gallery Manager</h3>

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Add New Image</h5>
          <form className="row g-2 align-items-end" onSubmit={onUpload}>
            <div className="col-md-4">
              <label className="form-label">Title (optional)</label>
              <input
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sleeper coach interior"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Image file</label>
              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-accent w-100" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
          {error && <div className="alert alert-warning mt-3 mb-0 py-2">{error}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">Gallery Images</h5>
            {loading && <span className="small text-muted">Loading...</span>}
          </div>
          {files.length === 0 && !loading && (
            <div className="text-muted">No images in gallery yet. Upload your first image above.</div>
          )}
          <div className="row g-3">
            {files.map((f) => (
              <div className="col-6 col-md-3" key={f.name}>
                <div className="card h-100 shadow-sm">
                  {f.url && (
                    <img
                      src={f.url}
                      alt={f.title || f.name}
                      className="card-img-top"
                      style={{ objectFit: 'cover', height: 140 }}
                    />
                  )}
                  <div className="card-body p-2 d-flex flex-column">
                    <div className="small fw-semibold text-truncate" title={f.title || f.name}>
                      {f.title || f.name}
                    </div>
                    <div className="small text-muted text-truncate" title={f.name}>
                      {f.name}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger mt-2 align-self-end"
                      onClick={() => onDelete(f.name)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

