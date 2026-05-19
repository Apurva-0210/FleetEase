import axios from 'axios';
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const api = axios.create({ baseURL: API });
api.interceptors.request.use((config)=>{ const t = localStorage.getItem('token'); if (t) config.headers.Authorization = `Bearer ${t}`; return config; });
export default api;
