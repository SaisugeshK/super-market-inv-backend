import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FiPlus, FiEye } from 'react-icons/fi';
import suppliersService from '../services/suppliersService';
import reportsService from '../services/reportsService';
import { supplierSchema } from '../utils/validationSchemas';
import useCrud from '../hooks/useCrud';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import Loader from '../components/Loader';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);
const money = (v) => Number(v || 0).toFixed(2);

const emptyValues = {
  supplierName: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
  status: 'ACTIVE',
};

export default function Suppliers({ compact = false }) {
  const { items, isLoading, isSaving, create, update, remove } = useCrud(suppliersService, {
    entityName: 'Supplier',
  });

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);

  // detail drawer
  const [viewing, setViewing] = useState(null);
  const [detail, setDetail] = useState({ loading: false, purchases: [], outstanding: null });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: yupResolver(supplierSchema), defaultValues: emptyValues });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) =>
      ['supplierName', 'contactPerson', 'phone', 'email', 'gstNumber'].some((k) =>
        String(s[k] ?? '').toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  const openCreate = () => {
    setEditingRow(null);
    reset(emptyValues);
    setShowForm(true);
  };
  const openEdit = (row) => {
    setEditingRow(row);
    reset({ ...emptyValues, ...row });
    setShowForm(true);
  };

  const onSubmit = async (values) => {
    if (editingRow) await update(editingRow.id ?? editingRow.supplierId, values);
    else await create(values);
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    await remove(deletingRow.id ?? deletingRow.supplierId);
    setDeletingRow(null);
  };

  // ── supplier drill-down: profile + purchase history + outstanding ──
  const openView = async (row) => {
    setViewing(row);
    setDetail({ loading: true, purchases: [], outstanding: null });
    const supplierId = row.id ?? row.supplierId;
    try {
      const [purchases, outstanding] = await Promise.all([
        reportsService.purchases({ supplierId }),
        reportsService.supplierOutstanding().catch(() => []),
      ]);
      setDetail({
        loading: false,
        purchases: asList(purchases),
        outstanding: asList(outstanding).find((o) => o.supplierId === supplierId) || null,
      });
    } catch {
      setDetail({ loading: false, purchases: [], outstanding: null });
    }
  };

  // flatten purchase rows -> one line per product purchased from this supplier
  const productLines = useMemo(() => {
    const out = [];
    detail.purchases.forEach((p) => {
      (p.items || []).forEach((it) => {
        out.push({
          date: p.purchaseDate,
          invoiceNumber: p.invoiceNumber,
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unit,
          purchasePrice: it.purchasePrice,
          total: it.total,
        });
      });
    });
    return out;
  }, [detail.purchases]);

  if (isLoading && items.length === 0) return <Loader label="Loading suppliers..." />;

  return (
    <div>
      <div className="erp-page-header">
        {compact ? <div /> : <h1 className="erp-page-title">Suppliers</h1>}
        <div className="d-flex align-items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search suppliers..." />
          <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
            <FiPlus /> Add Supplier
          </button>
        </div>
      </div>

      <DataTable
        isLoading={isLoading}
        rows={filtered}
        keyField="supplierId"
        onEdit={openEdit}
        onDelete={setDeletingRow}
        emptyTitle="No suppliers yet"
        emptyMessage='Click "Add Supplier" to create your first supplier.'
        columns={[
          { key: 'supplierId', label: 'ID', sortable: true },
          {
            key: 'supplierName',
            label: 'Supplier',
            sortable: true,
            render: (row) => (
              <button
                className="btn btn-link p-0 text-decoration-none fw-semibold"
                onClick={() => openView(row)}
              >
                {row.supplierName}
              </button>
            ),
          },
          { key: 'contactPerson', label: 'Contact Person' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'gstNumber', label: 'GST No.' },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <span className={`badge ${row.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                {row.status}
              </span>
            ),
          },
          {
            key: 'view',
            label: '',
            render: (row) => (
              <button
                className="btn btn-sm btn-outline-secondary"
                title="View purchases & balance"
                onClick={() => openView(row)}
              >
                <FiEye size={14} />
              </button>
            ),
          },
        ]}
      />

      {/* Add / Edit */}
      <Modal
        show={showForm}
        title={editingRow ? 'Edit Supplier' : 'Add Supplier'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormInput label="Supplier Name" name="supplierName" register={register} error={errors.supplierName} required />
          <FormInput label="Contact Person" name="contactPerson" register={register} error={errors.contactPerson} />
          <FormInput label="Phone" name="phone" register={register} error={errors.phone} required />
          <FormInput label="Email" name="email" type="email" register={register} error={errors.email} />
          <FormInput label="Address" name="address" register={register} error={errors.address} />
          <FormInput label="GST / Tax Number" name="gstNumber" register={register} error={errors.gstNumber} placeholder="e.g. 22AAAAA0000A1Z5" />
          <FormSelect
            label="Status"
            name="status"
            register={register}
            error={errors.status}
            required
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
        </form>
      </Modal>

      {/* Supplier detail */}
      <Modal
        show={Boolean(viewing)}
        size="modal-xl"
        title={viewing ? `${viewing.supplierName} — Overview` : ''}
        onClose={() => setViewing(null)}
        footer={
          <button className="btn btn-secondary" onClick={() => setViewing(null)}>
            Close
          </button>
        }
      >
        {viewing && (
          <>
            <div className="row g-2 mb-3 small">
              <div className="col-md-4"><strong>Contact:</strong> {viewing.contactPerson || '—'}</div>
              <div className="col-md-4"><strong>Phone:</strong> {viewing.phone || '—'}</div>
              <div className="col-md-4"><strong>Email:</strong> {viewing.email || '—'}</div>
              <div className="col-md-4"><strong>GST No.:</strong> {viewing.gstNumber || '—'}</div>
              <div className="col-md-8"><strong>Address:</strong> {viewing.address || '—'}</div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-sm-4">
                <div className="erp-card p-3 text-center">
                  <div className="text-muted small text-uppercase">Total Purchases</div>
                  <div className="fs-5 fw-bold">{money(detail.outstanding?.totalPurchases)}</div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="erp-card p-3 text-center">
                  <div className="text-muted small text-uppercase">Total Paid</div>
                  <div className="fs-5 fw-bold">{money(detail.outstanding?.totalPaid)}</div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="erp-card p-3 text-center">
                  <div className="text-muted small text-uppercase">Pending</div>
                  <div
                    className={`fs-5 fw-bold ${
                      Number(detail.outstanding?.totalPending) > 0 ? 'text-danger' : 'text-success'
                    }`}
                  >
                    {money(detail.outstanding?.totalPending)}
                  </div>
                </div>
              </div>
            </div>

            <div className="fw-semibold mb-2">Products purchased from this supplier</div>
            {detail.loading ? (
              <Loader label="Loading history..." />
            ) : productLines.length === 0 ? (
              <p className="text-muted small">No purchases recorded from this supplier yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Product</th>
                      <th className="text-end">Qty</th>
                      <th>Unit</th>
                      <th className="text-end">Purchase Price</th>
                      <th className="text-end">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productLines.map((l, i) => (
                      <tr key={i}>
                        <td>{l.date ? String(l.date).slice(0, 10) : '—'}</td>
                        <td>{l.invoiceNumber}</td>
                        <td>{l.productName}</td>
                        <td className="text-end">{l.quantity}</td>
                        <td>{l.unit || '—'}</td>
                        <td className="text-end">{money(l.purchasePrice)}</td>
                        <td className="text-end">{money(l.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        show={Boolean(deletingRow)}
        title="Delete supplier?"
        message="This will permanently delete this supplier. This action cannot be undone."
        isLoading={isSaving}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRow(null)}
      />
    </div>
  );
}
