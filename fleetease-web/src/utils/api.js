import axios from 'axios';
import { API_URL } from '../config/env';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
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
  },
  (error) => {
    if (!error.response) {
      error.message =
        'Cannot reach API server. Start backend: cd fleetease-backend && npm run dev';
    }
    return Promise.reject(error);
  }
);

export default api;
