import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { FiPhone } from 'react-icons/fi';

export default function Navbar(){
  const nav = useNavigate();
  const token = localStorage.getItem('token');
  let role = null;
  if (token) { try { role = JSON.parse(atob(token.split('.')[1]))?.role || null; } catch(_){} }
  const [me, setMe] = React.useState(null);
  React.useEffect(()=>{
    if (!token) { setMe(null); return; }
    (async()=>{ try { const r = await api.get('/auth/me'); setMe(r.data||null); } catch{ setMe(null); } })();
  },[token]);
  const logout = ()=>{ localStorage.removeItem('token'); nav('/'); };
  return (
    <nav className="navbar navbar-expand-lg navbar-dark px-3">
      <Link className="navbar-brand fw-bold" to="/">Fleetease</Link>
      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarsExample">
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarsExample">
        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
          {role==='admin' && (
            <>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/dashboard">Dashboard</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/schedules">Schedules</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/vehicles">Vehicles</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/bookings">Bookings</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/users">Users</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/tolls">Tolls</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/bills">Bills</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/refunds">Refunds</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/corporate">Corporate</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/contacts">Contacts</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/admin/gallery">Gallery</NavLink></li>
            </>
          )}
          {role==='agent' && (
            <>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/agent/trips">Trips</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/agent/dashboard">Dashboard</NavLink></li>
            </>
          )}
          {role==='driver' && (
            <>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/driver/dashboard">Dashboard</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/driver/routes">Routes</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/driver/seats">Seats</NavLink></li>
            </>
          )}
          {role==='manager' && (
            <>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/manager/fleet">Fleet</NavLink></li>
            </>
          )}
          {role==='company_admin' && (
            <>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/company/charter">Charter</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/company/requests">Requests</NavLink></li>
            </>
          )}
          {(!role || role==='customer') && (
            <>
              {!role && <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/">Home</NavLink></li>}
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/search">Trips</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/gallery">Gallery</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/testimonials">Reviews</NavLink></li>
              <li className="nav-item"><NavLink className={({isActive})=>`nav-link ${isActive?'active':''}`} to="/contact">Contact Us</NavLink></li>
            </>
          )}
          {role==='customer' && (
            <>
              <li className="nav-item"><Link className="nav-link" to="/my-bookings">My Bookings</Link></li>
            </>
          )}
        </ul>
        <div className="d-flex align-items-center gap-2">
          <div className="d-none d-md-flex align-items-center px-2 py-1 rounded-pill bg-light text-dark">
            <FiPhone className="me-1" /> <a href="tel:+912067186800" className="text-decoration-none text-dark">(020) 67186800</a>
          </div>
          {!token ? (
            <>
              <Link className="btn btn-outline-light me-2" to="/login">Login</Link>
              <Link className="btn btn-accent" to="/register">Register</Link>
            </>
          ) : (
            <div className="dropdown">
              <button className="btn btn-outline-light dropdown-toggle" data-bs-toggle="dropdown">
                {me?.name || me?.email || 'Profile'}
              </button>
              <div className="dropdown-menu dropdown-menu-end p-2" style={{ minWidth: 240 }}>
                <div className="px-2 py-1">
                  <div className="fw-semibold">{me?.name || '—'}</div>
                  <div className="small text-muted">{me?.email}</div>
                  <div className="badge bg-secondary mt-1">{role || me?.role}</div>
                </div>
                <div><hr className="dropdown-divider"/></div>
                <Link className="dropdown-item" to="/profile">Profile</Link>
                <button className="dropdown-item text-danger" onClick={logout}>Logout</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
