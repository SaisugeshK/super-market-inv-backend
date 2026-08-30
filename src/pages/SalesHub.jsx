import { FiShoppingCart, FiFileText, FiRotateCcw, FiList } from 'react-icons/fi';
import Tabs from '../components/Tabs';
import Sales from './Sales';
import SalesItems from './SalesItems';
import SalesReturns from './SalesReturns';
import SalesReturnItems from './SalesReturnItems';

export default function SalesHub() {
  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Sales</h1>
      </div>
      <Tabs
        storageKey="erp.sales.tab"
        tabs={[
          { key: 'sales', label: 'Sales', icon: FiShoppingCart, element: <Sales /> },
          { key: 'items', label: 'Sales Items', icon: FiFileText, element: <SalesItems /> },
          { key: 'returns', label: 'Sales Returns', icon: FiRotateCcw, element: <SalesReturns /> },
          { key: 'returnItems', label: 'Return Items', icon: FiList, element: <SalesReturnItems /> },
        ]}
      />
    </div>
  );
}
