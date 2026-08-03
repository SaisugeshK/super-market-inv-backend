import { createCrudService } from './crudServiceFactory';
export const invoicesService = createCrudService('/invoices');
export default invoicesService;
