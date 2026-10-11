import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import axios from 'axios';
import { useFocusEffect, router } from 'expo-router';
import { CreditCard, Package, TrendingDown, Wallet, ChevronLeft, ChevronRight } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function FinanceScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('Todas');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [selectedMonth, selectedYear])
  );

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const [paymentsRes, expensesRes] = await Promise.all([
        axios.get(`${API_URL}/finance`),
        axios.get(`${API_URL}/finance/expenses`)
      ]);
      
      const payments = paymentsRes.data.map((p: any) => ({ ...p, isIncome: true, tType: p.type || 'Cuota' }));
      const expenses = expensesRes.data.map((e: any) => ({ ...e, isIncome: false, tType: 'Gasto' }));
      
      const combined = [...payments, ...expenses];
      
      // Filtrar por mes y año seleccionado
      const filteredByDate = combined.filter((item) => {
          const d = new Date(item.date);
          return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
      });

      const sorted = filteredByDate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(sorted);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(amount);
  };

  const stats = useMemo(() => {
      let cuotas = 0;
      let ventas = 0;
      let gastos = 0;
      
      transactions.forEach(t => {
          if (t.isIncome) {
              if (t.tType === 'Cuota') cuotas += (t.amount || 0);
              else if (t.tType === 'Producto') ventas += (t.amount || 0);
              else cuotas += (t.amount || 0); 
          } else {
              gastos += (t.amount || 0);
          }
      });
      
      return {
          cuotas,
          ventas,
          gastos,
          neto: (cuotas + ventas) - gastos
      };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
      if (filterType === 'Todas') return transactions;
      if (filterType === 'Cuotas') return transactions.filter(t => t.isIncome && t.tType === 'Cuota');
      if (filterType === 'Ventas') return transactions.filter(t => t.isIncome && t.tType === 'Producto');
      if (filterType === 'Gastos') return transactions.filter(t => !t.isIncome);
      return transactions;
  }, [transactions, filterType]);

  const handlePrevMonth = () => {
      if (selectedMonth === 1) {
          setSelectedMonth(12);
          setSelectedYear(selectedYear - 1);
      } else {
          setSelectedMonth(selectedMonth - 1);
      }
  };

  const handleNextMonth = () => {
      if (selectedMonth === 12) {
          setSelectedMonth(1);
          setSelectedYear(selectedYear + 1);
      } else {
          setSelectedMonth(selectedMonth + 1);
      }
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const isIncome = item.isIncome;
    const isGasto = item.tType === 'Gasto';
    const isProducto = item.tType === 'Producto';
    
    let catBg = 'bg-blue-100';
    let catText = 'text-blue-700';
    
    if (isGasto) {
        catBg = 'bg-red-100';
        catText = 'text-red-700';
    } else if (isProducto) {
        catBg = 'bg-purple-100';
        catText = 'text-purple-700';
    }
    
    return (
      <View className="bg-white p-4 mb-3 rounded-xl shadow-sm border border-gray-100 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-800">
            {isIncome ? (item.memberName || 'Usuario') : (item.description || 'Gasto')}
          </Text>
          <Text className="text-sm text-gray-500 mt-1 mb-2">
            {isIncome 
              ? `${item.tType} ${item.month ? `(${item.month}/${item.year})` : ''}`
              : item.expenseType || 'Gasto'}
          </Text>
          <View className="flex-row items-center">
              <View className={`px-2 py-1 rounded-md mr-2 ${catBg}`}>
                  <Text className={`text-[10px] font-bold uppercase ${catText}`}>{item.tType}</Text>
              </View>
              {item.paymentMethod && (
                  <View className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200">
                      <Text className="text-[10px] font-bold text-blue-600">{item.paymentMethod}</Text>
                  </View>
              )}
          </View>
        </View>
        <View className="items-end ml-2">
          <Text className={`text-lg font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <Text className="text-xs text-gray-400 mt-2">
            {new Date(item.date).toLocaleDateString('es-UY', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="flex-row justify-between items-start mb-4 mt-2">
        <View className="flex-1">
            <Text className="text-2xl font-bold text-slate-900">Finanzas</Text>
            <Text className="text-gray-500 text-sm">Control de ingresos y egresos.</Text>
        </View>
        <View className="flex-row items-center bg-white rounded-xl shadow-sm border border-gray-100 p-1">
            <TouchableOpacity onPress={handlePrevMonth} className="p-1">
                <ChevronLeft color="#64748b" size={20} />
            </TouchableOpacity>
            <Text className="font-bold text-slate-800 mx-2 text-sm">{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
            <TouchableOpacity onPress={handleNextMonth} className="p-1">
                <ChevronRight color="#64748b" size={20} />
            </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row mb-4">
          <TouchableOpacity 
            className="bg-green-600 py-2 px-4 rounded-lg mr-2 shadow-sm flex-row items-center"
            onPress={() => router.push('/add-payment')}
          >
            <Text className="text-white font-bold text-sm">+ Nueva Venta</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="bg-red-600 py-2 px-4 rounded-lg shadow-sm flex-row items-center"
            onPress={() => router.push('/add-expense')}
          >
            <Text className="text-white font-bold text-sm">+ Nuevo Gasto</Text>
          </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap justify-between mb-4">
          <View className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 w-[48%] mb-3 justify-between h-24">
              <View className="flex-row justify-between items-center">
                  <View className="bg-blue-50 p-1.5 rounded-lg"><CreditCard color="#3b82f6" size={16} /></View>
                  <Text className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Cuotas</Text>
              </View>
              <View>
                  <Text className="text-xs text-gray-500">Total Ingresos</Text>
                  <Text className="text-lg font-bold text-slate-800">{formatCurrency(stats.cuotas)}</Text>
              </View>
          </View>

          <View className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 w-[48%] mb-3 justify-between h-24">
              <View className="flex-row justify-between items-center">
                  <View className="bg-purple-50 p-1.5 rounded-lg"><Package color="#a855f7" size={16} /></View>
                  <Text className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Ventas</Text>
              </View>
              <View>
                  <Text className="text-xs text-gray-500">Total Productos</Text>
                  <Text className="text-lg font-bold text-slate-800">{formatCurrency(stats.ventas)}</Text>
              </View>
          </View>

          <View className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 w-[48%] mb-1 justify-between h-24">
              <View className="flex-row justify-between items-center">
                  <View className="bg-red-50 p-1.5 rounded-lg"><TrendingDown color="#ef4444" size={16} /></View>
                  <Text className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Egresos</Text>
              </View>
              <View>
                  <Text className="text-xs text-gray-500">Total Gastos</Text>
                  <Text className="text-lg font-bold text-slate-800">{formatCurrency(stats.gastos)}</Text>
              </View>
          </View>

          <View className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 w-[48%] mb-1 justify-between h-24">
              <View className="flex-row justify-between items-center">
                  <View className="bg-green-50 p-1.5 rounded-lg"><Wallet color="#22c55e" size={16} /></View>
                  <Text className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Neto</Text>
              </View>
              <View>
                  <Text className="text-xs text-gray-500">Balance General</Text>
                  <Text className={`text-lg font-bold ${stats.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.neto)}
                  </Text>
              </View>
          </View>
      </View>

      <View className="flex-row mb-4 bg-white self-start rounded-xl shadow-sm border border-gray-100 p-1">
          {['Todas', 'Cuotas', 'Ventas', 'Gastos'].map(t => (
              <TouchableOpacity 
                key={t}
                onPress={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg ${filterType === t ? 'bg-slate-800' : 'bg-transparent'}`}
              >
                  <Text className={`font-bold text-xs ${filterType === t ? 'text-white' : 'text-slate-600'}`}>{t}</Text>
              </TouchableOpacity>
          ))}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item._id}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 mt-10">
              No hay transacciones para este período.
            </Text>
          }
        />
      )}
    </View>
  );
}
