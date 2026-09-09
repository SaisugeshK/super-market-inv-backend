import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Gate for admin-only screens. A non-admin who reaches one of these URLs is
 * sent back to the dashboard rather than shown a screen whose API calls 403.
 */
export default function AdminRoute() {
  const { user, initializing } = useAuth();
  if (initializing) return null;

  const isAdmin = String(user?.roleName || '').toUpperCase() === 'ADMIN';
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
