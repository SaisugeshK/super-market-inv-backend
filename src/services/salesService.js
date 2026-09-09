import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/sales');

export const salesService = {
  ...base,
  // Atomic POS checkout: one request, server computes all money + locks stock.
  checkout: (payload) => api.post('/sales/checkout', payload).then((res) => res.data),
};

export default salesService;
