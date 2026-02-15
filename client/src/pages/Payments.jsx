import { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle, XCircle, Calendar, Loader2, DollarSign, BarChart2, AlertCircle, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';
import { API_URL } from '../config';

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

    // Derived State for Recurring Debt Analysis
    const [debtAnalysis, setDebtAnalysis] = useState({}); // memberId -> [months owed]

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [membersRes, paymentsRes] = await Promise.all([
                axios.get(`${API_URL}/api/members`),
                axios.get(`${API_URL}/api/finance`)
            ]);
            setMembers(membersRes.data.filter(m => m.active && !m.isExempt));
            setPayments(paymentsRes.data);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Dynamic Year Options ---
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
    }, []);

    // --- Core Data Processing ---

    // 1. Current Month Status
    const memberStatusList = useMemo(() => {
        const processed = members.map(member => {
            // Find payment for SELECTED month/year
            const payment = payments.find(p => {
                const d = new Date(p.date || p.createdAt);
                const pMonth = p.month || (d.getMonth() + 1);
                const pYear = p.year || d.getFullYear();
                return Number(pMonth) === Number(selectedMonth) &&
                    Number(pYear) === Number(selectedYear) &&
                    (p.type === 'Cuota' || p.type === 'Condonado' || !p.type) &&
                    (p.memberId === member._id || (p.socio && p.socio.trim().toLowerCase() === member.fullName.trim().toLowerCase()));
            });

            // Find Note for SELECTED month/year (Reason for non-payment)
            const note = payments.find(p => {
                const d = new Date(p.date || p.createdAt);
                const pMonth = p.month || (d.getMonth() + 1);
                const pYear = p.year || d.getFullYear();
                return Number(pMonth) === Number(selectedMonth) &&
                    Number(pYear) === Number(selectedYear) &&
                    p.type === 'Nota' &&
                    p.memberId === member._id;
            });

            // Calculate Past Debts (Previous months of selected Year)
            const pastDebts = [];
            if (Number(selectedYear) === new Date().getFullYear()) {
                // Check months from Jan up to (SelectedMonth - 1)
                for (let m = 1; m < selectedMonth; m++) {
                    const hasPaid = payments.some(p => {
                        const d = new Date(p.date || p.createdAt);
                        const pMonth = p.month || (d.getMonth() + 1);
                        const pYear = p.year || d.getFullYear();
                        return Number(pMonth) === m &&
                            Number(pYear) === Number(selectedYear) &&
                            (p.type === 'Cuota' || p.type === 'Condonado' || !p.type) &&
                            (p.memberId === member._id);
                    });
                    if (!hasPaid) pastDebts.push(m);
                }
            }

            return {
                ...member,
                paid: !!payment,
                paymentDetails: payment,
                isForgiven: payment?.type === 'Condonado',
                note: note ? note.comments : null,
                pastDebts // Array of month numbers
            };
        });

        return processed.filter(m =>
            m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.ci.includes(searchTerm)
        );
    }, [members, payments, selectedMonth, selectedYear, searchTerm]);

    const stats = {
        total: members.length,
        paid: memberStatusList.filter(m => m.paid && !m.isForgiven).length, // Only real payments
        forgiven: memberStatusList.filter(m => m.isForgiven).length,
        pending: memberStatusList.filter(m => !m.paid).length
    };

    // Completion rate includes forgiven? User said "doesn't show they owe it", so they are "done".
    // But for financial completion, it's different. Let's count them as "processed".
    const processedCount = memberStatusList.filter(m => m.paid).length;
    const completionRate = stats.total > 0 ? ((processedCount / stats.total) * 100).toFixed(0) : 0;

    // --- Analytics Logic ---
    const fetchAnalytics = () => {
        // Compute from existing 'payments' state instead of refetching
        const allPayments = payments.filter(p => (p.type === 'Cuota' || !p.type) && p.type !== 'Condonado'); // Exclude forgiven from revenue
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
    };

    const handleDismissDebt = async (member, monthToDismiss = null) => {
        const targetMonth = monthToDismiss || selectedMonth;
        const confirmDismiss = window.confirm(`¿Seguro que deseas condonar (perdonar) la deuda de ${getMonthName(targetMonth)} para ${member.fullName}? No se registrará ingreso ($0).`);
        if (!confirmDismiss) return;

        try {
            const paymentData = {
                memberId: member._id,
                memberName: member.fullName,
                memberCi: member.ci,
                month: targetMonth,
                year: selectedYear,
                amount: 0,
                type: 'Condonado',
                date: new Date()
            };

            await axios.post(`${API_URL}/api/finance`, paymentData);
            fetchData();
            alert('Deuda condonada exitosamente');
        } catch (error) {
            console.error("Error dismissing debt", error);
            alert('Error al condonar la deuda');
        }
    };

    // Update analytics when year changes inside modal
    useEffect(() => {
        if (analyticsModalOpen) fetchAnalytics();
    }, [analyticsYear, analyticsModalOpen]);


    const handleQuickPayment = async (member) => {
        const confirmPayment = window.confirm(`¿Confirmar pago de $${member.planCost || 2000} para ${member.fullName}?`);
        if (!confirmPayment) return;

        try {
            const paymentData = {
                memberId: member._id,
                memberName: member.fullName,
                memberCi: member.ci,
                month: selectedMonth,
                year: selectedYear,
                amount: member.planCost || 2000,
                type: 'Cuota',
                date: new Date()
            };

            await axios.post(`${API_URL}/api/finance`, paymentData);
            fetchData(); // Refresh all data
            alert('Pago registrado exitosamente');
        } catch (error) {
            console.error("Error registering payment", error);
            alert('Error al registrar el pago');
        }
    };

    const getMonthName = (m) => ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][m - 1];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    // Split lists
    const paidList = memberStatusList.filter(m => m.paid);
    const pendingList = memberStatusList.filter(m => !m.paid);

    return (
        <div className="space-y-6 pb-20">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-green-500" />
                        Control de Pagos
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Gestión de cuotas y seguimiento de morosos
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <Calendar size={18} className="text-slate-400" />
                        <select
                            className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer text-sm"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                            ))}
                        </select>
                        <select
                            className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer text-sm"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={fetchAnalytics}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        <BarChart2 size={18} />
                        Ver Métricas
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumplimiento</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-1">{completionRate}%</h3>
                        </div>
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                            <BarChart2 size={20} />
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${completionRate}%` }}></div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendientes</p>
                            <h3 className="text-3xl font-bold text-red-500 mt-1">{stats.pending}</h3>
                        </div>
                        <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                            <XCircle size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Socios sin pago registrado este mes</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recaudado</p>
                            <h3 className="text-3xl font-bold text-green-500 mt-1">
                                ${(memberStatusList.filter(m => m.paid).reduce((acc, curr) => acc + (curr.paymentDetails?.amount || 0), 0)).toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-50 text-green-500 rounded-lg">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Total ingresos por cuotas</p>
                </div>
            </div>

            {/* Main Content - Split View */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Left Column: Pending (Priority) */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-red-50/30">
                        <h3 className="font-bold text-red-600 flex items-center gap-2">
                            <AlertCircle size={20} />
                            Pendientes de Pago ({stats.pending})
                        </h3>
                        <div className="relative w-48">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-red-300 bg-white"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[600px] p-4 space-y-3">
                        {pendingList.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <CheckCircle size={48} className="mx-auto text-green-200 mb-3" />
                                <p>¡Excelente! No hay pagos pendientes para este período.</p>
                            </div>
                        ) : (
                            pendingList.map(member => (
                                <div key={member._id} className="p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow bg-white group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{member.fullName}</h4>
                                            <p className="text-xs text-slate-400 font-mono">CI: {member.ci}</p>
                                        </div>
                                        <button
                                            onClick={() => handleQuickPayment(member)}
                                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <DollarSign size={14} />
                                            Cobrar
                                        </button>
                                    </div>

                                    {/* Warnings / Context */}
                                    <div className="space-y-2">
                                        {member.note && (
                                            <div className="bg-amber-50 text-amber-800 text-xs p-2 rounded-lg flex items-start gap-2">
                                                <MessageSquare size={14} className="mt-0.5 shrink-0" />
                                                <span>"{member.note}"</span>
                                            </div>
                                        )}

                                        {member.pastDebts && member.pastDebts.length > 0 && (
                                            <div className="flex flex-wrap gap-1 items-center bg-slate-50 p-2 rounded-lg">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Deuda Histórica:</span>
                                                {member.pastDebts.map(m => (
                                                    <button
                                                        key={m}
                                                        onClick={(e) => { e.stopPropagation(); handleDismissDebt(member, m); }}
                                                        className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-600 text-[10px] font-bold rounded cursor-pointer transition-colors"
                                                        title="Clic para condonar deuda"
                                                    >
                                                        {getMonthName(m)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Paid */}
                <div className="lg:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-green-50/30">
                        <h3 className="font-bold text-green-600 flex items-center gap-2">
                            <CheckCircle size={20} />
                            Pagados ({stats.paid})
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-50">
                        {paidList.map(member => (
                            <div key={member._id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                <div>
                                    <h4 className="text-sm font-medium text-slate-700">{member.fullName}</h4>
                                    <p className="text-xs text-slate-400">{new Date(member.paymentDetails.date || member.paymentDetails.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span className="font-bold text-green-600 text-sm">
                                    ${member.paymentDetails.amount}
                                </span>
                            </div>
                        ))}
                        {paidList.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                Nadie ha pagado aún en este período.
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Analytics Modal (Kept same mostly, just updated Filter) */}
            <Modal
                isOpen={analyticsModalOpen}
                onClose={() => setAnalyticsModalOpen(false)}
                title={`Histórico Anual - ${analyticsYear}`}
            >
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 font-medium text-slate-600 focus:outline-none cursor-pointer"
                            value={analyticsYear}
                            onChange={(e) => setAnalyticsYear(Number(e.target.value))}
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
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
                                <Bar dataKey="count" name="Pagos" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-center">
                            <p className="text-xs text-slate-500 uppercase font-bold">Total Ingresos Anual</p>
                            <p className="text-2xl font-bold text-green-600">
                                ${analyticsData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl text-center">
                            <p className="text-xs text-slate-500 uppercase font-bold">Total Pagos</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {analyticsData.reduce((acc, curr) => acc + curr.count, 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Payments;
