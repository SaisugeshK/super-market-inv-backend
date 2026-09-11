import api from '../api/axios';

/**
 * Bulk product import (Products page "Import CSV/Excel" button). Fully
 * separate from productsService — never touches the single create/update/
 * delete calls it wraps around.
 */
const productImportService = {
  // POST /api/products/import — per-row results + summary counts.
  //
  // Root cause of the "Network error" toast on real files: the shared axios
  // instance has a 15s timeout (fine for ordinary CRUD calls), but a bulk
  // import legitimately takes much longer — each row commits in its own
  // transaction server-side (spec: one bad row must never block the others),
  // so e.g. 3000 rows measured ~83s end-to-end. The browser aborted the
  // request client-side at 15s with no response at all, which is exactly
  // what trips axios's interceptor's generic "network error" branch — the
  // backend was working correctly the whole time (and finished the import
  // anyway, just after the client had already given up). Fix: give this one
  // call a realistic timeout instead of touching the global default every
  // other endpoint relies on.
  importFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 5 * 60 * 1000, // 5 minutes — plenty for realistic bulk-import sizes
      })
      .then((res) => res.data);
  },

  // GET /api/products/import/template — triggers a browser download.
  downloadTemplate: (format = 'csv') =>
    api
      .get('/products/import/template', { params: { format }, responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `product_import_template.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }),
};

export default productImportService;
