import React, { useState } from 'react';
import { X, CreditCard } from 'lucide-react';

const BulkPlanUpdateModal = ({ isOpen, onClose, onSubmit, plans, selectedCount }) => {
    const [selectedPlanName, setSelectedPlanName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedPlanName) return;

        const plan = plans.find(p => p.name === selectedPlanName);
        if (!plan) return;

        onSubmit(plan);
        setSelectedPlanName('');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard className="text-blue-500" />
                        Actualizar Plan ({selectedCount} socios)
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nuevo Plan de Membresía
                            </label>
                            <select
                                required
                                value={selectedPlanName}
                                onChange={(e) => setSelectedPlanName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50"
                            >
                                <option value="">Seleccionar plan</option>
                                {plans.map((plan, idx) => (
                                    <option key={idx} value={plan.name}>
                                        {plan.name} (${plan.cost})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkPlanUpdateModal;
