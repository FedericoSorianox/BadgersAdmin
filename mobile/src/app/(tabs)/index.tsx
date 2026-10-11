import React, { useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { LogOut, CheckCircle2, Circle, X } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function DashboardScreen() {
  const { user, logout } = useContext(AuthContext);
  const [stats, setStats] = useState<any>({ activeMembers: 0, inactiveMembers: 0, totalIncome: 0, paidMembersThisMonth: 0 });
  const [productsCount, setProductsCount] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [quickProducts, setQuickProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, productsRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/finance/stats`),
        axios.get(`${API_URL}/products`),
        axios.get(`${API_URL}/settings`)
      ]);
      
      setStats({
        activeMembers: statsRes.data.activeMembers || 0,
        inactiveMembers: statsRes.data.inactiveMembers || 0,
        totalIncome: statsRes.data.totalIncome || 0,
        paidMembersThisMonth: statsRes.data.paidMembersThisMonth || 0
      });

      const inStock = productsRes.data.filter((p: any) => p.stock > 0).length;
      setProductsCount(inStock);
      setQuickProducts(productsRes.data.filter((p: any) => p.isQuickAccess));

      if (settingsRes.data && settingsRes.data.tasks) {
        setTasks(settingsRes.data.tasks);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitQuickSale = async (product: any, paymentMethod: string) => {
    try {
      setLoading(true);
      const payload = {
        memberName: 'Venta Mostrador',
        amount: product.salePrice,
        type: 'Producto',
        paymentMethod,
        productId: product._id,
        quantity: 1,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      };
      await axios.post(`${API_URL}/finance`, payload);
      fetchDashboardData();
    } catch (err) {
      Alert.alert('Error', 'Fallo al registrar la venta');
      setLoading(false);
    }
  };

  const handleQuickSell = (product: any) => {
    if (product.stock <= 0) {
      Alert.alert('Sin Stock', 'No hay stock disponible para este producto.');
      return;
    }
    Alert.alert(
      'Venta Rápida',
      `Selecciona el método de pago para registrar la venta de ${product.name} por $${product.salePrice}:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Digital', 
          onPress: () => submitQuickSale(product, 'Transferencia/Débito')
        },
        { 
          text: 'Efectivo', 
          onPress: () => submitQuickSale(product, 'Efectivo')
        }
      ]
    );
  };

  const toggleTask = async (taskId: string) => {
    // Optimistic update
    setTasks(current => 
      current.map(t => {
        if (t._id === taskId) {
          return { ...t, completedAt: t.completedAt ? null : new Date().toISOString() };
        }
        return t;
      })
    );
    try {
      await axios.patch(`${API_URL}/settings/tasks/${taskId}/toggle`);
    } catch (error) {
      console.error('Error toggling task:', error);
      fetchDashboardData();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(amount);
  };

  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskFreq, setNewTaskFreq] = useState<'weekly'|'monthly'>('weekly');

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Debes ingresar un título para la tarea.');
      return;
    }
    try {
      setLoading(true);
      const updatedTasks = [...tasks, { title: newTaskTitle, frequency: newTaskFreq, completedAt: null }];
      await axios.put(`${API_URL}/settings/tasks`, { tasks: updatedTasks });
      setNewTaskTitle('');
      setTaskModalVisible(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'No se pudo crear la tarea.');
      setLoading(false);
    }
  };

  const weeklyTasks = tasks.filter(t => t.frequency === 'weekly');
  const monthlyTasks = tasks.filter(t => t.frequency === 'monthly');

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      <View className="p-5">
        <View className="flex-row justify-between items-center mb-6 mt-6">
            <View>
                <Text className="text-2xl font-bold text-slate-900">Dashboard</Text>
                <Text className="text-gray-500 text-sm">Gestión de The Badgers</Text>
            </View>
            <TouchableOpacity onPress={logout} className="bg-red-50 p-2 rounded-full">
                <LogOut color="#ef4444" size={20} />
            </TouchableOpacity>
        </View>
        
        {loading ? (
          <View className="flex-row justify-center items-center py-8">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <>
            <Text className="text-xs font-bold text-gray-400 mb-3 uppercase">Acceso Rápido</Text>
            <View className="flex-row justify-between mb-4">
              <TouchableOpacity 
                className="bg-green-50 p-4 rounded-2xl items-center w-[31%] shadow-sm border border-green-100 justify-center"
                onPress={() => router.push('/add-payment')}
              >
                <Text className="text-green-700 font-bold text-center text-[10px]">NUEVA VENTA</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-orange-50 p-4 rounded-2xl items-center w-[31%] shadow-sm border border-orange-100 justify-center"
                onPress={() => router.push('/add-debt')}
              >
                <Text className="text-orange-700 font-bold text-center text-[10px]">NUEVO FIADO</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-red-50 p-4 rounded-2xl items-center w-[31%] shadow-sm border border-red-100 justify-center"
                onPress={() => router.push('/add-expense')}
              >
                <Text className="text-red-700 font-bold text-center text-[10px]">NUEVO GASTO</Text>
              </TouchableOpacity>
            </View>

            {quickProducts.length > 0 && (
              <View className="flex-row flex-wrap justify-between mb-2">
                {quickProducts.map((p) => (
                  <TouchableOpacity 
                    key={p._id}
                    className="bg-white p-3 rounded-2xl items-center w-[48%] mb-3 shadow-sm border border-gray-200 justify-center"
                    onPress={() => handleQuickSell(p)}
                  >
                    <Text className="text-slate-500 font-bold text-center text-[10px] uppercase mb-1" numberOfLines={1}>{p.name}</Text>
                    <Text className="text-slate-800 font-black text-center text-sm">${p.salePrice}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <View className="flex-row mb-6">
                <TouchableOpacity 
                    className="bg-slate-800 p-4 rounded-xl items-center flex-1 shadow-sm"
                    onPress={() => router.push('/debts')}
                >
                    <Text className="text-white font-bold text-center text-xs uppercase">Control de Fiados</Text>
                </TouchableOpacity>
            </View>

            <Text className="text-xs font-bold text-gray-400 mb-3 uppercase">Estadísticas</Text>
            <View className="flex-row flex-wrap justify-between mb-6">
              <TouchableOpacity 
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-[48%] mb-3 items-center justify-center active:bg-gray-50"
                onPress={() => router.push('/members?filter=active')}
              >
                <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Socios Activos</Text>
                <Text className="text-3xl font-black text-slate-800">{stats.activeMembers}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-[48%] mb-3 items-center justify-center active:bg-gray-50"
                onPress={() => router.push('/members?filter=inactive')}
              >
                <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Inactivos</Text>
                <Text className="text-3xl font-black text-slate-800">{stats.inactiveMembers}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-[48%] mb-1 items-center justify-center active:bg-gray-50"
                onPress={() => router.push('/products')}
              >
                <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 text-center">Productos Stock</Text>
                <Text className="text-3xl font-black text-slate-800">{productsCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-[48%] mb-1 items-center justify-center active:bg-gray-50"
                onPress={() => router.push('/payment-status')}
              >
                <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 text-center">Pagos del mes</Text>
                <Text className={`text-xl font-black mt-1 ${stats.activeMembers > 0 && Math.round((stats.paidMembersThisMonth / stats.activeMembers) * 100) >= 90 ? 'text-green-500' : stats.activeMembers > 0 && Math.round((stats.paidMembersThisMonth / stats.activeMembers) * 100) >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {stats.activeMembers > 0 ? Math.round((stats.paidMembersThisMonth / stats.activeMembers) * 100) : 0}%
                </Text>
                <Text className="text-[10px] text-gray-400 font-bold mt-1">
                    {stats.paidMembersThisMonth || 0} / {stats.activeMembers} Pagos
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-bold text-gray-400 uppercase">Tareas</Text>
              <TouchableOpacity onPress={() => setTaskModalVisible(true)} className="bg-blue-50 px-3 py-1 rounded-full">
                <Text className="text-[10px] font-bold text-blue-600 uppercase">+ Nueva Tarea</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8">
                {weeklyTasks.length > 0 && (
                    <View className="mb-4">
                        <Text className="text-[10px] font-bold text-gray-400 mb-3 border-b border-gray-100 pb-2">SEMANALES</Text>
                        {weeklyTasks.map(task => (
                            <TouchableOpacity 
                                key={task._id} 
                                className={`flex-row items-center mb-2 border p-3 rounded-xl ${task.completedAt ? 'bg-green-50/50 border-green-100' : 'bg-gray-50/50 border-gray-100'}`}
                                onPress={() => toggleTask(task._id)}
                            >
                                {task.completedAt ? (
                                    <CheckCircle2 color="#22c55e" size={20} className="mr-3" />
                                ) : (
                                    <Circle color="#cbd5e1" size={20} className="mr-3" />
                                )}
                                <Text className={`flex-1 font-medium text-sm ${task.completedAt ? 'text-green-700/60 line-through' : 'text-slate-700'}`}>
                                    {task.title}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {monthlyTasks.length > 0 && (
                    <View>
                        <Text className="text-[10px] font-bold text-gray-400 mb-3 border-b border-gray-100 pb-2">MENSUALES</Text>
                        {monthlyTasks.map(task => (
                            <TouchableOpacity 
                                key={task._id} 
                                className={`flex-row items-center mb-2 border p-3 rounded-xl ${task.completedAt ? 'bg-green-50/50 border-green-100' : 'bg-gray-50/50 border-gray-100'}`}
                                onPress={() => toggleTask(task._id)}
                            >
                                {task.completedAt ? (
                                    <CheckCircle2 color="#22c55e" size={20} className="mr-3" />
                                ) : (
                                    <Circle color="#cbd5e1" size={20} className="mr-3" />
                                )}
                                <Text className={`flex-1 font-medium text-sm ${task.completedAt ? 'text-green-700/60 line-through' : 'text-slate-700'}`}>
                                    {task.title}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {weeklyTasks.length === 0 && monthlyTasks.length === 0 && (
                    <Text className="text-gray-400 text-sm text-center py-4">No hay tareas configuradas.</Text>
                )}
            </View>
          </>
        )}
      </View>

      <Modal
        visible={taskModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTaskModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 h-auto shadow-xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-800">Nueva Tarea</Text>
              <TouchableOpacity onPress={() => setTaskModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Descripción de la Tarea</Text>
            <TextInput
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 mb-4 font-medium"
              placeholder="Ej: Limpiar espejos..."
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Frecuencia</Text>
            <View className="flex-row mb-6">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl border mr-2 items-center ${newTaskFreq === 'weekly' ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-200'}`}
                onPress={() => setNewTaskFreq('weekly')}
              >
                <Text className={`font-bold ${newTaskFreq === 'weekly' ? 'text-indigo-700' : 'text-gray-500'}`}>Semanal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl border ml-2 items-center ${newTaskFreq === 'monthly' ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-200'}`}
                onPress={() => setNewTaskFreq('monthly')}
              >
                <Text className={`font-bold ${newTaskFreq === 'monthly' ? 'text-indigo-700' : 'text-gray-500'}`}>Mensual</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              className="w-full bg-blue-600 rounded-xl py-4 items-center justify-center flex-row shadow-sm mb-6"
              onPress={handleCreateTask}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" className="mr-2" />
              ) : (
                <Text className="text-white font-bold text-lg">Guardar Tarea</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}
