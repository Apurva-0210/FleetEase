import React from 'react';
import api from '../../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../../components/Toast';

export default function ManagerFleet(){
  const nav = useNavigate();
  const location = useLocation();
  const [tab, setTab] = React.useState('vehicles'); // drivers | agents | vehicles | documents
  const [data, setData] = React.useState({ drivers:[], agents:[], vehicles:[], documents:[] });
  const [loading, setLoading] = React.useState(true);
  const [docModal, setDocModal] = React.useState({ open:false, id:null, entity_type:'driver', entity_id:'', doc_type:'', doc_number:'', expiry_date:'', file_url:'', notes:'', working:false });
  const [userModal, setUserModal] = React.useState({ open:false, id:null, role:'agent', name:'', email:'', phone:'', password:'', license_number:'', license_expiry:'', working:false });
  const [vehForm, setVehForm] = React.useState({ vehicle_number:'', type:'', capacity:'', status:'available', working:false });

  const refresh = async()=>{
    try{ setLoading(true); const r = await api.get('/manager/summary'); setData(r.data||{drivers:[],agents:[],vehicles:[],documents:[]}); }
    finally{ setLoading(false); }
  };

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'manager' && role !== 'admin') { nav('/'); return; }
    refresh();
  },[nav, location]);

  const editDoc = (d)=> setDocModal({ open:true, id:d?.id||null, entity_type:d?.entity_type||'driver', entity_id:d?.entity_id||'', doc_type:d?.doc_type||'', doc_number:d?.doc_number||'', expiry_date:d?.expiry_date||'', file_url:d?.file_url||'', notes:d?.notes||'', working:false });
  const saveDoc = async()=>{
    try{
      setDocModal(m=> ({ ...m, working:true }));
      const payload = { entity_type: docModal.entity_type, entity_id: Number(docModal.entity_id||0), doc_type:docModal.doc_type, doc_number:docModal.doc_number, expiry_date:docModal.expiry_date||null, file_url:docModal.file_url, notes:docModal.notes };
      if (docModal.id){ await api.put(`/manager/documents/${docModal.id}`, payload); toast('Document updated','success'); }
      else { await api.post('/manager/documents', payload); toast('Document added','success'); }
      setDocModal({ open:false, id:null, entity_type:'driver', entity_id:'', doc_type:'', doc_number:'', expiry_date:'', file_url:'', notes:'', working:false });
      refresh();
    }catch{ toast('Failed to save document','error'); setDocModal(m=> ({ ...m, working:false })); }
  };
  const deleteDoc = async(id)=>{ if(!window.confirm('Delete this document?')) return; try{ await api.delete(`/manager/documents/${id}`); toast('Deleted','success'); refresh(); }catch{ toast('Failed to delete','error'); } };

  const openAddUser = (role)=> setUserModal({ open:true, id:null, role, name:'', email:'', phone:'', password:'', license_number:'', license_expiry:'', working:false });
  const openEditUser = (u)=> setUserModal({ open:true, id:u.user_id, role:u.role, name:u.name||'', email:u.email||'', phone:u.phone||'', password:'', license_number:u.license_number||'', license_expiry:u.license_expiry||'', working:false });
  const saveUser = async()=>{
    try{
      setUserModal(m=> ({ ...m, working:true }));
      const { id, role, name, email, phone, password, license_number, license_expiry } = userModal;
      if (!name || !email || (!id && !password)) { toast('Name, Email and Password (for new) are required','error'); setUserModal(m=> ({ ...m, working:false })); return; }
      if (!['agent','driver'].includes(role)) { toast('Role must be agent or driver','error'); setUserModal(m=> ({ ...m, working:false })); return; }
      if (role==='driver' && !license_number){ toast('License number required for driver','error'); setUserModal(m=> ({ ...m, working:false })); return; }
      if (id){
        await api.put(`/manager/users/${id}`, { name, email, phone, role, license_number, license_expiry });
      }else{
        await api.post('/manager/users', { name, email, phone, password, role, license_number, license_expiry });
      }
      toast(id? 'User updated' : 'User created','success');
      setUserModal({ open:false, id:null, role:'agent', name:'', email:'', phone:'', password:'', license_number:'', license_expiry:'', working:false });
      refresh();
    }catch{ toast('Failed to save user','error'); setUserModal(m=> ({ ...m, working:false })); }
  };
  const removeUser = async(u)=>{ if(!window.confirm('Delete this user?')) return; try{ await api.delete(`/manager/users/${u.user_id}`); toast('Deleted','success'); refresh(); }catch(e){ toast(e?.response?.data?.error || 'Failed to delete','error'); } };

  const Section = ({children})=> (
    <div className="table-responsive">
      <table className="table table-sm align-middle admin-table">
        {children}
      </table>
    </div>
  );

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Manager — Fleet & Compliance</h3>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group me-2">
            {['vehicles','drivers','agents','documents'].map(t=> (
              <button key={t} className={`btn btn-sm ${tab===t?'btn-accent':'btn-outline-secondary'}`} onClick={()=>setTab(t)}>{t}</button>
            ))}
          </div>
          {tab==='drivers' && (
            <button className="btn btn-outline-secondary btn-sm" onClick={()=> openAddUser('driver')}>Add Driver</button>
          )}
          {tab==='agents' && (
            <button className="btn btn-outline-secondary btn-sm" onClick={()=> openAddUser('agent')}>Add Agent</button>
          )}
          {tab==='documents' && (
            <button className="btn btn-outline-secondary btn-sm" onClick={()=>editDoc(null)}>Add document</button>
          )}
        </div>
      </div>
      {loading ? <div>Loading…</div> : (
        <>
          {tab==='vehicles' && (
            <div className="card p-3 mb-3">
              <div className="fw-semibold mb-2">Add Vehicle</div>
              <div className="row g-2 align-items-end">
                <div className="col-md-3">
                  <label className="form-label">Vehicle Number</label>
                  <input className="form-control" placeholder="BR01AB0001" value={vehForm.vehicle_number} onChange={e=> setVehForm(v=>({...v, vehicle_number:e.target.value}))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={vehForm.type} onChange={e=> setVehForm(v=>({...v, type:e.target.value}))}>
                    <option value="">Select type</option>
                    <option>2x2 AC</option>
                    <option>2x2 Non-AC</option>
                    <option>2x1 Lower Sleeper AC</option>
                    <option>2x1 48 seat AC</option>
                    <option>2x1 Lower Sleeper</option>
                    <option>2x2 Seat Sleeper</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Capacity</label>
                  <input className="form-control" type="number" placeholder="40" value={vehForm.capacity} onChange={e=> setVehForm(v=>({...v, capacity:e.target.value}))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={vehForm.status} onChange={e=> setVehForm(v=>({...v, status:e.target.value}))}>
                    <option value="available">available</option>
                    <option value="active">active</option>
                    <option value="maintenance">maintenance</option>
                    <option value="unavailable">unavailable</option>
                  </select>
                </div>
                <div className="col-md-2 d-grid">
                  <button className="btn btn-accent" disabled={vehForm.working} onClick={async()=>{
                    try{
                      setVehForm(v=> ({ ...v, working:true }));
                      if (!vehForm.vehicle_number) { toast('Vehicle number is required','error'); setVehForm(v=> ({ ...v, working:false })); return; }
                      await api.post('/vehicles', { vehicle_number: vehForm.vehicle_number, type: vehForm.type, capacity: vehForm.capacity? Number(vehForm.capacity): null, status: vehForm.status });
                      toast('Vehicle added','success');
                      setVehForm({ vehicle_number:'', type:'', capacity:'', status:'available', working:false });
                      refresh();
                    }catch{ toast('Failed to add vehicle','error'); setVehForm(v=> ({ ...v, working:false })); }
                  }}>{vehForm.working? 'Adding…' : 'Add Vehicle'}</button>
                </div>
              </div>
            </div>
          )}
          {tab==='drivers' && (
            <Section>
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>License</th><th>Expiry</th><th>Action</th></tr></thead>
              <tbody>
                {data.drivers.map(d=> (
                  <tr key={d.user_id}>
                    <td>#{d.user_id}</td>
                    <td>{d.name}</td>
                    <td>{d.email}</td>
                    <td>{d.phone}</td>
                    <td>{d.license_number || '—'}</td>
                    <td>{d.license_expiry || '—'}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={()=> openEditUser(d)}>Edit</button>
                        <button className="btn btn-outline-danger" onClick={()=> removeUser(d)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Section>
          )}
          {tab==='agents' && (
            <Section>
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Agent Code</th><th>Action</th></tr></thead>
              <tbody>
                {data.agents.map(a=> (
                  <tr key={a.user_id}>
                    <td>#{a.user_id}</td>
                    <td>{a.name}</td>
                    <td>{a.email}</td>
                    <td>{a.phone}</td>
                    <td>{a.agent_code||'—'}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={()=> openEditUser(a)}>Edit</button>
                        <button className="btn btn-outline-danger" onClick={()=> removeUser(a)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Section>
          )}
          {tab==='vehicles' && (
            <Section>
              <thead><tr><th>#</th><th>Vehicle</th><th>Type</th><th>Capacity</th><th>Status</th><th>FASTag</th><th>Assign Driver</th><th>Manage</th></tr></thead>
              <tbody>
                {data.vehicles.map(v=> (
                  <tr key={v.vehicle_id}>
                    <td>#{v.vehicle_id}</td>
                    <td>
                      {v.vehicle_number}
                      {String(v.fastag_status||'').toLowerCase()==='active' && (
                        <span className="badge bg-success ms-2">FASTag</span>
                      )}
                    </td>
                    <td>{v.type}</td>
                    <td>{v.capacity}</td>
                    <td><span className="badge bg-light text-dark">{v.status || 'active'}</span></td>
                    <td>
                      <div className="row g-1 align-items-center" style={{minWidth:320}}>
                        <div className="col-4">
                          <input className="form-control form-control-sm" placeholder="Issuer" defaultValue={v.fastag_issuer||''} onChange={e=> v._fastag_issuer = e.target.value} />
                        </div>
                        <div className="col-5">
                          <input className="form-control form-control-sm" placeholder="Tag ID" defaultValue={v.fastag_tag_id||''} onChange={e=> v._fastag_tag_id = e.target.value} />
                        </div>
                        <div className="col-3">
                          <select className="form-select form-select-sm" defaultValue={v.fastag_status || ''} onChange={e=> v._fastag_status = e.target.value}>
                            <option value="">status</option>
                            <option value="active">active</option>
                            <option value="blocked">blocked</option>
                            <option value="pending">pending</option>
                          </select>
                        </div>
                        <div className="col-12 d-grid">
                          <button className="btn btn-outline-secondary btn-sm" onClick={async()=>{
                            try{
                              const payload = {
                                fastag_issuer: v._fastag_issuer!==undefined? v._fastag_issuer : (v.fastag_issuer||''),
                                fastag_tag_id: v._fastag_tag_id!==undefined? v._fastag_tag_id : (v.fastag_tag_id||''),
                                fastag_status: v._fastag_status!==undefined? v._fastag_status : (v.fastag_status||'')
                              };
                              await api.put(`/vehicles/${v.vehicle_id}/fastag`, payload);
                              toast('FASTag updated','success');
                              refresh();
                            }catch{ toast('Failed to update FASTag','error'); }
                          }}>Save</button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <select className="form-select form-select-sm" defaultValue={v.assigned_driver_id || v.driver_user_id || ''} onChange={e=> v._nextDriver = e.target.value} style={{width:220}}>
                          <option value="">— Unassigned —</option>
                          {data.drivers.map(d=> (
                            <option key={d.user_id} value={d.user_id}>{d.name} #{d.user_id}</option>
                          ))}
                        </select>
                        <button className="btn btn-outline-secondary btn-sm" onClick={async()=>{
                          try{
                            const did = v._nextDriver ? Number(v._nextDriver) : null;
                            await api.put(`/vehicles/${v.vehicle_id}/assign`, { driver_user_id: did });
                            toast('Driver assignment updated','success');
                            refresh();
                          }catch{ toast('Failed to assign','error'); }
                        }}>Assign</button>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <select className="form-select form-select-sm" defaultValue={v.status || 'active'} onChange={e=> v._nextStatus = e.target.value} style={{width:160}}>
                          <option value="active">active</option>
                          <option value="maintenance">maintenance</option>
                          <option value="unavailable">unavailable</option>
                        </select>
                        <button className="btn btn-outline-secondary btn-sm" onClick={async()=>{
                          try{
                            const s = v._nextStatus || v.status || 'active';
                            await api.put(`/vehicles/${v.vehicle_id}/status`, { status: s });
                            toast('Status updated','success');
                            refresh();
                          }catch{ toast('Failed to update','error'); }
                        }}>Update</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={async()=>{
                          if (!window.confirm('Delete this vehicle?')) return;
                          try{ await api.delete(`/vehicles/${v.vehicle_id}`); toast('Vehicle removed','success'); refresh(); }
                          catch(e){ toast(e?.response?.data?.error || 'Failed to delete vehicle','error'); }
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Section>
          )}
          {tab==='documents' && (
            <>
              <Section>
                <thead><tr><th>#</th><th>Entity</th><th>Entity ID</th><th>Type</th><th>Number</th><th>Expiry</th><th>File</th><th>Notes</th><th>Action</th></tr></thead>
                <tbody>
                  {data.documents.map(d=> (
                    <tr key={d.id}>
                      <td>#{d.id}</td>
                      <td>{d.entity_type}</td>
                      <td>{d.entity_id}</td>
                      <td>{d.doc_type||'—'}</td>
                      <td>{d.doc_number||'—'}</td>
                      <td>{d.expiry_date||'—'}</td>
                      <td>{d.file_url? <a href={d.file_url} target="_blank" rel="noreferrer">Open</a> : '—'}</td>
                      <td className="small text-muted" style={{maxWidth:240}}>{d.notes||'—'}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-secondary" onClick={()=>editDoc(d)}>Edit</button>
                          <button className="btn btn-outline-danger" onClick={()=>deleteDoc(d.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Section>
            </>
          )}
        </>
      )}

      {docModal.open && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{background:'rgba(0,0,0,0.5)', zIndex:1060}} onClick={()=> setDocModal({ open:false, id:null, entity_type:'driver', entity_id:'', doc_type:'', doc_number:'', expiry_date:'', file_url:'', notes:'', working:false })}>
          <div className="position-absolute top-50 start-50 translate-middle bg-white p-3 rounded-3" style={{width:'min(90vw, 560px)'}} onClick={(e)=>e.stopPropagation()}>
            <div className="fw-semibold mb-2">{docModal.id? 'Edit' : 'Add'} Document</div>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label">Entity type</label>
                <select className="form-select" value={docModal.entity_type} onChange={e=>setDocModal(m=> ({ ...m, entity_type:e.target.value }))}>
                  <option value="driver">driver</option>
                  <option value="agent">agent</option>
                  <option value="vehicle">vehicle</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Entity ID</label>
                <input className="form-control" value={docModal.entity_id} onChange={e=>setDocModal(m=> ({ ...m, entity_id:e.target.value }))} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Doc type</label>
                <input className="form-control" value={docModal.doc_type} onChange={e=>setDocModal(m=> ({ ...m, doc_type:e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Doc number</label>
                <input className="form-control" value={docModal.doc_number} onChange={e=>setDocModal(m=> ({ ...m, doc_number:e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Expiry date</label>
                <input className="form-control" type="date" value={docModal.expiry_date||''} onChange={e=>setDocModal(m=> ({ ...m, expiry_date:e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label">File URL</label>
                <input className="form-control" placeholder="https://..." value={docModal.file_url} onChange={e=>setDocModal(m=> ({ ...m, file_url:e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={3} value={docModal.notes} onChange={e=>setDocModal(m=> ({ ...m, notes:e.target.value }))} />
              </div>
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button className="btn btn-outline-secondary me-2" onClick={()=> setDocModal({ open:false, id:null, entity_type:'driver', entity_id:'', doc_type:'', doc_number:'', expiry_date:'', file_url:'', notes:'', working:false })}>Close</button>
              <button className="btn btn-accent" disabled={docModal.working} onClick={saveDoc}>{docModal.working? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {userModal.open && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{background:'rgba(0,0,0,0.5)', zIndex:1060}} onClick={()=> setUserModal({ open:false, id:null, role:'agent', name:'', email:'', phone:'', password:'', license_number:'', license_expiry:'', working:false })}>
          <div className="position-absolute top-50 start-50 translate-middle bg-white p-3 rounded-3" style={{width:'min(90vw, 560px)'}} onClick={(e)=>e.stopPropagation()}>
            <div className="fw-semibold mb-2">{userModal.id? 'Edit' : 'Add'} {userModal.role==='driver'? 'Driver' : 'Agent'}</div>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input className="form-control" value={userModal.name} onChange={e=>setUserModal(m=> ({ ...m, name:e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={userModal.email} onChange={e=>setUserModal(m=> ({ ...m, email:e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input className="form-control" value={userModal.phone} onChange={e=>setUserModal(m=> ({ ...m, phone:e.target.value }))} />
              </div>
              {!userModal.id && (
                <div className="col-md-6">
                  <label className="form-label">Password</label>
                  <input className="form-control" type="password" value={userModal.password} onChange={e=>setUserModal(m=> ({ ...m, password:e.target.value }))} />
                </div>
              )}
              <div className="col-md-6">
                <label className="form-label">Role</label>
                <select className="form-select" value={userModal.role} onChange={e=>setUserModal(m=> ({ ...m, role:e.target.value }))}>
                  <option value="agent">agent</option>
                  <option value="driver">driver</option>
                </select>
              </div>
              {userModal.role==='driver' && (
                <>
                  <div className="col-md-6">
                    <label className="form-label">License number</label>
                    <input className="form-control" value={userModal.license_number} onChange={e=>setUserModal(m=> ({ ...m, license_number:e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">License expiry</label>
                    <input className="form-control" type="date" value={userModal.license_expiry} onChange={e=>setUserModal(m=> ({ ...m, license_expiry:e.target.value }))} />
                  </div>
                </>
              )}
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button className="btn btn-outline-secondary me-2" onClick={()=> setUserModal({ open:false, id:null, role:'agent', name:'', email:'', phone:'', password:'', license_number:'', license_expiry:'', working:false })}>Close</button>
              <button className="btn btn-accent" disabled={userModal.working} onClick={saveUser}>{userModal.working? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
