import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

console.log('🌐 API: Base URL configured as:', API_BASE_URL);
console.log('🌐 API: REACT_APP_API_URL env var:', process.env.REACT_APP_API_URL);

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session-based authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 API: Making ${config.method.toUpperCase()} request to ${config.url}`);
    console.log('🌐 API: Full URL:', config.baseURL + config.url);
    console.log('🌐 API: WithCredentials:', config.withCredentials);
    console.log('🌐 API: Document cookies:', document.cookie);
    return config;
  },
  (error) => {
    console.error('🌐 API: Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('🌐 API: Response received:', response.status, response.config.url);
    console.log('🌐 API: Set-Cookie headers:', response.headers['set-cookie']);
    console.log('🌐 API: Document cookies after response:', document.cookie);
    return response;
  },
  (error) => {
    console.error('🌐 API: API Error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Redirect to login or show auth modal
      window.dispatchEvent(new CustomEvent('auth-required'));
    }
    
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  verifyToken: (token) => api.post('/auth/verify-token', { token }),
  verifyUploadToken: (token) => api.post('/auth/verify-upload-token', { token }),
  getStatus: () => api.get('/auth/status'),
  logout: () => api.post('/auth/logout'),
};

// Users API
export const usersApi = {
  getAll: () => api.get('/users'),
  create: (name) => api.post('/users', { name }),
  switch: (userId) => api.post('/users/switch', { userId }),
  update: (id, name) => api.put(`/users/${id}`, { name }),
  delete: (id) => api.delete(`/users/${id}`),
};

// Files API
export const filesApi = {
  upload: (formData) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  process: (data) => api.post('/files/process', data),
  checkPassword: () => api.post('/files/check-password'),
  getRecent: (limit = 10) => api.get('/files/recent', { params: { limit } }),
  delete: (id) => api.delete(`/files/${id}`),
};

// Transactions API
export const transactionsApi = {
  getAll: (params = {}) => api.get('/transactions', { params }),
  getTransactions: (params = {}) => api.get('/transactions', { params }).then(response => ({
    transactions: response.data || [],
    total: response.data?.length || 0
  })),
  save: (transactions) => api.post('/transactions/save', { transactions }),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  bulkDelete: (transactionIds) => api.delete('/transactions/bulk/delete', { data: { transactionIds } }),
  getDuplicates: () => api.get('/transactions/duplicates'),
  getSummary: (params = {}) => api.get('/transactions/summary', { params }),
  export: (data) => api.post('/transactions/export', data),
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  create: (name) => api.post('/categories', { name }),
  update: (id, name) => api.put(`/categories/${id}`, { name }),
  delete: (id) => api.delete(`/categories/${id}`),
  resetDefaults: () => api.post('/categories/reset-defaults'),
  getStats: () => api.get('/categories/stats'),
};

// Analytics API
export const analyticsApi = {
  getChartData: (params = {}) => api.get('/analytics/chart-data', { params }),
  getCategoryTransactions: (params = {}) => api.get('/analytics/category-transactions', { params }),
  getInsights: (params = {}) => api.get('/analytics/insights', { params }),
  getDateRanges: () => api.get('/analytics/date-ranges'),
  getAccountIds: () => api.get('/analytics/account-ids'),
  
  // Comprehensive analytics method that combines all data
  getAnalytics: async (filters = {}) => {
    try {
      // Pass date filters directly as expected by backend
      const params = {};
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.category) params.category = filters.category;
      if (filters.accountType) params.account_type = filters.accountType;
      if (filters.accountId) params.account_id = filters.accountId;
      
      // Fetch chart data, insights, and available categories/accounts
      const [chartResponse, insightsResponse, categoriesResponse] = await Promise.all([
        api.get('/analytics/chart-data', { params }),
        api.get('/analytics/insights', { params }),
        api.get('/categories')
      ]);
      
      const chartData = chartResponse.data;
      const insights = insightsResponse.data;
      
      // Transform data for React charts
      const data = {
        categoryPie: chartData.categorySpending?.map(item => ({
          name: item.category,
          value: Math.abs(item.amount),
          transactionCount: item.transactionCount
        })) || [],
        
        monthlyTrend: chartData.monthlyTrend?.map(item => ({
          month: item.month,
          amount: Math.abs(item.expenses),
          credits: Math.abs(item.credits)
        })) || [],
        
        incomeExpense: chartData.monthlyTrend?.map(item => ({
          month: item.month,
          income: Math.abs(item.credits),
          expenses: Math.abs(item.expenses)
        })) || [],
        
        categoryTrend: chartData.categoryTrend || [],
        topCategories: chartData.topCategories || [],
        
        dayOfWeek: chartData.dayOfWeek?.map(item => ({
          day: item.day,
          amount: Math.abs(item.amount),
          count: item.count,
          average: Math.abs(item.average)
        })) || [],
        
        bankAnalysis: chartData.bankAnalysis?.map(item => ({
          bank: item.bank,
          credits: item.credits || 0,
          expenses: Math.abs(item.expenses || 0),
          creditCount: item.creditCount || 0,
          expenseCount: item.expenseCount || 0
        })) || []
      };
      
      // Calculate stats from the data
      const stats = {
        totalTransactions: chartData.categorySpending?.reduce((sum, item) => sum + item.transactionCount, 0) || 0,
        totalCredits: chartData.monthlyTrend?.reduce((sum, item) => sum + (item.credits || 0), 0) || 0,
        totalExpenses: chartData.monthlyTrend?.reduce((sum, item) => sum + (item.expenses || 0), 0) || 0,
        netBalance: 0,
        avgTransaction: 0,
        dateRangeStart: filters.dateFrom || null,
        dateRangeEnd: filters.dateTo || null
      };
      
      stats.netBalance = stats.totalCredits - Math.abs(stats.totalExpenses);
      stats.avgTransaction = stats.totalTransactions > 0 ? Math.abs(stats.totalExpenses) / stats.totalTransactions : 0;
      
      // Get available categories and account IDs from transactions
      const categoriesList = categoriesResponse.data?.categories?.map(cat => cat.name) || [];
      
      // Fetch real account IDs from backend
      let accountIds = [];
      try {
        const accountIdsResponse = await api.get('/analytics/account-ids');
        accountIds = accountIdsResponse.data?.accountIds || [];
      } catch (error) {
        console.error('Error fetching account IDs:', error);
        accountIds = [];
      }
      
      return {
        data,
        stats,
        insights: insights.insights || [],
        categories: categoriesList,
        accountIds
      };
      
    } catch (error) {
      console.error('Error in getAnalytics:', error);
      throw error;
    }
  },
  
  exportData: async (params = {}) => {
    const { format, ...filterParams } = params;
    // Convert date filter format
    const filters = {};
    if (filterParams.dateFrom) filters.startDate = filterParams.dateFrom;
    if (filterParams.dateTo) filters.endDate = filterParams.dateTo;
    if (filterParams.category) filters.category = filterParams.category;
    if (filterParams.accountType) filters.accountType = filterParams.accountType;
    
    return api.post('/transactions/export', { format, filters }, { responseType: 'blob' });
  }
};

// Database API
export const databaseApi = {
  getStats: () => api.get('/database/stats'),
  reinitialize: (confirmation) => api.post('/database/reinitialize', { confirmation }),
  backup: () => api.get('/database/backup'),
  getConnectionStatus: () => api.get('/database/connection-status'),
  optimize: () => api.post('/database/optimize'),
};

// Health check
export const healthApi = {
  check: () => api.get('/health'),
};

// Helper function for handling API errors
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.response?.data?.error) {
    return error.response.data.error;
  } else if (error.message) {
    return error.message;
  } else {
    return defaultMessage;
  }
};

// Helper function for downloading files
export const downloadFile = (data, filename, mimeType = 'application/octet-stream') => {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default api;
