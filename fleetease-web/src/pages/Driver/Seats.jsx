import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import SeatMap from '../../components/SeatMap';
import { socket } from '../../utils/socket';

export default function DriverSeats(){
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [taken, setTaken] = React.useState([]);
  const nav = useNavigate();
  const location = useLocation();
  const { schedule_id } = useParams();

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'driver') { nav('/'); return; }
    (async()=>{
      try{
        setLoading(true);
        if (!schedule_id) { setRows([]); setTaken([]); return; }
        const [r1, r2] = await Promise.all([
          api.get(`/driver/assignments/${schedule_id}/seats`).catch(()=> ({ data:[] })),
          api.get(`/seats/${schedule_id}`).catch(()=> ({ data:[] })),
        ]);
        setRows(r1.data||[]);
        setTaken(Array.isArray(r2.data)? r2.data : []);
      } finally { setLoading(false); }
    })();
  },[nav, location, schedule_id]);

  // Realtime: join schedule room and refresh seat map on updates
  React.useEffect(()=>{
    if (!schedule_id) return;
    const load = ()=> api.get(`/seats/${schedule_id}`).then(r=> setTaken(Array.isArray(r.data)? r.data : [])).catch(()=>{});
    socket.emit('join_schedule', schedule_id);
    const handler = ()=> load();
    socket.on('seats_updated', handler);
    return ()=> socket.off('seats_updated', handler);
  },[schedule_id]);

  return (
    <div className="container py-4">
      <h3 className="mb-3">Driver — Booked Seats</h3>
      {!schedule_id && <div className="alert alert-warning">Open Assigned Routes and click "View Seats" for a schedule.</div>}
      {loading ? <div>Loading…</div> : (
        <>
          <div className="card mb-3">
            <div className="card-body">
              <div className="fw-semibold mb-2">Seat Map (Booked shown as disabled)</div>
              <SeatMap layoutType="2x2" rows={10} upperDeck={false} selected={[]} onToggle={()=>{}} disabledSeats={taken} />
            </div>
          </div>
          {rows.length>0 && (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead><tr><th>Seat</th><th>Passenger</th><th>Age</th><th>Gender</th><th>Pickup</th><th>Drop</th></tr></thead>
                <tbody>
                  {rows.map((r,i)=> (
                    <tr key={i}><td>{r.seat_label}</td><td>{r.passenger_name}</td><td>{r.passenger_age}</td><td>{r.passenger_gender}</td><td>{r.pickup_location}</td><td>{r.drop_location}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
