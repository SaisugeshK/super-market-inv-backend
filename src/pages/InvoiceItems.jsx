import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import invoiceItemsService from '../services/invoiceItemsService';
import invoicesService from '../services/invoicesService';
import productsService from '../services/productsService';
import { invoiceItemSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function InvoiceItems() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([invoicesService.getAll(), productsService.getAll()]).then(
      ([invoices, products]) => {
        setRefs({
          invoices: Array.isArray(invoices) ? invoices : invoices?.content || [],
          products: Array.isArray(products) ? products : products?.content || [],
        });
      }
    );
  }, []);

  if (!refs) return <Loader label="Loading references..." />;
  const { invoices, products } = refs;

  const config = {
    title: 'Invoice Items',
    entityName: 'Invoice Item',
    service: invoiceItemsService,
    searchKeys: ['barcode'],
    defaultValues: {
      invoiceId: '',
      productId: '',
      barcode: '',
      quantity: '',
      unitPrice: '',
      discount: '0',
      taxPercentage: '0',
      taxAmount: '0',
      totalAmount: '',
    },
    schema: invoiceItemSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'invoiceId', label: 'Invoice ID' },
      {
        key: 'productId',
        label: 'Product',
        render: (row) => products.find((p) => p.id === row.productId)?.productName || row.productId,
      },
      { key: 'quantity', label: 'Qty' },
      { key: 'unitPrice', label: 'Unit Price' },
      { key: 'totalAmount', label: 'Total' },
    ],
    fields: [
      {
        name: 'invoiceId',
        label: 'Invoice',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'invoiceNumber',
        options: invoices,
      },
      {
        name: 'productId',
        label: 'Product',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'productName',
        options: products,
      },
      { name: 'barcode', label: 'Barcode', required: true },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true },
      { name: 'unitPrice', label: 'Unit Price', type: 'number', step: '0.01', required: true },
      { name: 'discount', label: 'Discount', type: 'number', step: '0.01', required: true },
      { name: 'taxPercentage', label: 'Tax Percentage', type: 'number', step: '0.01', required: true },
      { name: 'taxAmount', label: 'Tax Amount', type: 'number', step: '0.01', required: true },
      { name: 'totalAmount', label: 'Total Amount', type: 'number', step: '0.01', required: true },
    ],
  };

  return <CrudPage config={config} />;
}
