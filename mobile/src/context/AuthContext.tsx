import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { router } from 'expo-router';

export const AuthContext = createContext<any>(null);

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        // You could fetch the user profile here or verify the token
        setUser({ token });
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('Failed to load user', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string, gymSlug: string) => {
    try {
      setLoading(true);
      // We pass gymSlug as a header to resolve the tenant on the backend
      const headers = gymSlug ? { 'x-tenant-slug': gymSlug } : {};
      const res = await axios.post(
        `${API_URL}/auth/login`, 
        { username, password },
        { headers }
      );
      const { token, user: userData } = res.data;
      
      await SecureStore.setItemAsync('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      // Navigate to home after successful login
      router.replace('/(tabs)');
      return { success: true };
    } catch (error: any) {
      console.log('Login error:', error.response?.data || error.message);
      return { success: false, message: error.response?.data?.message || 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    router.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
