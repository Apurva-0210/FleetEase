import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { socket } from '../utils/socket';
import { API_URL } from '../config/env';

export default function BookingDetails(){
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [status, setStatus] = useState('');
  const [liveLoc, setLiveLoc] = useState(null);
  const [liveStatus, setLiveStatus] = useState('');
  const mapRef = React.useRef(null);
  const mapInst = React.useRef(null);
  const markerRef = React.useRef(null);
  useEffect(()=>{ api.get(`/bookings/${id}`).then(r=>setData(r.data)).catch(()=>setData(null)); },[id]);

  // Load schedule once booking is available
  useEffect(()=>{
    if (!data?.schedule_id) return;
    api.get(`/schedules/${data.schedule_id}`).then(r=> setSchedule(r.data)).catch(()=> setSchedule(null));
  },[data?.schedule_id]);

  // Compute time-based progress and update periodically
  useEffect(()=>{
    if (!schedule?.departure){ setProgress(0); setStatus(''); return; }
    const dep = new Date(schedule.departure);
    const arr = schedule.arrival ? new Date(schedule.arrival) : new Date(new Date(schedule.departure).getTime() + 2*60*60*1000); // fallback 2h
    const compute = ()=>{
      const now = new Date();
      let p = 0;
      if (now <= dep) { p = 0; setStatus('Not departed'); }
      else if (now >= arr) { p = 1; setStatus('Arrived'); }
      else {
        p = (now - dep) / (arr - dep);
        setStatus('On the way');
      }
      setProgress(Math.max(0, Math.min(1, p)));
    };
    compute();
    const t = setInterval(compute, 15000); // update every 15s
    return ()=> clearInterval(t);
  },[schedule?.departure, schedule?.arrival]);

  // Sockets: join schedule room and listen for live GPS
  useEffect(()=>{
    if (!schedule?.schedule_id) return;
    socket.emit('join_schedule', schedule.schedule_id);
    const locHandler = (payload)=>{ setLiveLoc(payload); };
    const boardingHandler = ()=> setLiveStatus('boarding');
    const statusHandler = (p)=>{ if (p?.status) setLiveStatus(p.status); };
    socket.on('location_update', locHandler);
    socket.on('boarding_started', boardingHandler);
    socket.on('status_changed', statusHandler);
    return ()=>{
      socket.off('location_update', locHandler);
      socket.off('boarding_started', boardingHandler);
      socket.off('status_changed', statusHandler);
    };
  },[schedule?.schedule_id]);

  // Load last known location for map init
  useEffect(()=>{
    if (!schedule?.schedule_id) return;
    (async()=>{
      try{ const r = await api.get(`/gps/schedule/${schedule.schedule_id}/last`); if (r.data) setLiveLoc({ lat: Number(r.data.latitude), lng: Number(r.data.longitude), speed: Number(r.data.speed_kmph)||null }); }catch{}
    })();
  },[schedule?.schedule_id]);

  // Initialize / update google map
  useEffect(()=>{
    if (!schedule) return;
    if (!window.google || !window.google.maps) return; // map sdk not loaded yet
    if (!mapRef.current) return;
    const center = liveLoc ? { lat:Number(liveLoc.lat), lng:Number(liveLoc.lng) } : { lat: 25.6, lng: 85.1 };
    if (!mapInst.current){
      mapInst.current = new window.google.maps.Map(mapRef.current, { center, zoom: 9, mapTypeControl:false, streetViewControl:false, fullscreenControl:false });
    }
    // Create / update marker
    if (liveLoc){
      if (!markerRef.current){
        markerRef.current = new window.google.maps.Marker({ position: center, map: mapInst.current, title: 'Bus Location' });
      }else{
        markerRef.current.setPosition(center);
      }
      mapInst.current.setCenter(center);
    }
  },[schedule, liveLoc]);

  if (!data) return <div className="container py-4">Loading booking...</div>;
  return (
    <div className="container py-4">
      <h3>Booking #{id}</h3>
      <div className="card p-3 mb-3">
        <div>Pickup: {data.pickup_location}</div>
        <div>Drop: {data.drop_location}</div>
        <div>Status: {data.status}</div>
        <div>Payment: {data.payment_status}</div>
        <div>Fare: ₹{data.fare}</div>
      </div>
      {schedule && (
        <div className="card p-3 mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <div className="small text-muted">From</div>
              <div className="fw-semibold">{schedule.source}</div>
              <div className="small text-muted">{new Date(schedule.departure).toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="badge bg-secondary">{liveLoc? 'Live' : (liveStatus || status || '—')}</div>
              {liveLoc && (
                <div className="small text-muted mt-1">{Number(liveLoc.lat).toFixed(5)}, {Number(liveLoc.lng).toFixed(5)}</div>
              )}
            </div>
            <div className="text-end">
              <div className="small text-muted">To</div>
              <div className="fw-semibold">{schedule.destination}</div>
              <div className="small text-muted">{schedule.arrival ? new Date(schedule.arrival).toLocaleString() : 'ETA ~2h'}</div>
            </div>
          </div>
          <div style={{position:'relative', height: 16, background:'#eee', borderRadius: 8}}>
            <div style={{position:'absolute', left: 0, top: 0, bottom: 0, right: 0, borderRadius:8, background:'linear-gradient(90deg, #cfe9ff 0%, #d1ffd6 100%)'}} />
            <div style={{position:'absolute', left: `${progress*100}%`, top: -10, transform:'translateX(-50%)'}}>
              <span role="img" aria-label="bus" style={{fontSize: 24}}>🚌</span>
            </div>
          </div>
          <div className="d-flex justify-content-between mt-1 small text-muted">
            <span>Departed</span>
            <span>Arriving</span>
          </div>
          <div className="mt-3">
            <h6 className="mb-2">Live Map</h6>
            {!window.google?.maps && <div className="text-muted small">Map SDK not loaded. Ensure API key is configured.</div>}
            <div ref={mapRef} style={{width:'100%', height:300, borderRadius:8, overflow:'hidden', background:'#f1f5f9'}} />
          </div>
        </div>
      )}
      <a className="btn btn-outline-secondary me-2" href={`${API_URL}/invoices/${id}`} target="_blank" rel="noreferrer">View Invoice JSON</a>
      <a className="btn btn-accent" href={`${API_URL}/invoices/${id}/pdf`} target="_blank" rel="noreferrer">Download Invoice PDF</a>
    </div>
  );
}
