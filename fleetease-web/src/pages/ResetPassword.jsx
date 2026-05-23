import React from 'react';
import api from '../utils/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '../components/Toast';

export default function ResetPassword(){
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const token = sp.get('token') || '';
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [ok, setOk] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e)=>{
    e.preventDefault();
    if (!token) return toast('Missing token','error');
    if (password.length < 6) return toast('Password must be at least 6 characters','error');
    if (password !== confirm) return toast('Passwords do not match','error');
    setLoading(true);
    try{
      const r = await api.post('/auth/reset', { token, password });
      if (r.data?.ok){ setOk(true); setTimeout(()=> nav('/login'), 1500); }
      else toast('Failed to reset password','error');
    }catch{ toast('Failed to reset password','error'); }
    finally{ setLoading(false); }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{background:'linear-gradient(135deg, rgba(13,71,161,0.08), rgba(59,130,246,0.08))'}}>
      <div className="container">
        <div className="mx-auto" style={{maxWidth:480}}>
          <div className="card border-0 shadow">
            <div className="card-body p-4 p-md-5">
              <h3 className="mb-2">Reset password</h3>
              {!token && <div className="alert alert-warning">Missing or invalid token.</div>}
              {ok ? (
                <div className="alert alert-success">Password updated. Redirecting to login…</div>
              ) : (
                <form onSubmit={submit}>
                  <div className="mb-3">
                    <label className="form-label">New password</label>
                    <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Confirm password</label>
                    <input type="password" className="form-control" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={6} />
                  </div>
                  <div className="d-grid">
                    <button className="btn btn-accent" disabled={loading || !token}>{loading? 'Updating…' : 'Update password'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
