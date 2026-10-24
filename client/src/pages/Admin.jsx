import { useState, useEffect, useCallback } from 'react';
import { Save, PiggyBank } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { useTenant } from '../context/TenantContext';
import { calculatePartnerDistribution } from '../utils/financeCalc';

const Admin = () => {
    const { formatCurrency } = useTenant();

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [config, setConfig] = useState({
        grossProfit: 0,
        partners: [],
        partnerHourlyRate: 1000,
        instructors: [],
        instructorHourlyRate: 500,
        plans: [],
        academySavingsBox: 0,
        savingsPercentage: 10
    });

    const [results, setResults] = useState({
        partnerResults: [],        // Array of { name, percentage, effectivePercentage, total, distributableNet }
        distributableNet: 0,
        academySavingsAdded: 0,
        academySavingsTaken: 0,
        academySavingsNet: 0,
        academySavingsBoxUpdated: 0,
        savingsStatus: 'complete',
        paymentStatus: 'complete'
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

                const rawPartners = settings.partners && settings.partners.length > 0
                    ? settings.partners
                    : [
                        { name: 'Fede', percentage: 70, hours: 40, daysOff: 0 },
                        { name: 'Gonza / Andy', percentage: 30, hours: 16, daysOff: 0 }
                    ];

                const loadedPartners = rawPartners.map(p => ({
                    ...p,
                    name: p.name === 'Gonza' ? 'Gonza / Andy' : p.name,
                    percentage: (p.percentage !== undefined && p.percentage !== null && p.percentage !== '' && !isNaN(Number(p.percentage)))
                        ? Number(p.percentage)
                        : (/fede/i.test(p.name) ? 70 : (/gonza|andy/i.test(p.name) ? 30 : 50))
                }));

                setConfig(prev => ({
                    ...prev,
                    partners: loadedPartners,
                    partnerHourlyRate: settings.partnerHourlyRate ?? 1000,
                    instructors: settings.instructors || [],
                    instructorHourlyRate: settings.instructorHourlyRate ?? 500,
                    plans: settings.plans || [],
                    academySavingsBox: settings.academySavingsBox ?? 0,
                    savingsPercentage: settings.savingsPercentage ?? 10
                }));
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [currentMonth, currentYear]);

    const handleCalculate = useCallback(() => {
        const results = calculatePartnerDistribution(config);
        setResults(results);
    }, [config]);

    // Calculate automatically when inputs change
    useEffect(() => {
        handleCalculate();
    }, [handleCalculate]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const updatedSavingsBox = results.academySavingsBoxUpdated !== undefined ? results.academySavingsBoxUpdated : config.academySavingsBox;
            const partnersToSave = (config.partners && config.partners.length > 0
                ? config.partners
                : [
                    { name: 'Fede', percentage: 70, hours: 40, daysOff: 0 },
                    { name: 'Gonza / Andy', percentage: 30, hours: 16, daysOff: 0 }
                ]).map(p => ({
                    ...p,
                    percentage: p.percentage === '' ? 0 : (Number(p.percentage) || 0)
                }));

            await axios.post(`${API_URL}/api/settings`, {
                partners: partnersToSave,
                partnerHourlyRate: config.partnerHourlyRate,
                instructors: config.instructors,
                instructorHourlyRate: config.instructorHourlyRate,
                plans: config.plans,
                academySavingsBox: updatedSavingsBox,
                savingsPercentage: config.savingsPercentage
            });
            setConfig(prev => ({
                ...prev,
                partners: partnersToSave,
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

    // --- PARTNER PERCENTAGE MANAGEMENT ---
    const handlePartnerPercentageChange = (index, value) => {
        const basePartners = config.partners && config.partners.length > 0
            ? config.partners
            : (results.partnerResults && results.partnerResults.length > 0
                ? results.partnerResults.map(p => ({
                    name: p.name,
                    percentage: p.percentage,
                    hours: p.effectiveHours || 0,
                    daysOff: 0
                }))
                : [
                    { name: 'Fede', percentage: 70, hours: 40, daysOff: 0 },
                    { name: 'Gonza / Andy', percentage: 30, hours: 16, daysOff: 0 }
                ]);

        const newPartners = basePartners.map((p, i) => {
            if (i === index) {
                const parsedVal = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
                return {
                    ...p,
                    percentage: parsedVal
                };
            }
            return { ...p };
        });

        setConfig(prev => ({
            ...prev,
            partners: newPartners
        }));
    };

    const handleResetDefaultPercentages = () => {
        const basePartners = config.partners && config.partners.length > 0
            ? config.partners
            : [
                { name: 'Fede', percentage: 70, hours: 40, daysOff: 0 },
                { name: 'Gonza / Andy', percentage: 30, hours: 16, daysOff: 0 }
            ];

        const resetPartners = basePartners.map(p => ({
            ...p,
            percentage: /fede/i.test(p.name) ? 70 : (/gonza|andy/i.test(p.name) ? 30 : 50)
        }));

        setConfig(prev => ({ ...prev, partners: resetPartners }));
    };

    // --- INSTRUCTOR MANAGEMENT ---
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

    return (
        <div className="space-y-6 pb-20">
            <div className="text-center flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Panel de Reparto</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                    aria-label="Guardar configuración"
                >
                    <Save size={20} />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Resultado Operativo Neto</label>
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
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Ahorro ({config.savingsPercentage}%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={config.savingsPercentage}
                            onChange={(e) => setConfig({ ...config, savingsPercentage: Number(e.target.value) })}
                        />
                    </div>
                </div>
            </div>

            {/* Distribution Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Distribución de Ganancias</h2>
                    <p className="text-sm text-slate-500">Reparto operativo del mes entre la academia y los socios dueños.</p>
                </div>
                {results.partnerResults.length > 0 && (() => {
                    const totalPct = results.partnerResults.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
                    const isExact100 = Math.round(totalPct) === 100;
                    return (
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                                isExact100
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                {isExact100 
                                    ? `✓ Reparto Socios: ${totalPct}%` 
                                    : totalPct < 100 
                                        ? `⚠ Reparto Socios: ${totalPct}% (Falta ${100 - totalPct}%)` 
                                        : `⚠ Reparto Socios: ${totalPct}% (Excede por ${totalPct - 100}%)`
                                }
                            </span>
                            <button
                                type="button"
                                onClick={handleResetDefaultPercentages}
                                className="text-xs text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors shadow-sm"
                                title="Restablecer reparto predeterminado (70/30)"
                            >
                                Restablecer 70/30
                            </button>
                        </div>
                    );
                })()}
            </div>

            {/* Results Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Savings Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-bold text-blue-600 uppercase flex items-center gap-1.5">
                                <PiggyBank size={16} className="text-blue-500" />
                                Ahorros Academia
                            </p>
                            {results.savingsStatus === 'complete' && config.savingsPercentage > 0 && (
                                <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700 font-semibold">
                                    {config.savingsPercentage}% Completo
                                </span>
                            )}
                            {config.savingsPercentage === 0 && (
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-semibold">
                                    0% Ahorro
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
                        </div>
                        <p className={`text-4xl font-bold mb-4 ${results.academySavingsNet < 0 ? 'text-red-700' : 'text-blue-900'}`}>
                            {results.academySavingsNet >= 0 ? '+' : ''}{formatCurrency(results.academySavingsNet)}
                        </p>
                    </div>
                    <div className="space-y-1 text-sm text-blue-700/80 border-t border-blue-200/60 pt-3 mt-auto">
                        <div className="flex justify-between">
                            <span>Resultado Operativo:</span>
                            <span className="font-medium text-blue-950">{formatCurrency(config.grossProfit)}</span>
                        </div>
                        {results.academySavingsAdded > 0 && (
                            <div className="flex justify-between">
                                <span>Ahorro del Mes ({config.savingsPercentage}%):</span>
                                <span className="font-medium text-blue-950">+{formatCurrency(results.academySavingsAdded)}</span>
                            </div>
                        )}
                        {results.academySavingsTaken > 0 && (
                            <div className="flex justify-between text-red-700 font-semibold">
                                <span>Tomado de Caja:</span>
                                <span>-{formatCurrency(results.academySavingsTaken)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-blue-200/40 pt-1 mt-1 font-semibold text-blue-950">
                            <span>Base de Reparto:</span>
                            <span className="text-blue-950 font-bold">{formatCurrency(results.distributableNet)}</span>
                        </div>
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

                {/* Dynamic Partner Cards */}
                {results.partnerResults.map((partner, index) => {
                    const isFede = /fede/i.test(partner.name);
                    const partnerConfig = config.partners[index] || {};
                    const currentPercentage = partnerConfig.percentage !== undefined ? partnerConfig.percentage : (partner.percentage ?? '');

                    return (
                        <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-slate-200 transition-all">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm font-bold text-slate-700 uppercase flex items-center gap-1.5 tracking-wide">
                                        <span className="text-base">{isFede ? '🔵' : '🟢'}</span>
                                        {partner.name || `Socio ${index + 1}`}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
                                            {currentPercentage !== '' ? `${currentPercentage}%` : '0%'}
                                        </span>
                                        <span className="text-xs bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-600 font-semibold">
                                            Socio Dueño
                                        </span>
                                    </div>
                                </div>

                                {/* Editable % de Reparto Control */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <label
                                            htmlFor={`partner-pct-${index}`}
                                            className="text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer"
                                        >
                                            % de Reparto
                                        </label>
                                        <div className="relative inline-flex items-center">
                                            <input
                                                id={`partner-pct-${index}`}
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="any"
                                                className="w-20 pl-2 pr-6 py-1 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm"
                                                value={currentPercentage}
                                                onChange={(e) => handlePartnerPercentageChange(index, e.target.value)}
                                                disabled={loading}
                                                aria-label={`Porcentaje de reparto para ${partner.name}`}
                                            />
                                            <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Total a Recibir</p>
                                    <p className="text-4xl font-extrabold text-slate-800 tracking-tight">
                                        {formatCurrency(partner.total)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-sm text-slate-500 border-t border-slate-100 pt-3 mt-auto">
                                <div className="flex justify-between">
                                    <span>Base de Reparto:</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(results.distributableNet)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Porcentaje Asignado:</span>
                                    <span className="font-semibold text-blue-600">
                                        {partner.percentage}%
                                        {partner.effectivePercentage !== partner.percentage && (
                                            <span className="text-xs text-slate-400 ml-1 font-normal">
                                                (efectivo: {partner.effectivePercentage}%)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1 font-bold">
                                    <span className="text-slate-800">Total a Recibir:</span>
                                    <span className="text-emerald-600 text-base">{formatCurrency(partner.total)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
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
                                            aria-label={`Eliminar plan ${plan.name}`}
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
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600">Tarifa/hora:</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span>
                                <input
                                    type="number"
                                    className="w-24 pl-6 pr-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={config.instructorHourlyRate}
                                    onChange={(e) => setConfig({ ...config, instructorHourlyRate: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <button onClick={addInstructor} className="text-sm text-blue-600 font-bold hover:underline">
                            + Agregar Instructor
                        </button>
                    </div>
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
                                        {formatCurrency(instructor.hours * config.instructorHourlyRate)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => removeInstructor(index)}
                                            className="text-red-400 hover:text-red-600 text-sm font-bold"
                                            aria-label={`Eliminar instructor ${instructor.name}`}
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
                                    {formatCurrency(config.instructors.reduce((acc, curr) => acc + (curr.hours * config.instructorHourlyRate), 0))}
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
