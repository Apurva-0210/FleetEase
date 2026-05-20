import React from 'react';
import api from '../utils/api';
import { resolveMediaUrl, DEFAULT_GALLERY } from '../utils/mediaUrl';

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-size="14">Image unavailable</text></svg>'
);

export default function Gallery() {
  const [files, setFiles] = React.useState(DEFAULT_GALLERY);
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    api.get('/gallery')
      .then((r) => {
        const arr = Array.isArray(r.data?.files) ? r.data.files : [];
        if (arr.length) {
          setFiles(arr.map((x) => ({
            name: x.name,
            title: x.title || x.name,
            description: x.description || '',
            url: x.url,
            source: x.source,
          })));
          setNote('');
        } else {
          setFiles(DEFAULT_GALLERY);
        }
      })
      .catch(() => {
        setFiles(DEFAULT_GALLERY);
        setNote('Using offline gallery images. Start the backend for live updates.');
      });
  }, []);

  return (
    <div className="container py-4">
      <h3 className="mb-3">Gallery</h3>
      {note && <p className="text-muted small">{note}</p>}
      <div className="masonry">
        {files.map((item) => (
          <div key={item.name} className="masonry-item">
            <div className="card">
              <div style={{ width: '100%', overflow: 'hidden', background: '#f1f5f9', borderRadius: 8 }}>
                <img
                  src={resolveMediaUrl(item)}
                  alt={item.title}
                  style={{ width: '100%', height: 'auto', display: 'block', minHeight: 120 }}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }}
                />
              </div>
              <div className="card-body p-2">
                <div className="small fw-semibold">{item.title}</div>
                {item.description && <div className="small text-muted">{item.description}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
