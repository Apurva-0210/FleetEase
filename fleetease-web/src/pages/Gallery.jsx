import React from 'react';
import api from '../utils/api';

export default function Gallery(){
  const [files, setFiles] = React.useState([]);
  const [note, setNote] = React.useState('');
  const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent(`\
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="250">\
      <rect width="100%" height="100%" fill="#f2f2f2"/>\
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#888" font-family="Arial, sans-serif" font-size="16">Image not found</text>\
    </svg>`);
  React.useEffect(()=>{
    const defaults = [
      { name: 'Sameer1.jpg', title: 'Fleet coach exterior', url: '/assets/Sameer1.jpg' },
      { name: 'Sameer2.jpg', title: 'Sleeper coach interior', url: '/assets/Sameer2.jpg' },
      { name: 'Sameer3.jpg', title: 'Highway journey', url: '/assets/Sameer3.jpg' },
      { name: 'Sameer4.jpg', title: 'Comfort seating', url: '/assets/Sameer4.jpg' },
      { name: 'Sameer5.jpg', title: 'Premium AC fleet', url: '/assets/Sameer5.jpg' },
      { name: 'Sameer6.jpg', title: 'Night travel service', url: '/assets/Sameer6.jpg' },
      { name: 'Sameer7.jpg', title: 'Clean and sanitized', url: '/assets/Sameer7.jpg' },
      { name: 'Sameer8.jpg', title: 'Corporate charter bus', url: '/assets/Sameer8.jpg' },
      { name: 'sameer9.svg', title: 'Driver cabin', url: '/assets/sameer9.svg' },
      { name: 'sameer10.svg', title: 'Bus terminal', url: '/assets/sameer10.svg' },
      { name: 'sameer11.svg', title: 'Onboard amenities', url: '/assets/sameer11.svg' },
    ];
    api.get('/gallery')
      .then(r=>{
        const arr = Array.isArray(r.data?.files) ? r.data.files : [];
        const normalized = (arr.length ? arr : defaults).map(x =>
          typeof x === 'string'
            ? ({ name: x, title: x, url: `/assets/${x}` })
            : ({ name: x.name, title: x.title || x.name, description: x.description || '', url: x.url })
        );
        setFiles(normalized);
        if (!arr.length) setNote('');
      })
      .catch(()=>{
        setNote('Showing default gallery images.');
        setFiles(defaults);
      });
  },[]);

  return (
    <div className="container py-4">
      <h3 className="mb-3">Gallery</h3>
      {note && <p className="text-muted">{note}</p>}
      <div className="masonry">
        {files.map(item => (
          <div key={item.name} className="masonry-item">
            <div className="card">
              <div style={{ width:'100%', overflow:'hidden', background:'#f8f9fa', border:'1px solid rgba(0,0,0,0.1)', borderRadius:8 }}>
                <img src={item.url || `/assets/${item.name}`} alt={item.title} style={{ width:'100%', height:'auto', display:'block' }} onError={(e)=>{ e.currentTarget.src = PH; }}/>
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
