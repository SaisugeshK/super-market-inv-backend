import api from '../api/axios';

/**
 * The Spring Boot backend returns entity-specific primary keys
 * (supplierId, productId, saleId, barcodeId, ...) and never a plain `id`.
 * The whole frontend (lookups, table row keys, edit/delete, <select> valueKey)
 * assumes `id`, so we normalize every response here in one place:
 * each record gets an `id` mirrored from its first `*Id` field.
 */
const attachId = (row) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  if (row.id != null) return row;
  const key = Object.keys(row).find((k) => k !== 'id' && /Id$/.test(k));
  return key ? { ...row, id: row[key] } : row;
};

const normalize = (data) => {
  if (Array.isArray(data)) return data.map(attachId);
  if (data && Array.isArray(data.content)) return { ...data, content: data.content.map(attachId) };
  if (data && Array.isArray(data.data)) return { ...data, data: data.data.map(attachId) };
  return attachId(data);
};

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
    getAll: (params) => api.get(basePath, { params }).then((res) => normalize(res.data)),
    getById: (id) => api.get(`${basePath}/${id}`).then((res) => normalize(res.data)),
    create: (payload) => api.post(basePath, payload).then((res) => normalize(res.data)),
    update: (id, payload) => api.put(`${basePath}/${id}`, payload).then((res) => normalize(res.data)),
    remove: (id) => api.delete(`${basePath}/${id}`).then((res) => res.data),
  };
}

export default createCrudService;
