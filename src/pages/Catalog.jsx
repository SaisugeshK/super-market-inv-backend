import { FiBox, FiTruck, FiShoppingCart } from 'react-icons/fi';
import Tabs from '../components/Tabs';
import Products from './Products';
import Suppliers from './Suppliers';
import Purchases from './Purchases';

export default function Catalog() {
  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Catalog</h1>
      </div>
      <Tabs
        storageKey="erp.catalog.tab"
        tabs={[
          { key: 'products', label: 'Products', icon: FiBox, element: <Products /> },
          { key: 'suppliers', label: 'Suppliers', icon: FiTruck, element: <Suppliers compact /> },
          { key: 'purchases', label: 'Purchases', icon: FiShoppingCart, element: <Purchases compact /> },
        ]}
      />
    </div>
  );
}
