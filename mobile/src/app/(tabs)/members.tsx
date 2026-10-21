import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { Plus } from 'lucide-react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function MembersScreen() {
  const { filter } = useLocalSearchParams();
  const initialFilter = typeof filter === 'string' ? filter : 'all';
  const [currentFilter, setCurrentFilter] = useState<string>(initialFilter);
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (filter && typeof filter === 'string') {
      setCurrentFilter(filter);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [])
  );

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/members`);
      setMembers(res.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    let result = members;
    
    if (currentFilter === 'active') {
      result = result.filter(m => m.active);
    } else if (currentFilter === 'inactive') {
      result = result.filter(m => !m.active);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m: any) => 
          (m.fullName && m.fullName.toLowerCase().includes(q)) ||
          (m.ci && m.ci.includes(q))
      );
    }
    return result;
  }, [members, currentFilter, search]);

  const renderMember = ({ item }: { item: any }) => {
    const isActive = item.active;
    return (
      <TouchableOpacity 
        className="bg-white p-4 mb-3 rounded-xl border border-gray-100 flex-row items-center justify-between"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}
        onPress={() => router.push(`/member-details/${item._id}`)}
      >
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-800">{item.fullName}</Text>
          <Text className="text-sm text-gray-500 mt-1">CI: {item.ci}</Text>
          <Text className="text-sm text-gray-500">Plan: {item.planType}</Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${isActive ? 'bg-green-100' : 'bg-red-100'}`}>
          <Text className={`text-xs font-bold ${isActive ? 'text-green-700' : 'text-red-700'}`}>
            {isActive ? 'ACTIVO' : 'INACTIVO'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 p-4 relative">
      <View className="mb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-4 mt-2">Socios</Text>
        
        <View className="flex-row mb-4 bg-gray-200 p-1 rounded-xl">
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${currentFilter === 'all' ? 'bg-white' : ''}`}
            style={currentFilter === 'all' ? { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 } : undefined}
            onPress={() => setCurrentFilter('all')}
          >
            <Text className={`font-bold text-xs ${currentFilter === 'all' ? 'text-slate-800' : 'text-slate-500'}`}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${currentFilter === 'active' ? 'bg-white' : ''}`}
            style={currentFilter === 'active' ? { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 } : undefined}
            onPress={() => setCurrentFilter('active')}
          >
            <Text className={`font-bold text-xs ${currentFilter === 'active' ? 'text-green-600' : 'text-slate-500'}`}>Activos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${currentFilter === 'inactive' ? 'bg-white' : ''}`}
            style={currentFilter === 'inactive' ? { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 } : undefined}
            onPress={() => setCurrentFilter('inactive')}
          >
            <Text className={`font-bold text-xs ${currentFilter === 'inactive' ? 'text-red-600' : 'text-slate-500'}`}>Inactivos</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          className="bg-white p-4 rounded-xl border border-gray-200 text-slate-800"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
          placeholder="Buscar por nombre o CI..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {loading && members.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item._id}
          renderItem={renderMember}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 mt-10">
              {search ? 'No se encontraron socios.' : 'No hay socios registrados.'}
            </Text>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-blue-600 w-16 h-16 rounded-full items-center justify-center"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
        onPress={() => router.push('/add-member')}
      >
        <Plus color="white" size={32} />
      </TouchableOpacity>
    </View>
  );
}
