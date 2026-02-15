import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { API_URL } from '../../config';

const MemberFormModal = ({ isOpen, onClose, onSubmit, initialData, plans = [], members = [] }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        ci: '',
        phone: '',
        planType: '',
        planCost: 0,
        birthDate: '',
        comments: '',
        active: true,
        isInWhatsappGroup: false,
        photoUrl: '',
        isExempt: false,
        familyId: '',
        isFamilyHead: false
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    fullName: initialData.fullName || '',
                    ci: initialData.ci || '',
                    phone: initialData.phone || '',
                    planType: initialData.planType || '',
                    planCost: initialData.planCost || 0,
                    birthDate: initialData.birthDate ? new Date(initialData.birthDate).toISOString().split('T')[0] : '',
                    comments: initialData.comments || '',
                    active: initialData.active !== undefined ? initialData.active : true,
                    isInWhatsappGroup: initialData.isInWhatsappGroup || false,
                    photoUrl: initialData.photoUrl || '',
                    isExempt: initialData.isExempt || false,
                    familyId: initialData.familyId || '',
                    isFamilyHead: initialData.isFamilyHead || false
                });
                setImagePreview(initialData.photoUrl ? (initialData.photoUrl.startsWith('http') ? initialData.photoUrl : `${API_URL}${initialData.photoUrl}`) : null);
            } else {
                setFormData({
                    fullName: '',
                    ci: '',
                    phone: '',
                    planType: plans.length > 0 ? plans[0].name : '',
                    planCost: plans.length > 0 ? plans[0].cost : 0,
                    birthDate: '',
                    comments: '',
                    active: true,
                    isInWhatsappGroup: false,
                    photoUrl: '',
                    isExempt: false,
                    familyId: '',
                    isFamilyHead: false
                });
                setImagePreview(null);
            }
            setImageFile(null);
        }
    }, [isOpen, initialData, plans]);

    const handlePlanChange = (e) => {
        const selectedPlanName = e.target.value;
        const selectedPlan = plans.find(p => p.name === selectedPlanName);

        if (selectedPlan) {
            setFormData(prev => ({
                ...prev,
                planType: selectedPlanName,
                planCost: selectedPlan.cost,
                isFamilyHead: selectedPlan.type === 'Familiar', // Default to head if family
                familyId: ''
            }));
        } else {
            setFormData(prev => ({ ...prev, planType: selectedPlanName }));
        }
    };

    const handleFamilyHeadChange = (e) => {
        const headId = e.target.value;
        if (headId === 'me') {
            const selectedPlan = plans.find(p => p.name === formData.planType);
            setFormData(prev => ({
                ...prev,
                isFamilyHead: true,
                familyId: '',
                planCost: selectedPlan ? selectedPlan.cost : prev.planCost
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                isFamilyHead: false,
                familyId: headId,
                planCost: 0
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formDataToSend = new FormData();
        formDataToSend.append('fullName', formData.fullName);
        formDataToSend.append('ci', formData.ci);
        formDataToSend.append('phone', formData.phone);
        formDataToSend.append('planType', formData.planType);
        formDataToSend.append('planCost', formData.planCost);
        formDataToSend.append('birthDate', formData.birthDate);
        formDataToSend.append('comments', formData.comments);
        formDataToSend.append('active', formData.active);
        formDataToSend.append('isInWhatsappGroup', formData.isInWhatsappGroup);
        formDataToSend.append('isExempt', formData.isExempt);
        formDataToSend.append('familyId', formData.familyId);
        formDataToSend.append('isFamilyHead', formData.isFamilyHead);

        if (imageFile) {
            formDataToSend.append('image', imageFile);
        }

        await onSubmit(formDataToSend);
    };

    const currentPlan = plans.find(p => p.name === formData.planType);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Socio" : "Agregar Nuevo Socio"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                    <input
                        required
                        type="text"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cédula (CI)</label>
                    <input
                        required
                        type="text"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.ci}
                        onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                        disabled={!!initialData}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Plan</label>
                        <select
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={formData.planType}
                            onChange={handlePlanChange}
                        >
                            <option value="">Seleccionar Plan</option>
                            {plans.map((plan, idx) => (
                                <option key={idx} value={plan.name}>{plan.name} - ${plan.cost}</option>
                            ))}
                            <option value="Otro">Otro / Personalizado</option>
                        </select>
                    </div>
                </div>

                {/* Family Plan Logic */}
                {currentPlan && currentPlan.type === 'Familiar' && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <label className="block text-sm font-medium text-blue-900 mb-2">Configuración Familiar</label>
                        <select
                            className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={formData.isFamilyHead ? 'me' : formData.familyId}
                            onChange={handleFamilyHeadChange}
                        >
                            <option value="me">Soy el Titular (Paga la cuota)</option>
                            {members
                                .filter(m => m.isFamilyHead && m._id !== initialData?._id) // Show other heads, exclude self
                                .map(m => (
                                    <option key={m._id} value={m._id}>
                                        Inluído en plan de: {m.fullName}
                                    </option>
                                ))
                            }
                        </select>
                        <p className="text-xs text-blue-600 mt-2">
                            {formData.isFamilyHead
                                ? "Este socio pagará el total del plan familiar."
                                : "Este socio NO paga cuota (cubierto por el titular)."}
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Costo Final ($)</label>
                    <input
                        type="number"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.planCost}
                        onChange={(e) => setFormData({ ...formData, planCost: Number(e.target.value) })}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.birthDate}
                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios</label>
                    <textarea
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        value={formData.comments}
                        onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    ></textarea>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foto del Socio</label>
                    <input
                        type="file"
                        accept="image/*"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                setImageFile(file);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setImagePreview(reader.result);
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                    />
                </div>

                {imagePreview && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vista Previa</label>
                        <div className="flex justify-center p-4 bg-slate-50 rounded-lg">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="h-32 w-32 object-cover rounded-full border-4 border-white shadow-lg"
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <input
                        type="checkbox"
                        id="activeCheckbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="activeCheckbox" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Socio Activo
                    </label>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <input
                        type="checkbox"
                        id="exemptCheckbox"
                        checked={formData.isExempt}
                        onChange={(e) => setFormData({ ...formData, isExempt: e.target.checked })}
                        className="w-4 h-4 text-orange-600 bg-white border-slate-300 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <label htmlFor="exemptCheckbox" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Exento de Cuota (Becado)
                    </label>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        style={{ backgroundColor: 'var(--btn-save, #2563eb)' }}
                        className="px-4 py-2 text-white hover:brightness-90 rounded-lg font-bold transition-all"
                    >
                        {initialData ? 'Guardar Cambios' : 'Crear Socio'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default MemberFormModal;
