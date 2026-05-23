import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { API_URL } from '../../config/env';

export default function BookingsList(){
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all'); // all | online | offline
  const [timeFilter, setTimeFilter] = React.useState('all'); // all | upcoming | past
  const [schedMap, setSchedMap] = React.useState({});
  const [modal, setModal] = React.useState({ open:false, item:null, working:false, result:null });
  const nav = useNavigate();
  const location = useLocation();

  const run = React.useCallback(async ()=>{
      try{
        setLoading(true);
        const [onlineRes, offlineRes] = await Promise.all([
          api.get('/bookings'),
          api.get('/admin/offline-bookings')
        ]);
        const onlineBase = Array.isArray(onlineRes.data) ? onlineRes.data : [];
        const offlineBase = Array.isArray(offlineRes.data) ? offlineRes.data : [];
        // fetch seats per booking for online
        const onlineWithSeats = await Promise.all(onlineBase.map(async b=>{
          try{ const s = await api.get(`/bookings/${b.booking_id}/seats`); return { ...b, seats: s.data||[], _type:'online' }; }
          catch{ return { ...b, seats: [], _type:'online' }; }
        }));
        // map offline seats
        const offlineItems = offlineBase.map(ob=> ({
          booking_id: `OB-${ob.id}`,
          vehicle_id: ob.schedule_id || '-',
          route_id: ob.route_id || '-',
          pickup_location: '—',
          drop_location: '—',
          fare: ob.amount,
          seats: String(ob.seats||'').split(',').filter(Boolean).map((lab,i)=> ({ id:`ob${ob.id}-${i}`, seat_label: lab, passenger_name: ob.customer_name })),
          _type: 'offline',
          created_at: ob.created_at
        }));
        // merge & sort by created_at/booking_id desc
        const merged = [...onlineWithSeats, ...offlineItems].sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
        setItems(merged);
        // fetch schedules for time classification
        const ids = Array.from(new Set(merged.map(b=> b.schedule_id).filter(Boolean)));
        const entries = await Promise.all(ids.map(async id=>{
          try{ const r = await api.get(`/schedules/${id}`); return [id, r.data]; }catch{ return [id, null]; }
        }));
        setSchedMap(Object.fromEntries(entries));
      } catch {
        setItems([]);
        setSchedMap({});
      } finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    const t = localStorage.getItem('token');
    let role = null;
    try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch {}
    if (role !== 'admin') { nav('/'); return; }
    run();
  }, [nav, location, run]);

  const openCancel = (it)=> setModal({ open:true, item: it, working:false, result:null });
  const doCancel = async()=>{
    if (!modal.item) return;
    setModal(m=> ({ ...m, working:true }));
    try{
      if (modal.item._type === 'online'){
        const r = await api.post(`/bookings/${modal.item.booking_id}/cancel`, { reason: 'Admin requested' });
        setModal(m=> ({ ...m, result: r.data || { ok:true }, working:false }));
      } else {
        const id = String(modal.item.booking_id||'').replace('OB-','');
        const r = await api.post(`/admin/offline-bookings/${id}/cancel`, { reason: 'Admin requested' });
        setModal(m=> ({ ...m, result: r.data || { ok:true }, working:false }));
      }
      // refresh
      const [onlineRes, offlineRes] = await Promise.all([
        api.get('/bookings'),
        api.get('/admin/offline-bookings')
      ]);
      const onlineBase = Array.isArray(onlineRes.data) ? onlineRes.data : [];
      const offlineBase = Array.isArray(offlineRes.data) ? offlineRes.data : [];
      const onlineWithSeats = await Promise.all(onlineBase.map(async b=>{
        try{ const s = await api.get(`/bookings/${b.booking_id}/seats`); return { ...b, seats: s.data||[], _type:'online' }; }
        catch{ return { ...b, seats: [], _type:'online' }; }
      }));
      const offlineItems = offlineBase.map(ob=> ({
        booking_id: `OB-${ob.id}`,
        vehicle_id: ob.schedule_id || '-', route_id: ob.route_id || '-', pickup_location:'—', drop_location:'—',
        fare: ob.amount,
        seats: String(ob.seats||'').split(',').filter(Boolean).map((lab,i)=> ({ id:`ob${ob.id}-${i}`, seat_label: lab, passenger_name: ob.customer_name })),
        _type:'offline', created_at: ob.created_at
      }));
      const merged = [...onlineWithSeats, ...offlineItems].sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
      setItems(merged);
    }catch{
      alert('Failed to cancel booking');
      setModal(m=> ({ ...m, working:false }));
    }
  };

  const classify = (b)=>{
    const sc = b.schedule_id ? schedMap[b.schedule_id] : null;
    const dep = sc?.departure ? new Date(sc.departure) : null;
    const arr = sc?.arrival ? new Date(sc.arrival) : null;
    const status = sc?.status || b.status || '';
    const now = new Date();
    const isPast = (
      (arr && now > arr) ||
      (!arr && dep && now > new Date(dep.getTime() + 6*60*60*1000)) ||
      ['arrived','completed','cancelled'].includes(String(status))
    );
    return isPast ? 'past' : 'upcoming';
  };
  if (loading) return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="skeleton skeleton-line" style={{ width: 260, height: 24 }}></div>
        <div className="d-flex gap-2">
          <div className="skeleton skeleton-line" style={{ width: 200, height: 32 }}></div>
          <div className="skeleton skeleton-line" style={{ width: 240, height: 32 }}></div>
        </div>
      </div>
      <div className="card p-3">
        <div className="skeleton skeleton-line mb-3" style={{ width: '35%' }}></div>
        <div className="table-responsive">
          <table className="table table-sm align-middle admin-table">
            <thead>
              <tr>
                <th>ID</th><th>Vehicle</th><th>Route</th><th>Pickup/Drop</th><th>Fare</th><th>Seats / Passengers</th><th>Invoice</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({length:8}).map((_,i)=> (
                <tr key={i}>
                  <td><div className="skeleton skeleton-line" style={{ width: 120 }} /></td>
                  <td><div className="skeleton skeleton-line" style={{ width: 100 }} /></td>
                  <td><div className="skeleton skeleton-line" style={{ width: 140 }} /></td>
                  <td><div className="skeleton skeleton-line" style={{ width: 160 }} /></td>
                  <td><div className="skeleton skeleton-line" style={{ width: 60 }} /></td>
                  <td><div className="skeleton skeleton-line" style={{ width: 180 }} /></td>
                  <td><div className="skeleton skeleton-line" style={{ width: 100 }} /></td>
                  <td><div className="skeleton skeleton-line" style={{ width: 80 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  const base = items.filter(it=> filter==='all' ? true : it._type===filter);
  const view = base.filter(it=> timeFilter==='all' ? true : classify(it)===timeFilter);
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Admin — Bookings</h3>
        <div className="d-flex gap-2">
          <div className="btn-group">
            <button className={`btn btn-sm ${filter==='all'?'btn-accent':'btn-outline-secondary'}`} onClick={()=>setFilter('all')}>All</button>
            <button className={`btn btn-sm ${filter==='online'?'btn-accent':'btn-outline-secondary'}`} onClick={()=>setFilter('online')}>Online</button>
            <button className={`btn btn-sm ${filter==='offline'?'btn-accent':'btn-outline-secondary'}`} onClick={()=>setFilter('offline')}>Offline</button>
          </div>
          <div className="btn-group">
            <button className={`btn btn-sm ${timeFilter==='all'?'btn-accent':'btn-outline-secondary'}`} onClick={()=>setTimeFilter('all')}>All Time</button>
            <button className={`btn btn-sm ${timeFilter==='upcoming'?'btn-accent':'btn-outline-secondary'}`} onClick={()=>setTimeFilter('upcoming')}>Upcoming</button>
            <button className={`btn btn-sm ${timeFilter==='past'?'btn-accent':'btn-outline-secondary'}`} onClick={()=>setTimeFilter('past')}>Past</button>
          </div>
        </div>
      </div>
      {view.length===0 && <div className="text-muted">No bookings yet.</div>}
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Pickup/Drop</th>
              <th>Fare</th>
              <th>Seats / Passengers</th>
              <th>Invoice</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {view.map(b=> (
              <tr key={b.booking_id}>
                <td>#{b.booking_id} {b._type && (<span className={`badge ms-1 ${b._type==='offline'?'bg-secondary':'bg-primary'}`}>{b._type}</span>)}</td>
                <td>{b.vehicle_id || '-'}</td>
                <td>{b.route_id || '-'}</td>
                <td>
                  <div className="small">{b.pickup_location} → {b.drop_location}</div>
                </td>
                <td>₹{b.fare}</td>
                <td>
                  {b.seats?.length ? (
                    <ul className="mb-0">
                      {b.seats.map(s=> (
                        <li key={s.id} className="small">{s.seat_label}: {s.passenger_name || '—'}{s.passenger_age ? `, ${s.passenger_age}`:''}{s.passenger_gender?`, ${s.passenger_gender}`:''}</li>
                      ))}
                    </ul>
                  ): <span className="text-muted">—</span>}
                </td>
                <td>
                  {b._type==='online' ? (
                    <>
                      <a className="btn btn-outline-secondary btn-sm me-2" href={`${API_URL}/invoices/${b.booking_id}`} target="_blank" rel="noreferrer">JSON</a>
                      <a className="btn btn-accent btn-sm" href={`${API_URL}/invoices/${b.booking_id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                    </>
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </td>
                <td>
                  <div className="btn-group btn-group-sm">
                    {b._type==='online' && (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={()=> nav(`/booking/${b.booking_id}`)}
                      >
                        View
                      </button>
                    )}
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={()=>openCancel(b)}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{background:'rgba(0,0,0,0.5)', zIndex:1050}} onClick={()=> setModal({ open:false, item:null, working:false, result:null })}>
          <div className="position-absolute top-50 start-50 translate-middle bg-white p-3 rounded-3" style={{width:'min(90vw, 600px)'}} onClick={(e)=>e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="fw-semibold">Cancel Booking #{modal.item?.booking_id}</div>
              <button className="btn btn-sm btn-outline-secondary" onClick={()=> setModal({ open:false, item:null, working:false, result:null })}>Close</button>
            </div>
            <div className="small text-muted mb-2">Policy: &gt;24h → 100% − ₹25, 12–24h → 50% − ₹25, &lt;12h → 0%. Operator-cancelled trips are 100% refunded.</div>
            {modal.result ? (
              <div className="alert alert-success">Cancelled. Refund: ₹{modal.result.refund ?? '—'}.</div>
            ) : (
              <div className="d-flex justify-content-end">
                <button className="btn btn-danger" disabled={modal.working} onClick={doCancel}>{modal.working? 'Cancelling…' : 'Confirm Cancel'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
