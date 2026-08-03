import { createCrudService } from './crudServiceFactory';
export const settingsService = createCrudService('/settings');
export default settingsService;
