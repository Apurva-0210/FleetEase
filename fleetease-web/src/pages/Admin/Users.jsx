import React from 'react';
import api from '../../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../../components/Toast';

export default function AdminUsers(){
  const nav = useNavigate();
  const location = useLocation();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [managedOnly, setManagedOnly] = React.useState(true); // show only agent/manager/driver
  const [modal, setModal] = React.useState({ open:false, name:'', email:'', phone:'', password:'', role:'agent', working:false });

  const refresh = async()=>{
    try{ setLoading(true); const r = await api.get('/users'); setRows(Array.isArray(r.data)? r.data : []); }
    finally{ setLoading(false); }
  };

  React.useEffect(() => {
    const t = localStorage.getItem('token');
    let role = null;
    try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch {}
    if (role !== 'admin') { nav('/'); return; }
    refresh();
  }, [nav, location]);

  const updateRole = async(id, role)=>{
    try{ await api.put(`/users/${id}/role`, { role }); toast('Role updated','success'); refresh(); }
    catch{ toast('Failed to update role','error'); }
  };
  const deleteUser = async(id)=>{
    if (!window.confirm('Remove this user? This cannot be undone.')) return;
    try{ await api.delete(`/users/${id}`); toast('User removed','success'); refresh(); }
    catch{ toast('Failed to remove user','error'); }
  };

  const createUser = async()=>{
    try{
      setModal(m=> ({ ...m, working:true }));
      const { name, email, phone, password, role } = modal;
      if (!name || !email || !password) { toast('Name, Email, Password are required','error'); setModal(m=> ({ ...m, working:false })); return; }
      if (!['agent','manager','driver'].includes(role)) { toast('Invalid role','error'); setModal(m=> ({ ...m, working:false })); return; }
      await api.post('/users', { name, email, phone, password, role });
      toast('User created','success');
      setModal({ open:false, name:'', email:'', phone:'', password:'', role:'agent', working:false });
      refresh();
    }catch{ toast('Failed to create user','error'); setModal(m=> ({ ...m, working:false })); }
  };

  if (loading) return <div className="container py-4">Loading users…</div>;
  const view = managedOnly ? rows.filter(u=> ['agent','manager','driver'].includes(u.role)) : rows;
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Admin — Users</h3>
        <div className="d-flex gap-2">
        <button className="btn btn-outline-primary btn-sm" onClick={()=> setModal({ open:true, name:'', email:'', phone:'', password:'', role:'agent', working:false })}>Add User</button>
        <button className="btn btn-outline-secondary btn-sm" onClick={async()=>{
          try{
            const r = await api.post('/users/seed-manager');
            toast('Manager account ready','success');
            if (r.data?.email && r.data?.password) alert(`Manager seeded/updated.\nEmail: ${r.data.email}\nPassword: ${r.data.password}`);
            refresh();
          }catch{ toast('Failed to seed manager','error'); }
        }}>Seed Manager</button>
        </div>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="managedOnly" checked={managedOnly} onChange={e=>setManagedOnly(e.target.checked)} />
          <label className="form-check-label" htmlFor="managedOnly">Show only Agent / Manager / Driver</label>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle admin-table">
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Action</th><th>Remove</th>
            </tr>
          </thead>
          <tbody>
            {view.map(u=> (
              <tr key={u.user_id}>
                <td>#{u.user_id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone||'—'}</td>
                <td><span className="badge bg-secondary">{u.role}</span></td>
                <td>
                  <div className="btn-group btn-group-sm">
                    {['agent','manager','driver'].map(r=> (
                      <button key={r} className={`btn btn-sm ${u.role===r?'btn-accent':'btn-outline-secondary'}`} disabled={u.role===r} onClick={()=> updateRole(u.user_id, r)}>{r}</button>
                    ))}
                  </div>
                </td>
                <td>
                  <button className="btn btn-outline-danger btn-sm" onClick={()=> deleteUser(u.user_id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{background:'rgba(0,0,0,0.5)', zIndex:1060}} onClick={()=> setModal({ open:false, name:'', email:'', phone:'', password:'', role:'agent', working:false })}>
          <div className="position-absolute top-50 start-50 translate-middle bg-white p-3 rounded-3" style={{width:'min(90vw, 560px)'}} onClick={(e)=>e.stopPropagation()}>
            <div className="fw-semibold mb-2">Add User (Agent / Manager / Driver)</div>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input className="form-control" value={modal.name} onChange={e=>setModal(m=> ({ ...m, name:e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={modal.email} onChange={e=>setModal(m=> ({ ...m, email:e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input className="form-control" value={modal.phone} onChange={e=>setModal(m=> ({ ...m, phone:e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={modal.password} onChange={e=>setModal(m=> ({ ...m, password:e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Role</label>
                <select className="form-select" value={modal.role} onChange={e=>setModal(m=> ({ ...m, role:e.target.value }))}>
                  <option value="agent">agent</option>
                  <option value="manager">manager</option>
                  <option value="driver">driver</option>
                </select>
              </div>
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button className="btn btn-outline-secondary me-2" onClick={()=> setModal({ open:false, name:'', email:'', phone:'', password:'', role:'agent', working:false })}>Close</button>
              <button className="btn btn-accent" disabled={modal.working} onClick={createUser}>{modal.working? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
