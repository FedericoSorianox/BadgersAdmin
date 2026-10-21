import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function DebtsScreen() {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchDebts();
    }, [])
  );

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/debts`);
      setDebts(res.data);
    } catch (error) {
      console.error('Error fetching debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayDebt = (debt: any) => {
    const remaining = debt.totalAmount - (debt.paidAmount || 0);
    Alert.alert(
      'Gestionar Deuda',
      `Deuda de $${remaining} de ${debt.memberName}:`,
      [
        { text: 'Cerrar', style: 'cancel' },
        { 
          text: 'Pagar Digital', 
          onPress: () => processPayDebt(debt, 'Digital')
        },
        { 
          text: 'Pagar Efectivo', 
          onPress: () => processPayDebt(debt, 'Efectivo')
        },
        {
          text: 'Anular / Borrar Deuda',
          style: 'destructive',
          onPress: () => confirmDeleteDebt(debt)
        }
      ]
    );
  };

  const confirmDeleteDebt = (debt: any) => {
    const remaining = debt.totalAmount - (debt.paidAmount || 0);
    Alert.alert(
      '¿Anular Deuda?',
      `¿Deseas anular esta deuda de $${remaining}? Esta acción eliminará el registro y restaurará el stock del inventario.`,
      [
        { text: 'No, Volver', style: 'cancel' },
        {
          text: 'Sí, Anular',
          style: 'destructive',
          onPress: () => processDeleteDebt(debt)
        }
      ]
    );
  };

  const processDeleteDebt = async (debt: any) => {
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/debts/${debt._id}`);
      Alert.alert('Éxito', 'Deuda anulada y stock devuelto al inventario.');
      fetchDebts();
    } catch (error: any) {
      console.error('Error deleting debt:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo anular la deuda.');
      setLoading(false);
    }
  };

  const processPayDebt = async (debt: any, paymentMethod: 'Efectivo' | 'Digital') => {
    try {
      setLoading(true);
      await axios.put(`${API_URL}/debts/${debt._id}/pay`, { paymentMethod });
      Alert.alert('Éxito', `Deuda saldada correctamente (${paymentMethod}).`);
      fetchDebts();
    } catch (error: any) {
      console.error('Error paying debt:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo procesar el pago.');
      setLoading(false);
    }
  };

  const renderDebt = ({ item }: { item: any }) => {
    const remaining = item.totalAmount - (item.paidAmount || 0);
    return (
      <View 
        className="bg-white p-4 mb-3 rounded-xl border border-red-100 flex-row items-center justify-between"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-800">{item.memberName}</Text>
          <Text className="text-sm text-gray-500 mt-1">
            {item.products.map((p: any) => p.productName).join(', ')}
          </Text>
          <Text className="text-xs text-gray-400 mt-1">
            {new Date(item.date).toLocaleDateString('es-UY')}
          </Text>
        </View>
        <View className="items-end ml-4">
          <Text className="text-lg font-bold text-red-600 mb-2">
            ${remaining}
          </Text>
          <TouchableOpacity 
            className="bg-blue-600 px-4 py-2 rounded-full"
            onPress={() => handlePayDebt(item)}
          >
            <Text className="text-white text-xs font-bold">PAGAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-slate-900 pt-12 pb-4 px-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Fiados Pendientes</Text>
      </View>

      {loading && debts.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <FlatList
          data={debts}
          keyExtractor={(item) => item._id}
          renderItem={renderDebt}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10">
              <AlertCircle color="#9ca3af" size={48} className="mb-4" />
              <Text className="text-center text-gray-500">
                No hay deudas pendientes registradas.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
