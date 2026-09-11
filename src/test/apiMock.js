import { vi } from 'vitest';

/**
 * One fake axios instance shared by every service module under test.
 * Register handlers with onGet('/products', rows) etc. Unmatched GETs
 * resolve to [] so a page never explodes on a reference lookup it doesn't
 * assert on. Special replies: errorReply(status), networkReject(), slowReply(data, ms).
 */
const handlers = { get: [], post: [], put: [], delete: [] };

const match = (method, url, body) => {
  const list = handlers[method];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const h = list[i];
    const hit = h.pattern instanceof RegExp ? h.pattern.test(url) : url.includes(h.pattern);
    if (hit) return typeof h.reply === 'function' ? h.reply({ url, body }) : h.reply;
  }
  return undefined;
};

const isSpecial = (v) => v && typeof v === 'object' && (v.__error || v.__reject || v.__slow);

const make = (method) =>
  vi.fn((url, arg2) => {
    const body = method === 'get' || method === 'delete' ? undefined : arg2;
    const found = match(method, url, body);

    if (found?.__error) {
      return Promise.reject(
        Object.assign(new Error('Request failed'), {
          response: { status: found.status ?? 500, data: { message: found.message ?? 'error' } },
          config: { url },
        }),
      );
    }
    if (found?.__reject) {
      return Promise.reject(Object.assign(new Error('Network Error'), { config: { url } }));
    }
    if (found?.__slow) {
      return new Promise((res) => setTimeout(() => res({ data: found.data }), found.__slow));
    }
    let data = found;
    if (found === undefined || isSpecial(found)) data = [];
    return Promise.resolve({ data });
  });

const api = {
  get: make('get'),
  post: make('post'),
  put: make('put'),
  delete: make('delete'),
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  defaults: { headers: {} },
};

const KEY = 'erp_access_token';
export const tokenStorage = {
  getAccessToken: vi.fn(() => { try { return localStorage.getItem(KEY); } catch { return null; } }),
  getRefreshToken: vi.fn(() => null),
  setTokens: vi.fn(({ accessToken } = {}) => { try { if (accessToken) localStorage.setItem(KEY, accessToken); } catch { /* */ } }),
  clear: vi.fn(() => { try { localStorage.removeItem(KEY); } catch { /* */ } }),
};
const loadingSubs = new Set();
export const subscribeToLoading = vi.fn((cb) => {
  loadingSubs.add(cb);
  return () => loadingSubs.delete(cb);
});
export const emitLoading = (isLoading) => loadingSubs.forEach((cb) => cb(isLoading));

export function resetApiMock() {
  handlers.get = [];
  handlers.post = [];
  handlers.put = [];
  handlers.delete = [];
  ['get', 'post', 'put', 'delete'].forEach((m) => api[m].mockClear());
}

export const onGet = (pattern, data) => handlers.get.push({ pattern, reply: data });
export const onPost = (pattern, reply) => handlers.post.push({ pattern, reply });
export const onPut = (pattern, reply) => handlers.put.push({ pattern, reply });
export const onDelete = (pattern, reply) => handlers.delete.push({ pattern, reply });

export const errorReply = (status = 500, message = 'Server error') => ({ __error: true, status, message });
export const networkReject = () => ({ __reject: true });
export const slowReply = (data, ms = 10000) => ({ __slow: ms, data });

export default api;
