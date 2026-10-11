import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AddExpenseScreen() {
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Limpieza');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!concept || !amount) {
      Alert.alert('Error', 'El concepto y el monto son obligatorios.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        concept,
        amount: Number(amount),
        category,
        paymentMethod,
        expenseType: 'Normal'
      };

      await axios.post(`${API_URL}/finance/expenses`, payload);
      
      Alert.alert('Éxito', 'Gasto registrado correctamente.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al guardar el gasto.');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Limpieza', 'Mantenimiento', 'Sueldos', 'Alquiler', 'Otros'];

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-slate-900 pt-12 pb-4 px-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Anotar Gasto</Text>
      </View>

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8">
          
          <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Concepto *</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
            placeholder="Ej. Artículos de limpieza"
            value={concept}
            onChangeText={setConcept}
          />

          <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Monto (UYU) *</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
            placeholder="Monto"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Categoría</Text>
          <View className="flex-row flex-wrap mb-4">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full border mr-2 mb-2 ${category === cat ? 'bg-red-100 border-red-500' : 'bg-gray-50 border-gray-200'}`}
              >
                <Text className={`${category === cat ? 'text-red-700 font-bold' : 'text-gray-600'}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Medio de Pago</Text>
          <View className="flex-row mb-6">
            {['Efectivo', 'Digital'].map((method) => (
              <TouchableOpacity
                key={method}
                onPress={() => setPaymentMethod(method)}
                className={`flex-1 px-4 py-3 rounded-xl border mr-2 items-center ${paymentMethod === method ? 'bg-red-100 border-red-500' : 'bg-gray-50 border-gray-200'}`}
              >
                <Text className={`${paymentMethod === method ? 'text-red-700 font-bold' : 'text-gray-600'}`}>
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            className="w-full bg-red-600 rounded-xl py-4 items-center justify-center flex-row shadow-sm"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" className="mr-2" />
            ) : (
              <Text className="text-white font-bold text-lg">Registrar Gasto</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
