import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import API_URL from '../config';

const Login = () => {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { branding } = useTenant();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Determine API URL (Hardcoded for dev, normally env or relative)
            // const API_URL_LOCAL = 'http://localhost:5001/api/auth/login'; // Renamed to avoid shadow

            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.user.role);
                localStorage.setItem('isAuthenticated', 'true');

                if (data.user.role === 'superadmin') {
                    navigate('/superadmin');
                } else {
                    navigate('/');
                }
            } else {
                setError(data.message || 'Error de autenticación');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión con el servidor');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8 text-center" style={{ backgroundColor: branding.primaryColor || '#2563eb' }}>
                    <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 p-1 flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <img
                            src={branding.logoUrl || "/badgers-logo.jpg"}
                            alt="Logo"
                            className="w-full h-full object-cover rounded-xl"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Bienvenido</h1>
                    <p className="text-blue-100 text-sm">Panel de Administración</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Usuario</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Usuario"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="••••••••"
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <p className="text-red-500 text-sm mt-2 font-medium animate-pulse">
                                    {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            style={{ backgroundColor: branding.primaryColor || '#0f172a' }}
                            className="w-full text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl transform active:scale-95 duration-200"
                        >
                            Ingresar al Panel
                        </button>
                    </form>
                </div>

                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        &copy; 2025 Powered by MultiTenant SaaS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
