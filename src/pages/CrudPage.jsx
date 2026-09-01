import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FiPlus } from 'react-icons/fi';
import useCrud from '../hooks/useCrud';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import PageToolbar from '../components/PageToolbar';

const PAGE_SIZE = 8;

/**
 * Renders a full list + create/edit modal + delete confirmation for a module,
 * driven entirely by a config object. This is what powers every "simple"
 * CRUD module (Roles, Units, Settings, Billing Counters, ...) so the same
 * list/search/paginate/validate/toast logic isn't rewritten 15 times.
 *
 * config = {
 *   title, entityName, service, keyField='id',
 *   columns: [{ key, label, sortable, render }],
 *   fields: [{ name, label, type: 'text'|'number'|'select'|'textarea', required, options, valueKey, labelKey }],
 *   schema: yup schema,
 *   searchKeys: [field names to filter on],
 *   defaultValues: {}
 * }
 */
export default function CrudPage({ config }) {
  const {
    title,
    entityName,
    service,
    keyField = 'id',
    columns,
    fields,
    schema,
    searchKeys = [],
    defaultValues = {},
    compact = false,
  } = config;

  const { items, isLoading, isSaving, load, create, update, remove } = useCrud(service, {
    entityName,
  });

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: schema ? yupResolver(schema) : undefined,
    defaultValues,
  });

  const filtered = useMemo(() => {
    if (!search || searchKeys.length === 0) return items;
    const q = search.toLowerCase();
    return items.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
    );
  }, [items, search, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditingRow(null);
    reset(defaultValues);
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    reset({ ...defaultValues, ...row });
    setShowForm(true);
  };

  const getRecordId = (row) => {
    const candidateKeys = [
      keyField,
      'id',
      `${entityName?.toLowerCase()}Id`,
      `${entityName?.replace(/\s+/g, '').toLowerCase()}Id`,
      'productId',
      '_id',
    ];

    for (const key of candidateKeys) {
      if (key && row?.[key] !== undefined) {
        return row[key];
      }
    }

    return undefined;
  };

  const onSubmit = async (values) => {
    // Coerce number-typed fields since HTML inputs always deliver strings.
    const payload = { ...values };
    fields.forEach((f) => {
      if (f.type === 'number' && payload[f.name] !== '' && payload[f.name] != null) {
        payload[f.name] = Number(payload[f.name]);
      }
    });

    if (editingRow) {
      const recordId = getRecordId(editingRow);
      if (recordId == null) {
        throw new Error('Unable to determine record ID for update');
      }
      await update(recordId, payload);
    } else {
      await create(payload);
    }
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    const recordId = getRecordId(deletingRow);
    if (recordId == null) return;
    await remove(recordId);
    setDeletingRow(null);
  };

  const toolbar = (
    <>
      {searchKeys.length > 0 && (
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={`Search ${title.toLowerCase()}...`}
        />
      )}
      <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
        <FiPlus /> Add {entityName}
      </button>
    </>
  );

  return (
    <div>
      {compact ? (
        <PageToolbar>{toolbar}</PageToolbar>
      ) : (
        <div className="erp-page-header">
          <h1 className="erp-page-title">{title}</h1>
          <div className="d-flex align-items-center gap-2 flex-nowrap">{toolbar}</div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={pagedRows}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={setDeletingRow}
        keyField={keyField}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyMessage={`Click "Add ${entityName}" to create your first record.`}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
      />

      <Modal
        show={showForm}
        title={editingRow ? `Edit ${entityName}` : `Add ${entityName}`}
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
          {fields.map((f) =>
            f.type === 'select' ? (
              <FormSelect
                key={f.name}
                label={f.label}
                name={f.name}
                register={register}
                error={errors[f.name]}
                options={f.options || []}
                required={f.required}
                valueKey={f.valueKey || 'value'}
                labelKey={f.labelKey || 'label'}
              />
            ) : (
              <FormInput
                key={f.name}
                label={f.label}
                name={f.name}
                type={f.type || 'text'}
                step={f.step}
                register={register}
                error={errors[f.name]}
                required={f.required}
                placeholder={f.placeholder}
              />
            )
          )}
        </form>
      </Modal>

      <ConfirmDialog
        show={Boolean(deletingRow)}
        title={`Delete ${entityName}?`}
        message={`This will permanently delete this ${entityName.toLowerCase()}. This action cannot be undone.`}
        isLoading={isSaving}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRow(null)}
      />
    </div>
  );
}

// Re-export so pages can trigger a manual refresh if ever needed elsewhere.
export { PAGE_SIZE };
