import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { FiSearch, FiTrash2, FiPrinter, FiShoppingCart } from 'react-icons/fi';
import customersService from '../services/customersService';
import productsService from '../services/productsService';
import productBarcodesService from '../services/productBarcodesService';
import productTaxesService from '../services/productTaxesService';
import salesService from '../services/salesService';
import Loader from '../components/Loader';
import Modal from '../components/Modal';

export default function PointOfSale() {
  const [customers, setCustomers] = useState(null);
  const [products, setProducts] = useState(null);
  const [productTaxes, setProductTaxes] = useState([]);

  const [customerId, setCustomerId] = useState('');
  const [scanValue, setScanValue] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [cart, setCart] = useState([]); // { productId, productName, sellingPrice, gstPercent, stockQuantity, barcode, quantity }
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const scanInputRef = useRef(null);

  useEffect(() => {
    Promise.all([customersService.getAll(), productsService.getAll(), productTaxesService.getAll()]).then(
      ([c, p, t]) => {
        setCustomers(Array.isArray(c) ? c : c?.content || []);
        setProducts(Array.isArray(p) ? p : p?.content || []);
        setProductTaxes(Array.isArray(t) ? t : t?.content || []);
      }
    );
  }, []);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  const gstFor = (productId) =>
    productTaxes.find((t) => t.productId === productId)?.taxPercentage ?? 0;

  const addProductToCart = (product) => {
    if (!product) return;
    if (Number(product.stockQuantity) <= 0) {
      toast.error(`${product.productName} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.stockQuantity) {
          toast.error(`Only ${product.stockQuantity} units of ${product.productName} available`);
          return prev;
        }
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.productName,
          sellingPrice: product.sellingPrice,
          gstPercent: gstFor(product.id),
          stockQuantity: product.stockQuantity,
          barcode: product.barcode,
          quantity: 1,
        },
      ];
    });
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const code = scanValue.trim();
    if (!code) return;
    try {
      const found = await productBarcodesService.scan(code);
      const productId = found?.productId ?? found?.id;
      const product = products.find((p) => p.id === productId || p.barcode === code);
      if (!product) {
        toast.error('Product not found for this barcode');
      } else {
        addProductToCart(product);
        toast.success(`${product.productName} added`);
      }
    } catch {
      // Fall back to a direct barcode match against the product list,
      // in case /product-barcodes/scan/{code} has no entry for this SKU.
      const product = products.find((p) => p.barcode === code);
      if (product) {
        addProductToCart(product);
        toast.success(`${product.productName} added`);
      } else {
        toast.error('Barcode not recognized');
      }
    } finally {
      setScanValue('');
    }
  };

  const searchResults = useMemo(() => {
    if (!productQuery.trim() || !products) return [];
    const q = productQuery.toLowerCase();
    return products
      .filter(
        (p) =>
          p.productName?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.includes(q)
      )
      .slice(0, 8);
  }, [productQuery, products]);

  const updateQuantity = (productId, quantity) => {
    const product = products.find((p) => p.id === productId);
    const qty = Number(quantity);
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.productId !== productId));
      return;
    }
    if (product && qty > product.stockQuantity) {
      toast.error(`Only ${product.stockQuantity} units of ${product.productName} available`);
      return;
    }
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l)));
  };

  const removeLine = (productId) => setCart((prev) => prev.filter((l) => l.productId !== productId));

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, l) => sum + l.sellingPrice * l.quantity, 0);
    const tax = cart.reduce(
      (sum, l) => sum + (l.sellingPrice * l.quantity * (l.gstPercent || 0)) / 100,
      0
    );
    const discount = Number(discountAmount || 0);
    const grandTotal = Math.max(0, subtotal + tax - discount);
    const balance = grandTotal - Number(paidAmount || 0);
    return { subtotal, tax, discount, grandTotal, balance };
  }, [cart, discountAmount, paidAmount]);

  const resetSale = () => {
    setCart([]);
    setCustomerId('');
    setDiscountAmount(0);
    setPaidAmount(0);
  };

  const handleCompleteSale = async () => {
    if (!customerId) return toast.error('Please select a customer');
    if (cart.length === 0) return toast.error('Cart is empty');

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: Number(customerId),
        createdBy: 1,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      };
      const result = await salesService.create(payload);

      toast.success('Sale completed successfully');
      setReceipt({
        ...result,
        cart,
        customer: customers.find((c) => c.id === Number(customerId)),
        totals,
        paymentMethod,
        paidAmount: Number(paidAmount || 0),
        timestamp: dayjs().format('DD MMM YYYY, HH:mm'),
      });

      // Re-fetch products so on-hand stock reflects the backend's update.
      const refreshed = await productsService.getAll();
      setProducts(Array.isArray(refreshed) ? refreshed : refreshed?.content || []);
      resetSale();
    } catch {
      // Global toast already shown by the axios interceptor.
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customers || !products) return <Loader label="Loading POS..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Point of Sale</h1>
      </div>

      <div className="row g-3">
        {/* Left: customer + scan + search + cart */}
        <div className="col-lg-8">
          <div className="erp-card p-3 mb-3">
            <div className="row g-2">
              <div className="col-md-5">
                <label className="form-label">Customer</label>
                <select
                  className="form-select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerName} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-7">
                <label className="form-label">Scan Barcode</label>
                <form onSubmit={handleScanSubmit}>
                  <input
                    ref={scanInputRef}
                    className="form-control pos-scan-input"
                    placeholder="Scan or type barcode, then press Enter"
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                  />
                </form>
              </div>
            </div>
          </div>

          <div className="erp-card p-3 mb-3 position-relative">
            <label className="form-label d-flex align-items-center gap-2">
              <FiSearch /> Search Product
            </label>
            <input
              className="form-control"
              placeholder="Search by name, SKU or barcode..."
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="list-group mt-2">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="list-group-item list-group-item-action d-flex justify-content-between"
                    onClick={() => {
                      addProductToCart(p);
                      setProductQuery('');
                    }}
                  >
                    <span>
                      {p.productName}{' '}
                      <small className="text-muted">
                        {p.sku} · GST {gstFor(p.id)}%
                      </small>
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <span className={`badge ${p.stockQuantity > 0 ? 'bg-success' : 'bg-danger'}`}>
                        Stock: {p.stockQuantity}
                      </span>
                      <strong>{Number(p.sellingPrice).toFixed(2)}</strong>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="erp-card p-0">
            <div className="table-responsive">
              <table className="table pos-cart-table mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th style={{ width: 110 }}>Qty</th>
                    <th>GST</th>
                    <th>Line Total</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        <FiShoppingCart className="mb-2" size={22} />
                        <div>Cart is empty. Scan or search a product to begin.</div>
                      </td>
                    </tr>
                  )}
                  {cart.map((l) => {
                    const lineSubtotal = l.sellingPrice * l.quantity;
                    const lineTax = (lineSubtotal * (l.gstPercent || 0)) / 100;
                    return (
                      <tr key={l.productId}>
                        <td>
                          {l.productName}
                          <div className="small text-muted">{l.barcode}</div>
                        </td>
                        <td>{Number(l.sellingPrice).toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            value={l.quantity}
                            onChange={(e) => updateQuantity(l.productId, e.target.value)}
                          />
                        </td>
                        <td>{l.gstPercent}%</td>
                        <td>{(lineSubtotal + lineTax).toFixed(2)}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeLine(l.productId)}
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: totals + payment */}
        <div className="col-lg-4">
          <div className="erp-card p-3 pos-summary">
            <h6 className="mb-3">Order Summary</h6>
            <div className="d-flex justify-content-between mb-1">
              <span>Subtotal</span>
              <span>{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span>Tax (GST)</span>
              <span>{totals.tax.toFixed(2)}</span>
            </div>
            <div className="mb-2">
              <label className="form-label small mb-1">Discount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control form-control-sm"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <hr />
            <div className="d-flex justify-content-between mb-2">
              <strong>Grand Total</strong>
              <strong>{totals.grandTotal.toFixed(2)}</strong>
            </div>

            <div className="mb-2">
              <label className="form-label small mb-1">Payment Method</label>
              <select
                className="form-select form-select-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="G-PAY">G-Pay / UPI</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="form-label small mb-1">Paid Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control form-control-sm"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
            <div className="d-flex justify-content-between mb-3">
              <span>Balance</span>
              <strong className={totals.balance > 0 ? 'text-danger' : 'text-success'}>
                {totals.balance.toFixed(2)}
              </strong>
            </div>

            <button
              className="btn btn-primary w-100"
              onClick={handleCompleteSale}
              disabled={isSubmitting || cart.length === 0}
            >
              {isSubmitting ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>

      <Modal
        show={Boolean(receipt)}
        title="Sale Completed"
        onClose={() => setReceipt(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReceipt(null)}>
              Close
            </button>
            <button
              className="btn btn-primary d-flex align-items-center gap-1"
              onClick={() => window.print()}
            >
              <FiPrinter /> Print Invoice
            </button>
          </>
        }
      >
        {receipt && (
          <div id="receipt-print">
            <p className="mb-1">
              <strong>Customer:</strong> {receipt.customer?.customerName}
            </p>
            <p className="mb-2 text-muted small">{receipt.timestamp}</p>
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {receipt.cart.map((l) => (
                  <tr key={l.productId}>
                    <td>{l.productName}</td>
                    <td>{l.quantity}</td>
                    <td>{Number(l.sellingPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="d-flex justify-content-between">
              <span>Grand Total</span>
              <strong>{receipt.totals.grandTotal.toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Paid ({receipt.paymentMethod})</span>
              <strong>{receipt.paidAmount.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
