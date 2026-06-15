import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { Loader2, CheckCircle2, XCircle, Calendar, User, Phone, CreditCard, AlertCircle, Plane, Camera } from 'lucide-react';

const PublicMemberProfile = () => {
    const { id } = useParams();
    const [member, setMember] = useState(null);
    const [payments, setPayments] = useState([]);
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ ci: '', phone: '', birthDate: '', comments: '' });
    const fileInputRef = useRef(null);

    const fetchPublicData = useCallback(async () => {
        setLoading(true);
        try {
            const [memberRes, financeRes, debtsRes] = await Promise.all([
                axios.get(`${API_URL}/api/members/public/${id}`),
                axios.get(`${API_URL}/api/finance/member/${id}`),
                axios.get(`${API_URL}/api/debts/public/member/${id}`)
            ]);
            setMember(memberRes.data);
            setEditData({
                ci: memberRes.data.ci || '',
                phone: memberRes.data.phone || '',
                birthDate: memberRes.data.birthDate ? new Date(memberRes.data.birthDate).toISOString().split('T')[0] : '',
                comments: memberRes.data.comments || ''
            });
            setPayments(financeRes.data || []);
            setDebts(debtsRes.data || []);
        } catch (err) {
            console.error("Error fetching public member data", err);
            setError("No se pudo cargar la información. El socio puede no existir o hubo un problema de conexión.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setIsUploading(true);
        try {
            const res = await axios.post(`${API_URL}/api/members/public/${id}/photo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMember(prev => ({ ...prev, photoUrl: res.data.photoUrl }));
            alert('¡Foto actualizada correctamente!');
        } catch (err) {
            console.error('Error uploading photo:', err);
            alert('Error al subir la foto');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const res = await axios.put(`${API_URL}/api/members/public/${id}`, editData);
            setMember(prev => ({ ...prev, ...res.data }));
            setIsEditing(false);
            alert('¡Perfil actualizado!');
        } catch (err) {
            console.error('Error updating profile:', err);
            alert(err.response?.data?.message || 'Error al actualizar el perfil');
        }
    };

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
    const currentPayment = payments.find(p => 
        Number(p.month) === currentMonth && 
        Number(p.year) === currentYear && 
        (p.type === 'Cuota' || p.type === 'Licencia' || p.type === 'Condonado' || !p.type)
    );

    const isPaid = currentPayment && (currentPayment.type === 'Cuota' || !currentPayment.type);
    const isLicensed = currentPayment && currentPayment.type === 'Licencia';
    const isCondoned = currentPayment && currentPayment.type === 'Condonado';

    // Determine join date safely using UTC to avoid timezone shift
    const joinDate = new Date(member.joinDate || member.createdAt || new Date());
    const joinMonth = joinDate.getUTCMonth() + 1;
    const joinYear = joinDate.getUTCFullYear();

    // Calculate Past Debt (last 3 months)
    let pastDebtAmount = 0;
    const pastMonthsPending = [];
    for (let i = 1; i <= 3; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        // Skip months prior to the member's join date
        if (y < joinYear || (y === joinYear && m < joinMonth)) {
            continue;
        }

        const hasRecord = payments.some(p => 
            p.month === m && p.year === y && 
            (p.type === 'Cuota' || p.type === 'Licencia' || p.type === 'Condonado' || !p.type)
        );

        if (!hasRecord) {
            pastDebtAmount += (member.planCost || 2000);
            pastMonthsPending.push(d.toLocaleString('es-ES', { month: 'long' }));
        }
    }

    const totalFiadoDebt = debts.reduce((acc, d) => acc + (d.totalAmount - (d.paidAmount || 0)), 0);
    const memberPrice = member.planCost || 2000;
    const currentMonthPending = (isPaid || isLicensed || isCondoned) ? 0 : memberPrice;
    const totalPendingAmount = currentMonthPending + pastDebtAmount + totalFiadoDebt;

    // Create Virtual History for missing months
    const virtualDebts = [];
    if (!isPaid && !isLicensed && !isCondoned) {
        // Only if current month is on or after join date
        if (currentYear > joinYear || (currentYear === joinYear && currentMonth >= joinMonth)) {
            virtualDebts.push({
                _id: `v-current`,
                month: currentMonth,
                year: currentYear,
                amount: memberPrice,
                type: 'Cuota',
                isDebt: true,
                isVirtual: true,
                date: new Date()
            });
        }
    }

    // Add virtual records for past unpaid months
    for (let i = 1; i <= 3; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        // Skip months prior to the member's join date
        if (y < joinYear || (y === joinYear && m < joinMonth)) {
            continue;
        }

        const hasRecord = payments.some(p => 
            p.month === m && p.year === y && 
            (p.type === 'Cuota' || p.type === 'Licencia' || p.type === 'Condonado' || !p.type)
        );

        if (!hasRecord) {
            virtualDebts.push({
                _id: `v-past-${i}`,
                month: m,
                year: y,
                amount: memberPrice,
                type: 'Cuota',
                isDebt: true,
                isVirtual: true,
                date: d
            });
        }
    }

    // Combine and sort history
    const history = [
        ...payments.map(p => ({ ...p, isDebt: false })),
        ...virtualDebts,
        ...debts.map(d => ({ 
            ...d, 
            isDebt: true, 
            amount: d.totalAmount - (d.paidAmount || 0),
            productName: d.products?.map(p => p.productName).join(', ') || 'Fiado'
        }))
    ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const calculateTrainingTime = (dateString) => {
        if (!dateString) return 'Desconocido';
        const start = new Date(dateString);
        const now = new Date();
        
        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        if (years === 0 && months === 0) return 'Menos de 1 mes';
        if (years === 0) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
        if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
        
        return `${years} ${years === 1 ? 'año' : 'años'} y ${months} ${months === 1 ? 'mes' : 'meses'}`;
    };

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
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handlePhotoChange}
                            />
                            <div 
                                className="relative group cursor-pointer"
                                onClick={() => !isUploading && fileInputRef.current.click()}
                            >
                                {member.photoUrl ? (
                                    <img 
                                        src={member.photoUrl.startsWith('http') ? member.photoUrl : `${API_URL}${member.photoUrl}`} 
                                        className={`w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover bg-slate-100 transition-opacity ${isUploading ? 'opacity-50' : 'group-hover:opacity-90'}`}
                                        alt={member.fullName}
                                    />
                                ) : (
                                    <div className={`w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center text-slate-400 transition-opacity ${isUploading ? 'opacity-50' : 'group-hover:opacity-90'}`}>
                                        <User size={40} />
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-black/40 p-2 rounded-full text-white">
                                        {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                                    </div>
                                </div>
                                {isUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-blue-600" size={32} />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-800">{member.fullName}</h2>
                            <p className="text-slate-500 font-medium">{member.planType || 'Personalizado'}</p>
                            <button 
                                onClick={() => setIsEditing(!isEditing)}
                                className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-full"
                            >
                                {isEditing ? 'Cancelar' : 'Editar Perfil'}
                            </button>
                        </div>

                        <div className={`mt-6 p-4 rounded-2xl flex items-center gap-4 ${isLicensed ? 'bg-purple-50 text-purple-700 border border-purple-100' : (totalPendingAmount <= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}`}>
                            {isLicensed ? (
                                <>
                                    <div className="p-2 bg-purple-200 rounded-full">
                                        <Plane size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold">En Licencia</p>
                                        <p className="text-sm opacity-90">No registra asistencia en {new Date().toLocaleString('es-ES', { month: 'long' })}</p>
                                    </div>
                                </>
                            ) : (totalPendingAmount <= 0) ? (
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
                                    <div className="flex-1">
                                        <p className="font-bold">Pendiente de Pago</p>
                                        <p className="text-sm opacity-90 font-bold">Total: ${totalPendingAmount.toLocaleString()}</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {!isPaid && !isLicensed && <span className="text-[9px] bg-red-100 px-1 rounded uppercase font-bold text-red-600">Mes Actual</span>}
                                            {pastMonthsPending.length > 0 && <span className="text-[9px] bg-amber-100 px-1 rounded uppercase font-bold text-amber-700">Debe mes anterior</span>}
                                            {totalFiadoDebt > 0 && <span className="text-[9px] bg-blue-100 px-1 rounded uppercase font-bold text-blue-700">Fiados: ${totalFiadoDebt}</span>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Cédula</span>
                                {isEditing ? (
                                    <input 
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editData.ci}
                                        onChange={(e) => setEditData({...editData, ci: e.target.value})}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <CreditCard size={14} className="text-slate-400" />
                                        <span className="font-medium">{member.ci}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Teléfono</span>
                                {isEditing ? (
                                    <input 
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editData.phone}
                                        onChange={(e) => setEditData({...editData, phone: e.target.value})}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Phone size={14} className="text-slate-400" />
                                        <span className="font-medium">{member.phone || '—'}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Plan</span>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <User size={14} className="text-slate-400" />
                                    <span className="font-medium">{member.planType || 'Personalizado'}</span>
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Costo</span>
                                <div className="flex items-center gap-2 text-green-600">
                                    <span className="font-bold text-lg">${(member.planCost || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-slate-50 pt-6">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Fecha de Nacimiento</span>
                                {isEditing ? (
                                    <input 
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={editData.birthDate}
                                        onChange={(e) => setEditData({...editData, birthDate: e.target.value})}
                                    />
                                ) : (
                                    <p className="text-slate-700 font-medium">
                                        {member.birthDate ? new Date(member.birthDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '—'}
                                    </p>
                                )}
                            </div>

                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Tiempo Entrenando</span>
                                <p className="text-slate-700 font-medium">
                                    {calculateTrainingTime(member.joinDate || member.createdAt)}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Comentarios</span>
                                {isEditing ? (
                                    <textarea 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[60px]"
                                        value={editData.comments}
                                        onChange={(e) => setEditData({...editData, comments: e.target.value})}
                                        placeholder="Agrega información adicional..."
                                    />
                                ) : (
                                    <p className="text-slate-500 text-sm italic">
                                        {member.comments || '—'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <button 
                                onClick={handleSaveProfile}
                                className="w-full mt-6 bg-blue-600 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                Guardar Cambios
                            </button>
                        )}
                    </div>

                    {/* History Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-50 font-bold text-slate-800 flex items-center justify-between">
                            <span>Estado de Cuenta</span>
                            <span className="text-xs text-slate-400 font-normal">Actualizado</span>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                            {history.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 italic text-sm">
                                    No hay movimientos registrados
                                </div>
                            ) : (
                                history.slice(0, 15).map((item, idx) => (
                                    <div key={item._id || idx} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${item.isDebt ? 'bg-red-50/30' : ''}`}>
                                        <div>
                                            <p className={`font-bold text-sm ${item.isDebt ? 'text-red-700' : 'text-slate-700'}`}>
                                                {item.type === 'Licencia' ? 'Licencia' : (
                                                    item.month && item.year ? 
                                                    new Date(item.year, item.month - 1).toLocaleString('es-ES', { month: 'long' }) : 
                                                    (item.type === 'Condonado' ? 'Deuda Condonada' : 'Pago Extra')
                                                )}
                                            </p>
                                            <p className="text-[10px] text-slate-400 uppercase">
                                                {item.isVirtual ? 'Pendiente' : (item.isDebt ? item.productName : (item.type || 'Cuota'))}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${item.isDebt ? 'text-red-600' : (item.type === 'Licencia' ? 'text-purple-600' : 'text-slate-800')}`}>
                                                {item.type === 'Licencia' ? '$0' : `$${item.amount.toLocaleString()}`}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {new Date(item.date || item.createdAt).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center px-6">
                    <p className="text-slate-400 text-xs italic">La información mostrada incluye tu cuota mensual y consumos en cantina pendientes.</p>
                </div>
            </div>
        </div>
    );
};

export default PublicMemberProfile;
