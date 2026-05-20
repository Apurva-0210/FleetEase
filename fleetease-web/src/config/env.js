// CRA only exposes env vars prefixed with REACT_APP_ at build time.
const trim = (value) => (typeof value === 'string' ? value.trim() : '');

export const API_URL =
  trim(process.env.REACT_APP_API_URL) || 'http://localhost:5000/api/v1';

export const SOCKET_URL =
  trim(process.env.REACT_APP_SOCKET_URL) || 'http://localhost:5000';

export const GOOGLE_MAPS_API_KEY =
  trim(process.env.REACT_APP_GOOGLE_MAPS_API_KEY) ||
  trim(process.env.REACT_APP_GMAPS_API_KEY) ||
  '';

export const RAZORPAY_KEY_ID = trim(process.env.REACT_APP_RAZORPAY_KEY_ID) || '';
