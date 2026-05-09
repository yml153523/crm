import { get, post, del } from './request'

export const videoAPI = {
  getVideoList: (params?: { page?: number; pageSize?: number }) =>
    get('/videos', params),
  
  getVideoDetail: (id: string) =>
    get(`/videos/${id}`),
  
  uploadVideo: (formData: FormData) =>
    post('/videos/upload', formData),
  
  deleteVideo: (id: string) =>
    del(`/videos/${id}`),
  
  recordProgress: (videoId: string, progress: number) =>
    post('/videos/progress', { videoId, progress })
}
