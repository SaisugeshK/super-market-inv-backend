import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  FiSearch,
  FiTrash2,
  FiPrinter,
  FiDownload,
  FiShoppingCart,
  FiUserPlus,
  FiPause,
  FiClock,
  FiFileText,
} from "react-icons/fi";
import customersService from "../services/customersService";
import productsService from "../services/productsService";
import productTaxesService from "../services/productTaxesService";
import billingCountersService from "../services/billingCountersService";
import salesService from "../services/salesService";
import salesItemsService from "../services/salesItemsService";
import holdInvoicesService from "../services/holdInvoicesService";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import InvoiceDocument from "../components/InvoiceDocument";
import { downloadInvoicePdf } from "../utils/invoicePdf";

const asList = (data) =>
  Array.isArray(data) ? data : data?.content || data?.data || [];
const pid = (p) => p?.id ?? p?.productId;

export default function PointOfSale() {
  const { user } = useAuth();

  const [customers, setCustomers] = useState(null);
  const [products, setProducts] = useState(null);
  const [productTaxes, setProductTaxes] = useState([]);
  const [counters, setCounters] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [counterId, setCounterId] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [apiResults, setApiResults] = useState([]);
  const [cart, setCart] = useState([]); // { productId, productName, sellingPrice, gstPercent, stockQuantity, barcode, quantity }
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // inline "add customer" so the cashier never leaves the POS screen
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: "",
    phone: "",
    email: "",
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // held bills + invoice preview, both handled inside this screen
  const [heldBills, setHeldBills] = useState([]);
  const [showHeld, setShowHeld] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const scanInputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      customersService.getAll(),
      productsService.getAll(),
      productTaxesService.getAll(),
      billingCountersService.getAll().catch(() => []),
      holdInvoicesService.getAll().catch(() => []),
    ]).then(([c, p, t, ct, hb]) => {
      setCustomers(asList(c));
      setProducts(asList(p));
      setProductTaxes(asList(t));
      const counterList = asList(ct).map((row) => ({
        ...row,
        id: row.id ?? row.counterId,
      }));
      setCounters(counterList);
      if (counterList.length === 1) setCounterId(String(counterList[0].id));
      setHeldBills(asList(hb));
    });
  }, []);

  const refreshHeld = () =>
    holdInvoicesService
      .getAll()
      .then((d) => setHeldBills(asList(d)))
      .catch(() => {});

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  // Type-to-search against GET /api/products/search?q= (debounced), with a
  // local fallback if the endpoint is unavailable.
  useEffect(() => {
    const q = productQuery.trim();
    if (!q) {
      setApiResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await productsService.search(q);
        setApiResults(asList(data));
      } catch {
        setApiResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [productQuery]);

  const gstFor = (productId) =>
    productTaxes.find((t) => (t.productId ?? t.id) === productId)
      ?.taxPercentage ?? 0;

  const addProductToCart = (product) => {
    if (!product) return;
    const id = pid(product);
    if (Number(product.stockQuantity) <= 0) {
      toast.error(`${product.productName} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === id);
      if (existing) {
        if (existing.quantity + 1 > product.stockQuantity) {
          toast.error(
            `Only ${product.stockQuantity} units of ${product.productName} available`,
          );
          return prev;
        }
        return prev.map((l) =>
          l.productId === id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: id,
          productName: product.productName,
          sellingPrice: Number(product.sellingPrice),
          gstPercent: gstFor(id),
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
      // Primary: backend barcode lookup — GET /api/products/barcode/{barcode}
      const product = await productsService.getByBarcode(code);
      if (product && pid(product)) {
        addProductToCart(product);
        toast.success(`${product.productName} added`);
      } else {
        toast.error("Product not found for this barcode");
      }
    } catch {
      // Fallback: match against the already-loaded product list.
      const product = products.find((p) => p.barcode === code);
      if (product) {
        addProductToCart(product);
        toast.success(`${product.productName} added`);
      } else {
        toast.error("Barcode not recognized");
      }
    } finally {
      setScanValue("");
      scanInputRef.current?.focus();
    }
  };

  const searchResults = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    if (apiResults.length > 0) return apiResults.slice(0, 8);
    return (products || [])
      .filter(
        (p) =>
          p.productName?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.includes(q),
      )
      .slice(0, 8);
  }, [productQuery, apiResults, products]);

  const updateQuantity = (productId, quantity) => {
    const product = products.find((p) => pid(p) === productId);
    const qty = Number(quantity);
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.productId !== productId));
      return;
    }
    if (product && qty > product.stockQuantity) {
      toast.error(
        `Only ${product.stockQuantity} units of ${product.productName} available`,
      );
      return;
    }
    setCart((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, quantity: qty } : l,
      ),
    );
  };

  const removeLine = (productId) =>
    setCart((prev) => prev.filter((l) => l.productId !== productId));

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, l) => sum + l.sellingPrice * l.quantity,
      0,
    );
    const tax = cart.reduce(
      (sum, l) =>
        sum + (l.sellingPrice * l.quantity * (l.gstPercent || 0)) / 100,
      0,
    );
    const discount = Number(discountAmount || 0);
    const grandTotal = Math.max(0, subtotal + tax - discount);
    const balance = grandTotal - Number(paidAmount || 0);
    return { subtotal, tax, discount, grandTotal, balance };
  }, [cart, discountAmount, paidAmount]);

  const handleAddCustomer = async () => {
    if (!newCustomer.customerName.trim())
      return toast.error("Enter a customer name");
    if (!newCustomer.phone.trim()) return toast.error("Enter a phone number");
    setSavingCustomer(true);
    try {
      const created = await customersService.create({
        customerName: newCustomer.customerName.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim() || null,
        status: "ACTIVE",
      });
      const list = asList(await customersService.getAll());
      setCustomers(list);
      const newId = created?.id ?? created?.customerId;
      if (newId != null) setCustomerId(String(newId));
      toast.success("Customer added");
      setShowNewCustomer(false);
      setNewCustomer({ customerName: "", phone: "", email: "" });
    } catch {
      // interceptor toasts the error
    } finally {
      setSavingCustomer(false);
    }
  };

  const resetSale = () => {
    setCart([]);
    setCustomerId("");
    setDiscountAmount(0);
    setPaidAmount(0);
  };

  const openPreview = () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (counters.length > 0 && !counterId)
      return toast.error("Please select a billing counter");
    setShowPreview(true);
  };

  const handleHold = async () => {
    if (cart.length === 0) return toast.error("Nothing to hold");
    try {
      await holdInvoicesService.create({
        data: JSON.stringify({
          cart,
          customerId,
          counterId,
          discountAmount,
          paymentMethod,
          savedAt: dayjs().format("DD MMM YYYY, HH:mm"),
        }),
      });
      toast.success("Bill held");
      resetSale();
      refreshHeld();
    } catch {
      /* interceptor toasts */
    }
  };

  const resumeHold = (bill) => {
    try {
      const d = JSON.parse(bill.data || "{}");
      setCart(Array.isArray(d.cart) ? d.cart : []);
      setCustomerId(d.customerId || "");
      setCounterId(d.counterId || counterId);
      setDiscountAmount(d.discountAmount || 0);
      setPaymentMethod(d.paymentMethod || "CASH");
      setShowHeld(false);
      holdInvoicesService.remove(bill.id ?? bill.holdId).then(refreshHeld).catch(() => {});
      toast.success("Bill resumed");
    } catch {
      toast.error("Could not read this held bill");
    }
  };

  const deleteHold = (bill) => {
    holdInvoicesService
      .remove(bill.id ?? bill.holdId)
      .then(() => {
        toast.success("Held bill discarded");
        refreshHeld();
      })
      .catch(() => {});
  };

  const doCompleteSale = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (counters.length > 0 && !counterId)
      return toast.error("Please select a billing counter");

    setIsSubmitting(true);
    try {
      const paymentStatus =
        Number(paidAmount || 0) >= totals.grandTotal ? "PAID" : "PENDING";

      const payload = {
        customerId: customerId ? Number(customerId) : null, // optional for walk-in
        counterId: counterId ? Number(counterId) : null,
        createdBy: user?.id ?? user?.userId ?? 1,
        paymentMethod,
        paymentStatus,
        totalAmount: Number(totals.grandTotal.toFixed(2)),
        // invoiceNumber left blank -> backend auto-generates INV-YYYYMMDD-XXXXX
      };
      const result = await salesService.create(payload);
      const saleId = result?.saleId ?? result?.id;

      // Record each cart line so stock is deducted (SalesItemServiceImpl).
      if (saleId) {
        await Promise.all(
          cart.map((l) =>
            salesItemsService.create({
              saleId: Number(saleId),
              productId: Number(l.productId),
              quantity: Number(l.quantity),
            }),
          ),
        );
      }

      toast.success("Sale completed successfully");
      setShowPreview(false);
      setReceipt({
        ...result,
        cart,
        customer: customers.find(
          (c) => (c.id ?? c.customerId) === Number(customerId),
        ),
        totals,
        paymentMethod,
        paidAmount: Number(paidAmount || 0),
        timestamp: dayjs().format("DD MMM YYYY, HH:mm"),
      });

      // Re-fetch products so on-hand stock reflects the backend's update.
      const refreshed = await productsService.getAll();
      setProducts(asList(refreshed));
      resetSale();
    } catch {
      // Global toast already shown by the axios interceptor.
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single source of truth for the invoice — feeds the on-screen preview,
  // the print portal and the downloadable PDF alike.
  const invoiceData = receipt
    ? {
        invoiceNumber: receipt.invoiceNumber,
        customerName: receipt.customer?.customerName,
        timestamp: receipt.timestamp,
        counterName: counters.find((c) => (c.id ?? c.counterId) === Number(counterId))
          ?.counterName,
        cashierName: user?.name || user?.username || user?.email,
        items: receipt.cart,
        totals: receipt.totals,
        paymentMethod: receipt.paymentMethod,
        paidAmount: receipt.paidAmount,
      }
    : null;

  if (!customers || !products) return <Loader label="Loading POS..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Billing / New Sale</h1>
        <button
          type="button"
          className="btn btn-outline-secondary d-flex align-items-center gap-1"
          onClick={() => setShowHeld(true)}
        >
          <FiClock size={15} /> Held Bills
          {heldBills.length > 0 && (
            <span className="badge bg-secondary ms-1">{heldBills.length}</span>
          )}
        </button>
      </div>

      <div className="row g-3">
        {/* Left: customer + scan + search + cart */}
        <div className="col-lg-8">
          <div className="erp-card p-3 mb-3">
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label d-flex justify-content-between align-items-center">
                  <span>Customer (optional)</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none d-flex align-items-center gap-1"
                    onClick={() => setShowNewCustomer(true)}
                  >
                    <FiUserPlus size={13} /> New
                  </button>
                </label>
                <select
                  className="form-select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Walk-in customer</option>
                  {customers.map((c) => (
                    <option
                      key={c.id ?? c.customerId}
                      value={c.id ?? c.customerId}
                    >
                      {c.customerName} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Counter</label>
                <select
                  className="form-select"
                  value={counterId}
                  onChange={(e) => setCounterId(e.target.value)}
                >
                  <option value="">Select counter...</option>
                  {counters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.counterName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-5">
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
                    key={pid(p)}
                    type="button"
                    className="list-group-item list-group-item-action d-flex justify-content-between"
                    onClick={() => {
                      addProductToCart(p);
                      setProductQuery("");
                    }}
                  >
                    <span>
                      {p.productName}{" "}
                      <small className="text-muted">
                        {p.sku} · GST {gstFor(pid(p))}%
                      </small>
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <span
                        className={`badge ${p.stockQuantity > 0 ? "bg-success" : "bg-danger"}`}
                      >
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
                        <div>
                          Cart is empty. Scan or search a product to begin.
                        </div>
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
                            onChange={(e) =>
                              updateQuantity(l.productId, e.target.value)
                            }
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
                <option value="UPI">UPI</option>
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
              <strong
                className={totals.balance > 0 ? "text-danger" : "text-success"}
              >
                {totals.balance.toFixed(2)}
              </strong>
            </div>

            <button
              className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-1"
              onClick={openPreview}
              disabled={isSubmitting || cart.length === 0}
            >
              <FiFileText size={15} /> Preview &amp; Complete
            </button>
            <button
              className="btn btn-outline-secondary w-100 mt-2 d-flex align-items-center justify-content-center gap-1"
              onClick={handleHold}
              disabled={cart.length === 0}
            >
              <FiPause size={14} /> Hold Bill
            </button>
          </div>
        </div>
      </div>

      <Modal
        show={showNewCustomer}
        title="Add Customer"
        onClose={() => setShowNewCustomer(false)}
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowNewCustomer(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddCustomer}
              disabled={savingCustomer}
            >
              {savingCustomer ? "Saving..." : "Save & Select"}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">
            Customer Name <span className="text-danger">*</span>
          </label>
          <input
            className="form-control"
            value={newCustomer.customerName}
            onChange={(e) =>
              setNewCustomer((c) => ({ ...c, customerName: e.target.value }))
            }
            autoFocus
          />
        </div>
        <div className="mb-3">
          <label className="form-label">
            Phone <span className="text-danger">*</span>
          </label>
          <input
            className="form-control"
            value={newCustomer.phone}
            onChange={(e) =>
              setNewCustomer((c) => ({ ...c, phone: e.target.value }))
            }
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={newCustomer.email}
            onChange={(e) =>
              setNewCustomer((c) => ({ ...c, email: e.target.value }))
            }
          />
        </div>
      </Modal>

      <Modal
        show={showPreview}
        title="Invoice Preview"
        size="modal-lg"
        onClose={() => setShowPreview(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>
              Back
            </button>
            <button
              className="btn btn-primary d-flex align-items-center gap-1"
              onClick={doCompleteSale}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm & Complete Sale"}
            </button>
          </>
        }
      >
        <div className="d-flex justify-content-between mb-2">
          <div>
            <div className="fw-bold" style={{ fontSize: 15 }}>
              Invoice (auto-numbered on confirm)
            </div>
            <div className="text-muted small">{dayjs().format("DD MMM YYYY, HH:mm")}</div>
          </div>
          <div className="text-end small">
            <div>
              <strong>Customer:</strong>{" "}
              {customers.find((c) => (c.id ?? c.customerId) === Number(customerId))
                ?.customerName || "Walk-in"}
            </div>
            <div>
              <strong>Counter:</strong>{" "}
              {counters.find((c) => c.id === Number(counterId))?.counterName || "—"}
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-end">Qty</th>
                <th className="text-end">Price</th>
                <th className="text-end">GST</th>
                <th className="text-end">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((l) => {
                const sub = l.sellingPrice * l.quantity;
                const tax = (sub * (l.gstPercent || 0)) / 100;
                return (
                  <tr key={l.productId}>
                    <td>{l.productName}</td>
                    <td className="text-end">{l.quantity}</td>
                    <td className="text-end">{Number(l.sellingPrice).toFixed(2)}</td>
                    <td className="text-end">{l.gstPercent || 0}%</td>
                    <td className="text-end">{(sub + tax).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-end">
          <div style={{ minWidth: 240 }}>
            <div className="d-flex justify-content-between">
              <span>Subtotal</span>
              <span>{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Tax (GST)</span>
              <span>{totals.tax.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Discount</span>
              <span>-{totals.discount.toFixed(2)}</span>
            </div>
            <hr className="my-1" />
            <div className="d-flex justify-content-between fw-bold">
              <span>Grand Total</span>
              <span>{totals.grandTotal.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Paid ({paymentMethod})</span>
              <span>{Number(paidAmount || 0).toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Balance</span>
              <span className={totals.balance > 0 ? "text-danger" : "text-success"}>
                {totals.balance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        show={showHeld}
        title="Held Bills"
        onClose={() => setShowHeld(false)}
        footer={
          <button className="btn btn-secondary" onClick={() => setShowHeld(false)}>
            Close
          </button>
        }
      >
        {heldBills.length === 0 ? (
          <p className="text-muted mb-0">No held bills. Use “Hold Bill” to park a cart here.</p>
        ) : (
          <div className="list-group">
            {heldBills.map((b) => {
              let info = {};
              try {
                info = JSON.parse(b.data || "{}");
              } catch {
                info = {};
              }
              const lines = Array.isArray(info.cart) ? info.cart : [];
              const total = lines.reduce(
                (s, l) =>
                  s +
                  l.sellingPrice * l.quantity * (1 + (l.gstPercent || 0) / 100),
                0
              );
              return (
                <div
                  key={b.id ?? b.holdId}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-medium">
                      {lines.length} item{lines.length === 1 ? "" : "s"} · ₹{total.toFixed(2)}
                    </div>
                    <div className="text-muted small">{info.savedAt || "held"}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => resumeHold(b)}
                    >
                      Resume
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteHold(b)}
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal
        show={Boolean(receipt)}
        title="Sale Completed"
        size="modal-lg"
        onClose={() => setReceipt(null)}
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setReceipt(null)}
            >
              Close
            </button>
            <button
              className="btn btn-outline-primary d-flex align-items-center gap-1"
              onClick={() => invoiceData && downloadInvoicePdf(invoiceData)}
            >
              <FiDownload /> Download PDF
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
        {invoiceData && <InvoiceDocument {...invoiceData} />}
      </Modal>

      {/* Portaled outside the modal so print pagination is based on this
          element's own natural height, not the modal's fixed/flex layout
          (see #receipt-print-root in index.css). */}
      {invoiceData &&
        createPortal(
          <div id="receipt-print-root">
            <InvoiceDocument {...invoiceData} id="receipt-print" />
          </div>,
          document.body
        )}
    </div>
  );
}
