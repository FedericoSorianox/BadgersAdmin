const isProduction = import.meta.env.MODE === 'production';

// List of members exempt from paying fees and should not appear as Active/Pending
// export const EXCLUDED_MEMBERS = []; // Deprecated, moved to DB field isExempt

export const API_URL = import.meta.env.VITE_API_URL || (isProduction
    ? 'https://gymworkspro-be-ur2m7w-a5b16f-187-77-5-193.traefik.me' // New Backend domain
    : 'http://localhost:5001');

export default API_URL;
