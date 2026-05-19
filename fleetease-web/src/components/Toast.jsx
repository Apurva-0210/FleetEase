import React from 'react';

export default function ToastHost(){
  const [toasts, setToasts] = React.useState([]);
  React.useEffect(()=>{
    const handler = (e)=>{
      const detail = e.detail || {};
      const id = Math.random().toString(36).slice(2);
      setToasts(ts=> [...ts, { id, ...detail }]);
      setTimeout(()=> setToasts(ts=> ts.filter(t=> t.id!==id)), detail.duration || 3000);
    };
    window.addEventListener('toast', handler);
    return ()=> window.removeEventListener('toast', handler);
  },[]);
  return (
    <div style={{position:'fixed', right:12, top:70, zIndex:2000, display:'grid', gap:8}}>
      {toasts.map(t=> (
        <div key={t.id} className={`alert ${t.variant==='error'?'alert-danger': t.variant==='success'?'alert-success':'alert-secondary'} shadow-sm mb-0 py-2 px-3`}>{t.message||'Done'}</div>
      ))}
    </div>
  );
}

export const toast = (message, variant='success', duration=3000)=>{
  const ev = new CustomEvent('toast', { detail: { message, variant, duration } });
  window.dispatchEvent(ev);
};
