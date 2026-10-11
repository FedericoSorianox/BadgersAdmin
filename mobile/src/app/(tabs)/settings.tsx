import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useContext(AuthContext);

  const SettingOption = ({ title, value, isDestructive = false, onPress }: { title: string, value?: string, isDestructive?: boolean, onPress?: () => void }) => (
    <TouchableOpacity 
      onPress={onPress}
      className={`flex-row justify-between items-center bg-white p-4 mb-2 rounded-xl border ${isDestructive ? 'border-red-100' : 'border-gray-100'} shadow-sm`}
    >
      <Text className={`text-lg font-medium ${isDestructive ? 'text-red-500' : 'text-slate-800'}`}>{title}</Text>
      {value && <Text className="text-gray-400">{value}</Text>}
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4" showsVerticalScrollIndicator={false}>
      <View className="mb-6 mt-4 items-center">
        <View className="w-24 h-24 bg-blue-100 rounded-full justify-center items-center mb-4">
          <Text className="text-4xl font-bold text-blue-500">
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900">{user?.username || 'Usuario'}</Text>
        <Text className="text-gray-500 uppercase font-medium mt-1">{user?.role || 'Admin'}</Text>
      </View>

      <Text className="text-sm font-bold text-gray-400 mb-2 ml-2 uppercase">Cuenta</Text>
      <SettingOption title="Cambiar Contraseña" />
      <SettingOption title="Notificaciones" value="Activadas" />
      <SettingOption title="Idioma" value="Español" />

      <Text className="text-sm font-bold text-gray-400 mb-2 ml-2 uppercase mt-6">Sistema</Text>
      <SettingOption title="Soporte Técnico" />
      <SettingOption title="Versión de la App" value="1.0.0" />
      
      <View className="mt-8 mb-10">
        <SettingOption title="Cerrar Sesión" isDestructive={true} onPress={logout} />
      </View>
    </ScrollView>
  );
}
