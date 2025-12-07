const isProduction = import.meta.env.MODE === 'production';

export const API_URL = isProduction
    ? 'https://badgersadmin-backend.onrender.com' // Production URL
    : 'http://localhost:5001';

export default API_URL;
