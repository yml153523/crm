const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const videoRoutes = require('./routes/video')
const videoWatchRoutes = require('./routes/video-watch')
const remindRoutes = require('./routes/remind')
const courseRoutes = require('./routes/course')
const userRoutes = require('./routes/user')
const statisticsRoutes = require('./routes/statistics')
const productRoutes = require('./routes/product')
const cartRoutes = require('./routes/cart')
const orderRoutes = require('./routes/order')
const redPacketRoutes = require('./routes/red-packet')
const adminRedPacketsRoutes = require('./routes/admin-red-packets')
const adminRedPacketsListRoutes = require('./routes/admin-red-packets-list')
const adminRedPacketsStatsRoutes = require('./routes/admin-red-packets-stats')
const adminRedPacketsExportRoutes = require('./routes/admin-red-packets-export')
const userRedPacketsRoutes = require('./routes/user-red-packets')
const auditLogRoutes = require('./routes/auditLog')
const adminUserRoutes = require('./routes/adminUser')
const recommendationRoutes = require('./routes/recommendation')

const app = express()
const PORT = process.env.PORT || 5011

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/videos', videoRoutes)
app.use('/api/video-watches', videoWatchRoutes)
app.use('/api/remind', remindRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/users', userRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/products', productRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/red-packets', redPacketRoutes)
// 红包管理路由（注意：具体路径必须在参数化路径之前）
app.use('/api/admin/red-packets/list', adminRedPacketsListRoutes)
app.use('/api/admin/red-packets/stats', adminRedPacketsStatsRoutes)
app.use('/api/admin/red-packets/export', adminRedPacketsExportRoutes)
app.use('/api/admin/red-packets', adminRedPacketsRoutes)
app.use('/api/user/red-packets', userRedPacketsRoutes)
app.use('/api/audit-logs', auditLogRoutes)
app.use('/api/admin/users', adminUserRoutes)
app.use('/api/recommendations', recommendationRoutes)

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM API 服务运行正常', timestamp: new Date().toISOString() })
})

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 连接成功')
    app.listen(PORT, () => {
      console.log(`🚀 CRM 服务器启动成功: http://localhost:${PORT}`)
      console.log(`📡 API 地址: http://localhost:${PORT}/api`)
    })
  })
  .catch((err) => {
    console.error('❌ MongoDB 连接失败:', err.message)
    process.exit(1)
  })

module.exports = app
