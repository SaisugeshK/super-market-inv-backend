import { describe, it, expect, beforeEach } from 'vitest';
import api from '../../api/axios';
import { resetApiMock, onPost } from '../../test/apiMock';
import productImportService from '../productImportService';

// Regression guard for a real bug: the shared axios instance's 15s default
// timeout (fine for ordinary CRUD calls) silently aborted large bulk imports
// client-side with no HTTP response at all — which is exactly what trips
// axios's interceptor into showing the generic "Network error. Please check
// your connection or the server." toast, even though the backend was still
// working correctly (a 3000-row .xlsx import measured ~83s server-side).
// This call must always override the timeout to something realistic for a
// bulk operation, independent of the global default used by every other
// endpoint.
beforeEach(() => resetApiMock());

describe('productImportService.importFile', () => {
  it('overrides the default request timeout with a realistic one for bulk imports', async () => {
    onPost('/products/import', { totalRows: 0, succeeded: 0, failed: 0, rows: [] });
    const file = new File(['a,b\n1,2'], 'products.csv', { type: 'text/csv' });

    await productImportService.importFile(file);

    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toBe('/products/import');
    expect(body).toBeInstanceOf(FormData);
    // The old bug was a 15s timeout; require comfortably more than that.
    expect(config.timeout).toBeGreaterThanOrEqual(60000);
  });
});
