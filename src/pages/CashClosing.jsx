import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import useCrud from '../hooks/useCrud';
import cashClosingService from '../services/cashClosingService';
import DataTable from '../components/DataTable';
import CashClosingModal from '../components/cashClosing/CashClosingModal';
import { formatCurrency, formatDateTime } from '../utils/format';

const STATUS_CLASS = {
  CLOSED: 'bg-success',
  PENDING_APPROVAL: 'bg-warning text-dark',
};

export default function CashClosing() {
  const { items, isLoading, isSaving, create } = useCrud(cashClosingService, {
    entityName: 'Cash Closing',
  });

  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (payload) => {
    await create(payload); // backend recalculates + stores the full snapshot
    setShowForm(false);
  };

  return (
    <div>
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title">Cash Closing</h1>
          <p className="erp-page-subtitle">Close out a counter's cash and digital payment sessions</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => setShowForm(true)}>
          <FiPlus /> Add Cash Closing
        </button>
      </div>

      <DataTable
        columns={[
          {
            key: 'counter',
            label: 'Counter',
            render: (r) => r.counter?.name || r.counterName || `#${r.counterId}`,
          },
          { key: 'openingTime', label: 'Opening', render: (r) => formatDateTime(r.openingTime) },
          { key: 'closingTime', label: 'Closing', render: (r) => formatDateTime(r.closingTime) },
          { key: 'totalSales', label: 'Total Sales', render: (r) => formatCurrency(r.totalSales) },
          {
            key: 'status',
            label: 'Status',
            render: (r) => (
              <span className={`badge ${STATUS_CLASS[r.status] || 'bg-secondary'}`}>
                {r.status || 'CLOSED'}
              </span>
            ),
          },
        ]}
        rows={items}
        isLoading={isLoading}
        keyField="id"
        emptyTitle="No cash closings yet"
        emptyMessage='Click "Add Cash Closing" to close out a counter session.'
      />

      <CashClosingModal
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        isSaving={isSaving}
      />
    </div>
  );
}
