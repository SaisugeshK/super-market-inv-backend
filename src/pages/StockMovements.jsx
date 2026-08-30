import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import stockMovementsService from '../services/stockMovementsService';
import productsService from '../services/productsService';
import { stockMovementSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

// Backend now records movements automatically as PURCHASE_IN / SALE_OUT too.
const isInbound = (type) => String(type).toUpperCase().includes('IN');

export default function StockMovements() {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    productsService.getAll().then((data) => {
      const list = Array.isArray(data) ? data : data?.content || [];
      setProducts(list);
    });
  }, []);

  if (!products) return <Loader label="Loading products..." />;

  const config = {
    title: 'Stock Movements',
    entityName: 'Stock Movement',
    service: stockMovementsService,
    keyField: 'movementId',
    searchKeys: ['notes', 'productName', 'movementType'],
    defaultValues: { productId: '', movementType: 'IN', quantity: '', notes: '' },
    schema: stockMovementSchema,
    columns: [
      { key: 'movementId', label: 'ID', sortable: true },
      {
        key: 'productName',
        label: 'Product',
        render: (row) =>
          row.productName ||
          products.find((p) => (p.id ?? p.productId) === row.productId)?.productName ||
          row.productId,
      },
      {
        key: 'movementType',
        label: 'Type',
        render: (row) => (
          <span className={`badge ${isInbound(row.movementType) ? 'bg-success' : 'bg-danger'}`}>
            {row.movementType}
          </span>
        ),
      },
      { key: 'quantity', label: 'Quantity', sortable: true },
      { key: 'referenceId', label: 'Ref #' },
      { key: 'notes', label: 'Notes' },
    ],
    fields: [
      {
        name: 'productId',
        label: 'Product',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'productName',
        options: products.map((p) => ({ ...p, id: p.id ?? p.productId })),
      },
      {
        name: 'movementType',
        label: 'Movement Type',
        type: 'select',
        required: true,
        options: [
          { value: 'IN', label: 'Stock In (manual)' },
          { value: 'OUT', label: 'Stock Out (manual)' },
        ],
      },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true },
      { name: 'notes', label: 'Notes' },
    ],
  };

  return <CrudPage config={config} />;
}
