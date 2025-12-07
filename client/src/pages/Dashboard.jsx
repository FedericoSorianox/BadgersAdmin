import { useState, useEffect } from 'react';
import { Users, CreditCard, Package, UserX, Loader2, Search } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import axios from 'axios';
import Modal from '../components/Modal';
import { API_URL } from '../config';

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, iconClass, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer hover:border-blue-200 group"
    >
        <div className={`p-4 rounded-full mb-4 ${iconClass} group-hover:scale-110 transition-transform`}>
            <Icon size={32} />
        </div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
        <p className="text-5xl font-bold text-slate-800 mb-2">{value}</p>
        <p className="text-sm text-slate-400">{subtext}</p>
    </div>
);

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(null); // 'active', 'inactive', 'stock', 'payments'
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        activeMembers: 0,
        inactiveMembers: 0,
        stockCount: 0,
        paidCount: 0,
        pendingCount: 0,
        products: [],
        membersList: [], // All members
        paymentsList: [] // Monthly payments
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [financeRes, productsRes, membersRes] = await Promise.all([
                    axios.get(`${API_URL}/api/finance`),
                    axios.get(`${API_URL}/api/products`),
                    axios.get(`${API_URL}/api/members`)
                ]);

                const payments = financeRes.data;
                const products = productsRes.data;
                const members = membersRes.data;

                // Calculate Metrics
                const stockCount = products.reduce((acc, p) => acc + (Number(p.stock) > 0 ? 1 : 0), 0);

                // Payments logic
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();

                // Active members count
                const activeMembersCount = members.filter(m => m.active).length;
                const inactiveMembersCount = members.length - activeMembersCount;

                // Paid members for current month
                // Create a Set of Member IDs who have paid
                const paidThisMonthIds = new Set(
                    payments
                        .filter(p =>
                            Number(p.month) === currentMonth &&
                            Number(p.year) === currentYear &&
                            (p.type === 'Cuota' || !p.type)
                        )
                        .map(p => String(p.memberId))
                );

                const paidCount = members.filter(m => m.active && paidThisMonthIds.has(String(m._id))).length;

                // Sort products by stock level (Low to High)
                const sortedProducts = [...products].sort((a, b) => Number(a.stock) - Number(b.stock));

                setStats({
                    activeMembers: activeMembersCount,
                    inactiveMembers: inactiveMembersCount,
                    stockCount,
                    paidCount,
                    pendingCount: activeMembersCount - paidCount,
                    products: sortedProducts,
                    membersList: members,
                    paymentsList: payments
                });

            } catch (error) {
                console.error("Error fetching dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const openModal = (type) => {
        setModalType(type);
        setSearchTerm(''); // Reset search when opening modal
        setModalOpen(true);
    };

    const handleQuickPayment = async (member) => {
        const confirmPayment = window.confirm(`¿Confirmar pago de $2000 para ${member.fullName}?`);
        if (!confirmPayment) return;

        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const paymentData = {
                memberId: member._id,
                memberName: member.fullName,
                memberCi: member.ci,
                month: currentMonth,
                year: currentYear,
                amount: member.planCost || 2000,
                type: 'Cuota',
                date: new Date()
            };

            await axios.post(`${API_URL}/api/finance`, paymentData);

            // Refresh data
            window.location.reload();

        } catch (error) {
            console.error("Error registering payment", error);
            alert('Error al registrar el pago');
        }
    };

    const renderModalContent = () => {
        if (!modalType) return null;

        if (modalType === 'active') {
            const list = stats.membersList.filter(m => m.active);
            return (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Total: {list.length} socios activos</p>
                    <div className="divide-y divide-slate-100">
                        {list.map(m => (
                            <div key={m._id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-700">{m.fullName}</p>
                                    <p className="text-xs text-slate-400">CI: {m.ci}</p>
                                </div>
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Activo</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (modalType === 'inactive') {
            const list = stats.membersList.filter(m => !m.active);
            return (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Total: {list.length} socios inactivos</p>
                    <div className="divide-y divide-slate-100">
                        {list.map(m => (
                            <div key={m._id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-700">{m.fullName}</p>
                                    <p className="text-xs text-slate-400">CI: {m.ci}</p>
                                </div>
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Inactivo</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (modalType === 'stock') {
            return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500">Total Productos: {stats.products.length}</p>
                    </div>

                    <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold">
                                <tr>
                                    <th className="px-4 py-3">Producto</th>
                                    <th className="px-4 py-3 text-right">Stock</th>
                                    <th className="px-4 py-3 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stats.products.map(p => (
                                    <tr key={p._id}>
                                        <td className="px-4 py-3 font-medium text-slate-700">{p.name}</td>
                                        <td className="px-4 py-3 text-right">{p.stock}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold
                                                ${Number(p.stock) <= 3 ? 'bg-red-100 text-red-600' :
                                                    Number(p.stock) <= 7 ? 'bg-amber-100 text-amber-600' :
                                                        'bg-green-100 text-green-600'}`}>
                                                {Number(p.stock) <= 3 ? 'Crítico' : Number(p.stock) <= 7 ? 'Bajo' : 'Normal'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (modalType === 'payments') {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            // Re-calculate paid IDs for this render scope
            const paidThisMonthIds = new Set(
                stats.paymentsList
                    .filter(p =>
                        Number(p.month) === currentMonth &&
                        Number(p.year) === currentYear &&
                        (p.type === 'Cuota' || !p.type)
                    )
                    .map(p => String(p.memberId))
            );

            const activeMembers = stats.membersList.filter(m => m.active);
            const pendingList = activeMembers.filter(m => !paidThisMonthIds.has(String(m._id)));
            const paidList = activeMembers.filter(m => paidThisMonthIds.has(String(m._id)));

            // Apply search filter
            const filteredPending = pendingList.filter(m =>
                m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.ci.includes(searchTerm)
            );
            const filteredPaid = paidList.filter(m =>
                m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.ci.includes(searchTerm)
            );

            return (
                <div className="space-y-6">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar socio por nombre o cédula..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div>
                        <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            Pendientes ({filteredPending.length})
                        </h4>
                        <div className="bg-red-50 rounded-xl p-4 max-h-[300px] overflow-y-auto divide-y divide-red-100">
                            {filteredPending.map(m => (
                                <div key={m._id} className="py-2 flex justify-between items-center">
                                    <div>
                                        <span className="text-sm font-medium text-slate-700">{m.fullName}</span>
                                        <span className="text-xs text-slate-500 ml-2">CI: {m.ci}</span>
                                    </div>
                                    <button
                                        onClick={() => handleQuickPayment(m)}
                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Marcar como Pagado
                                    </button>
                                </div>
                            ))}
                            {filteredPending.length === 0 && <p className="text-sm text-slate-400">No hay resultados.</p>}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-green-600 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-600"></span>
                            Pagados ({filteredPaid.length})
                        </h4>
                        <div className="bg-green-50 rounded-xl p-4 max-h-[200px] overflow-y-auto divide-y divide-green-100">
                            {filteredPaid.map(m => (
                                <div key={m._id} className="py-2 flex justify-between">
                                    <span className="text-sm font-medium text-slate-700">{m.fullName}</span>
                                    <span className="text-xs text-slate-500">CI: {m.ci}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }
    };

    const getModalTitle = () => {
        switch (modalType) {
            case 'active': return 'Socios Activos';
            case 'inactive': return 'Socios Inactivos/Vacaciones';
            case 'stock': return 'Inventario Completo';
            case 'payments': return `Estado de Pagos - ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
            default: return 'Detalles';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={getModalTitle()}>
                {renderModalContent()}
            </Modal>

            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-blue-500">Dashboard Principal</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="SOCIOS ACTIVOS"
                    value={stats.activeMembers}
                    subtext="(Excluyendo socios sin pago mensual)"
                    icon={Users}
                    iconClass="bg-slate-800 text-white"
                    onClick={() => openModal('active')}
                />
                <StatCard
                    title="SOCIOS INACTIVOS"
                    value={stats.inactiveMembers}
                    subtext="(Vacaciones o ausencia temporal)"
                    icon={UserX}
                    iconClass="bg-red-500 text-white"
                    onClick={() => openModal('inactive')}
                />
                <StatCard
                    title="PRODUCTOS EN INVENTARIO"
                    value={stats.stockCount}
                    subtext="(Con stock disponible)"
                    icon={Package}
                    iconClass="bg-emerald-500 text-white"
                    onClick={() => openModal('stock')}
                />
                <StatCard
                    title="ESTADO DE PAGOS"
                    value={`${stats.paidCount} / ${Math.max(0, stats.pendingCount)}`}
                    subtext="Pagados / Pendientes"
                    icon={CreditCard}
                    iconClass="bg-amber-400 text-white"
                    onClick={() => openModal('payments')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-700 mb-6 text-center">Estado de Pagos del Mes</h3>
                    <div className="flex items-center justify-center h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Pagados', value: stats.paidCount, color: '#10b981' },
                                        { name: 'Pendientes', value: stats.pendingCount, color: '#ef4444' }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {[
                                        { name: 'Pagados', value: stats.paidCount, color: '#10b981' },
                                        { name: 'Pendientes', value: stats.pendingCount, color: '#ef4444' }
                                    ].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex justify-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm text-slate-600">Pagados: {stats.paidCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm text-slate-600">Pendientes: {stats.pendingCount}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-xl font-bold text-slate-700 mb-6 text-center">Stock de Productos</h3>

                    <div className="flex-1 overflow-auto max-h-[400px]">
                        <div className="bg-slate-100 p-3 rounded-t-lg flex font-bold text-slate-500 text-sm">
                            <span className="flex-1">PRODUCTO</span>
                            <span className="w-20 text-center">STOCK</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {stats.products.slice(0, 10).map((product) => (
                                <div key={product._id} className="p-3 flex items-center hover:bg-slate-50 transition-colors">
                                    <span className="flex-1 font-medium text-slate-700">{product.name}</span>
                                    <span className={`w-20 text-center font-bold px-2 py-1 rounded-full text-xs
                                        ${Number(product.stock) <= 3 ? 'bg-red-100 text-red-600' :
                                            Number(product.stock) <= 7 ? 'bg-amber-100 text-amber-600' :
                                                'bg-green-100 text-green-600'}`}>
                                        {product.stock}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-400 rounded-full"></div> Stock crítico (≤ 3)</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-400 rounded-full"></div> Stock bajo (≤ 7)</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full"></div> Stock normal ({'>'} 7)</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
