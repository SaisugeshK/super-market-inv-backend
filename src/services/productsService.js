import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/products');

export const productsService = {
  ...base,
  // Barcode-based billing: GET /api/products/barcode/{barcode}
  getByBarcode: (barcode) =>
    api.get(`/products/barcode/${encodeURIComponent(barcode)}`).then((res) => res.data),
  // Fast billing type-to-search: GET /api/products/search?q=
  search: (q) =>
    api.get('/products/search', { params: { q } }).then((res) => res.data),
};

export default productsService;
