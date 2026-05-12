import { useState, useEffect, useMemo } from 'react';
import { Users, CreditCard, Package, UserX, Loader2, Search, Plus, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, MessageCircle, Send, StickyNote, Calendar, UserCheck, Plane, ExternalLink, XCircle, Copy, Calculator, History, ClipboardList, RotateCcw, Trash2, ArrowLeftRight, Shield } from 'lucide-react';
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

const PaymentMethodToggle = ({ value, onChange }) => (
    <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
            type="button"
            onClick={() => onChange('Efectivo')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${value === 'Efectivo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
            <DollarSign size={16} className={value === 'Efectivo' ? 'text-green-600' : ''} />
            Efectivo
        </button>
        <button
            type="button"
            onClick={() => onChange('Digital')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${value === 'Digital' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
            <CreditCard size={16} className={value === 'Digital' ? 'text-blue-600' : ''} />
            Digital
        </button>
    </div>
);

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(null); // 'active', 'inactive', 'stock', 'payments'
    const [searchTerm, setSearchTerm] = useState('');
    const [debtSearchTerm, setDebtSearchTerm] = useState('');
    const [stats, setStats] = useState({
        activeMembers: 0,
        inactiveMembers: 0,
        stockCount: 0,
        paidCount: 0,
        pendingCount: 0,
        products: [],
        membersList: [],
        paymentsList: [],
        remindersSent: [], // New state for tracking sent reminders
        notesMap: {}, // memberId -> note string
        birthdaysList: [], // Members with birthday this month
        instructors: [],
        expenses: [],
        plans: []
    });

    const [debts, setDebts] = useState([]);

    // Quick Actions State
    const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
    const [newSaleForm, setNewSaleForm] = useState({ productId: '', productName: '', amount: 0, quantity: 1, paymentMethod: 'Efectivo' });
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    const [newExpenseModalOpen, setNewExpenseModalOpen] = useState(false);
    const [newExpenseForm, setNewExpenseForm] = useState({ description: '', amount: 0, concept: 'Gasto', paymentMethod: 'Efectivo' });

    const [cashRegisterModalOpen, setCashRegisterModalOpen] = useState(false);
    const [cashRegisterForm, setCashRegisterForm] = useState({
        initialBalance: '',
        cashIn: '',
        cashOut: '',
        actualBalance: '',
        notes: ''
    });
    const [initialBalanceSaved, setInitialBalanceSaved] = useState(false);

    // LocalStorage key scoped to today's date so it auto-expires
    const todayKey = `cashRegister_initialBalance_${new Date().toISOString().slice(0, 10)}`;

    const [payMethodModalOpen, setPayMethodModalOpen] = useState(false);
    const [pendingPayment, setPendingPayment] = useState(null);

    const [cashRegisterHistoryModalOpen, setCashRegisterHistoryModalOpen] = useState(false);
    const [cashRegisterHistory, setCashRegisterHistory] = useState([]);

    const [cashDetailModalOpen, setCashDetailModalOpen] = useState(false);
    const [cashDetailData, setCashDetailData] = useState({ payments: [], expenses: [] });
    const [cashDetailLoading, setCashDetailLoading] = useState(false);

    const [newFiadoModalOpen, setNewFiadoModalOpen] = useState(false);
    const [newFiadoForm, setNewFiadoForm] = useState({ memberId: '', products: [] });
    // products in fixture: [{ productId, productName, quantity, amount }]
    const [currentFiadoProduct, setCurrentFiadoProduct] = useState({ productId: '', quantity: 1 });
    const [fiadoProductSearchTerm, setFiadoProductSearchTerm] = useState('');
    const [showFiadoProductDropdown, setShowFiadoProductDropdown] = useState(false);
    const [fiadoMemberSearchTerm, setFiadoMemberSearchTerm] = useState('');
    const [showFiadoMemberDropdown, setShowFiadoMemberDropdown] = useState(false);

    const [partialPayModalOpen, setPartialPayModalOpen] = useState(false);
    const [partialPayForm, setPartialPayForm] = useState({
        memberId: '',
        amount: '',
        memberName: '',
        maxAmount: 0,
        items: [],
        adjustments: {},
        paymentMethod: 'Efectivo'
    });
    const [pendingNotes, setPendingNotes] = useState({});

    // ── Tareas ──────────────────────────────────────────────────────────────
    const [tasks, setTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskFreq, setNewTaskFreq] = useState('weekly');

    // ── Asignacion semanal─────────────────────────────────────────────────
    // Monthly key ensures the starter is saved per-month (auto-resets next month)
    const scheduleMonthKey = `guardia_starter_${new Date().getFullYear()}_${new Date().getMonth()}`;
    const [scheduleStarter, setScheduleStarter] = useState(
        () => localStorage.getItem(scheduleMonthKey) || 'fede'
    );
    const toggleScheduleStarter = () => {
        const next = scheduleStarter === 'fede' ? 'gonza' : 'fede';
        setScheduleStarter(next);
        localStorage.setItem(scheduleMonthKey, next);
    };

    // Returns array of { start: Date, end: Date } for each Mon–Sun week overlapping current month
    const monthWeeks = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        const lastDay = new Date(year, month + 1, 0);

        // Find the Monday on or before the 1st of the month
        const firstMonday = new Date(year, month, 1);
        const dow = firstMonday.getDay(); // 0=Sun
        if (dow !== 1) {
            firstMonday.setDate(firstMonday.getDate() - (dow === 0 ? 6 : dow - 1));
        }

        const weeks = [];
        let cursor = new Date(firstMonday);
        while (cursor <= lastDay) {
            const start = new Date(cursor);
            const end = new Date(cursor);
            end.setDate(end.getDate() + 6);
            weeks.push({ start, end });
            cursor.setDate(cursor.getDate() + 7);
        }
        return weeks;
    }, []);

    const [error, setError] = useState(null);

    // ... existing state ...

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Set a long timeout (60s) to allow for Render Clean/Cold start
            const config = { timeout: 60000 };

            const [financeRes, productsRes, membersRes, debtsRes, remindersRes, settingsRes, expensesRes] = await Promise.all([
                axios.get(`${API_URL}/api/finance`, config),
                axios.get(`${API_URL}/api/products`, config),
                axios.get(`${API_URL}/api/members`, config),
                axios.get(`${API_URL}/api/debts`, config),
                axios.get(`${API_URL}/api/notifications/reminders`, config), // Fetch sent reminders
                axios.get(`${API_URL}/api/settings`, config),
                axios.get(`${API_URL}/api/finance/expenses`, config)
            ]);

            const payments = financeRes.data;
            const products = productsRes.data;
            const members = membersRes.data;
            const fetchedDebts = debtsRes.data;
            const remindersSent = remindersRes.data || [];
            const settings = settingsRes.data || {};
            const expenses = expensesRes.data || [];

            setDebts(fetchedDebts);

            // Calculate Metrics
            const sortedProducts = [...products].sort((a, b) => Number(a.stock) - Number(b.stock));
            const stockCount = products.reduce((acc, p) => acc + (Number(p.stock) > 0 ? 1 : 0), 0);

            // Payments logic
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            // Active members count
            const activeMembers = members.filter(m => m.active && !m.isExempt);
            const activeMembersCount = activeMembers.length;
            const inactiveMembersCount = members.length - activeMembersCount;

            // Paid members for current month (Includes Condoned & Licensed)
            const paidThisMonthIds = new Set(
                payments
                    .filter(p =>
                        Number(p.month) === currentMonth &&
                        Number(p.year) === currentYear &&
                        (p.type === 'Cuota' || p.type === 'Licencia' || p.type === 'Condonado' || !p.type)
                    )
                    .map(p => String(p.memberId))
            );

            const billableMembers = activeMembers.filter(m => !m.familyId || m.isFamilyHead);
            const paidBillableCount = billableMembers.filter(m => paidThisMonthIds.has(String(m._id))).length;

            setStats({
                activeMembers: activeMembersCount,
                inactiveMembers: inactiveMembersCount,
                stockCount,
                paidCount: paidBillableCount,
                pendingCount: billableMembers.length - paidBillableCount,
                products: sortedProducts,
                membersList: members,
                paymentsList: payments,
                remindersSent: new Set(remindersSent), // Convert to Set for faster lookup
                notesMap: payments
                    .filter(p => Number(p.month) === currentMonth && Number(p.year) === currentYear && p.type === 'Nota')
                    .reduce((acc, p) => ({ ...acc, [p.memberId]: p.comments }), {}),
                birthdaysList: members.filter(m => {
                    if (!m.birthDate || !m.active) return false;
                    const bdate = new Date(m.birthDate);
                    // Check if month matches current month
                    // Use UTC to ensure we get the stored date, not the timezone adjusted one
                    return (bdate.getUTCMonth() + 1) === currentMonth;
                }).sort((a, b) => {
                    const dayA = new Date(a.birthDate).getUTCDate();
                    const dayB = new Date(b.birthDate).getUTCDate();
                    return dayA - dayB;
                }),
                instructors: settings.instructors || [],
                expenses: expenses,
                plans: settings.plans || []
            });

            // Load tasks (auto-reset already applied server-side)
            setTasks(settings.tasks || []);

        } catch (error) {
            console.error("Error fetching dashboard data", error);
            setError("No se pudo conectar con el servidor. El backend puede estar iniciándose (espera 1 min) o hay un error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);


    // --- Quick Action Handlers ---

    const selectProductForSale = (product) => {
        setNewSaleForm({
            productId: product._id,
            productName: product.name,
            amount: product.salePrice,
            quantity: 1
        });
        setProductSearchTerm(product.name);
        setShowProductDropdown(false);
    };

    const handleNewSale = async () => {
        if (!newSaleForm.productId || !newSaleForm.amount) {
            alert('Por favor selecciona un producto');
            return;
        }
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const saleData = {
                productName: newSaleForm.productName,
                productId: newSaleForm.productId,
                quantity: newSaleForm.quantity,
                amount: newSaleForm.amount * newSaleForm.quantity,
                type: 'Producto',
                paymentMethod: newSaleForm.paymentMethod,
                month: currentMonth,
                year: currentYear,
                date: new Date()
            };

            await axios.post(`${API_URL}/api/finance`, saleData);
            setNewSaleModalOpen(false);
            setNewSaleForm({ productId: '', productName: '', amount: 0, quantity: 1, paymentMethod: 'Efectivo' });
            setProductSearchTerm('');
            fetchData();
        } catch (error) {
            console.error('Error registering sale:', error);
            alert('Error al registrar la venta');
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
                paymentMethod: newExpenseForm.paymentMethod,
                date: new Date()
            };
            await axios.post(`${API_URL}/api/finance/expenses`, expenseData);
            setNewExpenseModalOpen(false);
            setNewExpenseForm({ description: '', amount: 0, concept: 'Gasto', paymentMethod: 'Efectivo' });
            fetchData(); // Refresh to update financials if we were showing them, although mainly updates stats here
        } catch (error) {
            console.error('Error registering expense:', error);
            alert('Error al registrar el gasto');
        }
    };

    const handleSaveInitialBalance = () => {
        const val = cashRegisterForm.initialBalance;
        if (val === '' || Number(val) < 0) {
            alert('Ingresa un monto inicial válido.');
            return;
        }
        localStorage.setItem(todayKey, val);
        setInitialBalanceSaved(true);
    };

    const handleCashRegisterSubmit = async () => {
        try {
            const expected = Number(cashRegisterForm.initialBalance) + Number(cashRegisterForm.cashIn) - Number(cashRegisterForm.cashOut);
            const actual = Number(cashRegisterForm.actualBalance);
            const diff = actual - expected;

            const payload = {
                initialBalance: Number(cashRegisterForm.initialBalance),
                cashIn: Number(cashRegisterForm.cashIn),
                cashOut: Number(cashRegisterForm.cashOut),
                expectedBalance: expected,
                actualBalance: actual,
                difference: diff,
                notes: cashRegisterForm.notes,
                date: new Date()
            };

            await axios.post(`${API_URL}/api/finance/cash-register`, payload);

            // Clear persisted initial balance only after final close
            localStorage.removeItem(todayKey);
            setCashRegisterModalOpen(false);
            setCashRegisterForm({ initialBalance: '', cashIn: '', cashOut: '', actualBalance: '', notes: '' });
            setInitialBalanceSaved(false);
            alert('Cierre de caja guardado con éxito.');
        } catch (error) {
            console.error('Error saving cash register:', error);
            alert('Error al guardar el cierre de caja.');
        }
    };

    const fetchCashRegisterHistory = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/finance/cash-register`);
            setCashRegisterHistory(res.data);
            setCashRegisterHistoryModalOpen(true);
        } catch (error) {
            console.error('Error fetching cash register history:', error);
            alert('Error al obtener el historial de cierres.');
        }
    };

    const fetchCashSummary = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/finance/cash-summary`);
            setCashRegisterForm(prev => ({
                ...prev,
                cashIn: res.data.cashIn,
                cashOut: res.data.cashOut
            }));
        } catch (error) {
            console.error('Error fetching cash summary:', error);
        }
    };

    const fetchCashDetail = async () => {
        setCashDetailLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/finance/cash-detail`);
            setCashDetailData(res.data);
            setCashDetailModalOpen(true);
        } catch (error) {
            console.error('Error fetching cash detail:', error);
            alert('Error al obtener el detalle de ingresos.');
        } finally {
            setCashDetailLoading(false);
        }
    };

    // Switch a payment record from Efectivo to Digital and refresh cashIn
    const switchPaymentToDigital = async (id, kind) => {
        try {
            const url = kind === 'expense'
                ? `${API_URL}/api/finance/expenses/${id}`
                : `${API_URL}/api/finance/${id}`;
            await axios.put(url, { paymentMethod: 'Digital' });
            // Update local list
            setCashDetailData(prev => ({
                payments: kind === 'payment' ? prev.payments.filter(p => p._id !== id) : prev.payments,
                expenses: kind === 'expense' ? prev.expenses.filter(e => e._id !== id) : prev.expenses
            }));
            // Refresh totals in the cash register form
            await fetchCashSummary();
        } catch (error) {
            console.error('Error switching payment method:', error);
            alert('Error al cambiar el método de pago.');
        }
    };


    useEffect(() => {
        if (cashRegisterModalOpen) {
            // Restore persisted initialBalance for today if it exists
            const savedInitial = localStorage.getItem(todayKey);
            if (savedInitial !== null) {
                setCashRegisterForm(prev => ({ ...prev, initialBalance: savedInitial }));
                setInitialBalanceSaved(true);
            } else {
                setInitialBalanceSaved(false);
            }
            fetchCashSummary();
        }
    }, [cashRegisterModalOpen]);

    // --- Fiados Logic ---

    const addProductToFiado = () => {
        if (!currentFiadoProduct.productId) return;
        const product = stats.products.find(p => p._id === currentFiadoProduct.productId);
        if (!product) return;

        const existingItem = newFiadoForm.products.find(p => p.productId === product._id);

        // Check local stock availability (naive check against loaded data)
        const currentQtyInForm = existingItem ? existingItem.quantity : 0;
        if (product.stock < (currentQtyInForm + currentFiadoProduct.quantity)) {
            alert(`Stock insuficiente. Solo quedan ${product.stock}`);
            return;
        }

        let updatedProducts;
        if (existingItem) {
            updatedProducts = newFiadoForm.products.map(p =>
                p.productId === product._id
                    ? { ...p, quantity: p.quantity + currentFiadoProduct.quantity }
                    : p
            );
        } else {
            updatedProducts = [...newFiadoForm.products, {
                productId: product._id,
                productName: product.name,
                quantity: currentFiadoProduct.quantity,
                amount: product.salePrice
            }];
        }

        setNewFiadoForm({ ...newFiadoForm, products: updatedProducts });
        setCurrentFiadoProduct({ productId: '', quantity: 1 });
        setFiadoProductSearchTerm('');
    };

    const removeProductFromFiado = (productId) => {
        setNewFiadoForm({
            ...newFiadoForm,
            products: newFiadoForm.products.filter(p => p.productId !== productId)
        });
    };

    const handleCreateFiado = async () => {
        if (!newFiadoForm.memberId || newFiadoForm.products.length === 0) {
            alert('Selecciona un socio y al menos un producto');
            return;
        }
        const member = stats.membersList.find(m => m._id === newFiadoForm.memberId);

        try {
            const totalAmount = newFiadoForm.products.reduce((acc, p) => acc + (p.amount * p.quantity), 0);
            const fiadoData = {
                memberId: member._id,
                memberName: member.fullName,
                products: newFiadoForm.products,
                totalAmount
            };

            await axios.post(`${API_URL}/api/debts`, fiadoData);
            setNewFiadoModalOpen(false);
            setNewFiadoForm({ memberId: '', products: [] });
            setFiadoMemberSearchTerm('');
            fetchData();
        } catch (error) {
            console.error('Error creating fiado:', error);
            alert(error.response?.data?.message || 'Error al crear el fiado');
        }
    };

    const handlePartialSubmit = async () => {
        const totalToPay = Object.values(partialPayForm.adjustments).reduce((acc, val) => acc + Number(val || 0), 0) || Number(partialPayForm.amount);

        if (totalToPay <= 0) {
            alert('Ingrese un monto válido');
            return;
        }

        try {
            await axios.post(`${API_URL}/api/debts/pay-partial`, {
                memberId: partialPayForm.memberId,
                amount: totalToPay,
                adjustments: partialPayForm.adjustments,
                paymentMethod: partialPayForm.paymentMethod
            });
            setPartialPayModalOpen(false);
            setPartialPayForm({ memberId: '', amount: '', memberName: '', maxAmount: 0, items: [], adjustments: {}, paymentMethod: 'Efectivo' });
            fetchData();
        } catch (error) {
            console.error('Error paying partial:', error);
            alert(error.response?.data?.message || 'Error al registrar el pago');
        }
    };

    const distributeFIFO = (total) => {
        const amount = Number(total);
        if (!amount || amount <= 0) return;

        let remaining = amount;
        const newAdjustments = {};

        const sortedItems = [...partialPayForm.items].sort((a, b) => new Date(a.date) - new Date(b.date));

        for (const item of sortedItems) {
            if (remaining <= 0) break;
            const balance = item.totalAmount - (item.paidAmount || 0);
            const toPay = Math.min(remaining, balance);
            newAdjustments[item._id] = toPay;
            remaining -= toPay;
        }

        setPartialPayForm(prev => ({
            ...prev,
            adjustments: newAdjustments,
            amount: amount
        }));
    };


    // --- Modal Logic ---

    const openModal = (type) => {
        setModalType(type);
        setSearchTerm('');
        setModalOpen(true);
        setPendingNotes({});
    };

    const handleQuickPayment = (member) => {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        setPendingPayment({
            title: `Cobro de Cuota`,
            subtitle: member.fullName,
            amount: member.planCost || 2000,
            action: async (method) => {
                await axios.post(`${API_URL}/api/finance`, {
                    memberId: member._id,
                    memberName: member.fullName,
                    memberCi: member.ci,
                    month: currentMonth,
                    year: currentYear,
                    amount: member.planCost || 2000,
                    type: 'Cuota',
                    paymentMethod: method,
                    date: new Date()
                });
                fetchData();
                setModalOpen(false);
            }
        });
        setPayMethodModalOpen(true);
    };

    const handlePayInstructor = async (instructor) => {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const amount = instructor.hours * 500;

        if (!window.confirm(`¿Confirmar pago a ${instructor.name} correspondiente a este mes?`)) return;

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/finance/expenses`, {
                description: `Pago Instructor: ${instructor.name}`,
                amount: amount,
                date: new Date(),
                category: 'Sueldos',
                paymentMethod: 'Efectivo'
            });
            alert('Pago registrado correctamente');
            fetchData();
        } catch (error) {
            console.error('Error paying instructor:', error);
            alert('Error al registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    // ── Task handlers ──────────────────────────────────────────────────────

    const handleToggleTask = async (taskId) => {
        setTasksLoading(true);
        try {
            // Build updated tasks list locally (toggle the target task)
            const updatedTasks = (tasks || []).map(t =>
                t._id === taskId
                    ? { ...t, completedAt: t.completedAt ? null : new Date().toISOString() }
                    : t
            );
            // Optimistic update first so UI feels instant
            setTasks(updatedTasks);
            // Persist to backend using the existing POST endpoint
            const res = await axios.post(`${API_URL}/api/settings`, { tasks: updatedTasks });
            setTasks(res.data?.tasks || updatedTasks);
        } catch (err) {
            console.error('Error toggling task:', err);
            alert('Error al actualizar la tarea.');
            // Revert optimistic update on failure
            setTasks(tasks);
        } finally {
            setTasksLoading(false);
        }
    };

    const handleSaveNewTask = async () => {
        const name = newTaskName.trim();
        if (!name) { alert('Escribe un nombre para la tarea.'); return; }
        setTasksLoading(true);
        try {
            const updatedTasks = [
                ...(tasks || []).map(t => ({
                    _id: t._id,
                    name: t.name,
                    frequency: t.frequency,
                    completedAt: t.completedAt || null
                })),
                { name, frequency: newTaskFreq, completedAt: null }
            ];
            // Use the existing POST /api/settings endpoint — it already handles tenant correctly
            const res = await axios.post(`${API_URL}/api/settings`, { tasks: updatedTasks });
            setTasks(res.data?.tasks || updatedTasks);
            setNewTaskName('');
            setNewTaskFreq('weekly');
            setShowAddTask(false);
        } catch (err) {
            console.error('Error saving task:', err);
            alert('Error al guardar la tarea.');
        } finally {
            setTasksLoading(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('¿Eliminar esta tarea?')) return;
        setTasksLoading(true);
        try {
            const updatedTasks = (tasks || []).filter(t => t._id !== taskId);
            const res = await axios.post(`${API_URL}/api/settings`, { tasks: updatedTasks });
            setTasks(res.data?.tasks || updatedTasks);
        } catch (err) {
            console.error('Error deleting task:', err);
            alert('Error al eliminar la tarea.');
        } finally {
            setTasksLoading(false);
        }
    };

    const handleAddNote = (member) => {
        const currentNote = pendingNotes[member._id] !== undefined
            ? pendingNotes[member._id]
            : (stats.notesMap[member._id] || '');

        const note = prompt(`Agregar nota para ${member.fullName}:`, currentNote);

        if (note === null) return; // Cancelled

        setPendingNotes(prev => ({
            ...prev,
            [member._id]: note
        }));
    };

    const handleSaveAllNotes = async () => {
        const memberIds = Object.keys(pendingNotes);
        if (memberIds.length === 0) return;

        setLoading(true);
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const promises = memberIds.map(memberId => {
                const member = stats.membersList.find(m => m._id === memberId);
                // If note is empty, we might want to delete it? 
                // Currently backend "note" endpoint just upserts. 
                // If empty string, let's assume we send it as empty string.
                return axios.post(`${API_URL}/api/finance/note`, {
                    memberId: memberId,
                    memberName: member ? member.fullName : 'Desconocido',
                    month: currentMonth,
                    year: currentYear,
                    comments: pendingNotes[memberId]
                });
            });

            await Promise.all(promises);
            setPendingNotes({});
            await fetchData();
            alert('Notas guardadas correctamente');
        } catch (error) {
            console.error('Error saving notes:', error);
            alert('Error al guardar las notas');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentReminder = async (member) => {
        try {
            const amount = member.planCost || 2000;
            if (!member.phone) {
                alert('Este socio no tiene número de teléfono registrado.');
                return;
            }

            const isResend = stats.remindersSent.has(member._id);
            const confirmMsg = isResend
                ? `Ya se envió un recordatorio a ${member.fullName}. ¿Desea enviarlo de nuevo?`
                : `¿Enviar recordatorio de pago a ${member.fullName} por WhatsApp?`;

            if (!confirm(confirmMsg)) {
                return;
            }

            await axios.post(`${API_URL}/api/notifications/send-reminder`, {
                phone: member.phone,
                memberName: member.fullName,
                memberId: member._id,
                amount: amount,
                type: 'payment_reminder'
            });

            alert(`Recordatorio enviado a ${member.fullName}`);
            fetchData();
        } catch (error) {
            console.error('Error sending reminder:', error);
            alert('Error al enviar el recordatorio. Verifique la conexión con el servidor.');
        }
    };



    const handleToggleMemberStatus = async (member) => {
        const action = member.active ? 'inactivar' : 'activar';
        if (!window.confirm(`¿Estás seguro de que deseas ${action} al socio ${member.fullName}?`)) return;

        try {
            await axios.put(`${API_URL}/api/members/${member._id}/toggle-status`);
            fetchData();
        } catch (error) {
            console.error(`Error al ${action} el socio:`, error);
            alert(`Error al ${action} el socio`);
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
                            <div key={m._id} className="py-3 flex justify-between items-center group">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-700">{m.fullName}</p>
                                        <button
                                            onClick={() => window.open(`/public/profile/${m._id}`, '_blank')}
                                            className="text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Ver Ficha Pública"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400">CI: {m.ci}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Activo</span>
                                    <button
                                        onClick={() => handleToggleMemberStatus(m)}
                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors bg-slate-50 hover:bg-red-50 rounded-full"
                                        title="Mover a inactivos"
                                    >
                                        <UserX size={16} />
                                    </button>
                                </div>
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
                            <div key={m._id} className="py-3 flex justify-between items-center group">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-700">{m.fullName}</p>
                                        <button
                                            onClick={() => window.open(`/public/profile/${m._id}`, '_blank')}
                                            className="text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Ver Ficha Pública"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400">CI: {m.ci}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Inactivo</span>
                                    <button
                                        onClick={() => handleToggleMemberStatus(m)}
                                        className="p-1 text-slate-400 hover:text-green-600 transition-colors bg-slate-50 hover:bg-green-50 rounded-full"
                                        title="Mover a activos"
                                    >
                                        <UserCheck size={16} />
                                    </button>
                                </div>
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
            const activeMembers = stats.membersList.filter(m => m.active && !m.isExempt);
            const billableMembers = activeMembers.filter(m => !m.familyId || m.isFamilyHead);

            // Paid this month or has license this month
            const paidThisMonthIds = new Set(
                stats.paymentsList
                    .filter(p =>
                        Number(p.month) === currentMonth &&
                        Number(p.year) === currentYear &&
                        (p.type === 'Cuota' || p.type === 'Condonado' || !p.type)
                    )
                    .map(p => String(p.memberId))
            );

            const licensedThisMonthIds = new Set(
                stats.paymentsList
                    .filter(p =>
                        Number(p.month) === currentMonth &&
                        Number(p.year) === currentYear &&
                        p.type === 'Licencia'
                    )
                    .map(p => String(p.memberId))
            );

            // Helper to check past debts (unpaid months without license)
            const getPastDebts = (memberId) => {
                const pastMonths = [];
                // Check last 3 months for simplicity
                for (let i = 1; i <= 3; i++) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const m = date.getMonth() + 1;
                    const y = date.getFullYear();

                    const hasPayment = stats.paymentsList.some(p =>
                        String(p.memberId) === String(memberId) &&
                        p.month === m && p.year === y &&
                        (p.type === 'Cuota' || p.type === 'Licencia' || p.type === 'Condonado' || !p.type)
                    );

                    if (!hasPayment) {
                        pastMonths.push(date.toLocaleString('es-ES', { month: 'short' }));
                    }
                }
                return pastMonths;
            };

            const pendingList = billableMembers.filter(m => !paidThisMonthIds.has(String(m._id)) && !licensedThisMonthIds.has(String(m._id)));
            const paidList = billableMembers.filter(m => paidThisMonthIds.has(String(m._id)));
            const licensedList = billableMembers.filter(m => licensedThisMonthIds.has(String(m._id)));

            const filteredPending = pendingList.filter(m =>
                m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.ci && m.ci.includes(searchTerm))
            );
            const filteredPaid = paidList.filter(m =>
                m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.ci && m.ci.includes(searchTerm))
            );

            const handleRegisterLicense = async (member) => {
                if (!confirm(`¿Marcar a ${member.fullName} con LICENCIA para ${new Date().toLocaleString('es-ES', { month: 'long' })}? No figurará como deuda.`)) return;
                try {
                    await axios.post(`${API_URL}/api/finance/license`, {
                        memberId: member._id,
                        memberName: member.fullName,
                        month: currentMonth,
                        year: currentYear
                    });
                    fetchData();
                } catch (e) {
                    alert('Error al registrar licencia');
                }
            };

            const handleCondoneDebt = async (member) => {
                if (!confirm(`¿Condonar (perdonar) deuda de ${new Date().toLocaleString('es-ES', { month: 'long' })} para ${member.fullName}?`)) return;
                try {
                    await axios.post(`${API_URL}/api/finance/condone`, {
                        memberId: member._id,
                        memberName: member.fullName,
                        month: currentMonth,
                        year: currentYear
                    });
                    fetchData();
                } catch (e) {
                    alert('Error al condonar deuda');
                }
            };

            return (
                <div className="space-y-6">
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
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-red-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                Pendientes ({filteredPending.length})
                            </h4>
                            <div className="flex gap-2">
                                {Object.keys(pendingNotes).length > 0 && (
                                    <button
                                        onClick={handleSaveAllNotes}
                                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm animate-pulse"
                                    >
                                        <StickyNote size={14} />
                                        Guardar Notas ({Object.keys(pendingNotes).length})
                                    </button>
                                )}

                            </div>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4 max-h-[350px] overflow-y-auto divide-y divide-red-100">
                            {filteredPending.map(m => {
                                const pastDue = getPastDebts(m._id);
                                return (
                                    <div key={m._id} className="py-2.5 flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-2 border-b border-red-100 last:border-0">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    onClick={() => window.open(`/public/profile/${m._id}`, '_blank')}
                                                    className="text-sm font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                                    title="Abrir Ficha en nueva pestaña"
                                                >
                                                    {m.fullName}
                                                    <ExternalLink size={14} className="opacity-50" />
                                                </button>
                                                {pastDue.length > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-black rounded uppercase animate-bounce">
                                                        Debe {pastDue.join(', ')}
                                                    </span>
                                                )}
                                                {(() => {
                                                    const noteContent = pendingNotes[m._id] !== undefined ? pendingNotes[m._id] : stats.notesMap[m._id];
                                                    return noteContent && (
                                                        <span
                                                            className={`px-2 py-0.5 text-[10px] font-bold rounded border cursor-pointer
                                                                ${pendingNotes[m._id] !== undefined ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}
                                                            `}
                                                            onClick={() => handleAddNote(m)}
                                                            title="Click para editar"
                                                        >
                                                            {noteContent}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <span className="text-xs text-slate-500 font-medium">CI: {m.ci || 'N/A'} • ${m.planCost?.toLocaleString() || '2.000'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-2 2xl:mt-0">
                                            <button
                                                onClick={() => window.open(`/public/profile/${m._id}`, '_blank')}
                                                className="flex items-center gap-1 px-2 py-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs font-medium border border-slate-200 hover:border-blue-200 bg-white shadow-sm whitespace-nowrap"
                                                title="Abrir Ficha en nueva pestaña"
                                            >
                                                <ExternalLink size={13} />
                                                <span className="hidden xl:inline">Ficha</span>
                                            </button>
                                            <button
                                                onClick={() => handleAddNote(m)}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs font-medium border shadow-sm whitespace-nowrap
                                                    ${pendingNotes[m._id] !== undefined ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-slate-500 hover:text-yellow-600 hover:bg-yellow-50 border-slate-200 hover:border-yellow-200 bg-white'}
                                                `}
                                            >
                                                <StickyNote size={13} />
                                                <span className="hidden xl:inline">Nota</span>
                                            </button>
                                            <button
                                                onClick={() => handleRegisterLicense(m)}
                                                className="flex items-center gap-1 px-2 py-1 rounded-md text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors text-xs font-medium border border-slate-200 hover:border-purple-200 bg-white shadow-sm whitespace-nowrap"
                                            >
                                                <Plane size={13} />
                                                <span className="hidden xl:inline">Licencia</span>
                                            </button>
                                            <button
                                                onClick={() => handleCondoneDebt(m)}
                                                className="flex items-center gap-1 px-2 py-1 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors text-xs font-medium border border-slate-200 hover:border-red-200 bg-white shadow-sm whitespace-nowrap"
                                            >
                                                <XCircle size={13} />
                                                <span className="hidden xl:inline">Perdonar</span>
                                            </button>
                                            <button
                                                onClick={() => handleQuickPayment(m)}
                                                className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-md transition-colors shadow-sm whitespace-nowrap ml-1"
                                            >
                                                <CheckCircle size={13} />
                                                Pagó
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredPending.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No hay cobros pendientes este mes.</p>}
                        </div>

                        {/* Licensed List */}
                        {licensedList.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-bold text-purple-600 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                    En Licencia ({licensedList.length})
                                </h4>
                                <div className="bg-purple-50/50 rounded-xl p-4 max-h-[150px] overflow-y-auto divide-y divide-purple-100 italic">
                                    {licensedList.map(m => (
                                        <div key={m._id} className="py-2 flex justify-between">
                                            <span className="text-sm font-medium text-purple-800">{m.fullName}</span>
                                            <span className="text-xs text-purple-400">Sin asistencia este mes</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <h4 className="font-bold text-green-600 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-600"></span>
                                Pagados ({filteredPaid.length})
                            </h4>
                            <div className="bg-green-50 rounded-xl p-4 max-h-[150px] overflow-y-auto divide-y divide-green-100">
                                {filteredPaid.map(m => (
                                    <div key={m._id} className="py-2 flex justify-between">
                                        <span className="text-sm font-medium text-slate-700">{m.fullName}</span>
                                        <span className="text-xs text-slate-500">CI: {m.ci}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );

        }

        if (modalType === 'comunicaciones') {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const activeMembers = stats.membersList.filter(m => m.active && !m.isExempt);
            const billableMembers = activeMembers.filter(m => !m.familyId || m.isFamilyHead);

            const paidThisMonthIds = new Set(
                stats.paymentsList
                    .filter(p =>
                        Number(p.month) === currentMonth &&
                        Number(p.year) === currentYear &&
                        (p.type === 'Cuota' || p.type === 'Condonado' || !p.type)
                    )
                    .map(p => String(p.memberId))
            );

            const licensedThisMonthIds = new Set(
                stats.paymentsList
                    .filter(p =>
                        Number(p.month) === currentMonth &&
                        Number(p.year) === currentYear &&
                        p.type === 'Licencia'
                    )
                    .map(p => String(p.memberId))
            );

            const pendingList = billableMembers.filter(m => !paidThisMonthIds.has(String(m._id)) && !licensedThisMonthIds.has(String(m._id)));
            const filteredPending = pendingList.filter(m =>
                m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.ci && m.ci.includes(searchTerm))
            );

            const getMessage = (m) => `Hola ${m.fullName}, te recordamos que tienes tu cuota de este mes pendiente de pago. Puedes ver tu ficha de socio y pagar desde aquí: ${window.location.origin}/public/profile/${m._id}`;

            const sendToN8n = async (m) => {
                if (!m.phone) {
                    throw new Error(`El socio ${m.fullName} no tiene teléfono registrado.`);
                }
                const payload = {
                    phone: m.phone,
                    memberName: m.fullName,
                    link: `${window.location.origin}/public/profile/${m._id}`
                };

                try {
                    await axios.post('https://n8n.vanguardlab.cloud/webhook/webhook-pagos', payload);
                } catch (error) {
                    // N8N webhooks often don't return CORS headers.
                    // This causes the browser to throw a 'Network Error' even if the POST succeeded.
                    if (error.message === 'Network Error') {
                        console.warn('Ignorando Network Error de N8N por posible falta de CORS headers.');
                        return; // Asumimos que llegó bien
                    }
                    throw error;
                }
            };

            const handleWhatsAppIndividual = async (m) => {
                try {
                    await sendToN8n(m);

                    // Log it to the backend so it persists across reloads for the current month
                    await axios.post(`${API_URL}/api/notifications/log-reminder`, { memberId: m._id });

                    // Update local state immediately
                    setStats(prev => {
                        const newReminders = new Set(prev.remindersSent);
                        newReminders.add(m._id);
                        return { ...prev, remindersSent: newReminders };
                    });

                } catch (error) {
                    console.error("Error sending to N8N:", error);
                    alert(error.message || 'Error al enviar el mensaje.');
                }
            };

            return (
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                        <p className="text-sm text-blue-800 font-medium mb-1">Plantilla de Mensaje:</p>
                        <p className="text-xs text-blue-700 italic">"Hola [Nombre], te recordamos que tienes tu cuota de este mes pendiente de pago. Puedes ver tu ficha de socio y pagar desde aquí: [Link]"</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar socio pendiente..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                <MessageCircle size={18} className="text-green-500" />
                                Enviar WhatsApp a Pendientes ({filteredPending.length})
                            </h4>
                            <div className="flex gap-2">
                                {/* Botón "Mandar a Todos" removido a pedido del usuario */}
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 max-h-[350px] overflow-y-auto divide-y divide-slate-100 border">
                            {filteredPending.map(m => (
                                <div key={m._id} className="py-2 flex justify-between items-center">
                                    <div>
                                        <span className="text-sm font-bold text-slate-700 block">{m.fullName}</span>
                                        <span className="text-xs text-slate-500 font-medium">CI: {m.ci || 'N/A'} • Tel: {m.phone || 'Sin Tel'}</span>
                                    </div>
                                    <div>
                                        {stats.remindersSent.has(m._id) ? (
                                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg flex items-center gap-2 border border-slate-200 cursor-not-allowed" title="Enviado este mes">
                                                <CheckCircle size={14} className="text-green-500" />
                                                Enviado
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleWhatsAppIndividual(m)}
                                                className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                                                title="Enviar WhatsApp Manual"
                                            >
                                                <MessageCircle size={14} />
                                                Enviar
                                            </button>
                                        )}
                                    </div>
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
            case 'comunicaciones': return 'Comunicaciones por WhatsApp';
            default: return 'Detalles';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[400px] gap-4">
                <div className="p-4 bg-red-50 text-red-600 rounded-lg flex flex-col items-center text-center max-w-md">
                    <p className="font-bold text-lg mb-2">Error de Conexión</p>
                    <p className="text-sm mb-4">{error}</p>
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Reintentar
                    </button>
                    <p className="text-xs text-slate-400 mt-4">
                        Si el error persiste, verifica que el servidor en Render esté activo (puede tardar 60s en despertar).
                    </p>
                </div>
            </div>
        );
    }

    const todaysBirthdays = stats.birthdaysList.filter(m => {
        const bdate = new Date(m.birthDate);
        return bdate.getUTCDate() === new Date().getDate();
    });

    return (
        <div className="space-y-8">
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={getModalTitle()}
                maxWidth={modalType === 'inactive' ? 'max-w-md' : 'max-w-2xl'}
            >
                {renderModalContent()}
            </Modal>

            {todaysBirthdays.length > 0 && (
                <div className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center animate-pulse">
                    <div className="flex items-center gap-3 text-3xl font-bold mb-2">
                        <span>🎂</span>
                        <span>¡Hoy es el cumpleaños de {todaysBirthdays.map(m => m.fullName).join(' y ')}!</span>
                        <span>🎉</span>
                    </div>
                    <p className="opacity-90 font-medium">¡No olvides desearle un feliz día!</p>
                </div>
            )}

            {/* Header */}
            <div className="mb-2">
                <h1 className="text-4xl font-bold text-slate-900" style={{ color: 'var(--dashboard-title, #0f172a)' }}>Dashboard</h1>
                <p className="text-slate-500 mt-1">Gestión administrativa de The Badgers</p>
            </div>

            {/* Quick Actions Grid */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-blue-600" />
                        Acceso Rápido
                    </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {/* Primary Actions */}
                    <button
                        onClick={() => setNewSaleModalOpen(true)}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-100 group"
                    >
                        <div className="p-3 bg-white rounded-xl mb-2 shadow-sm group-hover:scale-110 transition-transform">
                            <DollarSign size={24} className="text-green-600" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Nueva Venta</span>
                    </button>

                    <button
                        onClick={() => {
                            setNewFiadoForm({ memberId: '', products: [] });
                            setFiadoMemberSearchTerm('');
                            setFiadoProductSearchTerm('');
                            setNewFiadoModalOpen(true);
                        }}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-100 group"
                    >
                        <div className="p-3 bg-white rounded-xl mb-2 shadow-sm group-hover:scale-110 transition-transform">
                            <Clock size={24} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Nuevo Fiado</span>
                    </button>

                    <button
                        onClick={() => {
                            setNewExpenseForm({ description: '', amount: 0, concept: 'Gasto' });
                            setNewExpenseModalOpen(true);
                        }}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-100 group"
                    >
                        <div className="p-3 bg-white rounded-xl mb-2 shadow-sm group-hover:scale-110 transition-transform">
                            <TrendingDown size={24} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Nuevo Gasto</span>
                    </button>

                    <button
                        onClick={() => setCashRegisterModalOpen(true)}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200 group"
                    >
                        <div className="p-3 bg-white rounded-xl mb-2 shadow-sm group-hover:scale-110 transition-transform">
                            <Calculator size={24} className="text-slate-600" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-center">Cierre Caja</span>
                    </button>

                    {/* Quick Sale Favorites (User selected isQuickAccess) */}
                    {stats.products.filter(p => p.isQuickAccess && Number(p.stock) > 0).map(product => (
                        <button
                            key={product._id}
                            onClick={() => {
                                setPendingPayment({
                                    title: 'Venta Rápida',
                                    subtitle: product.name,
                                    amount: product.salePrice,
                                    action: async (method) => {
                                        const currentMonth = new Date().getMonth() + 1;
                                        const currentYear = new Date().getFullYear();
                                        await axios.post(`${API_URL}/api/finance`, {
                                            productName: product.name,
                                            productId: product._id,
                                            quantity: 1,
                                            amount: product.salePrice,
                                            type: 'Producto',
                                            paymentMethod: method,
                                            month: currentMonth,
                                            year: currentYear,
                                            date: new Date()
                                        });
                                        fetchData();
                                    }
                                });
                                setPayMethodModalOpen(true);
                            }}
                            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors border border-slate-100 group relative overflow-hidden"
                        >
                            <div className="p-3 bg-white rounded-xl mb-2 shadow-sm group-hover:scale-110 transition-transform">
                                <Package size={24} className="text-emerald-500" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider truncate w-full text-center px-1" title={product.name}>{product.name}</span>
                            <span className="text-xs font-black text-slate-900 mt-1">${product.salePrice}</span>

                            {/* Stock badge */}
                            <div className="absolute top-2 right-2 text-[8px] font-black bg-white px-1.5 py-0.5 rounded border border-slate-100 text-slate-400">
                                {product.stock}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="SOCIOS ACTIVOS"
                    value={stats.activeMembers}
                    subtext="(Excluyendo libres)"
                    icon={Users}
                    iconClass="bg-slate-800 text-white"
                    onClick={() => openModal('active')}
                />
                <StatCard
                    title="INACTIVOS"
                    value={stats.inactiveMembers}
                    subtext="Ver lista"
                    icon={UserX}
                    iconClass="bg-slate-200 text-slate-500"
                    onClick={() => openModal('inactive')}
                />
                <StatCard
                    title="PRODUCTOS"
                    value={stats.stockCount}
                    subtext="En Inventario"
                    icon={Package}
                    iconClass="bg-emerald-500 text-white"
                    onClick={() => openModal('stock')}
                />
                <StatCard
                    title="PAGOS DEL MES"
                    value={`${Math.round((stats.paidCount / (stats.activeMembers || 1)) * 100)}%`}
                    subtext={`${stats.paidCount} / ${stats.activeMembers} Pagados`}
                    icon={CreditCard}
                    iconClass="bg-amber-400 text-white"
                    onClick={() => openModal('payments')}
                />
                <StatCard
                    title="COMUNICACIONES"
                    value={stats.pendingCount}
                    subtext="Socios a Notificar"
                    icon={MessageCircle}
                    iconClass="bg-blue-500 text-white"
                    onClick={() => openModal('comunicaciones')}
                />
            </div>

            {/* ══════════════════════ TAREAS ══════════════════════ */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                        <ClipboardList className="text-indigo-600" size={22} />
                        Tareas
                    </h3>
                    <button
                        onClick={() => setShowAddTask(v => !v)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        Nueva Tarea
                    </button>
                </div>

                {/* Add-task form */}
                {showAddTask && (
                    <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Nombre</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 text-sm"
                                placeholder="Ej: Limpiar el tatami..."
                                value={newTaskName}
                                onChange={e => setNewTaskName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveNewTask()}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Frecuencia</label>
                            <select
                                className="px-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 text-sm bg-white"
                                value={newTaskFreq}
                                onChange={e => setNewTaskFreq(e.target.value)}
                            >
                                <option value="weekly">Semanal (resetea cada Lunes)</option>
                                <option value="monthly">Mensual (resetea el 1° de cada mes)</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveNewTask}
                                disabled={tasksLoading}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                Guardar
                            </button>
                            <button
                                onClick={() => { setShowAddTask(false); setNewTaskName(''); }}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-colors hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* ─────────────── GUARDIA SEMANAL ──────────────── */}
                {(() => {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const monthName = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

                    const owners = ['fede', 'gonza'];

                    const fmt = (d) =>
                        d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

                    return (
                        <div className="mb-8 p-5 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-100">
                            {/* sub-header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Shield size={16} className="text-indigo-500" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Asignacion Semanal &mdash; {monthName}
                                    </span>
                                </div>
                                <button
                                    onClick={toggleScheduleStarter}
                                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm"
                                    title="Invertir quén empieza este mes"
                                >
                                    <ArrowLeftRight size={13} />
                                    Invertir
                                </button>
                            </div>

                            {/* Week cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {monthWeeks.map((week, idx) => {
                                    const ownerKey = owners[idx % 2 === 0
                                        ? (scheduleStarter === 'fede' ? 0 : 1)
                                        : (scheduleStarter === 'fede' ? 1 : 0)];
                                    const isFede = ownerKey === 'fede';
                                    const isCurrent = now >= week.start && now <= week.end;

                                    return (
                                        <div
                                            key={idx}
                                            className={`relative rounded-xl p-3.5 border-2 transition-all ${isCurrent
                                                    ? isFede
                                                        ? 'border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-100'
                                                        : 'border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100'
                                                    : 'border-transparent bg-white shadow-sm'
                                                }`}
                                        >
                                            {/* Week number */}
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isFede ? 'text-indigo-400' : 'text-emerald-500'
                                                }`}>
                                                Sem {idx + 1}
                                            </span>

                                            {/* Date range */}
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5 mb-2 leading-tight">
                                                {fmt(week.start)} – {fmt(week.end)}
                                            </p>

                                            {/* Owner name */}
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-black ${isFede
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                <span>{isFede ? '🔵' : '🟢'}</span>
                                                {isFede ? 'Fede' : 'Gonza / Andy'}
                                            </div>

                                            {/* Current-week badge */}
                                            {isCurrent && (
                                                <span className={`absolute -top-2 -right-2 text-[9px] font-black px-2 py-0.5 rounded-full text-white shadow ${isFede ? 'bg-indigo-500' : 'bg-emerald-500'
                                                    }`}>
                                                    ● AHORA
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* ── Instructor payments (built-in monthly tasks) ── */}
                {stats.instructors.length > 0 && (() => {
                    const currentMonth = new Date().getMonth() + 1;
                    const currentYear = new Date().getFullYear();
                    return (
                        <div className="mb-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pago a Instructores (Mensual)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {stats.instructors.map((instructor, idx) => {
                                    const isPaid = stats.expenses.some(e => {
                                        const eDate = new Date(e.date);
                                        return e.description &&
                                            e.description.includes(`Pago Instructor: ${instructor.name}`) &&
                                            (eDate.getMonth() + 1) === currentMonth &&
                                            eDate.getFullYear() === currentYear;
                                    });
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isPaid
                                                    ? 'bg-emerald-50 border-emerald-200'
                                                    : 'bg-white border-slate-200 hover:border-indigo-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => !isPaid && handlePayInstructor(instructor)}
                                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${isPaid
                                                            ? 'bg-emerald-500 border-emerald-500 cursor-default'
                                                            : 'border-slate-300 hover:border-indigo-400 cursor-pointer'
                                                        }`}
                                                    title={isPaid ? 'Pagado este mes' : 'Marcar como pagado'}
                                                >
                                                    {isPaid && <CheckCircle size={14} className="text-white" />}
                                                </button>
                                                <div>
                                                    <p className={`text-sm font-bold ${isPaid ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                        Pago a {instructor.name}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{instructor.hours} hs · ${(instructor.hours * 500).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            {isPaid ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full uppercase">Pagado</span>
                                            ) : (
                                                <button
                                                    onClick={() => handlePayInstructor(instructor)}
                                                    className="text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
                                                >
                                                    Pagar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* ── Custom tasks ── */}
                {(tasks || []).length === 0 && !showAddTask ? (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No hay tareas personalizadas. Crea una con el botón de arriba.</p>
                    </div>
                ) : (
                    (tasks || []).length > 0 && (
                        <>
                            {/* Weekly tasks */}
                            {tasks.filter(t => t.frequency === 'weekly').length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <RotateCcw size={12} />
                                        Semanales (resetea cada Lunes)
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {tasks.filter(t => t.frequency === 'weekly').map(task => {
                                            const done = !!task.completedAt;
                                            return (
                                                <div
                                                    key={task._id}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${done
                                                            ? 'bg-emerald-50 border-emerald-200'
                                                            : 'bg-white border-slate-200 hover:border-indigo-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <button
                                                            onClick={() => !tasksLoading && handleToggleTask(task._id)}
                                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done
                                                                    ? 'bg-emerald-500 border-emerald-500'
                                                                    : 'border-slate-300 hover:border-indigo-400 cursor-pointer'
                                                                }`}
                                                        >
                                                            {done && <CheckCircle size={14} className="text-white" />}
                                                        </button>
                                                        <p className={`text-sm font-semibold truncate ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                            {task.name}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                        {done && <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full uppercase">Hecho</span>}
                                                        <button
                                                            onClick={() => handleDeleteTask(task._id)}
                                                            className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                                                            title="Eliminar tarea"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Monthly tasks */}
                            {tasks.filter(t => t.frequency === 'monthly').length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        Mensuales (resetea el 1° de cada mes)
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {tasks.filter(t => t.frequency === 'monthly').map(task => {
                                            const done = !!task.completedAt;
                                            return (
                                                <div
                                                    key={task._id}
                                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${done
                                                            ? 'bg-emerald-50 border-emerald-200'
                                                            : 'bg-white border-slate-200 hover:border-indigo-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <button
                                                            onClick={() => !tasksLoading && handleToggleTask(task._id)}
                                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done
                                                                    ? 'bg-emerald-500 border-emerald-500'
                                                                    : 'border-slate-300 hover:border-indigo-400 cursor-pointer'
                                                                }`}
                                                        >
                                                            {done && <CheckCircle size={14} className="text-white" />}
                                                        </button>
                                                        <p className={`text-sm font-semibold truncate ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                            {task.name}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                        {done && <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full uppercase">Hecho</span>}
                                                        <button
                                                            onClick={() => handleDeleteTask(task._id)}
                                                            className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                                                            title="Eliminar tarea"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )
                )}
            </div>

            {/* Fiados / Deudas Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-700">Control de Fiados (Por Socio)</h3>
                        <p className="text-sm text-slate-400">Agrupado por deudor. Pagos parciales se descuentan de la deuda más antigua.</p>
                    </div>
                </div>

                <div className="relative mb-6 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar socio en deudas..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={debtSearchTerm}
                        onChange={(e) => setDebtSearchTerm(e.target.value)}
                    />
                </div>

                {debts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                        No hay deudas pendientes en este momento.
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                        <table className="w-full text-left relative">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-sm uppercase sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 rounded-l-lg">Socio</th>
                                    <th className="px-6 py-3">Detalle Deudas</th>
                                    <th className="px-6 py-3">Total Pendiente</th>
                                    <th className="px-6 py-3 text-right rounded-r-lg">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Object.values(debts.reduce((acc, debt) => {
                                    const mId = debt.memberId?._id || debt.memberId;
                                    const mName = debt.memberId?.fullName || debt.memberName;
                                    if (!acc[mId]) {
                                        acc[mId] = {
                                            id: mId,
                                            name: mName,
                                            count: 0,
                                            totalDebt: 0,
                                            items: []
                                        };
                                    }
                                    const remaining = debt.totalAmount - (debt.paidAmount || 0);
                                    acc[mId].items.push(debt);
                                    acc[mId].totalDebt += remaining;
                                    acc[mId].count += 1;
                                    return acc;
                                }, {})).filter(group =>
                                    group.name.toLowerCase().includes(debtSearchTerm.toLowerCase())
                                ).map(group => (
                                    <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                    {group.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700">{group.name}</p>
                                                    <p className="text-xs text-slate-400">{group.count} registro(s)</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="break-words max-w-xs text-xs text-slate-500">
                                                {group.items.slice(0, 3).map((d, i) => (
                                                    <div key={d._id} className="mb-1">
                                                        <span className="font-bold">
                                                            {d.products.map(p => p.productName).join(', ')}
                                                        </span>
                                                        <span className="text-slate-400 mx-1">
                                                            ({new Date(d.date).toLocaleDateString()})
                                                        </span>
                                                        <span className="text-red-500 font-medium">
                                                            ${(d.totalAmount - (d.paidAmount || 0)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                                {group.items.length > 3 && <span>... y {group.items.length - 3} más</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-red-600 text-lg">
                                                ${group.totalDebt.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setPartialPayForm({
                                                            memberId: group.id,
                                                            amount: '',
                                                            memberName: group.name,
                                                            maxAmount: group.totalDebt,
                                                            items: group.items,
                                                            adjustments: {}
                                                        });
                                                        setPartialPayModalOpen(true);
                                                    }}
                                                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Pago Parcial
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPendingPayment({
                                                            title: 'Pago Total de Deuda',
                                                            subtitle: group.name,
                                                            amount: group.totalDebt,
                                                            action: async (method) => {
                                                                await axios.post(`${API_URL}/api/debts/pay-partial`, {
                                                                    memberId: group.id,
                                                                    amount: group.totalDebt,
                                                                    paymentMethod: method
                                                                });
                                                                fetchData();
                                                            }
                                                        });
                                                        setPayMethodModalOpen(true);
                                                    }}
                                                    className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCircle size={14} />
                                                    Pagar Todo
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Birthdays Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                        <Calendar className="text-pink-500" />
                        Cumpleaños del Mes
                    </h3>
                </div>

                {stats.birthdaysList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                        No hay cumpleañeros este mes.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.birthdaysList.map(m => {
                            const bdate = new Date(m.birthDate);
                            const day = bdate.getUTCDate();
                            const age = new Date().getFullYear() - bdate.getFullYear();
                            // Compare local today with UTC birthday day to celebrate on the correct calendar day
                            const isToday = new Date().getDate() === day && (new Date().getMonth() + 1) === (new Date().getMonth() + 1);

                            return (
                                <div key={m._id} className={`p-4 rounded-xl border flex items-center gap-4 ${isToday ? 'bg-pink-50 border-pink-200' : 'bg-white border-slate-100'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isToday ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {day}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700">{m.fullName}</p>
                                        <p className="text-xs text-slate-400">Cumple {age} años</p>
                                    </div>
                                    {isToday && (
                                        <span className="ml-auto px-2 py-1 bg-pink-100 text-pink-600 text-xs font-bold rounded-full">
                                            ¡Hoy!
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}

            {/* New Sale Modal */}
            {newSaleModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Nueva Venta Directa</h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Producto</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Buscar producto..."
                                    value={productSearchTerm}
                                    onChange={(e) => {
                                        setProductSearchTerm(e.target.value);
                                        setShowProductDropdown(true);
                                        // Reset selected product if user changes text manually to something not matching?
                                        // Better to keep it loose for now, but usually clearing ID is good if text changes.
                                        if (newSaleForm.productId && e.target.value !== newSaleForm.productName) {
                                            setNewSaleForm(prev => ({ ...prev, productId: '', productName: '', amount: 0 }));
                                        }
                                    }}
                                    onFocus={() => setShowProductDropdown(true)}
                                />
                                {showProductDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {stats.products
                                            .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                            .map(product => (
                                                <div
                                                    key={product._id}
                                                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                                    onClick={() => selectProductForSale(product)}
                                                >
                                                    <span className="font-medium text-slate-700">{product.name}</span>
                                                    <div className="text-right">
                                                        <span className="block text-xs text-slate-500">Stock: {product.stock}</span>
                                                        <span className="block text-sm font-bold text-green-600">${product.salePrice}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        {stats.products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).length === 0 && (
                                            <div className="px-4 py-2 text-slate-400 text-sm">No se encontraron productos</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Overlay to close dropdown when clicking outside */}
                            {showProductDropdown && (
                                <div className="fixed inset-0 z-0" onClick={() => setShowProductDropdown(false)} />
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newSaleForm.quantity}
                                    onChange={(e) => setNewSaleForm({ ...newSaleForm, quantity: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Método de Pago</label>
                                <PaymentMethodToggle
                                    value={newSaleForm.paymentMethod}
                                    onChange={(val) => setNewSaleForm({ ...newSaleForm, paymentMethod: val })}
                                />
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg text-right">
                                <span className="text-lg font-bold text-green-600">
                                    Total: ${(newSaleForm.amount * newSaleForm.quantity).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setNewSaleModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleNewSale}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-lg shadow-green-100 transition-all"
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
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newExpenseForm.description}
                                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newExpenseForm.amount}
                                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Método de Pago</label>
                                <PaymentMethodToggle
                                    value={newExpenseForm.paymentMethod}
                                    onChange={(val) => setNewExpenseForm({ ...newExpenseForm, paymentMethod: val })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setNewExpenseModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleNewExpense}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
                            >
                                Registrar Gasto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Fiado Modal */}
            {newFiadoModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Clock className="text-amber-500" />
                            Nuevo Fiado / Deuda
                        </h3>

                        <div className="space-y-4">
                            {/* Member Select */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Socio</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Buscar socio por nombre o CI..."
                                        value={fiadoMemberSearchTerm}
                                        onChange={(e) => {
                                            setFiadoMemberSearchTerm(e.target.value);
                                            setShowFiadoMemberDropdown(true);
                                            if (newFiadoForm.memberId && e.target.value !== stats.membersList.find(m => m._id === newFiadoForm.memberId)?.fullName) {
                                                setNewFiadoForm(prev => ({ ...prev, memberId: '' }));
                                            }
                                        }}
                                        onFocus={() => setShowFiadoMemberDropdown(true)}
                                    />
                                </div>
                                {showFiadoMemberDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowFiadoMemberDropdown(false)} />
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {stats.membersList
                                                .filter(m => m.active && (
                                                    m.fullName.toLowerCase().includes(fiadoMemberSearchTerm.toLowerCase()) ||
                                                    (m.ci && m.ci.includes(fiadoMemberSearchTerm))
                                                ))
                                                .map(member => (
                                                    <div
                                                        key={member._id}
                                                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-none"
                                                        onClick={() => {
                                                            setNewFiadoForm({ ...newFiadoForm, memberId: member._id });
                                                            setFiadoMemberSearchTerm(member.fullName);
                                                            setShowFiadoMemberDropdown(false);
                                                        }}
                                                    >
                                                        <div>
                                                            <span className="font-bold text-slate-700 block text-sm">{member.fullName}</span>
                                                            <span className="text-[10px] text-slate-400 uppercase font-medium">CI: {member.ci || 'N/A'}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Activo</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            {stats.membersList.filter(m => m.active && (m.fullName.toLowerCase().includes(fiadoMemberSearchTerm.toLowerCase()) || (m.ci && m.ci.includes(fiadoMemberSearchTerm)))).length === 0 && (
                                                <div className="px-4 py-4 text-slate-400 text-sm text-center">No se encontraron socios activos</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Add Product Section */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                                <div className="relative">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Producto</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="Buscar producto..."
                                        value={fiadoProductSearchTerm}
                                        onChange={(e) => {
                                            setFiadoProductSearchTerm(e.target.value);
                                            setShowFiadoProductDropdown(true);
                                            // Reset selected product if text changes manually
                                            if (currentFiadoProduct.productId && e.target.value !== stats.products.find(p => p._id === currentFiadoProduct.productId)?.name) {
                                                setCurrentFiadoProduct(prev => ({ ...prev, productId: '' }));
                                            }
                                        }}
                                        onFocus={() => setShowFiadoProductDropdown(true)}
                                    />
                                    {showFiadoProductDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {stats.products
                                                .filter(p => p.name.toLowerCase().includes(fiadoProductSearchTerm.toLowerCase()) && p.stock > 0)
                                                .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
                                                .map(p => (
                                                    <div
                                                        key={p._id}
                                                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                                        onClick={() => {
                                                            if (p.stock > 0) {
                                                                setCurrentFiadoProduct({ ...currentFiadoProduct, productId: p._id });
                                                                setFiadoProductSearchTerm(p.name);
                                                                setShowFiadoProductDropdown(false);
                                                            }
                                                        }}
                                                    >
                                                        <span className="font-medium text-slate-700 text-xs">{p.name}</span>
                                                        <div className="text-right">
                                                            <span className="block text-[10px] text-slate-500">Stock: {p.stock}</span>
                                                            <span className="block text-[10px] text-blue-500 font-medium">Vendidos: {p.salesCount || 0}</span>
                                                            <span className="block text-xs font-bold text-green-600">${p.salePrice}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            {stats.products.filter(p => p.name.toLowerCase().includes(fiadoProductSearchTerm.toLowerCase()) && p.stock > 0).length === 0 && (
                                                <div className="px-4 py-2 text-slate-400 text-xs">No se encontraron productos con stock</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Overlay to close dropdown when clicking outside */}
                                {showFiadoProductDropdown && (
                                    <div className="fixed inset-0 z-0" onClick={() => setShowFiadoProductDropdown(false)} />
                                )}

                                <div className="flex gap-2 items-end">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cant.</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={currentFiadoProduct.quantity}
                                            onChange={(e) => setCurrentFiadoProduct({ ...currentFiadoProduct, quantity: Number(e.target.value) })}
                                        />
                                    </div>
                                    <button
                                        onClick={addProductToFiado}
                                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2 font-bold text-sm transition-colors"
                                    >
                                        <Plus size={18} />
                                        Agregar Item
                                    </button>
                                </div>
                            </div>

                            {/* List of added products */}
                            <div className="min-h-[100px] max-h-[200px] overflow-y-auto border border-slate-100 rounded-lg p-2">
                                {newFiadoForm.products.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-4">Agrega productos a la lista...</p>
                                ) : (
                                    <div className="space-y-2">
                                        {newFiadoForm.products.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 shadow-sm text-sm">
                                                <div>
                                                    <span className="font-bold">{item.quantity}x</span> {item.productName}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-slate-600">${item.amount * item.quantity}</span>
                                                    <button
                                                        onClick={() => removeProductFromFiado(item.productId)}
                                                        className="text-red-400 hover:text-red-600"
                                                    >
                                                        <UserX size={16} /> {/* Using UserX as 'X' icon proxy */}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                <span className="font-bold text-slate-700">Total a Deber:</span>
                                <span className="text-xl font-bold text-red-600">
                                    ${newFiadoForm.products.reduce((acc, p) => acc + (p.amount * p.quantity), 0).toLocaleString()}
                                </span>
                            </div>

                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setNewFiadoModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateFiado}
                                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold"
                            >
                                Crear Deuda
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Partial Payment Modal */}
            {partialPayModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Pago Detallado / Parcial</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Socio: <span className="font-bold text-slate-700">{partialPayForm.memberName}</span>
                        </p>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 mini-scrollbar">
                            <div className="space-y-3">
                                {partialPayForm.items.map((item) => {
                                    const balance = item.totalAmount - (item.paidAmount || 0);
                                    return (
                                        <div key={item._id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 truncate w-44">
                                                        {item.products.map(p => p.productName).join(', ')}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-red-600">${balance.toLocaleString()}</p>
                                                    <p className="text-[9px] text-slate-400">Pendiente</p>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                                <input
                                                    type="number"
                                                    className="w-full pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    placeholder="Monto a pagar..."
                                                    value={partialPayForm.adjustments[item._id] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setPartialPayForm(prev => ({
                                                            ...prev,
                                                            adjustments: { ...prev.adjustments, [item._id]: val }
                                                        }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <div className="flex bg-blue-50 p-3 rounded-xl items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase">Total a Cobrar</span>
                                    <span className="text-xl font-black text-blue-700">
                                        ${Object.values(partialPayForm.adjustments).reduce((acc, val) => acc + Number(val || 0), 0).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        const total = prompt("Monto total a distribuir (FIFO):", partialPayForm.totalDebt || partialPayForm.maxAmount);
                                        if (total) distributeFIFO(total);
                                    }}
                                    className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-[10px] font-bold shadow-sm hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                                >
                                    Distribuir Auto
                                </button>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Método de Pago</label>
                                <PaymentMethodToggle
                                    value={partialPayForm.paymentMethod}
                                    onChange={(val) => setPartialPayForm({ ...partialPayForm, paymentMethod: val })}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPartialPayModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handlePartialSubmit}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-200"
                                >
                                    Confirmar Cobro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Register Modal */}
            {cashRegisterModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Calculator className="text-slate-600" />
                                Cierre de Caja
                            </div>
                            <button
                                onClick={fetchCashRegisterHistory}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg"
                            >
                                <History size={16} /> Historial
                            </button>
                        </h3>

                        <div className="space-y-4">
                            {/* Monto Inicial — persisted per day */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Monto Inicial en Caja ($)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={cashRegisterForm.initialBalance}
                                        onChange={(e) => {
                                            setCashRegisterForm({ ...cashRegisterForm, initialBalance: e.target.value });
                                            // Mark as unsaved if user edits after saving
                                            setInitialBalanceSaved(false);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveInitialBalance}
                                        className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${initialBalanceSaved
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : 'bg-slate-800 text-white hover:bg-slate-700'
                                            }`}
                                        title="Guardar monto inicial para el día"
                                    >
                                        {initialBalanceSaved ? '✓ Guardado' : 'Guardar'}
                                    </button>
                                </div>
                                {initialBalanceSaved && (
                                    <p className="text-xs text-green-600 mt-1">✓ El monto inicial se mantendrá aunque cierres el modal</p>
                                )}
                            </div>

                            {/* cashIn / cashOut — auto-populated from Efectivo only */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-slate-700">Ingresos Día ($)</label>
                                        <button
                                            type="button"
                                            onClick={fetchCashDetail}
                                            disabled={cashDetailLoading}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 disabled:opacity-50"
                                        >
                                            {cashDetailLoading ? '...' : '📋 Ver ventas'}
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={cashRegisterForm.cashIn}
                                        onChange={(e) => setCashRegisterForm({ ...cashRegisterForm, cashIn: e.target.value })}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <DollarSign size={10} className="text-green-500" /> Solo pagos en efectivo
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Gastos Día ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={cashRegisterForm.cashOut}
                                        onChange={(e) => setCashRegisterForm({ ...cashRegisterForm, cashOut: e.target.value })}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <DollarSign size={10} className="text-red-400" /> Solo gastos en efectivo
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">Balance Esperado:</span>
                                    <span className="text-lg font-bold text-blue-700">
                                        ${(Number(cashRegisterForm.initialBalance) + Number(cashRegisterForm.cashIn) - Number(cashRegisterForm.cashOut)).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Dinero Físico Real Contado ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-green-700 bg-green-50"
                                    value={cashRegisterForm.actualBalance}
                                    onChange={(e) => setCashRegisterForm({ ...cashRegisterForm, actualBalance: e.target.value })}
                                />
                            </div>

                            {(() => {
                                const expected = Number(cashRegisterForm.initialBalance) + Number(cashRegisterForm.cashIn) - Number(cashRegisterForm.cashOut);
                                const actual = Number(cashRegisterForm.actualBalance);
                                const diff = actual - expected;
                                if (cashRegisterForm.actualBalance === '') return null;
                                return (
                                    <div className={`p-3 rounded-lg border ${diff === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Diferencia:</span>
                                            <span className="text-lg font-bold">
                                                {diff === 0 ? 'Exacto ($0)' : `$${diff.toLocaleString()}`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notas (Opcional)</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    rows="2"
                                    placeholder="Ej: Faltó billete de 100, se pagó a proveedor..."
                                    value={cashRegisterForm.notes}
                                    onChange={(e) => setCashRegisterForm({ ...cashRegisterForm, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setCashRegisterModalOpen(false);
                                    // Do NOT reset initialBalance here — it persists until final close
                                    setCashRegisterForm(prev => ({ ...prev, cashIn: '', cashOut: '', actualBalance: '', notes: '' }));
                                }}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCashRegisterSubmit}
                                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium"
                                disabled={cashRegisterForm.actualBalance === '' || cashRegisterForm.initialBalance === ''}
                            >
                                Guardar Cierre
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Register History Modal */}
            {cashRegisterHistoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <History className="text-blue-600" />
                                Historial de Cierres
                            </h3>
                            <button
                                onClick={() => setCashRegisterHistoryModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 mini-scrollbar">
                            {cashRegisterHistory.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">
                                    No hay cierres de caja registrados aún.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cashRegisterHistory.map((register) => (
                                        <div key={register._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-bold text-slate-700">
                                                    {new Date(register.date).toLocaleDateString('es-UY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${register.difference === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {register.difference === 0 ? 'Exacto' : `Dif: $${register.difference.toLocaleString()}`}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                                <div>
                                                    <p className="text-slate-500 text-xs uppercase">Inicial</p>
                                                    <p className="font-semibold">${register.initialBalance.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-green-600 text-xs uppercase">Ingresos</p>
                                                    <p className="font-semibold">+${register.cashIn.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-red-600 text-xs uppercase">Gastos</p>
                                                    <p className="font-semibold">-${register.cashOut.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-blue-600 text-xs uppercase">Físico</p>
                                                    <p className="font-bold">${register.actualBalance.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            {register.notes && (
                                                <div className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-600 bg-white p-2 rounded-lg italic">
                                                    <StickyNote size={14} className="inline mr-1 text-amber-500" />
                                                    {register.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Detail Modal — ventas/gastos en efectivo del día */}
            {cashDetailModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <DollarSign size={20} className="text-green-600" />
                                    Movimientos en Efectivo — Hoy
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Podés cambiar cualquier registro a Digital. Eso lo quitará de Ingresos Día.</p>
                            </div>
                            <button
                                onClick={() => setCashDetailModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 mini-scrollbar">
                            {/* Ingresos */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                                    Ingresos ({cashDetailData.payments.length})
                                    <span className="ml-auto font-bold text-green-700 text-sm normal-case">
                                        ${cashDetailData.payments.reduce((a, p) => a + (p.amount || 0), 0).toLocaleString()}
                                    </span>
                                </p>
                                {cashDetailData.payments.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-3 bg-slate-50 rounded-xl">Sin ingresos en efectivo hoy</p>
                                ) : (
                                    <div className="space-y-2">
                                        {cashDetailData.payments.map(p => (
                                            <div key={p._id} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-slate-700 truncate">
                                                        {p.memberName || p.productName || p.type || 'Pago'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {p.type} · {new Date(p.date).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                                                    <span className="text-sm font-black text-green-700">${(p.amount || 0).toLocaleString()}</span>
                                                    <button
                                                        onClick={() => switchPaymentToDigital(p._id, 'payment')}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 bg-white border border-slate-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-lg transition-all"
                                                        title="Cambiar a Digital"
                                                    >
                                                        <CreditCard size={11} />
                                                        Digital
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Gastos */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                                    Gastos ({cashDetailData.expenses.length})
                                    <span className="ml-auto font-bold text-red-600 text-sm normal-case">
                                        ${cashDetailData.expenses.reduce((a, e) => a + (e.amount || 0), 0).toLocaleString()}
                                    </span>
                                </p>
                                {cashDetailData.expenses.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-3 bg-slate-50 rounded-xl">Sin gastos en efectivo hoy</p>
                                ) : (
                                    <div className="space-y-2">
                                        {cashDetailData.expenses.map(e => (
                                            <div key={e._id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-slate-700 truncate">
                                                        {e.description || e.concept || 'Gasto'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {e.category || 'Otros'} · {new Date(e.date).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                                                    <span className="text-sm font-black text-red-600">${(e.amount || 0).toLocaleString()}</span>
                                                    <button
                                                        onClick={() => switchPaymentToDigital(e._id, 'expense')}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 bg-white border border-slate-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-lg transition-all"
                                                        title="Cambiar a Digital"
                                                    >
                                                        <CreditCard size={11} />
                                                        Digital
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100">
                            <button
                                onClick={() => setCashDetailModalOpen(false)}
                                className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Method Selection Modal */}
            {payMethodModalOpen && pendingPayment && (

                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <DollarSign size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">{pendingPayment.title}</h3>
                            <p className="text-slate-500">{pendingPayment.subtitle}</p>
                            <p className="text-2xl font-black text-slate-800 mt-2">${pendingPayment.amount.toLocaleString()}</p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-wider">Selecciona Método</p>
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={async () => {
                                        await pendingPayment.action('Efectivo');
                                        setPayMethodModalOpen(false);
                                        setPendingPayment(null);
                                    }}
                                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-200 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                            <DollarSign size={20} className="text-green-600" />
                                        </div>
                                        <span className="font-bold text-slate-700">Efectivo</span>
                                    </div>
                                    <CheckCircle size={20} className="text-slate-300 group-hover:text-green-500" />
                                </button>

                                <button
                                    onClick={async () => {
                                        await pendingPayment.action('Digital');
                                        setPayMethodModalOpen(false);
                                        setPendingPayment(null);
                                    }}
                                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                            <CreditCard size={20} className="text-blue-600" />
                                        </div>
                                        <span className="font-bold text-slate-700">Digital</span>
                                    </div>
                                    <CheckCircle size={20} className="text-slate-300 group-hover:text-blue-500" />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setPayMethodModalOpen(false);
                                setPendingPayment(null);
                            }}
                            className="w-full mt-6 py-3 text-slate-400 hover:text-slate-600 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;
