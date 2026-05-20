// CRA exposes REACT_APP_* at build time. Also read NEXT_PUBLIC_* for older Vercel configs.
const trim = (value) => (typeof value === 'string' ? value.trim() : '');

function readEnv(...keys) {
  for (const key of keys) {
    const value = trim(process.env[key]);
    if (value) return value;
  }
  return '';
}

function resolveApiUrl() {
  const fromEnv = readEnv('REACT_APP_API_URL', 'NEXT_PUBLIC_API_URL');
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  // Runtime fallback when env was not set at build (e.g. local build + serve)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api/v1';
    }
  }

  return 'https://fleetease-e86s.onrender.com/api/v1';
}

function resolveSocketUrl() {
  const fromEnv = readEnv('REACT_APP_SOCKET_URL', 'NEXT_PUBLIC_SOCKET_URL');
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }

  return 'https://fleetease-e86s.onrender.com';
}

export const API_URL = resolveApiUrl();
export const SOCKET_URL = resolveSocketUrl();
export const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');

export const GOOGLE_MAPS_API_KEY =
  readEnv('REACT_APP_GOOGLE_MAPS_API_KEY', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'REACT_APP_GMAPS_API_KEY') ||
  '';

export const RAZORPAY_KEY_ID =
  readEnv('REACT_APP_RAZORPAY_KEY_ID', 'NEXT_PUBLIC_RAZORPAY_KEY_ID') || '';
