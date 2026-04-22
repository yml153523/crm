const BASE_URL = '/api/admin/red-packets/stats';

const statsApi = {
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
          } else {
            uni.showToast({
              title: data.message || '请求失败',
              icon: 'none'
            });
            reject(new Error(data.message || '请求失败'));
          }
        },
        fail: (err) => {
          console.error(`统计数据API请求失败 [${endpoint}]:`, err);
          uni.showToast({
            title: '网络错误，请稍后重试',
            icon: 'none'
          });
          reject(err);
        }
      });
    });
  },

  getDashboard(redPacketId) {
    const params = redPacketId ? `?redPacketId=${redPacketId}` : '';
    return this.request(`/dashboard${params}`);
  },

  getTrends(params = {}) {
    const queryString = new URLSearchParams({
      range: params.range || '7d',
      granularity: params.granularity || 'day',
      ...(params.redPacketId && { redPacketId: params.redPacketId })
    }).toString();

    return this.request(`/trends?${queryString}`);
  },

  getDistribution(redPacketId) {
    const params = redPacketId ? `?redPacketId=${redPacketId}` : '';
    return this.request(`/distribution${params}`);
  },

  getRecords(params = {}) {
    const queryString = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.redPacketId && { redPacketId: params.redPacketId }),
      ...(params.status && { status: params.status }),
      ...(params.sortBy && { sortBy: params.sortBy }),
      ...(params.sortOrder && { sortOrder: params.sortOrder })
    }).toString();

    return this.request(`/records?${queryString}`);
  }
};

export default statsApi;