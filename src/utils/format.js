/**
 * Shared display formatters. Small on purpose — add to this file instead of
 * re-declaring `inr(...)`/`formatCurrency(...)` helpers inside individual pages.
 */
export const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatDateTime = (value) =>
  value ? String(value).replace('T', ' ').slice(0, 16) : '—';

// Cash/digital-payment reconciliation status from actual - expected.
export const getDifferenceStatus = (difference) => {
  if (!Number.isFinite(difference) || Math.abs(difference) < 0.005) return 'MATCH';
  return difference < 0 ? 'SHORTAGE' : 'EXCESS';
};
