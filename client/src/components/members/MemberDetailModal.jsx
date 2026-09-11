import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { Edit2, Share2, Check, X, Calendar } from 'lucide-react';
import { API_URL } from '../../config';
import axios from 'axios';
import { toast } from 'sonner';

const MemberDetailModal = ({ isOpen, onClose, member, onEdit, onUpdateLocalMember }) => {
    const [isEditingJoinDate, setIsEditingJoinDate] = useState(false);
    const [tempJoinDate, setTempJoinDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (member) {
            setTempJoinDate(member.joinDate ? new Date(member.joinDate).toISOString().split('T')[0] : (member.createdAt ? new Date(member.createdAt).toISOString().split('T')[0] : ''));
            setIsEditingJoinDate(false);
        }
    }, [member, isOpen]);

    const handleSaveJoinDate = async () => {
        try {
            setIsSaving(true);
            const res = await axios.put(`${API_URL}/api/members/${member._id}`, { joinDate: tempJoinDate });
            if (onUpdateLocalMember) {
                onUpdateLocalMember(res.data);
            }
            setIsEditingJoinDate(false);
            toast.success('Fecha de ingreso actualizada');
        } catch (error) {
            console.error("Error updating join date", error);
            toast.error("Error al actualizar la fecha");
        } finally {
            setIsSaving(false);
        }
    };
    const formatDuration = (months) => {
        if (months <= 0) return '0 meses';
        const y = Math.floor(months / 12);
        const m = Math.floor(months % 12);
        if (y === 0) return `${m} ${m === 1 ? 'mes' : 'meses'}`;
        if (m === 0) return `${y} ${y === 1 ? 'año' : 'años'}`;
        return `${y} ${y === 1 ? 'año' : 'años'} y ${m} ${m === 1 ? 'mes' : 'meses'}`;
    };

    const calculateTrainingTime = (memberData) => {
        if (!memberData || (!memberData.joinDate && !memberData.createdAt)) return 'Desconocido';
        
        const joinDate = new Date(memberData.joinDate || memberData.createdAt);
        const now = new Date();
        
        // If no statusHistory, fallback to simple total time
        if (!memberData.statusHistory || memberData.statusHistory.length === 0) {
            let totalMonths = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
            if (now.getDate() < joinDate.getDate()) totalMonths--;
            
            if (totalMonths <= 0) return 'Menos de 1 mes';
            return formatDuration(totalMonths) + " en total";
        }

        // Sort history by date ascending
        const history = [...memberData.statusHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let activeMonths = 0;
        let inactiveMonths = 0;
        
        let lastDate = joinDate;
        let currentStatus = true; // Assumes they were active when they joined
        
        for (const entry of history) {
            const entryDate = new Date(entry.date);
            let monthsDiff = (entryDate.getFullYear() - lastDate.getFullYear()) * 12 + (entryDate.getMonth() - lastDate.getMonth());
            if (entryDate.getDate() < lastDate.getDate()) monthsDiff--;
            monthsDiff = Math.max(0, monthsDiff);
            
            if (currentStatus) {
                activeMonths += monthsDiff;
            } else {
                inactiveMonths += monthsDiff;
            }
            
            currentStatus = entry.status;
            lastDate = entryDate;
        }
        
        // Add remaining time from the last event to now
        let remainingMonths = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth());
        if (now.getDate() < lastDate.getDate()) remainingMonths--;
        remainingMonths = Math.max(0, remainingMonths);
        
        if (currentStatus) {
            activeMonths += remainingMonths;
        } else {
            inactiveMonths += remainingMonths;
        }
        
        if (activeMonths === 0 && inactiveMonths === 0) return 'Menos de 1 mes';
        
        const activeStr = activeMonths > 0 ? `${formatDuration(activeMonths)} activo` : '';
        const inactiveStr = inactiveMonths > 0 ? `${formatDuration(inactiveMonths)} inactivo` : '';
        
        if (activeStr && inactiveStr) return `${activeStr}, ${inactiveStr}`;
        return activeStr || inactiveStr || 'Menos de 1 mes';
    };
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalles del Socio"
        >
            {member && (
                <div className="space-y-6">
                    <div className="flex justify-center">
                        <div className="h-40 w-40 rounded-full overflow-hidden border-4 border-slate-100 shadow-lg">
                            {member.photoUrl ? (
                                <img
                                    src={`${member.photoUrl.startsWith('http') ? member.photoUrl : API_URL + member.photoUrl}`}
                                    alt={member.fullName}
                                    className="h-full w-full object-cover"
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400 text-4xl font-bold">
                                    {member.fullName?.charAt(0) || '?'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-800 break-words line-clamp-2">{member.fullName}</h2>
                        <p className="text-slate-500 font-medium">{member.active ? 'Socio Activo' : 'Socio Inactivo'}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Cédula</p>
                            <p className="font-mono text-slate-700 font-medium">{member.ci}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Teléfono</p>
                            <p className="font-mono text-slate-700 font-medium">{member.phone || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Plan</p>
                            <p className="text-slate-700 font-medium">{member.planType || 'Estándar'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Costo</p>
                            <p className="text-green-600 font-bold font-mono">
                                {member.isExempt ? <span className="text-orange-600">Exento</span> : `$${member.planCost}`}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Fecha de Nacimiento</p>
                            <p className="text-slate-700 font-medium">
                                {member.birthDate
                                    ? new Date(member.birthDate).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
                                    : '-'
                                }
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2">
                                Tiempo Entrenando
                                {!isEditingJoinDate && (
                                    <button 
                                        onClick={() => setIsEditingJoinDate(true)}
                                        className="text-blue-500 hover:text-blue-700 p-0.5 rounded transition-colors"
                                        title="Editar fecha de ingreso"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                )}
                            </p>
                            {isEditingJoinDate ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <input 
                                        type="date"
                                        className="text-sm px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                                        value={tempJoinDate}
                                        onChange={(e) => setTempJoinDate(e.target.value)}
                                        disabled={isSaving}
                                    />
                                    <button 
                                        onClick={handleSaveJoinDate}
                                        disabled={isSaving}
                                        className="p-1 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingJoinDate(false)}
                                        disabled={isSaving}
                                        className="p-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-slate-700 font-medium">
                                    {calculateTrainingTime(member)}
                                    <span className="text-[10px] text-slate-400 font-normal mt-0.5 flex items-center gap-1">
                                        <Calendar size={10} />
                                        Ingresó: {new Date(member.joinDate || member.createdAt).toLocaleDateString('es-UY', { timeZone: 'UTC' })}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Comentarios</p>
                            <p className="text-slate-700 font-medium whitespace-pre-wrap">{member.comments || '-'}</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-blue-800">
                            <Share2 size={18} />
                            <p className="text-sm font-bold uppercase tracking-wider italic">Link de Ficha Pública</p>
                        </div>
                        <p className="text-xs text-blue-600">Comparte este link con el socio para que vea su estado de cuenta.</p>
                        <div className="flex gap-2">
                            <input 
                                readOnly
                                type="text" 
                                className="flex-1 text-[10px] px-2 py-1.5 bg-white border border-blue-200 rounded text-blue-800 font-mono"
                                value={`${window.location.origin}/public/profile/${member._id}`}
                            />
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/public/profile/${member._id}`);
                                    alert('Link copiado al portapapeles');
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors"
                            >
                                Copiar Link
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                onEdit(member);
                                onClose();
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                        >
                            <Edit2 size={18} />
                            Editar Información
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default MemberDetailModal;
