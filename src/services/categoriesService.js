import { createCrudService } from './crudServiceFactory';
export const categoriesService = createCrudService('/categories');
export default categoriesService;
