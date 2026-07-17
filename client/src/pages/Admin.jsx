import { useState, useEffect, useCallback } from 'react';
import { Save, Calculator, PiggyBank } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { useTenant } from '../context/TenantContext';

const Admin = () => {
    const { partners } = useTenant();
    const partner1Name = partners && partners[0]?.name ? partners[0].name : 'Fede';
    const partner2Name = partners && partners[1]?.name ? partners[1].name : 'Gonza';

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [config, setConfig] = useState({
        grossProfit: 0,
        fedeHours: 40,
        gonzaHours: 16,
        fedeDaysOff: 0,
        gonzaDaysOff: 0,
        instructors: [],
        plans: [],
        academySavingsBox: 0
    });

    const [results, setResults] = useState({
        hourlyPaymentFede: 0,
        utilityFede: 0,
        fedeAmount: 0,
        hourlyPaymentGonza: 0,
        utilityGonza: 0,
        gonzaAmount: 0,
        academySavingsAdded: 0,
        academySavingsTaken: 0,
        academySavingsNet: 0,
        academySavingsBoxUpdated: 0,
        savingsStatus: 'complete', // 'complete', 'partial', 'taken'
        paymentStatus: 'complete'   // 'complete', 'proportional'
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            // Fetch Finance Data (Gross Profit)
            try {
                setLoading(true);
                const [paymentsRes, expensesRes] = await Promise.all([
                    axios.get(`${API_URL}/api/finance`, {
                        params: { month: currentMonth, year: currentYear }
                    }),
                    axios.get(`${API_URL}/api/finance/expenses`)
                ]);

                // Calculate balance
                const payments = paymentsRes.data;
                const expenses = expensesRes.data.filter(e => {
                    const eDate = new Date(e.date);
                    return (eDate.getMonth() + 1) === currentMonth && eDate.getFullYear() === currentYear && e.expenseType !== 'Ahorros';
                });

                const totalCuotas = payments.filter(p => p.type === 'Cuota' || p.category === 'Cuota').reduce((acc, p) => acc + p.amount, 0);
                const totalVentas = payments.filter(p => p.type === 'Producto' || p.category === 'Producto' || p.category === 'Venta').reduce((acc, p) => acc + p.amount, 0);
                const totalGastos = expenses.reduce((acc, e) => acc + Math.abs(e.amount), 0);
                const balance = totalCuotas + totalVentas - totalGastos;

                setConfig(prev => ({ ...prev, grossProfit: balance }));
            } catch (error) {
                console.error('Error fetching finance data:', error);
            }

            // Fetch Settings
            try {
                const settingsRes = await axios.get(`${API_URL}/api/settings`);
                const settings = settingsRes.data;

                setConfig(prev => ({
                    ...prev,
                    fedeHours: settings.fedeHours !== undefined ? settings.fedeHours : 40,
                    gonzaHours: settings.gonzaHours !== undefined ? settings.gonzaHours : 16,
                    fedeDaysOff: settings.fedeDaysOff,
                    gonzaDaysOff: settings.gonzaDaysOff,
                    instructors: settings.instructors || [],
                    plans: settings.plans || [],
                    academySavingsBox: settings.academySavingsBox !== undefined ? settings.academySavingsBox : 0
                }));
            } catch (error) {
                console.error('Error fetching settings:', error);
                // Keep defaults if settings fail (e.g. route not ready)
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [currentMonth, currentYear]);

    const handleCalculate = useCallback(() => {
        const workingDays = 26;
        const hourlyRate = 1000;

        // Effective hours calculation:
        // Adjust hours based on days worked vs max working days
        // Logic: If you engage for 40 hours (approx 1.5h/day), and miss 10 days
        // Effective = 40 * ((26 - 10) / 26)

        const effectiveFedeHours = Number(config.fedeHours) * ((workingDays - Number(config.fedeDaysOff)) / workingDays);
        const effectiveGonzaHours = Number(config.gonzaHours) * ((workingDays - Number(config.gonzaDaysOff)) / workingDays);

        const grossProfit = Number(config.grossProfit);
        const totalEffectiveHours = effectiveFedeHours + effectiveGonzaHours;

        if (totalEffectiveHours <= 0) return;

        // 1. Pago por horas de cada uno (Horas * 1000)
        const baseHourlyPaymentFede = effectiveFedeHours * hourlyRate;
        const baseHourlyPaymentGonza = effectiveGonzaHours * hourlyRate;
        const totalHourlyPayment = baseHourlyPaymentFede + baseHourlyPaymentGonza;

        const initialSavingsBox = Number(config.academySavingsBox) || 0;

        let academySavingsAdded = 0;
        let academySavingsTaken = 0;
        let hourlyPaymentFede = 0;
        let hourlyPaymentGonza = 0;
        let utilityPerPartner = 0;
        let savingsStatus = 'complete'; // 'complete', 'partial', 'taken'
        let paymentStatus = 'complete';  // 'complete', 'proportional'

        if (grossProfit >= totalHourlyPayment) {
            // Caso 1: Alcanza para pagar las horas de forma directa de la ganancia
            hourlyPaymentFede = baseHourlyPaymentFede;
            hourlyPaymentGonza = baseHourlyPaymentGonza;
            paymentStatus = 'complete';

            const remainderAfterSalaries = grossProfit - totalHourlyPayment;
            const targetSavings = grossProfit * 0.10;

            if (remainderAfterSalaries >= targetSavings) {
                // Alcanza para el 10% de ahorro completo
                academySavingsAdded = targetSavings;
                savingsStatus = 'complete';

                const utility = remainderAfterSalaries - targetSavings;
                utilityPerPartner = utility / 2;
            } else {
                // Se guarda como ahorro solo el remanente disponible
                academySavingsAdded = remainderAfterSalaries;
                savingsStatus = 'partial';
                utilityPerPartner = 0;
            }
            academySavingsTaken = 0;
        } else {
            // Caso 2: No alcanza para pagar las horas de forma directa
            academySavingsAdded = 0;
            const deficit = totalHourlyPayment - grossProfit;

            // Tomamos lo necesario del fondo de ahorro
            academySavingsTaken = Math.min(initialSavingsBox, deficit);
            const totalAvailable = grossProfit + academySavingsTaken;

            if (totalAvailable >= totalHourlyPayment) {
                // Alcanza para pagar los sueldos en su totalidad (gracias al ahorro)
                hourlyPaymentFede = baseHourlyPaymentFede;
                hourlyPaymentGonza = baseHourlyPaymentGonza;
                paymentStatus = 'complete';
                savingsStatus = 'taken';
            } else {
                // Aún con el ahorro, no se llega a cubrir todo (Reparto proporcional)
                const percentageFede = effectiveFedeHours / totalEffectiveHours;
                const percentageGonza = effectiveGonzaHours / totalEffectiveHours;

                hourlyPaymentFede = totalAvailable * percentageFede;
                hourlyPaymentGonza = totalAvailable * percentageGonza;
                paymentStatus = 'proportional';
                savingsStatus = 'taken';
            }
            utilityPerPartner = 0;
        }

        const academySavingsNet = academySavingsAdded - academySavingsTaken;
        const academySavingsBoxUpdated = initialSavingsBox + academySavingsNet;

        const fedeAmount = hourlyPaymentFede + utilityPerPartner;
        const gonzaAmount = hourlyPaymentGonza + utilityPerPartner;

        setResults({
            hourlyPaymentFede,
            utilityFede: utilityPerPartner,
            fedeAmount,
            hourlyPaymentGonza,
            utilityGonza: utilityPerPartner,
            gonzaAmount,
            academySavingsAdded,
            academySavingsTaken,
            academySavingsNet,
            academySavingsBoxUpdated,
            savingsStatus,
            paymentStatus
        });
    }, [config]);

    // Calculate automatically when inputs change
    useEffect(() => {
        handleCalculate();
    }, [handleCalculate]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const updatedSavingsBox = results.academySavingsBoxUpdated !== undefined ? results.academySavingsBoxUpdated : config.academySavingsBox;
            await axios.post(`${API_URL}/api/settings`, {
                fedeHours: config.fedeHours,
                gonzaHours: config.gonzaHours,
                fedeDaysOff: config.fedeDaysOff,
                gonzaDaysOff: config.gonzaDaysOff,
                instructors: config.instructors,
                plans: config.plans,
                academySavingsBox: updatedSavingsBox
            });
            setConfig(prev => ({
                ...prev,
                academySavingsBox: updatedSavingsBox
            }));
            alert('Configuración guardada exitosamente');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    const handleInstructorChange = (index, field, value) => {
        const newInstructors = [...config.instructors];
        newInstructors[index][field] = value;
        setConfig({ ...config, instructors: newInstructors });
    };

    const addInstructor = () => {
        setConfig({
            ...config,
            instructors: [...config.instructors, { name: '', hours: 0 }]
        });
    };

    const removeInstructor = (index) => {
        const newInstructors = config.instructors.filter((_, i) => i !== index);
        setConfig({ ...config, instructors: newInstructors });
    };

    // --- PLANS MANAGEMENT ---
    const handlePlanChange = (index, field, value) => {
        const newPlans = [...config.plans];
        newPlans[index][field] = value;
        setConfig({ ...config, plans: newPlans });
    };

    const addPlan = () => {
        setConfig({
            ...config,
            plans: [...config.plans, { name: '', cost: 0, type: 'Individual' }]
        });
    };

    const removePlan = (index) => {
        const newPlans = config.plans.filter((_, i) => i !== index);
        setConfig({ ...config, plans: newPlans });
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(value);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="text-center flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Panel de Reparto</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save size={20} />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Ganancia Bruta Mensual</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                            <input
                                type="number"
                                className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={config.grossProfit}
                                onChange={(e) => setConfig({ ...config, grossProfit: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Caja Ahorros Academia</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                            <input
                                type="number"
                                className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={config.academySavingsBox}
                                onChange={(e) => setConfig({ ...config, academySavingsBox: Number(e.target.value) })}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-700 mb-4">Horas Base Mensuales</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Horas {partner1Name}</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={config.fedeHours}
                                    onChange={(e) => setConfig({ ...config, fedeHours: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Horas {partner2Name}</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={config.gonzaHours}
                                    onChange={(e) => setConfig({ ...config, gonzaHours: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-700 mb-4">Días Libres (Reducen pago)</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Días Libres {partner1Name}</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={config.fedeDaysOff}
                                    onChange={(e) => setConfig({ ...config, fedeDaysOff: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Días Libres {partner2Name}</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={config.gonzaDaysOff}
                                    onChange={(e) => setConfig({ ...config, gonzaDaysOff: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-bold text-blue-600 uppercase flex items-center gap-1.5">
                                <PiggyBank size={16} className="text-blue-500" />
                                Ahorros Academia
                            </p>
                            {results.savingsStatus === 'complete' && (
                                <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700 font-semibold">
                                    10% Completo
                                </span>
                            )}
                            {results.savingsStatus === 'partial' && (
                                <span className="text-xs bg-amber-100 px-2 py-1 rounded text-amber-700 font-semibold">
                                    Ahorro Parcial
                                </span>
                            )}
                            {results.savingsStatus === 'taken' && results.academySavingsTaken > 0 && (
                                <span className="text-xs bg-red-100 px-2 py-1 rounded text-red-700 font-semibold">
                                    Tomado de Ahorros
                                </span>
                            )}
                            {results.savingsStatus === 'taken' && results.academySavingsTaken === 0 && (
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-semibold">
                                    Sin Ahorro
                                </span>
                            )}
                        </div>
                        <p className={`text-4xl font-bold mb-4 ${results.academySavingsNet < 0 ? 'text-red-700' : 'text-blue-900'}`}>
                            {results.academySavingsNet >= 0 ? '+' : ''}{formatCurrency(results.academySavingsNet)}
                        </p>
                    </div>
                    <div className="space-y-1 text-sm text-blue-700/80 border-t border-blue-200/60 pt-3 mt-auto">
                        <div className="flex justify-between">
                            <span>Ganancia Bruta:</span>
                            <span className="font-medium text-blue-950">{formatCurrency(config.grossProfit)}</span>
                        </div>
                        {results.academySavingsAdded > 0 && (
                            <div className="flex justify-between">
                                <span>Ahorro del Mes:</span>
                                <span className="font-medium text-blue-950">{formatCurrency(results.academySavingsAdded)}</span>
                            </div>
                        )}
                        {results.academySavingsTaken > 0 && (
                            <div className="flex justify-between text-red-700 font-semibold">
                                <span>Tomado de Caja:</span>
                                <span>{formatCurrency(results.academySavingsTaken)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-blue-200/30 pt-1 mt-1">
                            <span>Caja Inicial:</span>
                            <span className="font-medium text-blue-950">{formatCurrency(config.academySavingsBox)}</span>
                        </div>
                        <div className="flex justify-between border-t border-blue-200/50 pt-1 mt-1 font-bold">
                            <span>Caja Actualizada:</span>
                            <span className="text-blue-950">{formatCurrency(results.academySavingsBoxUpdated)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-bold text-slate-400 uppercase">{partner1Name}</p>
                        <div className="flex gap-2">
                            {results.paymentStatus === 'proportional' ? (
                                <span className="text-xs bg-amber-100 px-2 py-1 rounded text-amber-700 font-semibold">
                                    Proporcional
                                </span>
                            ) : results.academySavingsTaken > 0 ? (
                                <span className="text-xs bg-emerald-100 px-2 py-1 rounded text-emerald-700 font-semibold">
                                    Completo (Ahorros)
                                </span>
                            ) : (
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                                    Completo
                                </span>
                            )}
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                                Neto: {(Number(config.fedeHours) * ((26 - Number(config.fedeDaysOff)) / 26)).toFixed(1)}h
                            </span>
                        </div>
                    </div>
                    <p className="text-4xl font-bold text-slate-800 mb-4">{formatCurrency(results.fedeAmount)}</p>
                    <div className="space-y-1 text-sm text-slate-500 border-t border-slate-100 pt-3">
                        <div className="flex justify-between">
                            <span>Pago por horas ($1000/h):</span>
                            <span className="font-medium text-slate-700">{formatCurrency(results.hourlyPaymentFede)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Utilidad (50%):</span>
                            <span className="font-medium text-slate-700">{formatCurrency(results.utilityFede)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-bold text-slate-400 uppercase">{partner2Name}</p>
                        <div className="flex gap-2">
                            {results.paymentStatus === 'proportional' ? (
                                <span className="text-xs bg-amber-100 px-2 py-1 rounded text-amber-700 font-semibold">
                                    Proporcional
                                </span>
                            ) : results.academySavingsTaken > 0 ? (
                                <span className="text-xs bg-emerald-100 px-2 py-1 rounded text-emerald-700 font-semibold">
                                    Completo (Ahorros)
                                </span>
                            ) : (
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                                    Completo
                                </span>
                            )}
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                                Neto: {(Number(config.gonzaHours) * ((26 - Number(config.gonzaDaysOff)) / 26)).toFixed(1)}h
                            </span>
                        </div>
                    </div>
                    <p className="text-4xl font-bold text-slate-800 mb-4">{formatCurrency(results.gonzaAmount)}</p>
                    <div className="space-y-1 text-sm text-slate-500 border-t border-slate-100 pt-3">
                        <div className="flex justify-between">
                            <span>Pago por horas ($1000/h):</span>
                            <span className="font-medium text-slate-700">{formatCurrency(results.hourlyPaymentGonza)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Utilidad (50%):</span>
                            <span className="font-medium text-slate-700">{formatCurrency(results.utilityGonza)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plans Management Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-700">Planes de Membresía</h3>
                    <button onClick={addPlan} className="text-sm text-blue-600 font-bold hover:underline">
                        + Agregar Plan
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-sm uppercase">
                            <tr>
                                <th className="px-6 py-3 rounded-l-lg">Nombre del Plan</th>
                                <th className="px-6 py-3">Costo Mensual</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3 rounded-r-lg"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {config.plans.map((plan, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            className="w-full border-b border-slate-200 focus:border-blue-500 outline-none py-1"
                                            value={plan.name}
                                            onChange={(e) => handlePlanChange(index, 'name', e.target.value)}
                                            placeholder="Ej: Plan Mensual"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="relative">
                                            <span className="absolute left-0 top-1 text-slate-400">$</span>
                                            <input
                                                type="number"
                                                className="w-full pl-4 border-b border-slate-200 focus:border-blue-500 outline-none py-1"
                                                value={plan.cost}
                                                onChange={(e) => handlePlanChange(index, 'cost', Number(e.target.value))}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            className="w-full border-b border-slate-200 focus:border-blue-500 outline-none py-1 bg-transparent"
                                            value={plan.type}
                                            onChange={(e) => handlePlanChange(index, 'type', e.target.value)}
                                        >
                                            <option value="Individual">Individual</option>
                                            <option value="Familiar">Familiar</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => removePlan(index)}
                                            className="text-red-400 hover:text-red-600 text-sm font-bold"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {config.plans.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-6 text-slate-400">
                                        No hay planes configurados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payments to Instructors Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-700">Pago a Instructores (Externos)</h3>
                    <button onClick={addInstructor} className="text-sm text-blue-600 font-bold hover:underline">
                        + Agregar Instructor
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-sm uppercase">
                            <tr>
                                <th className="px-6 py-3 rounded-l-lg">Nombre</th>
                                <th className="px-6 py-3">Horas</th>
                                <th className="px-6 py-3">Total a Pagar</th>
                                <th className="px-6 py-3 rounded-r-lg"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {config.instructors.map((instructor, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            className="w-full border-b border-slate-200 focus:border-blue-500 outline-none py-1"
                                            value={instructor.name}
                                            onChange={(e) => handleInstructorChange(index, 'name', e.target.value)}
                                            placeholder="Nombre"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            className="w-24 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                            value={instructor.hours}
                                            onChange={(e) => handleInstructorChange(index, 'hours', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-bold text-green-600">
                                        {formatCurrency(instructor.hours * 500)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => removeInstructor(index)}
                                            className="text-red-400 hover:text-red-600 text-sm font-bold"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {config.instructors.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-6 text-slate-400">
                                        No hay instructores configurados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="border-t border-slate-200">
                            <tr>
                                <td colSpan="2" className="px-6 py-4 text-right font-bold text-slate-700">Total Instructores:</td>
                                <td className="px-6 py-4 font-bold text-xl text-green-600">
                                    {formatCurrency(config.instructors.reduce((acc, curr) => acc + (curr.hours * 500), 0))}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default Admin;
