import { createCrudService } from './crudServiceFactory';
export const billingCountersService = createCrudService('/billing-counters');
export default billingCountersService;
