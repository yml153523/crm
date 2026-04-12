const BASE_URL = '/api/admin/red-packets/export';

const exportApi = {
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

      if (endpoint.includes('/download/')) {
        if (!response.ok) {
          throw new Error('下载失败');
        }
        return response.blob();
      }

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || '请求失败'
        };
      }

      return data;
    } catch (error) {
      console.error(`导出API请求失败 [${endpoint}]:`, error);
      throw error;
    }
  },

  createExportTask(config) {
    return this.request('/', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  getProgress(taskId) {
    return this.request(`/progress/${taskId}`);
  },

  getDownloadUrl(taskId) {
    return `${BASE_URL}/download/${taskId}`;
  },

  async downloadFile(taskId) {
    const blob = await this.request(`/download/${taskId}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redpacket_export_${taskId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  getHistory(params = {}) {
    const queryString = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 10
    }).toString();

    return this.request(`/history?${queryString}`);
  }
};

export default exportApi;
