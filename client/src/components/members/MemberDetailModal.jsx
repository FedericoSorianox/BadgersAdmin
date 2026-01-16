import React from 'react';
import Modal from '../Modal';
import { Edit2 } from 'lucide-react';
import { API_URL } from '../../config';

const MemberDetailModal = ({ isOpen, onClose, member, onEdit }) => {
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
                                    ? new Date(member.birthDate).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
                                    : '-'
                                }
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Comentarios</p>
                            <p className="text-slate-700 font-medium whitespace-pre-wrap">{member.comments || '-'}</p>
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
