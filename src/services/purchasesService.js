import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/purchases');

export const purchasesService = {
  ...base,
  // Atomic goods receipt: one request, server computes totals + adds stock.
  receive: (payload) => api.post('/purchases/receive', payload).then((res) => res.data),
};

export default purchasesService;
