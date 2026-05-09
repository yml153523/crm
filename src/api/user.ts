import { get, post, put, del } from './request'

export const userAPI = {
  getUsers: (params?: { page?: number; pageSize?: number }) =>
    get('/users', params),
  
  getUserDetail: (id: string) =>
    get(`/users/${id}`),
  
  updateUser: (id: string, data: any) =>
    put(`/users/${id}`, data),
  
  deleteUser: (id: string) =>
    del(`/users/${id}`),
  
  updateProfile: (data: any) =>
    post('/users/profile', data)
}
