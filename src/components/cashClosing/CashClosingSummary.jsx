import CashClosingSection from "./CashClosingSection";
import DigitalPaymentSection from "./DigitalPaymentSection";
import { formatCurrency } from "../../utils/format";

/**
 * Renders the backend-calculated summary for the selected counter:
 * session dates, the CASH section, every other payment method, and the
 * read-only total. Nothing here computes a financial figure — it only
 * displays what GET /cash-closing/counter/{id}/summary returned.
 */
export default function CashClosingSummary({
  summary,
  actuals,
  onActualChange,
  cashError,
  cashOpening,
  onCashOpeningChange,
  digitalOpenings,
  onDigitalOpeningChange,
}) {
  const paymentSummary = summary.paymentSummary || [];
  const cashEntry = paymentSummary.find((p) => p.paymentMethod === "CASH");
  const digitalEntries = paymentSummary.filter(
    (p) => p.paymentMethod !== "CASH",
  );

  return (
    <div>
      {summary.session && (
        <div className="d-flex gap-4 mb-3 text-muted small">
          <span>Opening date: {summary.session.openingDate || "—"}</span>
          <span>Last closing: {summary.session.lastClosingDate || "—"}</span>
        </div>
      )}

      <CashClosingSection
        entry={cashEntry}
        value={actuals.CASH ?? ""}
        onChange={(v) => onActualChange("CASH", v)}
        opening={cashOpening}
        onOpeningChange={onCashOpeningChange}
        error={cashError}
      />

      <DigitalPaymentSection
        entries={digitalEntries}
        values={actuals}
        onChange={onActualChange}
        openings={digitalOpenings}
        onOpeningChange={onDigitalOpeningChange}
      />

      <div className="erp-card p-3 d-flex justify-content-between align-items-center">
        <span className="fw-semibold">Total Sales</span>
        <span className="fw-bold fs-5">
          {formatCurrency(summary.totalSales)}
        </span>
      </div>
    </div>
  );
}
