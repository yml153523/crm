import { get } from './request'

export const statisticsAPI = {
  getOverview: () => get('/statistics/overview'),
  
  getUserStats: (period: 'day' | 'week' | 'month' | 'year') =>
    get('/statistics/users', { period }),
  
  getVideoStats: (period: 'day' | 'week' | 'month' | 'year') =>
    get('/statistics/videos', { period }),
  
  getRevenueStats: (period: 'day' | 'week' | 'month' | 'year') =>
    get('/statistics/revenue', { period })
}
