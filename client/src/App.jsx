import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { Toaster } from 'sonner';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Inventory from './pages/Inventory';
import Finances from './pages/Finances';
import Payments from './pages/Payments';
import Admin from './pages/Admin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const token = localStorage.getItem('token');

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

import { TenantProvider } from './context/TenantContext';

function App() {
  return (
    <TenantProvider>
      <Toaster richColors position="top-right" />

      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/superadmin" element={
            <ProtectedRoute>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="finances" element={<Finances />} />
            <Route path="payments" element={<Payments />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TenantProvider>
  );
}

export default App;
