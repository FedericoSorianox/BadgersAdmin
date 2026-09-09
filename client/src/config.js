import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production';

export const API_URL = import.meta.env.VITE_API_URL || (isProduction
    ? 'https://api.gymworkspro.com' // New production subdominio
    : 'http://localhost:5001');

// Global Axios Request Interceptor: Attach Authorization Bearer token automatically
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Global Axios Response Interceptor: Handle session expiration
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response &&
            error.response.status === 401 &&
            typeof window !== 'undefined' &&
            !window.location.pathname.startsWith('/login') &&
            !window.location.pathname.startsWith('/public/')
        ) {
            localStorage.removeItem('token');
            localStorage.removeItem('isAuthenticated');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default API_URL;
