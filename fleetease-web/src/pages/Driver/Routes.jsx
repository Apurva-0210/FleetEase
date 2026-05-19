import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function DriverRoutes(){
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const nav = useNavigate();

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'driver') { nav('/'); return; }
    (async()=>{
      try{
        setLoading(true);
        const r = await api.get('/driver/assignments');
        setRows(r.data||[]);
      } finally { setLoading(false); }
    })();
  },[nav]);

  return (
    <div className="container py-4">
      <h3 className="mb-3">Driver — Assigned Routes</h3>
      {loading ? <div>Loading…</div> : (
        rows.length===0 ? <div className="text-muted">No routes assigned.</div> : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead><tr><th>Route</th><th>Departure</th><th>Bus</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r,i)=> (
                  <tr key={i}>
                    <td>{r.source && r.destination ? `${r.source} → ${r.destination}` : 'No route assigned'}</td>
                    <td>{r.departure ? new Date(r.departure).toLocaleString() : '—'}</td>
                    <td>{r.bus_number || r.vehicle_number || '—'}</td>
                    <td>{r.status || 'scheduled'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
