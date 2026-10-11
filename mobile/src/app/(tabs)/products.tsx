import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert, Modal, ScrollView } from 'react-native';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import { Package, X } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Product State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', salePrice: '', stock: '' });

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data);
      if (search) {
        setFilteredProducts(res.data.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase())));
      } else {
        setFilteredProducts(res.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (text) {
      setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(text.toLowerCase())));
    } else {
      setFilteredProducts(products);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(amount);
  };

  const openEditModal = (product: any) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      salePrice: product.salePrice.toString(),
      stock: product.stock.toString()
    });
    setEditModalVisible(true);
  };

  const handleUpdateProduct = async () => {
    if (!editForm.name.trim() || !editForm.salePrice.trim() || !editForm.stock.trim()) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    try {
      setLoading(true);
      await axios.put(`${API_URL}/products/${selectedProduct._id}`, {
        name: editForm.name,
        salePrice: Number(editForm.salePrice),
        stock: Number(editForm.stock)
      });
      setEditModalVisible(false);
      Alert.alert('Éxito', 'Producto actualizado correctamente');
      fetchProducts();
    } catch (error: any) {
      console.error('Error updating product:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al actualizar el producto');
      setLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: any }) => {
    const isLowStock = item.stock <= 5;
    return (
      <TouchableOpacity 
        className="bg-white p-4 mb-3 rounded-xl shadow-sm border border-gray-100 flex-row items-center justify-between"
        onPress={() => openEditModal(item)}
      >
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 bg-indigo-50 rounded-lg justify-center items-center mr-4">
            <Package color="#6366f1" size={24} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-800">{item.name}</Text>
            <Text className="text-sm text-gray-500 mt-1">Precio: {formatCurrency(item.salePrice)}</Text>
          </View>
        </View>
        <View className="items-end">
          <View className={`px-3 py-1 rounded-full ${isLowStock ? 'bg-red-100' : 'bg-green-100'}`}>
            <Text className={`text-xs font-bold ${isLowStock ? 'text-red-700' : 'text-green-700'}`}>
              Stock: {item.stock}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 p-4 relative">
      <View className="mb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-4 mt-2">Inventario</Text>
        <TextInput
          className="bg-white p-4 rounded-xl border border-gray-200 text-slate-800 shadow-sm"
          placeholder="Buscar producto..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {loading && products.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item._id}
          renderItem={renderProduct}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 mt-10">
              {search ? 'No se encontraron productos.' : 'No hay productos en inventario.'}
            </Text>
          }
        />
      )}

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 h-auto shadow-xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-800">Editar Producto</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} className="bg-gray-100 p-2 rounded-full">
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Nombre del Producto</Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 mb-4 font-medium"
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
              />

              <View className="flex-row justify-between mb-8">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Precio (UYU)</Text>
                  <TextInput
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                    keyboardType="numeric"
                    value={editForm.salePrice}
                    onChangeText={(text) => setEditForm({ ...editForm, salePrice: text })}
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Stock</Text>
                  <TextInput
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                    keyboardType="numeric"
                    value={editForm.stock}
                    onChangeText={(text) => setEditForm({ ...editForm, stock: text })}
                  />
                </View>
              </View>

              <TouchableOpacity 
                className="w-full bg-indigo-500 rounded-xl py-4 items-center justify-center flex-row shadow-sm mb-6"
                onPress={handleUpdateProduct}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" className="mr-2" />
                ) : (
                  <Text className="text-white font-bold text-lg">Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
