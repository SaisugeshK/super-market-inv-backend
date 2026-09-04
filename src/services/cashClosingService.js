import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/cash-closing');

/**
 * Cash closing is a scalable, multi-payment-method feature — backend is the
 * only source of truth for opening balances, sales, refunds, expenses and
 * expected/difference amounts (see GET .../summary). The frontend only
 * displays those figures and submits actual counted/reconciled amounts.
 */
export const cashClosingService = {
  ...base,

  // Counter selected -> pull opening cash, sales/refunds/expenses per
  // payment method and expected closing amounts, all computed server-side.
  getSummary: (counterId) =>
    api.get(`/cash-closing/counter/${counterId}/summary`).then((res) => res.data),

  // Submit only the actual counted/reconciled amounts per payment method;
  // backend recomputes and stores the full snapshot (see POST /cash-closing).
  close: (payload) => api.post('/cash-closing', payload).then((res) => res.data),
};

export default cashClosingService;
