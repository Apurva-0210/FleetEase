import React from 'react';
import api from '../../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../../components/Toast';

export default function AdminCorporateApprovals(){
  const nav = useNavigate();
  const location = useLocation();
  const [status, setStatus] = React.useState('pending');
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState({ open:false, item:null, working:false });

  const refresh = async()=>{
    try{
      setLoading(true);
      const r = await api.get(`/corp-bookings${status?`?status=${status}`:''}`);
      setRows(Array.isArray(r.data)? r.data : []);
    } catch {
      setRows([]);
    } finally{ setLoading(false); }
  };

  React.useEffect(() => {
    const t = localStorage.getItem('token');
    let role = null;
    try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch {}
    if (role !== 'admin') { nav('/'); return; }
    refresh();
  }, [status, nav, location]);

  const approve = async(id, assigned_vehicle_id, admin_notes)=>{
    try{ setModal(m=> ({ ...m, working:true })); await api.put(`/corp-bookings/${id}/approve`, { assigned_vehicle_id, admin_notes }); toast('Approved','success'); setModal({ open:false, item:null, working:false }); refresh(); }
    catch{ toast('Failed to approve','error'); setModal(m=> ({ ...m, working:false })); }
  };
  const reject = async(id, admin_notes)=>{
    try{ setModal(m=> ({ ...m, working:true })); await api.put(`/corp-bookings/${id}/reject`, { admin_notes }); toast('Rejected','success'); setModal({ open:false, item:null, working:false }); refresh(); }
    catch{ toast('Failed to reject','error'); setModal(m=> ({ ...m, working:false })); }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Admin — Corporate Approvals</h3>
        <div className="btn-group">
          {['pending','approved','rejected'].map(s=> (
            <button key={s} className={`btn btn-sm ${status===s?'btn-accent':'btn-outline-secondary'}`} onClick={()=>setStatus(s)}>{s}</button>
          ))}
        </div>
      </div>
      {loading ? <div>Loading…</div> : (
        <div className="table-responsive">
          <table className="table table-sm align-middle admin-table">
            <thead>
              <tr>
                <th>#</th><th>Company</th><th>Bus type</th><th>Trip</th><th>Dates</th><th>Days</th><th>Total</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>#{r.company_user_id}</td>
                  <td>{r.bus_type}</td>
                  <td>{r.trip_type}</td>
                  <td className="small">{r.start_date || '—'} → {r.end_date || '—'}</td>
                  <td>{r.travel_days}</td>
                  <td>₹{r.estimated_total}</td>
                  <td><span className={`badge ${r.status==='approved'?'bg-success': r.status==='rejected'?'bg-danger':'bg-secondary'}`}>{r.status}</span></td>
                  <td>
                    {r.status==='pending' ? (
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-success" onClick={()=> setModal({ open:true, item:r, working:false })}>Approve</button>
                        <button className="btn btn-outline-danger" onClick={()=> setModal({ open:true, item:{...r, _reject:true}, working:false })}>Reject</button>
                      </div>
                    ) : <span className="text-muted small">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{background:'rgba(0,0,0,0.5)', zIndex:1060}} onClick={()=> setModal({ open:false, item:null, working:false })}>
          <div className="position-absolute top-50 start-50 translate-middle bg-white p-3 rounded-3" style={{width:'min(90vw, 560px)'}} onClick={(e)=>e.stopPropagation()}>
            {!modal.item? null : modal.item._reject ? (
              <RejectForm modal={modal} setModal={setModal} onSubmit={reject} />
            ) : (
              <ApproveForm modal={modal} setModal={setModal} onSubmit={approve} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ApproveForm({ modal, setModal, onSubmit }){
  const [vehicle, setVehicle] = React.useState('');
  const [notes, setNotes] = React.useState('Approved');
  return (
    <>
      <div className="fw-semibold mb-2">Approve Request #{modal.item?.id}</div>
      <div className="mb-2 small text-muted">Assign a vehicle (optional) and add notes.</div>
      <div className="mb-2">
        <label className="form-label">Assigned vehicle ID</label>
        <input className="form-control" value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="e.g. 5" />
      </div>
      <div className="mb-3">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} />
      </div>
      <div className="d-flex justify-content-end">
        <button className="btn btn-outline-secondary me-2" onClick={()=> setModal({ open:false, item:null, working:false })}>Close</button>
        <button className="btn btn-success" disabled={modal.working} onClick={()=> onSubmit(modal.item.id, vehicle? Number(vehicle): null, notes)}>{modal.working? 'Approving…' : 'Approve'}</button>
      </div>
    </>
  );
}

function RejectForm({ modal, setModal, onSubmit }){
  const [notes, setNotes] = React.useState('Rejected');
  return (
    <>
      <div className="fw-semibold mb-2">Reject Request #{modal.item?.id}</div>
      <div className="mb-3">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={4} value={notes} onChange={e=>setNotes(e.target.value)} />
      </div>
      <div className="d-flex justify-content-end">
        <button className="btn btn-outline-secondary me-2" onClick={()=> setModal({ open:false, item:null, working:false })}>Close</button>
        <button className="btn btn-danger" disabled={modal.working} onClick={()=> onSubmit(modal.item.id, notes)}>{modal.working? 'Rejecting…' : 'Reject'}</button>
      </div>
    </>
  );
}
