import React from 'react';
import api from '../../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';

export default function CompanyCharterRequests(){
  const nav = useNavigate();
  const location = useLocation();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = async()=>{
    try{ setLoading(true); const r = await api.get('/corp-bookings/mine'); setRows(Array.isArray(r.data)? r.data : []);} catch{ setRows([]); } finally{ setLoading(false); }
  };

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'company_admin') { nav('/'); return; }
    refresh();
  },[nav, location]);

  if (loading) return <div className="container py-4">Loading…</div>;
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">My Charter Requests</h3>
        <button className="btn btn-accent" onClick={()=> nav('/company/charter')}>New request</button>
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle admin-table">
          <thead>
            <tr>
              <th>#</th><th>Bus type</th><th>Trip</th><th>Dates</th><th>Days</th><th>Total</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r.id}>
                <td>#{r.id}</td>
                <td>{r.bus_type}</td>
                <td>{r.trip_type}</td>
                <td className="small">{r.start_date || '—'} → {r.end_date || '—'}</td>
                <td>{r.travel_days}</td>
                <td>₹{r.estimated_total}</td>
                <td><span className={`badge ${r.status==='approved'?'bg-success': r.status==='rejected'?'bg-danger':'bg-secondary'}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
