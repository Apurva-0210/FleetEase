import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { FaStar } from 'react-icons/fa';
import { toast } from '../components/Toast';

function StarRate({ value, onChange, size=20 }){
  return (
    <div>
      {Array.from({ length: 5 }).map((_,i)=>{
        const v = i+1;
        return (
          <FaStar key={v}
            size={size}
            className={v <= value ? 'text-warning' : 'text-secondary'}
            style={{ cursor:'pointer', marginRight: 4 }}
            onClick={()=> onChange(v)}
          />
        );
      })}
    </div>
  );
}

export default function Testimonials(){
  const [items,setItems]=useState([]);
  const [name,setName]=useState('');
  const [rating,setRating]=useState(5);
  const [comment,setComment]=useState('');
  const [busCondition,setBusCondition]=useState(5);
  const [cleanliness,setCleanliness]=useState(5);
  const [driverBehaviour,setDriverBehaviour]=useState(5);
  const [punctuality,setPunctuality]=useState(5);
  const [comfort,setComfort]=useState(5);
  const token = localStorage.getItem('token');
  let role=null; if (token){ try { role = JSON.parse(atob(token.split('.')[1]))?.role || null; } catch(_){} }

  const load=()=> api.get('/testimonials').then(r=>{
    const list = Array.isArray(r.data) ? r.data : (Array.isArray(r.data?.data) ? r.data.data : []);
    setItems(list);
  }).catch(()=>setItems([]));
  useEffect(()=>{ load(); },[]);

  const submit=async(e)=>{
    e.preventDefault();
    try{
      await api.post('/testimonials',{
        name,
        rating,
        comment,
        bus_condition: busCondition,
        cleanliness,
        driver_behaviour: driverBehaviour,
        punctuality,
        comfort
      });
      setName(''); setRating(5); setComment('');
      setBusCondition(5); setCleanliness(5); setDriverBehaviour(5); setPunctuality(5); setComfort(5);
      load();
    }catch(_){ toast('Failed to submit testimonial','error'); }
  };

  const clearAll = async()=>{
    if (!window.confirm('Clear all testimonials?')) return;
    try{ await api.delete('/testimonials'); load(); toast('Testimonials cleared','success'); } catch{ toast('Failed to clear testimonials','error'); }
  };

  const avg = useMemo(()=>{
    if (!items.length) return null;
    const sum = (k)=> items.reduce((s,x)=> s + (Number(x[k])||0), 0) / items.length;
    return {
      rating: sum('rating'),
      bus_condition: sum('bus_condition'),
      cleanliness: sum('cleanliness'),
      driver_behaviour: sum('driver_behaviour'),
      punctuality: sum('punctuality'),
      comfort: sum('comfort')
    };
  },[items]);

  return (
    <div className="container py-4" style={{maxWidth:900}}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">Customer Testimonials</h3>
        {role==='admin' && (
          <button className="btn btn-outline-danger btn-sm" onClick={clearAll}>Clear All</button>
        )}
      </div>

      {avg && (
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <div className="fw-semibold">Overall</div>
                <div className="d-flex align-items-center">
                  <StarRate value={Math.round(avg.rating)} onChange={()=>{}} />
                  <span className="ms-2">{avg.rating.toFixed(1)}/5</span>
                </div>
                <div className="text-muted small">Based on {items.length} reviews</div>
              </div>
              <div className="col-md-8">
                <div className="row g-2 small">
                  {[
                    ['Bus condition','bus_condition'],
                    ['Cleanliness','cleanliness'],
                    ["Driver's behaviour",'driver_behaviour'],
                    ['Punctuality','punctuality'],
                    ['Comfort','comfort']
                  ].map(([label,key])=> (
                    <div className="col-sm-6" key={key}>
                      <div className="d-flex align-items-center justify-content-between">
                        <span>{label}</span>
                        <span className="text-muted">{(avg[key]||0).toFixed(1)}/5</span>
                      </div>
                      <div className="progress" style={{height:6}}>
                        <div className="progress-bar" role="progressbar" style={{width: `${(avg[key]||0)/5*100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {role !== 'admin' && (
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body">
          <div className="mb-2 fw-semibold">Rate our service</div>
          <form onSubmit={submit}>
            <div className="row g-3">
              <div className="col-md-4"><input className="form-control" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} required /></div>
              <div className="col-md-8 d-flex align-items-center">
                <span className="me-2">Overall</span>
                <StarRate value={rating} onChange={setRating} />
              </div>
              <div className="col-12"><input className="form-control" placeholder="Write your feedback" value={comment} onChange={e=>setComment(e.target.value)} required /></div>
              <div className="col-12">
                <div className="row g-3">
                  <div className="col-sm-6 d-flex align-items-center justify-content-between">
                    <span>Bus condition</span>
                    <StarRate value={busCondition} onChange={setBusCondition} size={18} />
                  </div>
                  <div className="col-sm-6 d-flex align-items-center justify-content-between">
                    <span>Cleanliness</span>
                    <StarRate value={cleanliness} onChange={setCleanliness} size={18} />
                  </div>
                  <div className="col-sm-6 d-flex align-items-center justify-content-between">
                    <span>Driver's behaviour</span>
                    <StarRate value={driverBehaviour} onChange={setDriverBehaviour} size={18} />
                  </div>
                  <div className="col-sm-6 d-flex align-items-center justify-content-between">
                    <span>Punctuality</span>
                    <StarRate value={punctuality} onChange={setPunctuality} size={18} />
                  </div>
                  <div className="col-sm-6 d-flex align-items-center justify-content-between">
                    <span>Comfort</span>
                    <StarRate value={comfort} onChange={setComfort} size={18} />
                  </div>
                </div>
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button className="btn btn-accent">Post</button>
              </div>
            </div>
          </form>
        </div>
      </div>
      )}

      {items.map(t=> (
        <div key={t.id} className="card border-0 shadow-sm rounded-3 mb-2">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between">
              <div className="fw-semibold">{t.name}</div>
              <div className="d-flex align-items-center"><StarRate value={t.rating||0} onChange={()=>{}} size={16} /><span className="ms-2 small">{t.rating}/5</span></div>
            </div>
            <div className="small mt-1">{t.comment}</div>
            <div className="row g-2 mt-2 small text-muted">
              {t.bus_condition!=null && (
                <div className="col-sm-6">Bus condition: {t.bus_condition}/5</div>
              )}
              {t.cleanliness!=null && (
                <div className="col-sm-6">Cleanliness: {t.cleanliness}/5</div>
              )}
              {t.driver_behaviour!=null && (
                <div className="col-sm-6">Driver's behaviour: {t.driver_behaviour}/5</div>
              )}
              {t.punctuality!=null && (
                <div className="col-sm-6">Punctuality: {t.punctuality}/5</div>
              )}
              {t.comfort!=null && (
                <div className="col-sm-6">Comfort: {t.comfort}/5</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
