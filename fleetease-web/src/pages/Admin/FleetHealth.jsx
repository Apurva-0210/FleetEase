import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';

export default function FleetHealth(){
  const location = useLocation();
  const [vehicles, setVehicles] = useState([]);
  useEffect(()=>{
    // In this scaffold, show vehicles from bookings join, or placeholder if none
    api.get('/bookings').then(r=>{
      const ids = [...new Set(r.data.map(b=>b.vehicle_id))].filter(Boolean);
      setVehicles(ids.map(id=>({ vehicle_id:id, speed: Math.round(40+Math.random()*20), fuel: Math.round(40+Math.random()*30) })));
    }).catch(()=> setVehicles([]));
  },[location]);
  return (
    <div className="container py-4">
      <h3 className="mb-3">Fleet Health</h3>
      {vehicles.length===0 && <div className="text-muted">No vehicles yet. Create a booking.</div>}
      {vehicles.map(v=> (
        <div key={v.vehicle_id} className="card mb-2 p-3 d-flex flex-row justify-content-between">
          <div><strong>Vehicle</strong> #{v.vehicle_id}</div>
          <div>Speed: {v.speed} km/h</div>
          <div>Fuel: {v.fuel}%</div>
        </div>
      ))}
    </div>
  );
}
