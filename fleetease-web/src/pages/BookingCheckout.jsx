import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function BookingCheckout(){
  const { state } = useLocation();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const route = state?.route; const seats = state?.seats || [];
  const boarding = state?.boarding; const dropping = state?.dropping; const passengers = state?.passengers || [];
  const schedule = state?.schedule || null;
  const user = React.useMemo(()=>{
    const t = localStorage.getItem('token');
    try { return t ? JSON.parse(atob(t.split('.')[1])) : null; } catch { return null; }
  },[]);
  const [mode,setMode]=useState(user?.role==='company_admin' ? 'B2B' : 'B2C');
  const isCorporate = mode==='B2B';
  const [accept,setAccept]=useState(false);
  const [corpMethod, setCorpMethod] = useState('fixed'); // 'fixed' | 'cost' | 'combined'
  const [costParams, setCostParams] = useState({ fuelPricePerL: 100, avgKmPerL: 4, permitFee: 500, tolls: 300, driverCost: 1500, profitMargin: 0.15 });
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [days, setDays] = useState(1);

  useEffect(()=>{ if (!route) nav('/search'); },[route, nav]);

  // Fetch quote whenever inputs change
  useEffect(()=>{
    if (!route) return;
    const fetchQuote = async () => {
      try{
        setQuoteError('');
        const body = {
          source: route.source,
          destination: route.destination,
          busType: schedule?.bus_type || schedule?.vehicle_type,
          date: schedule?.departure,
          seatsCount: isCorporate ? 1 : (seats.length||1),
          role: user?.role || 'customer',
          method: isCorporate ? corpMethod : 'fixed',
          distanceKm: route.distance_km,
          costParams: isCorporate ? costParams : undefined,
          days: isCorporate ? days : undefined,
        };
        const r = await api.post('/fare/quote', body);
        setQuote(r.data);
      }catch(e){ setQuote(null); setQuoteError(e?.response?.data?.error || 'Failed to quote'); }
    };
    fetchQuote();
  // eslint-disable-next-line
  }, [route?.source, route?.destination, schedule?.bus_type, schedule?.vehicle_type, schedule?.departure, route?.distance_km, JSON.stringify(seats), isCorporate, corpMethod, JSON.stringify(costParams), days]);

  const pay = async ()=>{
    try{
      setLoading(true);
      if (!quote) throw new Error('No quote available');
      const fare = Number(quote.total ?? (quote.perSeat * (seats.length||1)) ?? 0);
      // Create booking (customer_id left null; backend may infer from token if implemented)
      const booking = await api.post('/bookings', {
        customer_id: user?.user_id || null,
        vehicle_id: schedule?.vehicle_id || 1,
        schedule_id: schedule?.schedule_id || null,
        route_id: route.route_id,
        pickup_location: boarding || route.source,
        drop_location: dropping || route.destination,
        fare,
        booking_type: isCorporate ? 'B2B' : 'B2C',
        company_name: isCorporate ? (user?.name || 'Corporate') : null
      });
      const booking_id = booking.data.booking_id;

      // Persist seats for B2C along with simple per-seat pricing
      if (!isCorporate && seats.length){
        const perSeat = Number(quote?.perSeat || 0).toFixed(2);
        await api.post(`/bookings/${booking_id}/seats`, {
          seats,
          prices: seats.map(()=> perSeat)
        });
      }
      // Create order (mock allowed)
      const o = await api.post('/payments/create-order', { amount: fare });
      // Simulate success immediately in demo mode
      await api.post('/payments/verify', { booking_id, amount: fare, razorpay_order_id:o.data.id, razorpay_payment_id:`pay_${Date.now()}` });
      nav(`/booking/${booking_id}`);
    }catch(e){ alert('Payment failed'); }
    finally{ setLoading(false); }
  };

  if (!route) return null;
  const totalDisplay = isCorporate ? (quote ? `₹${quote.total}` : '—') : (quote ? `₹${quote.perSeat * (seats.length||1)}` : '—');
  return (
    <div className="container py-4">
      <h3 className="mb-3">Checkout</h3>
      <div className="mb-3">
        <label className="form-label me-2">Booking Type:</label>
        <div className="btn-group" role="group">
          <button className={`btn ${!isCorporate? 'btn-primary':'btn-outline-primary'}`} onClick={()=>setMode('B2C')}>Customer (per seat)</button>
          <button className={`btn ${isCorporate? 'btn-primary':'btn-outline-primary'}`} onClick={()=>setMode('B2B')}>Corporate (full bus)</button>
        </div>
      </div>
      <p>Route: {route.source} → {route.destination}</p>
      {schedule && (
        <p>Bus: {schedule.bus_number || schedule.vehicle_number} • {schedule.bus_type || schedule.vehicle_type} • {new Date(schedule.departure).toLocaleString()}</p>
      )}
      {boarding && <p>Boarding: {boarding}</p>}
      {dropping && <p>Dropping: {dropping}</p>}
      {isCorporate && (
        <div className="card card-body mb-3">
          <div className="mb-2">
            <label className="form-label me-2">Corporate Pricing Method:</label>
            <div className="btn-group" role="group">
              <button className={`btn ${corpMethod==='fixed'? 'btn-secondary':'btn-outline-secondary'}`} onClick={()=>setCorpMethod('fixed')}>Fixed</button>
              <button className={`btn ${corpMethod==='cost'? 'btn-secondary':'btn-outline-secondary'}`} onClick={()=>setCorpMethod('cost')}>Cost-based</button>
              <button className={`btn ${corpMethod==='combined'? 'btn-secondary':'btn-outline-secondary'}`} onClick={()=>setCorpMethod('combined')}>Combined</button>
            </div>
          </div>
          <div className="row g-2 align-items-end">
            <div className="col-6 col-md-2">
              <label className="form-label">Days</label>
              <input type="number" className="form-control" min={1} value={days} onChange={e=>setDays(Math.max(1, Number(e.target.value)||1))} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Distance (km)</label>
              <input type="number" className="form-control" value={route.distance_km||0} disabled readOnly />
            </div>
            {corpMethod!=='fixed' && (
              <>
                <div className="col-6 col-md-2">
                  <label className="form-label">Fuel ₹/L</label>
                  <input type="number" className="form-control" value={costParams.fuelPricePerL}
                    onChange={e=>setCostParams({...costParams, fuelPricePerL:Number(e.target.value)})} />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label">Avg km/L</label>
                  <input type="number" className="form-control" value={costParams.avgKmPerL}
                    onChange={e=>setCostParams({...costParams, avgKmPerL:Number(e.target.value)})} />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label">Permit ₹</label>
                  <input type="number" className="form-control" value={costParams.permitFee}
                    onChange={e=>setCostParams({...costParams, permitFee:Number(e.target.value)})} />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label">Tolls ₹</label>
                  <input type="number" className="form-control" value={costParams.tolls}
                    onChange={e=>setCostParams({...costParams, tolls:Number(e.target.value)})} />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label">Driver ₹</label>
                  <input type="number" className="form-control" value={costParams.driverCost}
                    onChange={e=>setCostParams({...costParams, driverCost:Number(e.target.value)})} />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label">Profit %</label>
                  <input type="number" className="form-control" value={costParams.profitMargin*100}
                    onChange={e=>setCostParams({...costParams, profitMargin:Number(e.target.value)/100})} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {!isCorporate && (
        <>
          <p>Seats: {seats.join(', ') || '1 (default)'} </p>
          {passengers?.length>0 && (
            <div className="mb-2">
              <strong>Passengers</strong>
              <ul className="mb-0">
                {passengers.map((p,i)=> <li key={i}>{p.name} ({p.age}, {p.gender}) — Seat {p.seat}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
      {quoteError && <div className="alert alert-warning py-2">{quoteError}</div>}
      <div className="form-check my-3">
        <input id="terms" type="checkbox" className="form-check-input" checked={accept} onChange={e=>setAccept(e.target.checked)} />
        <label htmlFor="terms" className="form-check-label">I accept Terms & Conditions and Cancellation Policy</label>
      </div>
      <h5>Total: {totalDisplay}</h5>
      <button className="btn btn-accent" disabled={loading || !accept} onClick={pay}>{loading? 'Processing...' : 'Pay (Demo)'}</button>
    </div>
  );
}
