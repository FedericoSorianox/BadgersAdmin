const isProduction = import.meta.env.MODE === 'production';

// List of members exempt from paying fees and should not appear as Active/Pending
export const EXCLUDED_MEMBERS = [
    'Federico Soriano',
    'Gonzalo Fernandez',
    'Uiller Aguero',
    'Andrea Lostorto',
    'Guillermo Viera',
    'Mariana Peralta'
];

export const API_URL = isProduction
    ? 'https://badgersadmin-backend.onrender.com' // Production URL
    : 'http://localhost:5001';

export default API_URL;
