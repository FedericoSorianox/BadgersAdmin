import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Shield } from 'lucide-react-native';

export default function LoginScreen() {
  const [gymSlug, setGymSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useContext(AuthContext);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Por favor completa usuario y contraseña.');
      return;
    }
    setError('');
    const res = await login(username, password, gymSlug.trim());
    if (!res.success) {
      setError(res.message);
    }
  };

  return (
    <View className="flex-1 bg-white justify-center items-center p-6">
      <View className="items-center mb-10">
        <View className="bg-slate-900 p-4 rounded-full mb-4">
          <Shield size={40} color="white" />
        </View>
        <Text className="text-3xl font-bold text-slate-900">GymWorks Pro</Text>
        <Text className="text-gray-500 mt-2">Inicia sesión en tu academia</Text>
      </View>

      <View className="w-full">
        <Text className="text-sm font-medium text-gray-700 mb-1 ml-1">Código del Gimnasio (Opcional)</Text>
        <TextInput
          className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          placeholder="Dejar vacío para The Badgers"
          value={gymSlug}
          onChangeText={setGymSlug}
          autoCapitalize="none"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1 ml-1">Usuario</Text>
        <TextInput
          className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          placeholder="admin..."
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1 ml-1">Contraseña</Text>
        <TextInput
          className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-6"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text className="text-red-500 text-center mb-4">{error}</Text> : null}

        <TouchableOpacity 
          className="w-full bg-slate-900 rounded-xl py-4 items-center justify-center flex-row"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" className="mr-2" />
          ) : (
            <Text className="text-white font-bold text-lg">Ingresar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
