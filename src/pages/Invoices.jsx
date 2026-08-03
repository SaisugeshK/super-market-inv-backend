import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import invoicesService from '../services/invoicesService';
import customersService from '../services/customersService';
import billingCountersService from '../services/billingCountersService';
import { invoiceSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function Invoices() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([customersService.getAll(), billingCountersService.getAll()]).then(
      ([customers, counters]) => {
        setRefs({
          customers: Array.isArray(customers) ? customers : customers?.content || [],
          counters: Array.isArray(counters) ? counters : counters?.content || [],
        });
      }
    );
  }, []);

  if (!refs) return <Loader label="Loading references..." />;
  const { customers, counters } = refs;

  const config = {
    title: 'Invoices',
    entityName: 'Invoice',
    service: invoicesService,
    searchKeys: ['invoiceNumber', 'paymentStatus'],
    defaultValues: {
      invoiceNumber: '',
      customerId: '',
      counterId: '',
      subtotal: '',
      discountAmount: '0',
      taxAmount: '0',
      grandTotal: '',
      paidAmount: '',
      balanceAmount: '0',
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
    },
    schema: invoiceSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'invoiceNumber', label: 'Invoice #', sortable: true },
      {
        key: 'customerId',
        label: 'Customer',
        render: (row) => customers.find((c) => c.id === row.customerId)?.customerName || row.customerId,
      },
      { key: 'grandTotal', label: 'Grand Total', sortable: true },
      { key: 'paidAmount', label: 'Paid' },
      { key: 'balanceAmount', label: 'Balance' },
      {
        key: 'paymentStatus',
        label: 'Status',
        render: (row) => (
          <span className={`badge ${row.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`}>
            {row.paymentStatus}
          </span>
        ),
      },
    ],
    fields: [
      { name: 'invoiceNumber', label: 'Invoice Number', required: true },
      {
        name: 'customerId',
        label: 'Customer',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'customerName',
        options: customers,
      },
      {
        name: 'counterId',
        label: 'Billing Counter',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'counterName',
        options: counters,
      },
      { name: 'subtotal', label: 'Subtotal', type: 'number', step: '0.01', required: true },
      { name: 'discountAmount', label: 'Discount Amount', type: 'number', step: '0.01', required: true },
      { name: 'taxAmount', label: 'Tax Amount', type: 'number', step: '0.01', required: true },
      { name: 'grandTotal', label: 'Grand Total', type: 'number', step: '0.01', required: true },
      { name: 'paidAmount', label: 'Paid Amount', type: 'number', step: '0.01', required: true },
      { name: 'balanceAmount', label: 'Balance Amount', type: 'number', step: '0.01', required: true },
      {
        name: 'paymentMethod',
        label: 'Payment Method',
        type: 'select',
        required: true,
        options: [
          { value: 'CASH', label: 'Cash' },
          { value: 'CARD', label: 'Card' },
          { value: 'G-PAY', label: 'G-Pay / UPI' },
        ],
      },
      {
        name: 'paymentStatus',
        label: 'Payment Status',
        type: 'select',
        required: true,
        options: [
          { value: 'PAID', label: 'Paid' },
          { value: 'UNPAID', label: 'Unpaid' },
          { value: 'PENDING', label: 'Pending' },
        ],
      },
    ],
  };

  return <CrudPage config={config} />;
}
