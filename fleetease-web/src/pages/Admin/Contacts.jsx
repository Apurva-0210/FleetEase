import React from 'react';
import { useNavigate } from 'react-router-dom';
import useRouteRefresh from '../../hooks/useRouteRefresh';
import api from '../../utils/api';

export default function Contacts(){
  const nav = useNavigate();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const refresh = async()=>{
    try{
      setLoading(true); setError('');
      const r = await api.get('/contact');
      setRows(Array.isArray(r.data)? r.data : []);
    }catch(e){
      setError('Failed to load contact messages');
    }finally{
      setLoading(false);
    }
  };

  useRouteRefresh(() => {
    const t = localStorage.getItem('token');
    let role = null;
    try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch {}
    if (role !== 'admin') { nav('/'); return; }
    refresh();
  }, [nav]);

  return (
    <div className="container py-4">
      <h3 className="mb-3">Admin — Contacts</h3>
      {loading && <div>Loading contact messages...</div>}
      {!loading && error && <div className="alert alert-danger py-2 small">{error}</div>}
      {!loading && !error && rows.length===0 && (
        <div className="alert alert-info py-2 small mb-3">No contact messages received yet.</div>
      )}
      {!loading && rows.length>0 && (
        <div className="table-responsive">
          <table className="table table-sm align-middle admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Message</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m)=> (
                <tr key={m.id}>
                  <td>#{m.id}</td>
                  <td>{m.name || '—'}</td>
                  <td>{m.email || '—'}</td>
                  <td>{m.phone || '—'}</td>
                  <td style={{maxWidth:320}} className="small text-muted">{m.message}</td>
                  <td className="small text-muted">{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
