import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Profile(){
  const nav = useNavigate();
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    if (!t) { nav('/login'); return; }
    (async()=>{
      try{
        setLoading(true);
        const r = await api.get('/auth/me');
        setMe(r.data||null);
      } finally { setLoading(false); }
    })();
  },[nav]);

  if (loading) return <div className="container py-4">Loading profile…</div>;
  if (!me) return <div className="container py-4">No profile</div>;

  return (
    <div className="container py-4">
      <h3 className="mb-3">My Profile</h3>
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card p-3">
            <div className="mb-2"><span className="text-muted small">Name</span><div className="fw-semibold">{me.name}</div></div>
            <div className="mb-2"><span className="text-muted small">Email</span><div className="fw-semibold">{me.email}</div></div>
            <div className="mb-2"><span className="text-muted small">Phone</span><div className="fw-semibold">{me.phone || '—'}</div></div>
            <div className="mb-2"><span className="text-muted small">Role</span><div className="fw-semibold">{me.role}</div></div>
            <div className="mb-2"><span className="text-muted small">Points</span><div className="fw-semibold">{me.points ?? 0}</div></div>
            <div className="mb-2"><span className="text-muted small">Member Since</span><div className="fw-semibold">{me.created_at ? new Date(me.created_at).toLocaleDateString() : '—'}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
