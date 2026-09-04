import { formatCurrency } from '../../utils/format';

/**
 * One read-only "label -> amount" line, reused by the cash and digital
 * payment sections so the layout stays identical everywhere.
 */
export default function PaymentMethodClosingRow({
  label,
  value,
  muted = false,
  strong = false,
  subtract = false,
}) {
  return (
    <div className="d-flex justify-content-between align-items-center py-1">
      <span className={muted ? 'text-muted small' : ''}>{label}</span>
      <span className={strong ? 'fw-semibold' : ''}>
        {subtract && Number(value) > 0 ? '-' : ''}
        {formatCurrency(value)}
      </span>
    </div>
  );
}
