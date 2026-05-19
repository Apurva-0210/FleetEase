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
    const defaults = ['bus1.jpg','bus2.jpg','interior1.jpg','route-map.png'];
    api.get('/gallery')
      .then(r=>{
        const arr = Array.isArray(r.data?.files) ? r.data.files : [];
        if (arr.length===0) setNote('No images configured. Use Admin → Gallery to add images.');
        const normalized = (arr.length? arr : defaults).map(x=> typeof x === 'string' ? ({ name: x, title: x }) : ({ name: x.name, title: x.title || x.name, description: x.description || '' }));
        setFiles(normalized);
      })
      .catch(()=>{ setNote('Failed to load gallery. Showing defaults.'); setFiles(defaults.map(x=>({ name:x, title:x }))); });
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
