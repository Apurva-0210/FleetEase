import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from '../../components/Toast';

export default function DriverRoutes(){
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [vehicle, setVehicle] = React.useState(null);
  const nav = useNavigate();

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'driver') { nav('/'); return; }
    (async()=>{
      try{
        setLoading(true);
        const r = await api.get('/driver/assignments');
        const list = r.data||[];
        setRows(list);
        if (!list.length){
          try{
            const v = await api.get('/driver/vehicle');
            setVehicle(v.data||null);
          }catch{/* ignore */}
        } else {
          setVehicle(null);
        }
      } finally { setLoading(false); }
    })();
  },[nav, location]);

  return (
    <div className="container py-4">
      <h3 className="mb-3">Driver — Assigned Routes</h3>
      {loading ? <div>Loading…</div> : (
        rows.length===0 ? (
          <div>
            {vehicle ? (
              <div className="card p-3 mb-3">
                <div className="fw-semibold mb-1">Assigned Vehicle</div>
                <div className="text-muted small">You are assigned to this vehicle. Upcoming schedules will appear here when created.</div>
                <div className="mt-2">
                  <div><span className="text-muted small">Vehicle</span> <div className="fw-semibold">{vehicle.vehicle_number}</div></div>
                  <div className="mt-1"><span className="text-muted small">Type</span> <div className="fw-semibold">{vehicle.type || '—'}</div></div>
                  <div className="mt-1"><span className="text-muted small">Capacity</span> <div className="fw-semibold">{vehicle.capacity ?? '—'}</div></div>
                  <div className="mt-1"><span className="text-muted small">Status</span> <div className="fw-semibold">{vehicle.status || 'available'}</div></div>
                </div>
              </div>
            ) : null}
            <div className="text-muted">No assigned routes yet.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead><tr><th>Route</th><th>Departure</th><th>Bus</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((r,i)=> (
                  <tr key={i}>
                    <td>{r.source} → {r.destination}</td>
                    <td>{r.departure ? new Date(r.departure).toLocaleString() : '—'}</td>
                    <td>{r.bus_number || r.vehicle_number}</td>
                    <td>{r.status==='boarding'? <span className="badge bg-warning text-dark">Boarding</span> : (r.status||'—')}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <a href={`/driver/seats/${r.schedule_id}`} className="btn btn-accent">View Seats</a>
                        <button className="btn btn-outline-secondary" onClick={async()=>{
                          try{ await api.post(`/schedules/${r.schedule_id}/boarding`); toast('Boarding started','success'); }
                          catch{ toast('Failed to start boarding','error'); }
                        }}>Start Boarding</button>
                      </div>
                    </td>
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
