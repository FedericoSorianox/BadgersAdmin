import React from 'react';
import { Check, MessageCircle, Eye, Edit2, Trash2 } from 'lucide-react';

const MembersTable = ({
    members,
    onView,
    onEdit,
    onDelete,
    onToggleWhatsapp
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Socio</th>
                        <th className="px-6 py-4">Cédula</th>
                        <th className="px-6 py-4">WhatsApp</th>
                        <th className="px-6 py-4">Plan</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {members.map((member) => (
                        <tr key={member._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        onClick={() => onView(member)}
                                        className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                                    >
                                        {member.photoUrl ? (
                                            <img
                                                src={member.photoUrl}
                                                alt={member.fullName}
                                                className="h-full w-full object-cover"
                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold bg-slate-100">
                                                {member.fullName?.charAt(0) || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="font-medium text-slate-700">{member.fullName}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono">
                                {member.ci}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onToggleWhatsapp(member)}
                                        className={`p-2 rounded-full transition-colors ${member.isInWhatsappGroup
                                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                            }`}
                                        title={member.isInWhatsappGroup ? "En el grupo" : "Marcar como agregado al grupo"}
                                    >
                                        {member.isInWhatsappGroup ? <Check size={16} /> : <MessageCircle size={16} />}
                                    </button>
                                    {member.phone && (
                                        <a
                                            href={`https://wa.me/${member.phone.replace(/\D/g, '').startsWith('0') ? '598' + member.phone.replace(/\D/g, '').substring(1) : member.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 hover:text-green-600 transition-colors"
                                            title="Abrir Chat"
                                        >
                                            <MessageCircle size={18} />
                                        </a>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                                {member.planType || 'Estándar'}
                                <span className="text-xs text-green-600 font-bold ml-1">${member.planCost}</span>
                                {member.isFamilyHead && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200">
                                        Titular
                                    </span>
                                )}
                                {member.familyId && !member.isFamilyHead && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                                        Familiar
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${!member.active ? 'bg-red-100 text-red-700' :
                                    member.isExempt ? 'bg-blue-100 text-blue-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                    {!member.active ? 'Inactivo' : member.isExempt ? 'Exento' : 'Activo'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => onView(member)}
                                    className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-all mr-2"
                                    title="Ver Detalle"
                                >
                                    <Eye size={18} />
                                </button>
                                <button
                                    onClick={() => onEdit(member)}
                                    className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-all mr-2"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => onDelete(member._id)}
                                    className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MembersTable;
