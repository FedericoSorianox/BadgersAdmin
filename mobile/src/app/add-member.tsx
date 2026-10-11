import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AddMemberScreen() {
  const [fullName, setFullName] = useState('');
  const [ci, setCi] = useState('');
  const [phone, setPhone] = useState('');
  const [planType, setPlanType] = useState('');
  const [planCost, setPlanCost] = useState('0');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`);
      if (res.data && res.data.plans) {
        setPlans(res.data.plans);
        if (res.data.plans.length > 0) {
          setPlanType(res.data.plans[0].name);
          setPlanCost(res.data.plans[0].cost.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handlePlanSelect = (selectedPlanName: string) => {
    setPlanType(selectedPlanName);
    const plan = plans.find((p) => p.name === selectedPlanName);
    if (plan) {
      setPlanCost(plan.cost.toString());
    }
  };

  const handleSubmit = async () => {
    if (!fullName || !ci) {
      Alert.alert('Error', 'El nombre y la CI son obligatorios.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('ci', ci);
      formData.append('phone', phone);
      formData.append('planType', planType);
      formData.append('planCost', planCost);
      formData.append('active', 'true');

      await axios.post(`${API_URL}/members`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      Alert.alert('Éxito', 'Alumno registrado correctamente.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error saving member:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al guardar el alumno.');
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
        <Text className="text-xl font-bold text-white">Nuevo Alumno</Text>
      </View>

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8">
          <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Nombre Completo *</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
            placeholder="Ej. Juan Pérez"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Cédula de Identidad *</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
            placeholder="Sin puntos ni guiones"
            keyboardType="numeric"
            value={ci}
            onChangeText={setCi}
          />

          <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Teléfono</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
            placeholder="Ej. 099123456"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Tipo de Plan</Text>
          <View className="flex-row flex-wrap mb-4">
            {plans.map((plan, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handlePlanSelect(plan.name)}
                className={`px-4 py-2 rounded-full border mr-2 mb-2 ${planType === plan.name ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
              >
                <Text className={`${planType === plan.name ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                  {plan.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Costo del Plan (UYU)</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-slate-800"
            placeholder="Ej. 2000"
            keyboardType="numeric"
            value={planCost}
            onChangeText={setPlanCost}
          />

          <TouchableOpacity 
            className="w-full bg-blue-600 rounded-xl py-4 items-center justify-center flex-row shadow-sm"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" className="mr-2" />
            ) : (
              <Text className="text-white font-bold text-lg">Guardar Alumno</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
