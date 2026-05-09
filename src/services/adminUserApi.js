const BASE_URL = '/api/admin/users';

const adminUserApi = {
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
          console.error(`管理员API请求失败 [${endpoint}]:`, err);
          uni.showToast({
            title: '网络错误，请稍后重试',
            icon: 'none'
          });
          reject(err);
        }
      });
    });
  },

  getAdminUsers(params = {}) {
    const queryString = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.status && { status: params.status }),
      ...(params.keyword && { keyword: params.keyword }),
      ...(params.role && { role: params.role })
    }).toString();

    return this.request(`?${queryString}`);
  },

  createAdminUser(data) {
    return this.request('/', {
      method: 'POST',
      data
    });
  },

  updateAdminUser(id, data) {
    return this.request(`/${id}`, {
      method: 'PUT',
      data
    });
  },

  toggleUserStatus(id, status) {
    return this.request(`/${id}/status`, {
      method: 'PUT',
      data: { status }
    });
  },

  resetPassword(id, password) {
    return this.request(`/${id}/password`, {
      method: 'PUT',
      data: { password }
    });
  },

  deleteAdminUser(id) {
    return this.request(`/${id}`, {
      method: 'DELETE'
    });
  }
};

export default adminUserApi;