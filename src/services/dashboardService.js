import api from '../api/axios';

// GET /api/dashboard/summary
export const dashboardService = {
  getSummary: () => api.get('/dashboard/summary').then((res) => res.data),
};

export default dashboardService;
