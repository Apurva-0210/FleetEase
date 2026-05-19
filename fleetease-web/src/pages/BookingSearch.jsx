import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import ScheduleCard from '../components/ScheduleCard';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadGoogleMapsPlaces } from '../utils/loadGoogleMaps';

export default function BookingSearch(){
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState({ sources: [], destinations: [] });
  const [routes, setRoutes] = useState([]);
  const [loadErr, setLoadErr] = useState(null);
  const nav = useNavigate();
  const loc = useLocation();

  // Form state initialized from URL
  const p = new URLSearchParams(loc.search);
  const [source, setSource] = useState(p.get('source') || '');
  const [destination, setDestination] = useState(p.get('destination') || '');
  const [dateOut, setDateOut] = useState(p.get('dateOut') || '');
  const [mapsReady, setMapsReady] = useState(!!(typeof window!=='undefined' && window.google && window.google.maps && window.google.maps.places));
  const acRefs = useRef({});

  const setupAutocomplete = (key)=> (el)=>{
    if (!el) return;
    if (acRefs.current[key]) return;
    if (!(window.google && window.google.maps && window.google.maps.places)) return;
    const ac = new window.google.maps.places.Autocomplete(el, { types: ['(cities)'] });
    ac.addListener('place_changed', ()=>{
      const p = ac.getPlace();
      const name = p.formatted_address || p.name || el.value;
      if (key==='source') setSource(name); else setDestination(name);
    });
    acRefs.current[key] = ac;
  };

  useEffect(()=>{
    const p2 = new URLSearchParams(loc.search);
    const s = p2.get('source') || '';
    const d = p2.get('destination') || '';
    const dt = p2.get('dateOut') || '';
    if (!s || !d || !dt){ setSchedules([]); return; }
    const qs = new URLSearchParams({ source: s, destination: d, date: dt });
    setLoading(true);
    api.get(`/schedules?${qs.toString()}`)
      .then(r=> setSchedules(Array.isArray(r.data)? r.data : []))
      .catch(()=> setSchedules([]))
      .finally(()=> setLoading(false));
  },[loc.search]);

  // Load cities for dropdowns
  useEffect(()=>{
    (async()=>{
      setLoadErr(null);
      try{
        const [cRes, rRes] = await Promise.all([api.get('/routes/cities'), api.get('/routes')]);
        setCities({
          sources: Array.isArray(cRes.data?.sources)? cRes.data.sources : [],
          destinations: Array.isArray(cRes.data?.destinations)? cRes.data.destinations : []
        });
        setRoutes(Array.isArray(rRes.data)? rRes.data : []);
      } catch (e){
        setLoadErr('Failed to load route lists. You can still type Source and Destination.');
        setCities({ sources: [], destinations: [] });
        setRoutes([]);
      }
    })();
    (async()=>{ try{ await loadGoogleMapsPlaces(); setMapsReady(true); }catch{ setMapsReady(false); } })();
  },[]);

  // Compute destination options based on selected source
  const destOptions = React.useMemo(()=>{
    if (!cities.destinations.length) return [];
    if (!source) return [...cities.destinations].sort();
    const set = new Set(routes.filter(rt=> rt.source===source).map(rt=> rt.destination));
    return Array.from(set).sort();
  },[routes, source, cities.destinations]);

  // If current destination is not valid for selected source, clear it
  useEffect(()=>{
    if (destination && !destOptions.includes(destination)) setDestination('');
  },[source, destOptions]);

  const submit = (e)=>{
    e.preventDefault();
    const qs = new URLSearchParams({ source, destination, dateOut });
    nav(`/search?${qs.toString()}`);
  };
  const hasRoutePair = React.useMemo(()=>{
    if (!source || !destination) return false;
    return routes.some(r=> r.source===source && r.destination===destination);
  }, [routes, source, destination]);
  return (
    <div className="container py-4">
      <h3 className="mb-3">Search Buses</h3>
      {loadErr && <div className="alert alert-danger">{loadErr}</div>}
      {(cities.sources.length===0 || cities.destinations.length===0) && (
        <div className="alert alert-warning">No routes found from server. You can type Source and Destination manually.</div>
      )}
      <form className="row g-2 mb-2" onSubmit={submit}>
        <div className="col-md-4">
          {mapsReady ? (
            <input ref={setupAutocomplete('source')} className="form-control" placeholder="Source" value={source} onChange={e=>setSource(e.target.value)} />
          ) : cities.sources.length>0 ? (
            <select className="form-select" value={source} onChange={e=>setSource(e.target.value)}>
              <option value="">Select Source</option>
              {cities.sources.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input className="form-control" placeholder="Source" value={source} onChange={e=>setSource(e.target.value)} />
          )}
        </div>
        <div className="col-md-4">
          {mapsReady ? (
            <input ref={setupAutocomplete('destination')} className="form-control" placeholder="Destination" value={destination} onChange={e=>setDestination(e.target.value)} />
          ) : cities.destinations.length>0 ? (
            <select className="form-select" value={destination} onChange={e=>setDestination(e.target.value)}>
              <option value="">Select Destination</option>
              {destOptions.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input className="form-control" placeholder="Destination" value={destination} onChange={e=>setDestination(e.target.value)} />
          )}
        </div>
        <div className="col-md-3">
          <input type="date" className="form-control" value={dateOut} min={new Date().toISOString().slice(0,10)} onChange={e=>setDateOut(e.target.value)} />
        </div>
        <div className="col-md-1 d-grid">
          <button className="btn btn-accent">Search</button>
        </div>
      </form>
      <div className="text-muted small mb-3">Note: The dropdowns list all locations from the database. Buses appear below only if there are active schedules for your selected date.</div>

      <h5 className="mb-2">Available Buses</h5>
      {loading && <div>Loading…</div>}
      {!loading && schedules.length===0 && (source||destination||dateOut) && (
        <div className="text-muted">
          {source && destination && dateOut ? (
            hasRoutePair ? 'No active schedules for the selected date.' : `No route found between ${source} and ${destination}.`
          ) : 'No scheduled buses found. Try another date or route.'}
        </div>
      )}
      {!loading && schedules.map(sc=> (
        <ScheduleCard key={sc.schedule_id} schedule={sc} onSelect={(s)=>nav('/seats', { state:{ route:{ route_id:s.route_id, source:s.source, destination:s.destination, distance_km:s.distance_km, fare_per_km:s.fare_per_km, type:s.bus_type||s.vehicle_type }, schedule:s } })} />
      ))}
    </div>
  );
}
