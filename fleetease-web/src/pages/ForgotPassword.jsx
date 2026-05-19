import React from 'react';
import api from '../utils/api';

export default function ForgotPassword(){
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e)=>{
    e.preventDefault(); setLoading(true);
    try{
      await api.post('/auth/forgot', { email });
      setSent(true);
    }catch{
      setSent(true); // still show success to avoid enumeration
    }finally{ setLoading(false); }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{background:'linear-gradient(135deg, rgba(13,71,161,0.08), rgba(59,130,246,0.08))'}}>
      <div className="container">
        <div className="mx-auto" style={{maxWidth:480}}>
          <div className="card border-0 shadow">
            <div className="card-body p-4 p-md-5">
              <h3 className="mb-2">Forgot password</h3>
              <p className="text-muted">Enter your account email. If it exists, a reset token will be generated. For now, the token is printed in the backend console.</p>
              {sent ? (
                <div className="alert alert-success">If the email exists, a reset token has been generated. Check the server console for the token.</div>
              ) : (
                <form onSubmit={submit}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={email} onChange={e=>setEmail(e.target.value)} required />
                  </div>
                  <div className="d-grid">
                    <button className="btn btn-accent" disabled={loading}>{loading?'Sending…':'Send reset link'}</button>
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
