import CrudPage from './CrudPage';
import customersService from '../services/customersService';
import { customerSchema } from '../utils/validationSchemas';

const config = {
  title: 'Customers',
  entityName: 'Customer',
  service: customersService,
  searchKeys: ['customerName', 'phone', 'email'],
  defaultValues: { customerName: '', phone: '', email: '', address: '', status: 'active' },
  schema: customerSchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'customerName', label: 'Customer', sortable: true },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`badge ${String(row.status).toLowerCase() === 'active' ? 'bg-success' : 'bg-secondary'}`}>
          {row.status}
        </span>
      ),
    },
  ],
  fields: [
    { name: 'customerName', label: 'Customer Name', required: true },
    { name: 'phone', label: 'Phone', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'address', label: 'Address' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ],
};

export default function Customers() {
  return <CrudPage config={config} />;
}
