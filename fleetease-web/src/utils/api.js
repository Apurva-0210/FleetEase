import axios from 'axios';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config)=>{ const t = localStorage.getItem('token'); if (t) config.headers.Authorization = `Bearer ${t}`; return config; });
export default api;
