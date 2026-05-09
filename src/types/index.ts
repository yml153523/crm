// 用户相关类型
export interface User {
  _id?: string
  phone: string
  nickname?: string
  name?: string
  avatar?: string
  balance?: number
  role?: UserRole
  isVIP?: boolean
  createdAt?: string
  updatedAt?: string
}

export type UserRole = 'user' | 'admin' | 'super_admin' | 'operator' | 'vip_user'

// 登录相关类型
export interface LoginRequest {
  phone: string
  password?: string
}

export interface LoginResponse {
  token: string
  refreshToken?: string
  expiresIn?: number
  user?: User
}

// 课程相关类型
export interface Course {
  _id: string
  title: string
  desc?: string
  price?: number
  students?: number
  author?: string
  cover?: string
  emoji?: string
  createdAt?: string
  updatedAt?: string
}

export interface CourseListResponse {
  success: boolean
  data: {
    list: Course[]
    pagination?: Pagination
    total?: number
  }
}

// 视频相关类型
export interface Video {
  _id: string
  title: string
  url?: string
  cover?: string
  duration?: string
  views?: number
  emoji?: string
  createdAt?: string
  updatedAt?: string
}

export interface VideoListResponse {
  success: boolean
  data: {
    list: Video[]
    pagination?: Pagination
    total?: number
  }
}

// 商品相关类型
export interface Product {
  _id: string
  name: string
  title?: string
  price: number
  stock?: number
  sales?: number
  cover?: string
  emoji?: string
  createdAt?: string
  updatedAt?: string
}

export interface ProductListResponse {
  success: boolean
  data: {
    list: Product[]
    pagination?: Pagination
    total?: number
  }
}

// 订单相关类型
export interface Order {
  _id: string
  orderNo: string
  userId: string
  items: OrderItem[]
  totalAmount: number
  status: OrderStatus
  createdAt: string
  updatedAt?: string
}

export interface OrderItem {
  productId: string
  productName: string
  price: number
  quantity: number
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'

// 红包相关类型
export interface RedPacket {
  _id: string
  type: RedPacketType
  amount: number
  count: number
  sentCount?: number
  receivedCount?: number
  remark?: string
  status: RedPacketStatus
  createdAt: string
  updatedAt?: string
}

export type RedPacketType = 'lucky' | 'normal'
export type RedPacketStatus = 'active' | 'inactive' | 'expired'

// 提醒相关类型
export interface Remind {
  _id: string
  userId: string
  type: RemindType
  title: string
  content: string
  status: RemindStatus
  sentAt: string
  read: boolean
  createdAt: string
  updatedAt?: string
}

export type RemindType = 'redPacket' | 'classReminder' | 'system' | 'custom'
export type RemindStatus = 'unread' | 'read' | 'archived'

// 分页相关类型
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiResponse<T = any> {
  success: boolean
  code?: number
  message?: string
  data?: T
  error?: string
}

// API 请求参数类型
export interface ListRequestParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ApiRequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  params?: any
  header?: Record<string, string>
  timeout?: number
}

// 内容推荐相关类型
export interface ContentItem {
  _id?: string
  title: string
  name?: string
  type: 'course' | 'video' | 'product'
  typeLabel: string
  emoji: string
  stats: string
  price?: number
  students?: number
  views?: number
  sales?: number
  duration?: string
  stock?: number
  desc?: string
}

// 统计数据类型
export interface Stats {
  label: string
  value: string | number
  icon?: string
  color?: string
  trend?: number
}

// 通知类型
export interface Notification {
  _id: string
  title: string
  content: string
  type: string
  status: string
  sentAt: string
  read: boolean
}
