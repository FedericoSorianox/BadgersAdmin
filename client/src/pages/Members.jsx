

import { useState, useEffect } from 'react';
import { Search, Loader2, UserPlus, Edit2, Check, X, BarChart2, Trash2, Eye } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';

const Members = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Analytics State
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [rawPayments, setRawPayments] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [historyDetailModalOpen, setHistoryDetailModalOpen] = useState(false);
    const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(null);

    // Individual Member Payment History
    const [memberHistoryOpen, setMemberHistoryOpen] = useState(false);
    const [selectedMemberHistory, setSelectedMemberHistory] = useState(null);
    const [memberPayments, setMemberPayments] = useState([]);

    // Modal & Form State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        ci: '',
        phone: '',
        planType: '', // e.g. 'Libre'
        planCost: 0,
        active: true,
        photoUrl: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // View Member Details State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewMember, setViewMember] = useState(null);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5001/api/members');
            setMembers(response.data);
        } catch (error) {
            console.error("Error fetching members", error);
        } finally {
            setLoading(false);
        }
    };



    const handleOpenModal = (member = null) => {
        if (member) {
            setEditingMember(member);
            setFormData({
                fullName: member.fullName || '',
                ci: member.ci || '',
                phone: member.phone || '',
                planType: member.planType || '',
                planCost: member.planCost || 0,
                active: member.active,
                photoUrl: member.photoUrl || ''
            });
            setImagePreview(member.photoUrl ? `http://localhost:5001${member.photoUrl}` : null);
        } else {
            setEditingMember(null);
            setFormData({
                fullName: '',
                ci: '',
                phone: '',
                planType: 'Libre',
                planCost: 2000,
                active: true,
                photoUrl: ''
            });
            setImagePreview(null);
        }
        setImageFile(null);
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('fullName', formData.fullName);
            formDataToSend.append('ci', formData.ci);
            formDataToSend.append('phone', formData.phone);
            formDataToSend.append('planType', formData.planType);
            formDataToSend.append('planCost', formData.planCost);
            formDataToSend.append('active', formData.active);

            if (imageFile) {
                formDataToSend.append('image', imageFile);
            }

            if (editingMember) {
                await axios.put(`http://localhost:5001/api/members/${editingMember._id}`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('http://localhost:5001/api/members', formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setModalOpen(false);
            fetchMembers(); // Refresh list
        } catch (error) {
            console.error("Error saving member", error);
            alert("Error al guardar socio. Verifique los datos.");
        }
    };

    const handleDelete = async (memberId) => {
        if (!confirm('¿Estás seguro de eliminar este socio? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await axios.delete(`http://localhost:5001/api/members/${memberId}`);
            fetchMembers();
        } catch (error) {
            console.error("Error deleting member", error);
            alert("Error al eliminar socio.");
        }
    };

    const filteredMembers = members.filter(member =>
        member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.ci?.includes(searchTerm)
    );


    const handleViewMember = (member) => {
        setViewMember(member);
        setViewModalOpen(true);
    };





    const fetchAnalytics = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/finance');
            const payments = response.data.filter(p => p.type === 'Cuota' || !p.type); // Only fees

            // Process data for the selected year
            const monthlyData = Array(12).fill(0).map((_, i) => ({
                month: i + 1,
                name: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
                count: 0,
                revenue: 0
            }));

            payments.forEach(p => {
                const pDate = new Date(p.date || p.createdAt);
                const pYear = p.year || pDate.getFullYear();
                const pMonth = p.month || (pDate.getMonth() + 1);

                if (Number(pYear) === Number(selectedYear)) {
                    monthlyData[pMonth - 1].count += 1;
                    monthlyData[pMonth - 1].revenue += p.amount;
                }
            });

            setAnalyticsData(monthlyData);
            setAnalyticsModalOpen(true);
        } catch (error) {
            console.error("Error fetching analytics", error);
        }
    };

    useEffect(() => {
        if (analyticsModalOpen) {
            fetchAnalytics();
        }
    }, [analyticsModalOpen, selectedYear]);

    const handleOpenAnalytics = () => {
        fetchAnalytics();
    };

    const handleOpenMemberHistory = async (member) => {
        setSelectedMemberHistory(member);
        setMemberHistoryOpen(true);
        try {
            const response = await axios.get(`http://localhost:5001/api/finance/member/${member._id}`);
            setMemberPayments(response.data);
        } catch (error) {
            console.error("Error fetching member payments", error);
            setMemberPayments([]);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Analytics Modal */}
            <Modal
                isOpen={analyticsModalOpen}
                onClose={() => setAnalyticsModalOpen(false)}
                title={`Histórico de Pagos - ${selectedYear}`}
            >
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 font-medium text-slate-600 focus:outline-none cursor-pointer"
                            value={selectedYear}
                            onChange={(e) => {
                                setSelectedYear(Number(e.target.value));
                                // fetchAnalytics(); // Ideally useEffect or trigger re-fetch/re-calc
                                // Triggering simple re-fetch for now is okay, but better to just re-calc if we had all data.
                                // For simplicity, let's just let the user re-open or add useEffect on selectedYear if modal is open.
                                // Actuall, let's keep it simple: just update state and let useEffect handle it if we moved logic there, 
                                // OR simpler: just re-run the logic. 
                                // Since logic is inside fetchAnalytics which fetches... let's separate fetch vs calc?
                                // Optimization: Fetch once, Calc on render/useEffect.
                            }}
                        >
                            <option value={2023}>2023</option>
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                        </select>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: '#F1F5F9' }}
                                />
                                <Bar dataKey="count" name="Socios al Día" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 font-bold text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Mes</th>
                                    <th className="px-4 py-3 text-right">Socios Pagaron</th>
                                    <th className="px-4 py-3 text-right">Ingresos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {analyticsData.map((data) => (
                                    <tr
                                        key={data.month}
                                        onClick={() => {
                                            setSelectedHistoryMonth(data.month);
                                            setHistoryDetailModalOpen(true);
                                        }}
                                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3 text-slate-700 font-medium">{data.name}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-700">{data.count}</td>
                                        <td className="px-4 py-3 text-right text-green-600 font-mono">${data.revenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            {/* History Detail Modal */}
            <Modal
                isOpen={historyDetailModalOpen}
                onClose={() => setHistoryDetailModalOpen(false)}
                title={selectedHistoryMonth ? `Detalle: ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][selectedHistoryMonth - 1]} ${selectedYear}` : 'Detalle'}
            >
                {(() => {
                    if (!selectedHistoryMonth) return null;

                    // Filter Logic for Detail View
                    const monthPayments = rawPayments.filter(p =>
                        Number(p.month) === selectedHistoryMonth &&
                        Number(p.year) === selectedYear
                    );

                    const paidIds = new Set(monthPayments.map(p => String(p.memberId || '')));
                    const paidCis = new Set(monthPayments.map(p => String(p.memberCi || '')));

                    const activeMembers = members.filter(m => m.active);

                    const paidList = activeMembers.filter(m =>
                        (m._id && paidIds.has(String(m._id))) ||
                        (m.ci && paidCis.has(String(m.ci)))
                    );

                    const pendingList = activeMembers.filter(m =>
                        !((m._id && paidIds.has(String(m._id))) ||
                            (m.ci && paidCis.has(String(m.ci))))
                    );

                    return (
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-bold text-green-600 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-600"></span>
                                    Pagados ({paidList.length})
                                </h4>
                                <div className="bg-green-50 rounded-xl p-4 max-h-[250px] overflow-y-auto divide-y divide-green-100">
                                    {paidList.map(m => (
                                        <div key={m._id} className="py-2 flex justify-between">
                                            <span className="text-sm font-medium text-slate-700">{m.fullName}</span>
                                            <span className="text-xs text-slate-500 font-mono">CI: {m.ci}</span>
                                        </div>
                                    ))}
                                    {paidList.length === 0 && <p className="text-sm text-slate-400 italic">Ningún pago registrado.</p>}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                    Pendientes ({pendingList.length})
                                </h4>
                                <div className="bg-red-50 rounded-xl p-4 max-h-[250px] overflow-y-auto divide-y divide-red-100">
                                    {pendingList.map(m => (
                                        <div key={m._id} className="py-2 flex justify-between">
                                            <span className="text-sm font-medium text-slate-700">{m.fullName}</span>
                                            <span className="text-xs text-slate-500 font-mono">CI: {m.ci}</span>
                                        </div>
                                    ))}
                                    {pendingList.length === 0 && <p className="text-sm text-slate-400 italic">Todos al día.</p>}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* Member Payment History Modal */}
            <Modal
                isOpen={memberHistoryOpen}
                onClose={() => setMemberHistoryOpen(false)}
                title={selectedMemberHistory ? `Historial de Pagos - ${selectedMemberHistory.fullName}` : 'Historial de Pagos'}
            >
                <div className="space-y-4">
                    {memberPayments.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">No hay pagos registrados para este socio.</p>
                    ) : (
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 font-bold text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Tipo</th>
                                        <th className="px-4 py-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {memberPayments.map((payment) => (
                                        <tr key={payment._id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-700">
                                                {new Date(payment.date).toLocaleDateString('es-UY')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {payment.type || 'Cuota'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-green-600 font-bold">
                                                ${payment.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">Total Pagado:</span>
                                <span className="text-lg font-bold text-green-600">
                                    ${memberPayments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingMember ? "Editar Socio" : "Agregar Nuevo Socio"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cédula (CI)</label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.ci}
                            onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                            disabled={!!editingMember} // Disable CI edit to prevent identity issues ideally, or allow if requirements say so.
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Costo Plan ($)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.planCost}
                                onChange={(e) => setFormData({ ...formData, planCost: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Plan</label>
                        <select
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={formData.planType}
                            onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                        >
                            <option value="Libre">Libre</option>
                            <option value="2 Veces x Semana">2 Veces x Semana</option>
                            <option value="Pase Diario">Pase Diario</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foto del Socio</label>
                        <input
                            type="file"
                            accept="image/*"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setImageFile(file);
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setImagePreview(reader.result);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>

                    {imagePreview && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vista Previa</label>
                            <div className="flex justify-center p-4 bg-slate-50 rounded-lg">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="h-32 w-32 object-cover rounded-full border-4 border-white shadow-lg"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                        <input
                            type="checkbox"
                            id="activeCheckbox"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <label htmlFor="activeCheckbox" className="text-sm font-medium text-slate-700 cursor-pointer">
                            Socio Activo
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold"
                        >
                            {editingMember ? 'Guardar Cambios' : 'Crear Socio'}
                        </button>
                    </div>
                </form>
            </Modal>

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Socios</h1>
                    <p className="text-slate-500 mt-1">Gestión de miembros del gimnasio</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <UserPlus size={20} />
                        Nuevo Socio
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cédula..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Socio</th>
                                <th className="px-6 py-4">Cédula</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredMembers.map((member) => (
                                <tr key={member._id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                                                {member.photoUrl ? (
                                                    <img
                                                        src={member.photoUrl}
                                                        alt={member.fullName}
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold bg-slate-100">
                                                        {member.fullName?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="font-medium text-slate-700">{member.fullName}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-mono">
                                        {member.ci}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {member.planType || 'Estándar'}
                                        <span className="text-xs text-green-600 font-bold ml-1">${member.planCost}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${member.active
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {member.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleViewMember(member)}
                                            className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-all mr-2"
                                            title="Ver Detalle"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(member)}
                                            className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-all mr-2"
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(member._id)}
                                            className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                    <div>Mostrando {filteredMembers.length} socios</div>
                </div>
            </div>
        </div>
    );
};

export default Members;
