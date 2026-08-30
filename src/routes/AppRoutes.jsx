import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';

import Catalog from '../pages/Catalog';
import UsersRoles from '../pages/UsersRoles';

import PointOfSale from '../pages/PointOfSale';
import SalesHub from '../pages/SalesHub';
import Payments from '../pages/Payments';
import BillingCounters from '../pages/BillingCounters';
import CashClosing from '../pages/CashClosing';

import StockManagement from '../pages/StockManagement';
import StockMovements from '../pages/StockMovements';
import Reports from '../pages/Reports';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />

          {/* Catalog (products, categories, units, suppliers, purchases as tabs) */}
          <Route path="/catalog" element={<Catalog />} />

          {/* People */}
          <Route path="/users-roles" element={<UsersRoles />} />

          {/* Billing / POS */}
          <Route path="/billing" element={<PointOfSale />} />
          <Route path="/sales" element={<SalesHub />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/billing-counters" element={<BillingCounters />} />
          <Route path="/cash-closing" element={<CashClosing />} />

          {/* Inventory */}
          <Route path="/stock" element={<StockManagement />} />
          <Route path="/stock-movements" element={<StockMovements />} />

          {/* System */}
          <Route path="/reports" element={<Reports />} />

          {/* Legacy paths → new consolidated screens */}
          <Route path="/pos" element={<Navigate to="/billing" replace />} />
          <Route path="/products" element={<Navigate to="/catalog" replace />} />
          <Route path="/categories" element={<Navigate to="/catalog" replace />} />
          <Route path="/suppliers" element={<Navigate to="/catalog" replace />} />
          <Route path="/units" element={<Navigate to="/catalog" replace />} />
          <Route path="/purchases" element={<Navigate to="/catalog" replace />} />
          <Route path="/barcodes" element={<Navigate to="/catalog" replace />} />
          <Route path="/product-taxes" element={<Navigate to="/catalog" replace />} />
          <Route path="/customers" element={<Navigate to="/billing" replace />} />
          <Route path="/users" element={<Navigate to="/users-roles" replace />} />
          <Route path="/roles" element={<Navigate to="/users-roles" replace />} />
          <Route path="/invoices" element={<Navigate to="/sales" replace />} />
          <Route path="/invoice-items" element={<Navigate to="/sales" replace />} />
          <Route path="/sales-items" element={<Navigate to="/sales" replace />} />
          <Route path="/sales-returns" element={<Navigate to="/sales" replace />} />
          <Route path="/sales-return-items" element={<Navigate to="/sales" replace />} />
          <Route path="/purchase-items" element={<Navigate to="/catalog" replace />} />
          <Route path="/purchase-returns" element={<Navigate to="/catalog" replace />} />
          <Route path="/purchase-return-items" element={<Navigate to="/catalog" replace />} />
          <Route path="/hold-invoices" element={<Navigate to="/billing" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
