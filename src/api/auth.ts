import { post } from './request'

export const authAPI = {
  login: (data: { phone: string; password: string }) =>
    post('/auth/login', data),
  
  adminLogin: (data: { phone: string; password: string }) =>
    post('/auth/admin-login', data),
  
  register: (data: { name: string; phone: string; password: string }) =>
    post('/auth/register', data),
  
  logout: () => post('/auth/logout'),
  
  refreshToken: () => post('/auth/refresh-token'),
  
  getProfile: () => get('/auth/profile')
}
