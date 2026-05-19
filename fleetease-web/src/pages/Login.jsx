import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';

export default function Login(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const nav = useNavigate();

  const submit=async(e)=>{
    e.preventDefault(); setLoading(true);
    try{
      const payload = { email, password };
      console.log("Login payload:", payload);
      console.log("API URL:", process.env.REACT_APP_API_URL);
      const r = await api.post('/auth/login', payload);
      console.log("Login response:", r.data);
      localStorage.setItem('token', r.data.token);
      let role = null; try { role = JSON.parse(atob(r.data.token.split('.')[1]))?.role || null; } catch{}
      if (role==='admin') nav('/admin/dashboard');
      else if (role==='agent') nav('/agent/trips');
      else if (role==='driver') nav('/driver/dashboard');
      else if (role==='manager') nav('/manager/fleet');
      else if (role==='company_admin') nav('/company/charter');
      else if (role==='customer') nav('/my-bookings');
      else nav('/');
    }catch(err){ console.error("Login error:", err); alert('Login failed'); }
    finally{ setLoading(false); }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{position:'relative', background:'linear-gradient(135deg, rgba(13,71,161,0.15), rgba(59,130,246,0.15))'}}>
      <div aria-hidden style={{position:'absolute', inset:0, backgroundImage:"url('/assets/Sameer5.jpg')", backgroundSize:'cover', backgroundPosition:'center', opacity:0.18}}/>
      <div className="container position-relative" style={{zIndex:1}}>
        <div className="mx-auto" style={{maxWidth:480}}>
          <div className="card border-0 shadow" style={{background:'rgba(255,255,255,0.94)', border:'1px solid rgba(0,0,0,0.06)'}}>
            <div className="card-body p-4 p-md-5">
              <div className="mb-3">
                <div className="text-uppercase small" style={{color:'#6b7280'}}>Welcome back</div>
                <h3 className="mb-0">Login</h3>
              </div>
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input className="form-control" value={email} onChange={e=>setEmail(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <div className="input-group">
                    <input type={showPwd? 'text' : 'password'} className="form-control" value={password} onChange={e=>setPassword(e.target.value)} />
                    <button type="button" className="btn btn-outline-secondary" onClick={()=>setShowPwd(s=>!s)}>{showPwd? 'Hide' : 'Show'}</button>
                  </div>
                </div>
                <div className="d-grid">
                  <button className="btn btn-accent" disabled={loading}>{loading?'Logging in...':'Login'}</button>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-3 small">
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
