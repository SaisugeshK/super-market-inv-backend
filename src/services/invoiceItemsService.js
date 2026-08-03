import { createCrudService } from './crudServiceFactory';
export const invoiceItemsService = createCrudService('/invoice-items');
export default invoiceItemsService;
