import { FiLayers, FiActivity } from 'react-icons/fi';
import Tabs from '../components/Tabs';
import StockManagement from './StockManagement';
import StockMovements from './StockMovements';

export default function StockPage() {
  return (
    <div>
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title">Stock</h1>
          <p className="erp-page-subtitle">On-hand levels and the movements behind them</p>
        </div>
      </div>
      <Tabs
        storageKey="erp.stock.tab"
        tabs={[
          { key: 'levels', label: 'Levels', icon: FiLayers, element: <StockManagement compact /> },
          { key: 'movements', label: 'Movements', icon: FiActivity, element: <StockMovements /> },
        ]}
      />
    </div>
  );
}
