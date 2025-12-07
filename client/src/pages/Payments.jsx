import { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle, XCircle, Calendar, Loader2, DollarSign, BarChart2 } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';
import { API_URL, EXCLUDED_MEMBERS } from '../config';

const Payments = () => {
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [payments, setPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Date State
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Analytics State
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear());
    const [historyDetailModalOpen, setHistoryDetailModalOpen] = useState(false);
    const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [membersRes, paymentsRes] = await Promise.all([
                axios.get(`${API_URL}/api/members`),
                axios.get(`${API_URL}/api/finance`) // Fetches all payments
            ]);
            setMembers(membersRes.data.filter(m =>
                m.active && !EXCLUDED_MEMBERS.includes(m.fullName)
            )); // Only active and non-exempt members
            setPayments(paymentsRes.data);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter payments for the selected period
    const currentMonthPayments = useMemo(() => {
        return payments.filter(p => {
            const d = new Date(p.date || p.createdAt);
            // Check specifically for year and month matches
            // Assuming DB might store month/year as fields OR date
            const pMonth = p.month || (d.getMonth() + 1);
            const pYear = p.year || d.getFullYear();

            return Number(pMonth) === Number(selectedMonth) &&
                Number(pYear) === Number(selectedYear) &&
                (p.type === 'Cuota' || !p.type); // Only count Membership Fees
        });
    }, [payments, selectedMonth, selectedYear]);

    // Combine data
    const memberStatusList = useMemo(() => {
        return members.map(member => {
            const payment = currentMonthPayments.find(p => {
                // Check matching Member ID or clean Name match fallback
                return p.memberId === member._id ||
                    (p.socio && p.socio.toLowerCase().trim() === member.fullName.toLowerCase().trim());
            });

            return {
                ...member,
                paid: !!payment,
                paymentDetails: payment
            };
        }).filter(m =>
            m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.ci.includes(searchTerm)
        );
    }, [members, currentMonthPayments, searchTerm]);

    const stats = {
        total: members.length,
        paid: memberStatusList.filter(m => m.paid).length,
        pending: memberStatusList.filter(m => !m.paid).length
    };

    const completionRate = stats.total > 0 ? ((stats.paid / stats.total) * 100).toFixed(0) : 0;

    const fetchAnalytics = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/finance`);
            const allPayments = response.data.filter(p => p.type === 'Cuota' || !p.type);

            const monthlyData = Array(12).fill(0).map((_, i) => ({
                month: i + 1,
                name: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
                count: 0,
                revenue: 0
            }));

            allPayments.forEach(p => {
                const pDate = new Date(p.date || p.createdAt);
                const pYear = p.year || pDate.getFullYear();
                const pMonth = p.month || (pDate.getMonth() + 1);

                if (Number(pYear) === Number(analyticsYear)) {
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
    }, [analyticsModalOpen, analyticsYear]);

    const handleQuickPayment = async (member) => {
        const confirmPayment = window.confirm(`¿Confirmar pago de $2000 para ${member.fullName}?`);
        if (!confirmPayment) return;

        try {
            const paymentData = {
                memberId: member._id,
                memberName: member.fullName,
                memberCi: member.ci,
                month: selectedHistoryMonth,
                year: analyticsYear,
                amount: member.planCost || 2000,
                type: 'Cuota',
                date: new Date()
            };

            await axios.post(`${API_URL}/api/finance`, paymentData);

            // Refresh data
            await fetchData();
            await fetchAnalytics();

            alert('Pago registrado exitosamente');
        } catch (error) {
            console.error("Error registering payment", error);
            alert('Error al registrar el pago');
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
                title={`Histórico de Pagos - ${analyticsYear}`}
            >
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 font-medium text-slate-600 focus:outline-none cursor-pointer"
                            value={analyticsYear}
                            onChange={(e) => setAnalyticsYear(Number(e.target.value))}
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
                title={selectedHistoryMonth ? `Detalle: ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][selectedHistoryMonth - 1]} ${analyticsYear}` : 'Detalle'}
            >
                {(() => {
                    if (!selectedHistoryMonth) return null;

                    const monthPayments = payments.filter(p =>
                        Number(p.month || new Date(p.date).getMonth() + 1) === selectedHistoryMonth &&
                        Number(p.year || new Date(p.date).getFullYear()) === analyticsYear &&
                        (p.type === 'Cuota' || !p.type)
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
                                        <div key={m._id} className="py-2 flex justify-between items-center">
                                            <div>
                                                <span className="text-sm font-medium text-slate-700">{m.fullName}</span>
                                                <span className="text-xs text-slate-500 font-mono ml-2">CI: {m.ci}</span>
                                            </div>
                                            <button
                                                onClick={() => handleQuickPayment(m)}
                                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                                            >
                                                Marcar como Pagado
                                            </button>
                                        </div>
                                    ))}
                                    {pendingList.length === 0 && <p className="text-sm text-slate-400 italic">Todos al día.</p>}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Pagos de Socios</h1>
                    <p className="text-slate-500 mt-1">Gestión de cuotas mensuales</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchAnalytics}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <BarChart2 size={20} />
                        Ver Histórico
                    </button>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <Calendar size={18} className="text-slate-400" />
                        <select
                            className="bg-transparent font-medium text-slate-600 focus:outline-none cursor-pointer"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            <option value="1">Enero</option>
                            <option value="2">Febrero</option>
                            <option value="3">Marzo</option>
                            <option value="4">Abril</option>
                            <option value="5">Mayo</option>
                            <option value="6">Junio</option>
                            <option value="7">Julio</option>
                            <option value="8">Agosto</option>
                            <option value="9">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                        </select>
                    </div>

                    <select
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-600 focus:outline-none cursor-pointer"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Progreso de Pagos</p>
                        <h3 className="text-2xl font-bold text-slate-800">{completionRate}%</h3>
                        <p className="text-xs text-slate-400 mt-1">Del total de activos</p>
                    </div>
                    <div className="h-12 w-12 rounded-full border-4 border-blue-100 flex items-center justify-center p-1">
                        <div className="w-full h-full bg-blue-500 rounded-full" style={{ opacity: completionRate / 100 }}></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Al Día</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.paid}</h3>
                        <p className="text-xs text-green-600 text-slate-400">Socios han pagado</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <XCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Pendientes</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.pending}</h3>
                        <p className="text-xs text-red-600 text-slate-400">Sin registrar pago</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar socio..."
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
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Costo</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-right">Fecha Pago</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {memberStatusList.map((member) => (
                                <tr key={member._id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">
                                        {member.fullName}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {member.planType || 'Estándar'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-600">
                                        ${member.planCost}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {member.paid ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                <CheckCircle size={14} /> Pagado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                <XCircle size={14} /> Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-500 text-xs">
                                        {member.paid ? new Date(member.paymentDetails.date || member.paymentDetails.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Payments;
