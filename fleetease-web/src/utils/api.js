import axios from 'axios';
import { API_URL } from '../config/env';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Unwrap { success: true, data: ... } list/object responses (not login payloads with token)
api.interceptors.response.use((response) => {
  const body = response.data;
  if (
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    body.success === true &&
    Object.prototype.hasOwnProperty.call(body, 'data') &&
    !Object.prototype.hasOwnProperty.call(body, 'token')
  ) {
    response.data = body.data;
  }
  return response;
});

export default api;
