import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search, CheckCircle, XCircle, Calendar, Loader2, DollarSign,
    BarChart2, AlertCircle, MessageSquare, Trash2, Eye, ExternalLink,
    User, Phone, Check, CheckSquare, Square, X
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';
import { API_URL } from '../config';
import { getMemberPastDebts, getAllMemberDebts } from '../utils/debtCalc';

const Payments = () => {
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [rawMembers, setRawMembers] = useState([]);
    const [payments, setPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'debts'

    // Date State for Monthly Tab
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Analytics State
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear());

    // Debts Tab State
    const [debtSearchTerm, setDebtSearchTerm] = useState('');
    const [debtFilter, setDebtFilter] = useState('all'); // 'all' | 'multiple' | 'active' | 'inactive'
    const [selectedDebtor, setSelectedDebtor] = useState(null);
    const [debtorDetailModalOpen, setDebtorDetailModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Bulk Selection State
    const [selectedDebtKeys, setSelectedDebtKeys] = useState(new Set()); // Set of `${memberId}_${month}_${year}`
    const [bulkConfirmModalOpen, setBulkConfirmModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [membersRes, paymentsRes] = await Promise.all([
                axios.get(`${API_URL}/api/members`),
                axios.get(`${API_URL}/api/finance`)
            ]);
            // Exclude non-family-heads and exempt members from billable pool
            const billable = (membersRes.data || []).filter(m => !m.isExempt && (!m.familyId || m.isFamilyHead));
            setRawMembers(billable);
            setMembers(billable.filter(m => m.active));
            setPayments(paymentsRes.data || []);
        } catch (error) {
            console.error("Error fetching data", error);
            toast.error("Error al cargar los datos de pagos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Dynamic Year Options ---
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
    }, []);

    const getMonthName = (m) => ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][m - 1];

    // --- Core Data Processing for Monthly Tab ---
    const memberStatusList = useMemo(() => {
        const processed = members.map(member => {
            const joinDate = new Date(member.joinDate || member.createdAt || new Date());
            const joinMonth = joinDate.getUTCMonth() + 1;
            const joinYear = joinDate.getUTCFullYear();

            if (Number(selectedYear) < joinYear || (Number(selectedYear) === joinYear && Number(selectedMonth) < joinMonth)) {
                return null;
            }

            const payment = payments.find(p => {
                const d = new Date(p.date || p.createdAt);
                const pMonth = p.month || (d.getMonth() + 1);
                const pYear = p.year || d.getFullYear();
                return Number(pMonth) === Number(selectedMonth) &&
                    Number(pYear) === Number(selectedYear) &&
                    (p.type === 'Cuota' || p.type === 'Condonado' || p.type === 'Licencia' || !p.type) &&
                    (p.memberId === member._id || (p.socio && p.socio.trim().toLowerCase() === member.fullName.trim().toLowerCase()));
            });

            const note = payments.find(p => {
                const d = new Date(p.date || p.createdAt);
                const pMonth = p.month || (d.getMonth() + 1);
                const pYear = p.year || d.getFullYear();
                return Number(pMonth) === Number(selectedMonth) &&
                    Number(pYear) === Number(selectedYear) &&
                    p.type === 'Nota' &&
                    p.memberId === member._id;
            });

            const pastDebts = Number(selectedYear) === new Date().getFullYear()
                ? getMemberPastDebts(member, payments, Number(selectedMonth), Number(selectedYear), null, 15)
                : [];

            return {
                ...member,
                paid: !!payment && (payment.type === 'Cuota' || !payment.type),
                isForgiven: payment?.type === 'Condonado',
                isLicensed: payment?.type === 'Licencia',
                paymentDetails: payment,
                note: note ? note.comments : null,
                pastDebts
            };
        }).filter(Boolean);

        return processed.filter(m =>
            m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.ci.includes(searchTerm)
        );
    }, [members, payments, selectedMonth, selectedYear, searchTerm]);

    const stats = {
        total: members.length,
        paid: memberStatusList.filter(m => m.paid).length, 
        forgiven: memberStatusList.filter(m => m.isForgiven).length,
        licensed: memberStatusList.filter(m => m.isLicensed).length,
        pending: memberStatusList.filter(m => !m.paid && !m.isForgiven && !m.isLicensed).length
    };

    const processedCount = stats.paid + stats.forgiven + stats.licensed;
    const completionRate = stats.total > 0 ? ((processedCount / stats.total) * 100).toFixed(0) : 0;

    // --- Core Data Processing for Debts Tab ---
    const allDebtors = useMemo(() => {
        const now = new Date();
        return rawMembers.map(member => {
            const debts = getAllMemberDebts(member, payments, now, 12, 15);
            if (!debts || debts.length === 0) return null;
            const totalDebt = debts.reduce((sum, d) => sum + (d.amount || member.planCost || 2000), 0);
            return {
                ...member,
                debts,
                totalDebt
            };
        }).filter(Boolean);
    }, [rawMembers, payments]);

    const filteredDebtors = useMemo(() => {
        const term = debtSearchTerm.trim().toLowerCase();
        let list = allDebtors.filter(d => {
            const matchesSearch = !term ||
                d.fullName.toLowerCase().includes(term) ||
                (d.ci && d.ci.includes(term));
            if (!matchesSearch) return false;

            if (debtFilter === 'multiple') return d.debts.length > 1;
            if (debtFilter === 'active') return d.active;
            if (debtFilter === 'inactive') return !d.active;
            return true;
        });
        return list.sort((a, b) => b.totalDebt - a.totalDebt);
    }, [allDebtors, debtSearchTerm, debtFilter]);

    const totalAccumulatedDebt = useMemo(() => {
        return allDebtors.reduce((sum, d) => sum + d.totalDebt, 0);
    }, [allDebtors]);

    // --- Bulk Selection Calculations & Helpers ---
    const selectedDebtsList = useMemo(() => {
        const list = [];
        allDebtors.forEach(member => {
            (member.debts || []).forEach(d => {
                const key = `${member._id}_${d.month}_${d.year}`;
                if (selectedDebtKeys.has(key)) {
                    list.push({
                        key,
                        memberId: member._id,
                        memberName: member.fullName,
                        memberCi: member.ci,
                        month: d.month,
                        year: d.year,
                        label: d.label || d.fullLabel || getMonthName(d.month),
                        amount: d.amount || member.planCost || 2000
                    });
                }
            });
        });
        return list;
    }, [allDebtors, selectedDebtKeys]);

    const selectedTotalAmount = useMemo(() => {
        return selectedDebtsList.reduce((sum, d) => sum + d.amount, 0);
    }, [selectedDebtsList]);

    const selectedMembersCount = useMemo(() => {
        return new Set(selectedDebtsList.map(d => d.memberId)).size;
    }, [selectedDebtsList]);

    const allVisibleDebtsCount = useMemo(() => {
        return filteredDebtors.reduce((acc, m) => acc + (m.debts ? m.debts.length : 0), 0);
    }, [filteredDebtors]);

    const isDebtSelected = useCallback((memberId, month, year) => {
        return selectedDebtKeys.has(`${memberId}_${month}_${year}`);
    }, [selectedDebtKeys]);

    const toggleDebtSelection = useCallback((member, debtItem) => {
        const key = `${member._id}_${debtItem.month}_${debtItem.year}`;
        setSelectedDebtKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const isMemberFullySelected = useCallback((member) => {
        if (!member.debts || member.debts.length === 0) return false;
        return member.debts.every(d => selectedDebtKeys.has(`${member._id}_${d.month}_${d.year}`));
    }, [selectedDebtKeys]);

    const isMemberPartiallySelected = useCallback((member) => {
        if (!member.debts || member.debts.length === 0) return false;
        const count = member.debts.filter(d => selectedDebtKeys.has(`${member._id}_${d.month}_${d.year}`)).length;
        return count > 0 && count < member.debts.length;
    }, [selectedDebtKeys]);

    const toggleMemberSelection = useCallback((member) => {
        const fullySelected = isMemberFullySelected(member);
        setSelectedDebtKeys(prev => {
            const next = new Set(prev);
            member.debts.forEach(d => {
                const key = `${member._id}_${d.month}_${d.year}`;
                if (fullySelected) {
                    next.delete(key);
                } else {
                    next.add(key);
                }
            });
            return next;
        });
    }, [isMemberFullySelected]);

    const selectAllVisible = useCallback(() => {
        setSelectedDebtKeys(prev => {
            const next = new Set(prev);
            filteredDebtors.forEach(member => {
                member.debts.forEach(d => {
                    next.add(`${member._id}_${d.month}_${d.year}`);
                });
            });
            return next;
        });
    }, [filteredDebtors]);

    const clearAllSelection = useCallback(() => {
        setSelectedDebtKeys(new Set());
    }, []);

    // --- Analytics Fetcher ---
    const fetchAnalytics = useCallback(() => {
        const allPayments = payments.filter(p => (p.type === 'Cuota' || !p.type) && p.type !== 'Condonado' && p.type !== 'Licencia');
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
    }, [analyticsYear, payments]);

    useEffect(() => {
        if (analyticsModalOpen) fetchAnalytics();
    }, [analyticsYear, analyticsModalOpen, fetchAnalytics]);

    // --- Action Handlers ---
    const handleDismissDebt = async (member, monthToDismiss = null) => {
        const targetMonth = monthToDismiss || selectedMonth;
        const confirmDismiss = window.confirm(`¿Seguro que deseas condonar (perdonar) la deuda de ${getMonthName(targetMonth)} para ${member.fullName}? No se registrará ingreso ($0).`);
        if (!confirmDismiss) return;

        try {
            setActionLoading(true);
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
            await fetchData();
            toast.success(`Deuda de ${getMonthName(targetMonth)} condonada exitosamente`);
        } catch (error) {
            console.error("Error dismissing debt", error);
            toast.error('Error al condonar la deuda');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDismissAllDebts = async (member) => {
        const list = member.debts;
        if (!list || list.length === 0) return;
        const total = member.totalDebt || list.reduce((sum, d) => sum + (d.amount || member.planCost || 2000), 0);
        const monthsStr = list.map(d => `${d.label || getMonthName(d.month)} ${d.year}`).join(', ');

        const confirmDismiss = window.confirm(
            `¿Estás seguro de que deseas borrar (condonar) toda la deuda de ${member.fullName}?\n\n` +
            `• Meses a condonar (${list.length}): ${monthsStr}\n` +
            `• Monto total: $${total.toLocaleString()}\n\n` +
            `Esta acción perdonará toda la deuda ($0) y no registrará ingresos.`
        );
        if (!confirmDismiss) return;

        try {
            setActionLoading(true);
            const promises = list.map(d => axios.post(`${API_URL}/api/finance`, {
                memberId: member._id,
                memberName: member.fullName,
                memberCi: member.ci,
                month: d.month,
                year: d.year,
                amount: 0,
                type: 'Condonado',
                date: new Date()
            }));
            await Promise.all(promises);
            await fetchData();

            // Clear selected keys for this member if any
            setSelectedDebtKeys(prev => {
                const next = new Set(prev);
                list.forEach(d => next.delete(`${member._id}_${d.month}_${d.year}`));
                return next;
            });

            if (selectedDebtor && selectedDebtor._id === member._id) {
                setDebtorDetailModalOpen(false);
                setSelectedDebtor(null);
            }
            toast.success(`Deuda completa de ${member.fullName} borrada (condonada) exitosamente.`);
        } catch (error) {
            console.error("Error al condonar deuda total:", error);
            toast.error("Error al intentar borrar la deuda.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDismissSingleDebt = async (member, debtItem) => {
        const monthLabel = debtItem.fullLabel || debtItem.label || getMonthName(debtItem.month);
        const confirmDismiss = window.confirm(
            `¿Condonar (borrar) la deuda de ${monthLabel} ${debtItem.year} ($${(debtItem.amount || member.planCost || 2000).toLocaleString()}) para ${member.fullName}?`
        );
        if (!confirmDismiss) return;

        try {
            setActionLoading(true);
            await axios.post(`${API_URL}/api/finance`, {
                memberId: member._id,
                memberName: member.fullName,
                memberCi: member.ci,
                month: debtItem.month,
                year: debtItem.year,
                amount: 0,
                type: 'Condonado',
                date: new Date()
            });
            await fetchData();

            // Clear selected key if present
            setSelectedDebtKeys(prev => {
                const next = new Set(prev);
                next.delete(`${member._id}_${debtItem.month}_${debtItem.year}`);
                return next;
            });

            if (selectedDebtor && selectedDebtor._id === member._id) {
                const remaining = selectedDebtor.debts.filter(d => !(d.month === debtItem.month && d.year === debtItem.year));
                if (remaining.length === 0) {
                    setDebtorDetailModalOpen(false);
                    setSelectedDebtor(null);
                } else {
                    setSelectedDebtor({
                        ...selectedDebtor,
                        debts: remaining,
                        totalDebt: remaining.reduce((sum, d) => sum + (d.amount || selectedDebtor.planCost || 2000), 0)
                    });
                }
            }
            toast.success(`Mes ${monthLabel} ${debtItem.year} condonado exitosamente.`);
        } catch (error) {
            console.error("Error al condonar mes:", error);
            toast.error("Error al condonar este mes.");
        } finally {
            setActionLoading(false);
        }
    };

    // --- Bulk Dismissal Handler (Single Confirmation) ---
    const handleDismissBulkDebts = async () => {
        if (selectedDebtsList.length === 0) return;

        try {
            setActionLoading(true);
            const count = selectedDebtsList.length;
            const total = selectedTotalAmount;

            const promises = selectedDebtsList.map(item => axios.post(`${API_URL}/api/finance`, {
                memberId: item.memberId,
                memberName: item.memberName,
                memberCi: item.memberCi,
                month: item.month,
                year: item.year,
                amount: 0,
                type: 'Condonado',
                date: new Date()
            }));

            await Promise.all(promises);
            await fetchData();

            clearAllSelection();
            setBulkConfirmModalOpen(false);

            toast.success(`Se borraron (condonaron) ${count} deudas por $${total.toLocaleString()} exitosamente.`);
        } catch (error) {
            console.error("Error al condonar deudas en bloque:", error);
            toast.error("Ocurrió un error al condonar las deudas en bloque.");
        } finally {
            setActionLoading(false);
        }
    };

    const handlePaySingleDebt = async (member, debtItem) => {
        const cost = debtItem.amount || member.planCost || 2000;
        const monthLabel = debtItem.label || getMonthName(debtItem.month);
        const confirmPay = window.confirm(
            `¿Confirmar cobro de $${cost.toLocaleString()} para ${member.fullName} (${monthLabel} ${debtItem.year})?`
        );
        if (!confirmPay) return;

        try {
            setActionLoading(true);
            await axios.post(`${API_URL}/api/finance`, {
                memberId: member._id,
                memberName: member.fullName,
                memberCi: member.ci,
                month: debtItem.month,
                year: debtItem.year,
                amount: cost,
                type: 'Cuota',
                date: new Date()
            });
            await fetchData();

            setSelectedDebtKeys(prev => {
                const next = new Set(prev);
                next.delete(`${member._id}_${debtItem.month}_${debtItem.year}`);
                return next;
            });

            if (selectedDebtor && selectedDebtor._id === member._id) {
                const remaining = selectedDebtor.debts.filter(d => !(d.month === debtItem.month && d.year === debtItem.year));
                if (remaining.length === 0) {
                    setDebtorDetailModalOpen(false);
                    setSelectedDebtor(null);
                } else {
                    setSelectedDebtor({
                        ...selectedDebtor,
                        debts: remaining,
                        totalDebt: remaining.reduce((sum, d) => sum + (d.amount || selectedDebtor.planCost || 2000), 0)
                    });
                }
            }
            toast.success('Pago registrado correctamente');
        } catch (error) {
            console.error('Error al registrar pago:', error);
            toast.error('Error al registrar pago');
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewDebtor = (member) => {
        setSelectedDebtor(member);
        setDebtorDetailModalOpen(true);
    };

    const handleQuickPayment = async (member) => {
        const confirmPayment = window.confirm(`¿Confirmar pago para ${member.fullName}?`);
        if (!confirmPayment) return;

        try {
            setActionLoading(true);
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
            await fetchData();
            toast.success('Pago registrado exitosamente');
        } catch (error) {
            console.error("Error registering payment", error);
            toast.error('Error al registrar el pago');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevertStatus = async (paymentId) => {
        const confirmRevert = window.confirm('¿Seguro que deseas deshacer este estado y volver a Pendiente?');
        if (!confirmRevert) return;
        try {
            setActionLoading(true);
            await axios.delete(`${API_URL}/api/finance/${paymentId}`);
            await fetchData();
            toast.success('Estado revertido correctamente');
        } catch (error) {
            console.error('Error al deshacer estado:', error);
            toast.error('Hubo un error al deshacer el estado');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full py-20">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    const paidList = memberStatusList.filter(m => m.paid);
    const specialList = memberStatusList.filter(m => m.isForgiven || m.isLicensed);
    const pendingList = memberStatusList.filter(m => !m.paid && !m.isForgiven && !m.isLicensed);

    return (
        <div className="space-y-6 pb-28">
            {/* Header & Main Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-emerald-500" />
                        Control de Pagos
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Gestión integral de cuotas, cobranzas y socios con deuda
                    </p>
                </div>

                {activeTab === 'monthly' && (
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
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                        >
                            <BarChart2 size={18} />
                            Ver Métricas
                        </button>
                    </div>
                )}
            </div>

            {/* TAB NAVIGATION BAR */}
            <div className="flex border-b border-slate-200 gap-2 bg-white px-6 pt-3 rounded-2xl shadow-sm">
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'monthly'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Calendar size={18} />
                    <span>Control Mensual</span>
                    <span className="text-xs font-normal text-slate-400 hidden sm:inline">
                        ({getMonthName(selectedMonth)} {selectedYear})
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('debts')}
                    className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                        activeTab === 'debts'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <AlertCircle size={18} />
                    <span>Socios con Deuda</span>
                    {allDebtors.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700">
                            {allDebtors.length}
                        </span>
                    )}
                </button>
            </div>

            {/* TAB 1: MONTHLY CONTROL VIEW */}
            {activeTab === 'monthly' && (
                <div className="space-y-6">
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
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleDismissDebt(member)}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                        title="Condonar/Borrar deuda de este mes"
                                                    >
                                                        Condonar
                                                    </button>
                                                    <button
                                                        onClick={() => handleQuickPayment(member)}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                    >
                                                        <DollarSign size={14} />
                                                        Cobrar
                                                    </button>
                                                </div>
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

                        {/* Right Column: Special & Paid */}
                        <div className="lg:w-1/3 flex flex-col gap-6">
                            {/* Special Status Section */}
                            {specialList.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col max-h-[300px]">
                                    <div className="p-4 border-b border-slate-100 bg-purple-50/30">
                                        <h3 className="font-bold text-purple-600 flex items-center gap-2">
                                            <AlertCircle size={18} />
                                            Licencia o Perdonados ({specialList.length})
                                        </h3>
                                    </div>
                                    <div className="overflow-y-auto divide-y divide-slate-50">
                                        {specialList.map(member => (
                                            <div key={member._id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                                <div>
                                                    <h4 className="text-sm font-medium text-purple-800">{member.fullName}</h4>
                                                    <p className="text-xs text-purple-400">
                                                        {member.isLicensed ? 'En Licencia' : 'Condonado'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRevertStatus(member.paymentDetails._id)}
                                                    disabled={actionLoading}
                                                    className="px-2 py-1 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-[10px] font-bold rounded-md transition-colors opacity-0 group-hover:opacity-100 cursor-pointer disabled:opacity-50"
                                                    title="Deshacer estado"
                                                >
                                                    Revertir
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Paid Section */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1">
                                <div className="p-6 border-b border-slate-100 bg-green-50/30">
                                    <h3 className="font-bold text-green-600 flex items-center gap-2">
                                        <CheckCircle size={20} />
                                        Pagados ({stats.paid})
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-50">
                                    {paidList.map(member => (
                                        <div key={member._id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-700">{member.fullName}</h4>
                                                <p className="text-xs text-slate-400 capitalize">{new Date(member.paymentDetails.date || member.paymentDetails.createdAt).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleRevertStatus(member.paymentDetails._id)}
                                                    disabled={actionLoading}
                                                    className="px-2 py-1 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-[10px] font-bold rounded-md transition-colors opacity-0 group-hover:opacity-100 cursor-pointer disabled:opacity-50"
                                                    title="Deshacer pago"
                                                >
                                                    Revertir
                                                </button>
                                                <span className="font-bold text-green-600 text-sm bg-green-50 px-2 py-1 rounded-md">
                                                    ${member.paymentDetails.amount.toLocaleString()}
                                                </span>
                                            </div>
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
                    </div>
                </div>
            )}

            {/* TAB 2: ALL DEBTORS VIEW WITH BULK ACTIONS */}
            {activeTab === 'debts' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Socios con Deuda</p>
                                <h3 className="text-3xl font-black text-red-600 mt-1">{allDebtors.length}</h3>
                                <p className="text-xs text-slate-400 mt-1">Con cuotas acumuladas impagas</p>
                            </div>
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                <AlertCircle size={28} />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deuda Total Acumulada</p>
                                <h3 className="text-3xl font-black text-slate-800 mt-1">${totalAccumulatedDebt.toLocaleString()}</h3>
                                <p className="text-xs text-slate-400 mt-1">Suma total de cuotas pendientes</p>
                            </div>
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                <DollarSign size={28} />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promedio por Deudor</p>
                                <h3 className="text-3xl font-black text-slate-700 mt-1">
                                    ${(allDebtors.length > 0 ? Math.round(totalAccumulatedDebt / allDebtors.length) : 0).toLocaleString()}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Monto promedio adeudado</p>
                            </div>
                            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
                                <BarChart2 size={28} />
                            </div>
                        </div>
                    </div>

                    {/* Filter, Search & Bulk Select Toolbar */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar deudor por nombre o CI..."
                                    value={debtSearchTerm}
                                    onChange={e => setDebtSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-red-400 bg-slate-50/50"
                                />
                            </div>

                            {/* Filter Badges */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                                <button
                                    onClick={() => setDebtFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                        debtFilter === 'all'
                                            ? 'bg-slate-800 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Todos ({allDebtors.length})
                                </button>
                                <button
                                    onClick={() => setDebtFilter('multiple')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                        debtFilter === 'multiple'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    &gt; 1 mes ({allDebtors.filter(d => d.debts.length > 1).length})
                                </button>
                                <button
                                    onClick={() => setDebtFilter('active')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                        debtFilter === 'active'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Activos ({allDebtors.filter(d => d.active).length})
                                </button>
                                <button
                                    onClick={() => setDebtFilter('inactive')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                        debtFilter === 'inactive'
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Inactivos ({allDebtors.filter(d => !d.active).length})
                                </button>
                            </div>
                        </div>

                        {/* Bulk Selection Quick Bar */}
                        <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={selectedDebtKeys.size > 0 && selectedDebtKeys.size === allVisibleDebtsCount ? clearAllSelection : selectAllVisible}
                                    className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    {selectedDebtKeys.size > 0 && selectedDebtKeys.size === allVisibleDebtsCount ? (
                                        <>
                                            <CheckSquare size={15} />
                                            <span>Deseleccionar todos ({filteredDebtors.length} socios)</span>
                                        </>
                                    ) : (
                                        <>
                                            <Square size={15} />
                                            <span>Seleccionar todos ({filteredDebtors.length} socios, {allVisibleDebtsCount} deudas)</span>
                                        </>
                                    )}
                                </button>

                                {selectedDebtKeys.size > 0 && (
                                    <span className="text-slate-500 font-medium">
                                        • <strong className="text-red-600 font-bold">{selectedDebtKeys.size}</strong> deudas seleccionadas de <strong className="text-slate-800 font-bold">{selectedMembersCount}</strong> socios
                                    </span>
                                )}
                            </div>

                            {selectedDebtKeys.size > 0 && (
                                <button
                                    onClick={clearAllSelection}
                                    className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline decoration-dotted"
                                >
                                    Limpiar selección
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Debtors List */}
                    {filteredDebtors.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <CheckCircle size={56} className="mx-auto text-emerald-400 mb-3" />
                            <h3 className="text-lg font-bold text-slate-800">No se encontraron socios con deuda</h3>
                            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                                {debtSearchTerm
                                    ? `No hay resultados para "${debtSearchTerm}".`
                                    : '¡Excelente! Todos los socios están al día o tienen sus meses saldados.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredDebtors.map(member => {
                                const isMemberFull = isMemberFullySelected(member);
                                const isMemberPartial = isMemberPartiallySelected(member);

                                return (
                                    <div
                                        key={member._id}
                                        className={`bg-white rounded-2xl p-5 border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group shadow-sm hover:shadow-md ${
                                            isMemberFull
                                                ? 'border-red-400 bg-red-50/15 ring-1 ring-red-300'
                                                : isMemberPartial
                                                ? 'border-amber-300 bg-amber-50/10'
                                                : 'border-slate-200'
                                        }`}
                                    >
                                        {/* Member Info & Selection Checkbox */}
                                        <div className="flex items-start gap-3.5 flex-1 w-full md:w-auto">
                                            {/* Member Checkbox */}
                                            <div className="pt-2 shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={isMemberFull}
                                                    ref={el => {
                                                        if (el) el.indeterminate = isMemberPartial;
                                                    }}
                                                    onChange={() => toggleMemberSelection(member)}
                                                    className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer accent-red-600 transition-transform hover:scale-110"
                                                    title="Seleccionar / deseleccionar todas las deudas de este socio"
                                                />
                                            </div>

                                            {/* Avatar */}
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 font-bold overflow-hidden border border-slate-200">
                                                {member.photoUrl ? (
                                                    <img
                                                        src={member.photoUrl.startsWith('http') ? member.photoUrl : `${API_URL}${member.photoUrl}`}
                                                        alt={member.fullName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User size={24} />
                                                )}
                                            </div>

                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-slate-800 text-base">{member.fullName}</h3>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        member.active
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                    }`}>
                                                        {member.active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                        {member.planType || 'Libre'} (${(member.planCost || 2000).toLocaleString()})
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                                                    <span>CI: <strong className="text-slate-600 font-mono">{member.ci || 'N/A'}</strong></span>
                                                    {member.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone size={12} />
                                                            {member.phone}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Selectable Month Chips */}
                                                <div className="flex flex-wrap gap-1.5 pt-2">
                                                    {member.debts.map(d => {
                                                        const isSelected = isDebtSelected(member._id, d.month, d.year);
                                                        return (
                                                            <div
                                                                key={`${d.month}-${d.year}`}
                                                                onClick={() => toggleDebtSelection(member, d)}
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none group/chip ${
                                                                    isSelected
                                                                        ? 'bg-red-600 text-white border-red-600 shadow-sm ring-2 ring-red-300 scale-102'
                                                                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300'
                                                                }`}
                                                                title="Clic para seleccionar/deseleccionar para borrar en bloque"
                                                            >
                                                                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] transition-colors ${
                                                                    isSelected ? 'bg-white text-red-600 font-black' : 'border border-red-300 text-transparent'
                                                                }`}>
                                                                    ✓
                                                                </span>
                                                                <span>{d.label || getMonthName(d.month)} {d.year}</span>
                                                                <span className={`text-[10px] font-normal ${isSelected ? 'text-red-100' : 'text-red-400'}`}>
                                                                    (${(d.amount || member.planCost || 2000).toLocaleString()})
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDismissSingleDebt(member, d);
                                                                    }}
                                                                    disabled={actionLoading}
                                                                    title="Borrar solo este mes ahora"
                                                                    className={`ml-1 font-black cursor-pointer hover:scale-125 transition-transform ${
                                                                        isSelected ? 'text-white/80 hover:text-white' : 'text-red-400 hover:text-red-700'
                                                                    }`}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Debt Amount & Actions */}
                                        <div className="flex flex-row md:flex-col items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                                            <div className="text-left md:text-right">
                                                <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">
                                                    Deuda Total
                                                </span>
                                                <span className="text-2xl font-black text-red-600 block">
                                                    ${member.totalDebt.toLocaleString()}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {member.debts.length} {member.debts.length === 1 ? 'mes adeudado' : 'meses adeudados'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* SOLO VERLA: Ver Detalle */}
                                                <button
                                                    onClick={() => handleViewDebtor(member)}
                                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                                                    title="Solo ver el detalle de la deuda"
                                                >
                                                    <Eye size={14} />
                                                    <span>Ver Detalle</span>
                                                </button>

                                                {/* BORRAR ESA DEUDA: Condonar toda la deuda */}
                                                <button
                                                    onClick={() => handleDismissAllDebts(member)}
                                                    disabled={actionLoading}
                                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                    title="Borrar (condonar) toda la deuda de este socio"
                                                >
                                                    <Trash2 size={14} />
                                                    <span>Borrar Deuda</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* FLOATING BULK ACTIONS BAR */}
                    {selectedDebtKeys.size > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 border border-slate-700/80 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-black text-sm border border-red-500/30">
                                    {selectedDebtsList.length}
                                </span>
                                <div>
                                    <p className="font-bold text-sm text-white flex items-center gap-1.5">
                                        <span>{selectedDebtsList.length} {selectedDebtsList.length === 1 ? 'deuda seleccionada' : 'deudas seleccionadas'}</span>
                                        <span className="text-slate-400 text-xs font-normal">({selectedMembersCount} {selectedMembersCount === 1 ? 'socio' : 'socios'})</span>
                                    </p>
                                    <p className="text-xs text-red-300 font-semibold">
                                        Total a condonar: ${selectedTotalAmount.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearAllSelection}
                                    disabled={actionLoading}
                                    className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>

                                <button
                                    onClick={() => setBulkConfirmModalOpen(true)}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <Trash2 size={14} />
                                    <span>Borrar Seleccionadas ({selectedDebtsList.length})</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL 1: VER DETALLE DE LA DEUDA ("Solo verla") */}
            <Modal
                isOpen={debtorDetailModalOpen}
                onClose={() => {
                    setDebtorDetailModalOpen(false);
                    setSelectedDebtor(null);
                }}
                title={selectedDebtor ? `Detalle de Deuda - ${selectedDebtor.fullName}` : 'Detalle de Deuda'}
            >
                {selectedDebtor && (
                    <div className="space-y-6">
                        {/* Member Summary Header */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-slate-800 text-base">{selectedDebtor.fullName}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    CI: <strong className="font-mono">{selectedDebtor.ci || 'N/A'}</strong> • Plan: <strong>{selectedDebtor.planType || 'Libre'}</strong>
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Estado: <span className={selectedDebtor.active ? 'text-emerald-600 font-bold' : 'text-slate-500 font-bold'}>
                                        {selectedDebtor.active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-slate-400 font-semibold uppercase block">Total a Pagar</span>
                                <span className="text-2xl font-black text-red-600 block">
                                    ${selectedDebtor.totalDebt.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Breakdown Table */}
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Meses Adeudados ({selectedDebtor.debts.length})
                            </h5>
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                                {selectedDebtor.debts.map((item) => (
                                    <div
                                        key={`${item.month}-${item.year}`}
                                        className="p-3 bg-white flex justify-between items-center hover:bg-slate-50 transition-colors"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-800">
                                                    {item.fullLabel || getMonthName(item.month)} {item.year}
                                                </span>
                                                {item.isCurrent && (
                                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                                        Mes Actual
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-400">Cuota mensual</span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-sm text-slate-700">
                                                ${(item.amount || selectedDebtor.planCost || 2000).toLocaleString()}
                                            </span>

                                            {/* Cobrar Mes */}
                                            <button
                                                onClick={() => handlePaySingleDebt(selectedDebtor, item)}
                                                disabled={actionLoading}
                                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                                                title="Cobrar este mes"
                                            >
                                                <DollarSign size={13} />
                                                Cobrar
                                            </button>

                                            {/* Borrar este Mes */}
                                            <button
                                                onClick={() => handleDismissSingleDebt(selectedDebtor, item)}
                                                disabled={actionLoading}
                                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 transition-colors cursor-pointer flex items-center gap-1"
                                                title="Condonar (borrar) este mes"
                                            >
                                                <Trash2 size={13} />
                                                Borrar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => window.open(`/public/profile/${selectedDebtor._id}`, '_blank')}
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                            >
                                <ExternalLink size={14} />
                                Ver Ficha Pública del Socio
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDismissAllDebts(selectedDebtor)}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <Trash2 size={14} />
                                    Borrar Toda la Deuda (${selectedDebtor.totalDebt.toLocaleString()})
                                </button>
                                <button
                                    onClick={() => {
                                        setDebtorDetailModalOpen(false);
                                        setSelectedDebtor(null);
                                    }}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL 2: CONFIRMACIÓN DE BORRADO EN BLOQUE (Bulk Confirmation) */}
            <Modal
                isOpen={bulkConfirmModalOpen}
                onClose={() => setBulkConfirmModalOpen(false)}
                title="Confirmar Borrado de Deudas en Bloque"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={22} />
                        <div>
                            <h4 className="font-bold text-red-800 text-sm">¿Confirmar condonación de deudas seleccionadas?</h4>
                            <p className="text-xs text-red-700 mt-1">
                                Estás a punto de perdonar <strong>{selectedDebtsList.length} cuotas</strong> de <strong>{selectedMembersCount} socios</strong> por un total de <strong>${selectedTotalAmount.toLocaleString()}</strong>.
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Esta acción registrará las cuotas como Condonadas ($0) en una sola confirmación. No se computará ingreso de caja.
                            </p>
                        </div>
                    </div>

                    {/* Breakdown list */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Detalle de deudas a borrar ({selectedDebtsList.length})
                        </p>
                        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                            {selectedDebtsList.map(item => (
                                <div key={item.key} className="p-2.5 px-3 flex justify-between items-center text-xs hover:bg-slate-50">
                                    <div>
                                        <strong className="text-slate-800">{item.memberName}</strong>
                                        <span className="text-slate-400 font-mono ml-1.5">(CI: {item.memberCi || 'N/A'})</span>
                                        <span className="block text-[11px] text-slate-500 font-medium">{item.label} {item.year}</span>
                                    </div>
                                    <span className="font-black text-red-600">${item.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            onClick={() => setBulkConfirmModalOpen(false)}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDismissBulkDebts}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            <span>Confirmar y Borrar {selectedDebtsList.length} Deudas</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL 3: HISTÓRICO ANUAL (Métricas) */}
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
