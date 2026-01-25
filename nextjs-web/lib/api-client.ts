import axios from 'axios';
import { getApiUrl } from './get-api-url';

// const apiClient = axios.create({
//   // baseURL: getApiUrl(),
//   baseURL: '/api', // Use relative URL for Next.js API routes
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });
const apiClient = axios.create({
  baseURL: getApiUrl(), // Call backend API directly
  // baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});


apiClient.interceptors.request.use(
  (config) => {
    // Try to get token from localStorage first, then cookies
    let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    // If not in localStorage, try cookies (for SSR/server-side requests)
    if (!token && typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
      if (accessTokenCookie) {
        token = accessTokenCookie.split('=')[1];
      }
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${getApiUrl()}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Logout if refresh fails
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else {
          // No refresh token, force logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
             window.location.href = '/login';
          }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
