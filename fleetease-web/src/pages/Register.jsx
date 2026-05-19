import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function Register(){
  const [name,setName]=useState('Customer One');
  const [email,setEmail]=useState('cust1@fleetease.com');
  const [phone,setPhone]=useState('9999990000');
  const [password,setPassword]=useState('cust123');
  const [loading,setLoading]=useState(false);
  const nav = useNavigate();

  const submit=async(e)=>{
    e.preventDefault(); setLoading(true);
    try{
      await api.post('/auth/register',{ name,email,phone,password });
      alert('Registered! Please login.');
      nav('/login');
    }catch(err){ alert('Registration failed'); }
    finally{ setLoading(false); }
  };

  return (
    <div className="container py-4" style={{maxWidth:520}}>
      <h3 className="mb-3">Register</h3>
      <form onSubmit={submit}>
        <div className="mb-3"><label className="form-label">Name</label><input className="form-control" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="mb-3"><label className="form-label">Email</label><input className="form-control" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div className="mb-3"><label className="form-label">Phone</label><input className="form-control" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
        <div className="mb-3"><label className="form-label">Password</label><input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        <button className="btn btn-accent" disabled={loading}>{loading?'Submitting...':'Create account'}</button>
      </form>
    </div>
  );
}
