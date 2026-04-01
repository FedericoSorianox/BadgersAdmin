import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { Loader2, CheckCircle2, XCircle, Calendar, User, Phone, CreditCard, AlertCircle } from 'lucide-react';

const PublicMemberProfile = () => {
    const { id } = useParams();
    const [member, setMember] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPublicData = useCallback(async () => {
        setLoading(true);
        try {
            const [memberRes, financeRes] = await Promise.all([
                axios.get(`${API_URL}/api/members/public/${id}`),
                axios.get(`${API_URL}/api/finance/member/${id}`)
            ]);
            
            setMember(memberRes.data);
            setPayments(financeRes.data || []);
        } catch (err) {
            console.error("Error fetching public member data", err);
            setError("No se pudo cargar la información. El socio puede no existir o hubo un problema de conexión.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPublicData();
    }, [fetchPublicData]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    if (error || !member) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm">
                    <XCircle className="text-red-500 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Ups...</h2>
                    <p className="text-slate-500">{error || "Socio no encontrado"}</p>
                </div>
            </div>
        );
    }

    // Determine status for current month
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const isPaid = payments.some(p => 
        Number(p.month) === currentMonth && 
        Number(p.year) === currentYear && 
        (p.type === 'Cuota' || !p.type)
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Header Branding */}
            <div className="bg-slate-900 text-white p-6 text-center shadow-lg">
                <h1 className="text-2xl font-bold tracking-tight">The Badgers Admin</h1>
                <p className="text-slate-400 text-sm mt-1">Ficha Personal del Socio</p>
            </div>

            <div className="max-w-md mx-auto px-4 -mt-4">
                {/* Profile Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 h-24"></div>
                    <div className="px-6 pb-6 relative">
                        <div className="flex justify-center -mt-12 mb-4">
                            {member.photoUrl ? (
                                <img 
                                    src={member.photoUrl.startsWith('http') ? member.photoUrl : `${API_URL}${member.photoUrl}`} 
                                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover bg-slate-100"
                                    alt={member.fullName}
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                    <User size={40} />
                                </div>
                            )}
                        </div>
                        
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-800">{member.fullName}</h2>
                            <p className="text-slate-500 font-medium">{member.planType || 'Personalizado'}</p>
                        </div>

                        <div className={`mt-6 p-4 rounded-2xl flex items-center gap-4 ${isPaid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {isPaid ? (
                                <>
                                    <div className="p-2 bg-green-200 rounded-full">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold">Cuota al Día</p>
                                        <p className="text-sm opacity-90">{new Date().toLocaleString('es-ES', { month: 'long' })} Pagado</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-2 bg-red-200 rounded-full">
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold">Pendiente de Pago</p>
                                        <p className="text-sm opacity-90">{new Date().toLocaleString('es-ES', { month: 'long' })} - ${member.planCost || 0}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 italic">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Cédula</span>
                            <div className="flex items-center gap-2 text-slate-700">
                                <CreditCard size={14} />
                                <span className="font-medium">{member.ci}</span>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Socio desde</span>
                            <div className="flex items-center gap-2 text-slate-700">
                                <Calendar size={14} />
                                <span className="font-medium">{new Date(member.createdAt).getFullYear()}</span>
                            </div>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-50 font-bold text-slate-800 flex items-center justify-between">
                            <span>Últimos Pagos</span>
                            <span className="text-xs text-slate-400 font-normal">Año {currentYear}</span>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                            {payments.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 italic text-sm">
                                    No hay registros históricos aún
                                </div>
                            ) : (
                                payments.slice(0, 12).map((p, idx) => (
                                    <div key={p._id || idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">
                                                {p.month && p.year ? 
                                                    new Date(p.year, p.month - 1).toLocaleString('es-ES', { month: 'long' }) : 
                                                    'Pago Extra'
                                                }
                                            </p>
                                            <p className="text-[10px] text-slate-400 uppercase">{p.type || 'Cuota'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-800">${p.amount}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {new Date(p.date || p.createdAt).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate-400 text-xs italic">Para dudas o reclamos, contacta a Gerencia.</p>
                </div>
            </div>
        </div>
    );
};

export default PublicMemberProfile;
