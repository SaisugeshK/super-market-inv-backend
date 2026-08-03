import CrudPage from './CrudPage';
import holdInvoicesService from '../services/holdInvoicesService';
import { holdInvoiceSchema } from '../utils/validationSchemas';

const config = {
  title: 'Hold Invoices',
  entityName: 'Hold Invoice',
  service: holdInvoicesService,
  searchKeys: ['data'],
  defaultValues: { data: '' },
  schema: holdInvoiceSchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'data', label: 'Details' },
  ],
  fields: [{ name: 'data', label: 'Details', required: true }],
};

export default function HoldInvoices() {
  return <CrudPage config={config} />;
}
