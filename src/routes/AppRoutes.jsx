import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';

import Products from '../pages/Products';
import Suppliers from '../pages/Suppliers';
import Purchases from '../pages/Purchases';
import UsersRoles from '../pages/UsersRoles';

import PointOfSale from '../pages/PointOfSale';
import SalesHub from '../pages/SalesHub';
import Payments from '../pages/Payments';
import BillingCounters from '../pages/BillingCounters';
import CashClosing from '../pages/CashClosing';

import StockPage from '../pages/StockPage';
import Reports from '../pages/Reports';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />

          {/* Catalog & stock */}
          <Route path="/products" element={<Products />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/stock-movements" element={<Navigate to="/stock" replace />} />

          {/* Buying */}
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchases" element={<Purchases />} />

          {/* People */}
          <Route path="/users-roles" element={<UsersRoles />} />

          {/* Billing / POS */}
          <Route path="/billing" element={<PointOfSale />} />
          <Route path="/sales" element={<SalesHub />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/billing-counters" element={<BillingCounters />} />
          <Route path="/cash-closing" element={<CashClosing />} />

          {/* System */}
          <Route path="/reports" element={<Reports />} />

          {/* Legacy paths → current screens */}
          <Route path="/pos" element={<Navigate to="/billing" replace />} />
          <Route path="/catalog" element={<Navigate to="/products" replace />} />
          <Route path="/categories" element={<Navigate to="/products" replace />} />
          <Route path="/units" element={<Navigate to="/products" replace />} />
          <Route path="/barcodes" element={<Navigate to="/products" replace />} />
          <Route path="/product-taxes" element={<Navigate to="/products" replace />} />
          <Route path="/customers" element={<Navigate to="/billing" replace />} />
          <Route path="/users" element={<Navigate to="/users-roles" replace />} />
          <Route path="/roles" element={<Navigate to="/users-roles" replace />} />
          <Route path="/invoices" element={<Navigate to="/sales" replace />} />
          <Route path="/invoice-items" element={<Navigate to="/sales" replace />} />
          <Route path="/sales-items" element={<Navigate to="/sales" replace />} />
          <Route path="/sales-returns" element={<Navigate to="/sales" replace />} />
          <Route path="/sales-return-items" element={<Navigate to="/sales" replace />} />
          <Route path="/purchase-items" element={<Navigate to="/purchases" replace />} />
          <Route path="/purchase-returns" element={<Navigate to="/purchases" replace />} />
          <Route path="/purchase-return-items" element={<Navigate to="/purchases" replace />} />
          <Route path="/hold-invoices" element={<Navigate to="/billing" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
