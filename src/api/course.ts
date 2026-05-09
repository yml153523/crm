import { get, post, put, del } from './request'

export const courseAPI = {
  getCourses: (params?: { page?: number; pageSize?: number }) =>
    get('/courses', params),
  
  getCourseDetail: (id: string) =>
    get(`/courses/${id}`),
  
  createCourse: (data: any) =>
    post('/courses', data),
  
  updateCourse: (id: string, data: any) =>
    put(`/courses/${id}`, data),
  
  deleteCourse: (id: string) =>
    del(`/courses/${id}`)
}
