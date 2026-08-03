import api from '../api/axios';

/**
 * Builds a standard set of REST calls for a given base path.
 * Every module (Suppliers, Categories, Units, Settings, ...) that exposes a
 * plain GET/POST/PUT/DELETE CRUD API on the Spring Boot backend can reuse
 * this instead of re-writing the same axios calls.
 *
 * @param {string} basePath e.g. "/suppliers"
 */
export function createCrudService(basePath) {
  return {
    getAll: (params) => api.get(basePath, { params }).then((res) => res.data),
    getById: (id) => api.get(`${basePath}/${id}`).then((res) => res.data),
    create: (payload) => api.post(basePath, payload).then((res) => res.data),
    update: (id, payload) => api.put(`${basePath}/${id}`, payload).then((res) => res.data),
    remove: (id) => api.delete(`${basePath}/${id}`).then((res) => res.data),
  };
}

export default createCrudService;
