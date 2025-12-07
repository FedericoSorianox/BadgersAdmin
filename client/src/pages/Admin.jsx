import { useState, useEffect } from 'react';
import { Save, Calculator } from 'lucide-react';
import axios from 'axios';

const Admin = () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [config, setConfig] = useState({
        grossProfit: 0,
        fedeHours: 40,
        gonzaHours: 8,
        fedeDaysOff: 0,
        gonzaDaysOff: 0
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

    // Fetch balance from Finances API
    useEffect(() => {
        const fetchBalance = async () => {
            try {
                setLoading(true);
                const [paymentsRes, expensesRes] = await Promise.all([
                    axios.get(`http://localhost:5001/api/finance`, {
                        params: { month: currentMonth, year: currentYear }
                    }),
                    axios.get(`http://localhost:5001/api/finance/expenses`)
                ]);

                // Calculate balance same way as in Finances.jsx
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
                console.error('Error fetching balance:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();
    }, []);

    const handleCalculate = () => {
        const totalHours = Number(config.fedeHours) + Number(config.gonzaHours);
        const grossProfit = Number(config.grossProfit);

        if (totalHours === 0) return;

        // New distribution logic:
        // 40% split 50/50
        // 60% split by hours worked
        const fixedPortion = grossProfit * 0.40;
        const variablePortion = grossProfit * 0.60;

        const fixedFede = fixedPortion * 0.50;
        const fixedGonza = fixedPortion * 0.50;

        const variableFede = (variablePortion * Number(config.fedeHours)) / totalHours;
        const variableGonza = (variablePortion * Number(config.gonzaHours)) / totalHours;

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

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU' }).format(value);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-800">Calculadora de Reparto para The Badgers</h1>
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
                    {loading && (
                        <p className="text-xs text-slate-500 mt-1">Cargando balance del mes...</p>
                    )}
                </div>

                <div className="border border-blue-100 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                    <strong>Nueva fórmula de reparto:</strong>
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                        <li>40% de las ganancias se divide 50/50 entre Fede y Gonza</li>
                        <li>60% de las ganancias se divide según horas trabajadas</li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Horas de Clase Mensuales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Horas Fede</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={config.fedeHours}
                                onChange={(e) => setConfig({ ...config, fedeHours: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Horas Gonza</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={config.gonzaHours}
                                onChange={(e) => setConfig({ ...config, gonzaHours: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Días Libres del Mes (máx. 26 días laborables)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Días Libres Fede</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={config.fedeDaysOff}
                                onChange={(e) => setConfig({ ...config, fedeDaysOff: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Días Libres Gonza</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={config.gonzaDaysOff}
                                onChange={(e) => setConfig({ ...config, gonzaDaysOff: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <button
                    className="w-full py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors flex justify-center items-center gap-2"
                    onClick={handleCalculate}
                >
                    <Calculator size={20} />
                    Calcular Reparto
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-bold text-slate-400 uppercase mb-2">FEDE ({config.fedeHours}H/MES)</p>
                    <p className="text-4xl font-bold text-slate-800 mb-4">{formatCurrency(results.fedeAmount)}</p>
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Parte fija :</span>
                            <span className="font-medium text-slate-800">{formatCurrency(results.fixedFede)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Por horas :</span>
                            <span className="font-medium text-slate-800">{formatCurrency(results.variableFede)}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-bold text-slate-400 uppercase mb-2">GONZA ({config.gonzaHours}H/MES)</p>
                    <p className="text-4xl font-bold text-slate-800 mb-4">{formatCurrency(results.gonzaAmount)}</p>
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Parte fija :</span>
                            <span className="font-medium text-slate-800">{formatCurrency(results.fixedGonza)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Por horas :</span>
                            <span className="font-medium text-slate-800">{formatCurrency(results.variableGonza)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;
