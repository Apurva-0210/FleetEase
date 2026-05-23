import React from 'react';
import api from '../../utils/api';
import { GOOGLE_MAPS_API_KEY } from '../../config/env';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../../components/Toast';

export default function CompanyCharter(){
  const nav = useNavigate();
  const location = useLocation();
  const [tripType, setTripType] = React.useState('oneway');
  const [busType, setBusType] = React.useState('2x2');
  const [passengers, setPassengers] = React.useState('40');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [travelDays, setTravelDays] = React.useState(1);
  const [legs, setLegs] = React.useState([{ from:'', to:'', distance_km:'' }]);
  const [quote, setQuote] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const mapsReadyRef = React.useRef(false);
  const [mapsReady, setMapsReady] = React.useState(!!(typeof window!=='undefined' && window.google && window.google.maps && window.google.maps.places));
  const placesRefs = React.useRef({});

  // Load Google Maps JS API with Places if key provided
  React.useEffect(()=>{
    if (window.google && window.google.maps && window.google.maps.places){ mapsReadyRef.current = true; setMapsReady(true); return; }
    const key = GOOGLE_MAPS_API_KEY;
    if (!key) return; // no key => graceful fallback
    const id = 'gmaps-js';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    s.async = true; s.defer = true;
    s.onload = ()=> { mapsReadyRef.current = true; setMapsReady(true); };
    document.body.appendChild(s);
  },[]);

  const setupAutocomplete = (idx, type)=> (el)=>{
    if (!el) return;
    const k = `${idx}-${type}`;
    if (placesRefs.current[k]) return;
    if (!(window.google && window.google.maps && window.google.maps.places)) return;
    const ac = new window.google.maps.places.Autocomplete(el, { types: ['(cities)'] });
    ac.addListener('place_changed', ()=>{
      const p = ac.getPlace();
      const name = p.formatted_address || p.name || el.value;
      setLeg(idx, type, name);
      // compute distance if both ends present
      setTimeout(()=> computeDistance(idx), 0);
    });
    placesRefs.current[k] = ac;
  };

  const computeDistance = async (idx)=>{
    try{
      const l = legs[idx];
      if (!l?.from || !l?.to) return;
      if (!(window.google && window.google.maps)){ return; }
      const svc = new window.google.maps.DistanceMatrixService();
      svc.getDistanceMatrix({
        origins: [l.from],
        destinations: [l.to],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      }, (res, status)=>{
        if (status !== 'OK') return;
        const row = res?.rows?.[0]?.elements?.[0];
        const meters = row?.distance?.value || 0;
        const km = (meters/1000).toFixed(1);
        setLeg(idx,'distance_km', km);
      });
    }catch{}
  };

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'company_admin') { nav('/'); }
  },[nav]);

  const updateQuote = async()=>{
    try{
      setLoading(true);
      const payload = { itinerary: legs.map(l=> ({ from:l.from, to:l.to, distance_km:Number(l.distance_km||0) })), trip_type:tripType, bus_type:busType, travel_days:Number(travelDays||1) };
      const r = await api.post('/corp-bookings/quote', payload);
      setQuote(r.data);
    }catch{ setQuote(null);} finally{ setLoading(false); }
  };

  React.useEffect(()=>{ updateQuote(); },[tripType,busType,travelDays, legs]);

  const addLeg = ()=> setLegs(ls=> [...ls, { from:'', to:'', distance_km:'' }]);
  const setLeg = (i, key, val)=> setLegs(ls=> ls.map((l,idx)=> idx===i? { ...l, [key]: val } : l));
  const removeLeg = (i)=> setLegs(ls=> ls.filter((_,idx)=> idx!==i));

  const submit = async(e)=>{
    e.preventDefault(); setLoading(true);
    try{
      const payload = {
        itinerary: legs.map(l=> ({ from:l.from, to:l.to, distance_km:Number(l.distance_km||0) })),
        trip_type: tripType,
        bus_type: busType,
        passengers_count: Number(passengers||0),
        start_date: startDate || null,
        end_date: endDate || null,
        travel_days: Number(travelDays||1)
      };
      const r = await api.post('/corp-bookings', payload);
      toast('Request submitted for approval','success');
      nav('/company/charter/requests');
    }catch{ toast('Failed to submit','error'); }
    finally{ setLoading(false); }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Company — Charter Bus Request</h3>
        <button className="btn btn-outline-secondary" onClick={()=> nav('/company/charter/requests')}>My Requests</button>
      </div>
      <form onSubmit={submit} className="row g-3">
        <div className="col-md-3">
          <label className="form-label">Trip type</label>
          <select className="form-select" value={tripType} onChange={e=>setTripType(e.target.value)}>
            <option value="oneway">One way</option>
            <option value="return">Return</option>
            <option value="multi">Multi-leg</option>
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Bus type</label>
          <select className="form-select" value={busType} onChange={e=>setBusType(e.target.value)}>
            <option value="2x2">2x2</option>
            <option value="2x1_sleeper">2x1 Sleeper</option>
            <option value="luxury">Luxury</option>
            <option value="mini">Mini</option>
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label">Passengers</label>
          <input className="form-control" type="number" min="1" value={passengers} onChange={e=>setPassengers(e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Travel days</label>
          <input className="form-control" type="number" min="1" value={travelDays} onChange={e=>setTravelDays(e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Start date</label>
          <input className="form-control" type="date" min={new Date().toISOString().slice(0,10)} value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label">End date</label>
          <input className="form-control" type="date" min={(startDate||new Date().toISOString().slice(0,10))} value={endDate} onChange={e=>setEndDate(e.target.value)} />
        </div>
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <label className="form-label mb-0">Itinerary legs</label>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addLeg}>Add leg</button>
          </div>
          <div className="table-responsive">
            <table className="table table-sm align-middle admin-table">
              <thead><tr><th>#</th><th>From</th><th>To</th><th>Distance (km)</th><th>Action</th></tr></thead>
              <tbody>
                {legs.map((l,idx)=> (
                  <tr key={idx}>
                    <td>{idx+1}</td>
                    <td>
                      <input ref={setupAutocomplete(idx,'from')} className="form-control form-control-sm" placeholder="Source city" value={l.from} onChange={e=>setLeg(idx,'from',e.target.value)} onBlur={()=>computeDistance(idx)} />
                    </td>
                    <td>
                      <input ref={setupAutocomplete(idx,'to')} className="form-control form-control-sm" placeholder="Destination city" value={l.to} onChange={e=>setLeg(idx,'to',e.target.value)} onBlur={()=>computeDistance(idx)} />
                    </td>
                    <td style={{width:160}}>
                      <div className="input-group input-group-sm">
                        <input className="form-control" type="number" min="0" value={l.distance_km} onChange={e=>setLeg(idx,'distance_km',e.target.value)} />
                        <button type="button" className="btn btn-outline-secondary" onClick={()=>computeDistance(idx)} disabled={!mapsReady || !(l.from&&l.to)}>
                          Auto
                        </button>
                      </div>
                      {!mapsReady && (
                        <div className="form-text">Enable Google Maps key to auto-calculate distance</div>
                      )}
                    </td>
                    <td><button type="button" className="btn btn-outline-danger btn-sm" onClick={()=>removeLeg(idx)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-md-5">
          <div className="card p-3">
            <div className="fw-semibold mb-2">Fare estimate</div>
            {!quote ? (
              <div className="text-muted small">{loading? 'Calculating…' : 'Add itinerary and details to see estimate.'}</div>
            ) : (
              <>
                <div className="small text-muted mb-2">Total KM: {quote.total_km}</div>
                <ul className="mb-2 small">
                  <li>Base per day: ₹{quote.breakdown.base_per_day}</li>
                  <li>Per km: ₹{quote.breakdown.per_km}</li>
                  <li>Driver/day: ₹{quote.breakdown.driver_allowance_per_day}</li>
                  <li>Permit/day: ₹{quote.breakdown.permit_per_day}</li>
                  {quote.breakdown.return_discount_pct? <li>Return discount: {quote.breakdown.return_discount_pct}%</li> : null}
                </ul>
                <div className="d-flex justify-content-between"><span>Subtotal</span><span>₹{quote.breakdown.subtotal}</span></div>
                <div className="d-flex justify-content-between"><span>Taxes</span><span>₹{quote.breakdown.taxes}</span></div>
                <div className="d-flex justify-content-between fw-bold border-top pt-2"><span>Total</span><span>₹{quote.total}</span></div>
              </>
            )}
          </div>
        </div>
        <div className="col-md-7 d-flex align-items-end justify-content-end">
          <button className="btn btn-accent" disabled={loading}>Submit for approval</button>
        </div>
      </form>
    </div>
  );
}
