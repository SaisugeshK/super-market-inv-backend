import { createCrudService } from './crudServiceFactory';
export const paymentsService = createCrudService('/payments');
export default paymentsService;
