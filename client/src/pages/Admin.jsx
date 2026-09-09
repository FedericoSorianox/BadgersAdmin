import { useState, useEffect, useCallback } from 'react';
import { Save, Calculator, PiggyBank, Plus, Trash2, Users } from 'lucide-react';
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
        partnerResults: [],        // Array of { name, hourlyPayment, utility, total, effectiveHours }
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

                setConfig(prev => ({
                    ...prev,
                    partners: settings.partners || [],
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
            await axios.post(`${API_URL}/api/settings`, {
                partners: config.partners,
                partnerHourlyRate: config.partnerHourlyRate,
                instructors: config.instructors,
                instructorHourlyRate: config.instructorHourlyRate,
                plans: config.plans,
                academySavingsBox: updatedSavingsBox,
                savingsPercentage: config.savingsPercentage
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

    // --- PARTNER MANAGEMENT ---
    const handlePartnerChange = (index, field, value) => {
        const newPartners = [...config.partners];
        newPartners[index] = { ...newPartners[index], [field]: value };
        setConfig({ ...config, partners: newPartners });
    };

    const addPartner = () => {
        setConfig({
            ...config,
            partners: [...config.partners, { name: '', hours: 0, daysOff: 0 }]
        });
    };

    const removePartner = (index) => {
        const newPartners = config.partners.filter((_, i) => i !== index);
        setConfig({ ...config, partners: newPartners });
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

                {/* Dynamic Partners Section */}
                <div className="border-t border-slate-100 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <Users size={20} />
                            Socios / Dueños
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-600">Tarifa/hora:</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1.5 text-slate-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        className="w-24 pl-6 pr-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={config.partnerHourlyRate}
                                        onChange={(e) => setConfig({ ...config, partnerHourlyRate: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={addPartner}
                                className="flex items-center gap-1 text-sm text-blue-600 font-bold hover:underline"
                                aria-label="Agregar socio"
                            >
                                <Plus size={16} /> Agregar Socio
                            </button>
                        </div>
                    </div>

                    {config.partners.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Users size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No hay socios configurados. Agregue al menos un socio para calcular el reparto.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {config.partners.map((partner, index) => (
                                <div key={index} className="bg-slate-50 rounded-xl p-4 space-y-3 relative group">
                                    <button
                                        onClick={() => removePartner(index)}
                                        className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label={`Eliminar socio ${partner.name || index + 1}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <input
                                        type="text"
                                        placeholder="Nombre del socio"
                                        className="w-full bg-white px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={partner.name}
                                        onChange={(e) => handlePartnerChange(index, 'name', e.target.value)}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Horas Base</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={partner.hours}
                                                onChange={(e) => handlePartnerChange(index, 'hours', Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Días Libres</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={partner.daysOff}
                                                onChange={(e) => handlePartnerChange(index, 'daysOff', Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Results Cards */}
            <div className={`grid grid-cols-1 gap-6 ${results.partnerResults.length > 0 ? `md:grid-cols-${Math.min(results.partnerResults.length + 1, 4)}` : 'md:grid-cols-1'}`} style={{ gridTemplateColumns: `repeat(${Math.min(results.partnerResults.length + 1, 4)}, minmax(0, 1fr))` }}>
                {/* Savings Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-bold text-blue-600 uppercase flex items-center gap-1.5">
                                <PiggyBank size={16} className="text-blue-500" />
                                Ahorros Academia
                            </p>
                            {results.savingsStatus === 'complete' && (
                                <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700 font-semibold">
                                    {config.savingsPercentage}% Completo
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
                            <span>Resultado Operativo:</span>
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

                {/* Dynamic Partner Cards */}
                {results.partnerResults.map((partner, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-bold text-slate-400 uppercase">{partner.name || `Socio ${index + 1}`}</p>
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
                                    Neto: {partner.effectiveHours.toFixed(1)}h
                                </span>
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-slate-800 mb-4">{formatCurrency(partner.total)}</p>
                        <div className="space-y-1 text-sm text-slate-500 border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                                <span>Pago por horas ({formatCurrency(config.partnerHourlyRate)}/h):</span>
                                <span className="font-medium text-slate-700">{formatCurrency(partner.hourlyPayment)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Utilidad ({config.partners.length > 0 ? Math.round(100 / config.partners.length) : 0}%):</span>
                                <span className="font-medium text-slate-700">{formatCurrency(partner.utility)}</span>
                            </div>
                        </div>
                    </div>
                ))}
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
