import PaymentMethodClosingRow from './PaymentMethodClosingRow';
import DifferenceBadge from './DifferenceBadge';
import { formatCurrency } from '../../utils/format';

/**
 * Physical CASH is kept separate from digital payment methods per the
 * business rules — it is the only method with a mandatory actual count.
 *
 * Opening Cash is user-typed here (defaults to 0) instead of being locked to
 * the backend's carried-over previous-closing figure — this is a display/UX
 * preference only. The backend still independently computes and stores the
 * real opening/expected amounts on submit (see cashClosingService.close).
 */
export default function CashClosingSection({ entry, value, onChange, opening, onOpeningChange, error }) {
  if (!entry) {
    return (
      <div className="erp-card p-3 mb-3">
        <h6 className="mb-2">CASH</h6>
        <div className="text-muted small">No cash payment method configured for this counter.</div>
      </div>
    );
  }

  const openingAmount = Number(opening || 0);
  const expectedClosing =
    openingAmount + Number(entry.salesAmount || 0) - Number(entry.refundAmount || 0) - Number(entry.expenseAmount || 0);

  const hasValue = value !== '' && value != null;
  const difference = hasValue ? Number(value) - expectedClosing : null;

  return (
    <div className="erp-card p-3 mb-3">
      <h6 className="mb-2">CASH</h6>

      <div className="d-flex justify-content-between align-items-center py-1">
        <label htmlFor="cashOpeningBalance" className="mb-0">
          Opening Cash
        </label>
        <input
          id="cashOpeningBalance"
          type="number"
          step="0.01"
          min="0"
          className="form-control form-control-sm text-end"
          style={{ maxWidth: '10rem' }}
          value={opening}
          onChange={(e) => onOpeningChange(e.target.value)}
        />
      </div>
      <PaymentMethodClosingRow label="Cash Sales" value={entry.salesAmount} muted />
      <PaymentMethodClosingRow label="Refunds" value={entry.refundAmount} muted subtract />
      <PaymentMethodClosingRow label="Expenses" value={entry.expenseAmount} muted subtract />
      <div className="d-flex justify-content-between align-items-center py-1">
        <span>Expected Closing Cash</span>
        <span className="fw-semibold">{formatCurrency(expectedClosing)}</span>
      </div>

      <div className="mt-3">
        <label htmlFor="actualCashClosing" className="form-label">
          Actual Closing Cash <span className="text-danger">*</span>
        </label>
        <input
          id="actualCashClosing"
          type="number"
          step="0.01"
          min="0"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          placeholder="Enter counted cash"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {error && <div className="invalid-feedback">{error}</div>}
      </div>

      {hasValue && (
        <div className="mt-2">
          <DifferenceBadge difference={difference} />
        </div>
      )}
    </div>
  );
}
