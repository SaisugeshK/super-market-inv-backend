import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus } from 'react-icons/fi';
import paymentsService from '../services/paymentsService';
import salesService from '../services/salesService';
import salesItemsService from '../services/salesItemsService';
import productsService from '../services/productsService';
import useCrud from '../hooks/useCrud';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);
const num = (v) => Number(v || 0);
const inr = (v) => `₹${num(v).toLocaleString('en-IN')}`;
const saleKey = (s) => s.saleId ?? s.id;

export default function Payments() {
  // `items` here are payment transactions
  const { items, isLoading, isSaving, create, remove } = useCrud(paymentsService, {
    entityName: 'Payment',
  });

  const [sales, setSales] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [deletingRow, setDeletingRow] = useState(null);

  const [saleQuery, setSaleQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionReference, setTransactionReference] = useState('');
  const [amount, setAmount] = useState('');

  const loadSales = () =>
    Promise.all([
      salesService.getAll(),
      salesItemsService.getAll().catch(() => []),
      productsService.getAll().catch(() => []),
    ]).then(([s, si, pr]) => {
      setSales(asList(s));
      setSaleItems(asList(si));
      setProducts(asList(pr));
    });

  useEffect(() => {
    loadSales();
  }, []);

  // total already recorded against a sale (sum of payment transactions on it)
  const paidFor = (saleId) =>
    items
      .filter((p) => Number(p.invoiceId) === Number(saleId))
      .reduce((sum, p) => sum + num(p.amount), 0);

  const outstandingFor = (sale) => {
    if (String(sale.paymentStatus).toUpperCase() === 'PAID') return 0;
    return Math.max(0, num(sale.totalAmount) - paidFor(saleKey(sale)));
  };

  // sales that still owe money
  const pendingSales = useMemo(
    () => (sales || []).filter((s) => outstandingFor(s) > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sales, items]
  );

  const matchedSale = useMemo(() => {
    if (!sales || !saleQuery.trim()) return null;
    const k = saleQuery.trim().toLowerCase();
    return (
      sales.find((s) => String(s.invoiceNumber || '').toLowerCase() === k) ||
      sales.find((s) => String(saleKey(s)) === k) ||
      null
    );
  }, [sales, saleQuery]);

  const lines = useMemo(() => {
    if (!matchedSale) return [];
    const id = saleKey(matchedSale);
    return saleItems
      .filter((li) => Number(li.saleId) === Number(id))
      .map((li) => ({
        ...li,
        productName:
          products.find((p) => (p.id ?? p.productId) === li.productId)?.productName || li.productId,
      }));
  }, [matchedSale, saleItems, products]);

  const balance = matchedSale ? outstandingFor(matchedSale) : 0;

  useEffect(() => {
    if (matchedSale) setAmount(String(balance.toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedSale && saleKey(matchedSale)]);

  const openCreate = () => {
    setSaleQuery('');
    setPaymentMethod('CASH');
    setTransactionReference('');
    setAmount('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!matchedSale) return toast.error('Pick a pending sale by its invoice number');
    if (amount === '' || num(amount) <= 0) return toast.error('Enter a valid amount');

    const saleId = saleKey(matchedSale);
    await create({
      invoiceId: Number(saleId), // stores the sale id
      paymentMethod,
      transactionReference: transactionReference || null,
      amount: num(amount),
    });

    // if the sale is now fully covered, mark it PAID
    const nowPaid = paidFor(saleId) + num(amount);
    if (nowPaid + 0.001 >= num(matchedSale.totalAmount)) {
      try {
        await salesService.update(saleId, {
          customerId: matchedSale.customerId ?? null,
          createdBy: matchedSale.createdBy ?? 1,
          counterId: matchedSale.counterId ?? null,
          invoiceNumber: matchedSale.invoiceNumber,
          paymentMethod: matchedSale.paymentMethod || paymentMethod,
          paymentStatus: 'PAID',
          totalAmount: num(matchedSale.totalAmount),
        });
      } catch {
        /* payment still recorded */
      }
    }

    await loadSales();
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    await remove(deletingRow.id ?? deletingRow.transactionId);
    setDeletingRow(null);
  };

  if (!sales) return <Loader label="Loading payments..." />;

  const invoiceOf = (saleId) =>
    sales.find((s) => saleKey(s) === Number(saleId))?.invoiceNumber || saleId;

  return (
    <div>
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title">Payments</h1>
          <p className="erp-page-subtitle">Collect a balance on a sale that was left partly paid</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
          <FiPlus /> Add payment
        </button>
      </div>

      <DataTable
        isLoading={isLoading}
        rows={items}
        keyField="transactionId"
        onDelete={setDeletingRow}
        emptyTitle="No payments yet"
        emptyMessage="Record a payment against a pending sale to see it here."
        columns={[
          { key: 'invoiceId', label: 'Sale invoice', render: (r) => invoiceOf(r.invoiceId) },
          { key: 'paymentMethod', label: 'Method' },
          { key: 'transactionReference', label: 'Reference' },
          { key: 'amount', label: 'Amount', sortable: true, render: (r) => inr(r.amount) },
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
        title="Add payment"
        size="modal-lg"
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save payment'}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">
            Sale invoice # <span className="text-danger">*</span>
          </label>
          <input
            className="form-control"
            list="payment-sale-list"
            value={saleQuery}
            onChange={(e) => setSaleQuery(e.target.value)}
            placeholder="Type or pick a pending sale…"
          />
          <datalist id="payment-sale-list">
            {pendingSales.map((s) => (
              <option key={saleKey(s)} value={s.invoiceNumber}>
                {`Balance ${outstandingFor(s).toFixed(2)}`}
              </option>
            ))}
          </datalist>
          {saleQuery.trim() && !matchedSale && (
            <div className="form-text text-danger">No sale matches that invoice number.</div>
          )}
          {matchedSale && balance <= 0 && (
            <div className="form-text text-success">This sale is already fully paid.</div>
          )}
        </div>

        {matchedSale && (
          <div className="erp-card p-3 mb-3">
            <div className="row text-center mb-2">
              <div className="col">
                <div className="text-muted small">Sale total</div>
                <strong>{inr(matchedSale.totalAmount)}</strong>
              </div>
              <div className="col">
                <div className="text-muted small">Already paid</div>
                <strong>{inr(paidFor(saleKey(matchedSale)))}</strong>
              </div>
              <div className="col">
                <div className="text-muted small">Balance due</div>
                <strong className={balance > 0 ? 'text-danger' : 'text-success'}>
                  {inr(balance)}
                </strong>
              </div>
            </div>

            {lines.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-end">Qty</th>
                      <th className="text-end">Price</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((li) => (
                      <tr key={li.saleItemId ?? li.id}>
                        <td>{li.productName}</td>
                        <td className="text-end">{num(li.quantity)}</td>
                        <td className="text-end">{num(li.sellingPrice).toFixed(2)}</td>
                        <td className="text-end">{num(li.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted small">No line items recorded for this sale.</div>
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
            <div className="form-text">Auto-filled with the balance — edit for a part payment.</div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Payment method</label>
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
            <label className="form-label">Transaction reference</label>
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
