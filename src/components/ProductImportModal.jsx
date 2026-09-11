import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload } from 'react-icons/fi';
import Modal from './Modal';
import Loader from './Loader';
import productImportService from '../services/productImportService';

// Turns a backend error message ("SKU already exists: RICE-SM-5KG") into a
// plain-language bucket, so a store owner can see the PATTERN across many
// failed rows at a glance instead of reading each one individually — e.g.
// "all 53 failed because the SKU already exists" rather than 53 lines that
// all happen to say the same thing in slightly different words.
function categorizeFailure(message) {
  const m = (message || '').toLowerCase();
  if (m.includes('duplicate sku')) return 'Duplicate SKU repeated within this file';
  if (m.includes('sku already exists')) return 'SKU already exists in your catalog';
  if (m.includes('duplicate barcode')) return 'Duplicate barcode repeated within this file';
  if (m.includes('barcode already exists')) return 'Barcode already exists in your catalog';
  if (m.includes('missing required column')) return 'The file is missing a required column';
  if (m.includes('cannot be negative') || m.includes('must be positive')) return 'A price or quantity was negative';
  if (m.includes('must be a whole number') || m.includes('must be a number')) return 'A number field contained text';
  if (m.includes('required')) return 'A required field was left blank';
  return 'Other';
}

// One actionable next step per reason bucket, shown so the customer knows
// what to actually do, not just what went wrong.
const TIP_BY_REASON = {
  'SKU already exists in your catalog':
    "These products are already in your Products list — nothing to fix, or use a different SKU if you meant to add a new product.",
  'Barcode already exists in your catalog':
    'That barcode already belongs to another product — check Products/Stock, or correct the barcode in your file.',
  'Duplicate SKU repeated within this file':
    'The same SKU appears more than once in your file — keep one row per SKU and re-upload.',
  'Duplicate barcode repeated within this file':
    'The same barcode appears more than once in your file — keep one row per barcode and re-upload.',
  'The file is missing a required column':
    'Click "Download template" above and copy your rows into it so every required column is present.',
  'A required field was left blank':
    'Fill in the missing field named in the row below, then re-upload just that row.',
  'A price or quantity was negative':
    'Fix the negative value named in the row below, then re-upload just that row.',
  'A number field contained text':
    'Make sure price/quantity columns contain only numbers, then re-upload just that row.',
};

/**
 * "Import CSV/Excel" modal for the Products page — additive to the existing
 * single "Add Product" form, never replaces it. Reuses Modal/Loader (the
 * same loading UI pieces the rest of the app already uses) rather than
 * introducing new ones.
 */
export default function ProductImportModal({ show, onClose, onImported }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null); // { totalRows, succeeded, failed, rows }
  const [showFailed, setShowFailed] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const reset = () => {
    setFile(null);
    setResult(null);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleFileChange = (e) => {
    setResult(null);
    setFile(e.target.files?.[0] ?? null);
  };

  const handleDownloadTemplate = async () => {
    try {
      await productImportService.downloadTemplate('csv');
    } catch {
      /* axios interceptor already toasts network/server errors */
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Choose a .csv or .xlsx file first');
      return;
    }
    setIsImporting(true);
    setResult(null);
    try {
      const data = await productImportService.importFile(file);
      setResult(data);
      if (data.succeeded > 0) {
        toast.success(`${data.succeeded} of ${data.totalRows} products imported successfully`);
        await onImported?.();
      } else if (data.failed > 0) {
        toast.error(`All ${data.failed} row(s) failed — see details below`);
      }
    } catch {
      /* interceptor toasts 400/403/500/network */
    } finally {
      setIsImporting(false);
    }
  };

  const rows = result?.rows ?? [];
  const failedRows = rows.filter((r) => r.status === 'failed');
  const notedRows = rows.filter((r) => r.status === 'created' && r.message && r.message !== 'Created');

  // Group failures into plain-language buckets so the customer sees the
  // PATTERN (e.g. "all 53 rows failed for the same reason") before ever
  // opening the row-by-row list.
  const reasonCounts = failedRows.reduce((acc, r) => {
    const reason = categorizeFailure(r.message);
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});
  const topReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);

  return (
    <Modal
      show={show}
      title="Import Products"
      size="modal-lg"
      onClose={handleClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleImport} disabled={isImporting || !file}>
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </>
      }
    >
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <label className="form-label mb-0" htmlFor="product-import-file">
          Choose file (.csv or .xlsx)
        </label>
        <button
          type="button"
          className="btn btn-link btn-sm p-0 text-decoration-none d-flex align-items-center gap-1"
          onClick={handleDownloadTemplate}
        >
          <FiDownload size={13} /> Download template
        </button>
      </div>
      <input
        id="product-import-file"
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        className="form-control"
        onChange={handleFileChange}
        disabled={isImporting}
      />

      {isImporting && <Loader label="Importing products..." />}

      {result && !isImporting && (
        <div className="mt-3">
          <div
            className={`alert ${
              result.failed === 0 ? 'alert-success' : result.succeeded === 0 ? 'alert-danger' : 'alert-warning'
            }`}
          >
            {result.succeeded} of {result.totalRows} products imported successfully
            {result.failed > 0 && ` — ${result.failed} row(s) failed`}
          </div>

          {failedRows.length > 0 && (
            <div className="mb-2">
              <div className="alert alert-secondary py-2 px-3 mb-2">
                <div className="fw-semibold small text-uppercase text-muted mb-1">Why these failed</div>
                <ul className="mb-0 ps-3 small">
                  {topReasons.map(([reason, count]) => (
                    <li key={reason}>
                      <strong>
                        {count} row{count === 1 ? '' : 's'}
                      </strong>
                      : {reason}.{TIP_BY_REASON[reason] ? ` ${TIP_BY_REASON[reason]}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none"
                onClick={() => setShowFailed((s) => !s)}
              >
                {showFailed ? 'Hide' : 'Show'} row-by-row details ({failedRows.length})
              </button>
              {showFailed && (
                <ul className="list-group mt-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {failedRows.map((r) => (
                    <li key={r.rowNumber} className="list-group-item d-flex flex-column">
                      <span className="fw-semibold">
                        Row {r.rowNumber}
                        {r.productName ? ` — ${r.productName}` : ''}
                      </span>
                      <span className="text-danger small">{r.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {notedRows.length > 0 && (
            <div>
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none"
                onClick={() => setShowNotes((s) => !s)}
              >
                {showNotes ? 'Hide' : 'Show'} new categories/units created ({notedRows.length})
              </button>
              {showNotes && (
                <ul className="list-group mt-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {notedRows.map((r) => (
                    <li key={r.rowNumber} className="list-group-item small">
                      Row {r.rowNumber} ({r.productName}): {r.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
