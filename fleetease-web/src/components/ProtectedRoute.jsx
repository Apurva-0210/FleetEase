import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ role, roles, children }){
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token.split('.')[1])) : null;
  if (!token) return <Navigate to="/login" replace />;
  const allowed = roles || role;
  if (allowed){
    const arr = Array.isArray(allowed) ? allowed : [allowed];
    if (!arr.includes(user?.role)){
      // redirect to user's landing
      const r = user?.role;
      const map = {
        admin: '/admin/dashboard',
        agent: '/agent/trips',
        driver: '/driver/dashboard',
        manager: '/manager/fleet',
        company_admin: '/company/charter',
        customer: '/my-bookings',
      };
      return <Navigate to={map[r] || '/'} replace />;
    }
  }
  return children;
}
