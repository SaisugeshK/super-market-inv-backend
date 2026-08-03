import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';

import Categories from '../pages/Categories';
import Products from '../pages/Products';
import Barcodes from '../pages/Barcodes';
import Units from '../pages/Units';
import ProductTaxes from '../pages/ProductTaxes';

import Customers from '../pages/Customers';
import Suppliers from '../pages/Suppliers';
import Users from '../pages/Users';
import Roles from '../pages/Roles';

import Purchases from '../pages/Purchases';
import PurchaseItems from '../pages/PurchaseItems';
import PurchaseReturns from '../pages/PurchaseReturns';
import PurchaseReturnItems from '../pages/PurchaseReturnItems';

import PointOfSale from '../pages/PointOfSale';
import Invoices from '../pages/Invoices';
import InvoiceItems from '../pages/InvoiceItems';
import Sales from '../pages/Sales';
import SalesItems from '../pages/SalesItems';
import SalesReturns from '../pages/SalesReturns';
import SalesReturnItems from '../pages/SalesReturnItems';
import HoldInvoices from '../pages/HoldInvoices';
import Payments from '../pages/Payments';
import BillingCounters from '../pages/BillingCounters';
import CashClosing from '../pages/CashClosing';

import StockMovements from '../pages/StockMovements';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route path="/categories" element={<Categories />} />
          <Route path="/products" element={<Products />} />
          <Route path="/barcodes" element={<Barcodes />} />
          <Route path="/units" element={<Units />} />
          <Route path="/product-taxes" element={<ProductTaxes />} />

          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/users" element={<Users />} />
          <Route path="/roles" element={<Roles />} />

          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchase-items" element={<PurchaseItems />} />
          <Route path="/purchase-returns" element={<PurchaseReturns />} />
          <Route path="/purchase-return-items" element={<PurchaseReturnItems />} />

          <Route path="/pos" element={<PointOfSale />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoice-items" element={<InvoiceItems />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales-items" element={<SalesItems />} />
          <Route path="/sales-returns" element={<SalesReturns />} />
          <Route path="/sales-return-items" element={<SalesReturnItems />} />
          <Route path="/hold-invoices" element={<HoldInvoices />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/billing-counters" element={<BillingCounters />} />
          <Route path="/cash-closing" element={<CashClosing />} />

          <Route path="/stock-movements" element={<StockMovements />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
