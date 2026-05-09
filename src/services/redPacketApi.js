const BASE_URL = '/api/admin/red-packets';

const api = {
  async request(endpoint, options = {}) {
    const token = uni.getStorageSync('token');
    const url = `${BASE_URL}${endpoint}`;
    
    return new Promise((resolve, reject) => {
      uni.request({
        url: url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        },
        success: (res) => {
          const data = res.data;
          
          if (data.success !== false) {
            resolve(data);
          } else if (res.statusCode === 401) {
            uni.removeStorageSync('token');
            uni.removeStorageSync('userInfo');
            uni.reLaunch({ url: '/pages/admin/login' });
            reject(new Error('登录已过期'));
          } else {
            uni.showToast({
              title: data.message || '请求失败',
              icon: 'none'
            });
            reject(new Error(data.message || '请求失败'));
          }
        },
        fail: (err) => {
          console.error(`API请求失败 [${endpoint}]:`, err);
          uni.showToast({
            title: '网络错误，请稍后重试',
            icon: 'none'
          });
          reject(err);
        }
      });
    });
  },

  getList(params = {}) {
    const queryString = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.keyword && { keyword: params.keyword }),
      ...(params.status && { status: params.status }),
      ...(params.type && { type: params.type }),
      ...(params.dateRange && { dateRange: JSON.stringify(params.dateRange) }),
      ...(params.sortBy && { sortBy: params.sortBy }),
      ...(params.sortOrder && { sortOrder: params.sortOrder })
    }).toString();

    return this.request(`/list?${queryString}`);
  },

  getById(id) {
    return this.request(`/${id}`);
  },

  create(data) {
    return this.request('/', {
      method: 'POST',
      data
    });
  },

  update(id, data) {
    return this.request(`/${id}`, {
      method: 'PUT',
      data
    });
  },

  updateRules(id, rules) {
    return this.request(`/${id}/rules`, {
      method: 'PUT',
      data: rules
    });
  },

  updateLimits(id, limits) {
    return this.request(`/${id}/limits`, {
      method: 'PUT',
      data: limits
    });
  },

  publish(id) {
    return this.request(`/${id}/publish`, {
      method: 'PUT'
    });
  },

  saveDraft(id, data) {
    return this.request(`/${id}/draft`, {
      method: 'PUT',
      data
    });
  },

  delete(id) {
    return this.request(`/${id}`, {
      method: 'DELETE'
    });
  },

  batchActivate(ids) {
    return this.request('/batch/activate', {
      method: 'PATCH',
      data: { ids }
    });
  },

  batchDeactivate(ids) {
    return this.request('/batch/deactivate', {
      method: 'PATCH',
      data: { ids }
    });
  },

  batchDelete(ids) {
    return this.request('/batch', {
      method: 'DELETE',
      data: { ids, confirm: true }
    });
  }
};

export default api;