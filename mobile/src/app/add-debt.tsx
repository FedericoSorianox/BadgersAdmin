import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { ArrowLeft, ChevronDown, X } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const SelectionModal = ({ visible, onClose, data, onSelect, title, renderItemText }: any) => (
  <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
    <View className="flex-1 justify-end bg-black/50">
      <View className="bg-white rounded-t-3xl p-6 h-2/3 shadow-xl">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-slate-800">{title}</Text>
          <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
            <X color="#64748b" size={20} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="py-4 border-b border-gray-100 flex-row justify-between items-center"
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text className="text-lg text-slate-700">{renderItemText(item)}</Text>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  </Modal>
);

export default function AddDebtScreen() {
  const [members, setMembers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState('1');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [membersRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/members`),
        axios.get(`${API_URL}/products`)
      ]);
      setMembers(membersRes.data);
      setProducts(productsRes.data);
      
      if (membersRes.data.length > 0) setSelectedMember(membersRes.data[0]);
      if (productsRes.data.length > 0) setSelectedProduct(productsRes.data[0]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    const qty = parseInt(quantity) || 0;
    return selectedProduct.salePrice * qty;
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!selectedMember || !selectedProduct) {
      Alert.alert('Error', 'Debe seleccionar un socio y un producto.');
      return;
    }
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0.');
      return;
    }

    if (selectedProduct.stock < qty) {
      Alert.alert('Error', `Stock insuficiente para ${selectedProduct.name}. Stock actual: ${selectedProduct.stock}`);
      return;
    }

    try {
      setLoading(true);
      const totalAmount = calculateTotal();
      
      const payload = {
        memberId: selectedMember._id,
        memberName: selectedMember.fullName,
        products: [
          {
            productId: selectedProduct._id,
            productName: selectedProduct.name,
            quantity: qty
          }
        ],
        totalAmount
      };

      await axios.post(`${API_URL}/debts`, payload);
      
      Alert.alert('Éxito', 'Fiado registrado correctamente.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error saving debt:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al guardar el fiado.');
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
        <Text className="text-xl font-bold text-white">Nuevo Fiado</Text>
      </View>

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        {loadingData ? (
           <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
        ) : (
          <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8">
            
            <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Seleccionar Socio</Text>
            <TouchableOpacity 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-5 flex-row justify-between items-center"
                onPress={() => setMemberModalVisible(true)}
            >
                <Text className={`text-base ${selectedMember ? 'text-slate-800 font-medium' : 'text-gray-400'}`}>
                    {selectedMember ? selectedMember.fullName : 'Toca para seleccionar...'}
                </Text>
                <ChevronDown color="#9ca3af" size={20} />
            </TouchableOpacity>

            <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Seleccionar Producto</Text>
            <TouchableOpacity 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-6 flex-row justify-between items-center"
                onPress={() => setProductModalVisible(true)}
            >
                <Text className={`text-base ${selectedProduct ? 'text-slate-800 font-medium' : 'text-gray-400'}`}>
                    {selectedProduct ? `${selectedProduct.name} ($${selectedProduct.salePrice})` : 'Toca para seleccionar...'}
                </Text>
                <ChevronDown color="#9ca3af" size={20} />
            </TouchableOpacity>

            <View className="flex-row items-center justify-between mb-8">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Cantidad</Text>
                <TextInput
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 text-lg font-medium"
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Total (UYU)</Text>
                <View className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3">
                  <Text className="text-slate-800 font-bold text-lg">${calculateTotal()}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              className="w-full bg-orange-500 rounded-xl py-4 items-center justify-center flex-row shadow-sm"
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" className="mr-2" />
              ) : (
                <Text className="text-white font-bold text-lg">Registrar Fiado</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals for selection */}
      <SelectionModal 
        visible={memberModalVisible} 
        onClose={() => setMemberModalVisible(false)} 
        data={members} 
        onSelect={setSelectedMember} 
        title="Selecciona un Socio" 
        renderItemText={(item: any) => item.fullName} 
      />
      
      <SelectionModal 
        visible={productModalVisible} 
        onClose={() => setProductModalVisible(false)} 
        data={products} 
        onSelect={setSelectedProduct} 
        title="Selecciona un Producto" 
        renderItemText={(item: any) => `${item.name} ($${item.salePrice})`} 
      />
    </View>
  );
}
