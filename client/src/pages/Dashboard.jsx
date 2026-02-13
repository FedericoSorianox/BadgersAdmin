import { useState, useEffect } from 'react';
import { Users, CreditCard, Package, UserX, Loader2, Search, Plus, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, MessageCircle, Send, StickyNote, Calendar, UserCheck } from 'lucide-react';
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
        expenses: []
    });

    const [debts, setDebts] = useState([]);

    // Quick Actions State
    const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
    const [newSaleForm, setNewSaleForm] = useState({ productId: '', productName: '', amount: 0, quantity: 1 });
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    const [newExpenseModalOpen, setNewExpenseModalOpen] = useState(false);
    const [newExpenseForm, setNewExpenseForm] = useState({ description: '', amount: 0, concept: '' });

    const [newFiadoModalOpen, setNewFiadoModalOpen] = useState(false);
    const [newFiadoForm, setNewFiadoForm] = useState({ memberId: '', products: [] });
    // products in fixture: [{ productId, productName, quantity, amount }]
    const [currentFiadoProduct, setCurrentFiadoProduct] = useState({ productId: '', quantity: 1 });
    const [fiadoProductSearchTerm, setFiadoProductSearchTerm] = useState('');
    const [showFiadoProductDropdown, setShowFiadoProductDropdown] = useState(false);

    const [partialPayModalOpen, setPartialPayModalOpen] = useState(false);
    const [partialPayForm, setPartialPayForm] = useState({ memberId: '', amount: '', memberName: '', maxAmount: 0 });
    const [pendingNotes, setPendingNotes] = useState({});


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
            const stockCount = products.reduce((acc, p) => acc + (Number(p.stock) > 0 ? 1 : 0), 0);

            // Payments logic
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            // Active members count
            const activeMembersCount = members.filter(m =>
                m.active && !m.isExempt
            ).length;
            const inactiveMembersCount = members.length - activeMembersCount;

            // Paid members for current month
            const paidThisMonthIds = new Set(
                payments
                    .filter(p =>
                        Number(p.month) === currentMonth &&
                        Number(p.year) === currentYear &&
                        (p.type === 'Cuota' || !p.type)
                    )
                    .map(p => String(p.memberId))
            );

            const paidCount = members.filter(m => m.active && !m.isExempt && paidThisMonthIds.has(String(m._id))).length;
            const sortedProducts = [...products].sort((a, b) => Number(a.stock) - Number(b.stock));

            setStats({
                activeMembers: activeMembersCount,
                inactiveMembers: inactiveMembersCount,
                stockCount,
                paidCount,
                pendingCount: activeMembersCount - paidCount,
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
                expenses: expenses
            });

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
                month: currentMonth,
                year: currentYear,
                date: new Date()
            };

            await axios.post(`${API_URL}/api/finance`, saleData);
            setNewSaleModalOpen(false);
            setNewSaleForm({ productId: '', productName: '', amount: 0, quantity: 1 });
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
                date: new Date()
            };
            await axios.post(`${API_URL}/api/finance/expenses`, expenseData);
            setNewExpenseModalOpen(false);
            setNewExpenseForm({ description: '', amount: 0, concept: '' });
            fetchData(); // Refresh to update financials if we were showing them, although mainly updates stats here
        } catch (error) {
            console.error('Error registering expense:', error);
            alert('Error al registrar el gasto');
        }
    };

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
            fetchData();
        } catch (error) {
            console.error('Error creating fiado:', error);
            alert(error.response?.data?.message || 'Error al crear el fiado');
        }
    };

    const handlePartialSubmit = async () => {
        if (!partialPayForm.amount || partialPayForm.amount <= 0) {
            alert('Ingrese un monto válido');
            return;
        }
        if (partialPayForm.amount > partialPayForm.maxAmount) {
            if (!confirm('El monto es mayor a la deuda total. ¿Desea continuar y dejar saldo a favor?')) return;
        }

        try {
            await axios.post(`${API_URL}/api/debts/pay-partial`, {
                memberId: partialPayForm.memberId,
                amount: partialPayForm.amount
            });
            setPartialPayModalOpen(false);
            setPartialPayForm({ memberId: '', amount: '', memberName: '', maxAmount: 0 });
            fetchData();
        } catch (error) {
            console.error('Error paying partial:', error);
            alert(error.response?.data?.message || 'Error al registrar el pago');
        }
    };


    // --- Modal Logic ---

    const openModal = (type) => {
        setModalType(type);
        setSearchTerm('');
        setModalOpen(true);
        setPendingNotes({});
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
            fetchData();
            // window.location.reload(); // Removed reload, using fetchData
            setModalOpen(false);

        } catch (error) {
            console.error("Error registering payment", error);
            alert('Error al registrar el pago');
        }
    };

    const handlePayInstructor = async (instructor) => {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const amount = instructor.hours * 500;

        if (!window.confirm(`¿Confirmar pago de $${amount} a ${instructor.name} correspondiente a este mes?`)) return;

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/finance/expenses`, {
                description: `Pago Instructor: ${instructor.name}`,
                amount: amount,
                date: new Date(),
                category: 'Sueldos'
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

    const handleBulkReminders = async (membersToRemind) => {
        if (membersToRemind.length === 0) return;

        if (!confirm(`¿Estás seguro de enviar recordatorios a ${membersToRemind.length} socios pendientes?`)) {
            return;
        }

        try {
            setLoading(true); // Show global loading or handle locally
            const membersPayload = membersToRemind.map(m => ({
                phone: m.phone,
                name: m.fullName,
                id: m._id,
                amount: m.planCost || 2000
            }));

            const res = await axios.post(`${API_URL}/api/notifications/send-reminders-bulk`, {
                members: membersPayload
            });

            alert(res.data.message);
            fetchData();
        } catch (error) {
            console.error('Error sending bulk reminders:', error);
            alert('Error al enviar recordatorios masivos');
            setLoading(false); // Ensure loading is off on error
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
            const paidThisMonthIds = new Set(
                stats.paymentsList
                    .filter(p =>
                        Number(p.month) === currentMonth &&
                        Number(p.year) === currentYear &&
                        (p.type === 'Cuota' || !p.type)
                    )
                    .map(p => String(p.memberId))
            );

            const activeMembers = stats.membersList.filter(m => m.active && !m.isExempt);
            const pendingList = activeMembers.filter(m => !paidThisMonthIds.has(String(m._id)));
            const paidList = activeMembers.filter(m => paidThisMonthIds.has(String(m._id)));

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
                                {filteredPending.length > 0 && (
                                    <button
                                        onClick={() => handleBulkReminders(filteredPending)}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <Send size={14} />
                                        Recordar a Todos
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4 max-h-[300px] overflow-y-auto divide-y divide-red-100">
                            {filteredPending.map(m => (
                                <div key={m._id} className="py-2 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-700">{m.fullName}</span>
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
                                        <span className="text-xs text-slate-500">CI: {m.ci}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAddNote(m)}
                                            className={`p-1.5 rounded-lg transition-colors
                                                ${pendingNotes[m._id] !== undefined ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-yellow-600 hover:bg-yellow-50'}
                                            `}
                                            title="Agregar Nota"
                                        >
                                            <StickyNote size={16} />
                                        </button>
                                        <button
                                            onClick={() => handlePaymentReminder(m)}
                                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 border
                                                ${stats.remindersSent.has(m._id)
                                                    ? 'bg-white border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300'
                                                    : 'bg-blue-100 border-transparent hover:bg-blue-200 text-blue-700'
                                                }`}
                                            title={stats.remindersSent.has(m._id) ? "Re-enviar recordatorio" : "Enviar recordatorio"}
                                        >
                                            {stats.remindersSent.has(m._id) ? (
                                                <>
                                                    <CheckCircle size={14} />
                                                    Enviado
                                                </>
                                            ) : (
                                                <>
                                                    <MessageCircle size={14} />
                                                    Recordar
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleQuickPayment(m)}
                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                                        >
                                            Marcar como Pagado
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredPending.length === 0 && <p className="text-sm text-slate-400">No hay resultados.</p>}
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

            {/* Header w/ Quick Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-4xl font-bold text-slate-900" style={{ color: 'var(--dashboard-title, #0f172a)' }}>Dashboard</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setNewSaleModalOpen(true)}
                        style={{ backgroundColor: 'var(--btn-new-sale, #9333ea)' }}
                        className="hover:brightness-90 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
                    >
                        <DollarSign size={20} />
                        Nueva Venta
                    </button>
                    {/* <button
                        onClick={() => setNewExpenseModalOpen(true)}
                        style={{ backgroundColor: 'var(--btn-new-expense, #dc2626)' }}
                        className="hover:brightness-90 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
                    >
                        <TrendingDown size={20} />
                        Nuevo Gasto
                    </button> */}
                    <button
                        onClick={() => setNewFiadoModalOpen(true)}
                        style={{ backgroundColor: 'var(--btn-new-fiado, #f59e0b)' }}
                        className="hover:brightness-90 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Clock size={20} />
                        Nuevo Fiado
                    </button>
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
                    title="DEUDAS ACTIVAS"
                    value={debts.length}
                    subtext="Fiados Pendientes"
                    icon={Clock}
                    iconClass="bg-red-500 text-white"
                    onClick={() => { }}
                />
            </div>

            {/* Instructor Payments Section */}
            {stats.instructors.length > 0 && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <UserCheck className="text-blue-600" />
                        Pago a Instructores
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.instructors.map((instructor, index) => {
                            const currentMonth = new Date().getMonth() + 1;
                            const currentYear = new Date().getFullYear();
                            const isPaid = stats.expenses.some(e => {
                                const eDate = new Date(e.date);
                                return e.description && e.description.includes(`Pago Instructor: ${instructor.name}`) &&
                                    (eDate.getMonth() + 1) === currentMonth &&
                                    eDate.getFullYear() === currentYear;
                            });

                            return (
                                <div key={index} className={`p-4 rounded-xl border flex items-center justify-between ${isPaid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <div>
                                        <p className="font-bold text-slate-700">{instructor.name}</p>
                                        <p className="text-xs text-slate-500">{instructor.hours} horas - ${instructor.hours * 500}</p>
                                    </div>
                                    {isPaid ? (
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                            <CheckCircle size={14} />
                                            Pagado
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handlePayInstructor(instructor)}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm animate-pulse"
                                        >
                                            Pagar
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-sm uppercase">
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
                                                            maxAmount: group.totalDebt
                                                        });
                                                        setPartialPayModalOpen(true);
                                                    }}
                                                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Pago Parcial
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`¿Confirmar pago TOTAL de $${group.totalDebt} para ${group.name}?`)) {
                                                            try {
                                                                await axios.post(`${API_URL}/api/debts/pay-partial`, {
                                                                    memberId: group.id,
                                                                    amount: group.totalDebt
                                                                });
                                                                fetchData();
                                                            } catch (e) {
                                                                alert('Error al procesar pago');
                                                            }
                                                        }
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
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold"
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
                        {/* <h3 className="text-xl font-bold text-slate-800 mb-4">Nuevo Gasto</h3>
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
                        </div> */}
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
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Socio</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newFiadoForm.memberId}
                                    onChange={(e) => setNewFiadoForm({ ...newFiadoForm, memberId: e.target.value })}
                                >
                                    <option value="">Seleccionar socio...</option>
                                    {stats.membersList.filter(m => m.active).map(m => (
                                        <option key={m._id} value={m._id}>{m.fullName}</option>
                                    ))}
                                </select>
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
                                                .filter(p => p.name.toLowerCase().includes(fiadoProductSearchTerm.toLowerCase()))
                                                .map(p => (
                                                    <div
                                                        key={p._id}
                                                        className={`px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center ${p.stock <= 0 ? 'opacity-50' : ''}`}
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
                                                            <span className="block text-xs font-bold text-green-600">${p.salePrice}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            {stats.products.filter(p => p.name.toLowerCase().includes(fiadoProductSearchTerm.toLowerCase())).length === 0 && (
                                                <div className="px-4 py-2 text-slate-400 text-xs">No se encontraron productos</div>
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
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Pago Parcial</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Socio: <span className="font-bold text-slate-700">{partialPayForm.memberName}</span><br />
                            Deuda Total: <span className="font-bold text-red-600">${partialPayForm.maxAmount.toLocaleString()}</span>
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Monto a Pagar</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={partialPayForm.amount}
                                        onChange={(e) => setPartialPayForm({ ...partialPayForm, amount: Number(e.target.value) })}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setPartialPayModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePartialSubmit}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                            >
                                Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;
