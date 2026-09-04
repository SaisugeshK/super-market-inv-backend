const inr = (v) => `₹${Number(v || 0).toFixed(2)}`;

/**
 * The one invoice layout used everywhere a sale is shown as a document:
 * the "Sale Completed" preview, the browser print output (portaled to
 * #receipt-print-root — see PointOfSale.jsx), and mirrored by
 * utils/invoicePdf.js for the downloadable PDF. Keep all three in sync
 * when this changes.
 */
export default function InvoiceDocument({
  invoiceNumber,
  customerName,
  timestamp,
  counterName,
  cashierName,
  items = [],
  totals = {},
  paymentMethod,
  paidAmount,
  id,
}) {
  const { subtotal = 0, tax = 0, discount = 0, grandTotal = 0, balance = 0 } = totals;

  return (
    <div id={id} className="invoice-doc">
      <div className="invoice-doc__header">
        <div>
          <div className="invoice-doc__brand">Freshmart</div>
          <div className="invoice-doc__tagline">Your neighbourhood supermarket</div>
        </div>
        <div className="text-end">
          <div className="invoice-doc__title">TAX INVOICE</div>
          <div className="text-muted small">#{invoiceNumber || '—'}</div>
        </div>
      </div>

      <div className="invoice-doc__meta">
        <div>
          <div className="text-muted small">Billed to</div>
          <div className="fw-semibold">{customerName || 'Walk-in customer'}</div>
        </div>
        <div>
          <div className="text-muted small">Date</div>
          <div className="fw-semibold">{timestamp || '—'}</div>
        </div>
        {counterName && (
          <div>
            <div className="text-muted small">Counter</div>
            <div className="fw-semibold">{counterName}</div>
          </div>
        )}
        {cashierName && (
          <div>
            <div className="text-muted small">Cashier</div>
            <div className="fw-semibold">{cashierName}</div>
          </div>
        )}
      </div>

      <table className="invoice-doc__table">
        <thead>
          <tr>
            <th>Product</th>
            <th className="text-end">Qty</th>
            <th className="text-end">Price</th>
            <th className="text-end">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l, idx) => {
            const qty = Number(l.quantity || 0);
            const price = Number(l.sellingPrice || 0);
            const lineTotal = l.total != null ? Number(l.total) : qty * price;
            return (
              <tr key={l.productId ?? l.saleItemId ?? idx}>
                <td>{l.productName}</td>
                <td className="text-end">{qty}</td>
                <td className="text-end">{price.toFixed(2)}</td>
                <td className="text-end">{lineTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="invoice-doc__totals">
        <div className="d-flex justify-content-between">
          <span>Subtotal</span>
          <span>{inr(subtotal)}</span>
        </div>
        {tax > 0 && (
          <div className="d-flex justify-content-between">
            <span>Tax (GST)</span>
            <span>{inr(tax)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="d-flex justify-content-between text-danger">
            <span>Discount</span>
            <span>-{inr(discount)}</span>
          </div>
        )}
        <div className="d-flex justify-content-between invoice-doc__grand-total">
          <span>Grand Total</span>
          <span>{inr(grandTotal)}</span>
        </div>
        {paymentMethod && (
          <div className="d-flex justify-content-between">
            <span>Paid ({paymentMethod})</span>
            <span>{inr(paidAmount ?? grandTotal)}</span>
          </div>
        )}
        {balance > 0 && (
          <div className="d-flex justify-content-between text-danger">
            <span>Balance due</span>
            <span>{inr(balance)}</span>
          </div>
        )}
      </div>

      <div className="invoice-doc__footer">Thank you for shopping with us!</div>
    </div>
  );
}
