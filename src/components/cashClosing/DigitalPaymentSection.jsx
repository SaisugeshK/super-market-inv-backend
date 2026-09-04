import PaymentMethodClosingRow from './PaymentMethodClosingRow';
import DifferenceBadge from './DifferenceBadge';
import { formatCurrency } from '../../utils/format';

const METHOD_LABEL = {
  GPAY: 'GPay',
  UPI: 'UPI',
  PHONEPE: 'PhonePe',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT: 'Credit',
  OTHER: 'Other',
};

/**
 * Every non-CASH payment method the backend reports for this counter —
 * scalable by design, not hardcoded to GPay/UPI. Opening Amount is
 * user-typed here (defaults to 0) same as the CASH section, instead of
 * being locked to the backend's carried-over figure — display/UX
 * preference only, backend still independently computes and stores the
 * real opening/expected amounts on submit.
 */
export default function DigitalPaymentSection({ entries, values, onChange, openings, onOpeningChange }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="erp-card p-3 mb-3">
        <h6 className="mb-2">Digital Payments</h6>
        <div className="text-muted small">No digital payments recorded for this session.</div>
      </div>
    );
  }

  return (
    <div className="erp-card p-3 mb-3">
      <h6 className="mb-3">Digital Payments</h6>

      {entries.map((entry, idx) => {
        const method = entry.paymentMethod;
        const opening = openings[method] ?? '0';
        const openingAmount = Number(opening || 0);
        const expectedClosing =
          openingAmount + Number(entry.salesAmount || 0) - Number(entry.refundAmount || 0);

        const value = values[method] ?? '';
        const hasValue = value !== '' && value != null;
        const difference = hasValue ? Number(value) - expectedClosing : null;

        return (
          <div key={method} className={idx > 0 ? 'mt-3 pt-3 border-top' : ''}>
            <div className="fw-semibold mb-1">{METHOD_LABEL[method] || method}</div>

            <div className="d-flex justify-content-between align-items-center py-1">
              <label htmlFor={`opening-${method}`} className="mb-0">
                Opening Amount
              </label>
              <input
                id={`opening-${method}`}
                type="number"
                step="0.01"
                min="0"
                className="form-control form-control-sm text-end"
                style={{ maxWidth: '10rem' }}
                value={opening}
                onChange={(e) => onOpeningChange(method, e.target.value)}
              />
            </div>
            <PaymentMethodClosingRow label="Sales" value={entry.salesAmount} muted />
            {Number(entry.refundAmount) > 0 && (
              <PaymentMethodClosingRow label="Refunds" value={entry.refundAmount} muted subtract />
            )}
            <div className="d-flex justify-content-between align-items-center py-1">
              <span>Expected Amount</span>
              <span className="fw-semibold">{formatCurrency(expectedClosing)}</span>
            </div>

            <div className="mt-2">
              <label htmlFor={`actual-${method}`} className="form-label">
                Verified Amount
              </label>
              <input
                id={`actual-${method}`}
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="Enter verified amount"
                value={value}
                onChange={(e) => onChange(method, e.target.value)}
              />
            </div>

            {hasValue && (
              <div className="mt-2">
                <DifferenceBadge difference={difference} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
