import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import axios from 'axios';
import { router } from 'expo-router';
import { ArrowLeft, Search, UserCircle, XCircle, Check, CheckCircle2, FileText } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function PaymentStatusScreen() {
    const [members, setMembers] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [membersRes, paymentsRes] = await Promise.all([
                axios.get(`${API_URL}/members`),
                axios.get(`${API_URL}/finance?month=${month}&year=${year}`)
            ]);
            setMembers(membersRes.data.filter((m: any) => m.active));
            setPayments(paymentsRes.data);
        } catch (error) {
            console.error('Error fetching payment status:', error);
        } finally {
            setLoading(false);
        }
    };

    const memberStatuses = useMemo(() => {
        const statuses = members.map(m => {
            const memberPayments = payments.filter(p => p.memberId === m._id);
            const isPaid = memberPayments.some(p => p.type === 'Cuota' || p.type === 'Condonado');
            const isLicense = memberPayments.some(p => p.type === 'Licencia');

            let status = 'PENDING';
            if (isPaid) status = 'PAID';
            else if (isLicense) status = 'LICENSE';

            return { ...m, status };
        });

        const filtered = search ? statuses.filter(m => 
            m.fullName.toLowerCase().includes(search.toLowerCase()) || 
            (m.ci && m.ci.includes(search))
        ) : statuses;

        return {
            pending: filtered.filter(m => m.status === 'PENDING'),
            license: filtered.filter(m => m.status === 'LICENSE'),
            paid: filtered.filter(m => m.status === 'PAID')
        };
    }, [members, payments, search]);

    const handleAction = async (endpoint: string, member: any, extraData = {}) => {
        try {
            setActionLoading(true);
            const payload = { memberId: member._id, memberName: member.fullName, month, year, ...extraData };
            await axios.post(`${API_URL}/finance/${endpoint}`, payload);
            fetchData();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudo procesar la acción.");
            setActionLoading(false);
        }
    };

    const confirmAction = (title: string, msg: string, onConfirm: () => void) => {
        Alert.alert(title, msg, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Confirmar', onPress: onConfirm }
        ]);
    };

    const totalMembers = members.length;
    const paidMembersCount = memberStatuses.paid.length;
    const paidPercentage = totalMembers > 0 ? Math.round((paidMembersCount / totalMembers) * 100) : 0;

    return (
        <View className="flex-1 bg-gray-50">
            <View className="bg-slate-900 pt-12 pb-5 px-4 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
                        <ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xl font-bold text-white">Estado de Pagos</Text>
                        <Text className="text-xs text-gray-400">{MONTHS[month - 1]} de {year}</Text>
                    </View>
                </View>
                {(!loading && totalMembers > 0) && (
                    <View className="items-center bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                        <Text className={`text-xl font-black ${paidPercentage >= 90 ? 'text-green-400' : paidPercentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{paidPercentage}%</Text>
                        <Text className="text-[10px] text-gray-300 font-bold">{paidMembersCount} / {totalMembers} Pagos</Text>
                    </View>
                )}
            </View>

            <View className="p-4 bg-white border-b border-gray-100 shadow-sm">
                <View className="flex-row items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <Search color="#9ca3af" size={20} className="mr-2" />
                    <TextInput 
                        className="flex-1 text-slate-800"
                        placeholder="Buscar socio por nombre o cédula..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {loading || actionLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <FlatList 
                    data={[
                        { title: `Pendientes (${memberStatuses.pending.length})`, data: memberStatuses.pending, color: 'text-red-500', dot: '#ef4444' },
                        { title: `En Licencia (${memberStatuses.license.length})`, data: memberStatuses.license, color: 'text-purple-500', dot: '#a855f7' },
                        { title: `Pagados o Perdonados (${memberStatuses.paid.length})`, data: memberStatuses.paid, color: 'text-green-500', dot: '#22c55e' }
                    ]}
                    keyExtractor={item => item.title}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item: section }) => {
                        if (section.data.length === 0) return null;
                        return (
                            <View className="mb-6">
                                <View className="flex-row items-center mb-3">
                                    <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: section.dot }} />
                                    <Text className={`text-base font-bold ${section.color}`}>{section.title}</Text>
                                </View>
                                
                                <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
                                    {section.data.map((member, index) => (
                                        <View key={member._id} className={`p-3 ${index > 0 ? 'border-t border-gray-50' : ''}`}>
                                            <TouchableOpacity 
                                                className="flex-row justify-between items-start mb-2"
                                                onPress={() => router.push(`/member-details/${member._id}`)}
                                            >
                                                <View>
                                                    <Text className="font-bold text-slate-800 text-base">{member.fullName}</Text>
                                                    <Text className="text-xs text-gray-500">CI: {member.ci} • ${member.planCost}</Text>
                                                </View>
                                            </TouchableOpacity>
                                            
                                            {member.status === 'PENDING' && (
                                                <View className="flex-row flex-wrap mt-2">
                                                    <TouchableOpacity 
                                                        className="px-3 py-1.5 rounded-lg border border-gray-200 mr-2 mb-2 flex-row items-center bg-gray-50/50"
                                                        onPress={() => router.push(`/member-details/${member._id}`)}
                                                    >
                                                        <UserCircle size={14} color="#64748b" className="mr-1.5" />
                                                        <Text className="text-xs font-bold text-gray-600">Ficha</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity 
                                                        className="px-3 py-1.5 rounded-lg border border-gray-200 mr-2 mb-2 flex-row items-center bg-gray-50/50"
                                                        onPress={() => confirmAction('Licencia', '¿Marcar en licencia este mes?', () => handleAction('license', member))}
                                                    >
                                                        <XCircle size={14} color="#64748b" className="mr-1.5" />
                                                        <Text className="text-xs font-bold text-gray-600">Licencia</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity 
                                                        className="px-3 py-1.5 rounded-lg border border-gray-200 mr-2 mb-2 flex-row items-center bg-gray-50/50"
                                                        onPress={() => confirmAction('Perdonar', '¿Perdonar la cuota de este mes?', () => handleAction('condone', member))}
                                                    >
                                                        <Check size={14} color="#64748b" className="mr-1.5" />
                                                        <Text className="text-xs font-bold text-gray-600">Perdonar</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity 
                                                        className="px-3 py-1.5 rounded-lg bg-green-500 flex-row items-center mb-2"
                                                        onPress={() => confirmAction('Pago Rápido', `¿Registrar pago de $${member.planCost} en efectivo?`, () => {
                                                            setActionLoading(true);
                                                            const payload = { memberId: member._id, memberName: member.fullName, month, year, amount: member.planCost, type: 'Cuota', paymentMethod: 'Efectivo' };
                                                            axios.post(`${API_URL}/finance`, payload).then(() => fetchData()).catch(() => {
                                                                Alert.alert("Error", "Fallo al registrar");
                                                                setActionLoading(false);
                                                            });
                                                        })}
                                                    >
                                                        <CheckCircle2 size={14} color="white" className="mr-1.5" />
                                                        <Text className="text-xs font-bold text-white">Pagó</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                            
                                            {member.status === 'LICENSE' && (
                                                <Text className="text-xs italic text-purple-400 mt-1">Sin asistencia este mes</Text>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}
