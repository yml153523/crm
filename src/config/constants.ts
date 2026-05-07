export const PERMISSION_CODES = {
  SYSTEM: {
    ROOT: '10000',
    ADMIN_DASHBOARD: '10001',
    USER_CENTER: '10002'
  },
  
  ADMIN_USER: {
    MODULE: '10010',
    LIST: '10011',
    CREATE: '10012',
    EDIT: '10013',
    DELETE: '10014'
  },
  
  ADMIN_COURSE: {
    MODULE: '10020',
    LIST: '10021',
    CREATE: '10022',
    EDIT: '10023',
    DELETE: '10024'
  },
  
  ADMIN_VIDEO: {
    MODULE: '10030',
    LIST: '10031',
    CREATE: '10032',
    EDIT: '10033',
    DELETE: '10034'
  },
  
  ADMIN_PRODUCT: {
    MODULE: '10040',
    LIST: '10041',
    CREATE: '10042',
    EDIT: '10043',
    DELETE: '10044'
  },
  
  ADMIN_REDPACKET: {
    MODULE: '10050',
    LIST: '10051',
    CREATE: '10052',
    STATS: '10053',
    EXPORT: '10054'
  },
  
  ADMIN_ORDER: {
    MODULE: '10060',
    LIST: '10061',
    DETAIL: '10062'
  },
  
  ADMIN_STATISTICS: {
    MODULE: '10070',
    DASHBOARD: '10071',
    AUDIT_LOG: '10072'
  },
  
  ADMIN_CONTENT: {
    MODULE: '10080',
    RECOMMENDATION_MANAGE: '10081'
  },
  
  USER_PROFILE: '10100',
  USER_VIDEO: '10101',
  USER_COURSE: '10102',
  USER_PRODUCT: '10103',
  USER_CART: '10104',
  USER_ORDER: '10105',
  USER_REDPACKET: '10106',
  
  AUTH_LOGIN: '10200001',
  AUTH_REGISTER: '10200002',
  
  PUBLIC_RECOMMENDATION: '10300001'
}

export const ROLE_CODES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIP_USER: 'vip_user',
  USER: 'user'
}

export const API_PATHS = {
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  USERS: '/api/users',
  COURSES: '/api/courses',
  VIDEOS: '/api/videos',
  PRODUCTS: '/api/products',
  CART: '/api/cart',
  ORDERS: '/api/orders',
  RED_PACKETS: '/api/red-packets',
  REMINDS: '/api/remind',
  STATISTICS: '/api/statistics',
  PERMISSIONS: '/api/permissions',
  RECOMMENDATIONS: '/api/recommendations',
  HEALTH: '/api/health'
}

export const PAGE_URLS = {
  ADMIN: {
    DASHBOARD: '/pages/admin/dashboard',
    USERS: '/pages/admin/member/list',
    COURSES: '/pages/admin/course/library',
    VIDEOS: '/pages/admin/video/list',
    PRODUCTS: '/pages/admin/product/list',
    REDPACKETS: '/pages/admin/red-packet/list',
    STATISTICS: '/pages/admin/statistics/index',
    CONTENT_HUB: '/pages/admin/content-hub',
    AUDIT_LOG: '/pages/admin/audit-log/list'
  },
  USER: {
    HOME: '/pages/user/home',
    PROFILE: '/pages/user/profile',
    VIDEOS: '/pages/user/video/list',
    COURSES: '/pages/user/course/list',
    PRODUCTS: '/pages/user/product/list',
    CART: '/pages/user/cart/index',
    ORDERS: '/pages/user/order/list',
    REDPACKETS: '/pages/user/red-packet/list',
    LOGIN: '/pages/login'
  }
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
}

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  ADMIN_PAGE_SIZE: 10
}

export const REMIND_TYPES = {
  redPacket: { title: '红包提醒', content: '您有新的红包待领取，请及时查看！' },
  classReminder: { title: '上课提醒', content: '您的课程即将开始，请准时参加！' },
  system: { title: '系统通知', content: '系统消息通知' },
  custom: { title: '自定义提醒', content: '这是一条提醒消息' }
}

export const WEBSOCKET_CONFIG = {
  PATH: '/ws',
  HEARTBEAT_INTERVAL: 25000,
  RECONNECT_INTERVAL_USER: 3000,
  MAX_RECONNECT_USER: 20,
  RECONNECT_INTERVAL_ADMIN: 5000,
  MAX_RECONNECT_ADMIN: 5
}

export const UI_COLORS = {
  PRIMARY: '#007AFF',
  SUCCESS: '#34C759',
  DANGER: '#FF3B30',
  WARNING: '#FF9500',
  TEXT_PRIMARY: '#1A1A1A',
  TEXT_SECONDARY: '#333333',
  TEXT_TERTIARY: '#666666',
  TEXT_PLACEHOLDER: '#999999',
  TEXT_DISABLED: '#CCCCCC',
  BG_PAGE: '#F5F5F5',
  BG_CARD: '#FFFFFF',
  BORDER: '#E0E0E0'
}

export const MESSAGES = {
  COMMON: {
    LOADING: '加载中...',
    LOAD_MORE: '加载更多',
    SUCCESS: '操作成功',
    ERROR: '操作失败',
    NETWORK_ERROR: '网络错误，请稍后重试',
    NETWORK_ERROR_SHORT: '网络错误',
    CONFIRM_DELETE: '确认删除？',
    CANCEL: '取消',
    CONFIRM: '确定',
    LOGIN_SUCCESS: '登录成功！',
    LOGIN_SUCCESS_DEMO: '登录成功！（演示模式）',
    NO_DATA: '暂无数据',
    SAVE_SUCCESS: '修改成功',
    CREATE_SUCCESS: '创建成功',
    DELETE_SUCCESS: '删除成功',
    DELETE_SUCCESS_LOCAL: '删除成功（本地）✅',
    VIDEO_LOADING: '视频加载中...',
    PRODUCT_LOADING: '商品信息加载中',
    ORDER_CREATE_SUCCESS: '订单创建成功',
    ADD_SUCCESS: '添加成功',
    ADD_FAILED: '添加失败',
    DELETE_FAILED: '删除失败',
    MODIFY_FAILED: '修改失败',
    LOAD_FAILED: '加载失败',
    LOGGED_OUT: '已退出登录',
    DEV_IN_PROGRESS: '页面开发中',
    NO_MORE: '— 已经到底了 —'
  },
  ADMIN: {
    DASHBOARD_TITLE: '管理面板',
    USER_MANAGEMENT: '会员管理',
    COURSE_MANAGEMENT: '课程管理',
    VIDEO_MANAGEMENT: '视频管理',
    PRODUCT_MANAGEMENT: '商品管理',
    REDPACKET_MANAGEMENT: '红包管理',
    ORDER_MANAGEMENT: '订单管理',
    STATISTICS: '数据统计',
    CONTENT_CENTER: '内容管理中心',
    EDIT_MEMBER: '编辑会员信息',
    PRODUCT_SAVED: '✅ 已保存！用户端将实时更新',
    PRODUCT_CREATED: '✅ 创建成功！用户端已收到通知',
    COURSE_SAVED: '✅ 已保存！用户端将实时更新',
    COURSE_CREATED: '✅ 创建成功！用户端已收到通知',
    REMIND_UPDATED: '✅ 已更新！用户端将实时显示',
    REMIND_CREATED: '✅ 创建成功！用户端已收到通知',
    TOGGLE_STATUS_CONFIRM: (action: string, name: string) => `确认${action}`,
    TOGGLE_STATUS_CONTENT: (action: string, name: string) => `确定要${action}"${name}"吗？`,
    ADMIN_CREATED: '创建成功',
    SEARCH_MEMBER: '搜索会员姓名/手机号...',
    ADD_MEMBER: '添加会员',
    FILTER: '筛选',
    ALL: '全部',
    NORMAL: '正常',
    DISABLED: '禁用',
    TOTAL_MEMBERS: '总会员数',
    NO_NAME: '未设置姓名',
    NORMAL_STATUS: '✓ 正常',
    DISABLED_STATUS: '✕ 禁用',
    NO_PHONE: '未绑定手机',
    REGISTRATION_TIME: '注册时间',
    ENTER_NEW_NAME: '请输入新的姓名',
    DELETE_MEMBER_CONFIRM: '确定要删除此会员吗？删除后不可恢复。',
    EDIT: '编辑',
    DELETE: '删除',
    ENABLE: '启用',
    DISABLE: '禁用',
    NO_MEMBER_DATA: '暂无会员数据',
    MEMBER_REGISTER_HINT: '会员通过小程序注册后会显示在这里',
    TOTAL_REDPACKETS: '红包总数',
    TOTAL_AMOUNT: '总金额',
    SENT: '已发送',
    RECEIVED: '已领取',
    SEARCH_REDPACKETS: '搜索红包...',
    ISSUE_REDPACKET: '发放新红包',
    NO_REDPACKET: '暂无红包记录',
    REDPACKET_HINT: '点击上方按钮发放新红包',
    REDPACKET_TYPE: '红包类型',
    LUCKY_DRAW: '🎲 拼手气',
    NORMAL_REDPACKET: '💰 普通红包',
    TOTAL_AMOUNT_YUAN: '总金额 (元)',
    ENTER_AMOUNT: '请输入金额',
    REDPACKET_COUNT: '红包个数',
    ENTER_COUNT: '请输入数量',
    REMARK: '备注',
    REMARK_OPTIONAL: '可选：添加备注信息',
    CONFIRM_SEND: '确认发放',
    CREATING: '创建中...',
    DETAIL: '详情',
    DEACTIVATE: '停用',
    OPERATION_SUCCESS: '操作成功',
    OPERATION_FAILED: '操作失败',
    NEW_MEMBER_NAME: (suffix: string) => `用户${suffix}`
  },
  USER: {
    PROFILE: '个人中心',
    MY_ORDERS: '我的订单',
    MY_CART: '购物车',
    REDPACKET_CENTER: '红包中心',
    SETTINGS: '设置',
    LOGOUT: '退出登录',
    WELCOME_BACK: (name: string | undefined) => `欢迎回来，${name || '用户'}`,
    SEARCH_PLACEHOLDER: '搜索课程、视频、商品...',
    NO_CONTENT: '暂无内容，敬请期待',
    CLICK_LOGIN: '点击登录',
    RECHARGE_CENTER: '充值中心',
    CONFIRM_LOGOUT: '确认退出',
    CONFIRM_LOGOUT_CONTENT: '确定要退出登录吗？',
    LOGOUT_CONFIRM_BTN: '退出',
    SEARCH_DEV: '搜索开发中',
    MESSAGE_DEV: '消息开发中',
    DETAIL_DEV: '详情开发中',
    SETTINGS_DEV: '设置开发中',
    RECOMMEND: '推荐',
    COURSE: '课程',
    VIDEO: '视频',
    PRODUCT: '商品',
    STUDENTS_COUNT: (n: number) => `${n}人学习`,
    VIEWS_COUNT: (n: number) => `${n}次播放`,
    SALES_COUNT: (n: number) => `已售${n}`,
    STOCK_WARN: (n: number) => `仅剩${n}件`,
    FREE: '免费',
    COURSE_LABEL: '课程',
    VIDEO_LABEL: '视频',
    PRODUCT_LABEL: '商品'
  }
}

export const TOAST_ICON = {
  SUCCESS: 'success',
  ERROR: 'error',
  LOADING: 'loading',
  NONE: 'none'
} as const
