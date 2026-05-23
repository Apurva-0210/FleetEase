import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';

function TabHeader({tab, setTab}){
  return (
    <ul className="nav nav-tabs mb-3">
      {['fuel','permit'].map(t=> (
        <li className="nav-item" key={t}>
          <button className={`nav-link ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t.toUpperCase()}</button>
        </li>
      ))}
    </ul>
  );
}

function FuelForm({onSave}){
  const [f, setF] = React.useState({ vehicle_id:'', liters:'', price_per_liter:'', total:'', station:'', receipt_no:'', payment_mode:'Cash', billed_at:'' });
  const submit = async (e)=>{ e.preventDefault(); await onSave(f); setF({...f, liters:'', price_per_liter:'', total:'', station:'', receipt_no:''}); };
  return (
    <form onSubmit={submit} className="row g-2">
      <div className="col-2"><input className="form-control" placeholder="Vehicle ID" value={f.vehicle_id} onChange={e=>setF({...f, vehicle_id:e.target.value})}/></div>
      <div className="col-2"><input className="form-control" placeholder="Liters" value={f.liters} onChange={e=>setF({...f, liters:e.target.value})}/></div>
      <div className="col-2"><input className="form-control" placeholder="Price/L" value={f.price_per_liter} onChange={e=>setF({...f, price_per_liter:e.target.value})}/></div>
      <div className="col-2"><input className="form-control" placeholder="Total" value={f.total} onChange={e=>setF({...f, total:e.target.value})}/></div>
      <div className="col-2"><input className="form-control" placeholder="Station" value={f.station} onChange={e=>setF({...f, station:e.target.value})}/></div>
      <div className="col-2"><input className="form-control" placeholder="Receipt" value={f.receipt_no} onChange={e=>setF({...f, receipt_no:e.target.value})}/></div>
      <div className="col-2"><select className="form-select" value={f.payment_mode} onChange={e=>setF({...f, payment_mode:e.target.value})}><option>Cash</option><option>Card</option><option>UPI</option></select></div>
      <div className="col-3"><input type="datetime-local" className="form-control" value={f.billed_at} onChange={e=>setF({...f, billed_at:e.target.value})}/></div>
      <div className="col-2"><button className="btn btn-accent">Add Fuel</button></div>
    </form>
  );
}

function PermitForm({onSave}){
  const [f, setF] = React.useState({ route_id:'', state:'', amount:'', valid_from:'', valid_to:'', receipt_no:'', payment_mode:'Cash', billed_at:'' });
  const submit = async (e)=>{ e.preventDefault(); await onSave(f); };
  return (
    <form onSubmit={submit} className="row g-2">
      <div className="col-2"><input className="form-control" placeholder="Route ID" value={f.route_id} onChange={e=>setF({...f, route_id:e.target.value})}/></div>
      <div className="col-2"><input className="form-control" placeholder="State" value={f.state} onChange={e=>setF({...f, state:e.target.value})}/></div>
      <div className="col-2"><input className="form-control" placeholder="Amount" value={f.amount} onChange={e=>setF({...f, amount:e.target.value})}/></div>
      <div className="col-2"><input type="date" className="form-control" value={f.valid_from} onChange={e=>setF({...f, valid_from:e.target.value})}/></div>
      <div className="col-2"><input type="date" className="form-control" value={f.valid_to} onChange={e=>setF({...f, valid_to:e.target.value})}/></div>
      <div className="col-2"><input className="form-control" placeholder="Receipt" value={f.receipt_no} onChange={e=>setF({...f, receipt_no:e.target.value})}/></div>
      <div className="col-2"><select className="form-select" value={f.payment_mode} onChange={e=>setF({...f, payment_mode:e.target.value})}><option>Cash</option><option>Card</option><option>UPI</option></select></div>
      <div className="col-3"><input type="datetime-local" className="form-control" value={f.billed_at} onChange={e=>setF({...f, billed_at:e.target.value})}/></div>
      <div className="col-2"><button className="btn btn-accent">Add Permit</button></div>
    </form>
  );
}

export default function Bills(){
  const [tab, setTab] = React.useState('fuel');
  const [fuel, setFuel] = React.useState([]);
  const [permit, setPermit] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const nav = useNavigate();
  const location = useLocation();

  const refresh = async ()=>{
    setLoading(true);
    try{
      const qs = new URLSearchParams({ start, end });
      const [fb, pb] = await Promise.all([
        api.get(`/bills/fuel?${qs.toString()}`), api.get(`/bills/permit?${qs.toString()}`)
      ]);
      setFuel(fb.data||[]); setPermit(pb.data||[]);
    } catch {
      setFuel([]); setPermit([]);
    } finally { setLoading(false); }
  };

  React.useEffect(()=>{
    const t = localStorage.getItem('token');
    let role = null; try { role = t ? JSON.parse(atob(t.split('.')[1]))?.role : null; } catch{}
    if (role !== 'admin') { nav('/'); return; }
    refresh();
  },[nav, location]);

  const create = async (type, payload)=>{
    await api.post(`/bills/${type}`, payload);
    await refresh();
  };
  const remove = async (type, id)=>{ await api.delete(`/bills/${type}/${id}`); await refresh(); };

  const totalFor = (rows, type)=> rows.reduce((sum, r)=> sum + Number(r.total || r.amount || 0), 0);

  const exportCSV = (rows, type)=>{
    const headersByType = {
      fuel: ['bill_id','vehicle_id','liters','price_per_liter','total','station','receipt_no','payment_mode','billed_at'],
      permit: ['bill_id','route_id','state','amount','valid_from','valid_to','receipt_no','payment_mode','billed_at']
    };
    const headers = headersByType[type];
    const lines = [headers.join(',')];
    rows.forEach(r=>{
      const line = headers.map(h=> {
        const v = r[h] ?? '';
        const s = String(v).replaceAll('"','""');
        return `"${s}"`;
      }).join(',');
      lines.push(line);
    });
    const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type}_bills.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const printTable = ()=>{
    window.print();
  };

  const Table = ({rows, type})=> (
    <div className="table-responsive mt-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="fw-bold">Total: ₹{totalFor(rows, type)}</div>
        <div>
          <button className="btn btn-outline-secondary btn-sm me-2" onClick={()=>exportCSV(rows, type)}>Export CSV</button>
          <button className="btn btn-outline-secondary btn-sm" onClick={printTable}>Print / PDF</button>
        </div>
      </div>
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>ID</th><th>Details</th><th>Amount</th><th>Receipt</th><th>Mode</th><th>When</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=> (
            <tr key={r.bill_id}>
              <td>#{r.bill_id}</td>
              <td className="small">
                {type==='fuel' && (<div>Veh {r.vehicle_id} • {r.liters}L @ ₹{r.price_per_liter}/L • {r.station}</div>)}
                {type==='permit' && (<div>Route {r.route_id} • {r.state} • {r.valid_from} → {r.valid_to}</div>)}
              </td>
              <td>₹{r.total || r.amount}</td>
              <td>{r.receipt_no || '—'}</td>
              <td>{r.payment_mode || '—'}</td>
              <td>{r.billed_at ? new Date(r.billed_at).toLocaleString() : '—'}</td>
              <td><button className="btn btn-outline-danger btn-sm" onClick={()=>remove(type, r.bill_id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container py-4">
      <h3 className="mb-3">Admin — Bills</h3>
      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto">
          <label className="form-label">Start</label>
          <input type="date" className="form-control" value={start} onChange={e=>setStart(e.target.value)} />
        </div>
        <div className="col-auto">
          <label className="form-label">End</label>
          <input type="date" className="form-control" value={end} onChange={e=>setEnd(e.target.value)} />
        </div>
      </div>
      <TabHeader tab={tab} setTab={setTab} />

      {tab==='fuel' && (
        <>
          <FuelForm onSave={(p)=>create('fuel',p)} />
          {loading? <div className="mt-3">Loading…</div> : <Table rows={fuel} type="fuel" />}
        </>
      )}
      {tab==='permit' && (
        <>
          <PermitForm onSave={(p)=>create('permit',p)} />
          {loading? <div className="mt-3">Loading…</div> : <Table rows={permit} type="permit" />}
        </>
      )}
    </div>
  );
}
