import CrudPage from './CrudPage';
import paymentsService from '../services/paymentsService';
import { paymentSchema } from '../utils/validationSchemas';

const config = {
  title: 'Payments',
  entityName: 'Payment',
  service: paymentsService,
  searchKeys: ['paymentMethod', 'transactionReference'],
  defaultValues: { invoiceId: '', paymentMethod: '', transactionReference: '', amount: '' },
  schema: paymentSchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'invoiceId', label: 'Invoice ID', sortable: true },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'transactionReference', label: 'Reference' },
    { key: 'amount', label: 'Amount', sortable: true },
  ],
  fields: [
    { name: 'invoiceId', label: 'Invoice ID', type: 'number', required: true },
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
    { name: 'transactionReference', label: 'Transaction Reference' },
    { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
  ],
};

export default function Payments() {
  return <CrudPage config={config} />;
}
