import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus } from 'react-icons/fi';
import paymentsService from '../services/paymentsService';
import invoicesService from '../services/invoicesService';
import invoiceItemsService from '../services/invoiceItemsService';
import productsService from '../services/productsService';
import useCrud from '../hooks/useCrud';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);
const num = (v) => Number(v || 0);

export default function Payments() {
  const { items, isLoading, isSaving, create, remove } = useCrud(paymentsService, {
    entityName: 'Payment',
  });

  const [invoices, setInvoices] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [deletingRow, setDeletingRow] = useState(null);

  const [invoiceKey, setInvoiceKey] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionReference, setTransactionReference] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    Promise.all([
      invoicesService.getAll(),
      invoiceItemsService.getAll().catch(() => []),
      productsService.getAll().catch(() => []),
    ]).then(([inv, it, pr]) => {
      setInvoices(asList(inv));
      setInvoiceItems(asList(it));
      setProducts(asList(pr));
    });
  }, []);

  // Match what the user typed against invoice number OR id.
  const matchedInvoice = useMemo(() => {
    if (!invoices || !invoiceKey.trim()) return null;
    const k = invoiceKey.trim().toLowerCase();
    return (
      invoices.find((i) => String(i.invoiceNumber || '').toLowerCase() === k) ||
      invoices.find((i) => String(i.invoiceId ?? i.id) === k) ||
      null
    );
  }, [invoices, invoiceKey]);

  const invoiceLines = useMemo(() => {
    if (!matchedInvoice) return [];
    const invId = matchedInvoice.invoiceId ?? matchedInvoice.id;
    return invoiceItems
      .filter((li) => Number(li.invoiceId) === Number(invId))
      .map((li) => ({
        ...li,
        productName:
          products.find((p) => (p.id ?? p.productId) === li.productId)?.productName || li.productId,
      }));
  }, [matchedInvoice, invoiceItems, products]);

  const balance = matchedInvoice
    ? matchedInvoice.balanceAmount != null
      ? num(matchedInvoice.balanceAmount)
      : Math.max(0, num(matchedInvoice.grandTotal) - num(matchedInvoice.paidAmount))
    : 0;

  // Auto-fill the amount with the outstanding balance whenever a new invoice matches.
  useEffect(() => {
    if (matchedInvoice) setAmount(String(balance.toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedInvoice?.invoiceId, matchedInvoice?.id]);

  const openCreate = () => {
    setInvoiceKey('');
    setPaymentMethod('CASH');
    setTransactionReference('');
    setAmount('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!matchedInvoice) return toast.error('Enter a valid invoice number or ID');
    if (amount === '' || num(amount) <= 0) return toast.error('Enter a valid amount');
    await create({
      invoiceId: Number(matchedInvoice.invoiceId ?? matchedInvoice.id),
      paymentMethod,
      transactionReference: transactionReference || null,
      amount: num(amount),
    });
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    await remove(deletingRow.id ?? deletingRow.transactionId);
    setDeletingRow(null);
  };

  if (!invoices) return <Loader label="Loading payments..." />;

  const invoiceNumberFor = (id) =>
    invoices.find((i) => (i.invoiceId ?? i.id) === id)?.invoiceNumber || id;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Payments</h1>
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
          <FiPlus /> Add Payment
        </button>
      </div>

      <DataTable
        isLoading={isLoading}
        rows={items}
        keyField="transactionId"
        onDelete={setDeletingRow}
        emptyTitle="No payments yet"
        emptyMessage="Record a payment against an invoice to see it here."
        columns={[
          { key: 'transactionId', label: 'ID', sortable: true },
          { key: 'invoiceId', label: 'Invoice', render: (r) => invoiceNumberFor(r.invoiceId) },
          { key: 'paymentMethod', label: 'Method' },
          { key: 'transactionReference', label: 'Reference' },
          { key: 'amount', label: 'Amount', sortable: true, render: (r) => num(r.amount).toFixed(2) },
          {
            key: 'paymentDate',
            label: 'Date',
            render: (r) =>
              r.paymentDate ? String(r.paymentDate).replace('T', ' ').slice(0, 16) : '—',
          },
        ]}
      />

      <Modal
        show={showForm}
        title="Add Payment"
        size="modal-lg"
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Payment'}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">
            Invoice Number / ID <span className="text-danger">*</span>
          </label>
          <input
            className="form-control"
            list="payment-invoice-list"
            value={invoiceKey}
            onChange={(e) => setInvoiceKey(e.target.value)}
            placeholder="Type or pick an invoice…"
          />
          <datalist id="payment-invoice-list">
            {invoices.map((i) => (
              <option key={i.invoiceId ?? i.id} value={i.invoiceNumber}>
                {`Balance ${(i.balanceAmount != null
                  ? num(i.balanceAmount)
                  : num(i.grandTotal) - num(i.paidAmount)
                ).toFixed(2)}`}
              </option>
            ))}
          </datalist>
          {invoiceKey.trim() && !matchedInvoice && (
            <div className="form-text text-danger">No invoice matches that number / ID.</div>
          )}
        </div>

        {matchedInvoice && (
          <div className="erp-card p-3 mb-3">
            <div className="row text-center mb-2">
              <div className="col">
                <div className="text-muted small">Grand Total</div>
                <strong>{num(matchedInvoice.grandTotal).toFixed(2)}</strong>
              </div>
              <div className="col">
                <div className="text-muted small">Already Paid</div>
                <strong>{num(matchedInvoice.paidAmount).toFixed(2)}</strong>
              </div>
              <div className="col">
                <div className="text-muted small">Balance Due</div>
                <strong className={balance > 0 ? 'text-danger' : 'text-success'}>
                  {balance.toFixed(2)}
                </strong>
              </div>
            </div>

            {invoiceLines.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-end">Qty</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceLines.map((li) => (
                      <tr key={li.invoiceItemId ?? li.id}>
                        <td>{li.productName}</td>
                        <td className="text-end">{num(li.quantity)}</td>
                        <td className="text-end">{num(li.unitPrice).toFixed(2)}</td>
                        <td className="text-end">{num(li.totalAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted small">No line items recorded for this invoice.</div>
            )}
          </div>
        )}

        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">
              Amount <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="form-text">Auto-filled with the balance due — edit for a part payment.</div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Payment Method</label>
            <select
              className="form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Transaction Reference</label>
            <input
              className="form-control"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        show={Boolean(deletingRow)}
        title="Delete payment?"
        message="This will permanently delete this payment record."
        isLoading={isSaving}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRow(null)}
      />
    </div>
  );
}
