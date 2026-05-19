import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';
import ChartRevenue from '../../components/ChartRevenue';

export default function AdminSummary(){
  const location = useLocation();
  const [data,setData]=useState(null);
  useEffect(()=>{ api.get('/admin/summary').then(r=>setData(r.data)).catch(()=>setData(null)); },[location]);
  if(!data) return <div className="container py-4">Loading summary (login as admin first)...</div>;
  return (
    <div className="container py-4">
      <h3 className="mb-3">Admin Dashboard</h3>
      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="card p-3"><div className="text-muted">Total Revenue</div><div className="fs-4">₹{data.totalRevenue}</div></div></div>
        <div className="col-md-4"><div className="card p-3"><div className="text-muted">Buses</div><div className="small">{data.byBus?.length||0} vehicles</div></div></div>
        <div className="col-md-4"><div className="card p-3"><div className="text-muted">Occupancy records</div><div className="small">{data.occupancy?.length||0}</div></div></div>
      </div>
      <div className="card p-3 mb-3">
        <h5 className="mb-3">Daily Revenue</h5>
        <ChartRevenue dataPoints={data.daily||[]} />
      </div>
      <div className="row g-3">
        <div className="col-md-6"><div className="card p-3"><h6>Revenue by Bus</h6>{(data.byBus||[]).map(b=> <div key={b.vehicle_number} className="d-flex justify-content-between"><span>{b.vehicle_number}</span><span>₹{b.amount}</span></div>)}</div></div>
        <div className="col-md-6"><div className="card p-3"><h6>Seat Occupancy</h6>{(data.occupancy||[]).map(o=> <div key={o.vehicle_number} className="d-flex justify-content-between"><span>{o.vehicle_number}</span><span>{o.occupancy || 0}%</span></div>)}</div></div>
      </div>
    </div>
  );
}
