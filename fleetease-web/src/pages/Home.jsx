import React from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { FaQuoteLeft, FaUserCircle, FaStar } from 'react-icons/fa';
import { Carousel } from 'react-bootstrap';
import { loadGoogleMapsPlaces } from '../utils/loadGoogleMaps';

export default function Home(){
  const nav = useNavigate();
  const [source, setSource] = React.useState('Patna');
  const [destination, setDestination] = React.useState('Purnea');
  const [tripType, setTripType] = React.useState('oneway');
  const [dateOut, setDateOut] = React.useState('');
  const [dateBack, setDateBack] = React.useState('');
  const [latest, setLatest] = React.useState([]);
  const [places, setPlaces] = React.useState({ sources:[], destinations:[] });
  const [mapsReady, setMapsReady] = React.useState(!!(typeof window!=='undefined' && window.google && window.google.maps && window.google.maps.places));
  const acRefs = React.useRef({});

  const setupAutocomplete = (key)=> (el)=>{
    if (!el) return;
    if (acRefs.current[key]) return;
    if (!(window.google && window.google.maps && window.google.maps.places)) return;
    const ac = new window.google.maps.places.Autocomplete(el, { types: ['(cities)'] });
    ac.addListener('place_changed', ()=>{
      const p = ac.getPlace();
      const name = p.formatted_address || p.name || el.value;
      if (key==='source') setSource(name);
      else setDestination(name);
    });
    acRefs.current[key] = ac;
  };

  React.useEffect(()=>{
    // If logged in, redirect to role-specific landing instead of Home
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role) {
      if (role==='admin') { nav('/admin/dashboard', { replace: true }); return; }
      if (role==='agent') { nav('/agent/trips', { replace: true }); return; }
      if (role==='driver') { nav('/driver/dashboard', { replace: true }); return; }
      if (role==='manager') { nav('/manager/fleet', { replace: true }); return; }
      if (role==='company_admin') { nav('/company/charter', { replace: true }); return; }
      if (role==='customer') { nav('/my-bookings', { replace: true }); return; }
    }
    api.get('/testimonials').then(r=> {
      const list = Array.isArray(r.data) ? r.data : [];
      setLatest(list.slice(0, 3));
    }).catch(()=> setLatest([]));
    // Load routes to populate dropdowns
    api.get('/trips')
      .then(r=> Array.isArray(r.data) ? r.data : [])
      .then(list=>{
        const src = Array.from(new Set(list.map(x=> x.source))).sort();
        const dst = Array.from(new Set(list.map(x=> x.destination))).sort();
        setPlaces({ sources: src, destinations: dst });
        if (src.length && !source) setSource(src[0]);
        if (dst.length && !destination) setDestination(dst[0]);
      })
      .catch(()=> setPlaces({ sources:[], destinations:[] }));
    // Preload Google Places and enable autocomplete
    (async()=>{
      try{ await loadGoogleMapsPlaces(); setMapsReady(true); }catch{ setMapsReady(false); }
    })();
  },[]);

  const submit = (e)=>{
    e.preventDefault();
    const params = new URLSearchParams({ source, destination, tripType, dateOut, dateBack }).toString();
    nav(`/search?${params}`);
  };
  return (
    <div>
      <section className="hero" style={{
        background:'linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #f8fbff 100%)'
      }}>
        <div className="container py-4 py-md-5">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <div className="p-3 p-md-4 rounded-4 shadow-sm" style={{background:'rgba(255,255,255,0.96)', border:'1px solid rgba(0,0,0,0.06)'}}>
                <div className="text-uppercase small" style={{color:'#6b7280'}}>Fleetease</div>
                <h1 className="display-6 fw-bold mb-2" style={{color:'#111827', textShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>India's trusted intercity bus service</h1>
                <p className="lead mb-3" style={{color:'#374151'}}>Your trusted booking partner — fast, reliable, and comfortable journeys.</p>
              </div>
              <div className="p-2 p-md-3 bg-white rounded-4 shadow-sm" style={{border:'1px solid rgba(0,0,0,0.06)', boxShadow:'0 8px 18px rgba(0,0,0,0.06)'}}>
                <div className="d-flex mb-2">
                  <button type="button" className={`btn btn-sm me-2 ${tripType==='oneway'?'btn-accent':'btn-light'}`} onClick={()=>setTripType('oneway')}>Oneway</button>
                  <button type="button" className={`btn btn-sm ${tripType==='return'?'btn-accent':'btn-light'}`} onClick={()=>setTripType('return')}>Return</button>
                </div>
                <form onSubmit={submit} className="row g-1 align-items-center">
                  <div className="col-12 col-md-2">
                    {mapsReady ? (
                      <input ref={setupAutocomplete('source')} className="form-control form-control-sm" placeholder="Source city" value={source} onChange={e=>setSource(e.target.value)} />
                    ) : (
                      <select className="form-select form-select-sm" value={source} onChange={e=>setSource(e.target.value)}>
                        <option value="" disabled>Select source</option>
                        {places.sources.map(s=> <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="col-12 col-md-2">
                    {mapsReady ? (
                      <input ref={setupAutocomplete('destination')} className="form-control form-control-sm" placeholder="Destination city" value={destination} onChange={e=>setDestination(e.target.value)} />
                    ) : (
                      <select className="form-select form-select-sm" value={destination} onChange={e=>setDestination(e.target.value)}>
                        <option value="" disabled>Select destination</option>
                        {places.destinations.map(d=> <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="col-6 col-md-2"><input type="date" className="form-control form-control-sm" value={dateOut} onChange={e=>setDateOut(e.target.value)} placeholder="Depart"/></div>
                  {tripType==='return' && (
                    <div className="col-6 col-md-2"><input type="date" className="form-control form-control-sm" value={dateBack} onChange={e=>setDateBack(e.target.value)} placeholder="Return"/></div>
                  )}
                  <div className="col-6 col-md-2">
                    <select className="form-select form-select-sm" value={tripType} onChange={e=>setTripType(e.target.value)}>
                      <option value="oneway">One-way</option>
                      <option value="return">Return</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-2 d-grid"><button className="btn btn-accent btn-sm">Search</button></div>
                </form>
              </div>
              <div className="mt-2 small">
                <Link to="/search" className="text-decoration-none" style={{color:'#2563eb'}}>Browse all routes</Link>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="position-relative p-3 rounded-4" style={{background:'#fff', boxShadow:'0 10px 25px rgba(0,0,0,0.06)'}}>
                <div className="badge bg-light text-dark position-absolute" style={{top:10,right:10}}>Special Offer</div>
                <div style={{borderRadius:16, overflow:'hidden', position:'relative'}}>
                  <img
                    src="/assets/Sameer1.jpg"
                    alt="Fleetease reference"
                    onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='/assets/sameer1.svg'; }}
                    style={{width:'100%', height:'auto', display:'block'}}
                  />
                  <div style={{position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 60%)'}} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="container py-4">
        <div className="border-top" style={{borderColor:'rgba(0,0,0,0.08)'}}></div>
        <div className="d-flex align-items-center justify-content-between mb-2 mt-3">
          <h3 className="mb-0">Testimonials</h3>
          <Link to="/testimonials" className="btn btn-outline-secondary btn-sm">See all</Link>
        </div>
        {latest.length===0 ? (
          <p className="text-muted">No testimonials yet. Be the first to post.</p>
        ) : (
          <Carousel interval={5000} indicators={true} controls={true} className="mt-2">
            {Array.from({ length: Math.ceil(latest.length/3) }).map((_,slideIdx)=>{
              const slice = latest.slice(slideIdx*3, slideIdx*3+3);
              return (
                <Carousel.Item key={slideIdx}>
                  <div className="row g-3">
                    {slice.map(t=> (
                      <div key={t.id} className="col-md-4">
                        <div className="card h-100 border-0 shadow-sm rounded-3">
                          <div className="p-3">
                            <div className="d-flex align-items-center mb-2">
                              <FaUserCircle size={28} className="me-2 text-secondary" />
                              <div>
                                <div className="fw-semibold">{t.name}</div>
                                <div className="text-muted small">{new Date(t.created_at||Date.now()).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div className="text-warning mb-2">
                              {Array.from({ length: 5 }).map((_,i)=> (
                                <FaStar key={i} size={14} className={i < (t.rating||0) ? '' : 'text-secondary'} />
                              ))}
                            </div>
                            <div className="d-flex">
                              <FaQuoteLeft size={16} className="text-secondary me-2 mt-1" />
                              <div className="small">{t.comment}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Carousel.Item>
              );
            })}
          </Carousel>
        )}
      </div>
    </div>
  );
}
