const BASE_URL = '/api/admin/red-packets/export';

const exportApi = {
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
        responseType: endpoint.includes('/download/') ? 'arraybuffer' : 'text',
        success: (res) => {
          if (endpoint.includes('/download/')) {
            if (res.statusCode !== 200) {
              reject(new Error('下载失败'));
              return;
            }
            resolve(res.data);
          } else {
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
          }
        },
        fail: (err) => {
          console.error(`导出API请求失败 [${endpoint}]:`, err);
          uni.showToast({
            title: '网络错误，请稍后重试',
            icon: 'none'
          });
          reject(err);
        }
      });
    });
  },

  createExportTask(config) {
    return this.request('/', {
      method: 'POST',
      data: config
    });
  },

  getProgress(taskId) {
    return this.request(`/progress/${taskId}`);
  },

  getDownloadUrl(taskId) {
    return `${BASE_URL}/download/${taskId}`;
  },

  async downloadFile(taskId) {
    try {
      const arrayBuffer = await this.request(`/download/${taskId}`);
      
      // #ifdef H5
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `redpacket_export_${taskId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      // #endif
      
      // #ifndef H5
      uni.saveFile({
        tempFilePath: arrayBuffer,
        success: () => uni.showToast({ title: '下载成功', icon: 'success' }),
        fail: () => uni.showToast({ title: '下载失败', icon: 'error' })
      });
      // #endif
    } catch (error) {
      console.error('下载文件失败:', error);
      throw error;
    }
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