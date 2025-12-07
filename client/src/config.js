const isProduction = import.meta.env.MODE === 'production';

export const API_URL = isProduction
    ? 'YOUR_DEPLOYED_BACKEND_URL_HERE' // TODO: Replace with your actual deployed backend URL
    : 'http://localhost:5001';

export default API_URL;
