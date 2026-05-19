import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';

export default function Vehicles(){
  const [rows, setRows] = React.useState([]);
  const [drivers, setDrivers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const nav = useNavigate();
  const location = useLocation();

  const refresh = async ()=>{
    setLoading(true);
    try{
      const [vr, dr] = await Promise.all([ api.get('/vehicles'), api.get('/vehicles/drivers') ]);
      setRows(vr.data||[]); setDrivers(dr.data||[]);
    } finally { setLoading(false); }
  };

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'admin') { nav('/'); return; }
    refresh();
  },[nav, location]);

  const assign = async (vehicle_id, driver_user_id)=>{
    await api.put(`/vehicles/${vehicle_id}/assign`, { driver_user_id });
    await refresh();
  };

  return (
    <div className="container py-4">
      <h3 className="mb-3">Admin — Vehicles & Driver Assignments</h3>
      {loading ? (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="skeleton skeleton-line" style={{ width: 260, height: 24 }}></div>
          </div>
          <div className="card p-3">
            <div className="skeleton skeleton-line mb-3" style={{ width: '30%' }}></div>
            <div className="table-responsive">
              <table className="table table-sm align-middle admin-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Vehicle</th><th>Type</th><th>Capacity</th><th>Status</th><th>Driver</th><th>Assign</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length:8}).map((_,i)=> (
                    <tr key={i}>
                      {Array.from({length:7}).map((__,j)=> (
                        <td key={j}><div className="skeleton skeleton-line" style={{ height: 16, width: j===1? 140 : 100 }}></div></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle admin-table">
            <thead>
              <tr>
                <th>ID</th><th>Vehicle</th><th>Type</th><th>Capacity</th><th>Status</th><th>Driver</th><th>Assign</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(v=> (
                <tr key={v.vehicle_id}>
                  <td>#{v.vehicle_id}</td>
                  <td>{v.vehicle_number}</td>
                  <td>{v.type}</td>
                  <td>{v.capacity}</td>
                  <td>{v.status}</td>
                  <td>{v.driver_name ? `${v.driver_name} (${v.driver_email})` : <span className="text-muted">Unassigned</span>}</td>
                  <td>
                    <select className="form-select form-select-sm" value={v.driver_user_id || ''} onChange={e=>assign(v.vehicle_id, e.target.value || null)}>
                      <option value="">-- Unassigned --</option>
                      {drivers.map(d=> (
                        <option key={d.user_id} value={d.user_id}>{d.name} ({d.email})</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
