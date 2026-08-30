import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiUserPlus, FiRotateCcw } from 'react-icons/fi';
import purchasesService from '../services/purchasesService';
import purchaseItemsService from '../services/purchaseItemsService';
import purchaseReturnsService from '../services/purchaseReturnsService';
import purchaseReturnItemsService from '../services/purchaseReturnItemsService';
import suppliersService from '../services/suppliersService';
import productsService from '../services/productsService';
import { useAuth } from '../context/AuthContext';
import useCrud from '../hooks/useCrud';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';

const emptyLine = () => ({ productId: '', quantity: 1, purchasePrice: 0, taxAmount: 0, unit: '' });

// Same rule the backend uses in Purchase @PrePersist.
const deriveStatus = (total, paid) => {
  const t = Number(total || 0);
  const p = Number(paid || 0);
  if (p <= 0) return 'PENDING';
  if (p >= t) return 'FULLY_PAID';
  return 'PARTIALLY_PAID';
};

const STATUS_BADGE = {
  FULLY_PAID: 'bg-success',
  PARTIALLY_PAID: 'bg-warning text-dark',
  PENDING: 'bg-danger',
};

export default function Purchases({ compact = false }) {
  const { user } = useAuth();
  const { items, isLoading, isSaving, create, remove, load } = useCrud(purchasesService, {
    entityName: 'Purchase',
  });

  const [suppliers, setSuppliers] = useState(null);
  const [products, setProducts] = useState(null);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [deletingRow, setDeletingRow] = useState(null);

  // return-against-purchase (replaces the old separate Purchase Returns page)
  const [returning, setReturning] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnLines, setReturnLines] = useState([]);
  const [savingReturn, setSavingReturn] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);
  const [lines, setLines] = useState([emptyLine()]);

  // inline "add supplier" so you never leave the purchase form
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ supplierName: '', phone: '', gstNumber: '' });
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    Promise.all([
      suppliersService.getAll(),
      productsService.getAll(),
      purchaseItemsService.getAll().catch(() => []),
    ]).then(([s, p, pi]) => {
      setSuppliers(Array.isArray(s) ? s : s?.content || []);
      setProducts(Array.isArray(p) ? p : p?.content || []);
      setPurchaseItems(Array.isArray(pi) ? pi : pi?.content || []);
    });
  }, []);

  const refreshPurchaseItems = () =>
    purchaseItemsService
      .getAll()
      .then((d) => setPurchaseItems(Array.isArray(d) ? d : d?.content || []))
      .catch(() => {});

  const totals = useMemo(() => {
    const totalAmount = lines.reduce(
      (sum, l) => sum + Number(l.quantity || 0) * Number(l.purchasePrice || 0),
      0
    );
    const tax = lines.reduce((sum, l) => sum + Number(l.taxAmount || 0), 0);
    const grandTotal = totalAmount + tax;
    const pending = Math.max(0, grandTotal - Number(paidAmount || 0));
    return { totalAmount, tax, grandTotal, pending, status: deriveStatus(grandTotal, paidAmount) };
  }, [lines, paidAmount]);

  const openCreate = () => {
    setSupplierId('');
    setInvoiceNumber('');
    setPaidAmount(0);
    setLines([emptyLine()]);
    setShowForm(true);
  };

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const onProductChange = (idx, productId) => {
    const product = products.find((p) => String(p.id ?? p.productId) === String(productId));
    updateLine(idx, {
      productId,
      purchasePrice: product?.purchasePrice ?? 0,
      unit: product?.unit ?? '',
    });
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleAddSupplier = async () => {
    if (!newSupplier.supplierName.trim()) return toast.error('Enter a supplier name');
    if (!newSupplier.phone.trim()) return toast.error('Enter a phone number');
    setSavingSupplier(true);
    try {
      const created = await suppliersService.create({
        supplierName: newSupplier.supplierName.trim(),
        phone: newSupplier.phone.trim(),
        gstNumber: newSupplier.gstNumber.trim() || null,
        status: 'ACTIVE',
      });
      const list = await suppliersService.getAll();
      setSuppliers(Array.isArray(list) ? list : list?.content || []);
      const newId = created?.id ?? created?.supplierId;
      if (newId != null) setSupplierId(String(newId));
      toast.success('Supplier added');
      setShowNewSupplier(false);
      setNewSupplier({ supplierName: '', phone: '', gstNumber: '' });
    } catch {
      /* interceptor toasts */
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSave = async () => {
    if (!supplierId) return toast.error('Please select a supplier');
    if (!invoiceNumber) return toast.error('Please enter the supplier invoice/reference number');
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) return toast.error('Add at least one product line');

    const payload = {
      supplierId: Number(supplierId),
      invoiceNumber,
      totalAmount: Number(totals.grandTotal.toFixed(2)),
      tax: Number(totals.tax.toFixed(2)),
      paidAmount: Number(Number(paidAmount || 0).toFixed(2)),
      // paymentStatus + pendingAmount are auto-derived on the backend
      createdBy: user?.id ?? user?.userId ?? 1,
    };

    const created = await create(payload);
    const purchaseId = created?.purchaseId ?? created?.id;

    // Persist each product line so stock is incremented (PurchaseItemServiceImpl).
    if (purchaseId) {
      try {
        await Promise.all(
          validLines.map((l) =>
            purchaseItemsService.create({
              purchaseId: Number(purchaseId),
              productId: Number(l.productId),
              quantity: Number(l.quantity),
              purchasePrice: Number(l.purchasePrice),
              taxAmount: Number(l.taxAmount || 0),
              total:
                Number(l.quantity || 0) * Number(l.purchasePrice || 0) +
                Number(l.taxAmount || 0),
            })
          )
        );
      } catch {
        toast.error('Purchase saved, but some product lines failed to record.');
      }
      refreshPurchaseItems();
    }

    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    await remove(deletingRow.purchaseId ?? deletingRow.id);
    setDeletingRow(null);
  };

  // ── return goods against a purchase ──
  const manualLine = () => ({
    productId: '',
    productName: '',
    price: 0,
    purchasedQty: 0, // 0 = unknown/manual, no cap
    returnQty: 0,
    manual: true,
  });

  const openReturn = (row) => {
    const pid = row.purchaseId ?? row.id;
    const rows = purchaseItems
      .filter((it) => Number(it.purchaseId) === Number(pid))
      .map((it) => ({
        productId: it.productId,
        productName: it.productName || it.productId,
        price: Number(it.purchasePrice ?? 0),
        purchasedQty: Number(it.quantity ?? 0),
        returnQty: 0,
        manual: false,
      }));
    // Older purchases have no recorded line items — let the user pick products.
    setReturnLines(rows.length ? rows : [manualLine()]);
    setReturnNotes('');
    setReturning(row);
  };

  const addReturnLine = () => setReturnLines((prev) => [...prev, manualLine()]);
  const removeReturnLine = (idx) =>
    setReturnLines((prev) => prev.filter((_, i) => i !== idx));

  const onReturnProduct = (idx, productId) => {
    const p = products.find((x) => String(x.id ?? x.productId) === String(productId));
    setReturnLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              productId,
              productName: p?.productName || productId,
              price: Number(p?.purchasePrice ?? l.price ?? 0),
            }
          : l
      )
    );
  };

  const setReturnQty = (idx, val) => {
    setReturnLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        let q = Number(val);
        if (Number.isNaN(q) || q < 0) q = 0;
        if (l.purchasedQty > 0 && q > l.purchasedQty) q = l.purchasedQty;
        return { ...l, returnQty: q };
      })
    );
  };

  const setReturnPrice = (idx, val) =>
    setReturnLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, price: Number(val) || 0 } : l))
    );

  const returnTotal = returnLines.reduce((s, l) => s + l.returnQty * l.price, 0);

  const handleSaveReturn = async () => {
    if (!returning) return;
    const supplierId =
      returning.supplierId ??
      suppliers.find((s) => s.supplierName === returning.supplierName)?.id;
    if (!supplierId) return toast.error('Could not resolve the supplier for this purchase');
    if (!returnNotes.trim()) return toast.error('Enter a reason');
    const lines = returnLines.filter((l) => l.productId && l.returnQty > 0);
    if (lines.length === 0) return toast.error('Pick a product and a return quantity');

    setSavingReturn(true);
    try {
      const created = await purchaseReturnsService.create({
        purchaseId: Number(returning.purchaseId ?? returning.id),
        supplierId: Number(supplierId),
        totalAmount: Number(returnTotal.toFixed(2)),
        notes: returnNotes.trim(),
      });
      const returnId = created?.id ?? created?.purchaseReturnId;
      if (returnId) {
        await Promise.all(
          lines.map((l) =>
            purchaseReturnItemsService.create({
              purchaseReturnId: Number(returnId),
              productId: Number(l.productId),
              quantity: Number(l.returnQty),
              price: Number(l.price),
            })
          )
        );
      }
      toast.success('Return recorded — stock and supplier balance updated');
      setReturning(null);
      await load();
    } catch {
      toast.error('Return could not be saved.');
    } finally {
      setSavingReturn(false);
    }
  };

  if (!suppliers || !products) return <Loader label="Loading purchase data..." />;

  const supplierName = (row) =>
    row.supplierName ||
    suppliers.find((s) => (s.id ?? s.supplierId) === row.supplierId)?.supplierName ||
    row.supplierId;

  return (
    <div>
      <div className="erp-page-header">
        {compact ? <div /> : <h1 className="erp-page-title">Purchases</h1>}
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
          <FiPlus /> New Purchase
        </button>
      </div>

      <DataTable
        isLoading={isLoading}
        rows={items}
        keyField="purchaseId"
        onDelete={setDeletingRow}
        emptyTitle="No purchases yet"
        emptyMessage='Click "New Purchase" to record stock coming in from a supplier.'
        columns={[
          { key: 'purchaseId', label: 'ID', sortable: true },
          { key: 'invoiceNumber', label: 'Invoice #', sortable: true },
          { key: 'supplier', label: 'Supplier', render: supplierName },
          { key: 'totalAmount', label: 'Total', sortable: true },
          { key: 'tax', label: 'Tax' },
          {
            key: 'returnedAmount',
            label: 'Returned',
            render: (row) => Number(row.returnedAmount || 0).toFixed(2),
          },
          { key: 'paidAmount', label: 'Paid' },
          { key: 'pendingAmount', label: 'Pending' },
          {
            key: 'paymentStatus',
            label: 'Status',
            render: (row) => (
              <span className={`badge ${STATUS_BADGE[row.paymentStatus] || 'bg-secondary'}`}>
                {row.paymentStatus}
              </span>
            ),
          },
          {
            key: 'return',
            label: 'Return',
            render: (row) => (
              <button
                className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                title="Return goods to supplier"
                onClick={() => openReturn(row)}
              >
                <FiRotateCcw size={13} /> Return
              </button>
            ),
          },
        ]}
      />

      <Modal
        show={showForm}
        title="New Purchase"
        size="modal-lg"
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Purchase'}
            </button>
          </>
        }
      >
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label d-flex justify-content-between align-items-center">
              <span>Supplier</span>
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none d-flex align-items-center gap-1"
                onClick={() => setShowNewSupplier(true)}
              >
                <FiUserPlus size={13} /> New
              </button>
            </label>
            <select
              className="form-select"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id ?? s.supplierId} value={s.id ?? s.supplierId}>
                  {s.supplierName}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Supplier Invoice / Ref #</label>
            <input
              className="form-control"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Amount Paid</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive mb-2">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ width: 90 }}>Qty</th>
                <th style={{ width: 80 }}>Unit</th>
                <th style={{ width: 130 }}>Purchase Price</th>
                <th style={{ width: 120 }}>Tax Amount</th>
                <th style={{ width: 110 }}>Line Total</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lineTotal =
                  Number(line.quantity || 0) * Number(line.purchasePrice || 0) +
                  Number(line.taxAmount || 0);
                return (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={line.productId}
                        onChange={(e) => onProductChange(idx, e.target.value)}
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id ?? p.productId} value={p.id ?? p.productId}>
                            {p.productName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      />
                    </td>
                    <td>
                      <span className="text-muted small">{line.unit || '—'}</span>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        value={line.purchasePrice}
                        onChange={(e) => updateLine(idx, { purchasePrice: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        value={line.taxAmount}
                        onChange={(e) => updateLine(idx, { taxAmount: e.target.value })}
                      />
                    </td>
                    <td>{lineTotal.toFixed(2)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button className="btn btn-sm btn-outline-primary mb-3" onClick={addLine}>
          <FiPlus size={14} /> Add Line
        </button>

        <div className="d-flex justify-content-end">
          <div style={{ minWidth: 240 }}>
            <div className="d-flex justify-content-between">
              <span>Subtotal</span>
              <strong>{totals.totalAmount.toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Tax</span>
              <strong>{totals.tax.toFixed(2)}</strong>
            </div>
            <hr className="my-1" />
            <div className="d-flex justify-content-between">
              <span>Grand Total</span>
              <strong>{totals.grandTotal.toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Paid</span>
              <strong>{Number(paidAmount || 0).toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Pending</span>
              <strong>{totals.pending.toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between mt-1">
              <span>Status</span>
              <span className={`badge ${STATUS_BADGE[totals.status]}`}>{totals.status}</span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        show={showNewSupplier}
        title="Add Supplier"
        onClose={() => setShowNewSupplier(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowNewSupplier(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddSupplier}
              disabled={savingSupplier}
            >
              {savingSupplier ? 'Saving...' : 'Save & Select'}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">
            Supplier Name <span className="text-danger">*</span>
          </label>
          <input
            className="form-control"
            value={newSupplier.supplierName}
            onChange={(e) => setNewSupplier((s) => ({ ...s, supplierName: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="mb-3">
          <label className="form-label">
            Phone <span className="text-danger">*</span>
          </label>
          <input
            className="form-control"
            value={newSupplier.phone}
            onChange={(e) => setNewSupplier((s) => ({ ...s, phone: e.target.value }))}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">GST / Tax Number</label>
          <input
            className="form-control"
            value={newSupplier.gstNumber}
            onChange={(e) => setNewSupplier((s) => ({ ...s, gstNumber: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        show={Boolean(returning)}
        size="modal-lg"
        title={returning ? `Return goods — ${returning.invoiceNumber}` : ''}
        onClose={() => setReturning(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReturning(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveReturn} disabled={savingReturn}>
              {savingReturn ? 'Saving...' : 'Save Return'}
            </button>
          </>
        }
      >
        {returning && (
          <>
            <div className="row g-2 mb-3 small">
              <div className="col-md-6">
                <strong>Supplier:</strong> {supplierName(returning)}
              </div>
              <div className="col-md-6">
                <strong>Purchase total:</strong> {Number(returning.totalAmount || 0).toFixed(2)}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">
                Reason <span className="text-danger">*</span>
              </label>
              <input
                className="form-control"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>

            <label className="form-label d-block">Products to return</label>
            {returnLines.some((l) => !l.manual) ? null : (
              <div className="form-text mb-1">
                This purchase has no stored line items — pick the products being returned.
              </div>
            )}
            <div className="table-responsive mb-2">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ width: 100 }}>Purchased</th>
                    <th style={{ width: 120 }}>Unit Price</th>
                    <th style={{ width: 110 }}>Return Qty</th>
                    <th style={{ width: 100 }}>Line Total</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {returnLines.map((l, idx) => (
                    <tr key={idx}>
                      <td>
                        {l.manual ? (
                          <select
                            className="form-select form-select-sm"
                            value={l.productId}
                            onChange={(e) => onReturnProduct(idx, e.target.value)}
                          >
                            <option value="">Select product...</option>
                            {products.map((p) => (
                              <option key={p.id ?? p.productId} value={p.id ?? p.productId}>
                                {p.productName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          l.productName
                        )}
                      </td>
                      <td>{l.purchasedQty || '—'}</td>
                      <td>
                        {l.manual ? (
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={l.price}
                            onChange={(e) => setReturnPrice(idx, e.target.value)}
                          />
                        ) : (
                          l.price.toFixed(2)
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={l.purchasedQty > 0 ? l.purchasedQty : undefined}
                          className="form-control form-control-sm"
                          value={l.returnQty}
                          onChange={(e) => setReturnQty(idx, e.target.value)}
                        />
                      </td>
                      <td>{(l.returnQty * l.price).toFixed(2)}</td>
                      <td>
                        {l.manual && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeReturnLine(idx)}
                            disabled={returnLines.length === 1}
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="btn btn-sm btn-outline-primary mb-3" onClick={addReturnLine}>
              <FiPlus size={14} /> Add product
            </button>

            <div className="d-flex justify-content-end">
              <div style={{ minWidth: 240 }}>
                <div className="d-flex justify-content-between">
                  <span>Return Total</span>
                  <strong>{returnTotal.toFixed(2)}</strong>
                </div>
                <div className="form-text">
                  Stock drops and the supplier's pending amount is reduced by this total.
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        show={Boolean(deletingRow)}
        title="Delete purchase?"
        message="This will permanently delete this purchase record. This action cannot be undone."
        isLoading={isSaving}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRow(null)}
      />
    </div>
  );
}
