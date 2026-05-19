import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SeatMap from '../components/SeatMap';
import api from '../utils/api';

export default function BookingSeat(){
  const { state } = useLocation();
  const nav = useNavigate();
  const route = state?.route;
  const schedule = state?.schedule || null;
  const [step, setStep] = useState(1); // 1 Seats, 2 Stops, 3 Passenger, 4 Review
  const [selected, setSelected] = useState([]);
  const [layoutType, setLayoutType] = useState(route?.type?.toLowerCase().includes('sleeper') ? '2x1_sleeper' : '2x2');
  const [upperDeck, setUpperDeck] = useState(layoutType!=='2x2');
  const [stops, setStops] = useState([]);
  const [boarding, setBoarding] = useState('');
  const [dropping, setDropping] = useState('');
  const [passengers, setPassengers] = useState([]);

  useEffect(()=>{
    if (!route) return;
    api.get(`/trips/${route.route_id}/stops`).then(r=>{
      setStops(r.data||[]);
      if ((r.data||[]).length){ setBoarding(r.data[0].name); setDropping(r.data[r.data.length-1].name); }
    }).catch(()=> setStops([]));
  },[route]);

  const toggle = (n)=> setSelected(s=> {
    const next = s.includes(n) ? s.filter(x=>x!==n) : [...s, n];
    // keep passengers array aligned to selected seats
    const mapped = next.map((label, i)=> passengers[i] || { name:'', age:'', gender:'', seat: label });
    setPassengers(mapped);
    return next;
  });
  const next = ()=> setStep(s=> Math.min(4, s+1));
  const prev = ()=> setStep(s=> Math.max(1, s-1));
  const proceed = ()=>{
    if (!route) return nav('/search');
    nav('/checkout', { state: { route, schedule, seats: selected, boarding, dropping, passengers } });
  };

  if (!route) return <div className="container py-4">No route selected. Go back to search.</div>;

  return (
    <div className="container py-4">
      <h3 className="mb-3">{route.source} → {route.destination}</h3>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${step===1?'active':''}`} onClick={()=>setStep(1)}>1. Select seats</button></li>
        <li className="nav-item"><button className={`nav-link ${step===2?'active':''}`} onClick={()=> selected.length? setStep(2):null}>2. Board/Drop</button></li>
        <li className="nav-item"><button className={`nav-link ${step===3?'active':''}`} onClick={()=> (selected.length&&boarding&&dropping)? setStep(3):null}>3. Passenger</button></li>
        <li className="nav-item"><button className={`nav-link ${step===4?'active':''}`} onClick={()=> (selected.length&&boarding&&dropping&&passengers.every(p=>p.name&&p.age&&p.gender))? setStep(4):null}>4. Review</button></li>
      </ul>

      {step===1 && (
        <div>
          <div className="row g-2 mb-2">
            <div className="col-auto">
              <select className="form-select" value={layoutType} onChange={e=>{ setLayoutType(e.target.value); setUpperDeck(e.target.value!=='2x2'); }}>
                <option value="2x2">2x2 Seater</option>
                <option value="2x1_sleeper">2x1 Sleeper</option>
                <option value="2x1_luxury">2x1 Luxury</option>
              </select>
            </div>
            {layoutType!=='2x2' && (
              <div className="col-auto form-check mt-2">
                <input id="ud" type="checkbox" className="form-check-input" checked={upperDeck} onChange={e=>setUpperDeck(e.target.checked)} />
                <label htmlFor="ud" className="form-check-label">Upper deck</label>
              </div>
            )}
          </div>
          <SeatMap layoutType={layoutType} upperDeck={upperDeck} rows={10} selected={selected} onToggle={toggle} />
          <div className="mt-3 d-flex justify-content-between">
            <div>Selected: {selected.join(', ') || 'none'}</div>
            <button className="btn btn-accent" disabled={!selected.length} onClick={next}>Next</button>
          </div>
        </div>
      )}

      {step===2 && (
        <div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Boarding point</label>
              <select className="form-select" value={boarding} onChange={e=>setBoarding(e.target.value)}>
                {stops.map(s=> <option key={`b-${s.stop_id}-${s.name}`} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Dropping point</label>
              <select className="form-select" value={dropping} onChange={e=>setDropping(e.target.value)}>
                {stops.map(s=> <option key={`d-${s.stop_id}-${s.name}`} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 d-flex justify-content-between">
            <button className="btn btn-outline-secondary" onClick={prev}>Back</button>
            <button className="btn btn-accent" disabled={!boarding||!dropping} onClick={next}>Next</button>
          </div>
        </div>
      )}

      {step===3 && (
        <div>
          <div className="row g-3">
            {selected.map((label, idx)=> (
              <div className="col-md-6" key={label}>
                <div className="card p-3">
                  <div className="mb-2"><strong>Seat {label}</strong></div>
                  <div className="mb-2">
                    <label className="form-label">Name</label>
                    <input className="form-control" value={passengers[idx]?.name||''} onChange={e=>{
                      const cp=[...passengers]; cp[idx]={...(cp[idx]||{}), name:e.target.value, seat:label}; setPassengers(cp);
                    }} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Age</label>
                    <input type="number" className="form-control" value={passengers[idx]?.age||''} onChange={e=>{
                      const cp=[...passengers]; cp[idx]={...(cp[idx]||{}), age:e.target.value, seat:label}; setPassengers(cp);
                    }} />
                  </div>
                  <div>
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={passengers[idx]?.gender||''} onChange={e=>{
                      const cp=[...passengers]; cp[idx]={...(cp[idx]||{}), gender:e.target.value, seat:label}; setPassengers(cp);
                    }}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 d-flex justify-content-between">
            <button className="btn btn-outline-secondary" onClick={prev}>Back</button>
            <button className="btn btn-accent" disabled={!passengers.length || !passengers.every(p=>p.name&&p.age&&p.gender)} onClick={next}>Next</button>
          </div>
        </div>
      )}

      {step===4 && (
        <div className="card p-3">
          <h5 className="mb-3">Review</h5>
          <div><strong>Route:</strong> {route.source} → {route.destination}</div>
          <div><strong>Seats:</strong> {selected.join(', ')}</div>
          <div><strong>Boarding:</strong> {boarding}</div>
          <div><strong>Dropping:</strong> {dropping}</div>
          <div className="mt-2">
            <strong>Passengers:</strong>
            <ul className="mt-1">
              {passengers.map((p,i)=> <li key={i}>{p.name} ({p.age}, {p.gender}) — Seat {p.seat}</li>)}
            </ul>
          </div>
          <div className="mt-3 d-flex justify-content-between">
            <button className="btn btn-outline-secondary" onClick={prev}>Back</button>
            <button className="btn btn-accent" onClick={proceed}>Proceed to Checkout</button>
          </div>
        </div>
      )}
    </div>
  );
}
