import React, { useState } from 'react';
import api from '../utils/api';
import { toast } from '../components/Toast';

export default function Contact(){
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [phone,setPhone]=useState('');
  const [message,setMessage]=useState('');
  const [ok,setOk]=useState(false);
  const submit=async(e)=>{ e.preventDefault(); setOk(false); try{ await api.post('/contact',{name,email,phone,message}); setOk(true); setName(''); setEmail(''); setPhone(''); setMessage(''); toast('Message sent successfully','success'); }catch(_){ toast('Failed to send message','error'); } };
  return (
    <div className="container py-4">
      <h3 className="mb-3">Contact Us</h3>
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="row g-3">
            <div className="col-12">
              <div className="card h-100 p-3">
                <div className="fw-bold mb-1">Owner</div>
                <div className="small text-muted">Primary contact</div>
                <div className="mt-2">Name: <span className="fw-semibold">Rahul Sharma</span></div>
                <div>Email: <a href="mailto:owner@fleetease.com">owner@fleetease.com</a></div>
                <div>Phone: <a href="tel:+919999000001">+91 99990 00001</a></div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 p-3">
                <div className="fw-bold mb-1">Manager</div>
                <div className="small text-muted">Operations</div>
                <div className="mt-2">Name: <span className="fw-semibold">Anita Verma</span></div>
                <div>Email: <a href="mailto:manager@fleetease.com">manager@fleetease.com</a></div>
                <div>Phone: <a href="tel:+919999000002">+91 99990 00002</a></div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 p-3">
                <div className="fw-bold mb-1">Agent</div>
                <div className="small text-muted">Bookings & Support</div>
                <div className="mt-2">Name: <span className="fw-semibold">Sandeep Kumar</span></div>
                <div>Email: <a href="mailto:agent@fleetease.com">agent@fleetease.com</a></div>
                <div>Phone: <a href="tel:+919999000003">+91 99990 00003</a></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="p-3">
              <div className="fw-bold mb-1">Office Location</div>
              <div className="small text-muted">Visit or write to us</div>
              <div className="mt-2">Fleetease HQ, 2nd Floor, Sector 62, Noida, Uttar Pradesh 201301</div>
            </div>
            <div className="ratio ratio-16x9">
              <iframe title="office-map" src="https://maps.google.com/maps?q=Sector%2062%20Noida&z=14&output=embed" style={{ border:0 }} allowFullScreen />
            </div>
          </div>
        </div>
      </div>
      {ok && <div className="alert alert-success">Thanks! We received your message.</div>}
      <div style={{maxWidth:760}}>
        <div className="card border-0 shadow-sm rounded-3">
          <div className="card-body p-3 p-md-4">
            <div className="mb-3">
              <div className="h5 mb-0">Send us a message</div>
              <div className="text-muted small">We typically respond within 1 business day.</div>
            </div>
            <form onSubmit={submit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="form-floating">
                    <input id="c-name" className="form-control" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} required/>
                    <label htmlFor="c-name">Name<span className="text-danger"> *</span></label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-floating">
                    <input id="c-email" type="email" className="form-control" placeholder="name@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
                    <label htmlFor="c-email">Email</label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-floating">
                    <input id="c-phone" type="tel" className="form-control" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} required/>
                    <label htmlFor="c-phone">Phone<span className="text-danger"> *</span></label>
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-floating">
                    <textarea id="c-msg" className="form-control" style={{height: 140}} placeholder="Your message" value={message} onChange={e=>setMessage(e.target.value)} required/>
                    <label htmlFor="c-msg">Message<span className="text-danger"> *</span></label>
                  </div>
                  <div className="form-text">Please include booking reference if applicable.</div>
                </div>
              </div>
              <div className="mt-3 d-flex justify-content-end">
                <button className="btn btn-accent">Submit</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
