import React from 'react';
import api from '../utils/api';

export default function ScheduleCard({ schedule, onSelect }){
  const dep = new Date(schedule.departure);
  const arr = schedule.arrival ? new Date(schedule.arrival) : null;
  const [perSeat, setPerSeat] = React.useState(null);
  const [qErr, setQErr] = React.useState('');

  React.useEffect(()=>{
    let alive = true;
    (async()=>{
      try{
        setQErr('');
        const body = {
          source: schedule.source,
          destination: schedule.destination,
          busType: schedule.bus_type || schedule.vehicle_type,
          date: schedule.departure,
          seatsCount: 1,
          role: 'customer',
          method: 'fixed',
          distanceKm: schedule.distance_km,
        };
        const r = await api.post('/fare/quote', body);
        if (!alive) return;
        setPerSeat(Number(r.data?.perSeat || 0));
      }catch(e){ if (alive){ setQErr(''); setPerSeat(null); } }
    })();
    return ()=>{ alive = false; };
  }, [schedule.source, schedule.destination, schedule.bus_type, schedule.vehicle_type, schedule.departure, schedule.distance_km]);
  return (
    <div className="card mb-3">
      <div className="card-body d-flex justify-content-between align-items-center">
        <div>
          <h5 className="card-title">{schedule.source} → {schedule.destination}</h5>
          <div className="small text-muted mb-1">
            {schedule.bus_number || schedule.vehicle_number} • {schedule.bus_type || schedule.vehicle_type}
          </div>
          <div className="small">
            {dep.toLocaleString()} {arr ? `→ ${arr.toLocaleString()}` : ''}
          </div>
          <div className="small text-muted">Distance: {schedule.distance_km} km</div>
        </div>
        <div className="text-end">
          <div className="fw-bold mb-2">From {perSeat!=null ? `₹${perSeat}` : '—'}</div>
          <button className="btn btn-accent" disabled={perSeat==null} onClick={()=> onSelect && onSelect(schedule)}>Select</button>
        </div>
      </div>
    </div>
  );
}
