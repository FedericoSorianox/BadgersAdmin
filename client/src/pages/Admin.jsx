import { useState, useEffect } from 'react';
import { Save, Calculator } from 'lucide-react';
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
        gonzaHours: 8,
        fedeDaysOff: 0,
        gonzaDaysOff: 0,
        instructors: []
    });

    const [results, setResults] = useState({
        fixedFede: 0,
        variableFede: 0,
        fedeAmount: 0,
        fixedGonza: 0,
        variableGonza: 0,
        gonzaAmount: 0
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
                    return (eDate.getMonth() + 1) === currentMonth && eDate.getFullYear() === currentYear;
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
                    fedeHours: settings.fedeHours,
                    gonzaHours: settings.gonzaHours,
                    fedeDaysOff: settings.fedeDaysOff,
                    gonzaDaysOff: settings.gonzaDaysOff,
                    instructors: settings.instructors || []
                }));
            } catch (error) {
                console.error('Error fetching settings:', error);
                // Keep defaults if settings fail (e.g. route not ready)
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const handleCalculate = () => {
        const workingDays = 26;

        // Effective hours calculation:
        // Adjust hours based on days worked vs max working days
        // Logic: If you engage for 40 hours (approx 1.5h/day), and miss 10 days
        // Effective = 40 * ((26 - 10) / 26)

        const effectiveFedeHours = Number(config.fedeHours) * ((workingDays - Number(config.fedeDaysOff)) / workingDays);
        const effectiveGonzaHours = Number(config.gonzaHours) * ((workingDays - Number(config.gonzaDaysOff)) / workingDays);

        const totalEffectiveHours = effectiveFedeHours + effectiveGonzaHours;
        const grossProfit = Number(config.grossProfit);

        if (totalEffectiveHours <= 0) return;

        // New distribution logic:
        // 50% split 50/50
        // 50% split by EFFECTIVE hours worked
        const fixedPortion = grossProfit * 0.50;
        const variablePortion = grossProfit * 0.50;

        const fixedFede = fixedPortion * 0.50;
        const fixedGonza = fixedPortion * 0.50;

        const variableFede = (variablePortion * effectiveFedeHours) / totalEffectiveHours;
        const variableGonza = (variablePortion * effectiveGonzaHours) / totalEffectiveHours;

        setResults({
            fixedFede,
            variableFede,
            fedeAmount: fixedFede + variableFede,
            fixedGonza,
            variableGonza,
            gonzaAmount: fixedGonza + variableGonza
        });
    };

    // Calculate automatically when inputs change
    useEffect(() => {
        handleCalculate();
    }, [config]);

    const handleSave = async () => {
        try {
            setSaving(true);
            await axios.post(`${API_URL}/api/settings`, {
                fedeHours: config.fedeHours,
                gonzaHours: config.gonzaHours,
                fedeDaysOff: config.fedeDaysOff,
                gonzaDaysOff: config.gonzaDaysOff,
                instructors: config.instructors
            });
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

                {/* Hidden formula info as requested */}

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-bold text-slate-400 uppercase">{partner1Name}</p>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                            Neto: {(Number(config.fedeHours) * ((26 - Number(config.fedeDaysOff)) / 26)).toFixed(1)}h
                        </span>
                    </div>
                    <p className="text-4xl font-bold text-slate-800 mb-4">{formatCurrency(results.fedeAmount)}</p>
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Parte fija:</span>
                            <span className="font-medium text-slate-800">{formatCurrency(results.fixedFede)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Por horas:</span>
                            <span className="font-medium text-slate-800">{formatCurrency(results.variableFede)}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-bold text-slate-400 uppercase">{partner2Name}</p>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                            Neto: {(Number(config.gonzaHours) * ((26 - Number(config.gonzaDaysOff)) / 26)).toFixed(1)}h
                        </span>
                    </div>
                    <p className="text-4xl font-bold text-slate-800 mb-4">{formatCurrency(results.gonzaAmount)}</p>
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Parte fija:</span>
                            <span className="font-medium text-slate-800">{formatCurrency(results.fixedGonza)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Por horas:</span>
                            <span className="font-medium text-slate-800">{formatCurrency(results.variableGonza)}</span>
                        </div>
                    </div>
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
