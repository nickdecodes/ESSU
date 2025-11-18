import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5274';

// 创建 axios 实例
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 响应拦截器 - 统一错误处理
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // 网络错误
    if (!error.response) {
      console.error('网络错误:', error.message);
      return Promise.reject(new Error('网络连接失败，请检查网络设置'));
    }

    // HTTP 错误
    const { status, data } = error.response;
    let errorMessage = data?.message || '请求失败';

    switch (status) {
      case 400:
        errorMessage = data?.message || '请求参数错误';
        break;
      case 401:
        errorMessage = '未授权，请重新登录';
        break;
      case 403:
        errorMessage = '拒绝访问';
        break;
      case 404:
        errorMessage = '请求的资源不存在';
        break;
      case 500:
        errorMessage = '服务器错误';
        break;
      case 502:
        errorMessage = '网关错误';
        break;
      case 503:
        errorMessage = '服务不可用';
        break;
      default:
        errorMessage = data?.message || `请求失败 (${status})`;
    }

    console.error(`API错误 [${status}]:`, errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
);

const request = {
  get: (url, params) => axiosInstance.get(url, { params }),
  post: (url, data) => axiosInstance.post(url, data),
  put: (url, data) => axiosInstance.put(url, data),
  delete: (url, data) => axiosInstance.delete(url, { data })
};

// 通用导出函数
const exportFile = (url, params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.append(key, value);
      }
    }
  });
  const queryString = searchParams.toString();
  window.open(`${API_BASE}${url}${queryString ? '?' + queryString : ''}`, '_blank');
};

// 通用下载模板函数
const downloadTemplate = (url) => {
  window.open(`${API_BASE}${url}`, '_blank');
};

export const api = {
  // 用户相关
  login: (data) => request.post('/login', data),
  logout: (username, sessionId) => request.post('/logout', { username, session_id: sessionId }),
  getUsers: () => request.get('/users'),
  addUser: (data) => request.post('/users', data),
  updateUser: (userId, data) => request.put(`/users/${userId}`, data),
  deleteUser: (username, data = {}) => request.delete(`/users/${username}`, data),
  removeUserSession: (username, sessionId, data = {}) => request.delete(`/users/${username}/sessions/${sessionId}`, data),
  importUsers: (formData) => axiosInstance.post('/users/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  exportUsers: (userIds, operator) => exportFile('/users/export', { user_ids: userIds, operator }),
  downloadUserImportTemplate: () => downloadTemplate('/users/import-template'),

  // 材料相关
  getMaterials: (page = 1, pageSize = 20, filters = {}) => {
    const hasFilters = filters.search || filters.stock_filter || filters.reference_filter;
    return hasFilters ? request.get('/materials') : request.get('/materials', { page, page_size: pageSize });
  },
  getAllMaterials: () => request.get('/materials'),
  addMaterial: (data) => request.post('/materials', data),
  checkRelatedProducts: (materialId, data) => request.post(`/materials/${materialId}/check-products`, data),
  updateMaterial: (materialId, data) => request.put(`/materials/${materialId}`, data),
  deleteMaterial: (materialId, data) => request.delete(`/materials/${materialId}`, data),
  batchDeleteMaterials: (materialIds, username) => request.post('/materials/batch-delete', { material_ids: materialIds, username }),
  materialIn: (data) => request.post('/materials/in', data),
  materialOut: (data) => request.post('/materials/out', data),
  importMaterials: (formData) => axiosInstance.post('/materials/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  exportMaterials: (materialIds, username) => exportFile('/materials/export', { material_ids: materialIds, username }),
  downloadMaterialImportTemplate: () => downloadTemplate('/materials/import-template'),

  
  // 产品相关
  getProducts: (page = 1, pageSize = 20, filters = {}) => {
    const hasFilters = filters.search || filters.stock_filter || filters.possible_filter;
    return hasFilters ? request.get('/products') : request.get('/products', { page, page_size: pageSize });
  },
  getAllProducts: () => request.get('/products'),
  addProduct: (data) => request.post('/products', data),
  updateProduct: (productId, data) => request.put(`/products/${productId}`, data),
  deleteProduct: (productId) => request.delete(`/products/${productId}`),
  batchDeleteProducts: (productIds) => request.post('/products/batch-delete', { product_ids: productIds }),
  productIn: (data) => request.post('/products/in', data),
  productOut: (data) => request.post('/products/out', data),
  productRestore: (data) => request.post('/products/restore', data),
  importProducts: (formData) => axiosInstance.post('/products/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  exportProducts: (productIds, username) => exportFile('/products/export', { product_ids: productIds, username }),
  downloadProductImportTemplate: () => downloadTemplate('/products/import-template'),



  // 操作记录
  getRecords: (params = {}) => {
    const { search = '', dateRange = [], operationType = [], username = [], sortOrder = 'desc' } = params;
    const queryParams = { sort_order: sortOrder };
    
    if (search) queryParams.search = search;
    if (dateRange?.length === 2) {
      queryParams.start_date = dateRange[0].format('YYYY-MM-DD');
      queryParams.end_date = dateRange[1].format('YYYY-MM-DD');
    }
    if (operationType?.length) queryParams.operation_type = operationType;
    if (username?.length) queryParams.username = username;
    
    return axiosInstance.get('/records', { 
      params: queryParams,
      paramsSerializer: params => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(item => searchParams.append(key, item));
          } else {
            searchParams.append(key, value);
          }
        });
        return searchParams.toString();
      }
    });
  },
  getAllRecords: () => request.get('/records'),

  exportRecords: (params = {}) => {
    const { search = '', dateRange = [], operationType = [], username = [], sortOrder = 'desc', deleteAfterExport = false } = params;
    const queryParams = { sort_order: sortOrder };
    
    if (search) queryParams.search = search;
    if (dateRange?.length === 2) {
      queryParams.start_date = dateRange[0].format('YYYY-MM-DD');
      queryParams.end_date = dateRange[1].format('YYYY-MM-DD');
    }
    if (operationType?.length) queryParams.operation_type = operationType;
    if (username?.length) queryParams.username = username;
    if (deleteAfterExport) queryParams.deleteAfterExport = 'true';
    
    exportFile('/records/export', queryParams);
  },
  deleteRecords: (data) => request.delete('/records', data),

  // 系统监控相关
  getSystemDashboard: () => request.get('/system/dashboard'),
  getSystemCPU: () => request.get('/system/cpu'),
  getSystemMemory: () => request.get('/system/memory'),
  getSystemDisk: () => request.get('/system/disk'),
  getSystemNetwork: () => request.get('/system/network'),
  getSystemProcess: () => request.get('/system/process'),
  getSystemInfo: () => request.get('/system/info'),

  // 统计分析相关
  getStatisticsSummary: (days = 30) => request.get('/statistics/summary', { days }),
  getMaterialTrend: (materialId, days = 30) => request.get('/statistics/material-trend', { material_id: materialId, days }),
  getProductTrend: (productId, days = 30) => request.get('/statistics/product-trend', { product_id: productId, days }),
  getTopMaterials: (limit = 10, days = 30) => request.get('/statistics/top-materials', { limit, days }),
  getTopProducts: (limit = 10, days = 30) => request.get('/statistics/top-products', { limit, days })
};