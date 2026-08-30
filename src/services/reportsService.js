import api from '../api/axios';

/**
 * Report endpoints added on the backend (GET /api/reports/*).
 * Every call returns the response body directly.
 * Date params (from / to) must be ISO date-time strings, e.g. 2026-08-01T00:00:00
 */
export const reportsService = {
  // ?from=&to=&counterId=&paymentMethod=&invoiceNumber=
  sales: (params) => api.get('/reports/sales', { params }).then((res) => res.data),
  // ?supplierId=&from=&to=
  purchases: (params) => api.get('/reports/purchases', { params }).then((res) => res.data),
  supplierOutstanding: () =>
    api.get('/reports/supplier-outstanding').then((res) => res.data),
  stock: () => api.get('/reports/stock').then((res) => res.data),
  // ?from=&to=
  productSales: (params) =>
    api.get('/reports/product-sales', { params }).then((res) => res.data),
};

export default reportsService;
