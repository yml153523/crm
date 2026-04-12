const BASE_URL = '/api/admin/red-packets/stats';

const statsApi = {
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || '请求失败'
        };
      }

      return data;
    } catch (error) {
      console.error(`统计数据API请求失败 [${endpoint}]:`, error);
      throw error;
    }
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
