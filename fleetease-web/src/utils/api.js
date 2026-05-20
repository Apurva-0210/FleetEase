import axios from 'axios';
import { API_URL } from '../config/env';

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
export default api;
