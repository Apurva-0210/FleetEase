import React from 'react';
export default function Footer(){
  return (
    <footer className="text-center py-3 mt-auto" style={{background:'#fff'}}>
      <small>© {new Date().getFullYear()} Fleetease</small>
    </footer>
  );
}
