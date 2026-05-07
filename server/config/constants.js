const { getConstants } = require('./config-loader')

function constants() {
  return getConstants()
}

const HTTP_STATUS = {
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

const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIP_USER: 'vip_user',
  USER: 'user'
}

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  ADMIN_PAGE_SIZE: 10
}

const REMIND_TYPES = {
  redPacket: {
    title: '红包提醒',
    content: '您有新的红包待领取，请及时查看！'
  },
  classReminder: {
    title: '上课提醒',
    content: '您的课程即将开始，请准时参加！'
  },
  system: {
    title: '系统通知',
    content: '系统消息通知'
  },
  custom: {
    title: '自定义提醒',
    content: '这是一条提醒消息'
  }
}

const SERVER_CONFIG = {
  PORT: process.env.PORT || 5011,
  JWT_SECRET: process.env.JWT_SECRET || 'crm-secret-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-system',
  NODE_ENV: process.env.NODE_ENV || 'production'
}

const WEBSOCKET_CONFIG = {
  PATH: '/ws',
  HEARTBEAT_INTERVAL: 25000,
  RECONNECT_INTERVAL_USER: 3000,
  MAX_RECONNECT_USER: 20,
  RECONNECT_INTERVAL_ADMIN: 5000,
  MAX_RECONNECT_ADMIN: 5
}

module.exports = {
  constants,
  HTTP_STATUS,
  USER_ROLES,
  PAGINATION,
  REMIND_TYPES,
  SERVER_CONFIG,
  WEBSOCKET_CONFIG
}
