import api from '../api/axios';

export const authService = {
  login: (payload) => api.post('/auth/login', payload).then((res) => res.data),
  register: (payload) => api.post('/auth/register', payload).then((res) => res.data),
  // Revoke a token server-side. Best-effort: never block logout on it.
  logout: (token) =>
    api
      .post('/auth/logout', null, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((res) => res.data)
      .catch(() => null),
};

export default authService;
