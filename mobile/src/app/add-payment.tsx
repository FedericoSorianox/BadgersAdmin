import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AddPaymentScreen() {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`${API_URL}/members`);
      setMembers(res.data);
      if (res.data.length > 0) {
        setSelectedMember(res.data[0]);
        setAmount(res.data[0].planCost?.toString() || '0');
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleMemberSelect = (member: any) => {
    setSelectedMember(member);
    setAmount(member.planCost?.toString() || '0');
  };

  const handleSubmit = async () => {
    if (!selectedMember || !amount) {
      Alert.alert('Error', 'Debe seleccionar un socio y definir el monto.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        memberId: selectedMember._id,
        memberName: selectedMember.fullName,
        memberCi: selectedMember.ci,
        month: Number(month),
        year: Number(year),
        amount: Number(amount),
        type: 'Cuota',
        paymentMethod: paymentMethod
      };

      await axios.post(`${API_URL}/finance`, payload);
      
      Alert.alert('Éxito', 'Pago registrado correctamente.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error saving payment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al guardar el pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-slate-900 pt-12 pb-4 px-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Anotar Pago</Text>
      </View>

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        {loadingMembers ? (
           <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
        ) : (
          <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8">
            
            <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Seleccionar Socio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {members.map((member) => (
                <TouchableOpacity
                  key={member._id}
                  onPress={() => handleMemberSelect(member)}
                  className={`px-4 py-2 rounded-full border mr-2 ${selectedMember?._id === member._id ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
                >
                  <Text className={`${selectedMember?._id === member._id ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                    {member.fullName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="flex-row justify-between mb-4">
                <View className="flex-1 mr-2">
                    <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Mes</Text>
                    <TextInput
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800"
                        keyboardType="numeric"
                        value={month}
                        onChangeText={setMonth}
                    />
                </View>
                <View className="flex-1 ml-2">
                    <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Año</Text>
                    <TextInput
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800"
                        keyboardType="numeric"
                        value={year}
                        onChangeText={setYear}
                    />
                </View>
            </View>

            <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Método de Pago</Text>
            <View className="flex-row mb-4">
              {['Efectivo', 'Digital'].map((method) => (
                <TouchableOpacity
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  className={`flex-1 px-4 py-3 rounded-xl border mr-2 items-center ${paymentMethod === method ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
                >
                  <Text className={`${paymentMethod === method ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Monto (UYU)</Text>
            <TextInput
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-slate-800"
              placeholder="Monto"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <TouchableOpacity 
              className="w-full bg-blue-600 rounded-xl py-4 items-center justify-center flex-row shadow-sm"
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" className="mr-2" />
              ) : (
                <Text className="text-white font-bold text-lg">Registrar Pago</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
