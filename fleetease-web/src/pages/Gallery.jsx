import React from 'react';
import api from '../utils/api';
import { resolveMediaUrl, DEFAULT_GALLERY } from '../utils/mediaUrl';

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e2e8f0"/></svg>'
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
        setNote('Showing saved fleet photos.');
      });
  }, []);

  return (
    <div className="container py-3 gallery-page">
      <div className="d-flex align-items-baseline justify-content-between mb-3">
        <h3 className="mb-0">Gallery</h3>
        <span className="text-muted small">{files.length} photos</span>
      </div>
      {note && <p className="text-muted small mb-2">{note}</p>}

      <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-2 g-md-3">
        {files.map((item) => (
          <div className="col" key={item.name}>
            <figure className="gallery-card mb-0">
              <div className="gallery-card-img">
                <img
                  src={resolveMediaUrl(item)}
                  alt={item.title}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }}
                />
              </div>
              <figcaption className="gallery-card-caption">{item.title}</figcaption>
            </figure>
          </div>
        ))}
      </div>
    </div>
  );
}
