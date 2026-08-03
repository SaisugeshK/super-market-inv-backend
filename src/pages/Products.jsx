import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import productsService from '../services/productsService';
import categoriesService from '../services/categoriesService';
import { productSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function Products() {
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    categoriesService.getAll().then((data) => {
      const list = Array.isArray(data) ? data : data?.content || [];
      setCategories(list);
    });
  }, []);

  if (!categories) return <Loader label="Loading categories..." />;

  const config = {
    title: 'Products',
    entityName: 'Product',
    service: productsService,
    searchKeys: ['productName', 'sku', 'barcode'],
    defaultValues: {
      categoryId: '',
      productName: '',
      sku: '',
      barcode: '',
      purchasePrice: '',
      sellingPrice: '',
      stockQuantity: '',
      minimumStock: '',
      unit: 'PCS',
      status: 'ACTIVE',
    },
    schema: productSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'productName', label: 'Product', sortable: true },
      { key: 'sku', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      {
        key: 'categoryId',
        label: 'Category',
        render: (row) => categories.find((c) => c.id === row.categoryId)?.categoryName || row.categoryId,
      },
      {
        key: 'sellingPrice',
        label: 'Selling Price',
        sortable: true,
        render: (row) => Number(row.sellingPrice ?? 0).toFixed(2),
      },
      {
        key: 'stockQuantity',
        label: 'Stock',
        sortable: true,
        render: (row) => (
          <span
            className={`badge ${
              Number(row.stockQuantity) <= Number(row.minimumStock)
                ? 'bg-danger'
                : 'bg-success'
            }`}
          >
            {row.stockQuantity}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <span className={`badge ${String(row.status).toUpperCase() === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
            {row.status}
          </span>
        ),
      },
    ],
    fields: [
      {
        name: 'categoryId',
        label: 'Category',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'categoryName',
        options: categories,
      },
      { name: 'productName', label: 'Product Name', required: true },
      { name: 'sku', label: 'SKU', required: true },
      { name: 'barcode', label: 'Barcode', required: true },
      { name: 'purchasePrice', label: 'Purchase Price', type: 'number', step: '0.01', required: true },
      { name: 'sellingPrice', label: 'Selling Price', type: 'number', step: '0.01', required: true },
      { name: 'stockQuantity', label: 'Stock Quantity', type: 'number', required: true },
      { name: 'minimumStock', label: 'Minimum Stock', type: 'number', required: true },
      {
        name: 'unit',
        label: 'Unit',
        type: 'select',
        required: true,
        options: [
          { value: 'PCS', label: 'PCS' },
          { value: 'KG', label: 'KG' },
          { value: 'L', label: 'Litre' },
          { value: 'BOX', label: 'Box' },
        ],
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ],
      },
    ],
  };

  return <CrudPage config={config} />;
}
