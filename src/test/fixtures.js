// Mock data mirroring the Spring Boot DTO shapes the backend returns.
// Records carry their entity-specific *Id; crudServiceFactory mirrors it to `id`.

export const products = [
  { productId: 1, categoryId: 5, productName: 'Amul Milk 1L', sku: 'MILK-1L', barcode: 'MILK0001', purchasePrice: 48, sellingPrice: 62, stockQuantity: 40, minimumStock: 10, unit: 'PCS', status: 'ACTIVE' },
  { productId: 2, categoryId: 5, productName: 'Tata Salt 1kg', sku: 'SALT-1KG', barcode: 'SALT0001', purchasePrice: 18, sellingPrice: 25, stockQuantity: 6, minimumStock: 12, unit: 'PCS', status: 'ACTIVE' },
  { productId: 3, categoryId: 7, productName: 'Parle-G Biscuit', sku: 'PG-100', barcode: 'PG000100', purchasePrice: 8, sellingPrice: 10, stockQuantity: 120, minimumStock: 20, unit: 'PCS', status: 'ACTIVE' },
];

export const categories = [
  { categoryId: 5, id: 5, categoryName: 'Dairy & Staples', status: 'ACTIVE' },
  { categoryId: 7, id: 7, categoryName: 'Snacks', status: 'ACTIVE' },
];

export const units = [
  { unitId: 1, id: 1, unitName: 'Pieces', shortName: 'PCS' },
  { unitId: 2, id: 2, unitName: 'Kilogram', shortName: 'KG' },
];

export const productTaxes = [
  { taxId: 1, id: 1, productId: 1, taxName: 'GST', taxPercentage: 5 },
];

export const suppliers = [
  { supplierId: 1, supplierName: 'Metro Wholesale', contactPerson: 'R. Kumar', phone: '9876543210', email: 'metro@example.com', gstNumber: '22AAAAA0000A1Z5', status: 'ACTIVE' },
  { supplierId: 2, supplierName: 'FreshFarm Dairy', contactPerson: 'S. Iyer', phone: '9811122233', email: '', gstNumber: '', status: 'ACTIVE' },
];

export const customers = [
  { customerId: 1, customerName: 'Walk-in Regular', phone: '9000011111', email: '', status: 'ACTIVE' },
  { customerId: 2, customerName: 'Priya Sharma', phone: '9000022222', email: 'priya@example.com', status: 'ACTIVE' },
];

export const counters = [
  { counterId: 1, counterName: 'Counter 1', location: 'Front', status: 'ACTIVE' },
  { counterId: 2, counterName: 'Counter 2', location: 'Back', status: 'ACTIVE' },
];

export const sales = [
  { saleId: 1, invoiceNumber: 'INV-20260910-0001', customerId: 2, counterId: 1, totalAmount: 187.0, paymentMethod: 'CASH', paymentStatus: 'PAID', saleDate: '2026-09-10T10:15:00' },
  { saleId: 2, invoiceNumber: 'INV-20260910-0002', customerId: null, counterId: 1, totalAmount: 62.0, paymentMethod: 'UPI', paymentStatus: 'PAID', saleDate: '2026-09-10T11:30:00' },
];

export const purchases = [
  { purchaseId: 1, invoiceNumber: 'PO-5567', supplierId: 1, supplierName: 'Metro Wholesale', totalAmount: 4800, tax: 240, paidAmount: 2000, returnedAmount: 0, pendingAmount: 3040, paymentStatus: 'PARTIALLY_PAID', purchaseDate: '2026-09-08T09:00:00' },
];

export const stockReport = [
  { productId: 1, productName: 'Amul Milk 1L', barcode: 'MILK0001', unit: 'PCS', stockQuantity: 40, purchasePrice: 48, sellingPrice: 62, stockValue: 1920, lowStock: false },
  { productId: 2, productName: 'Tata Salt 1kg', barcode: 'SALT0001', unit: 'PCS', stockQuantity: 6, purchasePrice: 18, sellingPrice: 25, stockValue: 108, lowStock: true },
];

export const stockMovements = [
  { movementId: 1, productId: 1, productName: 'Amul Milk 1L', movementType: 'PURCHASE_IN', quantity: 20, referenceId: 1, notes: 'PO-5567', createdAt: '2026-09-08T09:05:00' },
  { movementId: 2, productId: 1, productName: 'Amul Milk 1L', movementType: 'SALE_OUT', quantity: 3, referenceId: 1, notes: 'INV-...0001', createdAt: '2026-09-10T10:16:00' },
];

export const salesReport = [
  { saleId: 1, invoiceNumber: 'INV-20260910-0001', saleDate: '2026-09-10T10:15:00', customerName: 'Priya Sharma', counterId: 1, paymentMethod: 'CASH', paymentStatus: 'PAID', totalAmount: 187.0, items: [{ productName: 'Amul Milk 1L', quantity: 2 }, { productName: 'Parle-G Biscuit', quantity: 1 }] },
];

export const purchaseReport = [
  { purchaseId: 1, invoiceNumber: 'PO-5567', purchaseDate: '2026-09-08T09:00:00', supplierName: 'Metro Wholesale', totalAmount: 5040, paidAmount: 2000, pendingAmount: 3040, paymentStatus: 'PARTIALLY_PAID', items: [{ productName: 'Amul Milk 1L', quantity: 100, unit: 'PCS' }] },
];

export const supplierOutstanding = [
  { supplierId: 1, supplierName: 'Metro Wholesale', totalPurchases: 5040, totalPaid: 2000, totalPending: 3040 },
];

export const productSalesReport = [
  { productId: 1, productName: 'Amul Milk 1L', quantitySold: 12, revenue: 744 },
];

export const dashboardSummary = {
  todayTotalSales: 249.0,
  todayBillCount: 2,
  totalPurchaseAmount: 4800,
  totalSupplierPending: 3040,
  lowStockProductCount: 1,
  lowStockItems: [{ productId: 2, productName: 'Tata Salt 1kg', stockQuantity: 6, minimumStock: 12 }],
};

export const cashClosingSummary = {
  totalSales: 249.0,
  session: { openingDate: '2026-09-10', lastClosingDate: '2026-09-09' },
  paymentSummary: [
    { paymentMethod: 'CASH', openingBalance: 0, salesAmount: 187, refundAmount: 0, expenseAmount: 0, expectedClosing: 187 },
    { paymentMethod: 'UPI', openingBalance: 0, salesAmount: 62, refundAmount: 0, expectedClosing: 62 },
  ],
};

export const cashClosings = [
  { id: 1, cashClosingId: 1, counterId: 1, counterName: 'Counter 1', openingTime: '2026-09-10T08:00:00', closingTime: '2026-09-10T20:00:00', totalSales: 249, status: 'CLOSED' },
];

export const heldInvoices = [];

export const checkoutResponse = {
  saleId: 99,
  invoiceNumber: 'INV-20260910-0099',
  subtotal: 134,
  taxAmount: 6.7,
  discountAmount: 10,
  grandTotal: 130.7,
  paidAmount: 0,
  balanceAmount: 130.7,
  paymentStatus: 'PENDING',
  items: [{ productId: 1, productName: 'Amul Milk 1L', quantity: 2, unitPrice: 62, taxPercentage: 5, lineTotal: 130.2 }],
};

export const purchaseReceiveResponse = {
  purchaseId: 42,
  invoiceNumber: 'PO-TEST',
  totalAmount: 620,
  tax: 20,
  paidAmount: 100,
  pendingAmount: 520,
  paymentStatus: 'PARTIALLY_PAID',
};
