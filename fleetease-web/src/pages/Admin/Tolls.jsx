import React from 'react';
import api from '../../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminTolls(){
  const nav = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [vehicles, setVehicles] = React.useState([]);
  const [vehicleId, setVehicleId] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  const load = async ()=>{
    try{
      setLoading(true);
      const qs = new URLSearchParams({ ...(vehicleId? { vehicle_id: vehicleId } : {}), ...(from? { from } : {}), ...(to? { to } : {}) });
      const r = await api.get(`/fastag/tolls${qs.toString()?`?${qs.toString()}`:''}`);
      setItems(Array.isArray(r.data)? r.data : []);
    } finally { setLoading(false); }
  };

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'admin') { nav('/'); return; }
    (async()=>{
      try{
        setLoading(true);
        const vr = await api.get('/vehicles');
        setVehicles(Array.isArray(vr.data)? vr.data : []);
      } catch {
        setVehicles([]);
      } finally { setLoading(false); }
    })();
  },[nav, location]);

  const totalAmt = items.reduce((s,x)=> s + Number(x.amount||0), 0);
  const now = new Date();
  const isSameDay = (d)=> d && new Date(d).toDateString() === now.toDateString();
  const isSameMonth = (d)=> d && (new Date(d).getMonth()===now.getMonth() && new Date(d).getFullYear()===now.getFullYear());
  const todayAmt = items.reduce((s,x)=> s + (isSameDay(x.txn_time)? Number(x.amount||0):0), 0);
  const monthAmt = items.reduce((s,x)=> s + (isSameMonth(x.txn_time)? Number(x.amount||0):0), 0);

  const exportCSV = ()=>{
    const header = ['txn_time','vehicle','plaza_name','plaza_id','amount','issuer','tag_id','status','txn_id'];
    const rows = [header.join(',')].concat(items.map(it=>{
      const veh = it.vehicle_number || String(vehicles.find(v=>v.vehicle_id===it.vehicle_id)?.vehicle_number||'');
      const vals = [
        it.txn_time ? new Date(it.txn_time).toISOString() : '',
        veh,
        it.plaza_name||'',
        it.plaza_id||'',
        Number(it.amount||0).toFixed(2),
        it.issuer||'',
        it.tag_id||'',
        it.status||'',
        it.txn_id||''
      ];
      return vals.map(v=> `"${String(v).replaceAll('"','""')}"`).join(',');
    }));
    const blob = new Blob([rows.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tolls.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Admin — FASTag Tolls</h3>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select form-select-sm" style={{width:220}} value={vehicleId} onChange={e=>setVehicleId(e.target.value)}>
            <option value="">All vehicles</option>
            {vehicles.map(v=> <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_number} #{v.vehicle_id}</option>)}
          </select>
          <input type="datetime-local" className="form-control form-control-sm" value={from} onChange={e=>setFrom(e.target.value)} />
          <input type="datetime-local" className="form-control form-control-sm" value={to} onChange={e=>setTo(e.target.value)} />
          <button className="btn btn-sm btn-accent" onClick={load}>Apply</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card p-3"><div className="small text-muted">Today</div><div className="h5 mb-0">₹{todayAmt.toFixed(2)}</div></div>
        </div>
        <div className="col-md-3">
          <div className="card p-3"><div className="small text-muted">This Month</div><div className="h5 mb-0">₹{monthAmt.toFixed(2)}</div></div>
        </div>
        <div className="col-md-3">
          <div className="card p-3"><div className="small text-muted">Filtered Total</div><div className="h5 mb-0">₹{totalAmt.toFixed(2)}</div></div>
        </div>
        <div className="col-md-3 d-flex align-items-stretch">
          <div className="card p-3 w-100 d-flex flex-column justify-content-between">
            <div className="small text-muted">Export</div>
            <button className="btn btn-outline-secondary" onClick={exportCSV}>Download CSV</button>
          </div>
        </div>
      </div>
      {loading ? <div>Loading…</div> : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Time</th>
                <th>Vehicle</th>
                <th>Plaza</th>
                <th>Amount</th>
                <th>Issuer</th>
                <th>Tag ID</th>
                <th>Status</th>
                <th>Txn ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it=> (
                <tr key={it.id}>
                  <td className="small">{it.txn_time ? new Date(it.txn_time).toLocaleString() : '—'}</td>
                  <td>
                    <a href="/admin/vehicles" onClick={(e)=>{ e.preventDefault(); window.location.href='/admin/vehicles'; }}>
                      {it.vehicle_number || (vehicles.find(v=>v.vehicle_id===it.vehicle_id)?.vehicle_number) || `#${it.vehicle_id||'—'}`}
                    </a>
                  </td>
                  <td>
                    <div className="small fw-semibold">{it.plaza_name || '—'}</div>
                    <div className="text-muted small">{it.plaza_id || '—'}</div>
                  </td>
                  <td>₹{Number(it.amount||0).toFixed(2)}</td>
                  <td className="small">{it.issuer || '—'}</td>
                  <td className="small">{it.tag_id || '—'}</td>
                  <td><span className="badge bg-light text-dark">{it.status || 'success'}</span></td>
                  <td className="small text-muted">{it.txn_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
