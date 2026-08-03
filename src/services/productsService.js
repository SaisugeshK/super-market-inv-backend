import { createCrudService } from './crudServiceFactory';
export const productsService = createCrudService('/products');
export default productsService;
