import React from 'react';

export default function BookingCard({ route, onSelect }){
  return (
    <div className="card mb-3">
      <div className="card-body d-flex justify-content-between align-items-center">
        <div>
          <h5 className="card-title">{route.source} → {route.destination}</h5>
          <p className="card-text mb-0">Distance: {route.distance_km} km</p>
          <small className="text-muted">Fare/km: ₹{route.fare_per_km}</small>
        </div>
        <button className="btn btn-accent" onClick={()=>onSelect && onSelect(route)}>Select Seats</button>
      </div>
    </div>
  );
}
