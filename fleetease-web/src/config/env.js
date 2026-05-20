// CRA only exposes REACT_APP_* at build time. Also read NEXT_PUBLIC_* for Vercel configs set before the rename.
const trim = (value) => (typeof value === 'string' ? value.trim() : '');

function readEnv(...keys) {
  for (const key of keys) {
    const value = trim(process.env[key]);
    if (value) return value;
  }
  return '';
}

export const API_URL =
  readEnv('REACT_APP_API_URL', 'NEXT_PUBLIC_API_URL') ||
  'http://localhost:5000/api/v1';

export const SOCKET_URL =
  readEnv('REACT_APP_SOCKET_URL', 'NEXT_PUBLIC_SOCKET_URL') ||
  'http://localhost:5000';

export const GOOGLE_MAPS_API_KEY =
  readEnv('REACT_APP_GOOGLE_MAPS_API_KEY', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'REACT_APP_GMAPS_API_KEY') ||
  '';

export const RAZORPAY_KEY_ID =
  readEnv('REACT_APP_RAZORPAY_KEY_ID', 'NEXT_PUBLIC_RAZORPAY_KEY_ID') || '';
