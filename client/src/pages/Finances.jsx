import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Edit, Trash2, Filter, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';
import { API_URL } from '../config';

const monthlyData = [
    { name: 'Ene', ingresos: 4000, gastos: 2400 },
    { name: 'Feb', ingresos: 3000, gastos: 1398 },
    { name: 'Mar', ingresos: 2000, gastos: 9800 },
    { name: 'Abr', ingresos: 2780, gastos: 3908 },
    { name: 'May', ingresos: 1890, gastos: 4800 },
    { name: 'Jun', ingresos: 2390, gastos: 3800 },
];

const MONTHS = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
];

const Finances = () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [transactions, setTransactions] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [filterType, setFilterType] = useState('all'); // 'all', 'cuotas', 'ventas', 'gastos'
    const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
    const [newSaleForm, setNewSaleForm] = useState({
        productId: '',
        productName: '',
        amount: 0,
        quantity: 1
    });
    const [newExpenseModalOpen, setNewExpenseModalOpen] = useState(false);
    const [newExpenseForm, setNewExpenseForm] = useState({
        description: '',
        amount: 0,
        concept: ''
    });

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const [paymentsRes, expensesRes, productsRes] = await Promise.all([
                axios.get(`${API_URL}/api/finance`, {
                    params: { month: selectedMonth, year: selectedYear }
                }),
                axios.get(`${API_URL}/api/finance/expenses`),
                axios.get(`${API_URL}/api/products`)
            ]);

            setProducts(productsRes.data);

            // Combine payments and expenses
            const payments = paymentsRes.data.map(p => ({ ...p, category: p.type || 'Cuota' }));
            const expenses = expensesRes.data
                .filter(e => {
                    const eDate = new Date(e.date);
                    return (eDate.getMonth() + 1) === selectedMonth && eDate.getFullYear() === selectedYear;
                })
                .map(e => ({ ...e, category: 'Gasto', amount: -Math.abs(e.amount) }));

            const allTransactions = [...payments, ...expenses].sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            );

            setTransactions(allTransactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [selectedMonth, selectedYear]);

    const handleDelete = async (transaction) => {
        if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;

        try {
            if (transaction.category === 'Gasto') {
                await axios.delete(`${API_URL}/api/finance/expenses/${transaction._id}`);
            } else {
                await axios.delete(`${API_URL}/api/finance/${transaction._id}`);
            }
            fetchTransactions();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Error al eliminar la transacción');
        }
    };

    const handleEdit = (transaction) => {
        setEditingTransaction(transaction);
    };

    const handleSaveEdit = async () => {
        try {
            if (editingTransaction.category === 'Gasto') {
                await axios.put(`${API_URL}/api/finance/expenses/${editingTransaction._id}`, editingTransaction);
            } else {
                await axios.put(`${API_URL}/api/finance/${editingTransaction._id}`, editingTransaction);
            }
            setEditingTransaction(null);
            fetchTransactions();
        } catch (error) {
            console.error('Error updating transaction:', error);
            alert('Error al actualizar la transacción');
        }
    };

    const handleNewSale = async () => {
        if (!newSaleForm.productId || !newSaleForm.amount) {
            alert('Por favor selecciona un producto');
            return;
        }

        try {
            const saleData = {
                productName: newSaleForm.productName,
                productId: newSaleForm.productId, // Add productId for stock deduction
                quantity: newSaleForm.quantity,   // Add quantity for stock deduction
                amount: newSaleForm.amount * newSaleForm.quantity,
                type: 'Producto',
                month: selectedMonth,
                year: selectedYear,
                date: new Date()
            };

            await axios.post(`${API_URL}/api/finance`, saleData);
            setNewSaleModalOpen(false);
            setNewSaleForm({ productId: '', productName: '', amount: 0, quantity: 1 });
            fetchTransactions();
        } catch (error) {
            console.error('Error registering sale:', error);
            alert('Error al registrar la venta');
        }
    };

    const handleProductSelect = (e) => {
        const productId = e.target.value;
        const product = products.find(p => p._id === productId);
        if (product) {
            setNewSaleForm({
                productId: product._id,
                productName: product.name,
                amount: product.salePrice,
                quantity: 1
            });
        }
    };

    const handleNewExpense = async () => {
        if (!newExpenseForm.description || !newExpenseForm.amount) {
            alert('Por favor completa todos los campos');
            return;
        }

        try {
            const expenseData = {
                description: newExpenseForm.description,
                concept: newExpenseForm.concept,
                amount: newExpenseForm.amount,
                date: new Date()
            };

            await axios.post(`${API_URL}/api/finance/expenses`, expenseData);
            setNewExpenseModalOpen(false);
            setNewExpenseForm({ description: '', amount: 0, concept: '' });
            fetchTransactions();
        } catch (error) {
            console.error('Error registering expense:', error);
            alert('Error al registrar el gasto');
        }
    };

    // Calculate stats
    const stats = {
        totalCuotas: transactions.filter(t => t.category === 'Cuota').reduce((acc, t) => acc + t.amount, 0),
        totalVentas: transactions.filter(t => t.category === 'Producto' || t.category === 'Venta').reduce((acc, t) => acc + t.amount, 0),
        totalGastos: Math.abs(transactions.filter(t => t.category === 'Gasto').reduce((acc, t) => acc + t.amount, 0)),
    };
    stats.balance = stats.totalCuotas + stats.totalVentas - stats.totalGastos;

    // Filter transactions
    const filteredTransactions = transactions.filter(t => {
        if (filterType === 'all') return true;
        if (filterType === 'cuotas') return t.category === 'Cuota';
        if (filterType === 'ventas') return t.category === 'Producto' || t.category === 'Venta';
        if (filterType === 'gastos') return t.category === 'Gasto';
        return true;
    });

    // Helper function to get category badge color
    const getCategoryBadge = (category) => {
        switch (category) {
            case 'Cuota': return 'bg-blue-100 text-blue-800';
            case 'Producto':
            case 'Venta': return 'bg-purple-100 text-purple-800';
            case 'Gasto': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getTransactionColor = (category) => {
        return category === 'Gasto' ? 'text-red-600' : 'text-green-600';
    };

    // Generate daily data for the selected month
    const getDaysInMonth = (month, year) => {
        return new Date(year, month, 0).getDate();
    };

    const monthlyData = (() => {
        const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
        const dailyData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const dayTransactions = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getDate() === day &&
                    tDate.getMonth() + 1 === selectedMonth &&
                    tDate.getFullYear() === selectedYear;
            });

            const ingresos = dayTransactions
                .filter(t => t.category !== 'Gasto')
                .reduce((acc, t) => acc + t.amount, 0);

            const gastos = Math.abs(dayTransactions
                .filter(t => t.category === 'Gasto')
                .reduce((acc, t) => acc + t.amount, 0));

            dailyData.push({
                name: day.toString(),
                ingresos,
                gastos
            });
        }

        return dailyData;
    })();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Finanzas</h1>
                    <p className="text-slate-500 mt-1">Control de ingresos y egresos.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setNewSaleModalOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Nueva Venta
                    </button>

                    <button
                        onClick={() => setNewExpenseModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Nuevo Gasto
                    </button>

                    <select
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    >
                        {MONTHS.map(month => (
                            <option key={month.value} value={month.value}>
                                {month.label}
                            </option>
                        ))}
                    </select>

                    <select
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {[2023, 2024, 2025].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Venta Cuotas</p>
                            <h3 className="text-2xl font-bold text-slate-800">${stats.totalCuotas.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Venta Productos</p>
                            <h3 className="text-2xl font-bold text-slate-800">${stats.totalVentas.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <TrendingDown size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Gastos</p>
                            <h3 className="text-2xl font-bold text-slate-800">${stats.totalGastos.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stats.balance >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Balance</p>
                            <h3 className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${stats.balance.toLocaleString()}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setFilterType('cuotas')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'cuotas'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    Cuotas
                </button>
                <button
                    onClick={() => setFilterType('ventas')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'ventas'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    Ventas
                </button>
                <button
                    onClick={() => setFilterType('gastos')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'gastos'
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    Gastos
                </button>
            </div>

            {/* Chart Section - MOVED UP */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6">
                    Flujo de Caja Mensual - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </h3>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} prefix="$" />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ingresos" />
                            <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gastos" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Transactions List - MOVED DOWN */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">
                        Lista de Transacciones - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                    </h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">Cargando...</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No hay transacciones registradas</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.map((transaction) => (
                                    <tr key={transaction._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {new Date(transaction.date).toLocaleDateString('es-UY')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                                            {transaction.productName || transaction.memberName || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {transaction.description || transaction.concept || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(transaction.category)}`}>
                                                {transaction.category}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${getTransactionColor(transaction.category)}`}>
                                            ${Math.abs(transaction.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEdit(transaction)}
                                                className="text-slate-400 hover:text-primary transition-colors p-2"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(transaction)}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-2"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* New Sale Modal */}
            {newSaleModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Nueva Venta de Producto</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Producto</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={newSaleForm.productId}
                                    onChange={handleProductSelect}
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {products.map(product => (
                                        <option key={product._id} value={product._id}>
                                            {product.name} - ${product.salePrice}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={newSaleForm.quantity}
                                    onChange={(e) => setNewSaleForm({ ...newSaleForm, quantity: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Precio Unitario</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={newSaleForm.amount}
                                    onChange={(e) => setNewSaleForm({ ...newSaleForm, amount: Number(e.target.value) })}
                                />
                            </div>

                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">Total:</span>
                                    <span className="text-xl font-bold text-green-600">
                                        ${(newSaleForm.amount * newSaleForm.quantity).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setNewSaleModalOpen(false);
                                    setNewSaleForm({ productId: '', productName: '', amount: 0, quantity: 1 });
                                }}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleNewSale}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Registrar Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Expense Modal */}
            {newExpenseModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Nuevo Gasto</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={newExpenseForm.description}
                                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                                    placeholder="Ej: Alquiler, Equipamiento, etc."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Concepto (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={newExpenseForm.concept}
                                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, concept: e.target.value })}
                                    placeholder="Detalles adicionales"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={newExpenseForm.amount}
                                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: Number(e.target.value) })}
                                />
                            </div>

                            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">Total Gasto:</span>
                                    <span className="text-xl font-bold text-red-600">
                                        ${newExpenseForm.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setNewExpenseModalOpen(false);
                                    setNewExpenseForm({ description: '', amount: 0, concept: '' });
                                }}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleNewExpense}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Registrar Gasto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingTransaction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Editar Transacción</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {editingTransaction.category === 'Gasto' ? 'Descripción' :
                                        editingTransaction.category === 'Producto' || editingTransaction.category === 'Venta' ? 'Nombre del Producto' :
                                            'Nombre del Socio'}
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={
                                        editingTransaction.category === 'Gasto' ? (editingTransaction.description || '') :
                                            editingTransaction.category === 'Producto' || editingTransaction.category === 'Venta' ? (editingTransaction.productName || '') :
                                                (editingTransaction.memberName || '')
                                    }
                                    onChange={(e) => {
                                        if (editingTransaction.category === 'Gasto') {
                                            setEditingTransaction({ ...editingTransaction, description: e.target.value });
                                        } else if (editingTransaction.category === 'Producto' || editingTransaction.category === 'Venta') {
                                            setEditingTransaction({ ...editingTransaction, productName: e.target.value });
                                        } else {
                                            setEditingTransaction({ ...editingTransaction, memberName: e.target.value });
                                        }
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={Math.abs(editingTransaction.amount)}
                                    onChange={(e) => setEditingTransaction({
                                        ...editingTransaction,
                                        amount: editingTransaction.category === 'Gasto' ? -Math.abs(Number(e.target.value)) : Number(e.target.value)
                                    })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={editingTransaction.category}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                                >
                                    <option value="Cuota">Cuota</option>
                                    <option value="Producto">Producto</option>
                                    <option value="Venta">Venta</option>
                                    <option value="Gasto">Gasto</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingTransaction(null)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Finances;
