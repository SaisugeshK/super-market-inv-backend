import { formatCurrency, getDifferenceStatus } from '../../utils/format';

const STATUS_CLASS = {
  MATCH: 'bg-success',
  SHORTAGE: 'bg-danger',
  EXCESS: 'bg-warning text-dark',
};

/**
 * Difference preview shown next to the actual-amount input. This is a
 * client-side preview only — the authoritative difference is recomputed
 * and stored by the backend on submit.
 */
export default function DifferenceBadge({ difference }) {
  const status = getDifferenceStatus(difference);
  return (
    <div className="d-flex justify-content-between align-items-center py-1">
      <span className="text-muted small">Difference</span>
      <span className="d-flex align-items-center gap-2">
        <span className={difference < 0 ? 'text-danger fw-semibold' : difference > 0 ? 'text-warning fw-semibold' : 'fw-semibold'}>
          {difference < 0 ? '-' : ''}
          {formatCurrency(Math.abs(difference))}
        </span>
        <span className={`badge ${STATUS_CLASS[status]}`}>{status}</span>
      </span>
    </div>
  );
}
