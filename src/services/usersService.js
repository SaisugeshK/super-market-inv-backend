import { createCrudService } from './crudServiceFactory';
export const usersService = createCrudService('/users');
export default usersService;
