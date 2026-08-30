import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import salesService from '../services/salesService';
import customersService from '../services/customersService';
import billingCountersService from '../services/billingCountersService';
import { saleSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);
const withId = (row) => ({ ...row, id: row.id ?? row.counterId ?? row.customerId });

export default function Sales() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([customersService.getAll(), billingCountersService.getAll()]).then(
      ([customers, counters]) => {
        setRefs({
          customers: asList(customers).map(withId),
          counters: asList(counters).map(withId),
        });
      }
    );
  }, []);

  if (!refs) return <Loader label="Loading sales references..." />;
  const { customers, counters } = refs;

  const config = {
    title: 'Sales',
    entityName: 'Sale',
    service: salesService,
    compact: true,
    searchKeys: ['invoiceNumber', 'paymentStatus', 'paymentMethod'],
    defaultValues: {
      customerId: '',
      counterId: '',
      invoiceNumber: '',
      totalAmount: '',
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
    },
    schema: saleSchema,
    columns: [
      { key: 'saleId', label: 'ID', sortable: true },
      {
        key: 'customerId',
        label: 'Customer',
        render: (row) =>
          customers.find((c) => (c.id ?? c.customerId) === row.customerId)?.customerName ||
          (row.customerId ? row.customerId : 'Walk-in'),
      },
      { key: 'invoiceNumber', label: 'Invoice #' },
      {
        key: 'counterId',
        label: 'Counter',
        render: (row) =>
          counters.find((c) => c.id === row.counterId)?.counterName || row.counterId || '—',
      },
      { key: 'totalAmount', label: 'Total', sortable: true },
      { key: 'paymentMethod', label: 'Method' },
      { key: 'paymentStatus', label: 'Status' },
    ],
    fields: [
      {
        name: 'customerId',
        label: 'Customer (optional for walk-in)',
        type: 'select',
        valueKey: 'id',
        labelKey: 'customerName',
        options: customers,
      },
      {
        name: 'counterId',
        label: 'Billing Counter',
        type: 'select',
        valueKey: 'id',
        labelKey: 'counterName',
        options: counters,
      },
      { name: 'invoiceNumber', label: 'Invoice Number (auto-generated if blank)' },
      { name: 'totalAmount', label: 'Total Amount', type: 'number', step: '0.01' },
      {
        name: 'paymentMethod',
        label: 'Payment Method',
        type: 'select',
        options: [
          { value: 'CASH', label: 'Cash' },
          { value: 'UPI', label: 'UPI' },
          { value: 'CARD', label: 'Card' },
        ],
      },
      {
        name: 'paymentStatus',
        label: 'Payment Status',
        type: 'select',
        options: [
          { value: 'PAID', label: 'Paid' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'UNPAID', label: 'Unpaid' },
        ],
      },
    ],
  };

  return <CrudPage config={config} />;
}
