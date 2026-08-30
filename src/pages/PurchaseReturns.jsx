import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus } from 'react-icons/fi';
import purchaseReturnsService from '../services/purchaseReturnsService';
import purchaseReturnItemsService from '../services/purchaseReturnItemsService';
import purchasesService from '../services/purchasesService';
import purchaseItemsService from '../services/purchaseItemsService';
import suppliersService from '../services/suppliersService';
import useCrud from '../hooks/useCrud';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

export default function PurchaseReturns({ compact = false }) {
  const { items, isLoading, isSaving, create, remove, load } = useCrud(purchaseReturnsService, {
    entityName: 'Purchase Return',
  });

  const [purchases, setPurchases] = useState(null);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [suppliers, setSuppliers] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingRow, setDeletingRow] = useState(null);

  const [purchaseId, setPurchaseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]); // { productId, productName, price, purchasedQty, returnQty }

  useEffect(() => {
    Promise.all([
      purchasesService.getAll(),
      purchaseItemsService.getAll().catch(() => []),
      suppliersService.getAll(),
    ]).then(([p, pi, s]) => {
      setPurchases(asList(p));
      setPurchaseItems(asList(pi));
      setSuppliers(asList(s));
    });
  }, []);

  const selectedPurchase = useMemo(
    () => (purchases || []).find((p) => String(p.id) === String(purchaseId)),
    [purchases, purchaseId]
  );

  const derivedSupplier = useMemo(() => {
    if (!selectedPurchase) return null;
    if (selectedPurchase.supplierId != null) {
      return (suppliers || []).find((s) => s.id === selectedPurchase.supplierId) || null;
    }
    return (suppliers || []).find((s) => s.supplierName === selectedPurchase.supplierName) || null;
  }, [selectedPurchase, suppliers]);

  // When a purchase is chosen, list the products that were bought on it.
  const onPurchaseChange = (value) => {
    setPurchaseId(value);
    const pid = Number(value);
    const rows = purchaseItems
      .filter((it) => Number(it.purchaseId) === pid)
      .map((it) => ({
        productId: it.productId,
        productName: it.productName || it.productId,
        price: Number(it.purchasePrice ?? 0),
        purchasedQty: Number(it.quantity ?? 0),
        returnQty: 0,
      }));
    setLines(rows);
  };

  const setReturnQty = (idx, val) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        let q = Number(val);
        if (Number.isNaN(q) || q < 0) q = 0;
        if (q > l.purchasedQty) q = l.purchasedQty;
        return { ...l, returnQty: q };
      })
    );
  };

  const returnTotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.returnQty * l.price, 0),
    [lines]
  );

  const supplierName = (row) =>
    (suppliers || []).find((s) => s.id === row.supplierId)?.supplierName || row.supplierId || '—';
  const purchaseInvoice = (row) =>
    (purchases || []).find((p) => p.id === row.purchaseId)?.invoiceNumber || row.purchaseId;

  const openCreate = () => {
    setPurchaseId('');
    setNotes('');
    setLines([]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!purchaseId) return toast.error('Please select a purchase');
    if (!derivedSupplier) return toast.error('Could not resolve the supplier for this purchase');
    if (!notes.trim()) return toast.error('Please enter a reason');
    const returnLines = lines.filter((l) => l.returnQty > 0);
    if (returnLines.length === 0) return toast.error('Set a return quantity on at least one product');

    const created = await create({
      purchaseId: Number(purchaseId),
      supplierId: Number(derivedSupplier.id),
      totalAmount: Number(returnTotal.toFixed(2)),
      notes: notes.trim(),
    });
    const purchaseReturnId = created?.id ?? created?.purchaseReturnId;

    if (purchaseReturnId) {
      try {
        await Promise.all(
          returnLines.map((l) =>
            purchaseReturnItemsService.create({
              purchaseReturnId: Number(purchaseReturnId),
              productId: Number(l.productId),
              quantity: Number(l.returnQty),
              price: Number(l.price),
            })
          )
        );
        toast.success('Stock reduced and supplier balance updated');
      } catch {
        toast.error('Return saved, but some product lines failed to post.');
      }
    }

    // refresh purchases so the updated pending / returned amounts show elsewhere
    purchasesService.getAll().then((p) => setPurchases(asList(p)));
    await load();
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    await remove(deletingRow.id ?? deletingRow.purchaseReturnId);
    setDeletingRow(null);
  };

  if (!purchases || !suppliers) return <Loader label="Loading references..." />;

  return (
    <div>
      <div className="erp-page-header">
        {compact ? <div /> : <h1 className="erp-page-title">Purchase Returns</h1>}
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
          <FiPlus /> Add Purchase Return
        </button>
      </div>

      <DataTable
        isLoading={isLoading}
        rows={items}
        keyField="purchaseReturnId"
        onDelete={setDeletingRow}
        emptyTitle="No purchase returns yet"
        emptyMessage='Click "Add Purchase Return" to send stock back to a supplier.'
        columns={[
          { key: 'purchaseReturnId', label: 'ID', sortable: true },
          { key: 'purchaseId', label: 'Purchase', render: purchaseInvoice },
          { key: 'supplierId', label: 'Supplier', render: supplierName },
          { key: 'notes', label: 'Reason' },
          { key: 'totalAmount', label: 'Total' },
          {
            key: 'returnDate',
            label: 'Date',
            render: (row) =>
              row.returnDate ? String(row.returnDate).replace('T', ' ').slice(0, 16) : '—',
          },
        ]}
      />

      <Modal
        show={showForm}
        title="Add Purchase Return"
        size="modal-lg"
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label">
              Purchase <span className="text-danger">*</span>
            </label>
            <select
              className="form-select"
              value={purchaseId}
              onChange={(e) => onPurchaseChange(e.target.value)}
            >
              <option value="">Select...</option>
              {purchases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.invoiceNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Supplier</label>
            <input
              className="form-control"
              value={
                selectedPurchase
                  ? derivedSupplier?.supplierName ||
                    selectedPurchase.supplierName ||
                    'Unknown supplier'
                  : ''
              }
              placeholder="Auto-filled from the selected purchase"
              readOnly
              disabled
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">
            Reason <span className="text-danger">*</span>
          </label>
          <input className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <label className="form-label">Products to return</label>
        {!selectedPurchase ? (
          <p className="text-muted small">Select a purchase to load its products.</p>
        ) : lines.length === 0 ? (
          <p className="text-muted small">
            This purchase has no recorded product lines. Add them on the Purchase Items page first.
          </p>
        ) : (
          <div className="table-responsive mb-2">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ width: 110 }}>Purchased</th>
                  <th style={{ width: 120 }}>Unit Price</th>
                  <th style={{ width: 120 }}>Return Qty</th>
                  <th style={{ width: 110 }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.productId}>
                    <td>{l.productName}</td>
                    <td>{l.purchasedQty}</td>
                    <td>{l.price.toFixed(2)}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={l.purchasedQty}
                        className="form-control form-control-sm"
                        value={l.returnQty}
                        onChange={(e) => setReturnQty(idx, e.target.value)}
                      />
                    </td>
                    <td>{(l.returnQty * l.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="d-flex justify-content-end">
          <div style={{ minWidth: 220 }}>
            <div className="d-flex justify-content-between">
              <span>Return Total</span>
              <strong>{returnTotal.toFixed(2)}</strong>
            </div>
            <div className="form-text">
              Stock is reduced and the supplier's pending amount drops by this total.
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        show={Boolean(deletingRow)}
        title="Delete purchase return?"
        message="Deleting only removes the return record. Stock and supplier balance already adjusted by its line items are reversed when you delete those on the Purchase Return Items page."
        isLoading={isSaving}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRow(null)}
      />
    </div>
  );
}
