import { useCallback, useEffect, useState } from 'react';
import { FiFileText, FiShoppingCart, FiTruck, FiActivity, FiBarChart2 } from 'react-icons/fi';
import reportsService from '../services/reportsService';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

const TABS = [
  { key: 'sales', label: 'Sales', icon: FiFileText },
  { key: 'purchases', label: 'Purchases', icon: FiShoppingCart },
  { key: 'supplierOutstanding', label: 'Supplier Outstanding', icon: FiTruck },
  { key: 'stock', label: 'Stock', icon: FiActivity },
  { key: 'productSales', label: 'Product Sales', icon: FiBarChart2 },
];

const money = (v) => Number(v || 0).toFixed(2);
// datetime-local value -> ISO date-time the backend's @DateTimeFormat accepts
const toIso = (v) => (v ? `${v}:00` : undefined);

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [counterId, setCounterId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [supplierId, setSupplierId] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (tab === 'sales') {
        data = await reportsService.sales({
          from: toIso(from),
          to: toIso(to),
          counterId: counterId || undefined,
          paymentMethod: paymentMethod || undefined,
          invoiceNumber: invoiceNumber || undefined,
        });
      } else if (tab === 'purchases') {
        data = await reportsService.purchases({
          supplierId: supplierId || undefined,
          from: toIso(from),
          to: toIso(to),
        });
      } else if (tab === 'supplierOutstanding') {
        data = await reportsService.supplierOutstanding();
      } else if (tab === 'stock') {
        data = await reportsService.stock();
      } else if (tab === 'productSales') {
        data = await reportsService.productSales({ from: toIso(from), to: toIso(to) });
      }
      setRows(asList(data));
    } catch (err) {
      setError(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab, from, to, invoiceNumber, counterId, paymentMethod, supplierId]);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const dateFilters = (
    <>
      <div className="col-auto">
        <label className="form-label small mb-1">From</label>
        <input type="datetime-local" className="form-control form-control-sm"
          value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="col-auto">
        <label className="form-label small mb-1">To</label>
        <input type="datetime-local" className="form-control form-control-sm"
          value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
    </>
  );

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Reports</h1>
      </div>

      <ul className="nav nav-tabs mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              className={`nav-link d-flex align-items-center gap-1 ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={14} /> {t.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Filters */}
      {(tab === 'sales' || tab === 'purchases' || tab === 'productSales') && (
        <div className="erp-card p-3 mb-3">
          <div className="row g-2 align-items-end">
            {dateFilters}
            {tab === 'sales' && (
              <>
                <div className="col-auto">
                  <label className="form-label small mb-1">Invoice #</label>
                  <input className="form-control form-control-sm" value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>
                <div className="col-auto">
                  <label className="form-label small mb-1">Counter ID</label>
                  <input className="form-control form-control-sm" value={counterId}
                    onChange={(e) => setCounterId(e.target.value)} style={{ width: 100 }} />
                </div>
                <div className="col-auto">
                  <label className="form-label small mb-1">Payment Method</label>
                  <select className="form-select form-select-sm" value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="">Any</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
              </>
            )}
            {tab === 'purchases' && (
              <div className="col-auto">
                <label className="form-label small mb-1">Supplier ID</label>
                <input className="form-control form-control-sm" value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)} style={{ width: 100 }} />
              </div>
            )}
            <div className="col-auto">
              <button className="btn btn-sm btn-primary" onClick={fetchReport}>Apply</button>
            </div>
          </div>
        </div>
      )}

      <div className="erp-card p-3">
        {loading ? (
          <Loader label="Building report..." />
        ) : error ? (
          <EmptyState title="Could not load report" message="The report endpoint returned an error." />
        ) : rows.length === 0 ? (
          <EmptyState title="No data" message="No records match this report / filter." />
        ) : (
          <div className="table-responsive">
            {tab === 'sales' && <SalesTable rows={rows} />}
            {tab === 'purchases' && <PurchasesTable rows={rows} />}
            {tab === 'supplierOutstanding' && <SupplierOutstandingTable rows={rows} />}
            {tab === 'stock' && <StockTable rows={rows} />}
            {tab === 'productSales' && <GenericTable rows={rows} />}
          </div>
        )}
      </div>
    </div>
  );
}

function SalesTable({ rows }) {
  return (
    <table className="table table-sm mb-0">
      <thead>
        <tr>
          <th>Invoice #</th><th>Date</th><th>Customer</th><th>Counter</th>
          <th>Method</th><th>Status</th><th>Items</th><th className="text-end">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.saleId}>
            <td>{r.invoiceNumber}</td>
            <td>{r.saleDate ? String(r.saleDate).replace('T', ' ').slice(0, 16) : '—'}</td>
            <td>{r.customerName || 'Walk-in'}</td>
            <td>{r.counterId ?? '—'}</td>
            <td>{r.paymentMethod || '—'}</td>
            <td>{r.paymentStatus || '—'}</td>
            <td>
              {(r.items || [])
                .map((it) => `${it.productName} ×${it.quantity}`)
                .join(', ') || '—'}
            </td>
            <td className="text-end">{money(r.totalAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PurchasesTable({ rows }) {
  return (
    <table className="table table-sm mb-0">
      <thead>
        <tr>
          <th>Invoice #</th><th>Date</th><th>Supplier</th><th>Items</th>
          <th className="text-end">Total</th><th className="text-end">Paid</th>
          <th className="text-end">Pending</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.purchaseId}>
            <td>{r.invoiceNumber}</td>
            <td>{r.purchaseDate ? String(r.purchaseDate).replace('T', ' ').slice(0, 16) : '—'}</td>
            <td>{r.supplierName}</td>
            <td>
              {(r.items || [])
                .map((it) => `${it.productName} ×${it.quantity}${it.unit ? ' ' + it.unit : ''}`)
                .join(', ') || '—'}
            </td>
            <td className="text-end">{money(r.totalAmount)}</td>
            <td className="text-end">{money(r.paidAmount)}</td>
            <td className="text-end">{money(r.pendingAmount)}</td>
            <td>{r.paymentStatus}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SupplierOutstandingTable({ rows }) {
  return (
    <table className="table table-sm mb-0">
      <thead>
        <tr>
          <th>Supplier</th>
          <th className="text-end">Total Purchases</th>
          <th className="text-end">Total Paid</th>
          <th className="text-end">Total Pending</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.supplierId}>
            <td>{r.supplierName}</td>
            <td className="text-end">{money(r.totalPurchases)}</td>
            <td className="text-end">{money(r.totalPaid)}</td>
            <td className="text-end">
              <span className={r.totalPending > 0 ? 'text-danger fw-semibold' : ''}>
                {money(r.totalPending)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StockTable({ rows }) {
  return (
    <table className="table table-sm mb-0">
      <thead>
        <tr>
          <th>Product</th><th>Barcode</th><th>Unit</th>
          <th className="text-end">Qty</th><th className="text-end">Purchase</th>
          <th className="text-end">Selling</th><th className="text-end">Stock Value</th><th>Low?</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.productId}>
            <td>{r.productName}</td>
            <td>{r.barcode}</td>
            <td>{r.unit}</td>
            <td className="text-end">{r.stockQuantity}</td>
            <td className="text-end">{money(r.purchasePrice)}</td>
            <td className="text-end">{money(r.sellingPrice)}</td>
            <td className="text-end">{money(r.stockValue)}</td>
            <td>
              {r.lowStock ? <span className="badge bg-danger">LOW</span> : <span className="badge bg-success">OK</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// product-sales returns List<Map<String,Object>> with backend-defined keys.
function GenericTable({ rows }) {
  const keys = Object.keys(rows[0] || {});
  return (
    <table className="table table-sm mb-0">
      <thead>
        <tr>{keys.map((k) => <th key={k}>{k}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {keys.map((k) => (
              <td key={k}>{typeof r[k] === 'number' ? Number(r[k]).toLocaleString('en-IN') : String(r[k] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
