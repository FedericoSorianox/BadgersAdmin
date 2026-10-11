import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import axios from 'axios';
import { ArrowLeft, User, Phone, Calendar, CreditCard, Activity } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function MemberDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMember();
  }, [id]);

  const fetchMember = async () => {
    try {
      // In the backend, there isn't a specific GET /api/members/:id for admins,
      // it usually fetches all members and filters, or maybe there is one.
      // Let's fetch all and find, or try GET /api/members/:id if it exists.
      const res = await axios.get(`${API_URL}/members`);
      const found = res.data.find((m: any) => m._id === id);
      if (found) {
        setMember(found);
      } else {
        Alert.alert('Error', 'Socio no encontrado');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching member details:', error);
      Alert.alert('Error', 'No se pudo cargar el socio');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!member) return;
    try {
      const newStatus = !member.active;
      await axios.put(`${API_URL}/members/${member._id}/toggle-status`);
      setMember({ ...member, active: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  if (loading || !member) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const isActive = member.active;

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-slate-900 pt-12 pb-4 px-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Perfil del Alumno</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-slate-900 px-6 pb-8 items-center rounded-b-[40px] shadow-sm">
          <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-4">
            <User color="#0f172a" size={40} />
          </View>
          <Text className="text-2xl font-bold text-white mb-1">{member.fullName}</Text>
          <Text className="text-gray-300">CI: {member.ci}</Text>
          
          <TouchableOpacity 
            className={`mt-4 px-6 py-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}
            onPress={toggleStatus}
          >
            <Text className="text-white font-bold">{isActive ? 'ACTIVO (Toque para inactivar)' : 'INACTIVO (Toque para activar)'}</Text>
          </TouchableOpacity>
        </View>

        <View className="p-4">
          <Text className="text-lg font-bold text-slate-800 mb-4 ml-1">Información General</Text>
          
          <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-blue-50 rounded-full justify-center items-center mr-3">
                <Phone color="#3b82f6" size={20} />
              </View>
              <View>
                <Text className="text-sm text-gray-500">Teléfono</Text>
                <Text className="text-slate-800 font-medium">{member.phone || 'No registrado'}</Text>
              </View>
            </View>

            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 bg-purple-50 rounded-full justify-center items-center mr-3">
                <CreditCard color="#a855f7" size={20} />
              </View>
              <View>
                <Text className="text-sm text-gray-500">Plan actual</Text>
                <Text className="text-slate-800 font-medium">{member.planType} - ${member.planCost}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-orange-50 rounded-full justify-center items-center mr-3">
                <Calendar color="#f97316" size={20} />
              </View>
              <View>
                <Text className="text-sm text-gray-500">Fecha de Ingreso</Text>
                <Text className="text-slate-800 font-medium">
                  {new Date(member.joinDate || member.createdAt).toLocaleDateString('es-UY')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
