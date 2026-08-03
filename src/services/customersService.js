import { createCrudService } from './crudServiceFactory';
export const customersService = createCrudService('/customers');
export default customersService;
