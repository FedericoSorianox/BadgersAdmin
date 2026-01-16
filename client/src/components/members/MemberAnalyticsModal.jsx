import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import Modal from '../Modal';
import { API_URL } from '../../config';

const MemberAnalyticsModal = ({ isOpen, onClose }) => {
    const [analyticsData, setAnalyticsData] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // History Detail State
    const [detailedPayments, setDetailedPayments] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [historyDetailModalOpen, setHistoryDetailModalOpen] = useState(false);
    const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(null);
    const [members, setMembers] = useState([]); // Needed for detail resolution

    useEffect(() => {
        // Fetch members for detail lookup if needed
        const fetchMembersForContext = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/members`);
                setMembers(response.data);
            } catch (error) {
                console.error("Error fetching members for analytics context", error);
            }
        };

        if (isOpen) {
            fetchMembersForContext();
            fetchAnalytics();
        }
    }, [isOpen, selectedYear]);

    const fetchAnalytics = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/finance/analytics/annual`, {
                params: { year: selectedYear }
            });
            const backendData = response.data;

            const monthlyData = Array(12).fill(0).map((_, i) => {
                const monthIndex = i + 1;
                const found = backendData.find(d => d.month === monthIndex);
                return {
                    month: monthIndex,
                    name: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
                    count: found ? found.count : 0,
                    revenue: found ? found.revenue : 0
                };
            });

            setAnalyticsData(monthlyData);
        } catch (error) {
            console.error("Error fetching analytics", error);
        }
    };

    const fetchMonthDetails = async (month) => {
        setLoadingDetails(true);
        setSelectedHistoryMonth(month);
        setHistoryDetailModalOpen(true);
        try {
            const response = await axios.get(`${API_URL}/api/finance`, {
                params: { month, year: selectedYear }
            });
            setDetailedPayments(response.data);
        } catch (error) {
            console.error("Error fetching month details", error);
            setDetailedPayments([]);
        } finally {
            setLoadingDetails(false);
        }
    };

    const renderDetailModal = () => (
        <Modal
            isOpen={historyDetailModalOpen}
            onClose={() => setHistoryDetailModalOpen(false)}
            title={selectedHistoryMonth ? `Detalle: ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][selectedHistoryMonth - 1]} ${selectedYear}` : 'Detalle'}
        >
            {(() => {
                if (!selectedHistoryMonth) return null;
                if (loadingDetails) return (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-slate-400" size={32} />
                    </div>
                );

                const paidIds = new Set(detailedPayments.map(p => String(p.memberId || '')));
                const paidCis = new Set(detailedPayments.map(p => String(p.memberCi || '')));
                const activeMembers = members.filter(m => m.active && !m.isExempt);

                const paidList = activeMembers.filter(m =>
                    (m._id && paidIds.has(String(m._id))) ||
                    (m.ci && paidCis.has(String(m.ci)))
                );

                const pendingList = activeMembers.filter(m =>
                    !((m._id && paidIds.has(String(m._id))) ||
                        (m.ci && paidCis.has(String(m.ci))))
                );

                return (
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold text-green-600 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-600"></span>
                                Pagados ({paidList.length})
                            </h4>
                            <div className="bg-green-50 rounded-xl p-4 max-h-[250px] overflow-y-auto divide-y divide-green-100">
                                {paidList.map(m => (
                                    <div key={m._id} className="py-2 flex justify-between items-center gap-4">
                                        <span className="text-sm font-medium text-slate-700 truncate flex-1">{m.fullName}</span>
                                        <span className="text-xs text-slate-500 font-mono shrink-0">CI: {m.ci}</span>
                                    </div>
                                ))}
                                {paidList.length === 0 && <p className="text-sm text-slate-400 italic">Ningún pago registrado.</p>}
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                Pendientes ({pendingList.length})
                            </h4>
                            <div className="bg-red-50 rounded-xl p-4 max-h-[250px] overflow-y-auto divide-y divide-red-100">
                                {pendingList.map(m => (
                                    <div key={m._id} className="py-2 flex justify-between items-center gap-4">
                                        <span className="text-sm font-medium text-slate-700 truncate flex-1">{m.fullName}</span>
                                        <span className="text-xs text-slate-500 font-mono shrink-0">CI: {m.ci}</span>
                                    </div>
                                ))}
                                {pendingList.length === 0 && <p className="text-sm text-slate-400 italic">Todos al día.</p>}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </Modal>
    );

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Histórico de Pagos - ${selectedYear}`}
            >
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 font-medium text-slate-600 focus:outline-none cursor-pointer"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            <option value={2023}>2023</option>
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </select>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: '#F1F5F9' }}
                                />
                                <Bar dataKey="count" name="Socios al Día" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="border rounded-xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 font-bold text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Mes</th>
                                    <th className="px-4 py-3 text-right">Socios Pagaron</th>
                                    <th className="px-4 py-3 text-right">Ingresos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {analyticsData.map((data) => (
                                    <tr
                                        key={data.month}
                                        onClick={() => fetchMonthDetails(data.month)}
                                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3 text-slate-700 font-medium">{data.name}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-700">{data.count}</td>
                                        <td className="px-4 py-3 text-right text-green-600 font-mono">${data.revenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>
            {renderDetailModal()}
        </>
    );
};

export default MemberAnalyticsModal;
