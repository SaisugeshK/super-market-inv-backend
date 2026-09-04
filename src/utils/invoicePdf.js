import jsPDF from 'jspdf';

const inr = (v) => Number(v || 0).toFixed(2);

/**
 * Builds a professional A5 tax-invoice PDF. Mirrors InvoiceDocument.jsx —
 * same fields, same section order — so the on-screen preview, the printed
 * invoice and the downloaded PDF always agree.
 *
 * @param {object} data
 * @param {string} data.invoiceNumber
 * @param {string} data.customerName
 * @param {string} data.timestamp        pre-formatted date/time string
 * @param {string} [data.counterName]
 * @param {string} [data.cashierName]
 * @param {{ productName: string, quantity: number, sellingPrice: number, total?: number }[]} data.items
 * @param {{ subtotal?: number, tax?: number, discount?: number, grandTotal: number, balance?: number }} data.totals
 * @param {string} [data.paymentMethod]
 * @param {number} [data.paidAmount]
 * @returns {jsPDF}
 */
export function buildInvoicePdf({
  invoiceNumber,
  customerName,
  timestamp,
  counterName,
  cashierName,
  items = [],
  totals = {},
  paymentMethod,
  paidAmount,
}) {
  const { subtotal, tax, discount, grandTotal = 0, balance } = totals;
  const primary = [47, 111, 79]; // --erp-primary
  const muted = [124, 139, 132]; // --erp-muted

  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 32;
  let y = 40;

  // ── Header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primary);
  doc.text('Freshmart', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text('Your neighbourhood supermarket', marginX, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('TAX INVOICE', pageWidth - marginX, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(`#${invoiceNumber || '-'}`, pageWidth - marginX, y + 14, { align: 'right' });

  y += 26;
  doc.setDrawColor(...primary);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  doc.setLineWidth(0.5);
  y += 22;

  // ── Meta ──
  const metaCol2 = marginX + (pageWidth - marginX * 2) / 2;
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text('Billed to', marginX, y);
  doc.text('Date', metaCol2, y);
  y += 13;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text(customerName || 'Walk-in customer', marginX, y);
  doc.text(timestamp || '-', metaCol2, y);
  doc.setFont('helvetica', 'normal');

  if (counterName || cashierName) {
    y += 18;
    doc.setTextColor(...muted);
    if (counterName) doc.text('Counter', marginX, y);
    if (cashierName) doc.text('Cashier', metaCol2, y);
    y += 13;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    if (counterName) doc.text(counterName, marginX, y);
    if (cashierName) doc.text(cashierName, metaCol2, y);
    doc.setFont('helvetica', 'normal');
  }

  y += 20;

  // ── Items table ──
  const colQty = pageWidth - marginX - 140;
  const colPrice = pageWidth - marginX - 70;
  const colTotal = pageWidth - marginX;

  doc.setFillColor(246, 246, 241); // --erp-sidebar-bg
  doc.rect(marginX, y - 12, pageWidth - marginX * 2, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text('PRODUCT', marginX + 4, y + 2);
  doc.text('QTY', colQty, y + 2, { align: 'right' });
  doc.text('PRICE', colPrice, y + 2, { align: 'right' });
  doc.text('TOTAL', colTotal, y + 2, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  y += 20;

  items.forEach((item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.sellingPrice || 0);
    const lineTotal = item.total != null ? Number(item.total) : qty * price;

    if (y > pageHeight - 140) {
      doc.addPage();
      y = 40;
    }

    doc.text(String(item.productName || '-'), marginX + 4, y, {
      maxWidth: pageWidth - marginX * 2 - 150,
    });
    doc.text(String(qty), colQty, y, { align: 'right' });
    doc.text(inr(price), colPrice, y, { align: 'right' });
    doc.text(inr(lineTotal), colTotal, y, { align: 'right' });
    y += 18;
    doc.setDrawColor(236, 235, 227); // --erp-border
    doc.line(marginX, y - 6, pageWidth - marginX, y - 6);
  });

  y += 14;

  // ── Totals ──
  const totalsX = pageWidth - marginX;
  const labelX = totalsX - 160;
  doc.setFontSize(10);

  const totalsLine = (label, value, opts = {}) => {
    if (opts.bold) doc.setFont('helvetica', 'bold');
    if (opts.color) doc.setTextColor(...opts.color);
    doc.text(label, labelX, y);
    doc.text(value, totalsX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    y += 16;
  };

  if (subtotal != null) totalsLine('Subtotal', inr(subtotal));
  if (tax) totalsLine('Tax (GST)', inr(tax));
  if (discount) totalsLine('Discount', `-${inr(discount)}`, { color: [180, 60, 60] });

  doc.setDrawColor(...muted);
  doc.line(labelX, y - 4, totalsX, y - 4);
  y += 8;
  doc.setFontSize(13);
  totalsLine('Grand Total', inr(grandTotal), { bold: true, color: primary });
  doc.setFontSize(10);

  if (paymentMethod) totalsLine(`Paid (${paymentMethod})`, inr(paidAmount ?? grandTotal));
  if (balance) totalsLine('Balance due', inr(balance), { color: [180, 60, 60] });

  // ── Footer ──
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text('Thank you for shopping with us!', pageWidth / 2, pageHeight - 30, { align: 'center' });

  return doc;
}

/** Builds the invoice PDF and triggers a browser download. */
export function downloadInvoicePdf(data) {
  const doc = buildInvoicePdf(data);
  doc.save(`${data.invoiceNumber || 'invoice'}.pdf`);
}

export default downloadInvoicePdf;
