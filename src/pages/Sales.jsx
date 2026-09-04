import { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CrudPage from './CrudPage';
import salesService from '../services/salesService';
import salesItemsService from '../services/salesItemsService';
import productsService from '../services/productsService';
import customersService from '../services/customersService';
import billingCountersService from '../services/billingCountersService';
import { saleSchema } from '../utils/validationSchemas';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import Loader from '../components/Loader';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);
const withId = (row) => ({ ...row, id: row.id ?? row.counterId ?? row.customerId });
const saleKey = (row) => row.saleId ?? row.id;

export default function Sales() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([
      customersService.getAll(),
      billingCountersService.getAll(),
      salesItemsService.getAll().catch(() => []),
      productsService.getAll().catch(() => []),
    ]).then(([customers, counters, salesItems, products]) => {
      setRefs({
        customers: asList(customers).map(withId),
        counters: asList(counters).map(withId),
        salesItems: asList(salesItems),
        products: asList(products),
      });
    });
  }, []);

  if (!refs) return <Loader label="Loading sales references..." />;
  const { customers, counters, salesItems, products } = refs;

  const handleDownloadInvoice = (row) => {
    const id = saleKey(row);
    const lines = salesItems.filter((li) => Number(li.saleId) === Number(id));
    if (lines.length === 0) {
      toast.error('No line items found for this sale');
      return;
    }
    downloadInvoicePdf({
      invoiceNumber: row.invoiceNumber,
      customerName:
        customers.find((c) => c.id === row.customerId)?.customerName ||
        (row.customerId ? undefined : 'Walk-in'),
      timestamp: row.saleDate ? String(row.saleDate).replace('T', ' ').slice(0, 16) : '',
      counterName: counters.find((c) => c.id === row.counterId)?.counterName,
      items: lines.map((li) => ({
        productName:
          products.find((p) => (p.id ?? p.productId) === li.productId)?.productName ||
          `#${li.productId}`,
        quantity: li.quantity,
        sellingPrice: li.sellingPrice,
        total: li.total,
      })),
      totals: { grandTotal: Number(row.totalAmount || 0) },
      paymentMethod: row.paymentMethod,
    });
  };

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
    rowActions: (row) => (
      <button
        className="btn btn-sm btn-outline-secondary"
        title="Download invoice"
        onClick={() => handleDownloadInvoice(row)}
      >
        <FiDownload size={14} />
      </button>
    ),
  };

  return <CrudPage config={config} />;
}
