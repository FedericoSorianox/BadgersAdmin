

import { useState, useEffect } from 'react';
import { Loader2, UserPlus, BarChart2 } from 'lucide-react';
import axios from 'axios';
import ConfirmModal from '../components/ui/ConfirmModal';
import { toast } from 'sonner';
import { API_URL } from '../config';

// Imported Components
import MembersTable from '../components/members/MembersTable';
import MemberFilters from '../components/members/MemberFilters';
import MemberFormModal from '../components/members/MemberFormModal';
import MemberAnalyticsModal from '../components/members/MemberAnalyticsModal';
import MemberDetailModal from '../components/members/MemberDetailModal';

const Members = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterNotWhatsapp, setFilterNotWhatsapp] = useState(false);

    // Analytics State
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

    // Confirm Modal State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState(null);

    // Modal & Form State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);

    // View Member Details State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewMember, setViewMember] = useState(null);

    const [plans, setPlans] = useState([]);

    useEffect(() => {
        fetchMembers();
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/settings`);
            setPlans(response.data.plans || []);
        } catch (error) {
            console.error("Error fetching plans", error);
        }
    };

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/members`);
            setMembers(response.data);
        } catch (error) {
            console.error("Error fetching members", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (member = null) => {
        setEditingMember(member);
        setModalOpen(true);
    };

    const handleSubmit = async (formDataToSend) => {
        try {
            if (editingMember) {
                await axios.put(`${API_URL}/api/members/${editingMember._id}`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post(`${API_URL}/api/members`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setModalOpen(false);
            fetchMembers(); // Refresh list
            toast.success(editingMember ? 'Socio actualizado correctamente' : 'Socio creado correctamente');
        } catch (error) {
            console.error("Error saving member", error);
            toast.error("Error al guardar socio. Verifique los datos.");
        }
    };

    const handleDelete = (memberId) => {
        setMemberToDelete(memberId);
        setConfirmOpen(true);
    };

    const executeDelete = async () => {
        if (!memberToDelete) return;

        try {
            await axios.delete(`${API_URL}/api/members/${memberToDelete}`);
            fetchMembers();
            toast.success('Socio eliminado correctamente');
        } catch (error) {
            console.error("Error deleting member", error);
            toast.error("Error al eliminar socio.");
        } finally {
            setConfirmOpen(false);
            setMemberToDelete(null);
        }
    };

    const handleToggleWhatsapp = async (member) => {
        try {
            const updatedStatus = !member.isInWhatsappGroup;
            // Optimistic update
            setMembers(members.map(m => m._id === member._id ? { ...m, isInWhatsappGroup: updatedStatus } : m));

            await axios.put(`${API_URL}/api/members/${member._id}`, {
                ...member,
                isInWhatsappGroup: updatedStatus
            });
            toast.success(`Socio ${updatedStatus ? 'agregado a' : 'eliminado de'} WhatsApp`);
        } catch (error) {
            console.error("Error updating whatsapp status", error);
            fetchMembers(); // Revert on error
            toast.error('Error al actualizar estado de WhatsApp');
        }
    };

    const filteredMembers = members.filter(member =>
        (member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.ci?.includes(searchTerm)) &&
        (!filterNotWhatsapp || !member.isInWhatsappGroup)
    );

    const handleViewMember = (member) => {
        setViewMember(member);
        setViewModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={executeDelete}
                title="Eliminar Socio"
                message="¿Estás seguro de que deseas eliminar este socio? Esta acción es permanente y no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
            />

            <MemberAnalyticsModal
                isOpen={analyticsModalOpen}
                onClose={() => setAnalyticsModalOpen(false)}
            />

            <MemberFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingMember}
                plans={plans}
                members={members}
            />

            <MemberDetailModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                member={viewMember}
                onEdit={(member) => {
                    handleOpenModal(member);
                }}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Socios</h1>
                    <p className="text-slate-500 mt-1">Gestión de miembros del gimnasio</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setAnalyticsModalOpen(true)}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm"
                    >
                        <BarChart2 size={20} />
                        <span className="hidden sm:inline">Analíticas</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        style={{ backgroundColor: 'var(--btn-new-member, #2563eb)' }}
                        className="text-white hover:brightness-90 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm"
                    >
                        <UserPlus size={20} />
                        <span className="hidden sm:inline">Nuevo Socio</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <MemberFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterNotWhatsapp={filterNotWhatsapp}
                    setFilterNotWhatsapp={setFilterNotWhatsapp}
                />

                <MembersTable
                    members={filteredMembers}
                    onView={handleViewMember}
                    onEdit={handleOpenModal}
                    onDelete={handleDelete}
                    onToggleWhatsapp={handleToggleWhatsapp}
                />

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                    <div>Mostrando {filteredMembers.length} socios</div>
                </div>
            </div>
        </div>
    );
};

export default Members;

