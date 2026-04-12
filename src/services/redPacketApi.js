const BASE_URL = '/api/admin/red-packets';

const api = {
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
          message: data.message || '请求失败',
          errors: data.errors
        };
      }

      return data;
    } catch (error) {
      console.error(`API请求失败 [${endpoint}]:`, error);
      throw error;
    }
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
      body: JSON.stringify(data)
    });
  },

  update(id, data) {
    return this.request(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  updateRules(id, rules) {
    return this.request(`/${id}/rules`, {
      method: 'PUT',
      body: JSON.stringify(rules)
    });
  },

  updateLimits(id, limits) {
    return this.request(`/${id}/limits`, {
      method: 'PUT',
      body: JSON.stringify(limits)
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
      body: JSON.stringify(data)
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
      body: JSON.stringify({ ids })
    });
  },

  batchDeactivate(ids) {
    return this.request('/batch/deactivate', {
      method: 'PATCH',
      body: JSON.stringify({ ids })
    });
  },

  batchDelete(ids) {
    return this.request('/batch', {
      method: 'DELETE',
      body: JSON.stringify({ ids, confirm: true })
    });
  }
};

export default api;
