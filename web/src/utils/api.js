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
  exportUsers: (userIds, operator) => {
    const params = new URLSearchParams();
    if (userIds) params.append('user_ids', userIds);
    if (operator) params.append('operator', operator);
    window.open(`${API_BASE}/users/export?${params.toString()}`, '_blank');
  },
  downloadUserImportTemplate: () => {
    window.open(`${API_BASE}/users/import-template`, '_blank');
  },

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
  exportMaterials: (materialIds, username) => {
    const params = new URLSearchParams();
    if (materialIds) params.append('material_ids', materialIds);
    if (username) params.append('username', username);
    window.open(`${API_BASE}/materials/export?${params.toString()}`, '_blank');
  },
  downloadMaterialImportTemplate: () => {
    window.open(`${API_BASE}/materials/import-template`, '_blank');
  },

  
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
  exportProducts: (productIds, username) => {
    const params = new URLSearchParams();
    if (productIds) params.append('product_ids', productIds);
    if (username) params.append('username', username);
    window.open(`${API_BASE}/products/export?${params.toString()}`, '_blank');
  },
  downloadProductImportTemplate: () => {
    window.open(`${API_BASE}/products/import-template`, '_blank');
  },



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
    
    return axios.get(`${API_BASE}/records`, { 
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
  getAllRecords: () => request.get('/records', { page_size: 1000 }),
  clearAllRecords: (username) => request.delete('/records/clear', { username }),
  exportRecords: (params = {}) => {
    const { search = '', dateRange = [], operationType = [], username = [], sortOrder = 'desc', deleteAfterExport = false } = params;
    const queryParams = { sort_order: sortOrder };
    
    if (search) queryParams.search = search;
    if (dateRange?.length === 2) {
      queryParams.start_date = dateRange[0].format('YYYY-MM-DD');
      queryParams.end_date = dateRange[1].format('YYYY-MM-DD');
    }
    if (operationType?.length) {
      operationType.forEach(type => {
        if (!queryParams.operation_type) queryParams.operation_type = [];
        queryParams.operation_type.push(type);
      });
    }
    if (username?.length) {
      username.forEach(user => {
        if (!queryParams.username) queryParams.username = [];
        queryParams.username.push(user);
      });
    }
    if (deleteAfterExport) queryParams.deleteAfterExport = 'true';
    
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.append(key, value);
      }
    });
    
    window.open(`${API_BASE}/records/export?${searchParams.toString()}`, '_blank');
  },
  deleteRecords: (data) => request.delete('/records', data)
};