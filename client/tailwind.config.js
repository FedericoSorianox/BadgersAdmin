/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--primary)',
                secondary: 'var(--secondary)',
                accent: 'var(--primary)', // Often the primary branding is the accent
                background: '#f8fafc', // Slate 50
                surface: '#ffffff',
            }
        },
    },
    plugins: [],
}
