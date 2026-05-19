import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminBookings(){
  const location = useLocation();
  const [items,setItems]=useState([]);
  useEffect(()=>{ api.get('/bookings').then(r=>setItems(r.data)).catch(()=>setItems([])); },[location]);
  return (
    <div className="container py-4">
      <h3 className="mb-3">All Bookings</h3>
      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>ID</th><th>Customer</th><th>Vehicle</th><th>Route</th><th>Status</th><th>Payment</th><th>Fare</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map(b=> (
              <tr key={b.booking_id}>
                <td>{b.booking_id}</td>
                <td>{b.customer_id}</td>
                <td>{b.vehicle_id}</td>
                <td>{b.route_id}</td>
                <td>{b.status}</td>
                <td>{b.payment_status}</td>
                <td>₹{b.fare}</td>
                <td>{new Date(b.booking_time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
