const BASE_URL = '/api/audit-logs';

const auditLogApi = {
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
          } else if (data.code === 401) {
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
          console.error(`审计日志API请求失败 [${endpoint}]:`, err);
          uni.showToast({
            title: '网络错误，请稍后重试',
            icon: 'none'
          });
          reject(err);
        }
      });
    });
  },

  getLogs(params = {}) {
    const queryString = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.startTime && { startTime: params.startTime }),
      ...(params.endTime && { endTime: params.endTime }),
      ...(params.userId && { userId: params.userId }),
      ...(params.actionType && { actionType: params.actionType }),
      ...(params.resourceType && { resourceType: params.resourceType }),
      ...(params.success !== undefined && { success: params.success }),
      ...(params.keyword && { keyword: params.keyword })
    }).toString();

    return this.request(`?${queryString}`);
  },

  getLogById(id) {
    return this.request(`/${id}`);
  },

  getStatistics() {
    return this.request('/statistics/overview');
  },

  exportLogs(params = {}) {
    const queryString = new URLSearchParams({
      ...(params.startTime && { startTime: params.startTime }),
      ...(params.endTime && { endTime: params.endTime }),
      ...(params.actionType && { actionType: params.actionType }),
      ...(params.userId && { userId: params.userId }),
      ...(params.keyword && { keyword: params.keyword })
    }).toString();

    return this.request(`/export?${queryString}`, {
      method: 'POST'
    });
  },

  cleanupLogs(beforeDate, confirmToken) {
    const queryString = new URLSearchParams({
      beforeDate,
      ...(confirmToken && { confirmToken })
    }).toString();

    return this.request(`/cleanup?${queryString}`, {
      method: 'DELETE'
    });
  }
};

export default auditLogApi;