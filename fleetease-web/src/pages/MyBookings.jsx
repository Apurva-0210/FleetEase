import React from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function MyBookings(){
  const nav = useNavigate();
  const [me, setMe] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [schedMap, setSchedMap] = React.useState({}); // { [schedule_id]: schedule }
  const [tab, setTab] = React.useState('upcoming'); // upcoming | past
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState({ open:false, booking:null, refund:null, working:false });

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    if (!t) { nav('/login'); return; }
    (async()=>{
      try{
        const [meRes, listRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/bookings')
        ]);
        setMe(meRes.data||null);
        const all = Array.isArray(listRes.data)? listRes.data : [];
        const mine = all.filter(b=> b.customer_id === meRes.data?.user_id);
        setItems(mine);
        // Fetch schedules for classification
        const ids = Array.from(new Set(mine.map(b=> b.schedule_id).filter(Boolean)));
        if (ids.length){
          const entries = await Promise.all(ids.map(async id=>{
            try{ const r = await api.get(`/schedules/${id}`); return [id, r.data]; }catch{ return [id, null]; }
          }));
          const map = Object.fromEntries(entries);
          setSchedMap(map);
        } else { setSchedMap({}); }
      }finally{ setLoading(false); }
    })();
  },[nav]);

  const openCancel = (b)=> setModal({ open:true, booking:b, refund:null, working:false });
  const doCancel = async()=>{
    if (!modal.booking) return;
    setModal(m=>({ ...m, working:true }));
    try{
      const r = await api.post(`/bookings/${modal.booking.booking_id}/cancel`, { reason:'Customer requested via My Bookings' });
      setModal(m=>({ ...m, refund: r.data?.refund ?? null, working:false }));
      // refresh list
      const listRes = await api.get('/bookings');
      const mine = (Array.isArray(listRes.data)? listRes.data : []).filter(b=> b.customer_id === me?.user_id);
      setItems(mine);
    }catch{
      alert('Failed to cancel booking');
      setModal(m=>({ ...m, working:false }));
    }
  };

  const splitBookings = React.useMemo(()=>{
    const now = new Date();
    const upcoming = [];
    const past = [];
    items.forEach(b=>{
      const sc = b.schedule_id ? schedMap[b.schedule_id] : null;
      const dep = sc?.departure ? new Date(sc.departure) : null;
      const arr = sc?.arrival ? new Date(sc.arrival) : null;
      const status = sc?.status || b.status || '';
      const isPast = (
        (arr && now > arr) ||
        (!arr && dep && now > new Date(dep.getTime() + 6*60*60*1000)) || // 6h after departure fallback
        (status==='arrived' || status==='completed' || status==='cancelled')
      );
      (isPast ? past : upcoming).push(b);
    });
    return { upcoming, past };
  },[items, schedMap]);

  if (loading) return <div className="container py-4">Loading your bookings…</div>;
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">My Bookings</h3>
      </div>
      <ul className="nav nav-tabs mb-3">
        {['upcoming','past'].map(t=> (
          <li className="nav-item" key={t}>
            <button className={`nav-link ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t==='upcoming'?'Upcoming':'Past'}{t==='upcoming'?` (${splitBookings.upcoming.length})`:` (${splitBookings.past.length})`}</button>
          </li>
        ))}
      </ul>
      {(splitBookings.upcoming.length+splitBookings.past.length)===0 ? (
        <div className="text-muted">No bookings yet.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Route</th>
                <th>Pickup → Drop</th>
                <th>Status</th>
                <th>Fare</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(tab==='upcoming'? splitBookings.upcoming : splitBookings.past).map(b=> (
                <tr key={b.booking_id}>
                  <td>#{b.booking_id}</td>
                  <td>{b.route_id || '-'}</td>
                  <td className="small">{b.pickup_location} → {b.drop_location}</td>
                  <td>{b.status || '—'}</td>
                  <td>₹{b.fare}</td>
                  <td>
                    {(tab==='upcoming' && b.status!=='cancelled') ? (
                      <button className="btn btn-outline-danger btn-sm" onClick={()=>openCancel(b)}>Cancel</button>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{background:'rgba(0,0,0,0.5)', zIndex:1050}} onClick={()=> setModal({ open:false, booking:null, refund:null, working:false })}>
          <div className="position-absolute top-50 start-50 translate-middle bg-white p-3 rounded-3" style={{width:'min(90vw, 560px)'}} onClick={(e)=>e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="fw-semibold">Cancel Booking #{modal.booking?.booking_id}</div>
              <button className="btn btn-sm btn-outline-secondary" onClick={()=> setModal({ open:false, booking:null, refund:null, working:false })}>Close</button>
            </div>
            <div className="small text-muted mb-2">Policy: &gt;24h before departure → 100% refund minus ₹25 fee. 12–24h → 50% refund minus ₹25 fee. &lt;12h → no refund. If bus is cancelled by operator, 100% refund applies.</div>
            {modal.refund==null ? (
              <div className="d-flex justify-content-end">
                <button className="btn btn-danger" disabled={modal.working} onClick={doCancel}>{modal.working? 'Cancelling…' : 'Confirm Cancel'}</button>
              </div>
            ) : (
              <div className="alert alert-success mb-0">Cancellation requested. Refund amount: ₹{modal.refund}. You will be notified once processed.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
