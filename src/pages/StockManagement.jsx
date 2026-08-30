import { useEffect, useMemo, useState } from 'react';
import { FiBox, FiAlertTriangle, FiDollarSign, FiRefreshCw } from 'react-icons/fi';
import reportsService from '../services/reportsService';
import stockMovementsService from '../services/stockMovementsService';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);
const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function Tile({ icon: Icon, label, value, tone = '#2f6f4f', bg = 'rgba(47,111,79,0.1)' }) {
  return (
    <div className="erp-card p-3 d-flex align-items-center gap-3 h-100">
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={tone} />
      </div>
      <div>
        <div className="text-muted small text-uppercase" style={{ letterSpacing: '0.04em' }}>
          {label}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1b2e28' }}>{value}</div>
      </div>
    </div>
  );
}

export default function StockManagement() {
  const [rows, setRows] = useState(null);
  const [movements, setMovements] = useState([]);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(false);
    Promise.all([
      reportsService.stock(),
      stockMovementsService.getAll().catch(() => []),
    ])
      .then(([stock, mv]) => {
        if (cancelled) return;
        setRows(asList(stock));
        setMovements(asList(mv));
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.productName?.toLowerCase().includes(q) || String(r.barcode || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    const list = rows || [];
    return {
      skus: list.length,
      low: list.filter((r) => r.lowStock).length,
      value: list.reduce((s, r) => s + Number(r.stockValue || 0), 0),
    };
  }, [rows]);

  const lastMovementFor = (productId) => {
    const mv = movements
      .filter((m) => (m.productId ?? m.product?.productId) === productId)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
    return mv ? `${mv.movementType} ${mv.quantity}` : '—';
  };

  if (error) return <EmptyState title="Could not load stock" message="The stock report endpoint returned an error." />;
  if (!rows) return <Loader label="Loading stock..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Stock Management</h1>
        <div className="d-flex align-items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search product or barcode..." />
          <button
            className="btn btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="alert alert-light border small">
        Stock is <strong>calculated automatically</strong> — Purchases &amp; Sales Returns add stock,
        Sales &amp; Purchase Returns remove it. There is nothing to enter here manually.
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-4">
          <Tile icon={FiBox} label="Products" value={summary.skus} />
        </div>
        <div className="col-sm-4">
          <Tile
            icon={FiAlertTriangle}
            label="Low Stock"
            value={summary.low}
            tone="#dc2626"
            bg="rgba(220,38,38,0.1)"
          />
        </div>
        <div className="col-sm-4">
          <Tile
            icon={FiDollarSign}
            label="Stock Value"
            value={inr(summary.value)}
            tone="#3b82f6"
            bg="rgba(59,130,246,0.1)"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No products" message="Add products in Catalog to see stock here." />
      ) : (
        <div className="table-responsive erp-card">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Unit</th>
                <th className="text-end">In Stock</th>
                <th className="text-end">Purchase</th>
                <th className="text-end">Selling</th>
                <th className="text-end">Stock Value</th>
                <th>Last Movement</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.productId}>
                  <td className="fw-medium">{r.productName}</td>
                  <td>{r.barcode}</td>
                  <td>{r.unit}</td>
                  <td className="text-end">
                    <span className={`badge ${r.lowStock ? 'bg-danger' : 'bg-success'}`}>
                      {r.stockQuantity}
                    </span>
                  </td>
                  <td className="text-end">{Number(r.purchasePrice || 0).toFixed(2)}</td>
                  <td className="text-end">{Number(r.sellingPrice || 0).toFixed(2)}</td>
                  <td className="text-end">{Number(r.stockValue || 0).toFixed(2)}</td>
                  <td className="text-muted small">{lastMovementFor(r.productId)}</td>
                  <td>
                    {r.lowStock ? (
                      <span className="badge bg-warning text-dark">Reorder</span>
                    ) : (
                      <span className="badge bg-success">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
