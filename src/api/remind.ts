import { get, post } from './request'

export const remindAPI = {
  sendRemind: (data: { userId: string; type: string }) =>
    post('/remind/send', data),
  
  getRemindHistory: (params?: { page?: number; pageSize?: number }) =>
    get('/remind/history', params)
}
