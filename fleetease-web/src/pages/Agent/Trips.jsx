import React from 'react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import SeatMap from '../../components/SeatMap';
import { socket } from '../../utils/socket';

export default function AgentTrips(){
  const nav = useNavigate();
  const [form, setForm] = React.useState({ customer_name:'', customer_phone:'', route_id:'', schedule_id:'', seats:'', amount:'', payment_method:'cash' });
  const [showQR, setShowQR] = React.useState(false);
  const [cities, setCities] = React.useState({ sources: [], destinations: [] });
  const [source, setSource] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [dateOut, setDateOut] = React.useState('');
  const [schedules, setSchedules] = React.useState([]);
  const [taken, setTaken] = React.useState([]);
  const [receipt, setReceipt] = React.useState(null);
  const [selected, setSelected] = React.useState([]);
  const [layoutType, setLayoutType] = React.useState('2x2');
  const [upperDeck, setUpperDeck] = React.useState(false);
  const [autoAmount, setAutoAmount] = React.useState('');
  const [perSeatFare, setPerSeatFare] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'agent') { nav('/'); return; }
    (async()=>{ try { await api.post('/agent/ensure'); } catch{} })();
    api.get('/routes/cities')
      .then(r=> setCities({
        sources: Array.isArray(r.data?.sources)? r.data.sources : [],
        destinations: Array.isArray(r.data?.destinations)? r.data.destinations : []
      }))
      .catch(()=> setCities({ sources: [], destinations: [] }));
  },[nav]);

  // Load schedules when search criteria ready
  React.useEffect(()=>{
    if (!source || !destination || !dateOut) { setSchedules([]); return; }
    const qs = new URLSearchParams({ source, destination, date: dateOut });
    api.get(`/schedules?${qs.toString()}`)
      .then(r=> setSchedules(Array.isArray(r.data)? r.data : []))
      .catch(()=> setSchedules([]));
  },[source, destination, dateOut]);

  // Fetch taken seats when schedule selected (unified online+offline)
  React.useEffect(()=>{
    if (!form.schedule_id) { setTaken([]); return; }
    const load = ()=> api.get(`/seats/${form.schedule_id}`)
      .then(r=> setTaken(Array.isArray(r.data)? r.data : []))
      .catch(()=> setTaken([]));
    load();
    socket.emit('join_schedule', form.schedule_id);
    const handler = ()=> load();
    socket.on('seats_updated', handler);
    return ()=> socket.off('seats_updated', handler);
  },[form.schedule_id]);

  // Infer seat layout when schedule selected
  React.useEffect(()=>{
    if (!form.schedule_id) { setLayoutType('2x2'); setUpperDeck(false); return; }
    const sel = schedules.find(s=> String(s.schedule_id)===String(form.schedule_id));
    const t = (sel?.seat_layout || sel?.bus_type || sel?.vehicle_type || '').toString().toLowerCase();
    let lt = '2x2';
    if (t.includes('luxury')) lt = '2x1_luxury';
    else if (t.includes('sleeper') || t.includes('2x1')) lt = '2x1_sleeper';
    setLayoutType(lt);
    setUpperDeck(lt !== '2x2');
    setSelected([]);
  },[form.schedule_id, schedules]);

  // Auto-calc amount = seats * (distance_km * fare_per_km)
  React.useEffect(()=>{
    const sel = schedules.find(s=> String(s.schedule_id)===String(form.schedule_id));
    if (!sel) { setAutoAmount(''); return; }
    const km = Number(sel.distance_km || sel.route_distance_km || 0);
    const fpk = Number(sel.fare_per_km || 0);
    const perSeat = km * fpk;
    const total = perSeat * selected.length;
    const val = isFinite(total) && total>0 ? String(Math.round(total)) : '';
    const perVal = isFinite(perSeat) && perSeat>0 ? String(Math.round(perSeat)) : '';
    setAutoAmount(val);
    setPerSeatFare(perVal);
    // If user hasn't typed a custom amount (i.e., matches auto or empty), keep it in sync
    if (!form.amount || form.amount === autoAmount) {
      setForm(f=>({...f, amount: val }));
    }
  },[form.schedule_id, selected, schedules]);

  const toggleSeat = (label)=>{
    const up = label.toUpperCase();
    const takenSet = new Set(taken.map(s=>String(s).toUpperCase()));
    if (takenSet.has(up)) return; // cannot select taken seats
    setSelected(prev=> prev.includes(label) ? prev.filter(x=>x!==label) : [...prev, label]);
  };

  const submit = async (e)=>{
    e.preventDefault();
    try{
      setSubmitting(true);
      const seatArr = selected.map(x=>x.trim()).filter(Boolean);
      const takenSet = new Set(taken.map(s=>s.toUpperCase()));
      const conflict = seatArr.find(s=> takenSet.has(s.toUpperCase()));
      if (!seatArr.length){ alert('Select at least one seat.'); return; }
      if (conflict){ alert(`Seat ${conflict} is already taken.`); return; }
      const payload = { ...form, seats: seatArr, amount: Number(form.amount) };
      await api.post('/agent/book', payload);
      setReceipt({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        route_id: form.route_id,
        schedule_id: form.schedule_id,
        seats: seatArr.join(','),
        seat_count: seatArr.length,
        per_seat: perSeatFare,
        amount: form.amount,
        payment_method: form.payment_method,
        created_at: new Date().toLocaleString()
      });
      setForm({ customer_name:'', customer_phone:'', route_id:'', schedule_id:'', seats:'', amount:'', payment_method:'cash' });
      setSelected([]);
    }catch(err){
      const msg = err?.response?.data?.error || err?.message || 'Failed to create booking';
      const det = err?.response?.data?.details ? `\n${err.response.data.details}` : '';
      alert(`${msg}${det}`);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="container py-4">
      <h3 className="mb-3">Agent Trips — Create Offline Booking</h3>
      <div className="card border-0 shadow-sm rounded-3 mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Source</label>
              <select className="form-select" value={source} onChange={e=>{ setSource(e.target.value); setDestination(''); setSchedules([]); }}>
                <option value="">Select source</option>
                {cities.sources.map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Destination</label>
              <select className="form-select" value={destination} onChange={e=>setDestination(e.target.value)} disabled={!source}>
                <option value="">Select destination</option>
                {cities.destinations.map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Journey Date</label>
              <input type="date" className="form-control" value={dateOut} onChange={e=>setDateOut(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Schedule</label>
              <select className="form-select" value={form.schedule_id} onChange={e=>{
                const sid = e.target.value;
                const sel = schedules.find(s=> String(s.schedule_id)===String(sid));
                setForm(f=>({...f, schedule_id:sid, route_id: sel?.route_id || ''}));
              }} disabled={!schedules.length}>
                <option value="">Select schedule</option>
                {schedules.map(s=> (
                  <option key={s.schedule_id} value={s.schedule_id}>{s.bus_number || s.vehicle_number || s.vehicle_id} • {new Date(s.departure).toLocaleString()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="card border-0 shadow-sm rounded-3 mb-3">
        <div className="card-body">
          <form className="row g-2" onSubmit={submit}>
            <div className="col-md-4"><input className="form-control" placeholder="Customer name" value={form.customer_name} onChange={e=>setForm(f=>({...f, customer_name:e.target.value}))} required/></div>
            <div className="col-md-4"><input className="form-control" placeholder="Customer phone" value={form.customer_phone} onChange={e=>setForm(f=>({...f, customer_phone:e.target.value}))} required/></div>
            <div className="col-md-3"><input className="form-control" placeholder="Schedule ID" value={form.schedule_id} disabled /></div>
            <div className="col-12">
              <SeatMap layoutType={layoutType} upperDeck={upperDeck} rows={10} selected={selected} onToggle={toggleSeat} disabledSeats={taken} />
              <div className="d-flex justify-content-between small text-muted">
                <div>Legend: <span className="badge bg-secondary me-1">Taken</span> <span className="badge bg-success me-1">Selected</span> <span className="badge bg-light text-dark">Available</span></div>
                <div>Per seat: ₹{perSeatFare || '—'} • Seats: {selected.length} • Total: ₹{autoAmount || '—'}</div>
              </div>
            </div>
            <div className="col-md-2">
              <input className="form-control" placeholder="Amount" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} required/>
              <div className="form-text">Auto: {autoAmount || '—'}</div>
            </div>
            <div className="col-md-2">
              <select className="form-select" value={form.payment_method} onChange={e=>setForm(f=>({...f, payment_method:e.target.value}))}>
                <option value="cash">Cash</option>
                <option value="qr">QR</option>
              </select>
            </div>
            <div className="col-md-2 d-grid">
              {form.payment_method==='qr' && (
                <button type="button" className="btn btn-outline-secondary" onClick={()=>setShowQR(true)}>Show QR</button>
              )}
            </div>
            <div className="col-md-2 d-grid"><button className="btn btn-accent" disabled={submitting || !form.schedule_id || !selected.length || !form.amount}>Create Booking</button></div>
          </form>
          <div className="d-flex justify-content-between small text-muted mt-1">
            <div>Route ID: <span className="fw-semibold">{form.route_id || '—'}</span></div>
            <div>Taken seats: {taken.length? taken.join(', ') : '—'}</div>
          </div>
        </div>
      </div>

      {showQR && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{background:'rgba(0,0,0,0.5)', zIndex:1050}} onClick={()=>setShowQR(false)}>
          <div className="position-absolute top-50 start-50 translate-middle bg-white p-3 rounded-3" style={{width:'min(90vw,420px)'}} onClick={(e)=>e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="fw-semibold">Scan to Pay</div>
              <button className="btn btn-sm btn-outline-secondary" onClick={()=>setShowQR(false)}>Close</button>
            </div>
            <div className="text-center">
              <img src="/assets/qr.png" alt="QR" onError={(e)=>{e.currentTarget.src='https://via.placeholder.com/300?text=Add+/public/assets/qr.png';}} style={{maxWidth:'100%', height:'auto'}}/>
              <div className="small text-muted mt-2">Ask customer to scan and confirm payment on their device.</div>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{background:'rgba(0,0,0,0.5)', zIndex:1050}} onClick={()=>setReceipt(null)}>
          <div className="position-absolute top-50 start-50 translate-middle bg-white p-3 rounded-3" style={{width:'min(90vw,480px)'}} onClick={(e)=>e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="fw-semibold">Offline Booking Receipt</div>
              <div>
                <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>{ const w=window.open('','_blank'); w.document.write(`<pre>${JSON.stringify(receipt,null,2)}</pre>`); w.print(); }}>Print</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={()=>setReceipt(null)}>Close</button>
              </div>
            </div>
            <div className="small">
              <div><strong>Customer:</strong> {receipt.customer_name} ({receipt.customer_phone})</div>
              <div><strong>Route ID:</strong> {receipt.route_id} • <strong>Schedule ID:</strong> {receipt.schedule_id}</div>
              <div><strong>Seats:</strong> {receipt.seats}</div>
              <div><strong>Seat Count:</strong> {receipt.seat_count} • <strong>Per seat:</strong> ₹{receipt.per_seat || '—'}</div>
              <div><strong>Amount:</strong> ₹{receipt.amount}</div>
              <div><strong>Payment:</strong> {receipt.payment_method?.toUpperCase()}</div>
              <div><strong>Time:</strong> {receipt.created_at}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
