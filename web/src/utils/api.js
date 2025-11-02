import axios from 'axios';

const API_BASE = 'http://localhost:5274';

const request = {
  get: (url, params) => axios.get(`${API_BASE}${url}`, { params }),
  post: (url, data) => axios.post(`${API_BASE}${url}`, data),
  put: (url, data) => axios.put(`${API_BASE}${url}`, data),
  delete: (url, data) => axios.delete(`${API_BASE}${url}`, { data, headers: { 'Content-Type': 'application/json' } })
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
  importUsers: (formData) => axios.post(`${API_BASE}/users/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  exportUsers: (userIds) => window.open(`${API_BASE}/users/export?user_ids=${encodeURIComponent(userIds)}`, '_blank'),

  // 材料相关
  getMaterials: (page = 1, pageSize = 20, filters = {}) => {
    const hasFilters = filters.search || filters.stock_filter || filters.reference_filter;
    const page_size = hasFilters ? 10000 : pageSize;
    return request.get('/materials', hasFilters ? { page_size } : { page, page_size });
  },
  getAllMaterials: () => request.get('/materials', { page_size: 1000 }),
  addMaterial: (data) => request.post('/materials', data),
  checkRelatedProducts: (materialId, data) => request.post(`/materials/${materialId}/check-products`, data),
  updateMaterial: (materialId, data) => request.put(`/materials/${materialId}`, data),
  deleteMaterial: (materialId, data) => request.delete(`/materials/${materialId}`, data),
  batchDeleteMaterials: (materialIds, username) => request.post('/materials/batch-delete', { material_ids: materialIds, username }),
  materialIn: (data) => request.post('/materials/in', data),
  materialOut: (data) => request.post('/materials/out', data),
  importMaterials: (formData) => axios.post(`${API_BASE}/materials/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  
  // 产品相关
  getProducts: (page = 1, pageSize = 20, filters = {}) => {
    const hasFilters = filters.search || filters.stock_filter || filters.possible_filter;
    const page_size = hasFilters ? 10000 : pageSize;
    return request.get('/products', hasFilters ? { page_size } : { page, page_size });
  },
  getAllProducts: () => request.get('/products', { page_size: 1000 }),
  addProduct: (data) => request.post('/products', data),
  updateProduct: (productId, data) => request.put(`/products/${productId}`, data),
  deleteProduct: (productId) => request.delete(`/products/${productId}`),
  batchDeleteProducts: (productIds) => request.post('/products/batch-delete', { product_ids: productIds }),
  productIn: (data) => request.post('/products/in', data),
  productOut: (data) => request.post('/products/out', data),
  productRestore: (data) => request.post('/products/restore', data),
  importProducts: (formData) => axios.post(`${API_BASE}/products/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // 数据导出
  exportDatabase: () => request.get('/export/database'),

  // 操作记录
  getRecords: (params = {}) => {
    const { page = 1, pageSize = 50, search = '', dateRange = [], operationType = [], username = [], sortOrder = 'desc' } = params;
    const queryParams = { page, page_size: pageSize, sort_order: sortOrder };
    
    if (search) queryParams.search = search;
    if (dateRange?.length === 2) {
      queryParams.start_date = dateRange[0].format('YYYY-MM-DD');
      queryParams.end_date = dateRange[1].format('YYYY-MM-DD');
    }
    if (operationType?.length) queryParams.operation_type = operationType;
    if (username?.length) queryParams.username = username;
    
    return request.get('/records', queryParams);
  },
  getAllRecords: () => request.get('/records', { page_size: 1000 }),
  clearAllRecords: (username) => request.delete('/records/clear', { username }),
  exportRecords: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    window.open(`${API_BASE}/export/records${queryString ? `?${queryString}` : ''}`, '_blank');
  },
  deleteRecords: (data) => request.delete('/records', data)
};