import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true, // Required for sending and receiving HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
