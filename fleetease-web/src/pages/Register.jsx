import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/Toast';

export default function Register(){
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [phone,setPhone]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const nav = useNavigate();

  const submit=async(e)=>{
    e.preventDefault(); setLoading(true);
    try{
      await api.post('/auth/register',{ name,email,phone,password });
      toast('Registered! Please login.','success');
      nav('/login');
    }catch(err){ toast('Registration failed','error'); }
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
